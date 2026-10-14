import { describe, expect, it } from "vitest";

import { createCoolingOverheatingShadowAcknowledgement } from "@/server/diagnostics/cooling-overheating-shadow-acknowledgement";
import { evaluateCoolingOverheatingNextTestReadiness } from "@/server/diagnostics/cooling-overheating-next-test-readiness";
import { COOLING_OVERHEATING_PROOF_CORPUS, evaluateCoolingOverheatingProofScenario } from "@/server/diagnostics/cooling-overheating-proof";

const environment = {
  sourceAuthorized: true,
  systemCoolEnoughForSafeAccess: true,
  rotatingFanHazardControlled: true,
  toxicFluidHandlingReady: true,
  capabilities: ["DIAGNOSTICS_ADVANCED_SHADOW"],
  qualifications: ["COOLING_SYSTEM_L2"],
  tools: ["COOLING_PRESSURE_TESTER", "SCAN_TOOL", "THERMAL_MEASUREMENT_TOOL", "CALIBRATED_DVOM", "COMBUSTION_GAS_TESTER"]
};

function readiness(family = "COOLANT_LEAK", sourceAuthorized = true) {
  const scenario = COOLING_OVERHEATING_PROOF_CORPUS.find((item) => item.family === family)!;
  return evaluateCoolingOverheatingNextTestReadiness({
    diagnosticCaseId: "case-cool-1",
    reasoningEvaluationId: "reason-cool-1",
    proofResult: evaluateCoolingOverheatingProofScenario(scenario.input),
    now: "2026-07-22T20:00:00.000Z",
    vehicle: { make: "Generic", model: "Cooling Fixture", year: 2020, state: "STATIC_SAFE" },
    environment: { ...environment, sourceAuthorized }
  });
}

describe("DGN-061 cooling shadow acknowledgement", () => {
  it("records review acknowledgement without creating execution authority", () => {
    const ready = readiness();
    const acknowledgement = createCoolingOverheatingShadowAcknowledgement({
      diagnosticCaseId: "case-cool-1",
      readiness: ready,
      actorUserId: "tech-1",
      decision: "REVIEWED",
      selectedTestKey: ready.recommendedTestKey,
      reason: "Reviewed the cooling shadow recommendation and kept it in review-only status.",
      acknowledgedAt: "2026-07-22T20:05:00.000Z"
    });

    expect(acknowledgement).toMatchObject({ decision: "REVIEWED", executionAuthorized: false, dispatchAuthorized: false, repairAuthorized: false, customerPresentationAuthorized: false });
    expect(acknowledgement.acknowledgementChecksum).toMatch(/^[0-9a-f]{64}$/);
    expect(acknowledgement.reasonCodes).toContain("COOLING_SHADOW_ACKNOWLEDGEMENT_NOT_EXECUTION_AUTHORITY");
  });

  it("rejects acknowledgement drift from the recommended shadow test", () => {
    expect(() => createCoolingOverheatingShadowAcknowledgement({
      diagnosticCaseId: "case-cool-1",
      readiness: readiness(),
      actorUserId: "tech-1",
      decision: "REVIEWED",
      selectedTestKey: "COOL_THERMAL_PROFILE",
      reason: "Attempt to acknowledge a different test than the recommendation.",
      acknowledgedAt: "2026-07-22T20:05:00.000Z"
    })).toThrow("must match the recommended shadow test");
  });

  it("allows blocked-readiness acknowledgement but not reviewed approval", () => {
    const blocked = readiness("COOLANT_LEAK", false);

    expect(createCoolingOverheatingShadowAcknowledgement({
      diagnosticCaseId: "case-cool-1",
      readiness: blocked,
      actorUserId: "tech-1",
      decision: "BLOCKER_ACKNOWLEDGED",
      reason: "Acknowledged that the source-rights blocker prevents using the cooling shadow recommendation.",
      acknowledgedAt: "2026-07-22T20:05:00.000Z"
    })).toMatchObject({ decision: "BLOCKER_ACKNOWLEDGED", executionAuthorized: false });
    expect(() => createCoolingOverheatingShadowAcknowledgement({
      diagnosticCaseId: "case-cool-1",
      readiness: blocked,
      actorUserId: "tech-1",
      decision: "REVIEWED",
      selectedTestKey: "COOL_PRESSURE_INTEGRITY",
      reason: "Attempt to approve a blocked shadow recommendation.",
      acknowledgedAt: "2026-07-22T20:05:00.000Z"
    })).toThrow("Only ready shadow recommendations");
  });
});
