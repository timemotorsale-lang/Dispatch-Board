import { describe, expect, it } from "vitest";

import { createControlledPhase8ElectricalKnowledgePackages, createControlledPhase8ElectricalTestDefinitions } from "@/server/diagnostics/phase-8-electrical-waveform-intermittent-foundations";

const now = new Date("2026-07-23T02:30:00.000Z");
const governance = {
  authoredByUserId: "author-1",
  technicalReviewedByUserId: "technical-reviewer-1",
  rightsReviewedByUserId: "rights-reviewer-1",
  ruleSetReviewedByUserId: "rules-reviewer-1",
  approvedAt: "2026-07-23T02:00:00.000Z",
  effectiveAt: "2026-07-23T02:15:00.000Z",
  retrievedAt: "2026-07-23T01:45:00.000Z",
  rightsStatus: "AUTHORIZED" as const,
  releaseState: "SHADOW" as const
};

describe("Phase 8 electrical, waveform, and intermittent foundations", () => {
  it("creates governed knowledge packages for all three advanced electrical families", () => {
    const packages = createControlledPhase8ElectricalKnowledgePackages(governance, now);

    expect(Object.keys(packages)).toEqual(["ELECTRICAL_CIRCUIT", "WAVEFORM_ANALYSIS", "INTERMITTENT_FAULT"]);
    expect(packages.ELECTRICAL_CIRCUIT.ruleSetKey).toBe("ELECTRICAL_CIRCUIT_FOUNDATION");
    expect(packages.WAVEFORM_ANALYSIS.applicability.excludes).toContain("UNLICENSED_KNOWN_GOOD_WAVEFORM_LIBRARY");
    expect(packages.INTERMITTENT_FAULT.applicability.excludes).toContain("UNCONTROLLED_ROAD_TEST");
    expect(packages.ELECTRICAL_CIRCUIT.rules.map((rule) => rule.key)).toContain("ELECTRICAL_RULE_NO_DTC_TO_WIRE");
    expect(packages.WAVEFORM_ANALYSIS.rules.map((rule) => rule.key)).toContain("WAVEFORM_RULE_NO_KNOWN_GOOD_INVENTION");
    expect(packages.INTERMITTENT_FAULT.nodes.map((node) => node.key)).toEqual(expect.arrayContaining(["INTERMITTENT_SYSTEM", "INTERMITTENT_TRIGGER_CAPTURE", "INTERMITTENT_ESCALATION"]));
    expect(Object.values(packages).every((pkg) => pkg.checksum.match(/^[0-9a-f]{64}$/))).toBe(true);
  });

  it("creates nine initial safety-gated test definitions", () => {
    const definitions = createControlledPhase8ElectricalTestDefinitions(governance, now);
    const all = Object.values(definitions).flat();

    expect(definitions.ELECTRICAL_CIRCUIT.map((definition) => definition.definitionKey)).toEqual(["ELECTRICAL_SAFE_STATE_VISUAL_INSPECTION", "ELECTRICAL_VOLTAGE_DROP_UNDER_LOAD", "ELECTRICAL_CONTINUITY_ISOLATION_CHECK"]);
    expect(definitions.WAVEFORM_ANALYSIS.map((definition) => definition.definitionKey)).toEqual(["WAVEFORM_SCOPE_SETUP_CAPTURE", "WAVEFORM_TIMING_CORRELATION_CAPTURE", "WAVEFORM_TRANSDUCER_COMPARISON_CAPTURE"]);
    expect(definitions.INTERMITTENT_FAULT.map((definition) => definition.definitionKey)).toEqual(["INTERMITTENT_REPRODUCTION_PLAN", "INTERMITTENT_TRIGGER_DATA_CAPTURE", "INTERMITTENT_CONTROLLED_WIGGLE_THERMAL_SCREEN"]);
    expect(all).toHaveLength(9);
    expect(all.every((definition) => definition.applicability.requiresVehicleSpecificLimitsWhenInterpreting === true)).toBe(true);
    expect(definitions.ELECTRICAL_CIRCUIT[1].hazards.map((hazard) => hazard.code)).toContain("ELECTRICAL_SHORT_ARC");
    expect(definitions.WAVEFORM_ANALYSIS[1].tools.map((tool) => tool.code)).toContain("OSCILLOSCOPE");
    expect(definitions.INTERMITTENT_FAULT[1].hazards.map((hazard) => hazard.code)).toContain("ROAD_TEST_RISK");
  });

  it("fails closed without authorized source rights or independent review", () => {
    expect(() => createControlledPhase8ElectricalTestDefinitions({ ...governance, rightsStatus: "HOLD" }, now)).toThrow("authorized engineering source");
    expect(() => createControlledPhase8ElectricalKnowledgePackages({ ...governance, ruleSetReviewedByUserId: "author-1" }, now)).toThrow("independent review");
  });
});
