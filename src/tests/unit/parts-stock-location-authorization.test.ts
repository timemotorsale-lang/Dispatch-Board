import { describe, expect, it, vi } from "vitest";
import type { AuthenticatedUser } from "@/server/auth/store";
import type { EnterpriseCommandRepository, VehicleFeatureFlagRecord } from "@/server/enterprise-command/repository";
import type { VehicleCapabilityGrantRecord } from "@/server/enterprise-command/vehicle-capabilities";
import type { PartsLedgerRepository } from "@/server/parts-ledger/repository";
import { createPartStockLocation } from "@/server/parts-ledger/service";

vi.mock("@/server/db/client", () => ({ prisma: {} }));
const actor: AuthenticatedUser = { id: "staff", name: "Scoped staff", email: "staff@example.test", isActive: true, roles: ["Mechanic"], duties: { all: [], direct: [], roleDefaults: [] } };
const grant: VehicleCapabilityGrantRecord = { capability: "PARTS_MANAGE", effect: "ALLOW", locationId: "store-a", validFrom: new Date(0), validTo: null };
const request = { locationId: "store-a", code: "RECEIVING", name: "Receiving", type: "STAGING", reason: "Receiving authorization verification", idempotencyKey: "stock-test" };
function fixture(grants: VehicleCapabilityGrantRecord[] = [grant], enabledStore = "store-a") {
  const flags = ["VEHICLE_OPERATIONS_MASTER", "PARTS_OPERATIONS"].map(code => ({ id: code, organizationId: "org", code, mode: "GENERAL", locationId: enabledStore, rolloutPercent: 100, allowedUserIds: [], targetAt: null, version: 1, updatedAt: new Date(0) })) as VehicleFeatureFlagRecord[];
  const createLocation = vi.fn().mockResolvedValue({ result: { id: "stock" } });
  return { createLocation, dependencies: { organizationId: "org", repository: { createLocation } as unknown as PartsLedgerRepository, foundationRepository: { listCapabilityGrants: vi.fn().mockResolvedValue(grants), listFeatureFlags: vi.fn().mockResolvedValue(flags) } as unknown as EnterpriseCommandRepository } };
}
describe("stock location service authorization", () => {
  it("permits an explicit same-store grant with store-scoped rollout enabled", async () => {
    const f = fixture();
    await createPartStockLocation(actor, request, f.dependencies);
    expect(f.createLocation).toHaveBeenCalledWith(expect.objectContaining({ locationId: "store-a", actorUserId: actor.id, commandType: "CREATE_PART_STOCK_LOCATION" }), expect.objectContaining({ locationId: "store-a" }));
  });
  it("does not reuse a store-a grant at store-b even when store-b rollout is enabled", async () => {
    const f = fixture([grant], "store-b");
    await expect(createPartStockLocation(actor, { ...request, locationId: "store-b" }, f.dependencies)).rejects.toThrow("CAPABILITY_REQUIRED");
    expect(f.createLocation).not.toHaveBeenCalled();
  });
  it("denies a restricted role without a parts grant before persistence", async () => {
    const f = fixture([]);
    await expect(createPartStockLocation(actor, request, f.dependencies)).rejects.toThrow("PARTS_MANAGE");
    expect(f.createLocation).not.toHaveBeenCalled();
  });
  it("does not reuse another store's rollout for a role with default parts capability", async () => {
    const f = fixture([]);
    await expect(createPartStockLocation({ ...actor, roles: ["Parts"] }, { ...request, locationId: "store-b" }, f.dependencies)).rejects.toThrow("mutations are not enabled");
    expect(f.createLocation).not.toHaveBeenCalled();
  });
  it("honors an explicit store deny even for a manager", async () => {
    const f = fixture([{ ...grant, effect: "DENY" }]);
    await expect(createPartStockLocation({ ...actor, roles: ["General Manager"] }, request, f.dependencies)).rejects.toThrow("EXPLICIT_DENY");
    expect(f.createLocation).not.toHaveBeenCalled();
  });
});
