import { describe, expect, it } from "vitest";
import { checkEstimateControls, estimateControlsScope, initialEstimatePricing, laborOverlapGroups, validateEstimateControls, validateEstimatePricing, type EstimateControls } from "@/lib/labor-guide-controls";
import { diagnosticDraftPayload } from "@/lib/diagnostic-draft";

const lines = [{ key: "labor-front", type: "LABOR", description: "Front pads", quantity: 1, unitPriceCents: 25000, laborGuideMinutes: 120, taxable: false }, { key: "part-front", type: "PART", description: "Pads", quantity: 1, unitPriceCents: 10000, laborGuideMinutes: 0, taxable: true }];
const labor = [{ id: "front", title: "Pads", hours: 2, overlapGroup: "front" }, { id: "caliper", title: "Caliper", hours: 1, overlapGroup: "front" }];
function reviewed(): EstimateControls {
  const controls: EstimateControls = { version: 1, pricing: { ...initialEstimatePricing, taxReference: "Verified jurisdiction reference", reason: "Shop default rate" }, fitment: { "part-front": "Vehicle configuration and supplier price confirmed" }, overlapResolution: "Access shared; hours adjusted and remaining bleed scope retained", reviewedScope: "" };
  controls.reviewedScope = estimateControlsScope("vehicle-1", lines, controls);
  return controls;
}
describe("Estimate controls", () => {
  it("uses the requested shop defaults without claiming a statewide tax rate", () => {
    expect(initialEstimatePricing.laborRate).toBe(125);
    expect(initialEstimatePricing.taxRatePercent).toBe(7);
    expect(initialEstimatePricing.taxReference).toBe("");
  });
  it("requires vehicle-specific fitment references, tax source and overlap resolution", () => {
    expect(checkEstimateControls("vehicle-1", lines, reviewed(), labor, 700).pricing.laborRate).toBe(125);
    for (const controls of [{ ...reviewed(), fitment: {} }, { ...reviewed(), overlapResolution: "" }, { ...reviewed(), pricing: { ...reviewed().pricing, taxReference: "" } }, { ...reviewed(), pricing: { ...reviewed().pricing, taxRatePercent: null } }]) expect(() => checkEstimateControls("vehicle-1", lines, controls, labor, 700)).toThrow();
    expect(laborOverlapGroups(labor)).toHaveLength(1);
    expect(laborOverlapGroups([labor[0]])).toHaveLength(0);
  });
  it("invalidates review when vehicle, price, tax or fitment changes", () => {
    expect(() => checkEstimateControls("vehicle-2", lines, reviewed(), labor, 700)).toThrow("changed");
    expect(() => checkEstimateControls("vehicle-1", [{ ...lines[0], unitPriceCents: 25001 }, lines[1]], reviewed(), labor, 700)).toThrow("changed");
    const controls = { ...reviewed(), fitment: { "part-front": "Changed reference" } };
    expect(() => checkEstimateControls("vehicle-1", lines, controls, labor, 700)).toThrow("changed");
  });
  it("recalculates reviewed tax and labor pricing rather than trusting submitted totals", () => {
    expect(() => checkEstimateControls("vehicle-1", lines, reviewed(), labor, 800)).toThrow("Tax does not match");
    const changed = [{ ...lines[0], unitPriceCents: 1 }, lines[1]];
    const controls = reviewed(); controls.reviewedScope = estimateControlsScope("vehicle-1", changed, controls);
    expect(() => checkEstimateControls("vehicle-1", changed, controls, labor, 700)).toThrow("Labor pricing");
    const exempt = { ...reviewed(), pricing: { ...reviewed().pricing, taxRatePercent: 0 } };
    exempt.reviewedScope = estimateControlsScope("vehicle-1", lines, exempt);
    expect(checkEstimateControls("vehicle-1", lines, exempt, labor, 0).pricing.taxRatePercent).toBe(0);
  });
  it("rejects malformed settings and restores old drafts without inventing control approval", () => {
    for (const pricing of [{ ...initialEstimatePricing, laborRate: NaN }, { ...initialEstimatePricing, taxRatePercent: 31 }, { ...initialEstimatePricing, partsMarkupPercent: -1 }]) expect(() => validateEstimatePricing(pricing)).toThrow();
    expect(() => validateEstimateControls({ ...reviewed(), fitment: [] })).toThrow();
    const draft = { ro: null, manual: { customer: "", vehicle: "Truck", vin: "", concern: "Brakes" }, labor: [], parts: [], evidence: [], attempt: null };
    expect(diagnosticDraftPayload(draft).estimateControls).toBeUndefined();
    expect(diagnosticDraftPayload({ ...draft, estimateControls: reviewed() }).estimateControls).toEqual(reviewed());
  });
});
