import { randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";

export const PIPELINE_EVIDENCE_CODES = ["INBOUND_REVIEW", "DELIVERY_REVIEW", "MISSED_APPOINTMENT", "CONTACT_PREFERENCE"] as const;
const denied = ["DENIED", "REVOKED", "OPTED_OUT", "SUPPRESSED"];
export async function pipelineContactRestrictions(db: Prisma.TransactionClient, organizationId: string, customerId: string | null, now = new Date()) {
  if (!customerId) return [];
  return db.customerCommunicationPreference.findMany({ where: { organizationId, customerId, status: { in: denied }, effectiveFrom: { lte: now }, OR: [{ effectiveTo: null }, { effectiveTo: { gt: now } }] }, select: { channel: true, purpose: true, effectiveFrom: true } });
}

/** Reconcile recorded evidence only. No inferred attendance, inferred delivery, or customer sends. */
export async function reconcilePipelineEvidence(db: Prisma.TransactionClient, input: { id: string; opportunityNumber: string; organizationId: string; customerId: string | null; ownerUserId: string | null; ownerActive: boolean; createdAt: Date; metadata: unknown; actorId: string }, now = new Date()) {
  const meta = input.metadata && typeof input.metadata === "object" && !Array.isArray(input.metadata) ? input.metadata as Record<string, unknown> : {};
  const since = (code: string) => { const raw = meta[`${code}ReviewedAt`] ?? (code === "INBOUND_REVIEW" ? meta.inboundReviewedAt : undefined); const value = typeof raw === "string" ? new Date(raw) : input.createdAt; return Number.isNaN(value.getTime()) ? input.createdAt : value; };
  const [inbound, delivery, appointment, preferences] = await Promise.all([
    input.customerId ? db.customerInteraction.findFirst({ where: { customerId: input.customerId, direction: "INBOUND", occurredAt: { gt: since("INBOUND_REVIEW") } }, orderBy: { occurredAt: "desc" }, select: { occurredAt: true } }) : null,
    input.customerId ? db.customerInteraction.findFirst({ where: { customerId: input.customerId, direction: "OUTBOUND", channel: { in: ["EMAIL", "TEXT"] }, outcome: { in: ["FAILED", "BOUNCED", "UNCERTAIN", "DELIVERY_FAILED", "DELIVERY_UNCERTAIN", "Delivery failed", "Delivery uncertain"] }, occurredAt: { gt: since("DELIVERY_REVIEW") } }, select: { occurredAt: true } }) : null,
    db.unifiedCrmOpportunityAppointmentLink.findFirst({ where: { opportunityId: input.id, organizationId: input.organizationId, archivedAt: null, appointment: { organizationId: input.organizationId, attendanceStatus: "NO_SHOW", noShowAt: { gt: since("MISSED_APPOINTMENT") } } }, select: { appointmentId: true } }),
    pipelineContactRestrictions(db, input.organizationId, input.customerId, now)
  ]);
  const reasons: Record<string, string | null> = {
    INBOUND_REVIEW: inbound ? "A recorded customer reply needs owner review. Check customer history before continuing follow-up." : null,
    DELIVERY_REVIEW: delivery ? "A recorded message failed, bounced, or has uncertain delivery. Verify the outcome and eligible channel before retrying." : null,
    MISSED_APPOINTMENT: appointment ? "A linked appointment was recorded as a no-show. Review attendance and schedule the next commitment." : null,
    CONTACT_PREFERENCE: preferences.length && (!meta.CONTACT_PREFERENCEReviewedAt || preferences.some(p => p.effectiveFrom > since("CONTACT_PREFERENCE"))) ? "A recorded contact restriction needs review. Respect the restricted channels and purposes; internal review remains available." : null
  };
  for (const code of PIPELINE_EVIDENCE_CODES) {
    const old = await db.crmPipelineException.findUnique({ where: { opportunityId_code: { opportunityId: input.id, code } } });
    const reason = reasons[code];
    if (reason) await db.crmPipelineException.upsert({ where: { opportunityId_code: { opportunityId: input.id, code } }, create: { id: randomUUID(), organizationId: input.organizationId, opportunityId: input.id, code, reason, ownerUserId: input.ownerActive ? input.ownerUserId : null, queue: "Customer continuity review", reviewDueAt: now }, update: { state: "OPEN", reason, ownerUserId: input.ownerActive ? input.ownerUserId : null, lastSeenAt: now, resolvedAt: null } });
    else if (old?.state === "OPEN") await db.crmPipelineException.update({ where: { id: old.id }, data: { state: "RESOLVED", resolvedAt: now, resolution: "Recorded evidence reviewed or underlying condition corrected", lastSeenAt: now } });
    if (reason && old?.state !== "OPEN" || !reason && old?.state === "OPEN") await db.enterpriseAuditEvent.create({ data: { organizationId: input.organizationId, actorUserId: input.actorId, domain: "CRM_PIPELINE", subjectType: "OPPORTUNITY", subjectId: input.opportunityNumber, eventType: reason ? "EXCEPTION_OPENED" : "EXCEPTION_RESOLVED", reason: reason ?? "Recorded evidence reviewed", priorValue: { code, state: old?.state ?? "NOT_OPEN" }, newValue: { code, state: reason ? "OPEN" : "RESOLVED" }, metadata: {}, correlationId: randomUUID() } });
  }
  return { pauseFollowUp: Boolean(inbound || delivery || preferences.length), restrictions: preferences };
}
