import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { BRAKE_BASELINE_VERSION, BRAKE_COVERAGE_FAMILIES, BRAKE_GROUPS, BRAKE_OPERATIONS, brakeOperationForId, brakeScopeConflict } from "@/lib/brake-baseline";
import { CATALOG_ENTRIES } from "@/features/prototype/repair-explorer/catalog";
import { parsePreviewDraft } from "@/features/prototype/repair-explorer/estimate";
import { flattenLaborOperationTaxonomy } from "@/server/diagnostics/labor-operation-taxonomy";
import { requiredAddOnsForLabor, requiredPartsForLabor } from "@/server/diagnostics/estimate-parts-tax-policy";
import { checkEstimateControls, estimateControlsScope, initialEstimatePricing, validateEstimateControls, type EstimateControls } from "@/lib/labor-guide-controls";
import { BrakeOperationScope } from "@/features/diagnostics/brake-operation-scope";

describe("light-duty brake coverage baseline", () => {
  it("covers all audited families with distinct identities and explicit, unvalidated scope", () => {
    expect(BRAKE_COVERAGE_FAMILIES).toHaveLength(21);
    expect(new Set(BRAKE_OPERATIONS.map(item => item.id)).size).toBe(BRAKE_OPERATIONS.length);
    expect(new Set(BRAKE_OPERATIONS.map(item => item.previewId)).size).toBe(BRAKE_OPERATIONS.length);
    for (const family of BRAKE_COVERAGE_FAMILIES) expect(BRAKE_OPERATIONS.some(item => item.family === family), family).toBe(true);
    for (const operation of BRAKE_OPERATIONS) {
      expect(BRAKE_GROUPS.some(group => group.id === operation.groupId)).toBe(true);
      expect(operation.hours).toBeGreaterThan(0);
      expect(operation.applicability).toBeTruthy();
      expect(operation.position).toBeTruthy();
      expect(operation.included.length).toBeGreaterThan(0);
      expect(operation.excluded.length).toBeGreaterThan(0);
      expect(operation.verification.length).toBeGreaterThan(0);
      const markup = renderToStaticMarkup(<BrakeOperationScope operationId={operation.id} />);
      expect(markup).toContain(BRAKE_BASELINE_VERSION);
      expect(markup).toContain("unvalidated planning hours");
    }
  });

  it("uses identical brake definitions and hours for new selections in both guides", () => {
    const taxonomy = flattenLaborOperationTaxonomy();
    expect(new Set(taxonomy.map(item => item.id)).size).toBe(taxonomy.length);
    for (const operation of BRAKE_OPERATIONS) {
      expect(taxonomy.find(item => item.id === operation.id)?.hours, operation.id).toBe(operation.hours);
      const preview = CATALOG_ENTRIES.find(({ system, repair }) => system.id === "brakes" && repair.id === operation.previewId)!.repair;
      expect(preview.hours).toBe(operation.hours);
      expect(preview.includes).toEqual(operation.included);
      expect(preview.laborPlan?.confidence).toBe("UNVALIDATED");
      expect(preview.parts).toBe(operation.parts.length ? null : 0);
      for (const part of requiredPartsForLabor(taxonomy.find(item => item.id === operation.id)!)) expect(`part-${operation.id}-${part.key}`.length).toBeLessThanOrEqual(100);
    }
  });

  it("keeps legacy aliases and historical draft amounts without silently repricing", () => {
    expect(brakeOperationForId("front-pads-rotors")?.id).toBe("front-brake-pads-rotors");
    expect(brakeOperationForId("hydraulics-repair-replace-brake-master-cylinder")?.id).toBe("brake-master-cylinder");
    expect(brakeOperationForId("wheel-speed-sensor:front-left")?.id).toBe("wheel-speed-sensor");
    const draft = { version: 1, rate: 150, lines: [{ id: "front-pads-rotors", label: "Replace front pads & rotors", hours: 2, parts: 220 }] };
    expect(parsePreviewDraft(JSON.stringify(draft))).toEqual(draft);
    expect(brakeOperationForId("front-pads-rotors")?.hours).toBe(2.1);
  });

  it("blocks included packages and incompatible alternatives, not legitimate additional work", () => {
    for (const [left, right] of [["front-pads-rotors", "front-pads"], ["front-brake-pads-rotors", "front-rotors"], ["front-rotor-machining", "front-rotors"], ["abs-hydraulic-unit", "abs-repair-perform-abs-service-bleed"], ["parking-actuator", "parking-repair-initialize-electronic-parking-brake"]]) {
      expect(brakeScopeConflict(left, right)).toBe(true);
      expect(brakeScopeConflict(right, left)).toBe(true);
    }
    expect(brakeScopeConflict("front-pads-rotors", "front-left-caliper")).toBe(false);
    expect(brakeScopeConflict("front-pads-rotors", "rear-pads-rotors")).toBe(false);
    expect(brakeScopeConflict("wheel-speed-sensor:front-left", "wheel-speed-sensor:front-right")).toBe(false);
    expect(brakeScopeConflict("wheel-speed-sensor", "wheel-speed-sensor:front-left")).toBe(true);
    const line = (id: string) => ({ id, label: id, hours: 1, parts: null });
    expect(parsePreviewDraft(JSON.stringify({ version: 1, rate: 125, lines: [line("front-pads-rotors"), line("front-pads")] }))).toBeNull();
  });

  it("does not automatically charge full fluid exchange for an included circuit bleed", () => {
    const operations = flattenLaborOperationTaxonomy();
    for (const id of ["brake-caliper-front", "front-left-caliper", "brake-master-cylinder", "abs-hydraulic-unit"]) {
      const operation = operations.find(item => item.id === id)!;
      expect(requiredAddOnsForLabor(operation)).toEqual([]);
      expect(requiredPartsForLabor(operation).every(part => part.pricingStatus === "PRICE_PENDING" && part.unitPriceCents === 0 && part.partNumber === "")).toBe(true);
    }
    expect(requiredPartsForLabor(operations.find(item => item.id === "brake-noise")!)).toEqual([]);
    expect(requiredPartsForLabor(operations.find(item => item.id === "front-brake-pads-rotors")!).map(part => part.quantity)).toEqual([1, 2]);
  });

  it("requires procedure and verification review and invalidates changed references", () => {
    const lines = [{ key: "labor-front-pads", type: "LABOR", description: "Pads", quantity: 1, unitPriceCents: 15000, laborGuideMinutes: 72, taxable: false }];
    const labor = [flattenLaborOperationTaxonomy().find(item => item.id === "front-pads")!];
    const controls: EstimateControls = { version: 1, pricing: { ...initialEstimatePricing, taxReference: "Confirmed tax jurisdiction" }, fitment: {}, overlapResolution: "", reviewedScope: "" };
    expect(() => checkEstimateControls("vehicle", lines, controls, labor, 0)).toThrow("Confirm brake configuration");
    controls.brakeReview = { configuration: "Front axle, both sides; VIN and shop capability reviewed", procedureReference: "Vehicle-specific manufacturer procedure and adjusted planning basis", verificationPlan: "Record measurements, fluid/hardware requirements and brake function checks" };
    controls.reviewedScope = estimateControlsScope("vehicle", lines, controls);
    expect(checkEstimateControls("vehicle", lines, controls, labor, 0)).toEqual(controls);
    expect(() => checkEstimateControls("vehicle", lines, { ...controls, brakeReview: { ...controls.brakeReview!, procedureReference: "Changed reference" } }, labor, 0)).toThrow("changed");
    expect(() => checkEstimateControls("vehicle", lines, controls, [...labor, flattenLaborOperationTaxonomy().find(item => item.id === "front-brake-pads-rotors")!], 0)).toThrow("already included");
    expect(() => validateEstimateControls({ ...controls, brakeReview: null })).toThrow("Invalid brake review");
    expect(() => validateEstimateControls({ ...controls, brakeReview: { ...controls.brakeReview, procedureReference: 3 } })).toThrow("Invalid brake review reference");
  });
});
