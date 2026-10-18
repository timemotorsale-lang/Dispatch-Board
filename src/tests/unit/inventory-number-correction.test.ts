import type { PrismaClient } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";
import type { AuthenticatedUser } from "@/server/auth/store";
import { correctInventoryUnitNumber, normalizeInventoryNumberCorrection } from "@/server/inventory-unit/number-correction-service";

const actor: AuthenticatedUser = { id: "actor", name: "Staff", email: "staff@example.com", isActive: true, roles: [], duties: { all: [], direct: [], roleDefaults: [] } };
const request = { inventoryNumber: " new-123 ", expectedVersion: 3, idempotencyKey: "correction-1", reason: "Correct transposed number" };
const now = new Date("2026-10-18T12:00:00Z");

function fixture() {
  const unit = { id: "unit", organizationId: "org", locationId: "location", ownerUserId: "owner", vehicleId: "vehicle", inventoryNumber: "OLD-123", version: 3, closedAt: null, lifecycleStage: "ACQUIRED", operatingState: "ACTIVE", targetAt: now, nextAction: "Inspect vehicle" };
  const grants = ["INVENTORY_UNIT_VIEW", "INVENTORY_ACQUISITION_MANAGE"].map(capability => ({ capability, effect: "ALLOW", locationId: "location", constraints: {}, validFrom: new Date(0), validTo: null }));
  let ledger: Record<string, unknown> | null = null;
  const tx = {
    $executeRaw: vi.fn().mockResolvedValue(1),
    inventoryUnit: {
      findFirst: vi.fn().mockImplementation(async (query: { where: { inventoryNumber?: unknown } }) => query.where.inventoryNumber ? null : { ...unit }),
      update: vi.fn().mockImplementation(async ({ data }: { data: { inventoryNumber: string; version: number } }) => Object.assign(unit, data)),
    },
    inventoryUnitStateEvent: { create: vi.fn().mockResolvedValue({}) },
    enterpriseCommandLedger: {
      findUnique: vi.fn().mockImplementation(async () => ledger),
      create: vi.fn().mockImplementation(async ({ data }: { data: Record<string, unknown> }) => { ledger = { id: "command", ...data }; return ledger; }),
    },
    enterpriseAggregateVersion: { findUnique: vi.fn().mockResolvedValue({ id: "aggregate", version: 3 }), update: vi.fn().mockResolvedValue({}) },
    enterpriseDomainEvent: { create: vi.fn().mockResolvedValue({ id: "event" }) },
    enterpriseAuditEvent: { create: vi.fn().mockResolvedValue({}) },
    enterpriseOutboxMessage: { create: vi.fn().mockResolvedValue({}) },
  };
  const database = {
    ...tx,
    vehicleCapabilityGrant: { findMany: vi.fn().mockImplementation(async () => grants) },
    vehicleOperationsFeatureFlag: { findMany: vi.fn().mockResolvedValue([]) },
    $transaction: vi.fn().mockImplementation(async (callback: (transaction: typeof tx) => Promise<unknown>) => callback(tx)),
  };
  const dependencies = { database: database as unknown as PrismaClient, organizationId: "org", now: () => now, enforceRollout: false };
  const save = (value: unknown = request, user: AuthenticatedUser | null = actor) => correctInventoryUnitNumber(user, "unit", value, dependencies);
  return { unit, grants, tx, database, dependencies, save };
}

