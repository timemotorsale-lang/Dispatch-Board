import { Prisma, type PrismaClient } from "@prisma/client";
import type { AuthenticatedUser } from "@/server/auth/store";
import { prisma } from "@/server/db/client";
import { INITIAL_ORGANIZATION } from "@/server/appointments/location-foundation";
import { EnterpriseCommandConflictError, normalizeEnterpriseCommand } from "@/server/enterprise-command/domain";
import { createEnterpriseCommandRepository } from "@/server/enterprise-command/repository";
import { evaluateVehicleOperationsFeature } from "@/server/enterprise-command/service";
import { assertVehicleCapability, evaluateVehicleCapability } from "@/server/enterprise-command/vehicle-capabilities";
import { assertAuthenticatedUser } from "@/server/policies/access";
import { executeInventoryMutation } from "./repository";
import { intakePending, normalizeIntake, type IntakeDetails } from "./intake-domain";
import { assertIntakeAccess } from "./intake-access";
import { assertPricingAccess, evaluatePricingAccess } from "./pricing-access";

type Dependencies = { database?: PrismaClient; organizationId?: string; enforceRollout?: boolean; now?: () => Date };
const json = (value: unknown) => JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
const object = (value: unknown): Record<string, unknown> => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
const text = (value: unknown) => typeof value === "string" ? value : "";
async function context(actor: AuthenticatedUser | null, vehicleId: string, input: Dependencies) {
  const user = assertAuthenticatedUser(actor), database = input.database ?? prisma, organizationId = input.organizationId ?? INITIAL_ORGANIZATION.id, now = (input.now ?? (() => new Date()))();
  const grants = await createEnterpriseCommandRepository(database).listCapabilityGrants(user.id, organizationId);
  // Check the role before reading any acquisition or financial details.
  assertIntakeAccess({ actor: user, grants, locationId: null, now });
  const vehicle = await database.vehicle.findFirst({ where: { id: vehicleId, organizationId, status: "ACTIVE", mergedIntoVehicleId: null }, include: { custodyEvents: { where: { occurredAt: { lte: now } }, orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }, { id: "desc" }], take: 1 }, odometerObservations: { where: { status: "ACCEPTED", observedAt: { lte: now } }, orderBy: [{ observedAt: "desc" }, { id: "desc" }], take: 1 } } });
  if (!vehicle) throw new Error("Intake vehicle was not found.");
  const unit = await database.inventoryUnit.findFirst({ where: { vehicleId, organizationId, closedAt: null }, include: { location: { select: { name: true } } } });
  const locationId = unit?.locationId ?? vehicle.custodyEvents[0]?.locationId ?? null;
  assertIntakeAccess({ actor: user, grants, locationId, now });
  return { user, database, organizationId, now, grants, vehicle, unit, locationId };
}

export async function getVehicleIntake(actor: AuthenticatedUser | null, vehicleId: string, input: Dependencies = {}) {
  const c = await context(actor, vehicleId, input);
  const latest = await c.database.inventoryIntakeRevision.findFirst({ where: { organizationId: c.organizationId, vehicleId }, orderBy: { version: "desc" } });
  const eligible = latest && (latest.inventoryUnitId === null || latest.inventoryUnitId === c.unit?.id) ? latest : null;
  const specs = object(object(c.vehicle.specificationSnapshot).specifications), reading = c.vehicle.odometerObservations[0];
  const creation = !eligible ? await c.database.enterpriseDomainEvent.findFirst({ where: { organizationId: c.organizationId, aggregateId: vehicleId, eventType: "CREATE_VEHICLE_COMPLETED" }, orderBy: { createdAt: "asc" }, select: { payload: true } }) : null;
  const initialCondition = text(specs.conditionSummary) || text(object(object(creation?.payload).workflowContext).conditionSummary);
  const purchase = c.unit ? await c.database.inventoryUnitCost.findMany({ where: { organizationId: c.organizationId, inventoryUnitId: c.unit.id, category: "ACQUISITION", status: { notIn: ["VOID", "REVERSED"] } } }) : [];
  const supportedPurchase = purchase.length && purchase.every(row => row.currency === "USD" && row.status === purchase[0].status && ["INCURRED", "ESTIMATED"].includes(row.status));
  const details: IntakeDetails = eligible ? eligible.details as unknown as IntakeDetails : { source: text(specs.acquisitionSource), seller: "", boughtFrom: "", buyer: "", acquiredOn: c.unit?.financialAcquiredAt.toISOString().slice(0, 10) ?? "", reference: "", priceStatus: "PENDING", purchaseCents: null, proposedPriceCents: null, whereabouts: text(specs.externalLocation) || text(specs.whereabouts) || c.unit?.location.name || "", odometer: reading?.reading ?? null, odometerUnit: reading?.unit ?? "MILES", condition: text(specs.existingDamage), keys: typeof specs.keyCount === "number" ? specs.keyCount : null, titleStatus: "PENDING", documents: "", pendingNotes: "" };
  if (!eligible && supportedPurchase) { details.purchaseCents = purchase.reduce((sum, row) => sum + row.amountCents, 0); details.priceStatus = purchase[0].status; details.reference = purchase.map(row => row.reference).filter(Boolean).join("; ").slice(0, 160); }
  if (!eligible) {
    details.condition = [initialCondition, text(specs.existingDamage)].filter(Boolean).join(". ").slice(0, 1000);
    if (specs.whereabouts === "AT_DEALERSHIP" && !specs.externalLocation) details.whereabouts = c.unit?.location.name ?? "At dealership";
  }
  if (!["AUCTION", "TRADE", "DIRECT_PURCHASE", "DEALER_TRANSFER", "CONSIGNMENT", "OTHER"].includes(details.source)) details.source = "";
  const canPrice = evaluatePricingAccess({ actor: c.user, grants: c.grants, locationId: c.locationId, now: c.now }).allowed;
  const canManageInventory = evaluateVehicleCapability({ actor: c.user, capability: "INVENTORY_UNIT_MANAGE", grants: c.grants, locationId: c.locationId, now: c.now }).allowed;
  return { vehicle: { id: vehicleId, vehicleNumber: c.vehicle.vehicleNumber, vin: c.vehicle.vin, stockNumber: c.vehicle.stockNumber, year: c.vehicle.year, make: c.vehicle.make, model: c.vehicle.model }, unit: c.unit ? { id: c.unit.id, inventoryNumber: c.unit.inventoryNumber, version: c.unit.version, operatingState: c.unit.operatingState, stateReason: c.unit.stateReason } : null, version: latest?.version ?? 0, status: eligible?.status ?? "NOT_STARTED", details, pendingItems: intakePending(details), canPrice, canManageInventory, purchaseRecords: purchase.map(row => ({ id: row.id, amountCents: row.amountCents, status: row.status, currency: row.currency, reference: row.reference })) };
}
export type VehicleIntakeModel = Awaited<ReturnType<typeof getVehicleIntake>>;

