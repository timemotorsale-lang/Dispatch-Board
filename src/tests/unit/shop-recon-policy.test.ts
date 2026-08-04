import { describe, expect, it } from "vitest";
import type { AuthenticatedUser } from "@/server/auth/store";
import { canCompleteShopReconStage, evaluateGovernedTransition, normalizeShopReconScopeChange } from "@/server/shop-recon/policy";

const actor = (name: string, roles: string[] = []): AuthenticatedUser => ({ id: name.toLowerCase().replaceAll(" ", "-"), name, email: `${name}@example.com`, isActive: true, roles, duties: { direct: [], roleDefaults: [], all: [] } });
const completeDraft = { checklist: { item_1: true, item_2: true, item_3: true }, formData: { observedIdentifier: "VIN", arrivalCondition: "Normal", entryNotes: "No exceptions" }, evidence: ["arrival-observation", "entry-photo"] };

describe("Shop Recon governed transition policy", () => {
  it("allows any attributable draft shape but keeps stage completion with the named authority", () => {
    const decision = evaluateGovernedTransition({ actor: actor("Brock"), fromStage: "SHOP_ENTRY", toStage: "CUSTODY_CHECK_IN", facts: { IDENTITY_MATCHED: true }, draft: completeDraft, override: null, now: new Date("2026-08-03T15:00:00.000Z") });
    expect(decision.allowed).toBe(true);
    expect(decision.authority.allowed).toBe(true);
    const unauthorized = evaluateGovernedTransition({ actor: actor("Unassigned User"), fromStage: "SHOP_ENTRY", toStage: "CUSTODY_CHECK_IN", facts: { IDENTITY_MATCHED: true }, draft: completeDraft, override: null, now: new Date("2026-08-03T15:00:00.000Z") });
    expect(unauthorized.blockerCodes).toContain("BLK-STAGE-AUTHORITY");
  });

  it("does not let a documentation override bypass identity, authorization, QC, road-test, or release facts", () => {
    const decision = evaluateGovernedTransition({ actor: actor("General Manager", ["General Manager"]), fromStage: "QC_RELEASE_READINESS", toStage: "HANDOFF_SHOP_EXIT", facts: {}, draft: { checklist: {}, formData: {}, evidence: [] }, override: { kind: "NONCRITICAL_DOCUMENTATION", authorizedByUserId: "gm", expiresAt: null }, now: new Date("2026-08-03T15:00:00.000Z") });
    expect(decision.allowed).toBe(false);
    expect(decision.hardMissingFacts).toEqual(["QC_PASSED", "ROAD_TEST_PASSED_OR_NOT_REQUIRED", "HANDOFF_ACCEPTED"]);
  });

  it("version-controls a changed scope and requires a material finding", () => {
    expect(normalizeShopReconScopeChange({ expectedVersion: 4, idempotencyKey: "scope-1", reason: "New condition found during repair.", finding: "Corrosion extends beyond the approved repair area.", affectedRepairJobIds: ["job-1"], originalScope: { line: "A" }, proposedScope: { line: "B" } })).toMatchObject({ expectedVersion: 4, affectedRepairJobIds: ["job-1"] });
    expect(() => normalizeShopReconScopeChange({ expectedVersion: 4, idempotencyKey: "scope-2", reason: "New condition found during repair.", finding: "short", originalScope: {}, proposedScope: {} })).toThrow("New finding is required");
  });

  it("assigns the approved authorities across planning and dispatch stages", () => {
    expect(canCompleteShopReconStage(actor("Brock"), "REPAIR_PLAN_ESTIMATE").allowed).toBe(true);
    expect(canCompleteShopReconStage(actor("Eli Manager"), "AUTHORIZATION_APPROVAL").allowed).toBe(true);
    expect(canCompleteShopReconStage(actor("Brock"), "PARTS_RESOURCE_READINESS").allowed).toBe(true);
    expect(canCompleteShopReconStage(actor("Eli Manager"), "READY_FOR_DISPATCH").allowed).toBe(true);
    expect(canCompleteShopReconStage(actor("Walter Hernandez"), "ASSIGNED_STAGED").allowed).toBe(false);
  });

  it("assigns the approved authorities across execution, QC and shop exit", () => {
    expect(canCompleteShopReconStage(actor("Walter Hernandez"), "REPAIR_EXECUTION").allowed).toBe(true);
    expect(canCompleteShopReconStage(actor("Walter Hernandez"), "TECHNICIAN_COMPLETE").allowed).toBe(true);
    expect(canCompleteShopReconStage(actor("Brock"), "QC_RELEASE_READINESS").allowed).toBe(true);
    expect(canCompleteShopReconStage(actor("Walter Hernandez"), "QC_RELEASE_READINESS").allowed).toBe(false);
    expect(canCompleteShopReconStage(actor("Eli"), "HANDOFF_SHOP_EXIT").allowed).toBe(true);
  });
});
