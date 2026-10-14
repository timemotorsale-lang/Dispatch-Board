import { describe, expect, it } from "vitest";

import { evaluateRepairAreaIntelligence, REPAIR_AREA_INTELLIGENCE_VERSION } from "@/server/diagnostics/repair-area-intelligence";
import { flattenLaborOperationTaxonomy } from "@/server/diagnostics/labor-operation-taxonomy";

const operations = flattenLaborOperationTaxonomy();

describe("labor guide repair-area intelligence", () => {
  it("expands a door bodywork area into assembly, OEM, refinish, and fitment rules", () => {
    const result = evaluateRepairAreaIntelligence({ query: "left front door replacement", operations: [] });

    expect(result.version).toBe(REPAIR_AREA_INTELLIGENCE_VERSION);
    expect(result.confidence).toBe("HIGH");
    expect(result.activeRulePack).toMatchObject({ domain: "BODYWORK", id: "door", title: "Door Assembly" });
    expect(result.activeRulePack?.assembly.map((node) => node.label)).toEqual(expect.arrayContaining(["Door shell", "Glass and regulator", "Refinish and blend"]));
    expect(result.activeRulePack?.partRules.map((part) => part.oemPartNumber)).toEqual(expect.arrayContaining(["OEM-DOOR-SHELL-VIN-REVIEW", "OEM-DOOR-CLIP-SEAL-KIT"]));
    expect(result.activeRulePack?.refinishRules.join(" ")).toContain("Door shell replacement needs refinish review");
  });

  it("expands a mechanical transmission area with calibration and accessory rules", () => {
    const operation = operations.find((item) => item.id === "transmission-remove-install");
    if (!operation) throw new Error("Transmission operation missing.");

    const result = evaluateRepairAreaIntelligence({ query: "transmission replacement", operations: [operation] });

    expect(result.activeRulePack).toMatchObject({ domain: "MECHANICAL", id: "transmission" });
    expect(result.activeRulePack?.partRules.map((part) => part.description)).toEqual(expect.arrayContaining(["Transmission assembly", "VIN-specific transmission fluid", "Axle/output shaft seal set"]));
    expect(result.activeRulePack?.calibrationRules.join(" ")).toContain("Program/configure TCM");
    expect(result.activeRulePack?.laborRules.map((rule) => rule.operationId)).toEqual(expect.arrayContaining(["transmission-fluid-service", "transmission-programming-relearn"]));
  });

  it("keeps the same engine usable across body and mechanical rule packs", () => {
    const bumper = evaluateRepairAreaIntelligence({ query: "front bumper cover", operations: [] });
    const brakes = evaluateRepairAreaIntelligence({ query: "front brake pads and rotors", operations: [] });

    expect(bumper.activeRulePack).toMatchObject({ domain: "BODYWORK", id: "bumper" });
    expect(brakes.activeRulePack).toMatchObject({ domain: "MECHANICAL", id: "brakes" });
  });
});