describe("authorized inventory number correction (isolated database mocks)", () => {
  it("normalizes ASCII input and rejects Unicode case expansions", () => {
    expect(normalizeInventoryNumberCorrection(request).inventoryNumber).toBe("NEW-123");
    for (const inventoryNumber of ["", "-123", "a_b", "a b", "ß123", "ſ123", "Ａ123", "A".repeat(101)]) {
      expect(() => normalizeInventoryNumberCorrection({ ...request, inventoryNumber })).toThrow("ASCII");
    }
  });

  it.each([{ reason: " short " }, { expectedVersion: "3" }, { expectedVersion: 1.2 }, { expectedVersion: -1 }, { idempotencyKey: " " }])("rejects invalid command fields before writes: %j", async invalid => {
    const setup = fixture();
    await expect(setup.save({ ...request, ...invalid })).rejects.toThrow();
    expect(setup.database.$transaction).not.toHaveBeenCalled();
  });

  it("requires authentication and both capabilities at the selected location", async () => {
    const unauthenticated = fixture();
    await expect(unauthenticated.save(request, null)).rejects.toThrow("Authentication required");
    for (const capability of ["INVENTORY_UNIT_VIEW", "INVENTORY_ACQUISITION_MANAGE"]) {
      const setup = fixture();
      setup.grants.splice(setup.grants.findIndex(grant => grant.capability === capability), 1);
      await expect(setup.save()).rejects.toThrow("Vehicle capability required");
      expect(setup.database.$transaction).not.toHaveBeenCalled();
    }
    const wrongLocation = fixture();
    wrongLocation.grants.forEach(grant => { grant.locationId = "elsewhere"; });
    await expect(wrongLocation.save()).rejects.toThrow("Vehicle capability required");
  });

  it("checks authorization again against the locked unit", async () => {
    const setup = fixture();
    setup.tx.inventoryUnit.findFirst.mockResolvedValueOnce({ ...setup.unit }).mockResolvedValueOnce({ ...setup.unit, locationId: "elsewhere" });
    await expect(setup.save()).rejects.toThrow("Vehicle capability required");
    expect(setup.tx.inventoryUnit.update).not.toHaveBeenCalled();
  });

  it("enforces the master and retail rollout gate", async () => {
    const setup = fixture();
    await expect(correctInventoryUnitNumber(actor, "unit", request, { ...setup.dependencies, enforceRollout: true })).rejects.toThrow("not enabled");
    expect(setup.database.$transaction).not.toHaveBeenCalled();
  });

  it.each([["OFF", "GENERAL"], ["GENERAL", "OFF"], ["GENERAL", "SHADOW"]])("blocks master=%s and retail=%s", async (master, retail) => {
    const setup = fixture();
    setup.database.vehicleOperationsFeatureFlag.findMany.mockResolvedValue([
      { code: "VEHICLE_OPERATIONS_MASTER", mode: master, locationId: null },
      { code: "RETAIL_INVENTORY", mode: retail, locationId: null },
    ]);
    await expect(correctInventoryUnitNumber(actor, "unit", request, { ...setup.dependencies, enforceRollout: true })).rejects.toThrow("not enabled");
    expect(setup.database.$transaction).not.toHaveBeenCalled();
  });

  it("permits correction when both rollout flags are enabled", async () => {
    const setup = fixture();
    setup.database.vehicleOperationsFeatureFlag.findMany.mockResolvedValue([
      { code: "VEHICLE_OPERATIONS_MASTER", mode: "GENERAL", locationId: null },
      { code: "RETAIL_INVENTORY", mode: "GENERAL", locationId: null },
    ]);
    await expect(correctInventoryUnitNumber(actor, "unit", request, { ...setup.dependencies, enforceRollout: true })).resolves.toMatchObject({ inventoryNumber: "NEW-123", version: 4 });
  });

  it("locks the row and organization namespace, changes only number/version, and records old/new audit", async () => {
    const setup = fixture();
    expect(await setup.save()).toEqual({ id: "unit", inventoryNumber: "NEW-123", version: 4 });
    const locks = setup.tx.$executeRaw.mock.calls;
    expect(locks.some(call => String(call[0]).includes("FOR UPDATE"))).toBe(true);
    expect(locks.some(call => call[1] === JSON.stringify(["org", "INVENTORY_NUMBER_ALLOCATION"]))).toBe(true);
    expect(locks[0][1]).toBe(JSON.stringify(["org", "RETAIL_INVENTORY", "CORRECT_INVENTORY_NUMBER", "correction-1"]));
    expect(setup.tx.inventoryUnit.update).toHaveBeenCalledWith({ where: { id: "unit" }, data: { inventoryNumber: "NEW-123", version: 4 } });
    expect(setup.unit.vehicleId).toBe("vehicle");
    expect(setup.tx.enterpriseAuditEvent.create).toHaveBeenCalledWith({ data: expect.objectContaining({ actorUserId: "actor", reason: request.reason, priorValue: { id: "unit", inventoryNumber: "OLD-123", version: 3 }, newValue: { id: "unit", inventoryNumber: "NEW-123", version: 4 } }) });
    expect(setup.tx.inventoryUnitStateEvent.create).toHaveBeenCalledWith({ data: expect.objectContaining({ inventoryUnitId: "unit", actorUserId: "actor", version: 4, reason: expect.stringContaining("OLD-123 → NEW-123") }) });
  });

  it("checks case-insensitive collisions across all organization units, including closed units", async () => {
    const setup = fixture();
    setup.tx.inventoryUnit.findFirst.mockResolvedValueOnce({ ...setup.unit }).mockResolvedValueOnce({ ...setup.unit }).mockResolvedValueOnce({ ...setup.unit, id: "closed-unit", closedAt: now });
    await expect(setup.save()).rejects.toThrow("already in use");
    expect(setup.tx.inventoryUnit.findFirst).toHaveBeenLastCalledWith({ where: { organizationId: "org", id: { not: "unit" }, inventoryNumber: { equals: "NEW-123", mode: "insensitive" } }, select: { id: true } });
    expect(setup.tx.inventoryUnit.update).not.toHaveBeenCalled();
  });

  it("rejects an exact unit version mismatch even when aggregate version matches", async () => {
    const setup = fixture();
    setup.unit.version = 5;
    await expect(setup.save()).rejects.toMatchObject({ code: "VERSION_CONFLICT" });
    expect(setup.tx.inventoryUnit.update).not.toHaveBeenCalled();
  });

  it("returns the original retry receipt after later edits without rewriting history", async () => {
    const setup = fixture();
    const first = await setup.save();
    setup.unit.inventoryNumber = "LATER-123";
    setup.unit.version = 8;
    setup.unit.locationId = "moved";
    setup.grants.forEach(grant => { grant.locationId = "moved"; });
    expect(await setup.save()).toEqual(first);
    expect(setup.tx.inventoryUnit.update).toHaveBeenCalledTimes(1);
    expect(setup.tx.enterpriseAuditEvent.create).toHaveBeenCalledTimes(1);
    await expect(setup.save({ ...request, inventoryNumber: "OTHER" })).rejects.toMatchObject({ code: "IDEMPOTENCY_KEY_REUSED" });
  });

  it("does not mutate missing or closed selected units", async () => {
    const setup = fixture();
    setup.tx.inventoryUnit.findFirst.mockResolvedValueOnce(null);
    await expect(setup.save()).rejects.toMatchObject({ status: 404 });
    expect(setup.tx.inventoryUnit.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "unit", organizationId: "org", closedAt: null } }));
    expect(setup.database.$transaction).not.toHaveBeenCalled();
  });
});
