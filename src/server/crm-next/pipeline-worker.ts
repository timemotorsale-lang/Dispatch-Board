import { randomUUID } from "node:crypto";
import { prisma } from "@/server/db/client";
import type { AuthenticatedUser } from "@/server/auth/store";
import { pipelineAccess, PipelineError, pipelineRecordInclude, pipelineRecordWhere, reconcilePipelineRecord, createPipelineFollowUp } from "./pipeline-service";
import { resolveDocumentStorageRuntimeFromEnv } from "@/server/document-library/storage-config";
import { reconcilePipelineEvidence } from "./pipeline-evidence";

/** Internal task orchestration only. This worker never sends customer messages. */
export async function runPipelineRecovery(actor: AuthenticatedUser | null, input: { cursor?: string; retryFailed?: boolean; limit?: number } = {}) {
  const a = await pipelineAccess(actor, true);
  if (!a.canManage) throw new PipelineError("MANAGER_REQUIRED", "An authorized manager must run pipeline recovery.", 403);
  const now = new Date(), limit = Math.min(250, Math.max(1, input.limit ?? 100));
  const records = await prisma.unifiedCrmOpportunityRecord.findMany({ where: { ...pipelineRecordWhere(a), ...(input.cursor ? { id: { gt: input.cursor } } : {}) }, orderBy: { id: "asc" }, take: limit + 1, select: { id: true, opportunityNumber: true } });
  let reconciled = 0, failed = 0, tasksCreated = 0;
  for (const item of records.slice(0, limit)) {
    try {
      if (!input.retryFailed && await prisma.enterpriseOutboxMessage.findFirst({ where: { organizationId: a.organizationId, topic: "crm.pipeline.continuity", messageKey: item.opportunityNumber, OR: [{ status: "DEAD_LETTER" }, { status: "PENDING", attemptCount: { gt: 0 }, nextAttemptAt: { gt: now } }] }, select: { id: true } })) continue;
      const created = await prisma.$transaction(async db => {
        await db.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`${a.organizationId}:${item.id}`}, 0))`;
        let r = await db.unifiedCrmOpportunityRecord.findFirst({ where: { ...pipelineRecordWhere(a), id: item.id }, include: pipelineRecordInclude });
        if (!r) return 0;
        let changed = false, createdTasks = 0;
        const sequence = r.pipelineEnrollments[0], state = r.pipelineState;
        const evidence = await reconcilePipelineEvidence(db, { id: r.id, opportunityNumber: r.opportunityNumber, organizationId: a.organizationId, customerId: r.customerId, ownerUserId: r.ownerUserId, ownerActive: r.ownerUser?.isActive ?? false, createdAt: r.createdAt, metadata: state?.metadata, actorId: a.actor.id }, now);
        if (sequence && ["ACTIVE", "PAUSED"].includes(sequence.state)) {
          const metadata = state?.metadata && typeof state.metadata === "object" && !Array.isArray(state.metadata) ? state.metadata : {};
          const reviewed = typeof metadata.inboundReviewedAt === "string" ? new Date(metadata.inboundReviewedAt) : sequence.createdAt;
          const since = reviewed > sequence.createdAt ? reviewed : sequence.createdAt;
          const inbound = r.customerId ? await db.customerInteraction.findFirst({ where: { customerId: r.customerId, direction: "INBOUND", occurredAt: { gt: since } }, orderBy: { occurredAt: "desc" } }) : null;
          const fulfillment = ["paperwork", "delivery"].includes(sequence.code) && Boolean(state?.dealId);
          const terminal = r.stage === "LOST" || r.stage === "WON" && !fulfillment || Boolean(r.archivedAt), suppressed = state?.disposition === "DO_NOT_CONTACT";
          if (terminal || suppressed || (inbound || evidence.pauseFollowUp) && sequence.state === "ACTIVE") {
            await db.crmPipelineEnrollment.update({ where: { id: sequence.id }, data: { state: terminal || suppressed ? "STOPPED" : "PAUSED", activeKey: terminal || suppressed ? null : sequence.activeKey, nextRunAt: terminal || suppressed ? null : now, reason: terminal ? "Opportunity no longer active" : suppressed ? "Contact suppressed" : "Recorded reply, delivery issue, or contact restriction needs owner review" } });
            if (inbound && !terminal && !suppressed) await db.crmPipelineException.upsert({ where: { opportunityId_code: { opportunityId: r.id, code: "INBOUND_REVIEW" } }, create: { id: randomUUID(), organizationId: a.organizationId, opportunityId: r.id, code: "INBOUND_REVIEW", reason: "A customer reply was recorded. Review the response before restarting follow-up.", ownerUserId: r.ownerUserId, queue: "Response review", reviewDueAt: now }, update: { state: "OPEN", lastSeenAt: now, resolvedAt: null } });
            changed = true;
          } else if (sequence.state === "PAUSED" && sequence.nextRunAt && sequence.nextRunAt <= now) {
            await db.crmPipelineException.upsert({ where: { opportunityId_code: { opportunityId: r.id, code: "SEQUENCE_REVIEW" } }, create: { id: randomUUID(), organizationId: a.organizationId, opportunityId: r.id, code: "SEQUENCE_REVIEW", reason: "Paused sequence review is due. Resume or stop it with a recorded reason.", ownerUserId: r.ownerUserId, reviewDueAt: sequence.nextRunAt }, update: { state: "OPEN", lastSeenAt: now, resolvedAt: null } });
          } else if (sequence.state === "ACTIVE" && sequence.nextRunAt && sequence.nextRunAt <= now && !sequence.taskId && r.ownerUser?.isActive && (!state || state.disposition === "ACTIVE")) {
            const steps = sequence.steps as string[], title = steps[sequence.step];
            if (title) {
              const taskId = await createPipelineFollowUp(db, a, r, title, now);
              await db.crmPipelineEnrollment.update({ where: { id: sequence.id }, data: { taskId } });
              if (!r.nextActionDueAt || r.nextActionDueAt >= now) await db.unifiedCrmOpportunityRecord.update({ where: { id: r.id }, data: { nextActionLabel: title, nextActionDueAt: now } });
              changed = true; createdTasks++;
            }
          }
        }
        if (state?.dealId) {
          const deal = await db.dealDeskDraft.findFirst({ where: { id: state.dealId, organizationId: resolveDocumentStorageRuntimeFromEnv().organizationId } });
          const salesPath = !["repairs", "daily-rental", "vehicle-loaner", "test-drive"].includes(state.pathway);
          if (deal?.status === "SOLD" && salesPath && r.stage !== "WON") {
            const fromStage = r.stage;
            const fulfillmentDue = new Date(now.getTime() + 86400000);
            await db.unifiedCrmOpportunityRecord.update({ where: { id: r.id }, data: { stage: "WON", wonEvidence: `Linked deal ${deal.id} recorded sold; paperwork remains separate.`, handoffTarget: deal.id, nextActionLabel: "Review sold deal paperwork and fulfillment", nextActionDueAt: fulfillmentDue } });
            await createPipelineFollowUp(db, a, r, "Review sold deal paperwork and fulfillment", fulfillmentDue); createdTasks++;
            for (const title of ["Review final signed documents", "Review insurance company, policy and expiration evidence", "Review DMV and title paperwork", "Review funding or payment evidence", "Review vehicle delivery and outstanding obligations"]) {
              await createPipelineFollowUp(db, a, r, title, fulfillmentDue); createdTasks++;
            }
            await db.unifiedCrmOpportunityStageEvent.create({ data: { opportunityId: r.id, organizationId: a.organizationId, actorUserId: a.actor.id, fromStage, toStage: "WON", reason: "Existing linked deal recorded sold", evidence: { dealId: deal.id } } });
            await db.crmPipelineEnrollment.updateMany({ where: { opportunityId: r.id, state: { in: ["ACTIVE", "PAUSED"] } }, data: { state: "STOPPED", activeKey: null, reason: "Linked sale recorded; continue fulfillment in Deals", nextRunAt: null } });
            changed = true;
          }
        }
        if (changed) {
          r = await db.unifiedCrmOpportunityRecord.update({ where: { id: r.id }, data: { version: { increment: 1 } }, include: pipelineRecordInclude });
          await db.enterpriseAggregateVersion.upsert({ where: { organizationId_domain_subjectType_subjectId: { organizationId: a.organizationId, domain: "UNIFIED_CRM", subjectType: "OPPORTUNITY", subjectId: r.opportunityNumber } }, create: { organizationId: a.organizationId, domain: "UNIFIED_CRM", subjectType: "OPPORTUNITY", subjectId: r.opportunityNumber, version: r.version }, update: { version: r.version } });
          await db.enterpriseAuditEvent.create({ data: { organizationId: a.organizationId, actorUserId: a.actor.id, domain: "CRM_PIPELINE", subjectType: "OPPORTUNITY", subjectId: r.opportunityNumber, eventType: "RECOVERY", reason: "Reconciled sequence eligibility or linked sale and retained responsibility", newValue: { stage: r.stage, version: r.version }, metadata: {}, correlationId: randomUUID() } });
        }
        await reconcilePipelineRecord(db, a, r, now);
        await db.crmPipelineException.updateMany({ where: { opportunityId: r.id, code: "WORKER_FAILURE", state: "OPEN" }, data: { state: "RESOLVED", resolvedAt: now, resolution: "Recovery completed" } });
        // Only acknowledge events observed before this transaction. New commands stay pending.
        await db.enterpriseOutboxMessage.updateMany({ where: { organizationId: a.organizationId, topic: "crm.pipeline.continuity", messageKey: r.opportunityNumber, createdAt: { lte: now }, status: { in: input.retryFailed ? ["PENDING", "PROCESSING", "DEAD_LETTER"] : ["PENDING", "PROCESSING"] } }, data: { status: "PUBLISHED", publishedAt: now, lockedAt: null, lastError: null } });
        return createdTasks;
      }, { timeout: 20000 });
      tasksCreated += created; reconciled++;
    } catch (error) {
      failed++;
      const reference = randomUUID().slice(0, 8);
      console.error("Pipeline recovery failed", { reference, opportunityId: item.id, code: error instanceof PipelineError ? error.code : error && typeof error === "object" && "code" in error ? error.code : "RECOVERY_FAILED" });
      const r = await prisma.unifiedCrmOpportunityRecord.findFirst({ where: { ...pipelineRecordWhere(a), id: item.id }, select: { id: true, opportunityNumber: true, ownerUserId: true } });
      if (!r) continue;
      await prisma.crmPipelineException.upsert({ where: { opportunityId_code: { opportunityId: r.id, code: "WORKER_FAILURE" } }, create: { id: randomUUID(), organizationId: a.organizationId, opportunityId: r.id, code: "WORKER_FAILURE", ownerUserId: r.ownerUserId, queue: "Pipeline operations", reason: "Recovery failed. Retry after reviewing worker logs and configuration.", reviewDueAt: now }, update: { state: "OPEN", resolvedAt: null, lastSeenAt: now } });
      await prisma.enterpriseOutboxMessage.updateMany({ where: { organizationId: a.organizationId, messageKey: r.opportunityNumber, topic: "crm.pipeline.continuity", status: "PENDING", createdAt: { lte: now } }, data: { attemptCount: { increment: 1 }, nextAttemptAt: new Date(now.getTime() + 5 * 60000), lastError: error instanceof PipelineError ? error.code : "RECOVERY_FAILED" } });
      await prisma.enterpriseOutboxMessage.updateMany({ where: { organizationId: a.organizationId, topic: "crm.pipeline.continuity", messageKey: r.opportunityNumber, attemptCount: { gte: 5 }, status: "PENDING" }, data: { status: "DEAD_LETTER" } });
    }
  }
  const checkpoint = await prisma.enterpriseProjectionCheckpoint.findFirst({ where: { organizationId: a.organizationId, projectionCode: "CRM_PIPELINE_WORKER" } });
  const data = { ...(failed ? { lastFailureAt: now, lastError: `${failed} opportunities need recovery` } : { lastSuccessAt: now, lastError: null }) };
  if (checkpoint) await prisma.enterpriseProjectionCheckpoint.update({ where: { id: checkpoint.id }, data });
  else await prisma.enterpriseProjectionCheckpoint.create({ data: { organizationId: a.organizationId, projectionCode: "CRM_PIPELINE_WORKER", ...data } });
  return { reconciled, failed, tasksCreated, nextCursor: records.length > limit ? records[limit - 1].id : null };
}
