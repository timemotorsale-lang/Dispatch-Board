import { describe, expect, it, vi } from "vitest";
import type { AuthenticatedUser } from "@/server/auth/store";
import type { ShopPlanningRepository } from "@/server/shop-planning/repository";
import type { EnterpriseCommandRepository } from "@/server/enterprise-command/repository";
import { presentRepairEstimate } from "@/server/shop-planning/service";
import { estimateReviewScope } from "@/lib/estimate-review";
import { estimateControlsScope, initialEstimatePricing, type EstimateControls } from "@/lib/labor-guide-controls";
import { STEERING_OPERATIONS } from "@/lib/steering-baseline";
import { LIGHT_DUTY_CATALOG_VERSION, LIGHT_DUTY_OPERATIONS, LIGHT_DUTY_SYSTEMS, lightDutyOperationForId } from "@/lib/light-duty-baseline";
import { flattenLaborOperationTaxonomy } from "@/server/diagnostics/labor-operation-taxonomy";
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
  it.each(LIGHT_DUTY_SYSTEMS.map(system => [system.id] as const))("requires %s references before any estimate write and records unvalidated provenance", async systemId => {
    const { estimate, deps, body } = fixture();
    const canonical = LIGHT_DUTY_OPERATIONS.find(operation => operation.systemId === systemId && !operation.diagnosis)!;
    const operation = flattenLaborOperationTaxonomy().find(item => lightDutyOperationForId(item.id)?.id === canonical.id)!;
    const selectedLines = [{ ...lines[0], key: `labor-${operation.id}`, description: operation.title, laborGuideMinutes: Math.round(operation.hours * 60), unitPriceCents: Math.round(operation.hours * 12500) }];
    const controls: EstimateControls = { ...body.estimateControls, fitment: {}, brakeReview: undefined, reviewedScope: "" };
    const input = { ...body, lineItems: selectedLines, taxCents: 0, estimateControls: controls, manualLaborReview: { ...body.manualLaborReview, scope: estimateReviewScope("vehicle", selectedLines) } };
    await expect(presentRepairEstimate(actor, "ro", input, deps)).rejects.toThrow(`Confirm ${systemId}`);
    expect(estimate).not.toHaveBeenCalled();
    controls.systemReviews = { [systemId]: { configuration: "Selected VIN, unit, quantity and supplied contents", procedureReference: "Reviewed applicable manufacturer procedure and provisional hours", verificationPlan: "Applicable limits, materials and post-repair checks", capabilityPlan: "Staff capability and referral boundary reviewed" } };
    controls.reviewedScope = estimateControlsScope("vehicle", selectedLines, controls);
    await presentRepairEstimate(actor, "ro", input, deps);
    expect(estimate).toHaveBeenCalledTimes(1);
    expect(estimate.mock.calls[0][1].assumptions).toContain(`"version":"${LIGHT_DUTY_CATALOG_VERSION}"`);
    expect(estimate.mock.calls[0][1].assumptions).toContain('"validatedStandard":false');
  });
  it("requires steering review and records its baseline without inventing verified hours", async () => {
    const { estimate, deps, body } = fixture();
    const steeringLines = [{ ...lines[0], key: "labor-front-left-lower-control-arm", description: "Front left lower control arm", laborGuideMinutes: 144, unitPriceCents: 30000 }];
    const controls: EstimateControls = { ...body.estimateControls, fitment: {}, brakeReview: undefined, reviewedScope: "" };
    const input = { ...body, lineItems: steeringLines, taxCents: 0, estimateControls: controls, manualLaborReview: { ...body.manualLaborReview, scope: estimateReviewScope("vehicle", steeringLines) } };
    await expect(presentRepairEstimate(actor, "ro", input, deps)).rejects.toThrow("alignment decision");
    expect(estimate).not.toHaveBeenCalled();
    controls.steeringReview = { configuration: "VIN/front left arm and available equipment reviewed", procedureReference: "Vehicle procedure and internal planning scope", verificationPlan: "Measurements, loaded fastening and safe verification; no execution sign-off implied", alignmentDecision: "INCLUDED_IN_SCOPE", alignmentReason: "Alignment included in manually reviewed scope and minutes; reference recorded" };
    controls.reviewedScope = estimateControlsScope("vehicle", steeringLines, controls);
    await presentRepairEstimate(actor, "ro", input, deps);
    expect(estimate.mock.calls[0][1].assumptions).toContain('"version":"steering-light-duty-v1"');
    expect(estimate.mock.calls[0][1].assumptions).toContain('"validatedStandard":false');
  });
  it("rejects steering package duplicates before persistence despite an overlap note", async () => {
    const { estimate, deps, body } = fixture();
    const loaded = STEERING_OPERATIONS.find(operation => operation.label === "Replace front left complete loaded strut")!;
    const bare = STEERING_OPERATIONS.find(operation => operation.label === "Replace front left strut assembly")!;
    const duplicateLines = [loaded, bare].map(operation => ({ ...lines[0], key: `labor-${operation.id}`, description: operation.label, laborGuideMinutes: 102, unitPriceCents: 21250 }));
    const controls: EstimateControls = { ...body.estimateControls, fitment: {}, brakeReview: undefined, overlapResolution: "Typed note cannot allow duplicate scope", steeringReview: { configuration: "Front left reviewed", procedureReference: "Reviewed procedure", verificationPlan: "Reviewed verification plan", alignmentDecision: "NOT_REQUIRED", alignmentReason: "Reviewed configuration reference" } };
    controls.reviewedScope = estimateControlsScope("vehicle", duplicateLines, controls);
    await expect(presentRepairEstimate(actor, "ro", { ...body, lineItems: duplicateLines, taxCents: 0, estimateControls: controls, manualLaborReview: { ...body.manualLaborReview, scope: estimateReviewScope("vehicle", duplicateLines) } }, deps)).rejects.toThrow("already included");
    expect(estimate).not.toHaveBeenCalled();
  });
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
