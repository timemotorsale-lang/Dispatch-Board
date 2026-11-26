import { createHash, randomUUID } from "node:crypto";
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
import { isRentalPathway } from "@/lib/rental-operations";
import { canWorkRentalIncidentClaims, connectRentalIncidentClaim } from "@/server/claims-workspace/rental-incident";
import { financialEntry, financialEntryError, record, summarizeDealFinancials, taskDealLink, type DealFinancialKind, type DealMilestone } from "@/lib/deal-dashboard-enterprise";
import { getRentalReceipt, RENTAL_PAYMENT_METHODS, rentalReceiptAdjustment, validRentalPaymentReference, type RentalPaymentMethod, type RentalReceipt } from "@/lib/rental-payment";
import { requireSalesDocumentsUser } from "./service";
import { SalesDocumentsError } from "./domain";

const org = () => resolveDocumentStorageRuntimeFromEnv().organizationId;
const text = (value: unknown, max = 240) => typeof value === "string" ? value.trim().slice(0, max) : "";
const json = (value: unknown) => JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
const rentalActions = ["RENTAL_PROGRESS_NOTE", "RENTAL_INCIDENT", "RENTAL_INCIDENT_CLAIM"];
const rentalIncidentAction = "RENTAL_INCIDENT_RECORDED";
const rentalClaimAction = "RENTAL_INCIDENT_CLAIM_RECORDED";
const rentalNoteAction = "RENTAL_PROGRESS_NOTE_RECORDED";
const financialAction = "DEAL_FINANCIAL_RECORDED";

