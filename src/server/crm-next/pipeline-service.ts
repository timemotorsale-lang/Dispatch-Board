import { createHash, randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/server/db/client";
import type { AuthenticatedUser } from "@/server/auth/store";
import { resolveCrmNextAccess } from "./access";
import { requireUnifiedCrmCustomerReadPolicy } from "@/server/policies/unified-crm-customer-read";
import { evaluateUnifiedCrmCapability } from "@/server/policies/unified-crm-access";
import { createUnifiedCrmCustomerReadRepository } from "@/server/repositories/unified-crm-customer-read-repository";
import { isAllowedUnifiedCrmOpportunityTransition, listAllowedUnifiedCrmOpportunityTransitions, type UnifiedCrmOpportunityStage } from "@/server/unified-crm/opportunity-lifecycle";
import { requireSalesDocumentsUser } from "@/server/sales-documents/service";
import { resolveDocumentStorageRuntimeFromEnv } from "@/server/document-library/storage-config";
import { dealOrganization } from "@/server/deal-continuity/identities";
import { persistDealContext } from "@/server/deal-continuity/service";
import { pipelinePolicy } from "./pipeline-policy";
import { PIPELINE_EVIDENCE_CODES, pipelineContactRestrictions, reconcilePipelineEvidence } from "./pipeline-evidence";
import { localPipelineDate, pipelineMidnight, pipelineSignals, activePipelineRow, PIPELINE_PATHS, PIPELINE_DISPOSITIONS, PIPELINE_SEQUENCES, type PipelineRow, type PipelineWorkspace, type PipelineSequenceCode } from "@/lib/crm-pipeline";

type Db = Prisma.TransactionClient;
const json = (value: unknown): Prisma.InputJsonValue => JSON.parse(JSON.stringify(value));
const iso = (value: Date | null | undefined) => value?.toISOString() ?? null;
const object = (value: unknown): Record<string, unknown> => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
export class PipelineError extends Error {
  constructor(public code: string, message: string, public status = 400, public field?: string) { super(message); }
}
function text(value: unknown, field: string, required = false, max = 500) {
  const result = typeof value === "string" ? value.trim() : "";
  if ((required && !result) || result.length > max) throw new PipelineError("INVALID_INPUT", `${field} is required and must be no more than ${max} characters.`, 400, field);
  return result;
}
function future(value: unknown, field = "Next activity") {
  const result = new Date(text(value, field, true, 50));
  if (Number.isNaN(result.getTime()) || result < new Date(Date.now() - 60_000)) throw new PipelineError("INVALID_DATE", `${field} needs a current or future date and time.`, 400, field);
  return result;
}
export async function pipelineAccess(actor: AuthenticatedUser | null, write = false) {
  const access = resolveCrmNextAccess(actor);
  if (!access.allowed || !actor) throw new PipelineError("PIPELINE_NOT_AUTHORIZED", "Sign in with an authorized CRM account.", actor ? 403 : 401);
  if (!prisma.crmPipelineState || !prisma.crmPipelineReceipt || !prisma.crmPipelineException || !prisma.crmPipelineEnrollment) throw new PipelineError("PIPELINE_CLIENT_UPDATE_REQUIRED", "The local server is using an older database client. Regenerate the Prisma client and restart the development server, then refresh this page. Your saved records are unchanged.", 503);
  if (process.env.CRM_PIPELINE_OPERATIONS === "OFF") throw new PipelineError("PIPELINE_PAUSED", "The pipeline rollout is paused. Your existing CRM remains available.", 503);
  if (write && process.env.CRM_PIPELINE_OPERATIONS === "READ_ONLY") throw new PipelineError("PIPELINE_READ_ONLY", "The pipeline rollout is currently read only.", 403);
  if (write && !evaluateUnifiedCrmCapability(actor, "crm.mutate").allowed) throw new PipelineError("PIPELINE_READ_ONLY", "Your account can review this workspace but cannot change it.", 403);
  const scope = requireUnifiedCrmCustomerReadPolicy(actor);
  const organizations = await createUnifiedCrmCustomerReadRepository().listActiveOrganizationIds(actor.id, new Date());
  if (organizations.length !== 1) throw new PipelineError("ORGANIZATION_SCOPE", "Select one authorized organization before using the pipeline.", 409);
  return { actor, organizationId: organizations[0], scope, canManage: scope.kind === "ORGANIZATION" };
}
type Access = Awaited<ReturnType<typeof pipelineAccess>>;
function where(a: Access): Prisma.UnifiedCrmOpportunityRecordWhereInput {
  return { organizationId: a.organizationId, ...(a.scope.kind === "OWNER" ? {
    OR: [{ ownerUserId: a.actor.id }, { pipelineState: { pendingOwnerId: a.actor.id } }],
    AND: [{ OR: [{ customerId: null }, { customer: { ownerUserId: a.actor.id } }] }]
  } : {}) };
}
const include = {
  customer: { select: { id: true, displayName: true, ownerUserId: true, phoneNumber: true, email: true } },
  ownerUser: { select: { id: true, name: true, isActive: true } }, sourceLead: true,
  pipelineState: true, pipelineReceipts: { orderBy: { receivedAt: "asc" as const }, take: 1 },
  pipelineExceptions: { where: { state: "OPEN" }, orderBy: { firstSeenAt: "asc" as const } },
  pipelineEnrollments: { orderBy: { createdAt: "desc" as const }, take: 1 },
  taskLinks: { where: { archivedAt: null }, include: { task: true }, orderBy: { createdAt: "desc" as const }, take: 40 },
  stageEvents: { orderBy: { occurredAt: "desc" as const }, take: 1 },
  appointmentLinks: { where: { archivedAt: null }, include: { appointment: true }, take: 20, orderBy: { createdAt: "desc" as const } }
} satisfies Prisma.UnifiedCrmOpportunityRecordInclude;
type RecordRow = Prisma.UnifiedCrmOpportunityRecordGetPayload<{ include: typeof include }>;
function row(record: RecordRow): PipelineRow {
  const state = record.pipelineState, receipt = record.pipelineReceipts[0], enrollment = record.pipelineEnrollments[0], meta = object(state?.metadata);
  return {
    responseTargetMinutes: pipelinePolicy().responseMinutes,
    followUpPushCount: typeof meta.followUpPushCount === "number" ? meta.followUpPushCount : 0,
    appointments: record.appointmentLinks.filter(l => l.appointment.organizationId === record.organizationId).map(({ appointment: p }) => ({ id: p.id, title: p.title, startsAt: iso(p.startsAt), attendance: p.attendanceStatus, status: p.bookingStatus })),
    contact: { phone: record.customer?.phoneNumber ?? String(object(receipt?.payload).phone ?? ""), email: record.customer?.email ?? String(object(receipt?.payload).email ?? "") },
    firstResponseAt: typeof meta.firstResponseAt === "string" ? meta.firstResponseAt : null,
    stalledAfterDays: pipelinePolicy().stalledDays,
    id: record.id, opportunityNumber: record.opportunityNumber, title: record.title, summary: record.summary, stage: record.stage, version: record.version,
    customerId: record.customerId, customerName: record.customer?.displayName ?? record.title, ownerUserId: record.ownerUserId, ownerName: record.ownerUser?.name ?? "Intake queue", ownerActive: record.ownerUser?.isActive ?? false,
    sourceCode: receipt?.sourceCode ?? record.sourceLead?.sourceCode ?? "LEGACY", sourceLeadId: record.sourceLeadId, vehicle: record.sourceLead?.vehicleInterest ?? String(meta.vehicle ?? ""),
    pathway: state?.pathway ?? "retail-sale", temperature: state?.temperature ?? "WARM", disposition: state?.disposition ?? "ACTIVE",
    nextActionLabel: record.nextActionLabel, nextActionDueAt: iso(record.nextActionDueAt), expectedCloseAt: iso(record.expectedCloseAt), estimatedValueCents: record.estimatedValueCents,
    receivedAt: (receipt?.receivedAt ?? record.sourceLead?.createdAt ?? record.createdAt).toISOString(), updatedAt: record.updatedAt.toISOString(), stageEnteredAt: iso(record.stageEvents[0]?.occurredAt),
    soldAt: null, completedAt: null, reviewAt: iso(state?.reviewAt), pushCount: state?.pushCount ?? 0, pendingOwnerId: state?.pendingOwnerId ?? null, handoffDueAt: iso(state?.handoffDueAt), dealId: state?.dealId ?? null, dealStatus: null,
    exceptions: record.pipelineExceptions.map(e => ({ ...e, firstSeenAt: e.firstSeenAt.toISOString(), lastSeenAt: e.lastSeenAt.toISOString(), reviewDueAt: e.reviewDueAt.toISOString(), resolvedAt: iso(e.resolvedAt) })),
    tasks: record.taskLinks.map(({ task }) => ({ id: task.id, title: task.title, dueAt: task.dueAt.toISOString(), status: task.status, completedAt: iso(task.completedAt), requiresManagerApproval: task.requiresManagerApproval, assignedUserId: task.assignedUserId })),
    history: [], sequence: enrollment ? { id: enrollment.id, code: enrollment.code as PipelineSequenceCode, version: enrollment.templateVersion, step: enrollment.step, state: enrollment.state, nextRunAt: iso(enrollment.nextRunAt), reason: enrollment.reason, steps: enrollment.steps as string[] } : null
  };
}
async function current(db: Db, a: Access, id: string) {
  const value = await db.unifiedCrmOpportunityRecord.findFirst({ where: { ...where(a), id }, include });
  if (!value) throw new PipelineError("NOT_AVAILABLE", "This opportunity is unavailable in your authorized scope.", 404);
  return value;
}
async function eligibleOwner(db: Db, a: Access, id: string, customerOwnerId?: string | null) {
  const owner = await db.user.findFirst({ where: { id, isActive: true, appointmentLocationAccess: { some: { location: { organizationId: a.organizationId }, validFrom: { lte: new Date() }, OR: [{ validTo: null }, { validTo: { gt: new Date() } }] } } }, include: { userRoles: { include: { role: true } } } });
  if (!owner) throw new PipelineError("OWNER_UNAVAILABLE", "Choose an active owner with access to this organization.", 400, "Owner");
  if (customerOwnerId && customerOwnerId !== id && !owner.userRoles.some(r => r.role.name === "General Manager")) throw new PipelineError("CUSTOMER_OWNER_ACCESS", "The receiving staff member must have access to this customer. Review customer ownership first.", 409, "Owner");
  return owner;
}
async function followUp(db: Db, a: Access, record: RecordRow, title: string, dueAt: Date) {
  if (!record.ownerUserId) return null;
  await eligibleOwner(db, a, record.ownerUserId, record.customer?.ownerUserId);
  const date = new Date(`${localPipelineDate(dueAt)}T00:00:00Z`);
  const board = await db.boardDay.upsert({ where: { date }, update: {}, create: { date } });
  const task = await db.task.create({ data: { title, description: `CRM opportunity ${record.opportunityNumber}. Record the outcome and next action in Pipeline.`, assignedUserId: record.ownerUserId, ownerUserId: record.ownerUserId, createdByUserId: a.actor.id, boardDayId: board.id, dueAt, customerId: record.customerId, customerReference: record.customer?.displayName, workflowArea: "SALES", sourceType: "LEAD", priority: "MEDIUM", status: "NOT_STARTED" } });
  await db.unifiedCrmOpportunityTaskLink.create({ data: { opportunityId: record.id, organizationId: a.organizationId, taskId: task.id, relationship: "FOLLOW_UP", titleSnapshot: title, briefSnapshot: task.description, dueAtSnapshot: dueAt, createdByUserId: a.actor.id } });
  return task.id;
}
async function reconcile(db: Db, a: Access, record: RecordRow, now = new Date()) {
  const r = row(record), signals = pipelineSignals(r, now);
  if (activePipelineRow(r) || r.dealId) await reconcilePipelineEvidence(db, { id: record.id, opportunityNumber: record.opportunityNumber, organizationId: a.organizationId, customerId: record.customerId, ownerUserId: record.ownerUserId, ownerActive: r.ownerActive, createdAt: record.createdAt, metadata: record.pipelineState?.metadata, actorId: a.actor.id }, now);
  for (const [code, reason] of signals) await db.crmPipelineException.upsert({ where: { opportunityId_code: { opportunityId: r.id, code } }, create: { id: randomUUID(), opportunityId: r.id, organizationId: a.organizationId, code, reason, ownerUserId: r.ownerActive ? r.ownerUserId : null, reviewDueAt: new Date(now.getTime() + (code === "UNASSIGNED" ? pipelinePolicy().assignmentMinutes : pipelinePolicy().responseMinutes) * 60000) }, update: { state: "OPEN", reason, ownerUserId: r.ownerActive ? r.ownerUserId : null, lastSeenAt: now, resolvedAt: null, resolution: null } });
  const managed = ["UNASSIGNED", "INACTIVE_OWNER", "CONTACT_REVIEW", "NO_NEXT_ACTION", "OVERDUE", "REVIEW_DUE", "HANDOFF_OVERDUE", "CLOSE_OVERDUE", "REPEATED_PUSH", "REPEATED_SNOOZE", "FIRST_RESPONSE_OVERDUE", "STALLED"];
  const transitions = [
    ...signals.filter(([code]) => !record.pipelineExceptions.some(e => e.code === code)).map(([code, reason]) => ({ code, reason, state: "OPEN" })),
    ...record.pipelineExceptions.filter(e => managed.includes(e.code) && !signals.some(([code]) => code === e.code)).map(e => ({ code: e.code, reason: "Underlying condition corrected", state: "RESOLVED" }))
  ];
  for (const event of transitions) await db.enterpriseAuditEvent.create({ data: { organizationId: a.organizationId, actorUserId: a.actor.id, domain: "CRM_PIPELINE", subjectType: "OPPORTUNITY", subjectId: record.opportunityNumber, eventType: event.state === "OPEN" ? "EXCEPTION_OPENED" : "EXCEPTION_RESOLVED", reason: event.reason, priorValue: { code: event.code, state: event.state === "OPEN" ? "NOT_OPEN" : "OPEN" }, newValue: event, metadata: {}, correlationId: randomUUID() } });
  await db.crmPipelineException.updateMany({ where: { opportunityId: r.id, state: "OPEN", code: { in: managed, notIn: signals.map(([code]) => code) } }, data: { state: "RESOLVED", resolvedAt: now, resolution: "Underlying condition corrected", lastSeenAt: now } });
}
export async function readPipeline(actor: AuthenticatedUser | null, page: { cursor?: string; leadPage?: number; skipOpportunities?: boolean } = {}): Promise<PipelineWorkspace> {
  const a = await pipelineAccess(actor), now = new Date();
  let cursor: { updatedAt: string; id: string } | null = null;
  try { if (page.cursor) cursor = JSON.parse(Buffer.from(page.cursor, "base64url").toString()); } catch { throw new PipelineError("INVALID_CURSOR", "Refresh the workspace to reload its pages."); }
  if (cursor && (!cursor.id || typeof cursor.id !== "string" || !cursor.updatedAt || Number.isNaN(Date.parse(cursor.updatedAt)))) throw new PipelineError("INVALID_CURSOR", "Refresh the workspace to reload its pages.");
  const leadPage = page.leadPage ?? 0;
  if (!Number.isInteger(leadPage) || leadPage < 0 || leadPage > 10000) throw new PipelineError("INVALID_CURSOR", "Choose a valid intake page.");
  const records = page.skipOpportunities ? [] : await prisma.unifiedCrmOpportunityRecord.findMany({ where: { AND: [where(a), ...(cursor ? [{ OR: [{ updatedAt: { lt: new Date(cursor.updatedAt) } }, { updatedAt: new Date(cursor.updatedAt), id: { lt: cursor.id } }] }] : [])] }, include, orderBy: [{ updatedAt: "desc" }, { id: "desc" }], take: 251 });
  const visible = records.slice(0, 250), ids = visible.map(r => r.opportunityNumber);
  const [audits, owners, customers, unlinked, pending, failed, oldest, last] = await Promise.all([
    prisma.enterpriseAuditEvent.findMany({ where: { organizationId: a.organizationId, subjectType: "OPPORTUNITY", subjectId: { in: ids }, domain: { in: ["CRM_PIPELINE", "UNIFIED_CRM"] } }, include: { actorUser: { select: { name: true } } }, orderBy: { occurredAt: "desc" }, take: 5000 }),
    prisma.user.findMany({ where: { isActive: true, ...(a.canManage ? {} : { id: a.actor.id }), appointmentLocationAccess: { some: { location: { organizationId: a.organizationId }, validFrom: { lte: now }, OR: [{ validTo: null }, { validTo: { gt: now } }] } } }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.customer.findMany({ where: { organizationId: a.organizationId, archivedAt: null, mergedIntoCustomerId: null, ...(a.scope.kind === "OWNER" ? { ownerUserId: a.actor.id } : {}) }, select: { id: true, displayName: true }, take: 500, orderBy: { displayName: "asc" } }),
    prisma.customerLead.findMany({ where: { organizationId: a.organizationId, unifiedCrmOpportunities: { none: {} }, ...(a.scope.kind === "OWNER" ? { ownerUserId: a.actor.id, customer: { ownerUserId: a.actor.id } } : {}) }, include: { customer: { select: { displayName: true } } }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 501, skip: leadPage * 500 }),
    prisma.enterpriseOutboxMessage.count({ where: { organizationId: a.organizationId, topic: "crm.pipeline.continuity", status: { in: ["PENDING", "PROCESSING"] }, ...(a.canManage ? {} : { messageKey: { in: ids } }) } }),
    prisma.enterpriseOutboxMessage.count({ where: { organizationId: a.organizationId, topic: "crm.pipeline.continuity", status: "DEAD_LETTER", ...(a.canManage ? {} : { messageKey: { in: ids } }) } }),
    prisma.enterpriseOutboxMessage.findFirst({ where: { organizationId: a.organizationId, topic: "crm.pipeline.continuity", status: "PENDING", ...(a.canManage ? {} : { messageKey: { in: ids } }) }, orderBy: { createdAt: "asc" }, select: { createdAt: true } }),
    prisma.enterpriseProjectionCheckpoint.findFirst({ where: { organizationId: a.organizationId, projectionCode: "CRM_PIPELINE_WORKER" }, select: { lastSuccessAt: true } })
  ]);
  const rows = visible.map(record => {
    const value = row(record);
    if (!a.canManage) value.appointments = record.appointmentLinks.filter(l => l.appointment.organizationId === a.organizationId && l.appointment.ownerUserId === a.actor.id).map(({ appointment: p }) => ({ id: p.id, title: p.title, startsAt: iso(p.startsAt), attendance: p.attendanceStatus, status: p.bookingStatus }));
    value.history = audits.filter(e => e.subjectId === record.opportunityNumber).slice(0, 35).map(e => ({ id: e.id, eventType: e.eventType, reason: e.reason, actor: e.actorUser.name, occurredAt: e.occurredAt.toISOString(), priorValue: e.priorValue, newValue: e.newValue }));
    return value;
  });
  const deals = await prisma.dealDeskDraft.findMany({ where: { organizationId: resolveDocumentStorageRuntimeFromEnv().organizationId, id: { in: rows.flatMap(r => r.dealId ? [r.dealId] : []) }, ...(a.canManage ? {} : { ownerUserId: a.actor.id }) }, select: { id: true, status: true, statusHistory: true, snapshot: true, pathway: true } });
  const jacketIds = deals.flatMap(d => { const id = object(object(d.snapshot).jackets)[d.pathway]; return typeof id === "string" ? [id] : []; });
  const jackets = await prisma.salesDocumentJacket.findMany({ where: { organizationId: resolveDocumentStorageRuntimeFromEnv().organizationId, id: { in: jacketIds } }, select: { id: true, state: true, customerId: true } });
  for (const r of rows) {
    const deal = deals.find(d => d.id === r.dealId); if (!deal) { r.dealId = null; continue; }
    r.dealStatus = deal.status;
    const jacketId = object(object(deal.snapshot).jackets)[deal.pathway];
    r.dealReviewState = jackets.find(j => j.id === jacketId && j.customerId === r.customerId)?.state ?? null;
    const events = Array.isArray(deal.statusHistory) ? deal.statusHistory.map(object) : [];
    r.soldAt = typeof events.find(e => e.to === "SOLD")?.at === "string" ? String(events.find(e => e.to === "SOLD")!.at) : null;
    r.completedAt = typeof events.find(e => e.action === "FINISH")?.at === "string" ? String(events.find(e => e.action === "FINISH")!.at) : null;
  }
  const choices = await prisma.dealDeskDraft.findMany({ where: { organizationId: resolveDocumentStorageRuntimeFromEnv().organizationId, ownerUserId: a.actor.id, customerId: { in: rows.flatMap(r => r.customerId ? [r.customerId] : []) }, status: { in: ["IN_PROGRESS", "PENDING", "SOLD"] } }, select: { id: true, customerId: true, status: true, vehicleReference: true, pathway: true }, take: 500 });
  for (const r of rows) r.dealChoices = choices.filter(d => d.customerId === r.customerId).map(d => ({ id: d.id, status: d.status, vehicle: d.vehicleReference, pathway: d.pathway }));
  const imports = await prisma.enterpriseCommandLedger.findMany({ where: { organizationId: a.organizationId, domain: "CRM_PIPELINE_IMPORT", status: "FAILED", ...(a.canManage ? {} : { actorUserId: a.actor.id }) }, orderBy: { createdAt: "asc" }, take: 25 });
  const importBatches = imports.map(batch => ({ id: batch.id, receivedAt: batch.createdAt.toISOString(), ownerUserId: batch.actorUserId, remaining: Array.isArray(object(batch.resultSnapshot).rows) ? (object(batch.resultSnapshot).rows as Array<{ ok: boolean }>).filter(r => !r.ok).length : 0, reason: batch.errorMessage ?? "Import needs review" }));
  const tail = visible.at(-1), nextCursor = records.length > 250 && tail ? Buffer.from(JSON.stringify({ updatedAt: tail.updatedAt.toISOString(), id: tail.id })).toString("base64url") : null;
  return { importBatches, generatedAt: now.toISOString(), actorId: a.actor.id, organizationId: a.organizationId, canManage: a.canManage, canWrite: process.env.CRM_PIPELINE_OPERATIONS !== "READ_ONLY" && evaluateUnifiedCrmCapability(actor, "crm.mutate").allowed, scope: a.canManage ? "Authorized organization records" : "Your owned records and accessible handoffs", rows, owners, customers: customers.map(c => ({ id: c.id, name: c.displayName })), truncated: Boolean(nextCursor) || unlinked.length > 500, nextCursor, moreLeads: unlinked.length > 500, unlinkedLeads: unlinked.slice(0, 500).map(l => ({ id: l.id, title: l.customer.displayName, customerId: l.customerId, ownerUserId: l.ownerUserId, sourceCode: l.sourceCode, stage: l.stage, nextActionAt: l.nextActionAt.toISOString(), createdAt: l.createdAt.toISOString() })), health: { pending, failed, oldestPendingAt: iso(oldest?.createdAt), lastWorkerAt: iso(last?.lastSuccessAt) } };
}

export async function findPipelineMatches(actor: AuthenticatedUser | null, query: string) {
  const a = await pipelineAccess(actor), q = query.trim().slice(0, 160), digits = q.replace(/\D/g, "");
  if (q.length < 3) return { items: [] };
  const matches = await prisma.$queryRaw<Array<{ id: string; displayName: string; phoneNumber: string | null }>>(Prisma.sql`
    SELECT "id", "displayName", "phoneNumber" FROM "Customer"
    WHERE "organizationId" = ${a.organizationId} AND "archivedAt" IS NULL AND "mergedIntoCustomerId" IS NULL
      ${a.scope.kind === "OWNER" ? Prisma.sql`AND "ownerUserId" = ${a.actor.id}` : Prisma.empty}
      AND ("displayName" ILIKE ${`%${q.replaceAll(/[%_]/g, "")}%`} OR LOWER("email") = LOWER(${q})
        OR (${digits.length >= 7} AND regexp_replace(COALESCE("phoneNumber", ''), '[^0-9]', '', 'g') LIKE ${`%${digits}%`}))
    ORDER BY "displayName", "id" LIMIT 10
  `);
  return { items: matches.map(c => ({ id: c.id, name: c.displayName, phoneHint: c.phoneNumber ? `Phone ending ${c.phoneNumber.replace(/\D/g, "").slice(-4)}` : "No phone on record" })) };
}

export async function pipelineCommand(actor: AuthenticatedUser | null, input: Record<string, unknown>) {
  const a = await pipelineAccess(actor, true), action = text(input.action, "Action", true, 40), key = text(input.idempotencyKey, "Request key", true, 160), id = text(input.id, "Opportunity", action !== "CAPTURE" && action !== "ADOPT_LEAD", 200);
  const canonical = (v: unknown): string => Array.isArray(v) ? `[${v.map(canonical).join(",")}]` : v && typeof v === "object" ? `{${Object.entries(v).sort(([x], [y]) => x.localeCompare(y)).map(([k, value]) => `${JSON.stringify(k)}:${canonical(value)}`).join(",")}}` : JSON.stringify(v);
  const hash = createHash("sha256").update(canonical({ actor: a.actor.id, ...input })).digest("hex");
  // Source-key and subject locks serialize retries and concurrent conversions without a global lock.
  return prisma.$transaction(async db => {
    const lock = action === "CAPTURE" ? `receipt:${a.organizationId}:${text(input.sourceCode, "Source", true, 80)}:${text(input.sourceKey, "Source reference", true, 160)}` : `${a.organizationId}:${id || input.leadId}`;
    await db.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${lock}, 0))`;
    const replay = await db.enterpriseCommandLedger.findUnique({ where: { organizationId_domain_commandType_idempotencyKey: { organizationId: a.organizationId, domain: "CRM_PIPELINE", commandType: action, idempotencyKey: key } } });
    if (replay) {
      if (replay.requestHash !== hash || replay.actorUserId !== a.actor.id) throw new PipelineError("IDEMPOTENCY_CONFLICT", "This request key was already used with different details. Review the saved record before starting another action.", 409);
      if (replay.subjectType === "OPPORTUNITY") await current(db, a, String(object(replay.resultSnapshot).id));
      return { ...object(replay.resultSnapshot), duplicate: true };
    }
    let record: RecordRow;
    let prior: unknown = null;
    const now = new Date(), reason = text(input.reason, "Reason", !["CAPTURE", "ADOPT_LEAD", "FOLLOW_UP", "ENROLL", "CONVERT"].includes(action), 1000) || action;
    if (action === "CAPTURE" || action === "ADOPT_LEAD") {
      let lead = null;
      if (action === "ADOPT_LEAD") {
        lead = await db.customerLead.findFirst({ where: { id: text(input.leadId, "Lead", true), organizationId: a.organizationId, ...(a.scope.kind === "OWNER" ? { ownerUserId: a.actor.id, customer: { ownerUserId: a.actor.id } } : {}) }, include: { customer: true, unifiedCrmOpportunities: true } });
        if (!lead) throw new PipelineError("NOT_AVAILABLE", "The source lead is unavailable.", 404);
        if (lead.unifiedCrmOpportunities.length) return { id: lead.unifiedCrmOpportunities[0].id, duplicate: true };
        if (["WON", "LOST"].includes(lead.stage)) throw new PipelineError("SOURCE_CLOSED", "This source lead is already closed. Review its customer history; capture a new inquiry only for a separate customer intent.", 409);
      }
      const title = lead ? lead.customer.displayName : text(input.title, "Name or inquiry description", true, 160), customerId = lead?.customerId ?? (text(input.customerId, "Customer", false, 200) || null);
      const customer = customerId ? await db.customer.findFirst({ where: { id: customerId, organizationId: a.organizationId, archivedAt: null, mergedIntoCustomerId: null, ...(a.scope.kind === "OWNER" ? { ownerUserId: a.actor.id } : {}) } }) : null;
      if (customerId && !customer) throw new PipelineError("CUSTOMER_NOT_AVAILABLE", "Choose a customer in your authorized scope.", 404);
      const sourceCode = lead?.sourceCode ?? text(input.sourceCode, "Source", true, 80), sourceKey = lead?.id ?? text(input.sourceKey, "Source reference", true, 160);
      const receipt = await db.crmPipelineReceipt.findUnique({ where: { organizationId_sourceCode_sourceKey: { organizationId: a.organizationId, sourceCode, sourceKey } } });
      if (receipt) { if (receipt.requestHash !== hash) throw new PipelineError("SOURCE_ALREADY_CAPTURED", "This source reference was already captured. Open the existing inquiry; do not submit it under a new reference.", 409); await current(db, a, receipt.opportunityId); return { id: receipt.opportunityId, duplicate: true }; }
      const requestedOwner = lead?.ownerUserId ?? (a.canManage ? text(input.ownerUserId, "Owner", false, 200) || null : a.actor.id);
      let ownerUserId = requestedOwner;
      if (ownerUserId) {
        try { await eligibleOwner(db, a, ownerUserId, customer?.ownerUserId); }
        catch (error) { if (error instanceof PipelineError) ownerUserId = null; else throw error; }
      }
      const pathway = text(input.pathway, "Pathway", false, 60) || "retail-sale";
      if (!(PIPELINE_PATHS as readonly string[]).includes(pathway)) throw new PipelineError("INVALID_PATHWAY", "Choose a supported revenue pathway.");
      const createdId = randomUUID(), dueAt = lead?.nextActionAt ?? new Date(now.getTime() + pipelinePolicy().responseMinutes * 60000);
      const sourceStages: Record<string, UnifiedCrmOpportunityStage> = { QUALIFIED: "QUALIFIED", ENGAGED: "QUALIFIED", APPOINTMENT_SET: "APPOINTMENT_SET", ON_SITE: "WORKING_DEAL", NEGOTIATION: "CUSTOMER_DECIDING" };
      const initialStage = lead ? sourceStages[lead.stage] ?? "NEW_INQUIRY" : "NEW_INQUIRY", initialAction = lead?.stage === "NURTURE" ? "Review nurtured relationship" : "Respond to inquiry";
      record = await db.unifiedCrmOpportunityRecord.create({ data: { id: createdId, organizationId: a.organizationId, opportunityNumber: `OPP-${createdId.replaceAll("-", "").slice(0, 16).toUpperCase()}`, title, summary: text(input.note, "Note", false, 1000) || null, stage: initialStage, nextActionLabel: initialAction, nextActionDueAt: dueAt, ownerUserId, customerId, sourceLeadId: lead?.id, createdByUserId: a.actor.id, createdReason: "Pipeline intake", version: 1,
        pipelineState: { create: { pathway, disposition: lead?.stage === "NURTURE" ? "NURTURE" : "ACTIVE", reviewAt: lead?.stage === "NURTURE" ? dueAt : null, metadata: json({ vehicle: lead?.vehicleInterest ?? text(input.vehicle, "Vehicle", false, 240) }) } },
        pipelineReceipts: { create: { id: randomUUID(), sourceCode, sourceKey, requestHash: hash, payload: json({ title, requestedOwner, phone: text(input.phone, "Phone", false, 80), email: text(input.email, "Email", false, 160) }) } },
        stageEvents: { create: { organizationId: a.organizationId, actorUserId: a.actor.id, toStage: initialStage, reason: "Inquiry captured with source stage preserved", evidence: {} } }
      }, include });
      await followUp(db, a, record, initialAction, dueAt);
    } else {
      record = await current(db, a, id); prior = { stage: record.stage, ownerUserId: record.ownerUserId, nextActionDueAt: iso(record.nextActionDueAt), nextActionLabel: record.nextActionLabel, expectedCloseAt: iso(record.expectedCloseAt), estimatedValueCents: record.estimatedValueCents, state: record.pipelineState };
      if (record.version !== input.expectedVersion) throw new PipelineError("VERSION_CONFLICT", "This opportunity changed. Refresh and review it; your form entries remain available.", 409);
      if (record.ownerUserId !== a.actor.id && !a.canManage && !(action === "ACCEPT_HANDOFF" && record.pipelineState?.pendingOwnerId === a.actor.id)) throw new PipelineError("NOT_AUTHORIZED", "Only the responsible owner or an authorized manager can change this work.", 403);
      if (record.archivedAt && action !== "REOPEN") throw new PipelineError("ARCHIVED", "Reopen this archived opportunity before changing it.", 409);
      await db.crmPipelineState.upsert({ where: { opportunityId: id }, create: { opportunityId: id, organizationId: a.organizationId }, update: {} });
      if (["FOLLOW_UP", "OUTCOME", "SKIP_STEP"].includes(action)) {
        const contactChannel = input.outcome === "Internal review" ? "INTERNAL_NOTE" : text(input.channel, "Channel", false, 30) || "PHONE";
        if (!["PHONE", "EMAIL", "TEXT", "MEETING", "VISIT", "INTERNAL_NOTE"].includes(contactChannel)) throw new PipelineError("INVALID_CHANNEL", "Choose a supported activity channel.", 400, "Channel");
        if (["Delivery failed", "Delivery uncertain"].includes(String(input.outcome)) && !["EMAIL", "TEXT"].includes(contactChannel)) throw new PipelineError("INVALID_CHANNEL", "Choose email or text when recording a message delivery issue.", 400, "Channel");
        if (action === "OUTCOME" && input.outcome !== "Internal review") {
          const restrictions = await pipelineContactRestrictions(db, a.organizationId, record.customerId, now);
          if (restrictions.some(p => [contactChannel, "ALL", "ANY"].includes(p.channel.toUpperCase()))) throw new PipelineError("CHANNEL_RESTRICTED", "This contact channel is restricted for the customer. Record an internal review and check the permitted channel and purpose.", 409);
        }
        if (action === "SKIP_STEP" && (!input.taskId || record.pipelineEnrollments[0]?.taskId !== input.taskId || record.pipelineEnrollments[0]?.state !== "ACTIVE")) throw new PipelineError("SEQUENCE_STEP_CHANGED", "Choose the current active sequence task before skipping it.", 409);
        if (action === "OUTCOME" && record.pipelineState?.disposition === "DO_NOT_CONTACT" && input.outcome !== "Internal review") throw new PipelineError("CONTACT_SUPPRESSED", "This relationship is marked do not contact. Record an internal review instead.", 409);
        if (input.taskId) {
          const task = record.taskLinks.find(l => l.taskId === input.taskId)?.task;
          if (!task || ["COMPLETED", "CANCELLED"].includes(task.status)) throw new PipelineError("TASK_CONFLICT", "This activity is no longer open. Refresh the opportunity.", 409);
          if ((task.requiresManagerApproval || task.assignedUserId !== a.actor.id) && !a.canManage) throw new PipelineError("TASK_APPROVAL", "This task requires its assigned owner or a manager review.", 403);
          if (task.requiresManagerApproval || await db.taskChecklistItem.count({ where: { taskId: task.id, isRequired: true, completed: false } })) throw new PipelineError("TASK_REQUIREMENTS", "Complete this task's required checklist and approval in the staff task workspace before closing it here.", 409);
          await db.task.update({ where: { id: task.id }, data: { status: "COMPLETED", completedAt: now, ...(task.requiresManagerApproval ? { reviewedByUserId: a.actor.id } : {}) } });
        }
        if (record.customerId && action === "OUTCOME") await db.customerInteraction.create({ data: { customerId: record.customerId, actorUserId: a.actor.id, channel: contactChannel, direction: input.outcome === "Internal review" ? "INTERNAL" : "OUTBOUND", summary: reason, outcome: text(input.outcome, "Outcome", true, 100), nextStep: text(input.nextActionLabel, "Next action", false, 240), occurredAt: now } });
        if (action === "OUTCOME") {
          const metadata = object(record.pipelineState?.metadata), meaningfulResponse = ["Spoke with customer", "Left message", "Customer decision"].includes(String(input.outcome));
          await db.crmPipelineState.update({ where: { opportunityId: id }, data: { metadata: json({ ...metadata, followUpPushCount: 0, inboundReviewedAt: now.toISOString(), ...(meaningfulResponse && !metadata.firstResponseAt ? { firstResponseAt: now.toISOString() } : {}) }) } });
          await db.crmPipelineException.updateMany({ where: { opportunityId: id, code: "INBOUND_REVIEW", state: "OPEN" }, data: { state: "RESOLVED", resolvedAt: now, resolution: reason } });
        }
        const title = text(input.nextActionLabel, "Next action", true, 240), dueAt = future(input.nextActionDueAt);
        if (action === "FOLLOW_UP" && record.nextActionDueAt && dueAt > record.nextActionDueAt) { const metadata = object(record.pipelineState?.metadata); await db.crmPipelineState.update({ where: { opportunityId: id }, data: { metadata: json({ ...metadata, followUpPushCount: Number(metadata.followUpPushCount ?? 0) + 1 }) } }); }
        if (record.stage === "LOST" || record.stage === "WON" && !record.pipelineState?.dealId) throw new PipelineError("TERMINAL_STAGE", "Use the linked deal's fulfillment work or reopen the opportunity.", 409);
        await followUp(db, a, record, title, dueAt);
        await db.unifiedCrmOpportunityRecord.update({ where: { id }, data: { nextActionLabel: title, nextActionDueAt: dueAt } });
        if (action !== "FOLLOW_UP") {
          const enrollment = record.pipelineEnrollments.find(e => e.state === "ACTIVE");
          if (enrollment && enrollment.taskId === input.taskId) {
            const next = enrollment.step + 1, steps = enrollment.steps as string[];
            await db.crmPipelineEnrollment.update({ where: { id: enrollment.id }, data: { step: next, state: next >= steps.length ? "COMPLETED" : "ACTIVE", activeKey: next >= steps.length ? null : enrollment.activeKey, nextRunAt: dueAt, taskId: null, reason } });
          }
        }
      } else if (action === "REVIEW_EXCEPTION") {
        const code = text(input.code, "Review item", true, 60);
        if (!(PIPELINE_EVIDENCE_CODES as readonly string[]).includes(code) || !record.pipelineExceptions.some(e => e.code === code)) throw new PipelineError("REVIEW_NOT_AVAILABLE", "This review item is no longer open. Refresh the opportunity.", 409);
        const dueAt = future(input.nextActionDueAt), title = text(input.nextActionLabel, "Next action", true, 240);
        await db.crmPipelineState.update({ where: { opportunityId: id }, data: { metadata: json({ ...object(record.pipelineState?.metadata), [`${code}ReviewedAt`]: now.toISOString(), ...(code === "INBOUND_REVIEW" ? { inboundReviewedAt: now.toISOString() } : {}) }) } });
        await db.crmPipelineException.updateMany({ where: { opportunityId: id, code, state: "OPEN" }, data: { state: "RESOLVED", resolvedAt: now, resolution: reason } });
        await followUp(db, a, record, title, dueAt);
        await db.unifiedCrmOpportunityRecord.update({ where: { id }, data: { nextActionLabel: title, nextActionDueAt: dueAt } });
      } else if (action === "EDIT") {
        const expected = input.expectedCloseDate === "" ? null : input.expectedCloseDate ? pipelineMidnight(text(input.expectedCloseDate, "Expected close", true, 10)) : record.expectedCloseAt;
        const amount = input.estimatedValueCents === null || input.estimatedValueCents === "" ? null : Number(input.estimatedValueCents);
        if (!Number.isSafeInteger(amount) && amount !== null || amount !== null && (amount < 0 || amount > 2_000_000_000)) throw new PipelineError("INVALID_AMOUNT", "Enter a whole-cent non-negative estimated amount.");
        const customerId = text(input.customerId, "Customer", false, 200) || record.customerId;
        if (record.pipelineState?.dealId && customerId !== record.customerId) throw new PipelineError("LINKED_DEAL_IDENTITY", "This opportunity is linked to an existing deal. Correct customer identity through that deal's authorized workflow before changing this link.", 409, "Customer");
        if (customerId) { const customer = await db.customer.findFirst({ where: { id: customerId, organizationId: a.organizationId, archivedAt: null, mergedIntoCustomerId: null, ...(a.scope.kind === "OWNER" ? { ownerUserId: a.actor.id } : {}) } }); if (!customer) throw new PipelineError("CUSTOMER_NOT_AVAILABLE", "Choose an accessible customer.", 404); }
        const temperature = text(input.temperature, "Temperature", true, 10), pathway = text(input.pathway, "Pathway", true, 60);
        if (record.pipelineState?.dealId && pathway !== record.pipelineState.pathway) throw new PipelineError("LINKED_DEAL_PATHWAY", "Open the linked deal to change its revenue path so its packet and history stay together.", 409, "Pathway");
        if (!["HOT", "WARM", "COLD"].includes(temperature) || !(PIPELINE_PATHS as readonly string[]).includes(pathway)) throw new PipelineError("INVALID_INPUT", "Choose an available temperature and pathway.");
        await db.unifiedCrmOpportunityRecord.update({ where: { id }, data: { customerId, expectedCloseAt: expected, estimatedValueCents: amount } });
        await db.crmPipelineState.update({ where: { opportunityId: id }, data: { temperature, pathway, ...(record.expectedCloseAt && expected && expected > record.expectedCloseAt ? { pushCount: { increment: 1 } } : {}) } });
      } else if (action === "DISPOSITION") {
        const disposition = text(input.disposition, "Disposition", true, 30);
        if (!(PIPELINE_DISPOSITIONS as readonly string[]).includes(disposition)) throw new PipelineError("INVALID_INPUT", "Choose a relationship disposition.");
        if (disposition === "ARCHIVED" && (record.taskLinks.some(l => !["COMPLETED", "CANCELLED"].includes(l.task.status)) || record.pipelineState?.dealId)) throw new PipelineError("OPEN_OBLIGATIONS", "Resolve or transfer open activities and linked deal obligations before archiving. Use the deal archive workflow for linked deals.", 409);
        const reviewAt = ["WAITING", "NURTURE"].includes(disposition) ? future(input.reviewAt, "Review date") : null;
        await db.crmPipelineState.update({ where: { opportunityId: id }, data: { disposition, reviewAt } });
        if (["WAITING", "NURTURE", "DO_NOT_CONTACT"].includes(disposition)) {
          await db.task.updateMany({ where: { id: { in: record.taskLinks.map(l => l.taskId) }, status: { not: "COMPLETED" } }, data: { status: "BLOCKED", blockerReason: `Relationship ${disposition}: ${reason}. Review before any contact.` } });
          const dueAt = reviewAt ?? new Date(now.getTime() + 30 * 86400000), title = disposition === "DO_NOT_CONTACT" ? "Internal review · contact suppressed" : `Review ${disposition.toLowerCase()} relationship`;
          await db.unifiedCrmOpportunityRecord.update({ where: { id }, data: { nextActionLabel: title, nextActionDueAt: dueAt } });
          await followUp(db, a, record, title, dueAt);
        }
        if (disposition === "ARCHIVED") await db.unifiedCrmOpportunityRecord.update({ where: { id }, data: { archivedAt: now } });
        if (disposition !== "ACTIVE") await db.crmPipelineEnrollment.updateMany({ where: { opportunityId: id, state: "ACTIVE" }, data: { state: "PAUSED", reason: `Relationship ${disposition}: ${reason}`, nextRunAt: reviewAt } });
      } else if (action === "REQUEST_HANDOFF") {
        if (!a.canManage) throw new PipelineError("MANAGER_REQUIRED", "A manager must initiate an ownership transfer.", 403);
        const owner = text(input.ownerUserId, "Receiving owner", true, 200); await eligibleOwner(db, a, owner, record.customer?.ownerUserId);
        if (record.pipelineState?.dealId) {
          const linked = await db.dealDeskDraft.findUnique({ where: { id: record.pipelineState.dealId }, select: { ownerUserId: true } });
          if (linked?.ownerUserId !== owner) throw new PipelineError("DEAL_HANDOFF_REQUIRED", "Transfer the linked deal through Deals manager actions first, then request this opportunity handoff. The current owner remains responsible.", 409);
        }
        await db.crmPipelineState.update({ where: { opportunityId: id }, data: { pendingOwnerId: owner, handoffDueAt: new Date(now.getTime() + pipelinePolicy().handoffMinutes * 60000) } });
      } else if (action === "ACCEPT_HANDOFF") {
        const owner = record.pipelineState?.pendingOwnerId;
        if (!owner || owner !== a.actor.id && !a.canManage) throw new PipelineError("HANDOFF_NOT_AVAILABLE", "Only the receiving owner or an authorized manager can accept this transfer.", 403);
        await eligibleOwner(db, a, owner, record.customer?.ownerUserId);
        await db.unifiedCrmOpportunityRecord.update({ where: { id }, data: { ownerUserId: owner } });
        await db.task.updateMany({ where: { id: { in: record.taskLinks.map(l => l.taskId) }, status: { notIn: ["COMPLETED"] } }, data: { assignedUserId: owner, ownerUserId: owner } });
        await db.crmPipelineState.update({ where: { opportunityId: id }, data: { pendingOwnerId: null, handoffDueAt: null } });
        if (!record.taskLinks.length && record.nextActionLabel && record.nextActionDueAt) await followUp(db, a, await current(db, a, id), record.nextActionLabel, record.nextActionDueAt);
      } else if (action === "STAGE" || action === "REOPEN") {
        const toStage = action === "REOPEN" ? "NEW_INQUIRY" : text(input.toStage, "Stage", true, 40) as UnifiedCrmOpportunityStage;
        if (action === "REOPEN") { if (!a.canManage || !["WON", "LOST"].includes(record.stage) && !record.archivedAt) throw new PipelineError("REOPEN_NOT_ALLOWED", "A manager can reopen terminal or archived opportunities.", 403); }
        else if (!isAllowedUnifiedCrmOpportunityTransition(record.stage, toStage)) throw new PipelineError("INVALID_STAGE", `Allowed next stages: ${listAllowedUnifiedCrmOpportunityTransitions(record.stage).join(", ")}.`, 409);
        if (toStage === "WON") throw new PipelineError("SALE_HANDOFF_REQUIRED", "Open or create the linked deal, then mark it sold through the deal workflow. This preserves sale and paperwork history.", 409);
        const dueAt = toStage === "LOST" ? null : future(input.nextActionDueAt), nextActionLabel = toStage === "LOST" ? null : text(input.nextActionLabel, "Next action", true, 240);
        await db.unifiedCrmOpportunityRecord.update({ where: { id }, data: { stage: toStage, nextActionLabel, nextActionDueAt: dueAt, lostReason: toStage === "LOST" ? reason : null, archivedAt: null } });
        await db.unifiedCrmOpportunityStageEvent.create({ data: { opportunityId: id, organizationId: a.organizationId, actorUserId: a.actor.id, fromStage: record.stage, toStage, reason, evidence: json({ nextActionLabel, nextActionDueAt: iso(dueAt) }) } });
        if (dueAt && nextActionLabel) await followUp(db, a, record, nextActionLabel, dueAt);
        if (action === "REOPEN") await db.crmPipelineState.update({ where: { opportunityId: id }, data: { disposition: "ACTIVE", reviewAt: null } });
        if (toStage === "LOST") await db.crmPipelineEnrollment.updateMany({ where: { opportunityId: id, state: { in: ["ACTIVE", "PAUSED"] } }, data: { state: "STOPPED", activeKey: null, reason, nextRunAt: null } });
      } else if (action === "ENROLL") {
        const code = text(input.sequenceCode, "Sequence", true, 40) as PipelineSequenceCode, template = PIPELINE_SEQUENCES[code];
        if (!Object.hasOwn(PIPELINE_SEQUENCES, code)) throw new PipelineError("INVALID_SEQUENCE", "Choose a sequence template.");
        const fulfillment = ["paperwork", "delivery"].includes(code) && record.stage === "WON" && Boolean(record.pipelineState?.dealId);
        if ((!activePipelineRow(row(record)) && !fulfillment) || record.pipelineState?.disposition === "DO_NOT_CONTACT") throw new PipelineError("SEQUENCE_NOT_ELIGIBLE", "This relationship is not eligible for this follow-up sequence.", 409);
        if (record.pipelineEnrollments.some(e => ["ACTIVE", "PAUSED"].includes(e.state))) throw new PipelineError("SEQUENCE_ALREADY_ACTIVE", "Complete or stop the current sequence before starting another. Paused work remains accountable.", 409);
        const nextRunAt = future(input.nextActionDueAt);
        await db.crmPipelineEnrollment.create({ data: { id: randomUUID(), organizationId: a.organizationId, opportunityId: id, code, steps: [...template.steps], activeKey: id, nextRunAt } });
      } else if (["PAUSE_SEQUENCE", "RESUME_SEQUENCE", "STOP_SEQUENCE"].includes(action)) {
        const enrollment = record.pipelineEnrollments[0]; if (!enrollment || ["COMPLETED", "STOPPED"].includes(enrollment.state)) throw new PipelineError("SEQUENCE_NOT_AVAILABLE", "This sequence is no longer active.", 409);
        const state = action === "PAUSE_SEQUENCE" ? "PAUSED" : action === "RESUME_SEQUENCE" ? "ACTIVE" : "STOPPED";
        const fulfillment = ["paperwork", "delivery"].includes(enrollment.code) && record.stage === "WON" && Boolean(record.pipelineState?.dealId);
        if (state === "ACTIVE" && ((!activePipelineRow(row(record)) && !fulfillment) || record.pipelineState?.disposition !== "ACTIVE")) throw new PipelineError("SEQUENCE_NOT_ELIGIBLE", "Set an active relationship before resuming the sequence.", 409);
        if (state === "ACTIVE" && (await pipelineContactRestrictions(db, a.organizationId, record.customerId, now)).length) throw new PipelineError("CHANNEL_RESTRICTED", "Review recorded channel restrictions in the customer record before resuming generic follow-up. Internal review remains available.", 409);
        await db.crmPipelineEnrollment.update({ where: { id: enrollment.id }, data: { state, nextRunAt: state === "STOPPED" ? null : future(input.reviewAt, "Sequence review"), activeKey: state === "STOPPED" ? null : enrollment.activeKey, reason } });
        await db.crmPipelineException.updateMany({ where: { opportunityId: id, code: "SEQUENCE_REVIEW", state: "OPEN" }, data: { state: "RESOLVED", resolvedAt: now, resolution: reason } });
      } else if (action === "CONVERT") {
        requireSalesDocumentsUser(actor);
        if (dealOrganization() !== a.organizationId) throw new PipelineError("DEAL_ORGANIZATION", "The deal workspace is configured for another organization. Ask an administrator to align the document workspace before conversion.", 409);
        if (record.ownerUserId !== a.actor.id) throw new PipelineError("DEAL_OWNER", "The responsible owner should open this deal. Accept an authorized handoff first.", 409);
        if (!record.customerId || !record.ownerUserId) throw new PipelineError("CONVERSION_CONTEXT", "Link a verified customer and assign an owner before opening a deal.", 409);
        let existing = record.pipelineState?.dealId;
        if (!existing && input.existingDealId) {
          const candidate = await db.dealDeskDraft.findFirst({ where: { id: text(input.existingDealId, "Existing deal", true, 200), organizationId: resolveDocumentStorageRuntimeFromEnv().organizationId, ownerUserId: a.actor.id, customerId: record.customerId, status: { in: ["IN_PROGRESS", "PENDING", "SOLD"] } } });
          if (!candidate) throw new PipelineError("DEAL_NOT_AVAILABLE", "Choose an accessible existing deal for this customer.", 404);
          existing = candidate.id;
          await db.crmPipelineState.update({ where: { opportunityId: id }, data: { dealId: existing } });
        }
        if (!existing) {
          const previous = await db.dealDeskDraft.count({ where: { organizationId: resolveDocumentStorageRuntimeFromEnv().organizationId, ownerUserId: a.actor.id, customerId: record.customerId, status: { in: ["IN_PROGRESS", "PENDING", "SOLD"] } } });
          if (previous && input.confirmSeparateIntent !== "on") throw new PipelineError("EXISTING_DEALS", "This customer already has accessible deals. Open Documents to link one, or explicitly confirm a separate transaction.", 409);
          if (previous) text(input.reason, "Reason for a separate transaction", true, 1000);
          const documentOrg = resolveDocumentStorageRuntimeFromEnv().organizationId;
          // Customer ownership and document scope remain governed by the existing deal desk.
          const dealId = randomUUID(), pathway = record.pipelineState?.pathway ?? "retail-sale";
          const snapshot = { "desk:workflowId": pathway, "desk:identity": { customerId: record.customerId, vehicleId: "", inventoryUnitId: null }, "desk:form": { customerId: record.customerId, ownerUserId: a.actor.id, vehicle: String(object(record.pipelineState?.metadata).vehicle ?? ""), amount: record.estimatedValueCents === null ? "" : String(record.estimatedValueCents / 100), note: record.summary ?? "" }, "desk:manualCustomerName": record.customer!.displayName, jackets: {}, references: {} };
          await db.dealDeskDraft.create({ data: { id: dealId, organizationId: documentOrg, ownerUserId: a.actor.id, customerId: record.customerId, customerName: record.customer!.displayName, pathway, vehicleReference: String(object(record.pipelineState?.metadata).vehicle ?? ""), status: "IN_PROGRESS", snapshot: json(snapshot) } });
          await persistDealContext(a.actor, db, dealId, record.customerId, snapshot);
          await db.crmPipelineState.update({ where: { opportunityId: id }, data: { dealId } });
        }
        if (!record.pipelineState?.dealId && ["repairs", "daily-rental", "vehicle-loaner", "test-drive"].includes(record.pipelineState?.pathway ?? "")) {
          const title = record.pipelineState?.pathway === "repairs" ? "Confirm repair completion, authorization and delivery plan" : "Confirm vehicle return date, condition evidence and return obligations";
          await followUp(db, a, record, title, new Date(now.getTime() + 86400000));
        }
      } else throw new PipelineError("INVALID_ACTION", "Choose an available pipeline action.");
      await db.unifiedCrmOpportunityRecord.update({ where: { id }, data: { version: { increment: 1 } } });
      record = await current(db, a, id);
    }
    await reconcile(db, a, await current(db, a, record.id), now);
    const latest = await current(db, a, record.id), result = { id: latest.id, version: latest.version, dealId: latest.pipelineState?.dealId ?? null };
    await db.enterpriseAggregateVersion.upsert({ where: { organizationId_domain_subjectType_subjectId: { organizationId: a.organizationId, domain: "UNIFIED_CRM", subjectType: "OPPORTUNITY", subjectId: latest.opportunityNumber } }, create: { organizationId: a.organizationId, domain: "UNIFIED_CRM", subjectType: "OPPORTUNITY", subjectId: latest.opportunityNumber, version: latest.version }, update: { version: latest.version } });
    const ledger = await db.enterpriseCommandLedger.create({ data: { organizationId: a.organizationId, actorUserId: a.actor.id, domain: "CRM_PIPELINE", subjectType: "OPPORTUNITY", subjectId: latest.opportunityNumber, commandType: action, status: "SUCCEEDED", idempotencyKey: key, requestHash: hash, correlationId: key, expectedVersion: typeof input.expectedVersion === "number" ? input.expectedVersion : 0, resultingVersion: latest.version, resultSnapshot: result, completedAt: now } });
    const auditValue = { stage: latest.stage, ownerUserId: latest.ownerUserId, nextActionLabel: latest.nextActionLabel, nextActionDueAt: iso(latest.nextActionDueAt), expectedCloseAt: iso(latest.expectedCloseAt), estimatedValueCents: latest.estimatedValueCents, disposition: latest.pipelineState?.disposition, dealId: result.dealId };
    await db.enterpriseAuditEvent.create({ data: { organizationId: a.organizationId, actorUserId: a.actor.id, commandId: ledger.id, domain: "CRM_PIPELINE", subjectType: "OPPORTUNITY", subjectId: latest.opportunityNumber, eventType: action, reason, priorValue: prior ? json(prior) : undefined, newValue: json(auditValue), metadata: json({ requestHash: hash }), correlationId: key } });
    const event = await db.enterpriseDomainEvent.create({ data: { organizationId: a.organizationId, commandId: ledger.id, domain: "CRM_PIPELINE", aggregateType: "OPPORTUNITY", aggregateId: latest.opportunityNumber, aggregateVersion: latest.version, eventType: action, payload: json({ id: latest.id, actorId: a.actor.id }) } });
    await db.enterpriseOutboxMessage.create({ data: { organizationId: a.organizationId, domainEventId: event.id, topic: "crm.pipeline.continuity", messageKey: latest.opportunityNumber, payload: json({ opportunityId: latest.id, actorId: a.actor.id }) } });
    return { ...result, duplicate: false };
  }, { timeout: 20000 });
}

export { reconcile as reconcilePipelineRecord, where as pipelineRecordWhere, include as pipelineRecordInclude, followUp as createPipelineFollowUp };
