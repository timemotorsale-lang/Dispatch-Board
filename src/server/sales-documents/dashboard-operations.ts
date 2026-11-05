import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/server/db/client";
import { toAuthenticatedUser, type AuthenticatedUser } from "@/server/auth/store";
import { canManageAssignments } from "@/server/policies/access";
import { evaluateUnifiedCrmCustomerReadPolicy } from "@/server/policies/unified-crm-customer-read";
import { dealOrganization } from "@/server/deal-continuity/identities";
import { resolveDocumentStorageRuntimeFromEnv } from "@/server/document-library/storage-config";
import { createManualTask } from "@/server/services/task-create-service";
import { createTaskCreateRepository } from "@/server/repositories/task-create-repository";
import { businessDate, moneyToday } from "@/lib/money-resources";
import { financialEntry, financialEntryError, record, summarizeDealFinancials, taskDealLink, type DealFinancialEntry, type DealFinancialKind, type DealMilestone } from "@/lib/deal-dashboard-enterprise";
import { requireSalesDocumentsUser } from "./service";
import { SalesDocumentsError } from "./domain";

const org = () => resolveDocumentStorageRuntimeFromEnv().organizationId;
const text = (value: unknown, max = 240) => typeof value === "string" ? value.trim().slice(0, max) : "";
const json = (value: unknown) => JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
export function canManageDeals(actor: AuthenticatedUser) { try { requireSalesDocumentsUser(actor, true); return canManageAssignments(actor); } catch { return false; } }
const staffInclude = { userRoles: { include: { role: { include: { roleDuties: { include: { duty: true } } } } } }, userDuties: { include: { duty: true } } } as const;
async function staffUser(id: string, db: Prisma.TransactionClient) {
  const found = await db.user.findFirst({ where: { id, isActive: true }, include: staffInclude });
  if (!found) throw new SalesDocumentsError("Choose an active staff member.");
  const actor = toAuthenticatedUser(found);
  requireSalesDocumentsUser(actor);
  return actor;
}
async function canOwnCustomer(actor: AuthenticatedUser, customerId: string | null | undefined, db: Prisma.TransactionClient) {
  if (!customerId) return true;
  const policy = evaluateUnifiedCrmCustomerReadPolicy(actor);
  if (!policy.allowed || !policy.recordScope) return false;
  if (policy.recordScope.kind === "ORGANIZATION") return true;
  return Boolean(await db.customer.findFirst({ where: { id: customerId, organizationId: dealOrganization(), ownerUserId: policy.recordScope.ownerUserId, status: "ACTIVE", mergedIntoCustomerId: null }, select: { id: true } }));
}
async function resolveDeal(actor: AuthenticatedUser, input: Record<string, unknown>, db: Prisma.TransactionClient) {
  const draftId = text(input.draftId), jacketId = text(input.jacketId), organizationId = org();
  if (!draftId && !jacketId) throw new SalesDocumentsError("Choose the saved deal first.");
  const draft = draftId ? await db.dealDeskDraft.findFirst({ where: { id: draftId, organizationId, ...(!canManageDeals(actor) ? { ownerUserId: actor.id } : {}) } }) : null;
  if (draftId && !draft) throw new SalesDocumentsError("This deal is not available to your account.", 404);
  const snapshot = record(draft?.snapshot), linked = record(snapshot.jackets)[draft?.pathway || ""], refs = Object.values(record(snapshot.references)).filter((value): value is string => typeof value === "string");
  const jacket = jacketId || linked || refs.length ? await db.salesDocumentJacket.findFirst({ where: { organizationId, ...(draft ? { pathway: draft.pathway, OR: [...(typeof linked === "string" ? [{ id: linked }] : []), ...(refs.length ? [{ dealReference: { in: refs } }] : [])] } : {}), ...(jacketId ? { id: jacketId } : {}) } }) : null;
  if (jacketId && !jacket) throw new SalesDocumentsError("This packet is not linked to the selected deal.", 404);
  return { draft, jacket, organizationId, subjectId: draft?.id || jacket!.id };
}
export async function readDealOperations(actor: AuthenticatedUser | null, input: Record<string, unknown>) {
  const user = requireSalesDocumentsUser(actor), resolved = await resolveDeal(user, input, prisma);
  const { draft, jacket, organizationId, subjectId } = resolved;
  const customerId = draft?.customerId || jacket?.customerId;
  const [events, tasks, staff, customer] = await Promise.all([
    prisma.documentLibraryAuditEvent.findMany({ where: { organizationId, OR: [{ subjectType: "DEAL", subjectId }, ...(jacket ? [{ packetId: jacket.packetId }] : [])] }, orderBy: [{ occurredAt: "asc" }, { id: "asc" }] }),
    prisma.task.findMany({ where: { ...(!canManageDeals(user) ? { assignedUserId: user.id } : {}), OR: [...(draft ? [{ templateSnapshot: { path: ["dealDashboard", "draftId"], equals: draft.id } }] : []), ...(jacket ? [{ templateSnapshot: { path: ["dealDashboard", "jacketId"], equals: jacket.id } }] : [])] }, select: { id: true, title: true, dueAt: true, status: true, assignedUserId: true, templateSnapshot: true, assignedUser: { select: { name: true } } }, orderBy: { dueAt: "asc" } }),
    canManageDeals(user) ? prisma.user.findMany({ where: { isActive: true }, include: staffInclude, orderBy: { name: "asc" } }) : Promise.resolve([]),
    customerId && canManageDeals(user) ? prisma.customer.findFirst({ where: { id: customerId, organizationId: dealOrganization(), status: "ACTIVE", mergedIntoCustomerId: null }, select: { ownerUserId: true } }) : Promise.resolve(null),
  ]);
  const draftHistory = (Array.isArray(draft?.statusHistory) ? draft.statusHistory : []).map(record);
  const actorIds = [...new Set([...events.map(event => event.actorUserId), ...draftHistory.map(event => text(event.actorId))].filter(Boolean))];
  const historicalActors = await prisma.user.findMany({ where: { id: { in: actorIds } }, select: { id: true, name: true } });
  const actorNames = new Map(historicalActors.map(person => [person.id, person.name]));
  const staffChoices = staff.flatMap(person => { try { const candidate = toAuthenticatedUser(person); requireSalesDocumentsUser(candidate); const scope = evaluateUnifiedCrmCustomerReadPolicy(candidate).recordScope; return [{ id: candidate.id, name: candidate.name, canOwnDeal: !customerId || scope?.kind === "ORGANIZATION" || scope?.kind === "OWNER" && customer?.ownerUserId === candidate.id }]; } catch { return []; } });
  const financialEntries = events.filter(event => event.action === "DEAL_FINANCIAL_RECORDED").flatMap(event => { const entry = financialEntry(event.id, event.metadata, event.occurredAt.toISOString()); return entry ? [entry] : []; });
  const history = [...events.filter(event => !["DEAL_REMINDER", "DEAL_REASSIGN", "DEAL_FINANCIAL", "DEAL_MILESTONE"].includes(event.action)).map(event => ({ id: event.id, action: event.action, note: event.note, actorName: text(record(event.metadata).actorName) || actorNames.get(event.actorUserId) || "Former staff member", at: event.occurredAt.toISOString() })), ...draftHistory.map((value, index) => ({ id: `draft-${index}`, action: text(value.action) || `${text(value.from) || "New"} → ${text(value.to)}`, note: text(value.reason, 1000), actorName: text(value.actorName) || actorNames.get(text(value.actorId)) || "Former staff member", at: text(value.at) }))].sort((a, b) => b.at.localeCompare(a.at));
  return { pathway: draft?.pathway || jacket?.pathway || "", draftId: draft?.id ?? null, jacketId: jacket?.id ?? null, draftRevision: draft?.revision ?? null, jacketRevision: jacket?.revision ?? null, customerName: draft?.customerName || jacket?.customerName || "Customer", vehicleReference: draft?.vehicleReference || jacket?.vehicleReference || "", ownerId: draft?.ownerUserId || jacket?.createdByUserId, canManage: canManageDeals(user), canEdit: !draft || draft.ownerUserId === user.id, inactive: Boolean(draft && ["ARCHIVED", "LOST", "CANCELLED"].includes(draft.status)), history, tasks: tasks.filter(task => taskDealLink(task.templateSnapshot)?.organizationId === organizationId).map(task => ({ id: task.id, title: task.title, dueAt: task.dueAt.toISOString(), status: task.status, assignedUserId: task.assignedUserId, ownerName: task.assignedUser.name })), staff: staffChoices.filter((person): person is NonNullable<typeof person> => person !== null), financialEntries, financials: summarizeDealFinancials(financialEntries), milestones: Object.fromEntries(events.filter(event => event.action === "DEAL_MILESTONE_RECORDED").map(event => [text(record(event.metadata).dimension), { ...record(event.metadata), at: event.occurredAt.toISOString() } as DealMilestone])) };
}
export type DealOperationsView = Awaited<ReturnType<typeof readDealOperations>>;

