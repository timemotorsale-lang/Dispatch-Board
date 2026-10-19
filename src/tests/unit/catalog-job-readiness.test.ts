import { describe, expect, it } from "vitest";
import { LIGHT_DUTY_OPERATIONS } from "@/lib/light-duty-baseline";
import { allocateApprovedJobParts, catalogJobRequirements, catalogLaborLineKey } from "@/lib/catalog-job-readiness";
import { lightDutyScopeProfile } from "@/lib/light-duty-scope-profiles";
import { connectedLaborSelection } from "@/lib/labor-catalog-selection";
import { flattenLaborOperationTaxonomy } from "@/server/diagnostics/labor-operation-taxonomy";
import { estimateReviewScope } from "@/lib/estimate-review";

const engine = LIGHT_DUTY_OPERATIONS.find(operation => operation.label === "Replace engine assembly")!;
const battery = LIGHT_DUTY_OPERATIONS.find(operation => operation.label === "Replace high-voltage battery assembly")!;
const engineKey = catalogLaborLineKey(engine.id), batteryKey = catalogLaborLineKey(battery.id);
const lines = [{ key: engineKey, type: "LABOR", description: engine.label }, { key: batteryKey, type: "LABOR", description: battery.label }, { key: "part-battery", type: "PART", description: "Reviewed battery", laborLineKey: batteryKey }];

describe("expanded catalog execution readiness", () => {
  it("supplies subsystem-specific scope, verification and enforceable requirements for every operation", () => {
    for (const operation of LIGHT_DUTY_OPERATIONS) {
      const scope = lightDutyScopeProfile(operation.systemId, operation.groupId, operation.label, operation.diagnosis);
      expect(scope.configurationFields.length, operation.id).toBeGreaterThan(1);
      expect(scope.verification.join(" ")).toContain(scope.configurationFields[0]);
      expect(catalogJobRequirements(catalogLaborLineKey(operation.id)).requiredSkills).toContain(`CATALOG_${operation.systemId.toUpperCase()}`);
    }
  });
  it("does not let empty caller requirements remove specialist protections", () => {
    expect(catalogJobRequirements(batteryKey, { requiredSkills: [], requiredCertifications: [], toolRequirements: [] })).toMatchObject({ partsRequired: true, requiredSkills: ["CATALOG_EV"], requiredCertifications: ["HV_PLATFORM_QUALIFIED"], bayRequirements: ["HV_CONTROLLED_AREA"] });
    expect(catalogJobRequirements(batteryKey).toolRequirements).toContain("HV_ISOLATION_EQUIPMENT");
    expect(catalogJobRequirements(batteryKey).workTypeCode).toBe("CATALOG_EV_BATTERY");
  });
  it("publishes explicit included-operation identities for reviewed packages without including diagnostic work", () => {
    const oilPan = LIGHT_DUTY_OPERATIONS.find(operation => operation.label === "Replace oil pan")!;
    const gasket = LIGHT_DUTY_OPERATIONS.find(operation => operation.label === "Replace oil pan gasket")!;
    expect(oilPan.contains).toContain(gasket.id);
    expect(engine.contains.length).toBeGreaterThan(0);
    for (const operation of LIGHT_DUTY_OPERATIONS) for (const included of operation.contains) {
      const component = LIGHT_DUTY_OPERATIONS.find(item => item.id === included)!;
      expect(component, included).toBeDefined();
      expect(component.diagnosis).toBe(false);
      expect(component.id).not.toBe(operation.id);
    }
  });
  it("assigns each demand to its own labor job, independent of line order", () => {
    for (const ordered of [lines, [...lines].reverse()]) {
      const allocation = allocateApprovedJobParts(ordered, lines.map(line => line.key), [{ id: "battery-demand", repairJobReference: batteryKey }, { id: "engine-demand", repairJobReference: engineKey }]);
      expect(allocation.get(engineKey)?.partDemandIds).toEqual(["engine-demand"]);
      expect(allocation.get(batteryKey)).toEqual({ partsRequired: true, partDemandIds: ["battery-demand"] });
    }
  });
  it("holds unreserved catalog parts even when no demand exists and rejects ambiguous or declined-part mapping", () => {
    expect(allocateApprovedJobParts(lines, lines.map(line => line.key), []).get(batteryKey)?.partsRequired).toBe(true);
    expect(() => allocateApprovedJobParts(lines, lines.map(line => line.key), [{ id: "unmapped" }])).toThrow("Map each active");
    expect(() => allocateApprovedJobParts([...lines.slice(0, 2), { key: "part-one", type: "PART", description: "Unlinked" }], [engineKey, batteryKey, "part-one"], [])).toThrow("Link every");
    expect(() => allocateApprovedJobParts(lines, [engineKey], [{ id: "declined", repairJobReference: batteryKey }])).toThrow("Map each active");
  });
  it("accepts legacy titles only when unambiguous and never steals demands from an existing job", () => {
    expect(allocateApprovedJobParts(lines, lines.map(line => line.key), [{ id: "legacy", repairJobReference: battery.label }]).get(batteryKey)?.partDemandIds).toEqual(["legacy"]);
    expect(() => allocateApprovedJobParts(lines, lines.map(line => line.key), [{ id: "late", repairJobReference: batteryKey }], [batteryKey])).toThrow("existing job");
  });
  it("allows approved expanded selection while preserving the default two-system restriction", () => {
    const catalog = flattenLaborOperationTaxonomy();
    expect(() => connectedLaborSelection({ id: engine.id }, catalog)).toThrow("not completed");
    expect(connectedLaborSelection({ id: engine.id }, catalog, ["brakes", "steering", "engine"]).hours).toBe(engine.hours);
  });
  it("invalidates exact-work review when a part is reassigned to a different job", () => {
    const part = { ...lines[2], quantity: 1, unitPriceCents: 100, laborGuideMinutes: 0 };
    expect(estimateReviewScope("vehicle", [part])).not.toBe(estimateReviewScope("vehicle", [{ ...part, laborLineKey: engineKey }]));
  });
});
