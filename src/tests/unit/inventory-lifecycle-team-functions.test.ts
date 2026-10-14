import { describe, expect, it, vi } from "vitest";
import type { AuthenticatedUser } from "@/server/auth/store";
import { INVENTORY_TEAM_FUNCTIONS, FRONTLINE_ACTION_FUNCTIONS } from "@/lib/inventory-team-functions";
import { evaluateVehicleCapability, type VehicleCapability } from "@/server/enterprise-command/vehicle-capabilities";
import { describeVehicleOperationsBlock, evaluateVehicleOperationsFeature } from "@/server/enterprise-command/service";
import { authorizeInventoryRecon } from "@/server/inventory-execution/access";
import { canCompleteShopReconStage } from "@/server/shop-recon/policy";
import { getInventoryWorkflowLauncher } from "@/server/inventory-workflow-launcher/service";
import { runFrontlineCommand } from "@/server/inventory-frontline/service";

const now = new Date("2026-10-10T12:00:00Z");
const staff: AuthenticatedUser = { id: "staff", name: "Staff", email: "staff@example.test", isActive: true, roles: ["Staff"], duties: { all: [], direct: [], roleDefaults: [] } };
const actor = (names: string[], defaults = false): AuthenticatedUser => ({ ...staff, duties: { all: names, direct: defaults ? [] : names, roleDefaults: defaults ? names : [] } });
const allowed = (user: AuthenticatedUser, capability: VehicleCapability) => evaluateVehicleCapability({ actor: user, capability, locationId: null, now }).allowed;

