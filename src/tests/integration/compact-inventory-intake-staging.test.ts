import { randomInt, randomUUID } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import type { PrismaClient } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { assertLaborStagingTarget } from "../../../scripts/lib/labor-staging-target.mjs";
import type { AuthenticatedUser } from "@/server/auth/store";
import type { IntakeDetails } from "@/server/inventory-unit/intake-domain";
import { isValidVin } from "@/server/vehicle-registry/domain";

function syntheticVin() {
  const candidate = `3FA6P0K90HR${randomInt(1_000_000).toString().padStart(6, "0")}`;
  for (const digit of "0123456789X") {
    const vin = candidate.slice(0, 8) + digit + candidate.slice(9);
    if (isValidVin(vin)) return vin;
  }
  throw new Error("Synthetic VIN check digit could not be generated.");
}

async function snapshot(database: PrismaClient, organizationId: string) {
  const query = { where: { organizationId }, orderBy: { id: "asc" as const } };
  return {
    vehicles: await database.vehicle.findMany(query),
    relationships: await database.vehicleRelationship.findMany(query),
    externalIdentities: await database.vehicleExternalIdentity.findMany(query),
    odometers: await database.vehicleOdometerObservation.findMany(query),
    custody: await database.vehicleCustodyEvent.findMany(query),
    units: await database.inventoryUnit.findMany(query),
    unitEvents: await database.inventoryUnitStateEvent.findMany(query),
    revisions: await database.inventoryIntakeRevision.findMany(query),
    costs: await database.inventoryUnitCost.findMany(query),
    visits: await database.serviceVisit.findMany(query),
    orders: await database.repairOrder.findMany(query),
    orderEvents: await database.repairOrderStateEvent.findMany(query),
    documents: await database.serviceDocument.findMany(query),
    aggregates: await database.enterpriseAggregateVersion.findMany(query),
    commands: await database.enterpriseCommandLedger.findMany(query),
    events: await database.enterpriseDomainEvent.findMany(query),
    audits: await database.enterpriseAuditEvent.findMany(query),
    outbox: await database.enterpriseOutboxMessage.findMany(query),
    tasks: await database.task.findMany({ where: { vehicle: { organizationId } }, orderBy: { id: "asc" } }),
    assignments: await database.repairOrderTaskLink.findMany(query),
  };
}

