import { Prisma, type PrismaClient } from "@prisma/client";
import type { AuthenticatedUser } from "@/server/auth/store";
import { INITIAL_ORGANIZATION } from "@/server/appointments/location-foundation";
import { prisma } from "@/server/db/client";
import { EnterpriseCommandConflictError, hashEnterpriseCommand, normalizeEnterpriseCommand } from "@/server/enterprise-command/domain";
import { createEnterpriseCommandRepository } from "@/server/enterprise-command/repository";
import { assertVehicleCapability } from "@/server/enterprise-command/vehicle-capabilities";
import { describeVehicleOperationsBlock, evaluateVehicleOperationsFeature } from "@/server/enterprise-command/service";
import { assertAuthenticatedUser } from "@/server/policies/access";
import { createRepairOrder } from "@/server/repair-order/service";
import { createRepairOrderRepository } from "@/server/repair-order/repository";
import { closeRepairOrderTasks, reconcileRepairOrderOwnerTask } from "@/server/repair-order/task-bridge";
import { normalizeCanonicalVin } from "@/server/vehicle-registry/domain";
import { createRegistryVehicle } from "@/server/vehicle-registry/service";
import { createVehicleRegistryRepository } from "@/server/vehicle-registry/repository";
import { normalizeCompactIntake, type CompactIntakeResult } from "./compact-intake-domain";
import { assertIntakeAccess } from "./intake-access";
import { getVehicleIntake, saveVehicleIntake } from "./intake-service";
import { createInventoryUnitRepository, executeInventoryMutation } from "./repository";
import { createInventoryUnit, getInventoryUnitCreateOptions } from "./service";

type Dependencies = { database?: PrismaClient; organizationId?: string; now?: () => Date; enforceRollout?: boolean };

function transactionDatabase(transaction: Prisma.TransactionClient): PrismaClient {
  return new Proxy(transaction, {
    get(target, property) {
      if (property === "$transaction") return async (callback: unknown) => {
        if (typeof callback !== "function") throw new Error("Compact intake requires callback transactions.");
        return callback(transaction);
      };
      const value = Reflect.get(target, property);
      return typeof value === "function" ? value.bind(target) : value;
    },
  }) as PrismaClient;
}

function conflict(message: string): never {
  throw new EnterpriseCommandConflictError(message, "VERSION_CONFLICT");
}

async function access(actor: AuthenticatedUser | null, database: PrismaClient, organizationId: string, now: Date, locationId: string | null) {
  const user = assertAuthenticatedUser(actor);
  const grants = await createEnterpriseCommandRepository(database).listCapabilityGrants(user.id, organizationId);
  assertIntakeAccess({ actor: user, grants, now, locationId });
  return { user, grants };
}

async function exactVehicle(database: PrismaClient, organizationId: string, vin: string) {
  const candidates = await database.vehicle.findMany({
    where: { organizationId, OR: [{ vin }, { duplicateKey: `VIN:${vin}` }] },
    select: { id: true, status: true, mergedIntoVehicleId: true, vin: true }, take: 3,
  });
  if (candidates.length > 1) conflict("VIN is ambiguous; resolve duplicate registry records before intake.");
  const vehicle = candidates[0];
  if (vehicle && (vehicle.status !== "ACTIVE" || vehicle.mergedIntoVehicleId || vehicle.vin !== vin)) conflict("VIN does not identify an active canonical vehicle.");
  return vehicle ?? null;
}

export async function getCompactIntakeModel(actor: AuthenticatedUser | null, vehicleId: string, input: Dependencies = {}) {
  const database = input.database ?? prisma, organizationId = input.organizationId ?? INITIAL_ORGANIZATION.id;
  const intake = await getVehicleIntake(actor, vehicleId, { ...input, database, organizationId });
  const unit = intake.unit ? await database.inventoryUnit.findFirst({ where: { id: intake.unit.id, organizationId, vehicleId, closedAt: null }, select: { id: true, version: true, locationId: true, ownerUserId: true } }) : null;
  if (intake.unit && (!unit || unit.version !== intake.unit.version)) conflict("Inventory changed; reload intake.");
  return {
    vehicleId: intake.vehicle.id, vehicleNumber: intake.vehicle.vehicleNumber, vin: intake.vehicle.vin,
    year: intake.vehicle.year, make: intake.vehicle.make, model: intake.vehicle.model,
    inventoryNumber: intake.unit?.inventoryNumber ?? null, inventoryUnitId: intake.unit?.id ?? null, details: intake.details,
    intakeVersion: intake.version, unitVersion: unit?.version ?? null,
    locationId: unit?.locationId ?? null, ownerUserId: unit?.ownerUserId ?? null, canPrice: intake.canPrice,
  };
}

