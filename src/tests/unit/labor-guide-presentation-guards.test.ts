import { describe, expect, it, vi } from "vitest";
import type { AuthenticatedUser } from "@/server/auth/store";
import type { ShopPlanningRepository } from "@/server/shop-planning/repository";
import type { EnterpriseCommandRepository } from "@/server/enterprise-command/repository";
import { presentRepairEstimate } from "@/server/shop-planning/service";
import { estimateReviewScope } from "@/lib/estimate-review";
import { estimateControlsScope, initialEstimatePricing, type EstimateControls } from "@/lib/labor-guide-controls";
vi.mock("@/server/services/labor-rate-settings", () => ({ getActiveLaborRate: vi.fn().mockResolvedValue({ laborRate: 125, policyId: "default", policyVersion: 0 }) }));

const lines = [{ key: "labor-front-brake-pads-rotors", type: "LABOR", description: "Replace front pads and rotors", plannedCorrection: "Replace front pads and rotors", quantity: 1, unitPriceCents: 26250, laborGuideMinutes: 126, taxable: false, workTypeCode: "REPLACE" }, { key: "part-pads", type: "PART", description: "Pad set", plannedCorrection: "Supply pads", quantity: 1, unitPriceCents: 10000, laborGuideMinutes: 0, taxable: true, workTypeCode: "PART" }];
const actor = { id: "manager", name: "Manager", email: "manager@example.test", isActive: true, roles: ["General Manager"], duties: { all: [], direct: [], roleDefaults: [] } } as unknown as AuthenticatedUser;
function fixture() {
  const estimate = vi.fn().mockResolvedValue({ result: { id: "estimate" } });
  const deps = { enforceRollout: false, now: () => new Date("2026-10-15T10:00:00Z"), repository: { get: vi.fn().mockResolvedValue({ id: "ro", version: 1, locationId: "location", vehicle: { id: "vehicle" } }), estimate } as unknown as ShopPlanningRepository, foundationRepository: { listCapabilityGrants: vi.fn().mockResolvedValue([]) } as unknown as EnterpriseCommandRepository };
  const controls: EstimateControls = { version: 1, pricing: { ...initialEstimatePricing, taxReference: "Reviewed jurisdiction" }, fitment: { "part-pads": "Supplier confirmed vehicle and price" }, overlapResolution: "", reviewedScope: "" };
  controls.brakeReview = { configuration: "Front axle, both sides; reviewed VIN, supported equipment and technician capability", procedureReference: "Vehicle-specific service procedure and internal planning allowance reviewed", verificationPlan: "Record rotor measurements, specified hardware, leak/pedal checks and safe controlled verification" };
  controls.reviewedScope = estimateControlsScope("vehicle", lines, controls);
  const body = { lineItems: lines, taxCents: 700, taxBoundary: "Reviewed tax", idempotencyKey: "guard-test", reason: "Present reviewed work", presentationChannel: "INTERNAL", presentedAt: "2026-10-15T10:00:00Z", expiresAt: "2026-10-22T10:00:00Z", manualLaborReview: { engine: "Reviewed engine", configuration: "Reviewed brakes", source: "Staff work breakdown", limitations: "Unvalidated allowance", scope: estimateReviewScope("vehicle", lines) }, estimateControls: controls };
  return { estimate, deps, body };
}
describe("Server presentation guards", () => {
  it("requires labor review even when the client omits the field", async () => {
    const { estimate, deps, body } = fixture();
    await expect(presentRepairEstimate(actor, "ro", { ...body, manualLaborReview: undefined }, deps)).rejects.toThrow("Manual labor review is required");
    expect(estimate).not.toHaveBeenCalled();
  });
  it("requires estimate controls for recognized catalog keys even when omitted", async () => {
    const { estimate, deps, body } = fixture();
    await expect(presentRepairEstimate(actor, "ro", { ...body, estimateControls: undefined }, deps)).rejects.toThrow("review is required");
    expect(estimate).not.toHaveBeenCalled();
  });
  it("records source identity, review and verified presenter without claiming validated hours", async () => {
    const { estimate, deps, body } = fixture();
    await presentRepairEstimate(actor, "ro", body, deps);
    expect(estimate.mock.calls[0][1].assumptions).toContain('"operationId":"front-brake-pads-rotors"');
    expect(estimate.mock.calls[0][1].assumptions).toContain('"validatedStandard":false');
    expect(estimate.mock.calls[0][1].assumptions).toContain('"version":"brakes-light-duty-v1"');
    expect(estimate.mock.calls[0][1].assumptions).toContain("Presenter: Manager (manager)");
  });
  it("requires brake configuration, procedure and verification before any write", async () => {
    const { estimate, deps, body } = fixture();
    await expect(presentRepairEstimate(actor, "ro", { ...body, estimateControls: { ...body.estimateControls, brakeReview: undefined } }, deps)).rejects.toThrow("Confirm brake configuration");
    expect(estimate).not.toHaveBeenCalled();
  });
  it("rejects separately billed work contained in a brake package even with an overlap note", async () => {
    const { estimate, deps, body } = fixture();
    const duplicateScope = [...lines, { ...lines[0], key: "labor-front-pads", description: "Front pads", laborGuideMinutes: 72, unitPriceCents: 15000 }];
    const controls = { ...body.estimateControls, overlapResolution: "Staff typed an overlap note" };
    controls.reviewedScope = estimateControlsScope("vehicle", duplicateScope, controls);
    await expect(presentRepairEstimate(actor, "ro", { ...body, lineItems: duplicateScope, manualLaborReview: { ...body.manualLaborReview, scope: estimateReviewScope("vehicle", duplicateScope) }, estimateControls: controls }, deps)).rejects.toThrow("already included");
    expect(estimate).not.toHaveBeenCalled();
  });
  it("rejects fabricated tax and stale fitment reviews before any estimate write", async () => {
    const { estimate, deps, body } = fixture();
    await expect(presentRepairEstimate(actor, "ro", { ...body, taxCents: 800 }, deps)).rejects.toThrow("Tax does not match");
    await expect(presentRepairEstimate(actor, "ro", { ...body, estimateControls: { ...body.estimateControls, fitment: {} } }, deps)).rejects.toThrow("fitment");
    expect(estimate).not.toHaveBeenCalled();
  });
  it("requires a separate administrator reason for a rate override", async () => {
    const { deps, body } = fixture();
    const overrideLines = [{ ...lines[0], unitPriceCents: 31500 }, lines[1]];
    const controls = { ...body.estimateControls, pricing: { ...body.estimateControls.pricing, laborRate: 150 } };
    controls.reviewedScope = estimateControlsScope("vehicle", overrideLines, controls);
    await expect(presentRepairEstimate(actor, "ro", { ...body, lineItems: overrideLines, manualLaborReview: { ...body.manualLaborReview, scope: estimateReviewScope("vehicle", overrideLines) }, estimateControls: controls }, deps)).rejects.toThrow("override reason");
  });
});