function readFinancialEntries(events: { id: string; metadata: unknown; occurredAt: Date }[]) {
  return events.flatMap(event => {
    const entry = financialEntry(event.id, event.metadata, event.occurredAt.toISOString());
    return entry ? [entry] : [];
  });
}
const rentalBookingScope = (draftId: string) => ({
  organizationId: dealOrganization(), context: { draftId, organizationId: dealOrganization() },
  checkedOutAt: { not: null }, status: { in: ["CHECKED_OUT", "RETURNED_REVIEW", "RETURNED"] }
});
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
  if (input.expectedCustomerId !== undefined && (
    !text(input.expectedCustomerId) || draft?.customerId !== input.expectedCustomerId || (jacket?.customerId && jacket.customerId !== input.expectedCustomerId)
  )) throw new SalesDocumentsError("This deal no longer matches this customer. Reopen it from the customer record.", 409);
  return { draft, jacket, organizationId, subjectId: draft?.id || jacket!.id };
}
export async function readDealOperations(actor: AuthenticatedUser | null, input: Record<string, unknown>) {
  const user = requireSalesDocumentsUser(actor), resolved = await resolveDeal(user, input, prisma);
  const { draft, jacket, organizationId, subjectId } = resolved;
  const rentalDraft = draft && isRentalPathway(draft.pathway) ? draft : null;
  const customerId = draft?.customerId || jacket?.customerId;
  const [events, tasks, staff, customer, rentalBooking] = await Promise.all([
    prisma.documentLibraryAuditEvent.findMany({ where: { organizationId, OR: [{ subjectType: "DEAL", subjectId }, ...(jacket ? [{ packetId: jacket.packetId }] : [])] }, orderBy: [{ occurredAt: "asc" }, { id: "asc" }] }),
    prisma.task.findMany({ where: { ...(!canManageDeals(user) ? { assignedUserId: user.id } : {}), OR: [...(draft ? [{ templateSnapshot: { path: ["dealDashboard", "draftId"], equals: draft.id } }] : []), ...(jacket ? [{ templateSnapshot: { path: ["dealDashboard", "jacketId"], equals: jacket.id } }] : [])] }, select: { id: true, title: true, dueAt: true, status: true, assignedUserId: true, templateSnapshot: true, assignedUser: { select: { name: true } } }, orderBy: { dueAt: "asc" } }),
    canManageDeals(user) ? prisma.user.findMany({ where: { isActive: true }, include: staffInclude, orderBy: { name: "asc" } }) : Promise.resolve([]),
    customerId && canManageDeals(user) ? prisma.customer.findFirst({ where: { id: customerId, organizationId: dealOrganization(), status: "ACTIVE", mergedIntoCustomerId: null }, select: { ownerUserId: true } }) : Promise.resolve(null),
    rentalDraft ? prisma.vehicleUseBooking.findFirst({ where: rentalBookingScope(rentalDraft.id), orderBy: [{ checkedOutAt: "desc" }, { id: "desc" }], select: { id: true } }) : null,
  ]);
  const draftHistory = (Array.isArray(draft?.statusHistory) ? draft.statusHistory : []).map(record);
  const actorIds = [...new Set([...events.map(event => event.actorUserId), ...draftHistory.map(event => text(event.actorId))].filter(Boolean))];
  const historicalActors = await prisma.user.findMany({ where: { id: { in: actorIds } }, select: { id: true, name: true } });
  const actorNames = new Map(historicalActors.map(person => [person.id, person.name]));
  const canWorkRentalClaims = canWorkRentalIncidentClaims(user, dealOrganization());
  const rentalEvents = events.filter(event => event.subjectType === "DEAL" && event.subjectId === subjectId).reverse();
  const taskIds = new Set(tasks.filter(task => taskDealLink(task.templateSnapshot)?.organizationId === organizationId).map(task => task.id));
  const claimLinks = new Map(rentalEvents.filter(event => event.action === rentalClaimAction).map(event => {
    const metadata = record(event.metadata);
    return [text(metadata.incidentId), text(metadata.claimId)] as const;
  }));
  const incidentEvents = rentalEvents.filter(event => event.action === rentalIncidentAction);
  const incidentTaskIds = [...new Set(incidentEvents.map(event => text(record(event.metadata).taskId)).filter(Boolean))];
  const incidentTasks = incidentTaskIds.length ? await prisma.task.findMany({
    where: { id: { in: incidentTaskIds }, templateSnapshot: { path: ["dealDashboard", "draftId"], equals: subjectId } },
    select: { id: true, status: true, dueAt: true, completedAt: true, templateSnapshot: true, assignedUser: { select: { name: true } } }
  }) : [];
  const incidentTasksById = new Map(incidentTasks.filter(task => taskDealLink(task.templateSnapshot)?.organizationId === organizationId).map(task => [task.id, task]));
  const rentalActivity = rentalDraft || incidentEvents.length || rentalEvents.some(event => event.action === rentalNoteAction) ? {
    bookingId: rentalBooking?.id ?? null,
    canRecord: Boolean(rentalDraft && !["ARCHIVED", "LOST", "CANCELLED"].includes(rentalDraft.status)),
    canWorkClaims: canWorkRentalClaims,
    notes: rentalEvents.filter(event => event.action === rentalNoteAction).map(event => ({
      id: event.id, text: event.note, author: actorNames.get(event.actorUserId) || text(record(event.metadata).actorName) || "Former staff member", at: event.occurredAt.toISOString()
    })),
    incidents: incidentEvents.map(event => {
      const metadata = record(event.metadata), taskId = text(metadata.taskId), claimId = claimLinks.get(event.id);
      const task = incidentTasksById.get(taskId);
      return { id: event.id, kind: metadata.kind === "THEFT" ? "THEFT" : "DAMAGE", text: event.note,
        author: actorNames.get(event.actorUserId) || text(metadata.actorName) || "Former staff member", at: event.occurredAt.toISOString(),
        followUp: task ? { href: taskIds.has(taskId) ? `/tasks/${encodeURIComponent(taskId)}` : null, owner: task.assignedUser.name,
          status: task.status, dueAt: task.dueAt.toISOString(), completedAt: task.completedAt?.toISOString() ?? null } : null,
        claimLinked: Boolean(claimId), claimId: canWorkRentalClaims ? claimId ?? null : null };
    })
  } : null;
  const staffChoices = staff.flatMap(person => { try { const candidate = toAuthenticatedUser(person); requireSalesDocumentsUser(candidate); const scope = evaluateUnifiedCrmCustomerReadPolicy(candidate).recordScope; return [{ id: candidate.id, name: candidate.name, canOwnDeal: !customerId || scope?.kind === "ORGANIZATION" || scope?.kind === "OWNER" && customer?.ownerUserId === candidate.id }]; } catch { return []; } });
  const financialEntries = readFinancialEntries(events.filter(event => event.action === financialAction &&
    (event.packetId ? event.packetId === jacket?.packetId : rentalDraft?.pathway === "daily-rental")));
  const rentalReceipts = draft ? events.flatMap(event => {
    const receipt = event.action === financialAction && event.subjectId === draft.id ? getRentalReceipt(event.metadata) : null;
    return receipt ? [{ id: event.id, receiptNumber: receipt.receiptNumber, amountCents: receipt.amountCents, businessDate: receipt.businessDate }] : [];
  }).reverse() : [];
  const history = [...events.filter(event => !["DEAL_REMINDER", "DEAL_REASSIGN", "DEAL_FINANCIAL", "DEAL_RENTAL_PAYMENT", "DEAL_MILESTONE", ...rentalActions, rentalNoteAction, rentalIncidentAction, rentalClaimAction].includes(event.action)).map(event => ({ id: event.id, action: event.action, note: event.note, actorName: text(record(event.metadata).actorName) || actorNames.get(event.actorUserId) || "Former staff member", at: event.occurredAt.toISOString() })), ...draftHistory.map((value, index) => ({ id: `draft-${index}`, action: text(value.action) || `${text(value.from) || "New"} → ${text(value.to)}`, note: text(value.reason, 1000), actorName: text(value.actorName) || actorNames.get(text(value.actorId)) || "Former staff member", at: text(value.at) }))].sort((a, b) => b.at.localeCompare(a.at));
  return { rentalActivity, rentalReceipts, pathway: draft?.pathway || jacket?.pathway || "", draftId: draft?.id ?? null, jacketId: jacket?.id ?? null, draftRevision: draft?.revision ?? null, draftStatus: draft?.status ?? null, jacketRevision: jacket?.revision ?? null, customerName: draft?.customerName || jacket?.customerName || "Customer", vehicleReference: draft?.vehicleReference || jacket?.vehicleReference || "", ownerId: draft?.ownerUserId || jacket?.createdByUserId, canManage: canManageDeals(user), canEdit: !draft || draft.ownerUserId === user.id, inactive: Boolean(draft && ["ARCHIVED", "LOST", "CANCELLED"].includes(draft.status)), history, tasks: tasks.filter(task => taskDealLink(task.templateSnapshot)?.organizationId === organizationId).map(task => ({ id: task.id, title: task.title, dueAt: task.dueAt.toISOString(), status: task.status, assignedUserId: task.assignedUserId, ownerName: task.assignedUser.name })), staff: staffChoices.filter((person): person is NonNullable<typeof person> => person !== null), financialEntries, financials: summarizeDealFinancials(financialEntries), milestones: Object.fromEntries(events.filter(event => event.action === "DEAL_MILESTONE_RECORDED").map(event => [text(record(event.metadata).dimension), { ...record(event.metadata), at: event.occurredAt.toISOString() } as DealMilestone])) };
}
export type DealOperationsView = Awaited<ReturnType<typeof readDealOperations>>;

