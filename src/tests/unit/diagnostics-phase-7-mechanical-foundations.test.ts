import { describe, expect, it } from "vitest";

import { createControlledPhase7MechanicalKnowledgePackages, createControlledPhase7MechanicalTestDefinitions } from "@/server/diagnostics/phase-7-mechanical-foundations";

const now = new Date("2026-07-22T21:00:00.000Z");
const governance = {
  authoredByUserId: "author-1",
  technicalReviewedByUserId: "technical-reviewer-1",
  rightsReviewedByUserId: "rights-reviewer-1",
  ruleSetReviewedByUserId: "rules-reviewer-1",
  approvedAt: "2026-07-22T20:30:00.000Z",
  effectiveAt: "2026-07-22T20:45:00.000Z",
  retrievedAt: "2026-07-22T20:00:00.000Z",
  rightsStatus: "AUTHORIZED" as const,
  releaseState: "SHADOW" as const
};

describe("Phase 7 brake, HVAC, and misfire foundations", () => {
  it("creates governed knowledge packages for all three mechanical families", () => {
    const packages = createControlledPhase7MechanicalKnowledgePackages(governance, now);

    expect(Object.keys(packages)).toEqual(["BRAKE", "HVAC", "MISFIRE_DRIVABILITY"]);
    expect(packages.BRAKE.ruleSetKey).toBe("BRAKE_NOISE_PULSATION_HYDRAULIC_FOUNDATION");
    expect(packages.HVAC.applicability.excludes).toContain("HIGH_VOLTAGE_THERMAL_MANAGEMENT");
    expect(packages.MISFIRE_DRIVABILITY.rules.map((rule) => rule.key)).toContain("MISFIRE_RULE_CODE_IS_NOT_COIL");
    expect(packages.BRAKE.nodes.map((node) => node.key)).toEqual(expect.arrayContaining(["BRAKE_SYSTEM", "HYDRAULIC_SOFT_PEDAL", "BRAKE_ESCALATION"]));
    expect(packages.HVAC.nodes.map((node) => node.key)).toContain("REFRIGERANT_LOOP");
    expect(packages.MISFIRE_DRIVABILITY.nodes.map((node) => node.key)).toContain("MECHANICAL_COMPRESSION");
    expect(Object.values(packages).every((pkg) => pkg.checksum.match(/^[0-9a-f]{64}$/))).toBe(true);
  });

  it("creates twelve initial safety-gated test definitions", () => {
    const definitions = createControlledPhase7MechanicalTestDefinitions(governance, now);
    const all = Object.values(definitions).flat();

    expect(definitions.BRAKE.map((definition) => definition.definitionKey)).toEqual(["BRAKE_FRICTION_HARDWARE_INSPECTION", "BRAKE_ROTOR_RUNOUT_MEASUREMENT", "BRAKE_HYDRAULIC_PRESSURE_INTEGRITY", "BRAKE_CONTROLLED_ROAD_TEST_SCREEN"]);
    expect(definitions.HVAC.map((definition) => definition.definitionKey)).toEqual(["HVAC_TEMP_PRESSURE_PROFILE", "HVAC_AIRFLOW_COMMAND_RESPONSE", "HVAC_HEATER_PERFORMANCE_COMPARISON", "HVAC_CONTROL_SCAN_REVIEW"]);
    expect(definitions.MISFIRE_DRIVABILITY.map((definition) => definition.definitionKey)).toEqual(["MISFIRE_SCAN_CONTEXT_REVIEW", "MISFIRE_IGNITION_CONTRIBUTION_CHECK", "MISFIRE_FUEL_AIR_DATA_REVIEW", "MISFIRE_MECHANICAL_CONTRIBUTION_COMPARISON"]);
    expect(all).toHaveLength(12);
    expect(all.every((definition) => definition.applicability.requiresVehicleSpecificLimitsWhenInterpreting === true)).toBe(true);
    expect(definitions.BRAKE[3].hazards.map((hazard) => hazard.code)).toContain("ROAD_TEST_RISK");
    expect(definitions.HVAC[0].hazards.map((hazard) => hazard.code)).toContain("REFRIGERANT_PRESSURE");
    expect(definitions.MISFIRE_DRIVABILITY[2].hazards.map((hazard) => hazard.code)).toContain("FUEL_FIRE_RISK");
  });

  it("fails closed without authorized source rights or independent review", () => {
    expect(() => createControlledPhase7MechanicalTestDefinitions({ ...governance, rightsStatus: "HOLD" }, now)).toThrow("authorized engineering source");
    expect(() => createControlledPhase7MechanicalKnowledgePackages({ ...governance, ruleSetReviewedByUserId: "author-1" }, now)).toThrow("independent review");
  });
});