export async function getCompactIntake(actor: AuthenticatedUser | null, query: { vehicleId?: string | null; vin?: string | null } = {}, input: Dependencies = {}) {
  const database = input.database ?? prisma, organizationId = input.organizationId ?? INITIAL_ORGANIZATION.id;
  await access(actor, database, organizationId, (input.now ?? (() => new Date()))(), null);
  if (query.vehicleId && query.vin) throw new Error("Use either vehicleId or VIN for intake lookup.");
  const foundationRepository = createEnterpriseCommandRepository(database);
  const options = await getInventoryUnitCreateOptions(actor, { ...input, organizationId, foundationRepository, repository: createInventoryUnitRepository(database) });
  const vehicleId = query.vehicleId ?? (query.vin ? (await exactVehicle(database, organizationId, normalizeCanonicalVin({ vin: query.vin }).normalized!))?.id : null);
  return { intake: vehicleId ? await getCompactIntakeModel(actor, vehicleId, input) : null, options };
}

export async function saveCompactIntake(actor: AuthenticatedUser | null, value: unknown, input: Dependencies = {}) {
  const user = assertAuthenticatedUser(actor), now = (input.now ?? (() => new Date()))();
  const data = normalizeCompactIntake(value, now), database = input.database ?? prisma;
  const organizationId = input.organizationId ?? INITIAL_ORGANIZATION.id;
  return database.$transaction(async transaction => {
    const bound = transactionDatabase(transaction), foundationRepository = createEnterpriseCommandRepository(bound);
    const scope = { ...input, database: bound, organizationId, now: () => now, foundationRepository };
    const { grants } = await access(user, bound, organizationId, now, data.locationId);
    assertVehicleCapability({ actor: user, grants, now, locationId: data.locationId, capability: "INVENTORY_ACQUISITION_MANAGE", amountCents: data.details.purchaseCents ?? undefined });
    if (data.action === "SAVE_AND_START_RO") assertVehicleCapability({ actor: user, grants, now, locationId: data.locationId, capability: "REPAIR_ORDER_MANAGE" });
    if (input.enforceRollout !== false) {
      const flags = await foundationRepository.listFeatureFlags(organizationId);
      for (const feature of data.action === "SAVE_AND_START_RO" ? ["INVENTORY_INTAKE", "SHOP_OPERATIONS"] as const : ["INVENTORY_INTAKE"] as const) {
        const decision = evaluateVehicleOperationsFeature(flags, feature, user.id, data.locationId);
        if (!decision.executable) throw new Error(`Compact intake writes are not enabled. ${describeVehicleOperationsBlock(decision.reason)}`);
      }
    }
    const identity = hashEnterpriseCommand({ organizationId, actorUserId: user.id, idempotencyKey: data.idempotencyKey });
    const command = normalizeEnterpriseCommand({ actorUserId: user.id, organizationId, locationId: data.locationId,
      domain: "RETAIL_INVENTORY", subjectType: "COMPACT_INTAKE", subjectId: identity,
      commandType: "SAVE_COMPACT_INTAKE", expectedVersion: 0, idempotencyKey: data.idempotencyKey, reason: data.reason, payload: data });
    await transaction.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${JSON.stringify([organizationId, "COMPACT_INTAKE", data.idempotencyKey])}))`;
    const receipt = await executeInventoryMutation(bound, command, async () => {
      const [location, owner] = await Promise.all([
        transaction.location.findFirst({ where: { id: data.locationId, organizationId }, select: { id: true } }),
        transaction.user.findFirst({ where: { id: data.ownerUserId, isActive: true }, select: { id: true } }),
      ]);
      if (!location || !owner) throw new Error("Choose a valid organization location and active owner user ID.");
      if (data.vin) await transaction.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${JSON.stringify([organizationId, "COMPACT_INTAKE_VIN", data.vin])}))`;
      const matched = data.vin ? await exactVehicle(bound, organizationId, data.vin) : null;
      if (data.vehicleId && data.vin && matched?.id !== data.vehicleId) conflict("Vehicle ID and VIN do not identify the same canonical vehicle.");
      let vehicleId = data.vehicleId ?? matched?.id;
      if (!vehicleId) {
        if (!data.year || !data.make || !data.model) throw new Error("Year, make and model are required for a new VIN.");
        if (!data.ownershipConfirmed) throw new Error("Confirm ownership explicitly before opening inventory.");
        const created = await createRegistryVehicle(user, { vin: data.vin, year: data.year, make: data.make, model: data.model,
          vehicleNumber: `VEH-${identity.slice(0, 20).toUpperCase()}`, stockNumber: `CI-${identity.slice(0, 20).toUpperCase()}`,
          locationId: data.locationId, reason: data.reason, idempotencyKey: `ci:${identity}:vehicle` },
        { ...scope, repository: createVehicleRegistryRepository(bound) });
        const result = created.result as { id: string; duplicateReviewId?: string | null };
        if (result.duplicateReviewId) conflict("Vehicle identity requires duplicate review before intake.");
        vehicleId = result.id;
      }
      const intakeScope = JSON.stringify([organizationId, "RETAIL_INVENTORY", "VEHICLE_INTAKE", vehicleId]);
      await transaction.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${intakeScope}))`;
      const openScope = JSON.stringify([organizationId, "OPEN_INVENTORY_UNIT", vehicleId]);
      await transaction.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${openScope}))`;
      let unit = await transaction.inventoryUnit.findFirst({ where: { vehicleId, organizationId, closedAt: null } });
      if (unit) {
        const unitScope = JSON.stringify([organizationId, "RETAIL_INVENTORY", "INVENTORY_UNIT", unit.id]);
        await transaction.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${unitScope}))`;
        await transaction.$executeRaw`SELECT 1 FROM "InventoryUnit" WHERE id = ${unit.id} FOR UPDATE`;
        unit = await transaction.inventoryUnit.findFirstOrThrow({ where: { id: unit.id, organizationId, vehicleId, closedAt: null } });
      }
      const model = await getVehicleIntake(user, vehicleId, scope);
      if (model.version !== data.expectedIntakeVersion || (model.unit?.version ?? null) !== data.expectedUnitVersion) conflict("Intake or inventory changed; reload before saving.");
      if (unit && (unit.locationId !== data.locationId || unit.ownerUserId !== data.ownerUserId)) conflict("Selected location or owner does not match the current inventory unit.");
      let intakeVersion = model.version;
      if (!unit) {
        const acquiredAt = new Date(`${data.details.acquiredOn}T00:00:00Z`);
        const relationship = await transaction.vehicleRelationship.findFirst({ where: { organizationId, vehicleId,
          relationshipType: { in: ["DEALERSHIP_OWNED", "TRADE_IN", "CONSIGNMENT"] }, effectiveFrom: { lte: acquiredAt },
          OR: [{ effectiveTo: null }, { effectiveTo: { gte: acquiredAt } }] }, select: { id: true } });
        if (!relationship && !data.ownershipConfirmed) throw new Error("Confirm ownership explicitly before opening inventory.");
        const draft = await saveVehicleIntake(user, vehicleId, { details: data.details, status: "DRAFT", expectedVersion: intakeVersion,
          expectedUnitVersion: null, reason: data.reason, idempotencyKey: `ci:${identity}:draft` }, scope);
        intakeVersion = draft.version;
        await createInventoryUnit(user, { workflow: "ACQUISITION_INTAKE", vehicleId,
          acquisitionSource: data.details.source, financialAcquiredAt: acquiredAt.toISOString(), locationId: data.locationId,
          ownerUserId: data.ownerUserId, nextAction: "Review acquisition intake and pending information", targetAt: new Date(now.getTime() + 72 * 3_600_000).toISOString(),
          reason: data.reason, idempotencyKey: `ci:${identity}:unit` }, { ...scope, repository: createInventoryUnitRepository(bound) });
        unit = await transaction.inventoryUnit.findFirstOrThrow({ where: { vehicleId, organizationId, closedAt: null } });
      }
      const saved = await saveVehicleIntake(user, vehicleId, { details: data.details, status: "CONFIRMED", expectedVersion: intakeVersion,
        expectedUnitVersion: unit.version, reason: data.reason, idempotencyKey: `ci:${identity}:confirm` }, scope);
      const result: CompactIntakeResult = { vehicleId, inventoryUnitId: unit.id, inventoryNumber: unit.inventoryNumber,
        intakeVersion: saved.version, unitVersion: unit.version };
      if (data.action === "SAVE_AND_START_RO") {
        const openOrders = await transaction.repairOrder.findMany({ where: { organizationId, vehicleId, closedAt: null }, select: { id: true, locationId: true, inventoryUnitId: true }, take: 2 });
        if (openOrders.length > 1 || openOrders.some(order => order.locationId !== data.locationId || order.inventoryUnitId !== unit.id)) conflict("Existing repair order does not match this inventory cycle and location; reconcile before starting work.");
        const repair = await createRepairOrder(user, { intakeSource: "INVENTORY_RECON", inventoryUnitId: unit.id, vehicleId,
          locationId: data.locationId, ownerUserId: data.ownerUserId, concernSummary: data.concern,
          arrivedAt: now.toISOString(), targetAt: new Date(now.getTime() + 72 * 3_600_000).toISOString(), consentStatus: "NOT_REQUIRED", transportMode: "OTHER",
          intakeNotes: data.details.pendingNotes || null, nextAction: "Review inventory concern and plan work",
          reason: data.reason, idempotencyKey: `ci:${identity}:ro` }, { ...scope, repository: createRepairOrderRepository(bound),
          taskBridge: {
            reconcileOwner: (organization, orderId, actorId) => reconcileRepairOrderOwnerTask(organization, orderId, actorId, bound),
            close: (organization, orderId, actorId, reason) => closeRepairOrderTasks(organization, orderId, actorId, reason, bound),
          } });
        result.repairOrderId = (repair.result as { id: string }).id;
      }
      const current = await transaction.inventoryUnit.findFirstOrThrow({ where: { id: unit.id, organizationId, closedAt: null }, select: { version: true } });
      result.unitVersion = current.version;
      return { result };
    });
    return { ...receipt, result: receipt.result as CompactIntakeResult };
  }, { maxWait: 10_000, timeout: 30_000 });
}
