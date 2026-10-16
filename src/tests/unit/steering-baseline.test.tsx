import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { STEERING_BASELINE_VERSION, STEERING_COVERAGE_FAMILIES, STEERING_GROUPS, STEERING_OPERATIONS, steeringOperationForId, steeringScopeConflict } from "@/lib/steering-baseline";
import { CATALOG_ENTRIES } from "@/features/prototype/repair-explorer/catalog";
import { parsePreviewDraft } from "@/features/prototype/repair-explorer/estimate";
import { flattenLaborOperationTaxonomy } from "@/server/diagnostics/labor-operation-taxonomy";
import { evaluateEstimatePartsTaxPolicy, requiredPartsForLabor } from "@/server/diagnostics/estimate-parts-tax-policy";
import { checkEstimateControls, estimateControlsScope, initialEstimatePricing, laborOverlapGroups, validateEstimateControls, type EstimateControls } from "@/lib/labor-guide-controls";
import { SteeringOperationScope } from "@/features/diagnostics/steering-operation-scope";

const byLabel = (label: string) => STEERING_OPERATIONS.find(operation => operation.label === label)!;
const scope = flattenLaborOperationTaxonomy();

describe("light-duty steering and suspension baseline", () => {
  it("covers all 18 audited families with unique identities and explicit planning/safety scope", () => {
    expect(STEERING_COVERAGE_FAMILIES).toHaveLength(18);
    const identities = STEERING_OPERATIONS.flatMap(operation => [...new Set([operation.id, operation.previewId, ...operation.aliases])]);
    expect(new Set(identities).size).toBe(identities.length);
    for (const family of STEERING_COVERAGE_FAMILIES) expect(STEERING_OPERATIONS.some(operation => operation.family === family), family).toBe(true);
    for (const operation of STEERING_OPERATIONS) {
      expect(STEERING_GROUPS.some(group => group.id === operation.groupId)).toBe(true);
      expect(operation.hours).toBeGreaterThan(0);
      expect(operation.applicability).toBeTruthy();
      expect(operation.verification.length).toBeGreaterThan(0);
      expect(operation.conditional.length).toBeGreaterThan(0);
      const markup = renderToStaticMarkup(<SteeringOperationScope operationId={operation.id} />);
      expect(markup).toContain(STEERING_BASELINE_VERSION);
      expect(markup).toContain("unvalidated planning hours");
    }
  });

  it("uses the same new-selection hours, inclusions and pending parts in both guides", () => {
    expect(new Set(scope.map(operation => operation.id)).size).toBe(scope.length);
    for (const operation of STEERING_OPERATIONS) {
      const actual = scope.find(item => item.id === operation.id)!;
      const preview = CATALOG_ENTRIES.find(({ system, repair }) => system.id === "steering" && repair.id === operation.previewId)!.repair;
      expect(actual.hours).toBe(operation.hours);
      expect(actual.included).toEqual(preview.includes);
      expect(actual.requiredAddOns).toEqual([]);
      expect(preview.hours).toBe(operation.hours);
      expect(preview.parts).toBe(operation.parts.length ? null : 0);
      expect(preview.laborPlan?.confidence).toBe("UNVALIDATED");
      for (const part of requiredPartsForLabor(actual)) {
        expect(`part-${actual.id}-${part.key}`.length).toBeLessThanOrEqual(100);
        expect(part.partNumber).toBe("");
        expect(part.unitPriceCents).toBe(0);
        expect(part.pricingStatus).toBe("PRICE_PENDING");
      }
    }
  });

  it("recognizes legacy IDs and keeps historical saved amounts without repricing", () => {
    for (const id of ["front-right-lower-control-arm", "front-left-lower-control-arm", "front-strut-assembly", "front-ball-joint", "rear-shock-absorbers-both-sides", "rear-control-arm", "rear-sway-bar-links", "outer-tie-rod", "rack-pinion", "four-wheel-alignment"]) expect(steeringOperationForId(id), id).toBeDefined();
    expect(steeringOperationForId("steering-stabilizer-repair-replace-rear-toe-link")?.groupId).toBe("steering-rear");
    const draft = { version: 1, rate: 150, lines: [{ id: "control-arm:front-left", catalogOperationId: "control-arm", position: "front-left", label: "Replace lower control arm · front left", hours: 1.5, parts: 180 }] };
    expect(parsePreviewDraft(JSON.stringify(draft))).toEqual(draft);
    expect(steeringOperationForId("control-arm:front-left")?.hours).toBe(2.4);
  });

  it("blocks contained work and aliases without blocking opposite corners or transferred-part replacements", () => {
    const loaded = byLabel("Replace front left complete loaded strut").id;
    const completeArm = byLabel("Replace front left complete lower arm with joint and bushings").id;
    const sameCorner = [
      [loaded, `${byLabel("Replace coil spring").previewId}:front-left`],
      [loaded, `${byLabel("Replace strut mount").previewId}:front-left`],
      [loaded, byLabel("Replace front left strut assembly").id],
      [completeArm, byLabel("Replace left lower ball joint").id],
      [completeArm, "control-arm:front-left"],
      ["front-left-lower-control-arm", "control-arm:front-left"],
      ["outer-tie-rod", byLabel("Replace front left outer tie rod end").id],
      ["front-strut-assembly", byLabel("Replace front right strut assembly").id],
      ["rear-shock-absorbers-both-sides", byLabel("Replace rear left shock absorber").id],
      ["four-wheel-alignment", "wheel-alignment"],
      ["four-wheel-alignment", byLabel("Perform front-wheel alignment").id]
    ];
    for (const [left, right] of sameCorner) { expect(steeringScopeConflict(left, right), `${left} / ${right}`).toBe(true); expect(steeringScopeConflict(right, left)).toBe(true); }
    expect(steeringScopeConflict(loaded, `${byLabel("Replace coil spring").previewId}:front-right`)).toBe(false);
    expect(steeringScopeConflict("control-arm:front-left", "control-arm:front-right")).toBe(false);
    expect(steeringScopeConflict(byLabel("Replace front left strut assembly").id, `${byLabel("Replace strut mount").previewId}:front-left`)).toBe(false);
    const lines = [loaded, byLabel("Replace front left strut assembly").id].map(id => ({ id, label: id, hours: 1, parts: null }));
    expect(parsePreviewDraft(JSON.stringify({ version: 1, rate: 125, lines }))).toBeNull();
    const shared = [byLabel("Replace front left strut assembly"), byLabel("Replace strut mount")].map(operation => scope.find(item => item.id === operation.id)!);
    expect(laborOverlapGroups(shared)).toHaveLength(1);
  });

  it("does not auto-charge alignment, calibration or parts for diagnosis", () => {
    const arm = scope.find(item => item.id === "front-left-lower-control-arm")!;
    expect(evaluateEstimatePartsTaxPolicy({ labor: [arm], parts: [] }).requiredAddOnIds).toEqual([]);
    expect(requiredPartsForLabor(scope.find(item => item.id === "suspension-noise")!)).toEqual([]);
    expect(requiredPartsForLabor(scope.find(item => item.id === "front-strut-assembly")!)[0].quantity).toBe(2);
  });

  it("requires references, explicit alignment decision and matching work; invalidates changed review", () => {
    const labor = [scope.find(item => item.id === "front-left-lower-control-arm")!];
    const lines = [{ key: "labor-front-left-lower-control-arm", type: "LABOR", description: "Arm", quantity: 1, laborGuideMinutes: 144, unitPriceCents: 30000, taxable: false }];
    const controls: EstimateControls = { version: 1, pricing: { ...initialEstimatePricing, taxReference: "Reviewed jurisdiction" }, fitment: {}, overlapResolution: "", reviewedScope: "" };
    expect(() => checkEstimateControls("vehicle", lines, controls, labor, 0)).toThrow("alignment decision");
    controls.steeringReview = { configuration: "VIN front left, reviewed arm contents and support equipment", procedureReference: "Applicable service document and adjusted internal allowance", verificationPlan: "Loaded fastening, play/geometry, safe stationary checks; calibration requirements reviewed", alignmentDecision: "NOT_REQUIRED", alignmentReason: "Vehicle-specific procedure and measurement reference reviewed" };
    controls.reviewedScope = estimateControlsScope("vehicle", lines, controls);
    expect(checkEstimateControls("vehicle", lines, controls, labor, 0)).toEqual(controls);
    const changed = { ...controls, steeringReview: { ...controls.steeringReview!, alignmentDecision: "SEPARATE_LINE" as const } };
    expect(() => checkEstimateControls("vehicle", lines, changed, labor, 0)).toThrow("Add the reviewed alignment");
    const withAlignment = [...labor, scope.find(item => item.id === "four-wheel-alignment")!];
    const alignedLines = [...lines, { ...lines[0], key: "labor-four-wheel-alignment", description: "Alignment", laborGuideMinutes: 72, unitPriceCents: 15000 }];
    changed.reviewedScope = estimateControlsScope("vehicle", alignedLines, changed);
    expect(checkEstimateControls("vehicle", alignedLines, changed, withAlignment, 0)).toEqual(changed);
    expect(() => checkEstimateControls("vehicle", alignedLines, { ...changed, steeringReview: { ...changed.steeringReview, alignmentDecision: "INCLUDED_IN_SCOPE" } }, withAlignment, 0)).toThrow("conflicts with a separate alignment");
    expect(() => checkEstimateControls("vehicle", lines, { ...controls, steeringReview: { ...controls.steeringReview!, procedureReference: "New reference" } }, labor, 0)).toThrow("changed");
    expect(() => validateEstimateControls({ ...controls, steeringReview: null })).toThrow("Invalid steering review");
    expect(() => validateEstimateControls({ ...controls, steeringReview: { ...controls.steeringReview, alignmentDecision: "guess" } })).toThrow("Invalid alignment decision");
  });
});
