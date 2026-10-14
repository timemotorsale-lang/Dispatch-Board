import { describe, expect, it, vi } from "vitest";
import type { AuthenticatedUser } from "@/server/auth/store";
import type { EnterpriseCommandRepository } from "@/server/enterprise-command/repository";
import type { InventoryUnitRepository } from "@/server/inventory-unit/repository";
import { getVehiclePricing, saveVehiclePricing } from "@/server/inventory-unit/service";
import { EDIT_INVENTORY_PRICING_DUTY_NAME, evaluatePricingAccess } from "@/server/inventory-unit/pricing-access";
import { evaluateVehicleCapability, type VehicleCapabilityGrantRecord } from "@/server/enterprise-command/vehicle-capabilities";

const staff: AuthenticatedUser = { id: "staff", name: "Staff", email: "staff@example.test", isActive: true, roles: ["Operations Coordinator"], duties: { all: [], direct: [], roleDefaults: [] } };
const now = new Date("2026-10-10T12:00:00Z");
const authorized = (assignment: "direct" | "roleDefaults"): AuthenticatedUser => ({ ...staff, duties: { ...staff.duties, all: [EDIT_INVENTORY_PRICING_DUTY_NAME], [assignment]: [EDIT_INVENTORY_PRICING_DUTY_NAME] } });
const proposal = { priceCents: 1500000, packEnabled: false, packCents: 0, includeEstimates: false, marginMode: "OFF", threshold: null, expectedVersion: 1, idempotencyKey: "pricing-proposal", reason: "Record proposed selling price" };
function dependencies(grants: VehicleCapabilityGrantRecord[] = []) {
  const unit = { id: "unit", vehicleId: "vehicle", locationId: "location", inventoryNumber: "I1", version: 1, vehicle: {}, pricingProposals: [], intakeRevisions: [], costEntries: [] };
  const repository = { getPricingDetail: vi.fn().mockResolvedValue(unit), getDetail: vi.fn().mockResolvedValue(unit), savePricing: vi.fn().mockResolvedValue({ version: 2 }) };
  const foundation = { listCapabilityGrants: vi.fn().mockResolvedValue(grants), listFeatureFlags: vi.fn().mockResolvedValue([]) };
  return { repository, foundation, input: { repository: repository as unknown as InventoryUnitRepository, foundationRepository: foundation as unknown as EnterpriseCommandRepository, organizationId: "org", enforceRollout: false, now: () => now } };
}

describe("existing team functions authorize inventory pricing", () => {
  it.each(["direct", "roleDefaults"] as const)("allows %s assignments to read and save pricing", async assignment => {
    const deps = dependencies(), actor = authorized(assignment);
    expect(await getVehiclePricing(actor, "vehicle", deps.input)).toMatchObject({ id: "unit", version: 1 });
    await saveVehiclePricing(actor, "unit", proposal, deps.input);
    expect(deps.repository.savePricing).toHaveBeenCalledWith(expect.objectContaining({ actorUserId: staff.id, commandType: "SAVE_INVENTORY_PRICING", expectedVersion: 1, locationId: "location", organizationId: "org" }), expect.objectContaining({ priceCents: proposal.priceCents }));
    expect(evaluateVehicleCapability({ actor, capability: "INVENTORY_UNIT_MANAGE", locationId: null }).allowed).toBe(false);
  });

  it("blocks reads and writes without the function and after revocation", async () => {
    const deps = dependencies();
    await expect(getVehiclePricing(staff, "vehicle", deps.input)).rejects.toThrow(EDIT_INVENTORY_PRICING_DUTY_NAME);
    await expect(saveVehiclePricing(staff, "unit", proposal, deps.input)).rejects.toThrow(EDIT_INVENTORY_PRICING_DUTY_NAME);
    expect(deps.repository.getPricingDetail).not.toHaveBeenCalled();
    expect(deps.repository.savePricing).not.toHaveBeenCalled();
    expect(evaluatePricingAccess({ actor: { ...authorized("direct"), duties: staff.duties }, locationId: null }).allowed).toBe(false);
  });

  it("preserves rollout shutdown even for assigned pricing editors", async () => {
    const deps = dependencies();
    await expect(saveVehiclePricing(authorized("direct"), "unit", proposal, { ...deps.input, enforceRollout: true })).rejects.toThrow("not enabled");
    expect(deps.repository.savePricing).not.toHaveBeenCalled();
  });

  it("preserves location denials and amount limits at the write boundary", async () => {
    const grant = { capability: "INVENTORY_PRICING_MANAGE", effect: "DENY" as const, locationId: "location", validFrom: new Date("2026-01-01"), validTo: null };
    const denied = dependencies([grant]);
    await expect(getVehiclePricing(authorized("direct"), "vehicle", denied.input)).rejects.toThrow("EXPLICIT_DENY");
    const limited = dependencies([{ ...grant, effect: "ALLOW", constraints: { maxAmountCents: 1000000 } }]);
    await expect(saveVehiclePricing(authorized("direct"), "unit", proposal, limited.input)).rejects.toThrow("GRANT_CONSTRAINTS_NOT_MET");
    expect(limited.repository.savePricing).not.toHaveBeenCalled();
  });

  it("preserves inactive-account and existing manager behavior", () => {
    expect(evaluatePricingAccess({ actor: { ...authorized("direct"), isActive: false }, locationId: null }).allowed).toBe(false);
    expect(evaluatePricingAccess({ actor: { ...staff, roles: ["General Manager"] }, locationId: null }).allowed).toBe(true);
  });
});
