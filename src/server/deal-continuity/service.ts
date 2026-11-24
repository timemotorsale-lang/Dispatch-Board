import { createHash, randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/server/db/client";
import type { AuthenticatedUser } from "@/server/auth/store";
import { requireOwnDealUser } from "./own-deal-access";
import { SalesDocumentsError } from "@/server/sales-documents/domain";
import { isManager } from "@/server/policies/access";
import { dealCustomer, dealDocumentOrganization, dealOrganization, dealVehicle } from "./identities";
import { normalizeVehicleUseCommand, vehicleUseOverlaps } from "@/lib/deal-continuity";
import { createEnterpriseCommandRepository } from "@/server/enterprise-command/repository";
import { assertVehicleCapability, evaluateVehicleCapability } from "@/server/enterprise-command/vehicle-capabilities";
import { validateRentalHandover } from "@/lib/rental-lifecycle";
import { rentalOperationsSummary } from "@/lib/rental-operations";
import { legacyRentalReturnWithoutCompletion } from "./custody-selection";
import { createManualTask } from "@/server/services/task-create-service";
import { createTaskCreateRepository } from "@/server/repositories/task-create-repository";
import { chicagoDate } from "@/lib/deal-dashboard";
import { isRentalPathway, readRentalReadiness, rentalReadinessAction } from "./rental-readiness";

type Tx = Prisma.TransactionClient;
const object = (value: unknown): Record<string, unknown> => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
const text = (value: unknown) => typeof value === "string" ? value.trim().slice(0, 240) : "";
const json = (value: unknown) => JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;

const readReturnPacket = (db: Tx, jacketId: string) => db.salesDocumentPacketVersion.findFirst({
  where: { jacketId, phase: "RETURN", disposition: "CLOSED" },
  orderBy: { version: "desc" }, select: { snapshot: true }
});

function hasSettlementReceipt(snapshot: unknown) {
  const documents = object(snapshot).documents;
  return Array.isArray(documents) && documents.some(document => object(document).type === "return-receipt" && object(document).reviewed === true);
}

async function assertRentalCancellation(db: Tx, user: AuthenticatedUser, draft: { organizationId: string; pathway: string; dealNumber: number; snapshot: unknown }, noHandoffConfirmed: boolean) {
  const jacketId = text(object(object(draft.snapshot).jackets)[draft.pathway]);
  const signedCheckout = await db.salesDocumentJacket.count({ where: {
    organizationId: draft.organizationId, pathway: draft.pathway,
    OR: [...(jacketId ? [{ id: jacketId }] : []), { dealNumber: String(draft.dealNumber) }],
    versions: { some: { phase: "CHECKOUT" } }
  } });
  if (!signedCheckout) return;
  if (!isManager(user)) throw new SalesDocumentsError("Ask a manager to confirm the vehicle was never handed over before cancelling this signed checkout.", 403);
  if (!noHandoffConfirmed) throw new SalesDocumentsError("Confirm from the custody records that the vehicle was never handed over.", 409);
}

export async function resolveDealSource(actor: AuthenticatedUser | null, source: { sourceDraftId?: string; sourceJacketId?: string }, db: Tx = prisma) {
  const user = requireOwnDealUser(actor), organizationId = dealOrganization();
  const documentOrganizationId = dealDocumentOrganization();
  if (Boolean(source.sourceDraftId) === Boolean(source.sourceJacketId)) throw new SalesDocumentsError("Choose one original deal or agreement.");
  const draft = source.sourceDraftId ? await db.dealDeskDraft.findFirst({ where: { id: source.sourceDraftId, organizationId: documentOrganizationId, ...(isManager(user) ? {} : { ownerUserId: user.id }) }, include: { continuity: true } }) : null;
  const jacket = source.sourceJacketId ? await db.salesDocumentJacket.findFirst({ where: { id: source.sourceJacketId, organizationId: documentOrganizationId } }) : null;
  if (!draft && !jacket) throw new SalesDocumentsError("The original deal is unavailable or outside your access.", 404);
  const original = draft ?? jacket!;
  let vehicleId = draft?.continuity?.vehicleId ?? null;
  if (!vehicleId) {
    const reference = jacket?.vin || original.vehicleReference;
    const matches = reference ? await db.vehicle.findMany({ where: { organizationId, mergedIntoVehicleId: null, OR: [{ vin: reference.toUpperCase() }, { stockNumber: reference }, { vehicleNumber: reference }, { inventoryUnits: { some: { inventoryNumber: reference, organizationId, closedAt: null } } }] }, select: { id: true }, take: 2 }) : [];
    if (matches.length === 1) vehicleId = matches[0].id;
  }
  const customerId = draft?.continuity?.customerId ?? original.customerId;
  if (customerId) await dealCustomer(actor, customerId, db);
  return { sourceDraftId: draft?.id ?? "", sourceJacketId: jacket?.id ?? "", customerId: customerId ?? "", customerName: original.customerName, sourceVehicleId: vehicleId ?? "", sourceVehicleReference: original.vehicleReference, pathway: original.pathway };
}

export async function persistDealContext(actor: AuthenticatedUser | null, db: Tx, draftId: string, customerId: string | null, snapshot: Record<string, unknown>, options: { allowVehicleOnlyDraft?: boolean } = {}) {
  const identity = object(snapshot["desk:identity"]), organizationId = dealOrganization();
  if (!identity.customerId && !identity.vehicleId && !identity.sourceDraftId && !identity.sourceJacketId) return;
  await db.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${organizationId + ":deal-context:" + draftId}, 0))`;
  const vehicleId = text(identity.vehicleId) || null;
  if (options.allowVehicleOnlyDraft && vehicleId && !customerId && !identity.customerId && !identity.sourceDraftId && !identity.sourceJacketId && !identity.sourceVehicleId) {
    await dealVehicle(actor, vehicleId, db);
    return;
  }
  if (!customerId || customerId !== identity.customerId) throw new SalesDocumentsError("Choose one shared CRM customer for this deal.");
  await dealCustomer(actor, customerId, db);
  const vehicle = vehicleId ? await dealVehicle(actor, vehicleId, db) : null;
  const sourceDraftId = text(identity.sourceDraftId) || null, sourceJacketId = text(identity.sourceJacketId) || null;
  const source = sourceDraftId || sourceJacketId ? await resolveDealSource(actor, { sourceDraftId: sourceDraftId ?? undefined, sourceJacketId: sourceJacketId ?? undefined }, db) : null;
  if (source?.customerId && source.customerId !== customerId) throw new SalesDocumentsError("The loaner customer must match the original deal.", 409);
  const sourceVehicleId = source?.sourceVehicleId || text(identity.sourceVehicleId) || null;
  if (sourceVehicleId) await dealVehicle(actor, sourceVehicleId, db);
  if (sourceVehicleId && sourceVehicleId === vehicleId) throw new SalesDocumentsError("Choose a separate temporary vehicle, not the original leased vehicle.");
  const existing = await db.dealWorkflowContext.findUnique({ where: { draftId } });
  const data = { organizationId, draftId, customerId, vehicleId, inventoryUnitId: vehicle?.inventoryUnitId ?? null, sourceDraftId, sourceJacketId, sourceVehicleId };
  if (existing && JSON.stringify([existing.customerId, existing.sourceDraftId, existing.sourceJacketId, existing.sourceVehicleId]) !== JSON.stringify([customerId, sourceDraftId, sourceJacketId, sourceVehicleId]) && await db.vehicleUseBooking.count({ where: { contextId: existing.id } })) throw new SalesDocumentsError("Start a separate deal to change the customer or original agreement after vehicle-use history has been recorded.", 409);
  if (existing && JSON.stringify([existing.customerId, existing.vehicleId, existing.inventoryUnitId, existing.sourceDraftId, existing.sourceJacketId, existing.sourceVehicleId]) !== JSON.stringify([customerId, vehicleId, data.inventoryUnitId, sourceDraftId, sourceJacketId, sourceVehicleId]) && await db.vehicleUseBooking.count({ where: { contextId: existing.id, OR: [{ status: { in: ["RESERVED", "CHECKED_OUT", "RETURNED_REVIEW"] } }, legacyRentalReturnWithoutCompletion] } })) throw new SalesDocumentsError("Resolve the active vehicle assignment or pending return review before changing its customer or vehicle.", 409);
  return db.dealWorkflowContext.upsert({ where: { draftId }, create: { id: draftId, ...data, createdByUserId: actor!.id }, update: data });
}

export async function contextFor(actor: AuthenticatedUser | null, id: string, db: Tx = prisma) {
  const user = requireOwnDealUser(actor);
  const context = await db.dealWorkflowContext.findFirst({ where: { id, organizationId: dealOrganization() }, include: { draft: true, bookings: { orderBy: { createdAt: "desc" } } } });
  if (!context) throw new SalesDocumentsError("Save a deal with its shared customer and vehicle first.", 404);
  if (context.draft.ownerUserId !== user.id && !isManager(user)) throw new SalesDocumentsError("This deal is outside your authorized scope.", 403);
  await dealCustomer(actor, context.customerId, db);
  return context;
}
export async function readDealContinuity(actor: AuthenticatedUser | null, id: string) {
  const user = requireOwnDealUser(actor);
  const context = await contextFor(actor, id).catch(error => {
    if (error instanceof SalesDocumentsError && error.status === 404) return null;
    throw error;
  });
  if (!context) {
    const draft = await prisma.dealDeskDraft.findFirst({
      where: { id, organizationId: dealDocumentOrganization(), pathway: { in: ["daily-rental", "vehicle-loaner"] }, ...(isManager(user) ? {} : { ownerUserId: user.id }) }
    });
    if (!draft) throw new SalesDocumentsError("Save a deal with its shared customer and vehicle first.", 404);
    const agreementId = text(object(object(draft.snapshot).jackets)[draft.pathway]);
    const events = (Array.isArray(draft.statusHistory) ? draft.statusHistory : []).map(object)
      .filter(event => event.action === "RENTAL_DRAFT_CANCELLED")
      .map(event => ({ id: String(event.operationKey), action: "RENTAL_DRAFT_CANCELLED", occurredAt: String(event.at), actorUserId: String(event.actorId), result: { audit: { reason: String(event.reason) } } }));
    return { agreements: [], agreementHref: agreementId ? `/sales-documents?jacketId=${encodeURIComponent(agreementId)}` : null, id, customerId: draft.customerId, vehicleId: null, source: null, bookings: [], packetClosed: false, settlementReceiptOnFile: false, canManageExceptions: isManager(user), draftStatus: draft.status, events };
  }
  const source = context.sourceDraftId || context.sourceJacketId ? await resolveDealSource(actor, { sourceDraftId: context.sourceDraftId ?? undefined, sourceJacketId: context.sourceJacketId ?? undefined }) : null;
  const jacketIds = object(context.draft.snapshot).jackets;
  const agreementId = text(object(jacketIds)[context.draft.pathway]);
  const vehicle = context.vehicleId ? await dealVehicle(actor, context.vehicleId) : null;
  const checkoutAgreements = agreementId && vehicle ? await prisma.salesDocumentJacket.findMany({ where: { id: agreementId, organizationId: dealDocumentOrganization(), customerId: context.customerId, pathway: context.draft.pathway, state: "CHECKED_OUT", vin: vehicle.vin, versions: { some: { phase: "CHECKOUT" } } }, select: { id: true, dealNumber: true, packetId: true } }) : [];
  const agreements = checkoutAgreements.map(({ id, dealNumber }) => ({ id, dealNumber }));
  const insuranceProofs = checkoutAgreements[0] ? await prisma.documentLibraryDocument.findMany({
    where: { organizationId: dealDocumentOrganization(), documentType: "insurance-proof", status: "ACCEPTED", archivedAt: null, source: { not: "GENERATED" }, packetLinks: { some: { packetId: checkoutAgreements[0].packetId } } },
    select: { id: true, fileName: true }, orderBy: { createdAt: "desc" }
  }) : [];
  const latest = rentalOperationsSummary(context.bookings, { pathway: context.draft.pathway }).booking;
  const returnPacket = latest?.agreementJacketId ? await readReturnPacket(prisma, latest.agreementJacketId) : null;
  const linkedJacketId = latest?.agreementJacketId ?? agreementId;
  const readiness = vehicle && isRentalPathway(context.draft.pathway) ? await readRentalReadiness(prisma, context, vehicle) : null;
  const canConfirmReadiness = readiness?.review && (evaluateVehicleCapability({
    actor: user, capability: "INVENTORY_READINESS_VERIFY", locationId: vehicle!.locationId, now: new Date(),
    grants: await createEnterpriseCommandRepository().listCapabilityGrants(user.id, context.organizationId)
  }).allowed);
  const isActiveDraft = !["ARCHIVED", "CANCELLED", "LOST"].includes(context.draft.status);
  const vehicleReadiness = readiness ? {
    ...readiness,
    detail: readiness.review && !canConfirmReadiness ? "Ask someone with inventory readiness permission to confirm the vehicle is ready to rent" : readiness.detail,
    review: canConfirmReadiness && isActiveDraft ? readiness.review : null
  } :
    vehicle && { eligible: vehicle.eligibleForUse, detail: vehicle.availability, inventoryUnitId: vehicle.inventoryUnitId, review: null };
  return { agreements, insuranceProofs, agreementHref: linkedJacketId ? `/sales-documents?jacketId=${encodeURIComponent(linkedJacketId)}` : null, id: context.id, customerId: context.customerId, vehicleId: context.vehicleId, vehicleReadiness, source, bookings: context.bookings, packetClosed: Boolean(returnPacket), settlementReceiptOnFile: hasSettlementReceipt(returnPacket?.snapshot), canManageExceptions: isManager(actor), draftStatus: context.draft.status, events: await prisma.dealContinuityEvent.findMany({ where: { contextId: id, organizationId: context.organizationId }, orderBy: { occurredAt: "desc" }, take: 30 }) };
}

async function confirmRentalReadiness(user: AuthenticatedUser, id: string, raw: Record<string, unknown>) {
  const operationKey = text(raw.operationKey);
  const review = { vehicleId: text(raw.vehicleId), inventoryUnitId: text(raw.inventoryUnitId), unitVersion: raw.unitVersion, intakeRevisionId: text(raw.intakeRevisionId) };
  if (!/^[a-zA-Z0-9-]{8,100}$/.test(operationKey) || !review.vehicleId || !review.inventoryUnitId || !Number.isInteger(review.unitVersion) || !review.intakeRevisionId || raw.confirmed !== true) {
    throw new SalesDocumentsError("Confirm the vehicle is on site, safe to rent, and needs no repairs.");
  }
  const organizationId = dealOrganization();
  const requestHash = createHash("sha256").update(JSON.stringify({ id, actorId: user.id, action: rentalReadinessAction, ...review })).digest("hex");
  return prisma.$transaction(async db => {
    await db.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${organizationId + ":operation:" + operationKey}, 0))`;
    await db.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${organizationId + ":deal-context:" + id}, 0))`;
    const context = await contextFor(user, id, db);
    const prior = await db.dealContinuityEvent.findUnique({ where: { organizationId_operationKey: { organizationId, operationKey } } });
    if (prior) {
      if (prior.requestHash !== requestHash || prior.contextId !== id) throw new SalesDocumentsError("This request reference belongs to different work.", 409);
      return { duplicate: true, result: prior.result };
    }
    if (!isRentalPathway(context.draft.pathway) || ["ARCHIVED", "CANCELLED", "LOST"].includes(context.draft.status) || context.vehicleId !== review.vehicleId) {
      throw new SalesDocumentsError("Open the active rental or loaner for this vehicle before confirming readiness.", 409);
    }
    await db.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${organizationId + ":" + review.vehicleId}, 0))`;
    await db.$queryRaw`SELECT id FROM "InventoryUnit" WHERE id = ${review.inventoryUnitId} AND "organizationId" = ${organizationId} FOR SHARE`;
    const vehicle = await dealVehicle(user, review.vehicleId, db);
    const grants = await createEnterpriseCommandRepository().listCapabilityGrants(user.id, organizationId);
    assertVehicleCapability({ actor: user, capability: "INVENTORY_READINESS_VERIFY", grants, locationId: vehicle.locationId, now: new Date() });
    const readiness = await readRentalReadiness(db, context, vehicle);
    if (!readiness.review || JSON.stringify(readiness.review) !== JSON.stringify(review)) throw new SalesDocumentsError(readiness.eligible ? "Rental readiness is already confirmed." : `Refresh and review the vehicle before confirming readiness. ${readiness.detail}.`, 409);
    const result = { ...readiness.review, condition: "ON_SITE_SAFE_TO_RENT_NO_REPAIRS_REQUIRED" };
    await db.dealContinuityEvent.create({ data: { id: randomUUID(), organizationId, contextId: id, operationKey, requestHash, action: rentalReadinessAction, actorUserId: user.id, result } });
    return { duplicate: false, result };
  });
}

