import type { PrismaClient } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";
import { normalizeEnterpriseCommand } from "@/server/enterprise-command/domain";
import { normalizeVendorWorkCreate } from "@/server/shop-completion/domain";
import { createShopCompletionRepository } from "@/server/shop-completion/repository";

const order = { id: "order-1", organizationId: "org-1", origin: "INVENTORY_RECON", stage: "INTAKE", locationId: "store-1", vehicleId: "vehicle-1", inventoryUnitId: "unit-1" };
const vendorHandoff = normalizeVendorWorkCreate({
  earlyReconInventoryUnitId: "unit-1", allowParallelVendorWork: true,
  reason: "Record the actual outside vendor handoff.", scope: "Recalibrate the front camera.",
  idempotencyKey: "early-recon-handoff", vendorName: "Honda dealer",
  sentAt: "2026-07-14T14:00:00Z", occurredAt: "2026-07-14T14:00:00Z"
});
const command = normalizeEnterpriseCommand({
  actorUserId: "advisor-1", domain: "SHOP_OPERATIONS", commandType: "CREATE_REPAIR_VENDOR_WORK",
  organizationId: "org-1", locationId: "store-1", subjectType: "REPAIR_ORDER", subjectId: order.id,
  expectedVersion: 2, idempotencyKey: vendorHandoff.idempotencyKey, payload: {}, reason: vendorHandoff.reason
});

describe("early recon vendor handoff at commit", () => {
  it.each([
    { record: { ...order, stage: "QUALITY_CONTROL" }, unit: null, active: null, reason: "no longer eligible" },
    { record: { ...order, locationId: "store-2" }, unit: null, active: null, reason: "moved" },
    { record: order, unit: null, active: null, reason: "no longer eligible" },
    { record: order, unit: { id: "unit-1" }, active: { id: "prior-vendor" }, reason: "active vendor handoff already exists" },
  ])("does not record custody if the live order changed or someone already handed it off", async ({ record, unit, active, reason }) => {
    const createWork = vi.fn(), createCustody = vi.fn();
    const tx = {
      enterpriseCommandLedger: { findUnique: vi.fn().mockResolvedValue(null) },
      enterpriseAggregateVersion: { findUnique: vi.fn().mockResolvedValue({ version: 2 }) },
      repairOrder: { findFirst: vi.fn().mockResolvedValue(record) },
      inventoryUnit: { findFirst: vi.fn().mockResolvedValue(unit) },
      vehicleRelationship: { findFirst: vi.fn().mockResolvedValue({ relationshipType: "DEALERSHIP_OWNED" }) },
      customerVehicle: { findFirst: vi.fn().mockResolvedValue(null) },
      repairVendorWork: { findFirst: vi.fn().mockResolvedValue(active), create: createWork },
      vehicleCustodyEvent: { create: createCustody }
    };
    const database = { $transaction: async (run: (transaction: typeof tx) => Promise<unknown>) => run(tx) } as unknown as PrismaClient;
    expect(vendorHandoff.allowParallelVendorWork).toBe(false);
    await expect(createShopCompletionRepository(database).createVendorWork(command, { ...vendorHandoff, createdByUserId: "advisor-1" })).rejects.toThrow(reason);
    expect(createWork).not.toHaveBeenCalled();
    expect(createCustody).not.toHaveBeenCalled();
  });
});