describe.skipIf(process.env.RUN_LABOR_STAGING_INTEGRATION !== "1")("isolated compact inventory intake", () => {
  it("serializes colliding VIN tails without renumbering existing inventory", async () => {
    if (process.env.LABOR_STAGING_CONFIRM !== "isolated") throw new Error("Explicit isolated staging confirmation is required.");
    assertLaborStagingTarget(process.env.DATABASE_URL ?? "");
    const { prisma } = await import("@/server/db/client");
    const { createInventoryUnit } = await import("@/server/inventory-unit/service");
    const prefix = `number-proof-${randomUUID()}`, organizationId = `${prefix}-org`;
    await prisma.organization.create({ data: { id: organizationId, code: prefix, name: "Synthetic numbering proof" } });
    const actor: AuthenticatedUser = { id: `${prefix}-actor`, name: "Synthetic inventory manager", email: `${prefix}@example.test`, isActive: true, roles: ["General Manager"], duties: { all: [], direct: [], roleDefaults: [] } };
    await prisma.user.create({ data: { id: actor.id, name: actor.name, email: actor.email, passwordHash: "disabled-synthetic-login" } });
    const location = await prisma.location.create({ data: { organizationId, code: prefix, name: "Synthetic receiving", timezone: "America/Chicago", city: "Minneapolis", region: "MN" } });
    function serialVin(prefix: string) {
      const candidate = `${prefix}406095`;
      for (const digit of "0123456789X") {
        const vin = candidate.slice(0, 8) + digit + candidate.slice(9);
        if (isValidVin(vin)) return vin;
      }
      throw new Error("Synthetic VIN is invalid.");
    }
    const vehicles = await Promise.all(["3FA6P0K90HR", "1HGCM82603A"].map(async (vinPrefix, index) => prisma.vehicle.create({ data: { organizationId, vehicleNumber: `${prefix}-${index}`, vin: serialVin(vinPrefix), vinState: "VALID", vinValidationSource: "SYNTHETIC" } })));
    const now = new Date();
    const base = { acquisitionSource: "DIRECT_PURCHASE", financialAcquiredAt: new Date(now.getTime() - 60_000).toISOString(), locationId: location.id, ownerUserId: actor.id, reason: "Synthetic automatic inventory number verification", targetAt: new Date(now.getTime() + 3_600_000).toISOString(), nextAction: "Verify synthetic stock numbering" };
    const context = { organizationId, enforceRollout: false, now: () => now };
    const requests = vehicles.map((vehicle, index) => ({ ...base, vehicleId: vehicle.id, idempotencyKey: `${prefix}-${index}` }));
    const results = await Promise.all(requests.map(request => createInventoryUnit(actor, request, context)));
    const units = await prisma.inventoryUnit.findMany({ where: { organizationId } });
    expect(units).toHaveLength(2);
    expect(new Set(units.map(unit => unit.inventoryNumber))).toEqual(new Set(["406095", "406095-2"]));
    for (const [index, request] of requests.entries()) {
      expect(await createInventoryUnit(actor, request, context)).toMatchObject({ duplicate: true, result: results[index].result });
    }
    expect(await prisma.inventoryUnit.findMany({ where: { organizationId } })).toEqual(units);
    const otherVehicle = await prisma.vehicle.create({ data: { organizationId, vehicleNumber: `${prefix}-manual`, vinState: "NON_VIN_EXCEPTION", nonVinReason: "Synthetic numbering fixture without VIN", vinValidationSource: "SYNTHETIC" } });
    await createInventoryUnit(actor, { ...base, vehicleId: otherVehicle.id, inventoryNumber: "KEEP-MY-STOCK", idempotencyKey: `${prefix}-manual` }, context);
    expect(await prisma.inventoryUnit.findMany({ where: { organizationId, id: { in: units.map(unit => unit.id) } } })).toEqual(units);
    expect(await prisma.inventoryUnit.findFirst({ where: { organizationId, vehicleId: otherVehicle.id } })).toMatchObject({ inventoryNumber: "KEEP-MY-STOCK" });
  }, 30_000);
  it("reuses canonical identity, inventory and repair work, retries once, and rolls back every failed write", async () => {
    if (process.env.LABOR_STAGING_CONFIRM !== "isolated") throw new Error("Explicit isolated staging confirmation is required.");
    const target = assertLaborStagingTarget(process.env.DATABASE_URL ?? "");
    const { prisma } = await import("@/server/db/client");
    const [connection] = await prisma.$queryRaw<{ schema: string; database: string }[]>`SELECT current_schema() AS schema, current_database() AS database`;
    expect(connection).toEqual({ schema: target.searchParams.get("schema"), database: decodeURIComponent(target.pathname.slice(1)) });
    const { saveCompactIntake } = await import("@/server/inventory-unit/compact-intake-service");
    const now = new Date();
    const ownershipEffectiveFrom = new Date(new Date(`${now.toISOString().slice(0, 10)}T00:00:00Z`).getTime() - 86_400_000);

    async function fixture(suffix: string) {
      const prefix = `compact-proof-${suffix}-${randomUUID()}`;
      const organizationId = `${prefix}-org`;
      const actor: AuthenticatedUser = { id: `${prefix}-actor`, name: "Synthetic compact intake manager", email: `${prefix}@example.test`, isActive: true, roles: ["General Manager"], duties: { all: [], direct: [], roleDefaults: [] } };
      await prisma.organization.create({ data: { id: organizationId, code: prefix, name: "Synthetic isolated compact intake organization" } });
      await prisma.user.create({ data: { id: actor.id, name: actor.name, email: actor.email, passwordHash: "disabled-synthetic-login" } });
      const location = await prisma.location.create({ data: { organizationId, code: prefix, name: "Synthetic compact intake location", timezone: "America/Chicago", city: "Minneapolis", region: "MN" } });
      const details: IntakeDetails = { source: "DIRECT_PURCHASE", seller: "Synthetic seller", boughtFrom: "Synthetic purchase location", buyer: "Synthetic buyer", acquiredOn: now.toISOString().slice(0, 10), reference: `${prefix}-invoice`, priceStatus: "INCURRED", purchaseCents: 1_250_000, proposedPriceCents: null, whereabouts: "Synthetic receiving bay", odometer: 45000, odometerUnit: "MILES", condition: "Synthetic vehicle requires brake inspection", keys: 2, titleStatus: "RECEIVED", documents: "Synthetic purchase receipt and title", pendingNotes: "" };
      const request = { action: "SAVE_INVENTORY", idempotencyKey: `${prefix}-save`, reason: "Synthetic isolated compact inventory intake proof", vin: syntheticVin(), year: 2017, make: "Synthetic", model: "Intake proof", locationId: location.id, ownerUserId: actor.id, expectedIntakeVersion: 0, expectedUnitVersion: null, details, concern: "Synthetic brake inspection, not actual repair work", ownershipConfirmed: true };
      return { actor, organizationId, location, request, options: { database: prisma, organizationId, enforceRollout: false, now: () => now } };
    }

    const canonical = await fixture("canonical");
    const vehicle = await prisma.vehicle.create({ data: { organizationId: canonical.organizationId, vehicleNumber: `SYNTHETIC-${randomUUID()}`, vin: canonical.request.vin, vinRaw: canonical.request.vin, vinState: "VALID", vinValidationSource: "SYNTHETIC_CHECK_DIGIT", year: 2017, make: "Synthetic", model: "Canonical reuse proof" } });
    await prisma.vehicleRelationship.create({ data: { organizationId: canonical.organizationId, vehicleId: vehicle.id, relationshipType: "DEALERSHIP_OWNED", effectiveFrom: ownershipEffectiveFrom, sourceCode: "SYNTHETIC_ISOLATED_PROOF", sourceReference: canonical.request.idempotencyKey, notes: "Synthetic effective ownership for compact intake proof" } });
    const save = { ...canonical.request, vin: canonical.request.vin.toLowerCase(), ownershipConfirmed: false };
    const saved = await saveCompactIntake(canonical.actor, save, canonical.options);
    expect(saved.duplicate).toBe(false);
    expect(saved.result).toMatchObject({ vehicleId: vehicle.id, inventoryNumber: save.vin.slice(-6), intakeVersion: expect.any(Number), unitVersion: expect.any(Number) });
    expect(saved.result.repairOrderId).toBeUndefined();
    const savedState = await snapshot(prisma, canonical.organizationId);
    expect(savedState.vehicles).toHaveLength(1);
    expect(savedState.relationships).toHaveLength(1);
    expect(savedState.units).toHaveLength(1);
    expect(savedState.units[0]).toMatchObject({ id: saved.result.inventoryUnitId, vehicleId: vehicle.id, inventoryNumber: saved.result.inventoryNumber, version: saved.result.unitVersion, closedAt: null });
    expect(savedState.costs).toHaveLength(1);
    expect(savedState.costs[0]).toMatchObject({ category: "ACQUISITION", inventoryUnitId: saved.result.inventoryUnitId, amountCents: 1_250_000, status: "INCURRED", reference: save.details.reference });
    expect(savedState.visits).toHaveLength(0);
    expect(savedState.orders).toHaveLength(0);
    expect(savedState.tasks).toHaveLength(0);
    expect(savedState.assignments).toHaveLength(0);
    expect(await saveCompactIntake(canonical.actor, save, canonical.options)).toMatchObject({ duplicate: true, result: saved.result });
    expect(await snapshot(prisma, canonical.organizationId)).toEqual(savedState);
    await expect(saveCompactIntake(canonical.actor, { ...save, reason: "Synthetic changed request with reused retry key" }, canonical.options)).rejects.toThrow(/different request|idempotency|retry/i);
    expect(await snapshot(prisma, canonical.organizationId)).toEqual(savedState);

    const start = { ...canonical.request, action: "SAVE_AND_START_RO", vehicleId: vehicle.id, idempotencyKey: `${canonical.request.idempotencyKey}-start`, expectedIntakeVersion: saved.result.intakeVersion, expectedUnitVersion: saved.result.unitVersion, ownershipConfirmed: false };
    const started = await saveCompactIntake(canonical.actor, start, canonical.options);
    expect(started.duplicate).toBe(false);
    expect(started.result).toMatchObject({ vehicleId: vehicle.id, inventoryUnitId: saved.result.inventoryUnitId, inventoryNumber: saved.result.inventoryNumber, repairOrderId: expect.any(String) });
    const startedState = await snapshot(prisma, canonical.organizationId);
    expect(startedState.vehicles).toHaveLength(1);
    expect(startedState.relationships).toHaveLength(1);
    expect(startedState.units).toHaveLength(1);
    expect(startedState.costs).toEqual(savedState.costs);
    expect(startedState.visits).toHaveLength(1);
    expect(startedState.orders).toHaveLength(1);
    expect(startedState.orders[0]).toMatchObject({ id: started.result.repairOrderId, vehicleId: vehicle.id, inventoryUnitId: saved.result.inventoryUnitId, locationId: canonical.location.id, origin: "INVENTORY_RECON", intakeSource: "INVENTORY_RECON", customerId: null });
    expect(startedState.visits[0]).toMatchObject({ id: startedState.orders[0].serviceVisitId, vehicleId: vehicle.id, inventoryUnitId: saved.result.inventoryUnitId, origin: "INVENTORY_RECON", customerId: null });
    expect(startedState.tasks).toHaveLength(1);
    expect(startedState.tasks[0]).toMatchObject({ assignedUserId: canonical.actor.id, vehicleId: vehicle.id, sourceType: "REPAIR_ORDER", workflowArea: "SHOP" });
    expect(startedState.assignments).toHaveLength(1);
    expect(startedState.assignments[0]).toMatchObject({ repairOrderId: started.result.repairOrderId, assignmentKey: "RO_OWNER", taskId: startedState.tasks[0].id });
    expect(await saveCompactIntake(canonical.actor, start, canonical.options)).toMatchObject({ duplicate: true, result: started.result });
    expect(await snapshot(prisma, canonical.organizationId)).toEqual(startedState);
    const reused = await saveCompactIntake(canonical.actor, { ...start, idempotencyKey: `${start.idempotencyKey}-new-key`, expectedIntakeVersion: started.result.intakeVersion, expectedUnitVersion: started.result.unitVersion, concern: "Synthetic different concern on existing open repair order" }, canonical.options);
    expect(reused.result).toMatchObject({ vehicleId: vehicle.id, inventoryUnitId: saved.result.inventoryUnitId, inventoryNumber: saved.result.inventoryNumber, repairOrderId: started.result.repairOrderId });
    const reusedState = await snapshot(prisma, canonical.organizationId);
    expect(reusedState.vehicles).toEqual(startedState.vehicles);
    expect(reusedState.relationships).toEqual(startedState.relationships);
    expect(reusedState.units).toHaveLength(1);
    expect(reusedState.costs).toEqual(savedState.costs);
    expect(reusedState.visits).toHaveLength(1);
    expect(reusedState.orders).toHaveLength(1);
    expect(reusedState.tasks).toHaveLength(1);
    expect(reusedState.tasks[0]).toMatchObject({ id: startedState.tasks[0].id, assignedUserId: canonical.actor.id, vehicleId: vehicle.id });
    expect(reusedState.assignments).toHaveLength(1);
    expect(reusedState.assignments[0]).toMatchObject({ id: startedState.assignments[0].id, repairOrderId: started.result.repairOrderId, assignmentKey: "RO_OWNER", taskId: startedState.tasks[0].id });

    const { correctInventoryUnitNumber } = await import("@/server/inventory-unit/number-correction-service");
    const correction = { inventoryNumber: "SHORT-FIX", expectedVersion: reused.result.unitVersion, idempotencyKey: `${start.idempotencyKey}-correct`, reason: "Synthetic authorized correction preserves all existing links" };
    await expect(correctInventoryUnitNumber({ ...canonical.actor, roles: [] }, saved.result.inventoryUnitId, correction, canonical.options)).rejects.toThrow(/capability|permission|access|authorized/i);
    expect(await snapshot(prisma, canonical.organizationId)).toEqual(reusedState);
    const corrected = await correctInventoryUnitNumber(canonical.actor, saved.result.inventoryUnitId, correction, canonical.options);
    expect(corrected).toEqual({ id: saved.result.inventoryUnitId, inventoryNumber: "SHORT-FIX", version: reused.result.unitVersion + 1 });
    expect(await correctInventoryUnitNumber(canonical.actor, saved.result.inventoryUnitId, correction, canonical.options)).toEqual(corrected);
    const correctedState = await snapshot(prisma, canonical.organizationId);
    expect(correctedState.units[0]).toEqual({ ...reusedState.units[0], inventoryNumber: "SHORT-FIX", version: corrected.version, updatedAt: correctedState.units[0].updatedAt });
    expect(correctedState.costs).toEqual(reusedState.costs);
    expect(correctedState.orders).toEqual(reusedState.orders);
    expect(correctedState.visits).toEqual(reusedState.visits);
    expect(correctedState.vehicles).toEqual(reusedState.vehicles);
    expect(correctedState.audits.length).toBe(reusedState.audits.length + 1);

    const fresh = await fixture("fresh");
    fresh.request.details.reference = "";
    fresh.request.details.seller = "";
    fresh.request.details.titleStatus = "PENDING";
    fresh.request.details.documents = "";
    fresh.request.details.pendingNotes = "";
    const beforeCreation = await snapshot(prisma, fresh.organizationId);
    await expect(saveCompactIntake({ ...fresh.actor, roles: [] }, fresh.request, fresh.options)).rejects.toThrow(/capability|permission|access|authorized/i);
    expect(await snapshot(prisma, fresh.organizationId)).toEqual(beforeCreation);
    await expect(saveCompactIntake(fresh.actor, { ...fresh.request, ownershipConfirmed: false }, fresh.options)).rejects.toThrow(/ownership|owned|confirm/i);
    expect(await snapshot(prisma, fresh.organizationId)).toEqual(beforeCreation);
    const created = await saveCompactIntake(fresh.actor, { ...fresh.request, action: "SAVE_AND_START_RO" }, fresh.options);
    const createdState = await snapshot(prisma, fresh.organizationId);
    expect(createdState.vehicles).toHaveLength(1);
    expect(createdState.vehicles[0]).toMatchObject({ id: created.result.vehicleId, vin: fresh.request.vin, vinState: "VALID" });
    expect(createdState.relationships).toHaveLength(1);
    expect(createdState.relationships[0]).toMatchObject({ vehicleId: created.result.vehicleId, relationshipType: "DEALERSHIP_OWNED" });
    expect(createdState.units).toHaveLength(1);
    expect(createdState.units[0]).toMatchObject({ id: created.result.inventoryUnitId, inventoryNumber: created.result.inventoryNumber });
    expect(created.result.inventoryNumber).toBe(fresh.request.vin.slice(-6));
    expect(created.result.inventoryNumber).not.toBe(saved.result.inventoryNumber);
    expect(createdState.costs).toHaveLength(1);
    expect(createdState.costs[0]).toMatchObject({ reference: null, amountCents: 1_250_000 });
    expect(createdState.revisions.find(row => row.status === "CONFIRMED")).toMatchObject({ pendingItems: ["Seller", "Title", "Documents"], details: expect.objectContaining({ seller: "", titleStatus: "PENDING", documents: "", pendingNotes: "" }) });
    expect(createdState.visits).toHaveLength(1);
    expect(createdState.orders).toHaveLength(1);
    expect(createdState.tasks).toHaveLength(1);
    expect(createdState.tasks[0]).toMatchObject({ assignedUserId: fresh.actor.id, vehicleId: created.result.vehicleId, sourceType: "REPAIR_ORDER" });
    expect(createdState.assignments).toHaveLength(1);
    expect(createdState.assignments[0]).toMatchObject({ repairOrderId: created.result.repairOrderId, assignmentKey: "RO_OWNER", taskId: createdState.tasks[0].id });
    expect(await saveCompactIntake(fresh.actor, { ...fresh.request, action: "SAVE_AND_START_RO" }, fresh.options)).toMatchObject({ duplicate: true, result: created.result });
    expect(await snapshot(prisma, fresh.organizationId)).toEqual(createdState);

    const denied = { ...canonical.actor, roles: [], duties: { all: [], direct: [], roleDefaults: [] } };
    const next = { ...start, idempotencyKey: `${start.idempotencyKey}-rejected`, expectedIntakeVersion: reused.result.intakeVersion, expectedUnitVersion: reused.result.unitVersion };
    await expect(saveCompactIntake(denied, next, canonical.options)).rejects.toThrow(/capability|permission|access|authorized/i);
    expect(await snapshot(prisma, canonical.organizationId)).toEqual(correctedState);
    await expect(saveCompactIntake(null, next, canonical.options)).rejects.toThrow();
    expect(await snapshot(prisma, canonical.organizationId)).toEqual(correctedState);
    await expect(saveCompactIntake(canonical.actor, { ...next, idempotencyKey: `${next.idempotencyKey}-stale-intake`, expectedIntakeVersion: 0 }, canonical.options)).rejects.toThrow(/version|changed|reload/i);
    expect(await snapshot(prisma, canonical.organizationId)).toEqual(correctedState);
    expect(reused.result.unitVersion).toBeGreaterThan(1);
    await expect(saveCompactIntake(canonical.actor, { ...next, idempotencyKey: `${next.idempotencyKey}-stale-unit`, expectedUnitVersion: reused.result.unitVersion - 1 }, canonical.options)).rejects.toThrow(/version|changed|reload/i);
    expect(await snapshot(prisma, canonical.organizationId)).toEqual(correctedState);

    const rollback = await fixture("rollback");
    const beforeFailure = await snapshot(prisma, rollback.organizationId);
    const completedCreates: string[] = [];
    const failure = new Error("Synthetic failure after repair order owner task projection");
    const failingDatabase = prisma.$extends({
      query: {
        $allModels: {
          async $allOperations({ model, operation, args, query }) {
            const result = await query(args);
            if (operation === "create") {
              completedCreates.push(model);
              if (model === "RepairOrderTaskLink") throw failure;
            }
            return result;
          },
        },
      },
    });
    const failingRequest = { ...rollback.request, action: "SAVE_AND_START_RO" };
    await expect(saveCompactIntake(rollback.actor, failingRequest, { ...rollback.options, database: failingDatabase as unknown as PrismaClient })).rejects.toThrow(failure.message);
    expect(completedCreates).toEqual(expect.arrayContaining(["Vehicle", "VehicleRelationship", "InventoryIntakeRevision", "InventoryUnit", "InventoryUnitCost", "ServiceVisit", "RepairOrder", "Task", "RepairOrderTaskLink"]));
    expect(await snapshot(prisma, rollback.organizationId)).toEqual(beforeFailure);
    const recovered = await saveCompactIntake(rollback.actor, failingRequest, rollback.options);
    expect(recovered.duplicate).toBe(false);
    const recoveredState = await snapshot(prisma, rollback.organizationId);
    expect(recoveredState.vehicles).toHaveLength(1);
    expect(recoveredState.units).toHaveLength(1);
    expect(recoveredState.costs).toHaveLength(1);
    expect(recoveredState.visits).toHaveLength(1);
    expect(recoveredState.orders).toHaveLength(1);
    expect(recoveredState.tasks).toHaveLength(1);
    expect(recoveredState.tasks[0]).toMatchObject({ assignedUserId: rollback.actor.id, vehicleId: recovered.result.vehicleId, sourceType: "REPAIR_ORDER" });
    expect(recoveredState.assignments).toHaveLength(1);
    expect(recoveredState.assignments[0]).toMatchObject({ repairOrderId: recovered.result.repairOrderId, assignmentKey: "RO_OWNER", taskId: recoveredState.tasks[0].id });
    expect(await saveCompactIntake(rollback.actor, failingRequest, rollback.options)).toMatchObject({ duplicate: true, result: recovered.result });
    expect(await snapshot(prisma, rollback.organizationId)).toEqual(recoveredState);

    const { saveVehicleIntake } = await import("@/server/inventory-unit/intake-service");
    const routineRequest = { details: rollback.request.details, status: "CONFIRMED", expectedVersion: recovered.result.intakeVersion, expectedUnitVersion: recovered.result.unitVersion, idempotencyKey: `${rollback.request.idempotencyKey}-routine-no-reason` };
    const routine = await saveVehicleIntake(rollback.actor, recovered.result.vehicleId, routineRequest, rollback.options);
    const routineState = await snapshot(prisma, rollback.organizationId);
    const revision = routineState.revisions.find(row => row.id === routine.result.id);
    expect(revision).toMatchObject({ reason: "Confirm acquisition intake.", actorUserId: rollback.actor.id, status: "CONFIRMED" });
    const audit = routineState.audits.find(row => row.subjectId === recovered.result.vehicleId && row.reason === "Confirm acquisition intake.");
    expect(audit).toMatchObject({ actorUserId: rollback.actor.id, eventType: "CONFIRM_INVENTORY_INTAKE_COMPLETED", priorValue: expect.objectContaining({ id: expect.any(String) }), newValue: expect.objectContaining({ id: routine.result.id }) });
    expect(routineState.costs).toEqual(recoveredState.costs);
    expect(routineState.orders).toEqual(recoveredState.orders);
    expect(await saveVehicleIntake(rollback.actor, recovered.result.vehicleId, routineRequest, rollback.options)).toMatchObject({ duplicate: true, result: routine.result });
    expect(await snapshot(prisma, rollback.organizationId)).toEqual(routineState);

    const browserOrganizationId = "org-time-motor-sales";
    await prisma.organization.findUniqueOrThrow({ where: { id: browserOrganizationId } });
    const browserActor = await prisma.user.findUniqueOrThrow({ where: { email: "morgan.manager@local.test" } });
    expect(browserActor.isActive).toBe(true);
    const browserPrefix = `synthetic-compact-browser-${randomUUID()}`;
    const browserLocation = await prisma.location.create({ data: { organizationId: browserOrganizationId, code: browserPrefix, name: "Synthetic compact browser receiving", timezone: "America/Chicago", city: "Minneapolis", region: "MN" } });
    let browserVin = syntheticVin();
    while (await prisma.vehicle.findFirst({ where: { organizationId: browserOrganizationId, vin: browserVin } })) browserVin = syntheticVin();
    const browserVehicle = await prisma.vehicle.create({ data: { organizationId: browserOrganizationId, vehicleNumber: browserPrefix, vin: browserVin, vinRaw: browserVin, vinState: "VALID", vinValidationSource: "SYNTHETIC_CHECK_DIGIT", year: 2017, make: "Synthetic", model: "Compact browser intake", registryRelationships: { create: { organizationId: browserOrganizationId, relationshipType: "DEALERSHIP_OWNED", effectiveFrom: ownershipEffectiveFrom, sourceCode: "SYNTHETIC_ISOLATED_PROOF", sourceReference: browserPrefix, notes: "Synthetic browser proof vehicle only" } } } });
    const { VEHICLE_OPERATIONS_FEATURES } = await import("@/server/enterprise-command/service");
    for (const code of ["VEHICLE_OPERATIONS_MASTER", "RETAIL_INVENTORY", "INVENTORY_INTAKE", "VEHICLE_REGISTRY", "SHOP_OPERATIONS"] as const) {
      expect(VEHICLE_OPERATIONS_FEATURES).toContain(code);
      const flag = await prisma.vehicleOperationsFeatureFlag.findFirst({ where: { organizationId: browserOrganizationId, locationId: null, code } });
      if (flag) await prisma.vehicleOperationsFeatureFlag.update({ where: { id: flag.id }, data: { mode: "GENERAL" } });
      else await prisma.vehicleOperationsFeatureFlag.create({ data: { organizationId: browserOrganizationId, code, mode: "GENERAL", allowedUserIds: [] } });
    }
    expect(isValidVin(browserVin)).toBe(true);
    expect(await prisma.inventoryUnit.count({ where: { organizationId: browserOrganizationId, vehicleId: browserVehicle.id } })).toBe(0);
    expect(await prisma.repairOrder.count({ where: { organizationId: browserOrganizationId, vehicleId: browserVehicle.id } })).toBe(0);
    mkdirSync("test-results/labor-staging", { recursive: true });
    writeFileSync("test-results/labor-staging/compact-intake-browser-fixture.json", JSON.stringify({ vehicleId: browserVehicle.id, vin: browserVin, locationId: browserLocation.id, ownerUserId: browserActor.id }, null, 2));
  }, 120_000);
});