async function cancelUnassignedRental(db: Tx, user: AuthenticatedUser, id: string, data: ReturnType<typeof normalizeVehicleUseCommand>, requestHash: string) {
  const draft = await db.dealDeskDraft.findFirst({ where: { id, organizationId: dealDocumentOrganization(), ...(isManager(user) ? {} : { ownerUserId: user.id }) } });
  if (!draft || !["daily-rental", "vehicle-loaner"].includes(draft.pathway)) throw new SalesDocumentsError("This rental or loaner draft is unavailable to your account.", 404);
  const history = Array.isArray(draft.statusHistory) ? draft.statusHistory : [];
  const prior = history.map(object).find(event => event.operationKey === data.operationKey);
  const result = { status: "CANCELLED", contextId: id, lifecycle: draft.pathway === "vehicle-loaner" ? "Loaner Cancelled" : "Rental Cancelled" };
  if (prior) {
    if (prior.requestHash !== requestHash) throw new SalesDocumentsError("This request reference belongs to different work.", 409);
    return { duplicate: true, result };
  }
  if (!["IN_PROGRESS", "PENDING"].includes(draft.status) || await db.vehicleUseBooking.count({ where: { contextId: id } })) throw new SalesDocumentsError("Only an open draft without vehicle-use history can be cancelled here.", 409);
  if (draft.revision !== data.draftRevision) throw new SalesDocumentsError("This draft changed. Reopen it before cancelling.", 409);
  const snapshot = object(draft.snapshot);
  await assertRentalCancellation(db, user, draft, true);
  const vehicleId = text(object(snapshot["desk:identity"]).vehicleId);
  if (vehicleId) {
    const vehicle = await dealVehicle(user, vehicleId, db);
    const organizationId = dealOrganization();
    const grants = await createEnterpriseCommandRepository().listCapabilityGrants(user.id, organizationId);
    assertVehicleCapability({ actor: user, capability: "COMMERCIAL_HANDOFF_MANAGE", grants, locationId: vehicle.locationId, now: new Date() });
  }
  const changed = await db.dealDeskDraft.updateMany({ where: { id, revision: draft.revision }, data: { status: "CANCELLED", revision: { increment: 1 }, statusHistory: json([...history, { action: "RENTAL_DRAFT_CANCELLED", from: draft.status, to: "CANCELLED", actorId: user.id, at: new Date().toISOString(), reason: data.reason, operationKey: data.operationKey, requestHash }]) } });
  if (!changed.count) throw new SalesDocumentsError("This deal changed. Refresh it before cancelling.", 409);
  return { duplicate: false, result };
}

