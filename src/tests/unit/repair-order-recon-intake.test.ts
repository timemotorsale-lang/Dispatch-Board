import type { PrismaClient } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";
import type { AuthenticatedUser } from "@/server/auth/store";
import { normalizeEnterpriseCommand } from "@/server/enterprise-command/domain";
import type { EnterpriseCommandRepository } from "@/server/enterprise-command/repository";
import { normalizeRepairOrderCreate } from "@/server/repair-order/domain";
import { createRepairOrderRepository, type RepairOrderRepository } from "@/server/repair-order/repository";
import { createRepairOrder } from "@/server/repair-order/service";

const now = new Date("2026-07-14T12:00:00Z");
const manager: AuthenticatedUser = { id: "manager-1", name: "Manager", email: "manager@example.com", isActive: true, roles: ["General Manager"], duties: { all: [], direct: [], roleDefaults: [] } };
const body = { arrivedAt: "2026-07-14T11:00:00Z", consentStatus: "NOT_REQUIRED", concernSummary: "Inspect inventory brakes.", idempotencyKey: "recon-1", intakeSource: "INVENTORY_RECON", inventoryUnitId: "unit-1", locationId: "loc-1", nextAction: "Complete intake review", ownerUserId: "owner-1", reason: "Open inventory recon intake.", targetAt: "2026-07-14T14:00:00Z", transportMode: "INTERNAL_TRANSPORT" };

function dependencies(repository: Partial<RepairOrderRepository>) {
  return {
    enforceRollout: false,
    foundationRepository: { listCapabilityGrants: vi.fn().mockResolvedValue([]) } as unknown as EnterpriseCommandRepository,
    now: () => now,
    organizationId: "org-1",
    repository: repository as RepairOrderRepository,
  };
}

