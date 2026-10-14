import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";

describe.skipIf(process.env.RUN_DATABASE_INTEGRATION !== "1")("inventory cost PostgreSQL proof", () => {
  it("persists costs, serializes retries, retains corrections and preserves inventory holds", async () => {
    const { prisma } = await import("@/server/db/client");
    const { recordInventoryCost, getVehicleCosts } = await import("@/server/inventory-unit/service");
    const prefix = "evc-cost-" + randomUUID(), org = prefix + "-org", locationId = prefix + "-loc";
    const actor = { id: prefix + "-user", name: "Synthetic manager", email: prefix + "@example.test", isActive: true, roles: ["General Manager"], duties: { direct: [], roleDefaults: [], all: [] } };
    await prisma.organization.create({ data: { id: org, code: prefix, name: "Synthetic costs" } });
    await prisma.location.create({ data: { id: locationId, organizationId: org, code: prefix, name: "Synthetic lot", timezone: "America/Chicago", city: "Minneapolis", region: "MN" } });
    await prisma.user.create({ data: { id: actor.id, name: actor.name, email: actor.email, passwordHash: "synthetic-only" } });
    const vehicle = await prisma.vehicle.create({ data: { organizationId: org, vehicleNumber: prefix, vinState: "NON_VIN_EXCEPTION", vinValidationSource: "SYNTHETIC", nonVinReason: "Synthetic fixture has no assigned VIN" } });
    const unit = await prisma.inventoryUnit.create({ data: { organizationId: org, vehicleId: vehicle.id, inventoryNumber: prefix, locationId, ownerUserId: actor.id, financialAcquiredAt: new Date("2026-10-01"), stageStartedAt: new Date("2026-10-01"), targetAt: new Date("2026-10-09"), nextAction: "Resolve independent title hold", lifecycleStage: "TITLE_DOCUMENT_READINESS", operatingState: "BLOCKED", stateReason: "Independent title hold" } });
    await prisma.enterpriseAggregateVersion.create({ data: { organizationId: org, locationId, domain: "RETAIL_INVENTORY", subjectType: "INVENTORY_UNIT", subjectId: unit.id, version: 1 } });
    const deps = { organizationId: org, enforceRollout: false };
    const body = { action: "RECORD_COST", expectedVersion: 1, idempotencyKey: prefix + "-record", reason: "Record synthetic purchase cost", category: "ACQUISITION", status: "INCURRED", currency: "USD", amountCents: 123450, observedAt: "2026-10-01T00:00:00.000Z", reference: "invoice-1", notes: "Synthetic purchase amount" };
    const responses = await Promise.all([0, 1, 2].map(() => recordInventoryCost(actor, unit.id, body, deps)));
    expect(responses.filter(result => !result.duplicate)).toHaveLength(1);
    expect(await prisma.inventoryUnitCost.count({ where: { inventoryUnitId: unit.id } })).toBe(1);
    const model = await getVehicleCosts(actor, vehicle.id, deps);
    expect(model?.summary).toMatchObject({ incurredCents: 123450, estimatedCents: 0 });
    await expect(recordInventoryCost(actor, unit.id, { ...body, amountCents: 9 }, deps)).rejects.toMatchObject({ code: "IDEMPOTENCY_KEY_REUSED" });
    await expect(recordInventoryCost(actor, unit.id, { ...body, expectedVersion: 2, idempotencyKey: prefix + "-duplicate" }, deps)).rejects.toThrow("active manual cost");
    const competing = await Promise.allSettled([0, 1].map(index => recordInventoryCost(actor, unit.id, { ...body, expectedVersion: 2, reference: "estimate-" + index, status: "ESTIMATED", idempotencyKey: prefix + "-compete-" + index }, deps)));
    expect(competing.filter(result => result.status === "fulfilled")).toHaveLength(1);
    expect(competing.find(result => result.status === "rejected")?.reason.code).toBe("VERSION_CONFLICT");
    const costId = model!.costEntries[0].id;
    await recordInventoryCost(actor, unit.id, { action: "VOID_COST", costId, expectedVersion: 3, idempotencyKey: prefix + "-void", reason: "Correct the synthetic purchase entry" }, deps);
    expect((await getVehicleCosts(actor, vehicle.id, deps))?.summary.incurredCents).toBe(0);
    expect(await prisma.inventoryUnitCost.findUnique({ where: { id: costId } })).toMatchObject({ status: "VOID", amountCents: 123450 });
    expect(await prisma.inventoryUnit.findUnique({ where: { id: unit.id } })).toMatchObject({ version: 4, operatingState: "BLOCKED", stateReason: "Independent title hold", nextAction: "Resolve independent title hold" });
    expect(await prisma.enterpriseAuditEvent.count({ where: { organizationId: org, subjectId: unit.id } })).toBe(3);
    expect(await prisma.inventoryUnitStateEvent.count({ where: { inventoryUnitId: unit.id } })).toBe(3);
    expect(await getVehicleCosts(actor, vehicle.id, { organizationId: prefix + "-outside" })).toBeNull();
  }, 30000);
});
