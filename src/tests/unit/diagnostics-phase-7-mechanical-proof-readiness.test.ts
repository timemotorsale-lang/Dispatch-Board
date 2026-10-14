import { describe, expect, it } from "vitest";

import { evaluatePhase7MechanicalNextTestReadiness } from "@/server/diagnostics/phase-7-mechanical-next-test-readiness";
import { PHASE_7_MECHANICAL_PROOF_CORPUS, evaluatePhase7MechanicalProofScenario, runPhase7MechanicalProofCorpus } from "@/server/diagnostics/phase-7-mechanical-proof";

const baseEnvironment = {
  sourceAuthorized: true,
  controlledHazards: ["LIFTING_AND_WHEEL_REMOVAL", "BRAKE_DUST_HANDLING", "BRAKE_SAFETY_CRITICAL_SYSTEM", "TOXIC_FLUID_HANDLING", "REFRIGERANT_PRESSURE", "ROTATING_COMPONENTS", "HOT_COOLANT_OR_HEATER_CIRCUIT", "HOT_EXHAUST", "IGNITION_HIGH_ENERGY", "ROTATING_ENGINE_COMPONENTS"],
  capabilities: ["DIAGNOSTICS_ADVANCED_SHADOW"],
  qualifications: ["BRAKE_DIAGNOSIS_L2", "HVAC_DIAGNOSIS_L2", "DRIVABILITY_DIAGNOSIS_L2"],
  tools: ["LIFT_OR_SAFE_SUPPORT", "BRAKE_MEASUREMENT_TOOLS", "DIAL_INDICATOR", "MICROMETER", "BRAKE_PRESSURE_GAUGES", "SCAN_TOOL", "TEMPERATURE_PROBES", "HVAC_PRESSURE_GAUGES", "AIRFLOW_METER", "THERMAL_MEASUREMENT_TOOL", "OSCILLOSCOPE", "COMPRESSION_OR_PRESSURE_TRANSDUCER"],
  satisfiedPrerequisites: ["WHEEL_REMOVAL_SAFE_STATE", "BRAKE_FLUID_SAFE_HANDLING", "REFRIGERANT_SERVICE_NOT_REQUESTED", "HOT_COMPONENT_CONTACT_CONTROLLED", "IGNITION_TEST_SAFE_STATE", "ENGINE_MECHANICAL_TEST_SAFE_STATE"]
};

const scenario = (id: string) => PHASE_7_MECHANICAL_PROOF_CORPUS.find((item) => item.id === id)!;
const readinessInput = (id: string, overrides: Partial<Parameters<typeof evaluatePhase7MechanicalNextTestReadiness>[0]> = {}) => {
  const selected = scenario(id);
  return { diagnosticCaseId: `case-${id}`, reasoningEvaluationId: `reason-${id}`, proofResult: evaluatePhase7MechanicalProofScenario(selected.input), now: "2026-07-22T22:00:00.000Z", vehicle: { make: "Generic", model: "Phase 7 Fixture", year: 2020, state: "STATIC_SAFE" }, environment: baseEnvironment, ...overrides };
};