describe("inventory lifecycle functions in existing team management", () => {
  it("enforces action functions at the service before mutation", async () => {
    const transition = vi.fn(async () => ({ version: 2 }));
    const deps = { repository: { get: vi.fn(async () => ({ locationId: "lot", ownerUserId: "owner", stage: "FRONTLINE_READY" })), transition } as never, foundationRepository: { listCapabilityGrants: vi.fn(async () => []), listFeatureFlags: vi.fn(async () => []) } as never, enforceRollout: false, now: () => now };
    const body = { action: "SUSPEND", expectedVersion: 1, idempotencyKey: "suspend", reason: "Material vehicle facts changed" };
    await expect(runFrontlineCommand(actor(["Publish inventory listings"]), "workflow", body, deps)).rejects.toThrow("INVENTORY_RELEASE_MANAGE");
    expect(transition).not.toHaveBeenCalled();
    await expect(runFrontlineCommand(actor(["Authorize inventory release"]), "workflow", body, deps)).resolves.toMatchObject({ version: 2 });
    await expect(runFrontlineCommand(actor(["Authorize inventory release"]), "workflow", body, { ...deps, enforceRollout: true })).rejects.toThrow("master setting");
    expect(transition).toHaveBeenCalledOnce();
  });
  it("binds quality review to the signed-in reviewer and rejects owner self-review", async () => {
    const transition = vi.fn();
    const deps = { repository: { get: vi.fn(async () => ({ locationId: "lot", ownerUserId: staff.id })), transition } as never, foundationRepository: { listCapabilityGrants: vi.fn(async () => []) } as never, enforceRollout: false };
    await expect(runFrontlineCommand(actor(["Verify inventory readiness"]), "workflow", { action: "VERIFY_QUALITY", expectedVersion: 1, idempotencyKey: "quality", reason: "Review observed quality evidence", qcPass: true, safetyPass: true, legalPass: true, reviewerUserId: "someone-else" }, deps)).rejects.toThrow("cannot independently verify");
    expect(transition).not.toHaveBeenCalled();
  });
  it("exposes authorized workflow entry points without requiring a manager title", () => {
    const user = actor([...INVENTORY_TEAM_FUNCTIONS.map(item => item.name), "Edit inventory pricing"]);
    const cards = getInventoryWorkflowLauncher(user, { inventoryUnitId: "unit", version: "1" }).cards;
    for (const id of ["WL-01", "WL-01B", "WL-02", "WL-02A", "WL-09"]) expect(cards.find(item => item.id === id)?.enabled).toBe(true);
  });
  it("uses assigned functions for nontechnical inventory shop stages only", () => {
    expect(canCompleteShopReconStage(actor(["Manage inventory acquisition"]), "SERVICE_RECON_JOB_INTAKE", "INVENTORY_RECON").allowed).toBe(true);
    expect(canCompleteShopReconStage(actor(["Execute inventory recon"]), "PARTS_RESOURCE_READINESS", "INVENTORY_RECON").allowed).toBe(true);
    expect(canCompleteShopReconStage(actor(["Verify inventory readiness"]), "QUALITY_CONTROL_ROAD_TEST", "INVENTORY_RECON").allowed).toBe(true);
    expect(canCompleteShopReconStage(actor(["Authorize inventory release"]), "VEHICLE_HANDOVER_SHOP_EXIT", "INVENTORY_RECON").allowed).toBe(true);
    expect(canCompleteShopReconStage(actor(["Execute inventory recon"]), "DIAGNOSIS", "INVENTORY_RECON").allowed).toBe(false);
    expect(canCompleteShopReconStage(actor(["Execute inventory recon"]), "PARTS_RESOURCE_READINESS", "CUSTOMER_REPAIR").allowed).toBe(false);
  });
  it.each(INVENTORY_TEAM_FUNCTIONS)("authorizes $name through direct and role-default assignments", item => {
    for (const defaults of [false, true]) {
      const user = actor([item.name], defaults);
      expect(allowed(user, item.capability)).toBe(true);
      expect(allowed(user, "INVENTORY_UNIT_VIEW")).toBe(true);
      expect(allowed(user, "VEHICLE_ROLLOUT_MANAGE")).toBe(false);
      expect(allowed(user, "DIAGNOSTIC_CONCLUSION_CONFIRM")).toBe(false);
    }
  });
  it("keeps workspace access read-only and separates pricing, publishing and release", () => {
    const viewer = actor(["Work on inventory"]);
    for (const capability of Object.values(FRONTLINE_ACTION_FUNCTIONS)) expect(allowed(viewer, capability)).toBe(false);
    const pricing = actor(["Edit inventory pricing"]);
    expect(allowed(pricing, "INVENTORY_PRICING_MANAGE")).toBe(true);
    expect(allowed(pricing, "INVENTORY_PUBLISH_MANAGE")).toBe(false);
    expect(allowed(actor(["Publish inventory listings"]), "INVENTORY_RELEASE_MANAGE")).toBe(false);
  });
  it("supports the complete assigned package without granting unrelated administration", () => {
    const user = actor([...INVENTORY_TEAM_FUNCTIONS.map(item => item.name), "Edit inventory pricing"]);
    for (const capability of Object.values(FRONTLINE_ACTION_FUNCTIONS)) expect(allowed(user, capability)).toBe(true);
    for (const capability of ["VEHICLE_IDENTITY_CREATE", "INVENTORY_INTAKE_EDIT", "INVENTORY_PRICING_MANAGE", "PARTS_MANAGE"] as const) expect(allowed(user, capability)).toBe(true);
    expect(allowed(user, "VEHICLE_CAPABILITY_MANAGE")).toBe(false);
    expect(allowed(staff, "INVENTORY_RELEASE_MANAGE")).toBe(false);
    expect(allowed({ ...user, isActive: false }, "INVENTORY_RELEASE_MANAGE")).toBe(false);
  });
  it("honors explicit and legacy restrictions before assigned functions", () => {
    const user = actor(["Manage inventory acquisition"]);
    const base = { actor: user, capability: "INVENTORY_ACQUISITION_MANAGE" as const, locationId: "lot", now };
    const grant = { capability: "INVENTORY_UNIT_MANAGE", effect: "DENY" as const, locationId: "lot", validFrom: new Date("2026-01-01"), validTo: null };
    expect(evaluateVehicleCapability({ ...base, grants: [grant] }).reason).toBe("EXPLICIT_DENY");
    expect(evaluateVehicleCapability({ ...base, grants: [{ ...grant, effect: "ALLOW", constraints: { maxAmountCents: 100 } }], amountCents: 101 }).reason).toBe("GRANT_CONSTRAINTS_NOT_MET");
    expect(evaluateVehicleCapability({ ...base, grants: [{ ...grant, locationId: "other" }] }).allowed).toBe(true);
    expect(evaluateVehicleCapability({ ...base, grants: [{ ...grant, effect: "ALLOW", constraints: { requiresIndependentApproval: true } }], priorActorUserId: user.id }).allowed).toBe(false);
  });
  it("does not bypass master shutdown even for a fully authorized staff member", () => {
    expect(evaluateVehicleOperationsFeature([], "INVENTORY_INTAKE", staff.id, null)).toMatchObject({ executable: false, reason: "MASTER_DISABLED" });
    expect(describeVehicleOperationsBlock("MASTER_DISABLED")).toContain("master setting");
    expect(describeVehicleOperationsBlock("OUTSIDE_PILOT")).toContain("pilot");
  });
  it("checks explicit restrictions for managers as well as delegated recon staff", async () => {
    const listCapabilityGrants = vi.fn(async () => []);
    const deps = { foundationRepository: { listCapabilityGrants } as never, now: () => now };
    await expect(authorizeInventoryRecon(actor(["Execute inventory recon"]), deps)).resolves.toMatchObject({ id: staff.id });
    listCapabilityGrants.mockResolvedValueOnce([{ capability: "INVENTORY_RECON_MANAGE", effect: "DENY", locationId: null, validFrom: new Date("2026-01-01"), validTo: null }] as never);
    await expect(authorizeInventoryRecon({ ...staff, roles: ["General Manager"] }, deps)).rejects.toThrow("EXPLICIT_DENY");
  });
});