export async function manageDealOperations(actor: AuthenticatedUser | null, input: Record<string, unknown>, transaction?: Prisma.TransactionClient) {
  const user = requireSalesDocumentsUser(actor), action = text(input.action), operationKey = text(input.operationKey, 100);
  if (!["DEAL_REMINDER", "DEAL_REASSIGN", "DEAL_FINANCIAL", "DEAL_MILESTONE"].includes(action)) throw new SalesDocumentsError("Choose a supported deal operation.");
  if (!/^[a-zA-Z0-9-]{8,100}$/.test(operationKey)) throw new SalesDocumentsError("Refresh this panel before saving.");
  if (action !== "DEAL_REMINDER" && !canManageDeals(user)) throw new SalesDocumentsError("A manager must record ownership, verified financial activity, or completion evidence.", 403);
  const requestHash = createHash("sha256").update(JSON.stringify(input)).digest("hex");
  const execute = async (db: Prisma.TransactionClient) => {
    const { draft, jacket, organizationId, subjectId } = await resolveDeal(user, input, db);
    const previous = await db.documentLibraryAuditEvent.findUnique({ where: { organizationId_action_idempotencyKey: { organizationId, action, idempotencyKey: operationKey } } });
    if (previous) { if (record(previous.metadata).requestHash !== requestHash || previous.actorUserId !== user.id) throw new SalesDocumentsError("This operation reference was already used. Refresh before retrying.", 409); return record(previous.metadata).result; }
    if (draft && ["ARCHIVED", "CANCELLED", "LOST"].includes(draft.status) && action !== "DEAL_FINANCIAL") throw new SalesDocumentsError("This deal is inactive. Only manager-verified financial corrections can be recorded here.", 409);
    if (action === "DEAL_REASSIGN" && !draft) throw new SalesDocumentsError("Only saved drafts can be reassigned. Packet creators remain part of the historical record.");
    // Lock in lifecycle order. Operational records do not change terms or invalidate reviewed paperwork.
    if (draft) {
      const locked = await db.$queryRaw<Array<{ revision: number }>>(Prisma.sql`SELECT "revision" FROM "DealDeskDraft" WHERE "id" = ${draft.id} AND "organizationId" = ${organizationId} FOR UPDATE`);
      if (locked.length !== 1 || input.draftRevision !== locked[0].revision) throw new SalesDocumentsError("This deal changed. Refresh this panel before saving.", 409);
    }
    if (jacket) {
      const locked = await db.$queryRaw<Array<{ revision: number }>>(Prisma.sql`SELECT "revision" FROM "SalesDocumentJacket" WHERE "id" = ${jacket.id} AND "organizationId" = ${organizationId} FOR UPDATE`);
      if (locked.length !== 1 || input.jacketRevision !== locked[0].revision) throw new SalesDocumentsError("This packet changed. Refresh this panel before saving.", 409);
    }
    const concurrent = await db.documentLibraryAuditEvent.findUnique({ where: { organizationId_action_idempotencyKey: { organizationId, action, idempotencyKey: operationKey } } });
    if (concurrent) { if (record(concurrent.metadata).requestHash !== requestHash || concurrent.actorUserId !== user.id) throw new SalesDocumentsError("This operation reference was already used. Refresh before retrying.", 409); return record(concurrent.metadata).result; }
    const reason = text(input.reason, 1000);
    let result: Record<string, unknown> = { saved: true };
    let auditAction = `${action}_RECORDED`, details: Record<string, unknown> = {};
    if (action === "DEAL_REMINDER") {
      const title = text(input.title), due = new Date(text(input.dueAt)), assignee = text(input.assignedUserId) || user.id;
      if (title.length < 3 || !Number.isFinite(due.getTime()) || due.getTime() <= Date.now()) throw new SalesDocumentsError("Enter a reminder title and a future due date and time.");
      if (assignee !== user.id && !canManageDeals(user)) throw new SalesDocumentsError("Staff can assign reminders only to themselves.", 403);
      await staffUser(assignee, db);
      const task = await createManualTask(user, { assignedUserId: assignee, title, description: `Deal: ${jacket?.dealNumber || subjectId}. ${draft?.vehicleReference || jacket?.vehicleReference || ""}. ${reason}`, dueAt: due.toISOString(), boardDate: moneyToday(), customerReference: draft?.customerName || jacket?.customerName, vehicleReference: draft?.vehicleReference || jacket?.vehicleReference, status: "NOT_STARTED", priority: input.priority === "HIGH" ? "HIGH" : "MEDIUM", requiresManagerApproval: false, workflowArea: "SALES" }, createTaskCreateRepository(db));
      const created = await db.task.findUniqueOrThrow({ where: { id: task.id }, select: { templateSnapshot: true } });
      await db.task.update({ where: { id: task.id }, data: { customerId: draft?.customerId || jacket?.customerId, templateSnapshot: json({ ...record(created.templateSnapshot), dealDashboard: { version: 1, organizationId, draftId: draft?.id ?? null, jacketId: jacket?.id ?? null } }) } });
      result = { saved: true, taskId: task.id }; details = { title, dueAt: due.toISOString(), assignedUserId: assignee };
    } else if (action === "DEAL_REASSIGN") {
      if (reason.length < 10) throw new SalesDocumentsError("Enter an ownership-change reason of at least 10 characters.");
      const target = await staffUser(text(input.assignedUserId), db);
      if (!await canOwnCustomer(target, draft!.customerId, db)) throw new SalesDocumentsError("This staff member does not have access to the linked customer. Assign the customer through Customer 360 first, then transfer this deal. No ownership was changed.", 409);
      await db.dealDeskDraft.update({ where: { id: draft!.id }, data: { ownerUserId: target.id, revision: { increment: 1 }, statusHistory: json([...(Array.isArray(draft!.statusHistory) ? draft!.statusHistory : []), { action: "REASSIGNED", from: draft!.status, to: draft!.status, actorId: user.id, actorName: user.name, at: new Date().toISOString(), reason, previousOwnerId: draft!.ownerUserId, ownerUserId: target.id }]) } });
      details = { previousOwnerId: draft!.ownerUserId, ownerUserId: target.id, ownerName: target.name };
    } else if (action === "DEAL_FINANCIAL") {
      if (!jacket) throw new SalesDocumentsError("Prepare the existing deal's packet before recording financial activity.");
      if (input.confirmed !== true || !text(input.reference) || text(input.evidence, 1000).length < 10 || reason.length < 10) throw new SalesDocumentsError("Confirm the activity was verified, and enter its reference, supporting evidence and reason (at least 10 characters each for evidence and reason).");
      const date = text(input.businessDate); try { businessDate(date); } catch { throw new SalesDocumentsError("Choose a valid business date."); }
      if (date > moneyToday()) throw new SalesDocumentsError("Verified activity cannot be dated in the future.");
      const events = await db.documentLibraryAuditEvent.findMany({ where: { organizationId, packetId: jacket.packetId, action: "DEAL_FINANCIAL_RECORDED" }, orderBy: [{ occurredAt: "asc" }, { id: "asc" }] });
      const entries: DealFinancialEntry[] = events.flatMap(event => { const entry = financialEntry(event.id, event.metadata, event.occurredAt.toISOString()); return entry ? [entry] : []; });
      const proposed = { kind: text(input.kind) as DealFinancialKind, amountCents: Number(input.amountCents), originalId: text(input.originalId) || null };
      const error = financialEntryError(entries, proposed); if (error) throw new SalesDocumentsError(error);
      const original = entries.find(entry => entry.id === proposed.originalId);
      if (original && date < original.businessDate) throw new SalesDocumentsError("A refund or reversal cannot be dated before its original transaction.");
      details = { ...proposed, businessDate: date, reference: text(input.reference), evidence: text(input.evidence, 1000), reason, actorName: user.name };
      auditAction = "DEAL_FINANCIAL_RECORDED";
      // Provider references may only identify one original payment/refund per deal.
      if (["PAYMENT", "REFUND"].includes(proposed.kind) && entries.some(entry => entry.kind === proposed.kind && entry.reference.toLowerCase() === String(details.reference).toLowerCase())) throw new SalesDocumentsError("This payment or refund reference is already recorded on this deal.", 409);
    } else {
      if (!jacket || !["FUNDING", "DELIVERY"].includes(text(input.dimension)) || !["VERIFIED", "NOT_REQUIRED", "PENDING"].includes(text(input.state))) throw new SalesDocumentsError("Choose funding or delivery and its verified state on the existing packet.");
      if (reason.length < 10 || (input.state === "VERIFIED" && text(input.reference).length < 3)) throw new SalesDocumentsError("Record a reason of at least 10 characters and a verification reference when marking complete.");
      details = { dimension: input.dimension, state: input.state, reference: text(input.reference), reason, actorName: user.name };
      auditAction = "DEAL_MILESTONE_RECORDED";
    }
    const data = { organizationId, ...(jacket ? { packetId: jacket.packetId } : {}), subjectType: "DEAL", subjectId, actorUserId: user.id, note: reason || `Created deal-specific reminder: ${text(input.title)}`, metadata: json({ ...details, actorName: user.name }), action: auditAction, idempotencyKey: operationKey, occurredAt: new Date() };
    await db.documentLibraryAuditEvent.create({ data });
    await db.documentLibraryAuditEvent.create({ data: { ...data, action, metadata: json({ requestHash, result, actorName: user.name }) } });
    return result;
  };
  return transaction ? execute(transaction) : prisma.$transaction(execute, { timeout: 30000 });
}
