import { describe, expect, it } from "vitest";
import type { AuthenticatedUser } from "@/server/auth/store";
import { canCompleteShopReconStage, evaluateGovernedTransition, normalizeShopReconScopeChange } from "@/server/shop-recon/policy";

const actor = (name: string, roles: string[] = []): AuthenticatedUser => ({ id: name.toLowerCase().replaceAll(" ", "-"), name, email: `${name}@example.com`, isActive: true, roles, duties: { direct: [], roleDefaults: [], all: [] } });
const completeDraft = {
  checklist: { item_1: true, item_2: true, item_3: true, item_4: true, item_5: true, item_6: true },
  formData: { workLane: "Inventory Recon", vehicleIdentifier: "VIN", requester: "Inventory", concern: "Complete recon", commitmentAt: "2026-08-10", intakeOwner: "Brock" },
  evidence: ["job-intake-record", "request-snapshot"],
};

describe("Shop Recon governed transition policy", () => {
  it("allows any attributable draft shape but keeps stage completion with the named authority", () => {
    const decision = evaluateGovernedTransition({ actor: actor("Brock"), fromStage: "SERVICE_RECON_JOB_INTAKE", toStage: "JOB_SCOPE_DEFINITION", facts: { JOB_INTAKE_COMPLETE: true }, draft: completeDraft, override: null, now: new Date("2026-08-03T15:00:00.000Z") });
    expect(decision.allowed).toBe(true);
    expect(decision.authority.allowed).toBe(true);
    const unauthorized = evaluateGovernedTransition({ actor: actor("Unassigned User"), fromStage: "SERVICE_RECON_JOB_INTAKE", toStage: "JOB_SCOPE_DEFINITION", facts: { JOB_INTAKE_COMPLETE: true }, draft: completeDraft, override: null, now: new Date("2026-08-03T15:00:00.000Z") });
    expect(unauthorized.blockerCodes).toContain("BLK-STAGE-AUTHORITY");
  });

  it("does not let a documentation override bypass identity, authorization, QC, road-test, or release facts", () => {
    const decision = evaluateGovernedTransition({ actor: actor("General Manager", ["General Manager"]), fromStage: "QUALITY_CONTROL_ROAD_TEST", toStage: "RELEASE_HANDOVER_READINESS", facts: {}, draft: { checklist: {}, formData: {}, evidence: [] }, override: { kind: "NONCRITICAL_DOCUMENTATION", authorizedByUserId: "gm", expiresAt: null }, now: new Date("2026-08-03T15:00:00.000Z") });
    expect(decision.allowed).toBe(false);
    expect(decision.hardMissingFacts).toEqual(["QC_PASSED", "ROAD_TEST_PASSED_OR_NOT_REQUIRED"]);
  });

  it("version-controls a changed scope and requires a material finding", () => {
    expect(normalizeShopReconScopeChange({ expectedVersion: 4, idempotencyKey: "scope-1", reason: "New condition found during repair.", finding: "Corrosion extends beyond the approved repair area.", affectedRepairJobIds: ["job-1"], originalScope: { line: "A" }, proposedScope: { line: "B" } })).toMatchObject({ expectedVersion: 4, affectedRepairJobIds: ["job-1"] });
    expect(() => normalizeShopReconScopeChange({ expectedVersion: 4, idempotencyKey: "scope-2", reason: "New condition found during repair.", finding: "short", originalScope: {}, proposedScope: {} })).toThrow("New finding is required");
  });

  it("assigns the approved authorities across planning and dispatch stages", () => {
    expect(canCompleteShopReconStage(actor("Brock"), "FINDINGS_REPAIR_PLAN").allowed).toBe(true);
    expect(canCompleteShopReconStage(actor("Eli Manager"), "AUTHORIZATION").allowed).toBe(true);
    expect(canCompleteShopReconStage(actor("Brock"), "PARTS_RESOURCE_READINESS").allowed).toBe(true);
    expect(canCompleteShopReconStage(actor("Eli Manager"), "DISPATCH_WORK_STAGING").allowed).toBe(true);
    expect(canCompleteShopReconStage(actor("Walter Hernandez"), "DISPATCH_WORK_STAGING").allowed).toBe(false);
  });

  it("assigns the approved authorities across execution, QC and shop exit", () => {
    expect(canCompleteShopReconStage(actor("Walter Hernandez"), "REPAIR_EXECUTION").allowed).toBe(true);
    expect(canCompleteShopReconStage(actor("Walter Hernandez"), "TECHNICIAN_COMPLETION").allowed).toBe(true);
    expect(canCompleteShopReconStage(actor("Brock"), "QUALITY_CONTROL_ROAD_TEST").allowed).toBe(true);
    expect(canCompleteShopReconStage(actor("Walter Hernandez"), "QUALITY_CONTROL_ROAD_TEST").allowed).toBe(false);
    expect(canCompleteShopReconStage(actor("Eli"), "VEHICLE_HANDOVER_SHOP_EXIT").allowed).toBe(true);
  });
});
