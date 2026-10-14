import { describe, expect, it } from "vitest";

import { evaluatePhase8ElectricalNextTestReadiness } from "@/server/diagnostics/phase-8-electrical-next-test-readiness";
import { PHASE_8_ELECTRICAL_PROOF_CORPUS, evaluatePhase8ElectricalProofScenario, runPhase8ElectricalProofCorpus } from "@/server/diagnostics/phase-8-electrical-proof";

const environment = {
  sourceAuthorized: true,
  controlledHazards: ["ELECTRICAL_SHORT_ARC", "BATTERY_ENERGY", "ROTATING_COMPONENTS", "HOT_EXHAUST", "ROAD_TEST_RISK", "MOVING_COMPONENTS"],
  capabilities: ["DIAGNOSTICS_ADVANCED_SHADOW"],
  qualifications: ["ELECTRICAL_DIAGNOSIS_L2", "WAVEFORM_DIAGNOSIS_L2", "INTERMITTENT_DIAGNOSIS_L2"],
  tools: ["DVOM_CAT_III", "INSPECTION_LIGHT", "LOAD_TOOL", "FUSED_JUMPER_SET", "OSCILLOSCOPE", "BACKPROBE_OR_BREAKOUT_LEADS", "SYNC_PROBE", "TRANSDUCER", "SCAN_TOOL", "CASE_NOTES", "DATA_LOGGER", "THERMAL_MEASUREMENT_TOOL"],
  satisfiedPrerequisites: ["BATTERY_SAFE_ACCESS_CONFIRMED", "CIRCUIT_LOAD_SAFE_STATE", "CIRCUIT_DEENERGIZED_CONFIRMED", "PROBE_CONNECTION_SAFE_STATE", "ROTATING_COMPONENT_CLEARANCE_CONFIRMED", "TRANSDUCER_SAFE_SETUP", "CAPTURE_WINDOW_DEFINED", "HARNESS_ACCESS_SAFE_STATE"]
};

const scenario = (id: string) => PHASE_8_ELECTRICAL_PROOF_CORPUS.find((item) => item.id === id)!;
const readinessInput = (id: string, overrides: Partial<Parameters<typeof evaluatePhase8ElectricalNextTestReadiness>[0]> = {}) => {
  const selected = scenario(id);
  return {
    diagnosticCaseId: `case-${id}`,
    reasoningEvaluationId: `reason-${id}`,
    proofResult: evaluatePhase8ElectricalProofScenario(selected.input),
    now: "2026-07-23T03:00:00.000Z",
    vehicle: { make: "Generic", model: "Phase 8 Fixture", year: 2020, state: id.startsWith("WAVE") ? "ENGINE_RUNNING_OBSERVED" : "STATIC_SAFE" },
    environment,
    ...overrides
  };
};

describe("Phase 8 electrical proof and next-test readiness", () => {
  it("passes the grouped proof corpus deterministically", () => {
    const first = runPhase8ElectricalProofCorpus();
    const second = runPhase8ElectricalProofCorpus();

    expect(first).toMatchObject({ simulationOnly: true, blindedEvaluation: true, scenarioCount: 15, passed: true });
    expect(first.familyCoverage).toEqual(["ELECTRICAL_CIRCUIT", "INTERMITTENT_FAULT", "WAVEFORM_ANALYSIS"]);
    expect(first.scenarioClassCoverage).toEqual(["DEGRADED", "MEASUREMENT", "MISLEADING_CODE", "NO_FAULT_FOUND", "NORMAL", "UNSAFE"]);
    expect(first.runChecksum).toBe(second.runChecksum);
  });

  it("does not let code, reference, or history-only evidence override direct measurement evidence", () => {
    expect(evaluatePhase8ElectricalProofScenario(scenario("ELEC-MISLEADING-CODE-001").input)).toMatchObject({ disposition: "CONFIRMED", hypothesisKeys: ["SHORT_TO_POWER_OR_GROUND"] });
    expect(evaluatePhase8ElectricalProofScenario(scenario("WAVE-MISLEADING-CODE-001").input)).toMatchObject({ disposition: "CONFIRMED", hypothesisKeys: ["PATTERN_DEVIATION"] });
    expect(evaluatePhase8ElectricalProofScenario(scenario("INT-MISLEADING-CODE-001").input)).toMatchObject({ disposition: "CONFIRMED", hypothesisKeys: ["CONTROL_STATE_INTERMITTENT"] });
  });

  it("creates shadow-only next-test recommendations for each family", () => {
    const electrical = evaluatePhase8ElectricalNextTestReadiness(readinessInput("ELEC-NORMAL-001"));
    const waveform = evaluatePhase8ElectricalNextTestReadiness(readinessInput("WAVE-NORMAL-001"));
    const intermittent = evaluatePhase8ElectricalNextTestReadiness(readinessInput("INT-NORMAL-001"));

    expect(electrical).toMatchObject({ status: "READY", shadowOnly: true, liveExecutionAuthorized: false, recommendedTestKey: "ELECTRICAL_VOLTAGE_DROP_UNDER_LOAD" });
    expect(waveform).toMatchObject({ status: "READY", shadowOnly: true, liveExecutionAuthorized: false, recommendedTestKey: "WAVEFORM_SCOPE_SETUP_CAPTURE" });
    expect(intermittent).toMatchObject({ status: "READY", shadowOnly: true, liveExecutionAuthorized: false, recommendedTestKey: "INTERMITTENT_REPRODUCTION_PLAN" });
  });

  it("fails closed when source rights or hazard controls are missing", () => {
    const blocked = evaluatePhase8ElectricalNextTestReadiness(readinessInput("ELEC-NORMAL-001", { environment: { ...environment, sourceAuthorized: false, controlledHazards: [] } }));

    expect(blocked).toMatchObject({ status: "BLOCKED", recommendedTestKey: null });
    expect(blocked.adaptiveEvaluation?.excludedTests.flatMap((item) => item.reasonCodes)).toEqual(expect.arrayContaining(["TEST_SOURCE_NOT_AUTHORIZED", "TEST_PREREQUISITE_MISSING:SOURCE_APPLICABILITY_CONFIRMED", "TEST_HAZARD_UNCONTROLLED:ELECTRICAL_SHORT_ARC"]));
  });

  it("does not convert unsafe or no-fault-found proof into a next test", () => {
    expect(evaluatePhase8ElectricalNextTestReadiness(readinessInput("WAVE-UNSAFE-001"))).toMatchObject({ status: "ESCALATED", adaptiveEvaluation: null, recommendedTestKey: null });
    expect(evaluatePhase8ElectricalNextTestReadiness(readinessInput("INT-NFF-001"))).toMatchObject({ status: "NO_FAULT_FOUND", adaptiveEvaluation: null, recommendedTestKey: null });
  });
});