export async function readRentalPaymentReceipt(actor: AuthenticatedUser | null, input: { draftId: string; paymentId: string }) {
  const user = requireSalesDocumentsUser(actor);
  if (!input.draftId || !input.paymentId) throw new SalesDocumentsError("Choose a saved rental receipt.", 404);
  const { organizationId, subjectId } = await resolveDeal(user, { draftId: input.draftId }, prisma);
  const event = await prisma.documentLibraryAuditEvent.findFirst({
    where: { organizationId, id: input.paymentId, subjectType: "DEAL", subjectId, action: financialAction }
  });
  const receipt = event && getRentalReceipt(event.metadata);
  if (!event || !receipt) throw new SalesDocumentsError("This receipt is unavailable on the selected deal.", 404);
  const entries = readFinancialEntries(await prisma.documentLibraryAuditEvent.findMany({
    where: { organizationId, OR: [{ subjectType: "DEAL", subjectId }, ...(event.packetId ? [{ packetId: event.packetId }] : [])], action: financialAction }
  }));
  return rentalReceiptAdjustment(receipt, event.id, entries);
}

export async function manageRentalDealActivity(actor: AuthenticatedUser | null, input: Record<string, unknown>) {
  if (!rentalActions.includes(text(input.action))) throw new SalesDocumentsError("Choose a rental activity.");
  return manageDealOperations(actor, input);
}