export async function saveVehicleIntake(actor: AuthenticatedUser | null, vehicleId: string, value: unknown, input: Dependencies = {}) {
  const c = await context(actor, vehicleId, input), data = normalizeIntake(value, c.now);
  if (data.status === "CONFIRMED") assertVehicleCapability({ actor: c.user, capability: "INVENTORY_UNIT_MANAGE", grants: c.grants, locationId: c.locationId, now: c.now });
  if (input.enforceRollout !== false) {
    const flags = await createEnterpriseCommandRepository(c.database).listFeatureFlags(c.organizationId);
    const decision = evaluateVehicleOperationsFeature(flags, "INVENTORY_INTAKE", c.user.id, c.locationId);
    if (!decision.executable) throw new Error(`Acquisition intake writes are not enabled (${decision.reason}).`);
  }
  const command = normalizeEnterpriseCommand({ actorUserId: c.user.id, organizationId: c.organizationId, locationId: c.locationId, domain: "RETAIL_INVENTORY", subjectType: "VEHICLE_INTAKE", subjectId: vehicleId, commandType: data.status === "CONFIRMED" ? "CONFIRM_INVENTORY_INTAKE" : "SAVE_INVENTORY_INTAKE", expectedVersion: data.expectedVersion, idempotencyKey: data.idempotencyKey, reason: data.reason, payload: { details: data.details, status: data.status, expectedUnitVersion: data.expectedUnitVersion } });
  return executeInventoryMutation(c.database, command, async (tx, version) => {
    const previous = await tx.inventoryIntakeRevision.findFirst({ where: { organizationId: c.organizationId, vehicleId }, orderBy: { version: "desc" } });
    if ((previous?.version ?? 0) !== data.expectedVersion) throw new EnterpriseCommandConflictError("Intake changed; reload before saving.", "VERSION_CONFLICT");
    const previousDetails = previous && (previous.inventoryUnitId === null || previous.inventoryUnitId === c.unit?.id) ? object(previous.details) : {};
    if (data.details.proposedPriceCents !== (previousDetails.proposedPriceCents ?? null)) assertPricingAccess({ actor: c.user, grants: c.grants, locationId: c.locationId, now: c.now, amountCents: data.details.proposedPriceCents ?? undefined });
    const activeVehicle = await tx.vehicle.findFirst({ where: { id: vehicleId, organizationId: c.organizationId, status: "ACTIVE", mergedIntoVehicleId: null }, select: { id: true } });
    if (!activeVehicle) throw new Error("Intake vehicle was not found.");
    const scope = JSON.stringify([c.organizationId, "OPEN_INVENTORY_UNIT", vehicleId]);
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${scope}))`;
    let unit = await tx.inventoryUnit.findFirst({ where: { organizationId: c.organizationId, vehicleId, closedAt: null } });
    if (unit?.id !== c.unit?.id || (unit && unit.locationId !== c.locationId)) throw new EnterpriseCommandConflictError("Inventory cycle changed; reload intake.", "VERSION_CONFLICT");
    if (!unit) {
      const custody = await tx.vehicleCustodyEvent.findFirst({ where: { organizationId: c.organizationId, vehicleId, occurredAt: { lte: c.now } }, orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }, { id: "desc" }], select: { locationId: true } });
      if ((custody?.locationId ?? null) !== c.locationId) throw new EnterpriseCommandConflictError("Vehicle location changed; reload intake.", "VERSION_CONFLICT");
    }
    const costRecordIds: string[] = [];
    if (unit) {
      const unitScope = JSON.stringify([c.organizationId, "RETAIL_INVENTORY", "INVENTORY_UNIT", unit.id]);
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${unitScope}))`;
      await tx.$executeRaw`SELECT 1 FROM "InventoryUnit" WHERE id = ${unit.id} FOR UPDATE`;
      unit = await tx.inventoryUnit.findFirstOrThrow({ where: { id: unit.id, organizationId: c.organizationId, closedAt: null } });
      if (unit.version !== data.expectedUnitVersion || unit.locationId !== c.locationId) throw new EnterpriseCommandConflictError("Inventory changed; reload before saving intake.", "VERSION_CONFLICT");
    }
    if (data.status === "CONFIRMED") {
      if (!unit) throw new Error("Open an inventory cycle before confirming intake.");
      const purchase = await tx.inventoryUnitCost.findMany({ where: { organizationId: c.organizationId, inventoryUnitId: unit.id, category: "ACQUISITION", status: { notIn: ["VOID", "REVERSED"] } } });
      if (purchase.length) {
        if (data.details.purchaseCents === null || purchase.some(row => row.currency !== "USD" || row.status !== data.details.priceStatus) || purchase.reduce((sum, row) => sum + row.amountCents, 0) !== data.details.purchaseCents) throw new Error("Reconcile existing purchase records in Costs & Investment before confirming intake.");
        costRecordIds.push(...purchase.map(row => row.id));
      } else if (data.details.purchaseCents !== null) {
        if (!data.details.acquiredOn) throw new Error("Acquisition date is required to record purchase cost.");
        assertVehicleCapability({ actor: c.user, capability: "INVENTORY_UNIT_MANAGE", grants: c.grants, locationId: unit.locationId, now: c.now, amountCents: data.details.purchaseCents });
        const duplicate = await tx.inventoryUnitCost.findFirst({ where: { organizationId: c.organizationId, inventoryUnitId: unit.id, reference: { equals: data.details.reference, mode: "insensitive" }, status: { in: ["ESTIMATED", "INCURRED"] } } });
        if (duplicate) throw new Error("This purchase reference already has an active cost record. Review Costs & Investment.");
        const key = { organizationId_domain_subjectType_subjectId: { organizationId: c.organizationId, domain: "RETAIL_INVENTORY", subjectType: "INVENTORY_UNIT", subjectId: unit.id } };
        const aggregate = await tx.enterpriseAggregateVersion.findUnique({ where: key });
        if (!aggregate || aggregate.version !== unit.version) throw new EnterpriseCommandConflictError("Inventory version is inconsistent; reload before saving.", "VERSION_CONFLICT");
        const observedAt = new Date(data.details.acquiredOn + "T00:00:00Z");
        const cost = await tx.inventoryUnitCost.create({ data: { organizationId: c.organizationId, inventoryUnitId: unit.id, category: "ACQUISITION", status: data.details.priceStatus, amountCents: data.details.purchaseCents, currency: "USD", reference: data.details.reference, notes: `${data.details.source}: ${data.details.seller}. ${data.reason}`, source: "MANUAL_STAFF_REPORT", confidence: "MEDIUM", observedAt, incurredAt: data.details.priceStatus === "INCURRED" ? observedAt : null, createdByUserId: c.user.id } });
        costRecordIds.push(cost.id);
        const unitVersion = unit.version + 1;
        await tx.inventoryUnit.update({ where: { id: unit.id }, data: { version: unitVersion } });
        await tx.enterpriseAggregateVersion.update({ where: { id: aggregate.id }, data: { version: unitVersion } });
        await tx.inventoryUnitStateEvent.create({ data: { organizationId: c.organizationId, inventoryUnitId: unit.id, version: unitVersion, fromStage: unit.lifecycleStage, toStage: unit.lifecycleStage, fromOperatingState: unit.operatingState, toOperatingState: unit.operatingState, ownerUserId: unit.ownerUserId, locationId: unit.locationId, targetAt: unit.targetAt, nextAction: unit.nextAction, reason: data.reason, source: "USER", actorUserId: c.user.id, correlationId: command.correlationId } });
      }
    }
    const revision = await tx.inventoryIntakeRevision.create({ data: { organizationId: c.organizationId, vehicleId, inventoryUnitId: unit?.id ?? null, version, status: data.status, details: json(data.details), pendingItems: json(data.pendingItems), costRecordIds: json(costRecordIds), actorUserId: c.user.id, reason: data.reason } });
    return { previous, result: { id: revision.id, version, status: revision.status, vehicleId, inventoryUnitId: revision.inventoryUnitId, pendingItems: data.pendingItems, costRecordIds } };
  });
}
