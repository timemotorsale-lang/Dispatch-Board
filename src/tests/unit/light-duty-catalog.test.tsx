import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "@/tests/helpers/render-with-app-router";
import { LIGHT_DUTY_CATALOG_VERSION, LIGHT_DUTY_COVERAGE, LIGHT_DUTY_IMPLEMENTATION_ORDER, LIGHT_DUTY_OPERATIONS, LIGHT_DUTY_SYSTEMS, lightDutyOperationForId, lightDutyScopeConflict } from "@/lib/light-duty-baseline";
import { LIGHT_DUTY_DIAGRAM_GROUPS } from "@/lib/light-duty-diagram-index";
import { CATALOG_ENTRIES } from "@/features/prototype/repair-explorer/catalog";
import { VISUAL_AREAS, visualRelatedGroups } from "@/features/prototype/repair-explorer/visual-catalog";
import { flattenLaborOperationTaxonomy } from "@/server/diagnostics/labor-operation-taxonomy";
import { requiredAddOnsForLabor, requiredPartsForLabor } from "@/server/diagnostics/estimate-parts-tax-policy";
import { checkEstimateControls, estimateControlsScope, initialEstimatePricing, validateEstimateControls, type EstimateControls } from "@/lib/labor-guide-controls";
import { parsePreviewDraft } from "@/features/prototype/repair-explorer/estimate";
import { LightDutyOperationScope } from "@/features/diagnostics/light-duty-operation-scope";
import { RepairCoverageReview } from "@/features/prototype/repair-explorer/repair-coverage-review";
import { RepairExplorer } from "@/features/prototype/repair-explorer/repair-explorer";
import { laborOperationForLineKey } from "@/lib/labor-catalog-selection";

const taxonomy = flattenLaborOperationTaxonomy();
const byLabel = (label: string) => {
  const operation = LIGHT_DUTY_OPERATIONS.find(item => item.label === label);
  if (!operation) throw new Error(`Missing coverage: ${label}`);
  return operation;
};

