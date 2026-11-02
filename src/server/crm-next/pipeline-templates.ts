import { createHash, randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/server/db/client";
import { PIPELINE_SEQUENCES, type PipelineSequenceCode, type PipelineTemplateVersion } from "@/lib/crm-pipeline";
import type { AuthenticatedUser } from "@/server/auth/store";
import { pipelineAccess, PipelineError } from "./pipeline-service";

export async function effectivePipelineTemplate(db: Prisma.TransactionClient, organizationId: string, code: PipelineSequenceCode) {
  const saved = await db.enterpriseCommandLedger.findFirst({ where: { organizationId, domain: "CRM_PIPELINE_TEMPLATE", subjectId: code, commandType: "SAVE_TEMPLATE", status: "SUCCEEDED" }, orderBy: { resultingVersion: "desc" } });
  return saved ? saved.resultSnapshot as unknown as PipelineTemplateVersion : { code, version: 1, steps: [...PIPELINE_SEQUENCES[code].steps], reason: "Built-in internal follow-up template", savedAt: null, actor: "System default" };
}
export async function readPipelineTemplateVersions(organizationId: string) {
  const saved = await prisma.enterpriseCommandLedger.findMany({ where: { organizationId, domain: "CRM_PIPELINE_TEMPLATE", commandType: "SAVE_TEMPLATE", status: "SUCCEEDED" }, orderBy: { createdAt: "desc" }, take: 100 });
  return saved.map(r => r.resultSnapshot as unknown as PipelineTemplateVersion);
}
export async function savePipelineTemplate(actor: AuthenticatedUser | null, body: Record<string, unknown>) {
  const access = await pipelineAccess(actor, true);
  if (!access.canManage) throw new PipelineError("MANAGER_REQUIRED", "A manager must review and save sequence template versions.", 403);
  const code = String(body.code) as PipelineSequenceCode, key = String(body.idempotencyKey ?? ""), reason = String(body.reason ?? "").trim();
  if (!Object.hasOwn(PIPELINE_SEQUENCES, code) || !Array.isArray(body.steps) || body.steps.length < 2 || body.steps.length > 8 || body.steps.some(v => typeof v !== "string" || !v.trim() || v.trim().length > 160) || reason.length < 8 || reason.length > 1000 || !key || key.length > 160) throw new PipelineError("INVALID_TEMPLATE", "Choose a template, enter 2–8 internal task steps, and record a reason of at least eight characters.");
  const steps = body.steps.map(v => String(v).trim()), hash = createHash("sha256").update(JSON.stringify({ code, steps, reason, version: body.expectedTemplateVersion, actor: access.actor.id })).digest("hex");
  return prisma.$transaction(async db => {
    await db.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`pipeline-template:${access.organizationId}:${code}`}, 0))`;
    const old = await db.enterpriseCommandLedger.findUnique({ where: { organizationId_domain_commandType_idempotencyKey: { organizationId: access.organizationId, domain: "CRM_PIPELINE_TEMPLATE", commandType: "SAVE_TEMPLATE", idempotencyKey: key } } });
    if (old) { if (old.requestHash !== hash || old.actorUserId !== access.actor.id) throw new PipelineError("IDEMPOTENCY_CONFLICT", "This save reference belongs to different template changes.", 409); return { template: old.resultSnapshot, duplicate: true }; }
    const previous = await effectivePipelineTemplate(db, access.organizationId, code);
    if (body.expectedTemplateVersion !== previous.version) throw new PipelineError("TEMPLATE_VERSION_CONFLICT", "This template changed. Refresh and review its latest version before saving; your entries remain on screen.", 409);
    const template: PipelineTemplateVersion = { code, version: previous.version + 1, steps, reason, savedAt: new Date().toISOString(), actor: access.actor.name };
    const snapshot = template as unknown as Prisma.InputJsonValue;
    await db.enterpriseCommandLedger.create({ data: { organizationId: access.organizationId, actorUserId: access.actor.id, domain: "CRM_PIPELINE_TEMPLATE", subjectType: "SEQUENCE_TEMPLATE", subjectId: code, commandType: "SAVE_TEMPLATE", status: "SUCCEEDED", idempotencyKey: key, requestHash: hash, correlationId: key, expectedVersion: previous.version, resultingVersion: template.version, resultSnapshot: snapshot, completedAt: new Date() } });
    await db.enterpriseAuditEvent.create({ data: { organizationId: access.organizationId, actorUserId: access.actor.id, domain: "CRM_PIPELINE_TEMPLATE", subjectType: "SEQUENCE_TEMPLATE", subjectId: code, eventType: "TEMPLATE_VERSION_SAVED", reason, priorValue: previous as unknown as Prisma.InputJsonValue, newValue: snapshot, metadata: { existingEnrollmentsUnchanged: true }, correlationId: randomUUID() } });
    return { template, duplicate: false };
  });
}
