import { describe, expect, it } from "vitest";

import { createControlledCoolingOverheatingKnowledgePackage, createControlledCoolingOverheatingTestDefinitions } from "@/server/diagnostics/cooling-overheating-knowledge";

const now = new Date("2026-07-22T20:00:00.000Z");
const governance = {
  authoredByUserId: "author-1",
  technicalReviewedByUserId: "technical-reviewer-1",
  rightsReviewedByUserId: "rights-reviewer-1",
  ruleSetReviewedByUserId: "rules-reviewer-1",
  approvedAt: "2026-07-22T19:00:00.000Z",
  effectiveAt: "2026-07-22T19:30:00.000Z",
  retrievedAt: "2026-07-22T18:00:00.000Z",
  rightsStatus: "AUTHORIZED" as const,
  releaseState: "SHADOW" as const
};

describe("DG-G7 cooling and overheating foundation", () => {
  it("creates a governed cooling and overheating knowledge package", () => {
    const pkg = createControlledCoolingOverheatingKnowledgePackage(governance, now);

    expect(pkg.ruleSetKey).toBe("COOLING_OVERHEATING_FOUNDATION");
    expect(pkg.releaseState).toBe("SHADOW");
    expect(pkg.nodes.map((node) => node.key)).toEqual(expect.arrayContaining([
      "COOLING_SYSTEM",
      "PRESSURE_CONTROL",
      "FAN_CONTROL",
      "COMBUSTION_GAS_INTRUSION",
      "HIGH_VOLTAGE_THERMAL_ESCALATION"
    ]));
    expect(pkg.testDefinitionKeys).toEqual([
      "COOL_PRESSURE_INTEGRITY",
      "COOL_THERMAL_PROFILE",
      "COOL_FAN_COMMAND_RESPONSE",
      "COOL_COMBUSTION_GAS_SCREEN",
      "COOL_POST_REPAIR_VERIFICATION"
    ]);
    expect(pkg.applicability.excludes).toContain("HIGH_VOLTAGE_THERMAL_MANAGEMENT");
    expect(pkg.checksum).toMatch(/^[0-9a-f]{64}$/);
  });

  it("creates the initial safety-gated test definition seed", () => {
    const definitions = createControlledCoolingOverheatingTestDefinitions(governance, now);

    expect(definitions).toHaveLength(5);
    expect(definitions.map((definition) => definition.definitionKey)).toEqual([
      "COOL_PRESSURE_INTEGRITY",
      "COOL_THERMAL_PROFILE",
      "COOL_FAN_COMMAND_RESPONSE",
      "COOL_COMBUSTION_GAS_SCREEN",
      "COOL_POST_REPAIR_VERIFICATION"
    ]);
    expect(definitions.every((definition) => definition.riskTier === "R2")).toBe(true);
    expect(definitions[0].hazards.map((hazard) => hazard.code)).toContain("HOT_PRESSURIZED_COOLANT");
    expect(definitions[1].requiredEvidence.map((item) => item.code)).toContain("COOLANT_TEMPERATURE_PROFILE");
    expect(definitions.every((definition) => definition.checksum.match(/^[0-9a-f]{64}$/))).toBe(true);
  });

  it("refuses executable tests without authorized source rights", () => {
    expect(() => createControlledCoolingOverheatingTestDefinitions({
      ...governance,
      rightsStatus: "HOLD"
    }, now)).toThrow("authorized engineering source");
  });

  it("requires independent review before shadow release", () => {
    expect(() => createControlledCoolingOverheatingKnowledgePackage({
      ...governance,
      ruleSetReviewedByUserId: "author-1"
    }, now)).toThrow("independent review");
  });
});
