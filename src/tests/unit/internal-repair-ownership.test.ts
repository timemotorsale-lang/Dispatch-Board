import type { PrismaClient } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";
import { normalizeEnterpriseCommand } from "@/server/enterprise-command/domain";
import { normalizeRepairOrderCreate } from "@/server/repair-order/domain";
import { createRepairOrderRepository } from "@/server/repair-order/repository";

const arrivedAt = "2026-10-10T10:00:00Z";
const data = { ...normalizeRepairOrderCreate({ arrivedAt, consentStatus: "NOT_REQUIRED", concernSummary: "Inspect dealership vehicle brakes.", idempotencyKey: "internal-1", intakeSource: "INVENTORY_RECON", inventoryUnitId: "unit-1", vehicleId: "vehicle-1", locationId: "loc-1", nextAction: "Inspect brakes", ownerUserId: "advisor-1", reason: "Start internal repair intake.", targetAt: "2026-10-10T14:00:00Z", transportMode: "INTERNAL_TRANSPORT" }, new Date(arrivedAt)), actorUserId: "advisor-1", repairOrderNumber: "RO-1" };
const command = normalizeEnterpriseCommand({ actorUserId: "advisor-1", commandType: "CREATE_REPAIR_ORDER", domain: "SHOP_OPERATIONS", expectedVersion: 0, idempotencyKey: "internal-1", locationId: "loc-1", organizationId: "org-1", payload: {}, reason: "Start internal repair intake.", subjectId: "ro-1", subjectType: "REPAIR_ORDER" });

function fixture(owned: boolean) {
  const create = () => vi.fn().mockResolvedValue({ id: "created-1" });
  const tx = {
    enterpriseCommandLedger: { findUnique: vi.fn().mockResolvedValue(null), create: create() },
    enterpriseAggregateVersion: { findUnique: vi.fn().mockResolvedValue(null), create: create() },
    enterpriseDomainEvent: { create: create() }, enterpriseAuditEvent: { create: create() }, enterpriseOutboxMessage: { create: create() },
    vehicleRelationship: { findFirst: vi.fn().mockResolvedValue(owned ? { id: "ownership-1", relationshipType: "DEALERSHIP_OWNED" } : null) },
    vehicle: { findFirst: vi.fn().mockResolvedValue({ id: "vehicle-1" }) },
    location: { findFirst: vi.fn().mockResolvedValue({ id: "loc-1" }) }, user: { findFirst: vi.fn().mockResolvedValue({ id: "advisor-1" }) },
    serviceDocument: { create: create(), findFirst: vi.fn().mockResolvedValue(null) },
    serviceVisit: { create: create() }, repairOrder: { findFirst: vi.fn().mockResolvedValue({ repairOrderNumber: "RO-1", customer: null, vehicle: { year: 2020, make: "Synthetic", model: "Fixture", vehicleNumber: "V-1", odometerObservations: [] }, serviceVisit: { concernSummary: "Synthetic concern" }, location: { name: "Test site", timezone: "America/Chicago" }, organization: { name: "Synthetic organization" } }), create: vi.fn().mockResolvedValue({ id: "ro-1", repairOrderNumber: "RO-1", stage: "INTAKE", operatingState: "ACTIVE", version: 1 }) },
    repairOrderStateEvent: { create: create() }, inventoryUnit: { create: create(), findFirst: vi.fn().mockResolvedValue(null) },
  };
  const database = { $transaction: async (action: (value: typeof tx) => Promise<unknown>) => action(tx) } as unknown as PrismaClient;
  return { tx, repository: createRepairOrderRepository(database) };
}

describe("internal repair ownership guard", () => {
  it("creates an internal RO bound to the existing eligible inventory unit", async () => {
    const { tx, repository } = fixture(true);
    tx.inventoryUnit.findFirst.mockResolvedValue({ id: "unit-1", vehicleId: "vehicle-1", inventoryNumber: "INV-1", version: 1 } as never);
    await expect(repository.create(command, data)).resolves.toMatchObject({ result: { id: "ro-1" } });
    expect(tx.serviceVisit.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ customerId: null, vehicleId: "vehicle-1", inventoryUnitId: "unit-1", origin: "INVENTORY_RECON", sourceSnapshot: { inventoryNumber: "INV-1", inventoryUnitVersion: 1 } }) }));
    expect(tx.inventoryUnit.create).not.toHaveBeenCalled();
    expect(tx.inventoryUnit.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "unit-1", organizationId: "org-1", locationId: "loc-1", closedAt: null } }));
    expect(tx.vehicleRelationship.findFirst).not.toHaveBeenCalled();
  });
  it.each([true, false])("rejects vehicle-only intake before writes even when dealership ownership is %s", async owned => {
    const { tx, repository } = fixture(owned);
    await expect(repository.create(command, { ...data, inventoryUnitId: null })).rejects.toThrow("Inventory unit ID is required.");
    expect(tx.vehicleRelationship.findFirst).not.toHaveBeenCalled();
    expect(tx.inventoryUnit.create).not.toHaveBeenCalled();
    expect(tx.repairOrder.create).not.toHaveBeenCalled();
    expect(tx.serviceVisit.create).not.toHaveBeenCalled();
    expect(tx.enterpriseCommandLedger.create).not.toHaveBeenCalled();
    expect(tx.enterpriseDomainEvent.create).not.toHaveBeenCalled();
    expect(tx.enterpriseAuditEvent.create).not.toHaveBeenCalled();
  });
  it("still rejects an invalid inventory unit instead of silently dropping its link", async () => {
    const { tx, repository } = fixture(true);
    await expect(repository.create(command, { ...data, inventoryUnitId: "invalid-unit" })).rejects.toThrow("Inventory unit is not active");
    expect(tx.repairOrder.create).not.toHaveBeenCalled();
  });
  it("preserves an existing unit link but rejects a link to a different vehicle", async () => {
    const { tx, repository } = fixture(true);
    tx.inventoryUnit.findFirst.mockResolvedValue({ id: "unit-1", vehicleId: "other-vehicle", inventoryNumber: "INV-1", version: 1 } as never);
    await expect(repository.create(command, { ...data, inventoryUnitId: "unit-1" })).rejects.toThrow("does not belong");
    expect(tx.repairOrder.create).not.toHaveBeenCalled();
    tx.inventoryUnit.findFirst.mockResolvedValue({ id: "unit-1", vehicleId: "vehicle-1", inventoryNumber: "INV-1", version: 1 } as never);
    await expect(repository.create(command, { ...data, inventoryUnitId: "unit-1" })).resolves.toMatchObject({ result: { id: "ro-1" } });
    expect(tx.repairOrder.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ inventoryUnitId: "unit-1", vehicleId: "vehicle-1", customerId: null }) }));
  });
});