describe("inventory recon repair-order intake", () => {
  it("rejects vehicle-only recon before duplicate lookup or persistence", async () => {
    const create = vi.fn(), findOpenConcernCandidates = vi.fn(), validateReadinessSnapshot = vi.fn();
    await expect(createRepairOrder(manager, { ...body, inventoryUnitId: undefined, vehicleId: "vehicle-1" }, dependencies({ create, findOpenConcernCandidates, validateReadinessSnapshot }))).rejects.toThrow("Inventory unit ID is required.");
    expect(findOpenConcernCandidates).not.toHaveBeenCalled();
    expect(validateReadinessSnapshot).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });

  it("passes the existing inventory unit to the command and persistence", async () => {
    const create = vi.fn().mockResolvedValue({ duplicate: false, result: { id: "ro-1" }, version: 1 });
    const findOpenConcernCandidates = vi.fn().mockResolvedValue([]);
    const validateReadinessSnapshot = vi.fn();
    await createRepairOrder(manager, body, dependencies({ create, findOpenConcernCandidates, validateReadinessSnapshot }));
    expect(findOpenConcernCandidates).toHaveBeenCalledWith("org-1", { appointmentId: null, inventoryUnitId: "unit-1", vehicleId: null });
    expect(create).toHaveBeenCalledWith(expect.objectContaining({
      commandType: "CREATE_REPAIR_ORDER",
      payload: expect.objectContaining({ inventoryUnitId: "unit-1", vehicleId: null, customerId: null }),
    }), expect.objectContaining({ inventoryUnitId: "unit-1", vehicleId: null, customerId: null }));
  });

  it.each([
    ["Inspect inventory brakes.", "OPEN_VEHICLE_CONCERN_MATCH"],
    ["Check engine light is on.", "OPEN_VEHICLE_REPAIR_ORDER"],
  ])("reuses the canonical vehicle's open order for %s", async (concernSummary, duplicateReason) => {
    const create = vi.fn(), validateReadinessSnapshot = vi.fn();
    const findOpenConcernCandidates = vi.fn().mockResolvedValue([{ id: "ro-existing", repairOrderNumber: "RO-EXISTING", stage: "INTAKE", operatingState: "ACTIVE", version: 3, concernSummary }]);
    const result = await createRepairOrder(manager, body, dependencies({ create, findOpenConcernCandidates, validateReadinessSnapshot }));
    expect(result).toMatchObject({ duplicate: true, result: { id: "ro-existing", duplicateReason } });
    expect(create).not.toHaveBeenCalled();
    expect(validateReadinessSnapshot).not.toHaveBeenCalled();
  });

  it("resolves inventory identity to the canonical vehicle for duplicate protection", async () => {
    const findUnit = vi.fn().mockResolvedValue({ vehicleId: "vehicle-1" });
    const findOrders = vi.fn().mockResolvedValue([{ id: "ro-existing", serviceVisit: { concernSummary: body.concernSummary } }]);
    const repository = createRepairOrderRepository({ inventoryUnit: { findFirst: findUnit }, repairOrder: { findMany: findOrders } } as unknown as PrismaClient);
    const result = await repository.findOpenConcernCandidates("org-1", { appointmentId: null, inventoryUnitId: "unit-1", vehicleId: null });
    expect(findUnit).toHaveBeenCalledWith({ where: { id: "unit-1", organizationId: "org-1", closedAt: null }, select: { vehicleId: true } });
    expect(findOrders).toHaveBeenCalledWith(expect.objectContaining({ where: { organizationId: "org-1", vehicleId: "vehicle-1", closedAt: null } }));
    expect(result).toEqual([{ id: "ro-existing", concernSummary: body.concernSummary }]);
  });

  it.each([null, ""])("rejects direct repository recon without an inventory unit: %s", async inventoryUnitId => {
    const findOwnership = vi.fn().mockResolvedValue({ id: "owned-vehicle", relationshipType: "DEALERSHIP_OWNED" });
    const createVisit = vi.fn(), createOrder = vi.fn(), createUnit = vi.fn();
    const transaction = {
      enterpriseCommandLedger: { findUnique: vi.fn().mockResolvedValue(null) },
      enterpriseAggregateVersion: { findUnique: vi.fn().mockResolvedValue(null) },
      vehicleRelationship: { findFirst: findOwnership },
      inventoryUnit: { create: createUnit },
      serviceVisit: { create: createVisit },
      repairOrder: { create: createOrder },
    };
    const database = { $transaction: async (mutate: (value: typeof transaction) => Promise<unknown>) => mutate(transaction) } as unknown as PrismaClient;
    const data = normalizeRepairOrderCreate({ ...body, vehicleId: "vehicle-1" }, now);
    const command = normalizeEnterpriseCommand({ actorUserId: manager.id, commandType: "CREATE_REPAIR_ORDER", domain: "SHOP_OPERATIONS", expectedVersion: 0, idempotencyKey: body.idempotencyKey, locationId: body.locationId, organizationId: "org-1", payload: {}, reason: body.reason, subjectId: "ro-1", subjectType: "REPAIR_ORDER" });
    await expect(createRepairOrderRepository(database).create(command, { ...data, inventoryUnitId, actorUserId: manager.id, repairOrderNumber: "RO-1" })).rejects.toThrow("Inventory unit ID is required.");
    expect(findOwnership).not.toHaveBeenCalled();
    expect(createUnit).not.toHaveBeenCalled();
    expect(createVisit).not.toHaveBeenCalled();
    expect(createOrder).not.toHaveBeenCalled();
  });

  it.each([
    [null, "Inventory unit is not active at the selected location."],
    [{ id: "unit-1", vehicleId: "other-vehicle", inventoryNumber: "INV-1", version: 1 }, "Inventory unit does not belong to the selected repair vehicle."],
  ])("rejects ineligible inventory before writing intake: %s", async (unit, message) => {
    const findUnit = vi.fn().mockResolvedValue(unit), createUnit = vi.fn(), createVisit = vi.fn(), createOrder = vi.fn();
    const transaction = {
      enterpriseCommandLedger: { findUnique: vi.fn().mockResolvedValue(null) },
      enterpriseAggregateVersion: { findUnique: vi.fn().mockResolvedValue(null) },
      inventoryUnit: { findFirst: findUnit, create: createUnit },
      serviceVisit: { create: createVisit },
      repairOrder: { create: createOrder },
    };
    const database = { $transaction: async (mutate: (value: typeof transaction) => Promise<unknown>) => mutate(transaction) } as unknown as PrismaClient;
    const data = normalizeRepairOrderCreate({ ...body, vehicleId: "vehicle-1" }, now);
    const command = normalizeEnterpriseCommand({ actorUserId: manager.id, commandType: "CREATE_REPAIR_ORDER", domain: "SHOP_OPERATIONS", expectedVersion: 0, idempotencyKey: body.idempotencyKey, locationId: body.locationId, organizationId: "org-1", payload: {}, reason: body.reason, subjectId: "ro-1", subjectType: "REPAIR_ORDER" });
    await expect(createRepairOrderRepository(database).create(command, { ...data, actorUserId: manager.id, repairOrderNumber: "RO-1" })).rejects.toThrow(message);
    expect(findUnit).toHaveBeenCalledWith({ where: { id: "unit-1", organizationId: "org-1", locationId: "loc-1", closedAt: null }, select: { id: true, vehicleId: true, inventoryNumber: true, version: true } });
    expect(createUnit).not.toHaveBeenCalled();
    expect(createVisit).not.toHaveBeenCalled();
    expect(createOrder).not.toHaveBeenCalled();
  });
});
