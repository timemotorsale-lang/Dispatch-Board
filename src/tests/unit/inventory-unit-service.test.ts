import { describe, expect, it, vi } from "vitest";
import type { AuthenticatedUser } from "@/server/auth/store";
import type { EnterpriseCommandRepository } from "@/server/enterprise-command/repository";
import { createInventoryUnit, listInventoryUnits } from "@/server/inventory-unit/service";
import type { InventoryUnitRepository } from "@/server/inventory-unit/repository";
const manager: AuthenticatedUser = { id: "manager-1", name: "Manager", email: "manager@example.com", isActive: true, roles: ["General Manager"], duties: { all: [], direct: [], roleDefaults: [] } };
const foundation = () => ({ listCapabilityGrants: vi.fn().mockResolvedValue([]), listFeatureFlags: vi.fn().mockResolvedValue([]) }) as unknown as EnterpriseCommandRepository;

describe("inventory unit foundation service", () => {
  it("adds deterministic age facts to tenant-safe search", async () => {
    const item = { financialAcquiredAt: new Date("2026-07-10T00:00:00Z"), stageStartedAt: new Date("2026-07-12T00:00:00Z"), targetAt: new Date("2026-07-13T00:00:00Z") };
    const search = vi.fn().mockResolvedValue({ items: [item], page: 1, pageSize: 25, total: 1, totalPages: 1 });
    const result = await listInventoryUnits(manager, { query: "INV" }, { organizationId: "org-1", now: () => new Date("2026-07-14T00:00:00Z"), repository: { search } as unknown as InventoryUnitRepository, foundationRepository: foundation(), enforceRollout: false });
    expect(search).toHaveBeenCalledWith("org-1", expect.objectContaining({ query: "INV" })); expect(result.items[0].age).toMatchObject({ overdue: true, totalAgeHours: 96 });
  });
  it("creates a version-zero M1 command and inventory mutation", async () => {
    const create = vi.fn().mockImplementation(async (command) => ({ duplicate: false, result: { id: command.subjectId }, version: 1 }));
    const result = await createInventoryUnit(manager, { financialAcquiredAt: "2026-07-14T08:00:00Z", idempotencyKey: "create-1", inventoryNumber: "INV-1", locationId: "loc-1", nextAction: "Confirm receipt plan", ownerUserId: "owner-1", reason: "Create dealership inventory unit.", targetAt: "2026-07-17T08:00:00Z", vehicleId: "vehicle-1" }, { organizationId: "org-1", now: () => new Date("2026-07-14T12:00:00Z"), repository: { create } as unknown as InventoryUnitRepository, foundationRepository: foundation(), enforceRollout: false });
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ commandType: "CREATE_INVENTORY_UNIT", domain: "RETAIL_INVENTORY", expectedVersion: 0, subjectType: "INVENTORY_UNIT" }), expect.objectContaining({ acquisitionSource: "OTHER", inventoryNumber: "INV-1" })); expect(result.version).toBe(1);
  });
  it("keeps mutations disabled while retail rollout is off", async () => {
    await expect(createInventoryUnit(manager, { financialAcquiredAt: "2026-07-14T08:00:00Z", idempotencyKey: "create-1", inventoryNumber: "INV-1", locationId: "loc-1", nextAction: "Confirm receipt plan", ownerUserId: "owner-1", reason: "Create dealership inventory unit.", targetAt: "2026-07-17T08:00:00Z", vehicleId: "vehicle-1" }, { organizationId: "org-1", now: () => new Date("2026-07-14T12:00:00Z"), repository: {} as InventoryUnitRepository, foundationRepository: foundation() })).rejects.toThrow("not enabled");
  });
});