describe("ten remaining systems in six implementation groups", () => {
  it("expands exactly ten systems without altering the approved two or enabling them in the connected pilot", () => {
    expect(LIGHT_DUTY_SYSTEMS.map(system => system.id).sort()).toEqual(["maintenance", "engine", "transmission", "tires", "electrical", "hvac", "exhaust", "safety", "body", "ev"].sort());
    expect(LIGHT_DUTY_IMPLEMENTATION_ORDER.map(group => group.order)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(LIGHT_DUTY_OPERATIONS.length).toBeGreaterThan(1000);
    expect(new Set(LIGHT_DUTY_OPERATIONS.map(operation => operation.id)).size).toBe(LIGHT_DUTY_OPERATIONS.length);
    expect(new Set(taxonomy.map(operation => operation.id)).size).toBe(taxonomy.length);
    for (const row of LIGHT_DUTY_COVERAGE) {
      expect(row.operations).toBeGreaterThan(0);
      expect(row.reviewStatus).toBe("AWAITING_SHOP_REVIEW");
      expect(LIGHT_DUTY_OPERATIONS.some(operation => operation.groupId === row.groupId && operation.diagnosis), row.groupId).toBe(true);
      expect(LIGHT_DUTY_OPERATIONS.some(operation => operation.groupId === row.groupId && !operation.diagnosis), row.groupId).toBe(true);
    }
    expect(LIGHT_DUTY_OPERATIONS.some(operation => /power take-off|PTO|air brake chamber|commercial wheel seal|semi.trailer|dump truck/i.test(operation.label))).toBe(false);
  });

  it.each(LIGHT_DUTY_SYSTEMS.map(system => [system.id] as const))("shares canonical %s scope, hours, aliases and pending parts between the two guides", systemId => {
    for (const operation of LIGHT_DUTY_OPERATIONS.filter(item => item.systemId === systemId)) {
      const preview = CATALOG_ENTRIES.find(entry => entry.system.id === systemId && entry.repair.id === operation.previewId)!.repair;
      const main = taxonomy.find(item => lightDutyOperationForId(item.id)?.id === operation.id)!;
      expect(main, operation.label).toBeDefined();
      expect(main.hours).toBe(operation.hours);
      expect(preview.hours).toBe(operation.hours);
      expect(main.included).toEqual(preview.includes);
      if (operation.diagnosis) expect(["Diagnose", "Inspect", "Measure"]).toContain(main.operation);
      expect(preview.laborPlan?.confidence).toBe("UNVALIDATED");
      expect(preview.laborPlan?.basis).toBe("WORK_BREAKDOWN");
      expect(preview.laborPlan?.stages.reduce((sum, stage) => sum + stage.hours, 0)).toBeCloseTo(operation.hours);
      expect(preview.parts).toBe(operation.parts.length ? null : 0);
      expect(requiredAddOnsForLabor(main)).toEqual([]);
      for (const part of requiredPartsForLabor(main)) {
        expect(part).toMatchObject({ unitPriceCents: 0, partNumber: "", pricingStatus: "PRICE_PENDING" });
        expect(`part-${main.id}-${part.key}`.length).toBeLessThanOrEqual(100);
      }
      for (const id of [operation.id, ...operation.aliases]) expect(lightDutyOperationForId(id)?.id).toBe(operation.id);
      expect(operation.applicability).toBeTruthy();
      expect(operation.conditional.length).toBeGreaterThan(0);
      expect(operation.verification.length).toBeGreaterThan(0);
    }
  });

  it("connects every expanded subsystem to a genuine existing diagram callout without fabricating component geometry or side", () => {
    const parts = VISUAL_AREAS.flatMap(area => area.parts);
    for (const row of LIGHT_DUTY_COVERAGE) {
      const partId = Object.entries(LIGHT_DUTY_DIAGRAM_GROUPS).find(([, groups]) => groups.includes(row.groupId))?.[0];
      const part = parts.find(item => item.id === partId);
      expect(part, row.groupId).toBeDefined();
      expect(visualRelatedGroups(part!).some(group => group.id === row.groupId)).toBe(true);
    }
  });

  it("renders progressive review disclosure and deep-links to the selected system and subsystem", () => {
    const operation = byLabel("Replace engine assembly");
    const scope = renderToStaticMarkup(<LightDutyOperationScope operationId={operation.id} />);
    expect(scope).toContain(LIGHT_DUTY_CATALOG_VERSION);
    expect(scope).toContain("unvalidated planning hours");
    expect(scope).toContain("awaiting shop approval");
    const coverage = renderToStaticMarkup(<RepairCoverageReview />);
    expect(coverage).toContain("10 remaining systems");
    expect(coverage).toContain("six implementation groups");
    expect(coverage).toContain("system=engine&amp;group=engine-assembly");
    const explorer = renderToStaticMarkup(<RepairExplorer storageKey="test" initialSystemId="engine" initialGroupId="engine-assembly" />);
    expect(explorer).toContain("Replace engine assembly");
  });
});

describe("expanded catalog scope and estimate safety", () => {
  it("refuses contained work and incompatible assemblies but preserves independent corners and diagnosis", () => {
    for (const [packageLabel, componentLabel] of [["Replace engine assembly", "Replace cylinder head gasket"], ["Replace engine long block", "Replace engine short block"], ["Replace engine short block", "Replace crankshaft"], ["Replace timing belt water pump package", "Replace water pump"], ["Replace clutch kit with flywheel package", "Replace flywheel"], ["Replace automatic transmission assembly", "Overhaul automatic transmission"]]) expect(lightDutyScopeConflict(byLabel(packageLabel).id, byLabel(componentLabel).id), packageLabel).toBe(true);
    expect(lightDutyScopeConflict(byLabel("Replace front left CV axle").id, byLabel("Replace front right CV axle").id)).toBe(false);
    expect(lightDutyScopeConflict(byLabel("Replace engine assembly").id, "engine-misfire")).toBe(false);
    expect(lightDutyScopeConflict("valve-cover-gasket", byLabel("Replace valve cover gasket").id)).toBe(true);
    expect(laborOperationForLineKey(`labor-${byLabel("Replace engine assembly").id}-front-left`, taxonomy)).toBeNull();
    expect(laborOperationForLineKey(`labor-${byLabel("Replace front left CV axle").id}-front-right`, taxonomy)).toBeNull();
  });

  const review = { configuration: "Selected VIN, engine code and supplied assembly", procedureReference: "Reviewed vehicle-specific procedure and adjusted allowance", verificationPlan: "Oil pressure, leaks and commissioning limits recorded", capabilityPlan: "Qualified staff, support equipment and referral boundary reviewed" };
  const operation = byLabel("Replace engine assembly");
  const lines = [{ key: `labor-${operation.id}`, type: "LABOR", description: operation.label, quantity: 1, unitPriceCents: Math.round(operation.hours * 12500), laborGuideMinutes: operation.hours * 60 }];
  function controls(): EstimateControls {
    const value: EstimateControls = { version: 1, pricing: { ...initialEstimatePricing, taxReference: "Shop-verified jurisdiction/reference" }, fitment: {}, overlapResolution: "No duplicate scope charged", reviewedScope: "", systemReviews: { engine: review } };
    value.reviewedScope = estimateControlsScope("vehicle-1", lines, value);
    return value;
  }

  it("requires system-specific configuration, procedure, verification and capability review and invalidates changed review scope", () => {
    const labor = [{ id: operation.id, title: operation.label, hours: operation.hours, overlapGroup: operation.sharedAccess }];
    expect(() => checkEstimateControls("vehicle-1", lines, controls(), labor, 0)).not.toThrow();
    for (const field of ["configuration", "procedureReference", "verificationPlan", "capabilityPlan"] as const) {
      const value = controls(); value.systemReviews = { engine: { ...review, [field]: "" } };
      expect(() => checkEstimateControls("vehicle-1", lines, value, labor, 0)).toThrow("before presentation");
    }
    const changed = controls(); changed.systemReviews = { engine: { ...review, configuration: "Different supplied assembly" } };
    expect(() => checkEstimateControls("vehicle-1", lines, changed, labor, 0)).toThrow("Repeat");
    expect(() => validateEstimateControls({ ...controls(), systemReviews: { engine: [] } })).toThrow();
  });

  it("keeps historic amounts readable without repricing while refusing duplicate new presentation", () => {
    const old = { version: 1, rate: 150, lines: [{ id: operation.id, label: operation.label, hours: 17.3, parts: 1234 }, { id: byLabel("Replace cylinder head gasket").id, label: "Head gasket", hours: 2.3, parts: 45 }] };
    expect(parsePreviewDraft(JSON.stringify(old))).toEqual(old);
    const labor = [operation, byLabel("Replace cylinder head gasket")].map(item => ({ id: item.id, title: item.label, hours: item.hours, overlapGroup: item.sharedAccess }));
    expect(() => checkEstimateControls("vehicle-1", lines, controls(), labor, 0)).toThrow("already included");
  });
});