describe("Phase 7 mechanical proof and next-test readiness", () => {
  it("passes the grouped brake, HVAC, and misfire proof corpus deterministically", () => {
    const first = runPhase7MechanicalProofCorpus();
    const second = runPhase7MechanicalProofCorpus();

    expect(first).toMatchObject({ simulationOnly: true, blindedEvaluation: true, scenarioCount: 15, passed: true });
    expect(first.familyCoverage).toEqual(["BRAKE", "HVAC", "MISFIRE_DRIVABILITY"]);
    expect(first.scenarioClassCoverage).toEqual(["DEGRADED", "MEASUREMENT", "MISLEADING_CODE", "NO_FAULT_FOUND", "NORMAL", "UNSAFE"]);
    expect(first.corpusChecksum).toMatch(/^[0-9a-f]{64}$/);
    expect(first.runChecksum).toBe(second.runChecksum);
  });

  it("does not let code-only or scan-only evidence override direct measurement evidence", () => {
    expect(evaluatePhase7MechanicalProofScenario(scenario("BRAKE-MISLEADING-CODE-001").input)).toMatchObject({ disposition: "CONFIRMED", hypothesisKeys: ["HYDRAULIC_PRESSURE_FAULT"] });
    expect(evaluatePhase7MechanicalProofScenario(scenario("HVAC-MISLEADING-CODE-001").input)).toMatchObject({ disposition: "CONFIRMED", hypothesisKeys: ["TEMPERATURE_DOOR_FAULT"] });
    expect(evaluatePhase7MechanicalProofScenario(scenario("MISFIRE-MISLEADING-CODE-001").input)).toMatchObject({ disposition: "CONFIRMED", hypothesisKeys: ["FUEL_MIXTURE_FAULT"] });
  });

  it("creates shadow-only next-test recommendations for each family", () => {
    const brake = evaluatePhase7MechanicalNextTestReadiness(readinessInput("BRAKE-MEASUREMENT-001"));
    const hvac = evaluatePhase7MechanicalNextTestReadiness(readinessInput("HVAC-NORMAL-001", { vehicle: { make: "Generic", model: "Phase 7 Fixture", year: 2020, state: "ENGINE_RUNNING_OBSERVED" } }));
    const misfire = evaluatePhase7MechanicalNextTestReadiness(readinessInput("MISFIRE-NORMAL-001", { vehicle: { make: "Generic", model: "Phase 7 Fixture", year: 2020, state: "ENGINE_RUNNING_OBSERVED" } }));

    expect(brake).toMatchObject({ status: "READY", shadowOnly: true, liveExecutionAuthorized: false, recommendedTestKey: "BRAKE_ROTOR_RUNOUT_MEASUREMENT" });
    expect(hvac).toMatchObject({ status: "READY", shadowOnly: true, liveExecutionAuthorized: false, recommendedTestKey: "HVAC_TEMP_PRESSURE_PROFILE" });
    expect(misfire).toMatchObject({ status: "READY", shadowOnly: true, liveExecutionAuthorized: false, recommendedTestKey: "MISFIRE_SCAN_CONTEXT_REVIEW" });
  });

  it("fails closed when source rights or hazard controls are missing", () => {
    const blocked = evaluatePhase7MechanicalNextTestReadiness(readinessInput("BRAKE-MEASUREMENT-001", { environment: { ...baseEnvironment, sourceAuthorized: false, controlledHazards: [] } }));

    expect(blocked).toMatchObject({ status: "BLOCKED", recommendedTestKey: null });
    expect(blocked.adaptiveEvaluation?.excludedTests.flatMap((item) => item.reasonCodes)).toEqual(expect.arrayContaining(["TEST_SOURCE_NOT_AUTHORIZED", "TEST_PREREQUISITE_MISSING:SOURCE_APPLICABILITY_CONFIRMED", "TEST_HAZARD_UNCONTROLLED:LIFTING_AND_WHEEL_REMOVAL"]));
  });

  it("does not convert unsafe or no-fault-found proof into a next test", () => {
    const unsafe = evaluatePhase7MechanicalNextTestReadiness(readinessInput("BRAKE-UNSAFE-001"));
    const noFaultFound = evaluatePhase7MechanicalNextTestReadiness(readinessInput("MISFIRE-NFF-001"));

    expect(unsafe).toMatchObject({ status: "ESCALATED", adaptiveEvaluation: null, recommendedTestKey: null });
    expect(noFaultFound).toMatchObject({ status: "NO_FAULT_FOUND", adaptiveEvaluation: null, recommendedTestKey: null });
  });

  it("rejects any proof scenario not isolated as training-only", () => {
    const liveScenario = { ...PHASE_7_MECHANICAL_PROOF_CORPUS[0], trainingOnly: false as true };

    expect(() => runPhase7MechanicalProofCorpus([liveScenario])).toThrow("not isolated from live case execution");
  });
});