export async function executeVehicleUse(actor: AuthenticatedUser | null, id: string, raw: Record<string, unknown>) {
  const user = requireOwnDealUser(actor);
  if (raw.action === rentalReadinessAction) return confirmRentalReadiness(user, id, raw);
  const data = normalizeVehicleUseCommand(raw), organizationId = dealOrganization();
  const requestHash = createHash("sha256").update(JSON.stringify({ id, actorId: user.id, ...data, ...(data.action === "CANCEL" && raw.noHandoffConfirmed === true ? { noHandoffConfirmed: true } : {}), ...(data.action === "HANDOFF" ? { handover: { physicalHandover: raw.physicalHandover === true, insuranceVerified: raw.insuranceVerified === true, insuranceValidUntil: String(raw.insuranceValidUntil ?? ""), timezone: String(raw.timezone ?? ""), ...(typeof raw.insuranceDocumentId === "string" && raw.insuranceDocumentId.trim() ? { insuranceDocumentId: raw.insuranceDocumentId.trim() } : {}) } } : {}) })).digest("hex");
  return prisma.$transaction(async db => {
    await db.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${organizationId + ":operation:" + data.operationKey}, 0))`;
    await db.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${organizationId + ":deal-context:" + id}, 0))`;
    if (data.action === "CANCEL" && !data.bookingId) return cancelUnassignedRental(db, user, id, data, requestHash);
    const context = await contextFor(actor, id, db);
    const workflowPathway = ["RETURN", "EXTEND", "CANCEL", "COMPLETE"].includes(data.action) ? String(object(context.draft.snapshot)["desk:assignmentPathway"] ?? context.draft.pathway) : context.draft.pathway;
    const prior = await db.dealContinuityEvent.findUnique({ where: { organizationId_operationKey: { organizationId, operationKey: data.operationKey } } });
    if (prior) { if (prior.requestHash !== requestHash || prior.contextId !== id) throw new SalesDocumentsError("This request reference belongs to different work.", 409); return { duplicate: true, result: prior.result }; }
    const rental = isRentalPathway(workflowPathway);
    const managerRecovery = rental && isManager(user) && ["RETURN", "COMPLETE"].includes(data.action);
    if (["ARCHIVED", "CANCELLED", "LOST"].includes(context.draft.status) && !managerRecovery) throw new SalesDocumentsError("Ask a manager to reconcile the vehicle custody on this inactive deal.", 409);
    if (!["vehicle-loaner", "daily-rental", "test-drive"].includes(workflowPathway)) throw new SalesDocumentsError("Reserve temporary use from a loaner, rental or test-drive path.");
    if (workflowPathway === "test-drive" && data.action === "HANDOFF") throw new SalesDocumentsError("Use the guided Test Drive release checklist to verify the current agreement and evidence.");
    if (!context.vehicleId) throw new SalesDocumentsError("Select the actual temporary vehicle first.");
    await db.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${organizationId + ":" + context.vehicleId}, 0))`;
    let vehicle = await dealVehicle(actor, context.vehicleId, db);
    if (rental && ["RESERVE", "HANDOFF"].includes(data.action) && vehicle.inventoryUnitId) {
      await db.$queryRaw`SELECT id FROM "InventoryUnit" WHERE id = ${vehicle.inventoryUnitId} AND "organizationId" = ${organizationId} FOR SHARE`;
      vehicle = await dealVehicle(actor, context.vehicleId, db);
    }
    const readiness = rental && ["RESERVE", "HANDOFF"].includes(data.action) ? await readRentalReadiness(db, context, vehicle) :
      { eligible: vehicle.eligibleForUse, detail: vehicle.availability };
    const grants = await createEnterpriseCommandRepository().listCapabilityGrants(user.id, organizationId);
    assertVehicleCapability({ actor: user, capability: "COMMERCIAL_HANDOFF_MANAGE", grants, locationId: vehicle.locationId, now: new Date() });
    if (rental && data.action === "HANDOFF") {
      if (data.historicalHandoff && !isManager(user)) throw new SalesDocumentsError("Only a manager can record a historical handoff.", 403);
      if (!data.historicalHandoff && data.occurredAt!.getTime() < Date.now() - 86400000) throw new SalesDocumentsError("Ask a manager to record this historical handoff from dated evidence.", 403);
      if (data.historicalHandoff && await db.vehicleCustodyEvent.findFirst({ where: { organizationId, vehicleId: context.vehicleId, occurredAt: { gte: data.occurredAt! } }, select: { id: true } })) throw new SalesDocumentsError("A later custody event exists. Reconcile the original vehicle history before recording this handoff.", 409);
    }
    let booking = data.bookingId ? await db.vehicleUseBooking.findFirst({ where: { id: data.bookingId, contextId: id, organizationId } }) : null;
    const previousDueBack = booking?.expectedReturnAt;
    if (data.activate) {
      if (!rental) throw new SalesDocumentsError("Combined activation is available only for rentals and loaners.");
      if (!readiness.eligible) throw new SalesDocumentsError(`The vehicle is not ready for checkout. ${readiness.detail}.`, 409);
      if (context.bookings.length) throw new SalesDocumentsError("This deal already has vehicle-use history. Open the saved assignment or start a new deal.", 409);
      if (workflowPathway === "vehicle-loaner" && (context.sourceDraftId || context.sourceJacketId) && !context.sourceVehicleId) throw new SalesDocumentsError("Link the original leased vehicle before checking out the related loaner.");
      const others = await db.vehicleUseBooking.findMany({ where: { organizationId, vehicleId: context.vehicleId, status: { in: ["RESERVED", "CHECKED_OUT", "RETURNED_REVIEW"] } } });
      if (others.some(row => vehicleUseOverlaps(row, data.startsAt!, data.expectedReturnAt!))) throw new SalesDocumentsError("This vehicle is already out or reserved for those dates.", 409);
      booking = await db.vehicleUseBooking.create({ data: { id: randomUUID(), organizationId, contextId: id, vehicleId: context.vehicleId, startsAt: data.startsAt!, expectedReturnAt: data.expectedReturnAt!, reason: data.reason, createdByUserId: user.id } });
    }
    if (data.action === "RESERVE") {
      if (!readiness.eligible) throw new SalesDocumentsError(`The vehicle is not ready for reservation. ${readiness.detail}.`, 409);
      if (rental && context.bookings.length) throw new SalesDocumentsError("Start a new deal for another rental or loaner assignment.", 409);
      if (workflowPathway === "vehicle-loaner" && (context.sourceDraftId || context.sourceJacketId) && !context.sourceVehicleId) throw new SalesDocumentsError("Link the original leased vehicle before reserving the related loaner.");
      if (context.bookings.some(row => ["RESERVED", "CHECKED_OUT", "RETURNED_REVIEW"].includes(row.status))) throw new SalesDocumentsError("This deal already has an active vehicle assignment.", 409);
      const others = await db.vehicleUseBooking.findMany({ where: { organizationId, vehicleId: context.vehicleId, status: { in: ["RESERVED", "CHECKED_OUT", "RETURNED_REVIEW"] } } });
      if (others.some(row => vehicleUseOverlaps(row, data.startsAt!, data.expectedReturnAt!))) throw new SalesDocumentsError("This vehicle is already out or reserved for those dates.", 409);
      booking = await db.vehicleUseBooking.create({ data: { id: randomUUID(), organizationId, contextId: id, vehicleId: context.vehicleId, startsAt: data.startsAt!, expectedReturnAt: data.expectedReturnAt!, reason: data.reason, createdByUserId: user.id } });
    } else {
      if (!booking || booking.version !== data.expectedVersion) throw new SalesDocumentsError("The assignment changed. Refresh it before continuing.", 409);
      if (booking.status === "CANCELLED" || ["RETURNED", "RETURNED_REVIEW"].includes(booking.status) && data.action !== "COMPLETE") throw new SalesDocumentsError("This assignment is no longer open for that action.", 409);
      if (booking.vehicleId && booking.vehicleId !== context.vehicleId) throw new SalesDocumentsError("Reopen this assignment with its original vehicle before continuing.", 409);
      const values: Prisma.VehicleUseBookingUpdateInput = { version: { increment: 1 } };
      if (data.action === "CANCEL") {
        if (booking.status !== "RESERVED" || booking.checkedOutAt || booking.returnedAt) throw new SalesDocumentsError("Review actual custody evidence before cancelling this assignment.");
        if (rental) await assertRentalCancellation(db, user, { ...context.draft, pathway: workflowPathway }, raw.noHandoffConfirmed === true);
        values.status = "CANCELLED";
      }
      if (data.action === "EXTEND") {
        if (rental && booking.status === "CHECKED_OUT") {
          const coverage = new Date(String(object(booking.departureSnapshot).insuranceValidUntil ?? ""));
          if (!Number.isFinite(coverage.getTime()) || coverage < data.expectedReturnAt!) throw new SalesDocumentsError("The extension exceeds verified insurance coverage. Arrange covered return before extending.");
        }
        if (data.expectedReturnAt! <= booking.expectedReturnAt) throw new SalesDocumentsError("An extension must move the expected return later.");
        const others = await db.vehicleUseBooking.findMany({ where: { organizationId, vehicleId: booking.vehicleId, id: { not: booking.id }, status: { in: ["RESERVED", "CHECKED_OUT", "RETURNED_REVIEW"] } } });
        if (others.some(row => vehicleUseOverlaps(row, booking!.checkedOutAt ?? booking!.startsAt, data.expectedReturnAt!))) throw new SalesDocumentsError("This extension conflicts with another vehicle assignment.", 409);
        values.expectedReturnAt = data.expectedReturnAt!;
      }
      if (data.action === "HANDOFF") {
        const dueBack = data.expectedReturnAt ?? booking.expectedReturnAt;
        const conflict = await db.vehicleUseBooking.findFirst({ where: { organizationId, vehicleId: context.vehicleId, id: { not: booking.id }, status: { in: ["CHECKED_OUT", "RETURNED_REVIEW"] } } });
        if (conflict) throw new SalesDocumentsError("This vehicle is already out. Record its actual return first.", 409);
        if (booking.status !== "RESERVED" || booking.checkedOutAt || booking.returnedAt || !readiness.eligible) throw new SalesDocumentsError("Recheck the reservation and vehicle readiness before handoff.", 409);
        if (text(object(object(context.draft.snapshot).jackets)[workflowPathway]) !== data.agreementJacketId) throw new SalesDocumentsError("Generate and finalize the agreement linked to this deal, then reload the assignment.");
        const jacket = await db.salesDocumentJacket.findFirst({ where: { id: data.agreementJacketId, organizationId: dealDocumentOrganization(), customerId: context.customerId, vin: vehicle.vin, pathway: workflowPathway, state: "CHECKED_OUT" } });
        if (!jacket || !await db.salesDocumentPacketVersion.count({ where: { jacketId: jacket.id, phase: "CHECKOUT" } })) throw new SalesDocumentsError("Review and finalize this customer's exact vehicle agreement in Sales Documents before recording handoff.");
        let evidence = data.evidence;
        if (rental) {
          const documents = await db.documentLibraryDocument.findMany({ where: { organizationId: jacket.organizationId, archivedAt: null, packetLinks: { some: { packetId: jacket.packetId } } } });
          const verifiedDocuments = validateRentalHandover(raw, documents, data.occurredAt!, dueBack);
          evidence = [...new Set([...data.evidence, ...verifiedDocuments.flatMap(document => document.id ? [`document:${document.id}`] : [])])];
          const reservations = await db.vehicleUseBooking.findMany({ where: { organizationId, vehicleId: context.vehicleId, id: { not: booking.id }, status: { in: ["RESERVED", "CHECKED_OUT", "RETURNED_REVIEW"] } } });
          if (reservations.some(row => vehicleUseOverlaps(row, data.occurredAt!, dueBack))) throw new SalesDocumentsError("The actual checkout dates conflict with another vehicle assignment.", 409);
          values.expectedReturnAt = dueBack;
        }
        if (data.occurredAt! < booking.startsAt && !rental) throw new SalesDocumentsError("Actual handoff cannot predate the reservation.");
        if (data.occurredAt! >= dueBack || dueBack <= booking.startsAt) throw new SalesDocumentsError("Enter a due-back time after pickup and actual checkout.");
        values.status = "CHECKED_OUT"; values.checkedOutAt = data.occurredAt!; values.agreementJacket = { connect: { id: jacket.id } };
        values.departureSnapshot = json({ odometer: data.odometer, fuel: data.fuel, condition: data.condition, recipient: data.recipient, keysVerified: true, driverVerified: true, evidence, physicalHandover: raw.physicalHandover === true, insuranceVerified: raw.insuranceVerified === true, insuranceValidUntil: raw.insuranceValidUntil, timezone: raw.timezone, ...(data.historicalHandoff ? { historicalHandoff: true, recordedBy: user.id, recordedAt: new Date().toISOString(), reason: data.reason } : {}) });
      }
      if (data.action === "RETURN") {
        if (workflowPathway === "test-drive" && object(booking.departureSnapshot).guided === true) throw new SalesDocumentsError("Use the guided Test Drive return checklist for this assignment.");
        if (booking.status !== "CHECKED_OUT" || !booking.checkedOutAt || data.occurredAt! < booking.checkedOutAt) throw new SalesDocumentsError("Record return only after actual handoff.");
        const departure = object(booking.departureSnapshot);
        if (data.odometer! < Number(departure.odometer)) throw new SalesDocumentsError("Return mileage cannot be lower than departure mileage.");
        values.status = rental ? "RETURNED_REVIEW" : "RETURNED"; values.returnedAt = data.occurredAt!;
        values.returnSnapshot = json({ odometer: data.odometer, fuel: data.fuel, condition: data.condition, recipient: data.recipient, keysVerified: true, evidence: data.evidence });
      }
      if (data.action === "COMPLETE") {
        const completion = data.completion!;
        if (!rental || !["RETURNED", "RETURNED_REVIEW"].includes(booking.status) || !booking.checkedOutAt || !booking.returnedAt || object(booking.returnSnapshot).completion) throw new SalesDocumentsError("Complete only a rental or loaner with recorded checkout and return that still needs review.", 409);
        if (!completion.inspected) throw new SalesDocumentsError("Confirm the return inspection is complete.");
        if (completion.settlementException && !isManager(user)) throw new SalesDocumentsError("Only a manager can authorize a settlement exception.", 403);
        if (!completion.settlementException && !completion.settlementReference) throw new SalesDocumentsError("Enter the settlement or no-charge record reference.");
        const returnPacket = booking.agreementJacketId ? await readReturnPacket(db, booking.agreementJacketId) : null;
        if (!returnPacket) throw new SalesDocumentsError("Finalize the linked return packet in Sales Documents before completing this assignment.", 409);
        if (!completion.settlementException && !hasSettlementReceipt(returnPacket.snapshot)) {
          throw new SalesDocumentsError("Finalize a reviewed settlement or no-charge receipt in the return packet, or ask a manager to record an exception.", 409);
        }
        values.status = "RETURNED";
        values.returnSnapshot = json({ ...object(booking.returnSnapshot), completion: { ...completion, reason: data.reason, recordedByUserId: user.id, recordedAt: new Date().toISOString() } });
      }
      if (data.occurredAt) {
        const latest = await db.vehicleOdometerObservation.findFirst({ where: { organizationId, vehicleId: booking.vehicleId, status: "ACCEPTED" }, orderBy: { observedAt: "desc" } });
        if (latest && (data.occurredAt < latest.observedAt || data.odometer! < latest.reading)) throw new SalesDocumentsError("Recheck the actual time and mileage against the vehicle's latest recorded observation.", 409);
      }
      booking = await db.vehicleUseBooking.update({ where: { id: booking.id }, data: values });
      if (rental) {
        const link = { version: 1, organizationId: dealDocumentOrganization(), draftId: context.draftId, jacketId: booking.agreementJacketId };
        if (data.action === "HANDOFF") {
          const task = await createManualTask(user, { assignedUserId: user.id, title: `${workflowPathway === "vehicle-loaner" ? "Loaner" : "Rental"} return · ${context.draft.dealNumber}`, description: `Confirm actual return, mileage, fuel, condition and keys. ${data.reason}`, dueAt: booking.expectedReturnAt.toISOString(), boardDate: chicagoDate(booking.expectedReturnAt)!, customerReference: context.draft.customerName, vehicleReference: context.draft.vehicleReference, status: "NOT_STARTED", priority: "MEDIUM", requiresManagerApproval: false, workflowArea: "SALES" }, createTaskCreateRepository(db));
          const created = await db.task.findUniqueOrThrow({ where: { id: task.id }, select: { templateSnapshot: true } });
          await db.task.update({ where: { id: task.id }, data: { customerId: context.customerId, vehicleId: booking.vehicleId, templateSnapshot: json({ ...object(created.templateSnapshot), dealDashboard: link, rentalBookingId: booking.id }) } });
        }
        const followUp = { templateSnapshot: { path: ["rentalBookingId"], equals: booking.id }, status: { not: "COMPLETED" } } satisfies Prisma.TaskWhereInput;
        if (data.action === "RETURN") await db.task.updateMany({ where: followUp, data: { status: "COMPLETED", completedAt: data.occurredAt! } });
        if (data.action === "EXTEND" && booking.status === "CHECKED_OUT") {
          const boardDay = await createTaskCreateRepository(db).getOrCreateBoardDay(chicagoDate(booking.expectedReturnAt)!);
          await db.task.updateMany({ where: followUp, data: { dueAt: booking.expectedReturnAt, boardDayId: boardDay.id } });
        }
      }
      if (data.action === "HANDOFF" || data.action === "RETURN") {
        await db.vehicleCustodyEvent.create({ data: { organizationId, vehicleId: booking.vehicleId, locationId: vehicle.locationId, eventType: data.action === "HANDOFF" ? "CHECK_OUT" : "CHECK_IN", custodianType: data.action === "HANDOFF" ? "CUSTOMER" : "DEALERSHIP", custodianId: data.action === "HANDOFF" ? context.customerId : null, occurredAt: data.occurredAt!, sourceCode: "DEAL_VEHICLE_USE", sourceReference: booking.id, reason: data.reason, recordedByUserId: user.id } });
        await db.vehicleOdometerObservation.create({ data: { organizationId, vehicleId: booking.vehicleId, reading: data.odometer!, unit: "MILES", observedAt: data.occurredAt!, sourceCode: "DEAL_VEHICLE_USE", sourceReference: booking.id, status: "ACCEPTED", recordedByUserId: user.id } });
      }
    }
    const lifecycle = rental ? rentalOperationsSummary([booking!], { pathway: workflowPathway }).status : undefined;
    const result = json({ id: booking!.id, status: booking!.status, version: booking!.version, contextId: id, ...(lifecycle ? { lifecycle } : {}), audit: { reason: data.reason, previousDueBack, dueBack: booking!.expectedReturnAt, occurredAt: data.occurredAt, ...(data.action === "CANCEL" ? { noHandoffConfirmed: raw.noHandoffConfirmed === true } : {}) } });
    await db.dealContinuityEvent.create({ data: { id: randomUUID(), organizationId, contextId: id, bookingId: booking!.id, operationKey: data.operationKey, requestHash, action: data.action, actorUserId: user.id, result } });
    return { duplicate: false, result };
  }, { timeout: 20000 });
}

export async function validateDealDocumentContext(actor: AuthenticatedUser | null, raw: Record<string, unknown>) {
  if (!raw.workflowContextId) return;
  const context = await contextFor(actor, text(raw.workflowContextId));
  const vehicle = context.vehicleId ? await dealVehicle(actor, context.vehicleId) : null;
  const customer = await dealCustomer(actor, context.customerId);
  if (raw.customerName !== customer.name) throw new SalesDocumentsError("Reload the saved shared customer before generating its agreement.", 409);
  if (!vehicle || context.customerId !== raw.customerId || context.draft.pathway !== raw.pathway || text(object(raw.vehicle).vin).toUpperCase() !== vehicle.vin) throw new SalesDocumentsError("The document must use the saved shared customer, pathway and canonical vehicle.", 409);
  const occupied = await prisma.vehicleUseBooking.findFirst({ where: { organizationId: context.organizationId, vehicleId: vehicle.id, contextId: { not: context.id }, status: { in: ["CHECKED_OUT", "RETURNED_REVIEW"] } } });
  if (occupied) throw new SalesDocumentsError(occupied.status === "RETURNED_REVIEW" ? "This vehicle is pending return review on another assignment." : "This vehicle is currently checked out on another assignment.", 409);
  return { dealNumber: context.draft.dealNumber };
}
