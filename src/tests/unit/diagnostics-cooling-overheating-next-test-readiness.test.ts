import { describe, expect, it } from "vitest";

import { COOLING_OVERHEATING_PROOF_CORPUS, evaluateCoolingOverheatingProofScenario } from "@/server/diagnostics/cooling-overheating-proof";
import { evaluateCoolingOverheatingNextTestReadiness } from "@/server/diagnostics/cooling-overheating-next-test-readiness";

const environment = {
  sourceAuthorized: true,
  systemCoolEnoughForSafeAccess: true,
  rotatingFanHazardControlled: true,
  toxicFluidHandlingReady: true,
  capabilities: ["DIAGNOSTICS_ADVANCED_SHADOW"],
  qualifications: ["COOLING_SYSTEM_L2"],
  tools: ["COOLING_PRESSURE_TESTER", "SCAN_TOOL", "THERMAL_MEASUREMENT_TOOL", "CALIBRATED_DVOM", "COMBUSTION_GAS_TESTER"]
};

const input = (family: string, overrides: Partial<Parameters<typeof evaluateCoolingOverheatingNextTestReadiness>[0]> = {}) => {
  const scenario = COOLING_OVERHEATING_PROOF_CORPUS.find((item) => item.family === family)!;
  return {
    diagnosticCaseId: "case-cool-1",
    reasoningEvaluationId: `reason-${family}`,
    proofResult: evaluateCoolingOverheatingProofScenario(scenario.input),
    now: "2026-07-22T20:00:00.000Z",
    vehicle: { make: "Generic", model: "Cooling Fixture", year: 2020, state: "STATIC_SAFE" },
    environment,
    ...overrides
  };
};

describe("DGN-059 cooling and overheating next-test readiness", () => {
  it("recommends a shadow-only pressure test for coolant-loss proof", () => {
    const result = evaluateCoolingOverheatingNextTestReadiness(input("COOLANT_LEAK"));

    expect(result).toMatchObject({ status: "READY", shadowOnly: true, liveExecutionAuthorized: false, recommendedTestKey: "COOL_PRESSURE_INTEGRITY" });
    expect(result.adaptiveEvaluation?.eligibleTests.map((item) => item.testKey)).toContain("COOL_PRESSURE_INTEGRITY");
    expect(result.resultChecksum).toMatch(/^[0-9a-f]{64}$/);
  });

  it("keeps misleading-code cases on measurement-first thermal evidence", () => {
    const result = evaluateCoolingOverheatingNextTestReadiness(input("MISLEADING_CODE", { vehicle: { make: "Generic", model: "Cooling Fixture", year: 2020, state: "ENGINE_RUNNING_OBSERVED" } }));

    expect(result).toMatchObject({ status: "READY", recommendedTestKey: "COOL_THERMAL_PROFILE" });
    expect(result.adaptiveEvaluation?.eligibleTests[0].factors.informationGain.normalizedValue).toBeGreaterThan(0);
  });

  it("fails closed when source rights or safe access are missing", () => {
    const result = evaluateCoolingOverheatingNextTestReadiness(input("COOLANT_LEAK", { environment: { ...environment, sourceAuthorized: false, systemCoolEnoughForSafeAccess: false } }));

    expect(result).toMatchObject({ status: "BLOCKED", recommendedTestKey: null });
    expect(result.adaptiveEvaluation?.excludedTests.flatMap((item) => item.reasonCodes)).toEqual(expect.arrayContaining(["TEST_SOURCE_NOT_AUTHORIZED", "TEST_PREREQUISITE_MISSING:SOURCE_APPLICABILITY_CONFIRMED", "TEST_HAZARD_UNCONTROLLED:HOT_PRESSURIZED_COOLANT"]));
  });

  it("does not convert unsafe proof or no-fault-found proof into a next test", () => {
    const unsafe = evaluateCoolingOverheatingNextTestReadiness(input("UNSAFE"));
    const noFaultFound = evaluateCoolingOverheatingNextTestReadiness(input("NO_FAULT_FOUND"));

    expect(unsafe).toMatchObject({ status: "ESCALATED", adaptiveEvaluation: null, recommendedTestKey: null });
    expect(noFaultFound).toMatchObject({ status: "NO_FAULT_FOUND", adaptiveEvaluation: null, recommendedTestKey: null });
  });
});
