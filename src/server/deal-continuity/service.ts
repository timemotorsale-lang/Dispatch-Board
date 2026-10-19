import { createHash, randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/server/db/client";
import type { AuthenticatedUser } from "@/server/auth/store";
import { requireSalesDocumentsUser } from "@/server/sales-documents/service";
import { SalesDocumentsError } from "@/server/sales-documents/domain";
import { isManager } from "@/server/policies/access";
import { dealCustomer, dealOrganization, dealVehicle } from "./identities";
import { normalizeVehicleUseCommand, vehicleUseOverlaps } from "@/lib/deal-continuity";
import { createEnterpriseCommandRepository } from "@/server/enterprise-command/repository";
import { assertVehicleCapability } from "@/server/enterprise-command/vehicle-capabilities";

type Tx = Prisma.TransactionClient;
const object = (value: unknown): Record<string, unknown> => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
const text = (value: unknown) => typeof value === "string" ? value.trim().slice(0, 240) : "";
const json = (value: unknown) => JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;

export async function resolveDealSource(actor: AuthenticatedUser | null, source: { sourceDraftId?: string; sourceJacketId?: string }, db: Tx = prisma) {
  const user = requireSalesDocumentsUser(actor), organizationId = dealOrganization();
  if (Boolean(source.sourceDraftId) === Boolean(source.sourceJacketId)) throw new SalesDocumentsError("Choose one original deal or agreement.");
  const draft = source.sourceDraftId ? await db.dealDeskDraft.findFirst({ where: { id: source.sourceDraftId, organizationId, ...(isManager(user) ? {} : { ownerUserId: user.id }) }, include: { continuity: true } }) : null;
  const jacket = source.sourceJacketId ? await db.salesDocumentJacket.findFirst({ where: { id: source.sourceJacketId, organizationId } }) : null;
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

export async function persistDealContext(actor: AuthenticatedUser | null, db: Tx, draftId: string, customerId: string | null, snapshot: Record<string, unknown>) {
  const identity = object(snapshot["desk:identity"]), organizationId = dealOrganization();
  if (!identity.customerId && !identity.vehicleId && !identity.sourceDraftId && !identity.sourceJacketId) return;
  await db.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${organizationId + ":deal-context:" + draftId}, 0))`;
  if (!customerId || customerId !== identity.customerId) throw new SalesDocumentsError("Choose one shared CRM customer for this deal.");
  await dealCustomer(actor, customerId, db);
  const vehicleId = text(identity.vehicleId) || null;
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
  if (existing && JSON.stringify([existing.customerId, existing.vehicleId, existing.inventoryUnitId, existing.sourceDraftId, existing.sourceJacketId, existing.sourceVehicleId]) !== JSON.stringify([customerId, vehicleId, data.inventoryUnitId, sourceDraftId, sourceJacketId, sourceVehicleId]) && await db.vehicleUseBooking.count({ where: { contextId: existing.id, status: { in: ["RESERVED", "CHECKED_OUT"] } } })) throw new SalesDocumentsError("Return or cancel the active vehicle assignment before changing its customer or vehicle.", 409);
  return db.dealWorkflowContext.upsert({ where: { draftId }, create: { id: draftId, ...data, createdByUserId: actor!.id }, update: data });
}

async function contextFor(actor: AuthenticatedUser | null, id: string, db: Tx = prisma) {
  const user = requireSalesDocumentsUser(actor);
  const context = await db.dealWorkflowContext.findFirst({ where: { id, organizationId: dealOrganization() }, include: { draft: true, bookings: { orderBy: { createdAt: "desc" } } } });
  if (!context) throw new SalesDocumentsError("Save a deal with its shared customer and vehicle first.", 404);
  if (context.draft.ownerUserId !== user.id && !isManager(user)) throw new SalesDocumentsError("This deal is outside your authorized scope.", 403);
  await dealCustomer(actor, context.customerId, db);
  return context;
}
export async function readDealContinuity(actor: AuthenticatedUser | null, id: string) {
  const context = await contextFor(actor, id);
  const source = context.sourceDraftId || context.sourceJacketId ? await resolveDealSource(actor, { sourceDraftId: context.sourceDraftId ?? undefined, sourceJacketId: context.sourceJacketId ?? undefined }) : null;
  const jacketIds = object(context.draft.snapshot).jackets;
  const agreementId = text(object(jacketIds)[context.draft.pathway]);
  const agreements = agreementId && context.vehicleId ? await prisma.salesDocumentJacket.findMany({ where: { id: agreementId, organizationId: context.organizationId, customerId: context.customerId, pathway: context.draft.pathway, state: "CHECKED_OUT", vin: (await dealVehicle(actor, context.vehicleId)).vin, versions: { some: { phase: "CHECKOUT" } } }, select: { id: true, dealNumber: true } }) : [];
  return { agreements, agreementHref: agreementId ? `/sales-documents?jacketId=${encodeURIComponent(agreementId)}` : null, id: context.id, customerId: context.customerId, vehicleId: context.vehicleId, source, bookings: context.bookings, events: await prisma.dealContinuityEvent.findMany({ where: { contextId: id, organizationId: context.organizationId }, orderBy: { occurredAt: "desc" }, take: 30 }) };
}

export async function executeVehicleUse(actor: AuthenticatedUser | null, id: string, raw: Record<string, unknown>) {
  const user = requireSalesDocumentsUser(actor), data = normalizeVehicleUseCommand(raw), organizationId = dealOrganization();
  const requestHash = createHash("sha256").update(JSON.stringify({ id, actorId: user.id, ...data })).digest("hex");
  return prisma.$transaction(async db => {
    await db.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${organizationId + ":operation:" + data.operationKey}, 0))`;
    await db.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${organizationId + ":deal-context:" + id}, 0))`;
    const context = await contextFor(actor, id, db);
    const prior = await db.dealContinuityEvent.findUnique({ where: { organizationId_operationKey: { organizationId, operationKey: data.operationKey } } });
    if (prior) { if (prior.requestHash !== requestHash || prior.contextId !== id) throw new SalesDocumentsError("This request reference belongs to different work.", 409); return { duplicate: true, result: prior.result }; }
    if (!["vehicle-loaner", "daily-rental", "test-drive"].includes(context.draft.pathway)) throw new SalesDocumentsError("Reserve temporary use from a loaner, rental or test-drive path.");
    if (!context.vehicleId) throw new SalesDocumentsError("Select the actual temporary vehicle first.");
    const vehicle = await dealVehicle(actor, context.vehicleId, db);
    const grants = await createEnterpriseCommandRepository().listCapabilityGrants(user.id, organizationId);
    assertVehicleCapability({ actor: user, capability: "COMMERCIAL_HANDOFF_MANAGE", grants, locationId: vehicle.locationId, now: new Date() });
    await db.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${organizationId + ":" + context.vehicleId}, 0))`;
    let booking = data.bookingId ? await db.vehicleUseBooking.findFirst({ where: { id: data.bookingId, contextId: id, organizationId } }) : null;
    if (data.action === "RESERVE") {
      if (!vehicle.eligibleForUse) throw new SalesDocumentsError("The vehicle is not frontline-ready for temporary use.", 409);
      if (context.draft.pathway === "vehicle-loaner" && (context.sourceDraftId || context.sourceJacketId) && !context.sourceVehicleId) throw new SalesDocumentsError("Link the original leased vehicle before reserving the related loaner.");
      if (context.bookings.some(row => ["RESERVED", "CHECKED_OUT"].includes(row.status))) throw new SalesDocumentsError("This deal already has an active vehicle assignment.", 409);
      const others = await db.vehicleUseBooking.findMany({ where: { organizationId, vehicleId: context.vehicleId, status: { in: ["RESERVED", "CHECKED_OUT"] } } });
      if (others.some(row => vehicleUseOverlaps(row, data.startsAt!, data.expectedReturnAt!))) throw new SalesDocumentsError("This vehicle is already out or reserved for those dates.", 409);
      booking = await db.vehicleUseBooking.create({ data: { id: randomUUID(), organizationId, contextId: id, vehicleId: context.vehicleId, startsAt: data.startsAt!, expectedReturnAt: data.expectedReturnAt!, reason: data.reason, createdByUserId: user.id } });
    } else {
      if (!booking || booking.version !== data.expectedVersion) throw new SalesDocumentsError("The assignment changed. Refresh it before continuing.", 409);
      if (["RETURNED", "CANCELLED"].includes(booking.status)) throw new SalesDocumentsError("This assignment is already closed.", 409);
      const values: Prisma.VehicleUseBookingUpdateInput = { version: { increment: 1 }, reason: data.reason };
      if (data.action === "CANCEL") {
        if (booking.status !== "RESERVED") throw new SalesDocumentsError("Record the actual return of a checked-out vehicle; it cannot be cancelled.");
        values.status = "CANCELLED";
      }
      if (data.action === "EXTEND") {
        if (data.expectedReturnAt! <= booking.expectedReturnAt) throw new SalesDocumentsError("An extension must move the expected return later.");
        const others = await db.vehicleUseBooking.findMany({ where: { organizationId, vehicleId: booking.vehicleId, id: { not: booking.id }, status: { in: ["RESERVED", "CHECKED_OUT"] } } });
        if (others.some(row => vehicleUseOverlaps(row, booking!.startsAt, data.expectedReturnAt!))) throw new SalesDocumentsError("This extension conflicts with another vehicle assignment.", 409);
        values.expectedReturnAt = data.expectedReturnAt!;
      }
      if (data.action === "HANDOFF") {
        if (booking.status !== "RESERVED" || !vehicle.eligibleForUse) throw new SalesDocumentsError("Recheck the reserved vehicle before handoff.");
        if (text(object(object(context.draft.snapshot).jackets)[context.draft.pathway]) !== data.agreementJacketId) throw new SalesDocumentsError("Generate and finalize the agreement linked to this deal, then reload the assignment.");
        const jacket = await db.salesDocumentJacket.findFirst({ where: { id: data.agreementJacketId, organizationId, customerId: context.customerId, vin: vehicle.vin, pathway: context.draft.pathway, state: "CHECKED_OUT" } });
        if (!jacket || !await db.salesDocumentPacketVersion.count({ where: { jacketId: jacket.id, phase: "CHECKOUT" } })) throw new SalesDocumentsError("Review and finalize this customer's exact vehicle agreement in Sales Documents before recording handoff.");
        if (data.occurredAt! < booking.startsAt) throw new SalesDocumentsError("Actual handoff cannot predate the reservation.");
        if (data.occurredAt! >= booking.expectedReturnAt) throw new SalesDocumentsError("Extend the expected return before recording this late handoff.");
        values.status = "CHECKED_OUT"; values.checkedOutAt = data.occurredAt!; values.agreementJacket = { connect: { id: jacket.id } };
        values.departureSnapshot = json({ odometer: data.odometer, fuel: data.fuel, condition: data.condition, recipient: data.recipient, keysVerified: true, driverVerified: true, evidence: data.evidence });
      }
      if (data.action === "RETURN") {
        if (booking.status !== "CHECKED_OUT" || data.occurredAt! < booking.checkedOutAt!) throw new SalesDocumentsError("Record return only after actual handoff.");
        const departure = object(booking.departureSnapshot);
        if (data.odometer! < Number(departure.odometer)) throw new SalesDocumentsError("Return mileage cannot be lower than departure mileage.");
        values.status = "RETURNED"; values.returnedAt = data.occurredAt!;
        values.returnSnapshot = json({ odometer: data.odometer, fuel: data.fuel, condition: data.condition, recipient: data.recipient, keysVerified: true, evidence: data.evidence });
      }
      if (data.occurredAt) {
        const latest = await db.vehicleOdometerObservation.findFirst({ where: { organizationId, vehicleId: booking.vehicleId, status: "ACCEPTED" }, orderBy: { observedAt: "desc" } });
        if (latest && (data.occurredAt < latest.observedAt || data.odometer! < latest.reading)) throw new SalesDocumentsError("Recheck the actual time and mileage against the vehicle's latest recorded observation.", 409);
      }
      booking = await db.vehicleUseBooking.update({ where: { id: booking.id }, data: values });
      if (data.action === "HANDOFF" || data.action === "RETURN") {
        await db.vehicleCustodyEvent.create({ data: { organizationId, vehicleId: booking.vehicleId, locationId: vehicle.locationId, eventType: data.action === "HANDOFF" ? "CHECK_OUT" : "CHECK_IN", custodianType: data.action === "HANDOFF" ? "CUSTOMER" : "DEALERSHIP", custodianId: data.action === "HANDOFF" ? context.customerId : null, occurredAt: data.occurredAt!, sourceCode: "DEAL_VEHICLE_USE", sourceReference: booking.id, reason: data.reason, recordedByUserId: user.id } });
        await db.vehicleOdometerObservation.create({ data: { organizationId, vehicleId: booking.vehicleId, reading: data.odometer!, unit: "MILES", observedAt: data.occurredAt!, sourceCode: "DEAL_VEHICLE_USE", sourceReference: booking.id, status: "ACCEPTED", recordedByUserId: user.id } });
      }
    }
    const result = { id: booking!.id, status: booking!.status, version: booking!.version, contextId: id };
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
  const occupied = await prisma.vehicleUseBooking.findFirst({ where: { organizationId: context.organizationId, vehicleId: vehicle.id, contextId: { not: context.id }, status: "CHECKED_OUT" } });
  if (occupied) throw new SalesDocumentsError("This vehicle is currently checked out on another assignment.", 409);
}