export async function manageDealOperations(actor: AuthenticatedUser | null, input: Record<string, unknown>, transaction?: Prisma.TransactionClient) {
  const user = requireSalesDocumentsUser(actor), action = text(input.action), operationKey = text(input.operationKey, 100);
  const rentalAction = rentalActions.includes(action);
  const collectRentalPayment = action === "DEAL_RENTAL_PAYMENT";
  if (!["DEAL_REMINDER", "DEAL_REASSIGN", "DEAL_FINANCIAL", "DEAL_MILESTONE"].includes(action) && !rentalAction && !collectRentalPayment) throw new SalesDocumentsError("Choose a supported deal operation.");
  if (!/^[a-zA-Z0-9-]{8,100}$/.test(operationKey)) throw new SalesDocumentsError("Refresh this panel before saving.");
  if (action !== "DEAL_REMINDER" && !rentalAction && !canManageDeals(user)) throw new SalesDocumentsError("A manager must record ownership, verified financial activity, or completion evidence.", 403);
  const requestHash = createHash("sha256").update(JSON.stringify(input)).digest("hex");
  const execute = async (db: Prisma.TransactionClient) => {
    const { draft, jacket, organizationId, subjectId } = await resolveDeal(user, input, db);
    const previous = await db.documentLibraryAuditEvent.findUnique({ where: { organizationId_action_idempotencyKey: { organizationId, action, idempotencyKey: operationKey } } });
    if (previous) { if (record(previous.metadata).requestHash !== requestHash || previous.actorUserId !== user.id) throw new SalesDocumentsError("This operation reference was already used. Refresh before retrying.", 409); return record(previous.metadata).result; }
    if (rentalAction && (!draft || action !== "RENTAL_INCIDENT_CLAIM" && !isRentalPathway(draft.pathway))) throw new SalesDocumentsError("Open the saved rental or loaner deal to record this activity.", 409);
    if (draft && ["ARCHIVED", "CANCELLED", "LOST"].includes(draft.status) && !["DEAL_FINANCIAL", "RENTAL_INCIDENT_CLAIM"].includes(action)) throw new SalesDocumentsError("This deal is inactive.", 409);
    if (action === "DEAL_REASSIGN" && !draft) throw new SalesDocumentsError("Only saved drafts can be reassigned. Packet creators remain part of the historical record.");
    // Lock in lifecycle order. Operational records do not change terms or invalidate reviewed paperwork.
    if (draft) {
      const locked = await db.$queryRaw<Array<{ revision: number; customerId: string | null }>>(Prisma.sql`SELECT "revision", "customerId" FROM "DealDeskDraft" WHERE "id" = ${draft.id} AND "organizationId" = ${organizationId} FOR UPDATE`);
      if (locked.length !== 1 || input.draftRevision !== locked[0].revision || (input.expectedCustomerId !== undefined && input.expectedCustomerId !== locked[0].customerId)) throw new SalesDocumentsError("This deal changed. Refresh this panel before saving.", 409);
    }
    if (jacket && !rentalAction) {
      const locked = await db.$queryRaw<Array<{ revision: number; customerId: string | null }>>(Prisma.sql`SELECT "revision", "customerId" FROM "SalesDocumentJacket" WHERE "id" = ${jacket.id} AND "organizationId" = ${organizationId} FOR UPDATE`);
      if (locked.length !== 1 || input.jacketRevision !== locked[0].revision || (input.expectedCustomerId !== undefined && locked[0].customerId && input.expectedCustomerId !== locked[0].customerId)) throw new SalesDocumentsError("This packet changed. Refresh this panel before saving.", 409);
    }
    const concurrent = await db.documentLibraryAuditEvent.findUnique({ where: { organizationId_action_idempotencyKey: { organizationId, action, idempotencyKey: operationKey } } });
    if (concurrent) { if (record(concurrent.metadata).requestHash !== requestHash || concurrent.actorUserId !== user.id) throw new SalesDocumentsError("This operation reference was already used. Refresh before retrying.", 409); return record(concurrent.metadata).result; }
    let reason = text(input.reason, 1000);
    let result: Record<string, unknown> = { saved: true };
    let auditAction = `${action}_RECORDED`, details: Record<string, unknown> = {}, receiptId: string | undefined;
    if (action === "RENTAL_PROGRESS_NOTE") {
      if (!reason || typeof input.reason !== "string" || input.reason.trim().length > 1000) throw new SalesDocumentsError("Enter a progress note of up to 1000 characters.");
    } else if (action === "RENTAL_INCIDENT" || action === "RENTAL_INCIDENT_CLAIM") {
      const incident = action === "RENTAL_INCIDENT_CLAIM" ? await db.documentLibraryAuditEvent.findFirst({
        where: { id: text(input.incidentId), organizationId, subjectType: "DEAL", subjectId, action: rentalIncidentAction }
      }) : null;
      if (action === "RENTAL_INCIDENT_CLAIM" && !incident) throw new SalesDocumentsError("Open an incident saved on this deal.", 404);
      const incidentMetadata = record(incident?.metadata);
      const kind = incident ? incidentMetadata.kind : input.kind;
      if (kind !== "DAMAGE" && kind !== "THEFT") throw new SalesDocumentsError("Choose damage or theft.");
      const booking = await db.vehicleUseBooking.findFirst({
        where: { ...rentalBookingScope(draft!.id), id: incident ? text(incidentMetadata.bookingId) : text(input.bookingId),
          vehicle: { organizationId: dealOrganization() }, context: { ...rentalBookingScope(draft!.id).context, customer: { organizationId: dealOrganization() } } },
        select: { id: true, organizationId: true, context: { select: { customerId: true, customer: { select: { displayName: true } } } },
          vehicle: { select: { id: true, vin: true, make: true, model: true, year: true, stockNumber: true } } }
      });
      if (!booking) throw new SalesDocumentsError("This incident needs an actual checkout on the saved rental vehicle. Refresh the deal and review its custody history.", 409);
      if (incident) {
        if (!canWorkRentalIncidentClaims(user, booking.organizationId)) throw new SalesDocumentsError("Ask authorized Claims Desk staff to handle this incident.", 403);
        if (await db.documentLibraryAuditEvent.findFirst({ where: { organizationId, subjectType: "DEAL", subjectId, action: rentalClaimAction, metadata: { path: ["incidentId"], equals: incident.id } } })) {
          throw new SalesDocumentsError("This incident already has a linked claim. Refresh its activity to open it.", 409);
        }
        const claimId = text(input.claimId);
        if (input.claimAction !== "START" && (input.claimAction !== "LINK" || !claimId)) throw new SalesDocumentsError("Start internal intake or enter an existing Claims Desk record ID.");
        const savedClaimId = await connectRentalIncidentClaim(db, user, {
          incidentId: incident.id, organizationId: booking.organizationId, kind,
          customerId: booking.context.customerId, customerName: booking.context.customer.displayName,
          vehicle: booking.vehicle, claimId: input.claimAction === "LINK" ? claimId : null
        });
        reason = "Linked an internal Claims Desk record to this rental incident.";
        details = { incidentId: incident.id, claimId: savedClaimId };
        result = { saved: true, claimId: savedClaimId };
      } else {
        if (!reason || typeof input.reason !== "string" || input.reason.trim().length > 1000) throw new SalesDocumentsError("Describe the incident in up to 1000 characters.");
        const task = await createManualTask(user, {
          assignedUserId: user.id, title: kind === "DAMAGE" ? "Follow up on rental vehicle damage" : "Follow up on rental theft report",
          description: `Review the saved incident in Rentals & Loaners for deal #${draft!.dealNumber}. Coordinate Claims Desk intake as needed and close this task when follow-up is complete.`,
          dueAt: new Date(Date.now() + 86400000).toISOString(), boardDate: moneyToday(), status: "NOT_STARTED", priority: "HIGH",
          requiresManagerApproval: false, workflowArea: "SALES"
        }, createTaskCreateRepository(db));
        const created = await db.task.findUniqueOrThrow({ where: { id: task.id }, select: { templateSnapshot: true } });
        await db.task.update({ where: { id: task.id }, data: { templateSnapshot: json({ ...record(created.templateSnapshot),
          dealDashboard: { version: 1, organizationId, draftId: draft!.id, jacketId: jacket?.id ?? null } }) } });
        details = { kind, bookingId: booking.id, vehicleId: booking.vehicle.id, taskId: task.id };
        result = { saved: true, taskId: task.id };
      }
    } else if (action === "DEAL_REMINDER") {
      const title = text(input.title), due = new Date(text(input.dueAt)), assignee = text(input.assignedUserId) || user.id;
      if (title.length < 3 || !Number.isFinite(due.getTime()) || due.getTime() <= Date.now()) throw new SalesDocumentsError("Enter a reminder title and a future due date and time.");
      if (assignee !== user.id && !canManageDeals(user)) throw new SalesDocumentsError("Staff can assign reminders only to themselves.", 403);
      await staffUser(assignee, db);
      const task = await createManualTask(user, { assignedUserId: assignee, title, description: `Deal: ${jacket?.dealNumber || subjectId}. ${draft?.vehicleReference || jacket?.vehicleReference || ""}. ${reason}`, dueAt: due.toISOString(), boardDate: moneyToday(), customerReference: draft?.customerName || jacket?.customerName, vehicleReference: draft?.vehicleReference || jacket?.vehicleReference, status: "NOT_STARTED", priority: input.priority === "HIGH" ? "HIGH" : "MEDIUM", requiresManagerApproval: false, workflowArea: "SALES" }, createTaskCreateRepository(db));
      const created = await db.task.findUniqueOrThrow({ where: { id: task.id }, select: { templateSnapshot: true } });
      await db.task.update({ where: { id: task.id }, data: { customerId: draft?.customerId || jacket?.customerId, templateSnapshot: json({ ...record(created.templateSnapshot), dealDashboard: { version: 1, organizationId, draftId: draft?.id ?? null, jacketId: jacket?.id ?? null } }) } });
      result = { saved: true, taskId: task.id }; details = { title, dueAt: due.toISOString(), assignedUserId: assignee };
    } else if (action === "DEAL_REASSIGN") {
      if (!reason) throw new SalesDocumentsError("Enter an ownership-change reason.");
      const target = await staffUser(text(input.assignedUserId), db);
      if (!await canOwnCustomer(target, draft!.customerId, db)) throw new SalesDocumentsError("This staff member does not have access to the linked customer. Assign the customer through Customer 360 first, then transfer this deal. No ownership was changed.", 409);
      await db.dealDeskDraft.update({ where: { id: draft!.id }, data: { ownerUserId: target.id, revision: { increment: 1 }, statusHistory: json([...(Array.isArray(draft!.statusHistory) ? draft!.statusHistory : []), { action: "REASSIGNED", from: draft!.status, to: draft!.status, actorId: user.id, actorName: user.name, at: new Date().toISOString(), reason, previousOwnerId: draft!.ownerUserId, ownerUserId: target.id }]) } });
      details = { previousOwnerId: draft!.ownerUserId, ownerUserId: target.id, ownerName: target.name };
    } else if (action === "DEAL_FINANCIAL" || collectRentalPayment) {
      const dailyRental = draft?.pathway === "daily-rental";
      if (collectRentalPayment && !dailyRental) throw new SalesDocumentsError("Open the saved daily rental to record a payment.", 409);
      if (!jacket && !dailyRental) throw new SalesDocumentsError("Prepare the existing deal's packet before recording financial activity.");
      if (collectRentalPayment ? input.confirmed !== true : input.confirmed !== true || !text(input.reference) || !text(input.evidence, 1000) || !reason) {
        throw new SalesDocumentsError(collectRentalPayment ? "Confirm the payment was received before issuing a receipt." : "Confirm the activity was verified, and enter its reference, supporting evidence and reason.");
      }
      let date: string;
      try { date = businessDate(collectRentalPayment ? input.businessDate : text(input.businessDate)); }
      catch { throw new SalesDocumentsError("Choose a valid business date."); }
      if (date > moneyToday()) throw new SalesDocumentsError("Verified activity cannot be dated in the future.");
      const events = await db.documentLibraryAuditEvent.findMany({ where: { organizationId, action: financialAction, OR: [
        ...(jacket ? [{ packetId: jacket.packetId }] : []),
        ...(dailyRental ? [{ subjectType: "DEAL", subjectId, packetId: null }] : [])
      ] } });
      const entries = readFinancialEntries(events);
      const amountCents = collectRentalPayment && typeof input.amountCents !== "number" ? NaN : Number(input.amountCents);
      const proposed = { kind: (collectRentalPayment ? "PAYMENT" : text(input.kind)) as DealFinancialKind, amountCents, originalId: collectRentalPayment ? null : text(input.originalId) || null };
      const error = financialEntryError(entries, proposed); if (error) throw new SalesDocumentsError(error);
      const original = entries.find(entry => entry.id === proposed.originalId);
      if (original && date < original.businessDate) throw new SalesDocumentsError("A refund or reversal cannot be dated before its original transaction.");
      let reference = text(input.reference), evidence = text(input.evidence, 1000);
      if (collectRentalPayment) {
        const method = text(input.method) as RentalPaymentMethod;
        if (!Object.hasOwn(RENTAL_PAYMENT_METHODS, method)) throw new SalesDocumentsError("Choose how the payment was received.");
        reference = typeof input.reference === "string" ? input.reference.trim() : "";
        if ((method !== "CASH" || reference) && !validRentalPaymentReference(reference)) {
          throw new SalesDocumentsError("Enter a check, approval, or transfer reference of up to 64 characters. Use the transaction reference from your terminal for card payments.");
        }
        const customerId = draft!.customerId || jacket?.customerId;
        const [customer, context] = await Promise.all([
          customerId ? db.customer.findFirst({ where: { id: customerId, organizationId: dealOrganization(), status: "ACTIVE", mergedIntoCustomerId: null }, select: { displayName: true } }) : null,
          db.dealWorkflowContext.findFirst({ where: { draftId: draft!.id, organizationId: dealOrganization() }, select: { vehicle: { select: { year: true, make: true, model: true, vin: true } } } })
        ]);
        if (!customer?.displayName) throw new SalesDocumentsError("Link the rental to the saved customer before recording the payment.", 409);
        receiptId = randomUUID();
        const receiptNumber = `RR-${receiptId.toUpperCase()}`;
        const vehicle = context?.vehicle;
        const totals = summarizeDealFinancials(entries);
        const netPaidCents = totals.netCents + proposed.amountCents;
        const receipt: RentalReceipt = {
          receiptNumber, receivedAt: new Date().toISOString(), businessDate: date, amountCents: proposed.amountCents,
          method, reference: reference || null, customerName: customer.displayName, dealNumber: String(draft!.dealNumber),
          vehicle: [vehicle?.year, vehicle?.make, vehicle?.model].filter(Boolean).join(" ") || draft!.vehicleReference || null,
          vin: vehicle?.vin || jacket?.vin || null, receivedBy: user.name, purpose: "RENTAL_CHARGE", agreedCents: totals.agreedCents,
          netPaidCents, balanceCents: totals.agreedCents === null ? null : Math.max(0, totals.agreedCents - netPaidCents),
          creditCents: totals.agreedCents === null ? 0 : Math.max(0, netPaidCents - totals.agreedCents)
        };
        reason = "Rental charge payment received.";
        evidence = `${RENTAL_PAYMENT_METHODS[method]} received and confirmed by ${user.name}.`;
        reference = reference || receiptNumber;
        details = { rentalReceipt: receipt };
        result = { saved: true, receiptId, receiptNumber };
      }
      details = { ...details, ...proposed, businessDate: date, reference, evidence, reason, actorName: user.name };
      auditAction = financialAction;
      // Provider references may only identify one original payment/refund per deal.
      if (["PAYMENT", "REFUND"].includes(proposed.kind) && entries.some(entry => entry.kind === proposed.kind && entry.reference.toLowerCase() === String(details.reference).toLowerCase())) throw new SalesDocumentsError("This payment or refund reference is already recorded on this deal.", 409);
    } else {
      if (!jacket || !["FUNDING", "DELIVERY", "TITLE"].includes(text(input.dimension)) || !["VERIFIED", "NOT_REQUIRED", "PENDING"].includes(text(input.state))) throw new SalesDocumentsError("Choose funding, delivery or title and its verified state on the existing packet.");
      if (!reason || (input.state === "VERIFIED" && text(input.reference).length < 3)) throw new SalesDocumentsError("Record a reason and a verification reference when marking complete.");
      details = { dimension: input.dimension, state: input.state, reference: text(input.reference), reason, actorName: user.name };
      auditAction = "DEAL_MILESTONE_RECORDED";
    }
    const data = { organizationId, ...(jacket && !rentalAction ? { packetId: jacket.packetId } : {}), subjectType: "DEAL", subjectId, actorUserId: user.id, note: reason || `Created deal-specific reminder: ${text(input.title)}`, metadata: json({ ...details, actorName: user.name }), action: auditAction, idempotencyKey: operationKey, occurredAt: new Date() };
    const saved = await db.documentLibraryAuditEvent.create({ data: { ...data, ...(receiptId ? { id: receiptId } : {}) } });
    if (action === "RENTAL_INCIDENT") result = { ...result, incidentId: saved.id };
    await db.documentLibraryAuditEvent.create({ data: { ...data, action, ...(rentalAction && { note: "Rental activity saved." }), metadata: json({ requestHash, result, actorName: user.name }) } });
    return result;
  };
  return transaction ? execute(transaction) : prisma.$transaction(execute, { timeout: 30000 });
}
