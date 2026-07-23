import { describe, expect, it } from "vitest";

import { buildPhase7MechanicalAcknowledgementHistory } from "@/server/diagnostics/phase-7-mechanical-acknowledgement-history";
import { evaluatePhase7MechanicalNextTestReadiness } from "@/server/diagnostics/phase-7-mechanical-next-test-readiness";
import { PHASE_7_MECHANICAL_PROOF_CORPUS, evaluatePhase7MechanicalProofScenario, type Phase7MechanicalProofFamily } from "@/server/diagnostics/phase-7-mechanical-proof";
import { createPhase7MechanicalShadowAcknowledgement } from "@/server/diagnostics/phase-7-mechanical-shadow-acknowledgement";

const environment = {
  sourceAuthorized: true,
  controlledHazards: ["LIFTING_AND_WHEEL_REMOVAL", "BRAKE_DUST_HANDLING", "BRAKE_SAFETY_CRITICAL_SYSTEM", "TOXIC_FLUID_HANDLING", "REFRIGERANT_PRESSURE", "ROTATING_COMPONENTS", "HOT_COOLANT_OR_HEATER_CIRCUIT", "HOT_EXHAUST", "IGNITION_HIGH_ENERGY", "ROTATING_ENGINE_COMPONENTS"],
  capabilities: ["DIAGNOSTICS_ADVANCED_SHADOW"],
  qualifications: ["BRAKE_DIAGNOSIS_L2", "HVAC_DIAGNOSIS_L2", "DRIVABILITY_DIAGNOSIS_L2"],
  tools: ["LIFT_OR_SAFE_SUPPORT", "BRAKE_MEASUREMENT_TOOLS", "DIAL_INDICATOR", "MICROMETER", "BRAKE_PRESSURE_GAUGES", "SCAN_TOOL", "TEMPERATURE_PROBES", "HVAC_PRESSURE_GAUGES", "AIRFLOW_METER", "THERMAL_MEASUREMENT_TOOL", "OSCILLOSCOPE", "COMPRESSION_OR_PRESSURE_TRANSDUCER"],
  satisfiedPrerequisites: ["WHEEL_REMOVAL_SAFE_STATE", "BRAKE_FLUID_SAFE_HANDLING", "REFRIGERANT_SERVICE_NOT_REQUESTED", "HOT_COMPONENT_CONTACT_CONTROLLED", "IGNITION_TEST_SAFE_STATE", "ENGINE_MECHANICAL_TEST_SAFE_STATE"]
};

const scenario = (id: string) => PHASE_7_MECHANICAL_PROOF_CORPUS.find((item) => item.id === id)!;

function readiness(diagnosticCaseId: string, scenarioId: string, sourceAuthorized = true) {
  const selected = scenario(scenarioId);
  return evaluatePhase7MechanicalNextTestReadiness({
    diagnosticCaseId,
    reasoningEvaluationId: `reason-${diagnosticCaseId}`,
    proofResult: evaluatePhase7MechanicalProofScenario(selected.input),
    now: "2026-07-22T22:00:00.000Z",
    vehicle: { make: "Generic", model: "Phase 7 Fixture", year: 2020, state: scenarioId.startsWith("HVAC") || scenarioId.startsWith("MISFIRE") ? "ENGINE_RUNNING_OBSERVED" : "STATIC_SAFE" },
    environment: { ...environment, sourceAuthorized }
  });
}

function familyFor(scenarioId: string): Phase7MechanicalProofFamily {
  return scenario(scenarioId).family;
}

describe("Phase 7 mechanical acknowledgement and replay history", () => {
  it("records reviewed acknowledgement without creating execution authority", () => {
    const ready = readiness("case-brake-1", "BRAKE-MEASUREMENT-001");
    const acknowledgement = createPhase7MechanicalShadowAcknowledgement({
      diagnosticCaseId: "case-brake-1",
      family: "BRAKE",
      readiness: ready,
      actorUserId: "tech-1",
      decision: "REVIEWED",
      selectedTestKey: ready.recommendedTestKey,
      reason: "Reviewed the brake Phase 7 shadow recommendation and kept it in review-only status.",
      acknowledgedAt: "2026-07-22T22:05:00.000Z"
    });

    expect(acknowledgement).toMatchObject({ family: "BRAKE", decision: "REVIEWED", executionAuthorized: false, dispatchAuthorized: false, repairAuthorized: false, customerPresentationAuthorized: false, pilotAuthorized: false, productionAuthorized: false });
    expect(acknowledgement.reasonCodes).toContain("PHASE_7_SHADOW_ACKNOWLEDGEMENT_NOT_EXECUTION_AUTHORITY");
    expect(acknowledgement.acknowledgementChecksum).toMatch(/^[0-9a-f]{64}$/);
  });

  it("rejects acknowledgement drift from the recommended shadow test", () => {
    expect(() => createPhase7MechanicalShadowAcknowledgement({
      diagnosticCaseId: "case-brake-1",
      family: "BRAKE",
      readiness: readiness("case-brake-1", "BRAKE-MEASUREMENT-001"),
      actorUserId: "tech-1",
      decision: "REVIEWED",
      selectedTestKey: "BRAKE_FRICTION_HARDWARE_INSPECTION",
      reason: "Attempt to acknowledge a different Phase 7 test than the recommendation.",
      acknowledgedAt: "2026-07-22T22:05:00.000Z"
    })).toThrow("must match the recommended shadow test");
  });

  it("allows blocked and escalated acknowledgement decisions only in matching states", () => {
    const blocked = readiness("case-brake-2", "BRAKE-MEASUREMENT-001", false);
    const escalated = readiness("case-hvac-1", "HVAC-UNSAFE-001");

    expect(createPhase7MechanicalShadowAcknowledgement({
      diagnosticCaseId: "case-brake-2",
      family: "BRAKE",
      readiness: blocked,
      actorUserId: "tech-2",
      decision: "BLOCKER_ACKNOWLEDGED",
      reason: "Acknowledged source-rights blockers for the Phase 7 brake shadow recommendation.",
      acknowledgedAt: "2026-07-22T22:07:00.000Z"
    })).toMatchObject({ decision: "BLOCKER_ACKNOWLEDGED", executionAuthorized: false });
    expect(createPhase7MechanicalShadowAcknowledgement({
      diagnosticCaseId: "case-hvac-1",
      family: "HVAC",
      readiness: escalated,
      actorUserId: "tech-3",
      decision: "ESCALATION_REQUESTED",
      reason: "Requested escalation because the HVAC shadow result crossed an excluded authority boundary.",
      acknowledgedAt: "2026-07-22T22:09:00.000Z"
    })).toMatchObject({ decision: "ESCALATION_REQUESTED", executionAuthorized: false });
    expect(() => createPhase7MechanicalShadowAcknowledgement({
      diagnosticCaseId: "case-hvac-1",
      family: "HVAC",
      readiness: escalated,
      actorUserId: "tech-3",
      decision: "REVIEWED",
      selectedTestKey: "HVAC_TEMP_PRESSURE_PROFILE",
      reason: "Attempt to review an escalated Phase 7 shadow result as ready.",
      acknowledgedAt: "2026-07-22T22:09:00.000Z"
    })).toThrow("Only ready Phase 7 shadow recommendations");
  });

  it("builds deterministic grouped replay history without execution authority", () => {
    const readyBrake = readiness("case-brake-1", "BRAKE-MEASUREMENT-001");
    const readyMisfire = readiness("case-misfire-1", "MISFIRE-NORMAL-001");
    const blockedBrake = readiness("case-brake-2", "BRAKE-MEASUREMENT-001", false);
    const records = [
      createPhase7MechanicalShadowAcknowledgement({ diagnosticCaseId: "case-brake-2", family: familyFor("BRAKE-MEASUREMENT-001"), readiness: blockedBrake, actorUserId: "tech-2", decision: "BLOCKER_ACKNOWLEDGED", reason: "Acknowledged source-rights blockers for the Phase 7 brake shadow recommendation.", acknowledgedAt: "2026-07-22T22:07:00.000Z" }),
      createPhase7MechanicalShadowAcknowledgement({ diagnosticCaseId: "case-misfire-1", family: familyFor("MISFIRE-NORMAL-001"), readiness: readyMisfire, actorUserId: "tech-3", decision: "REVIEWED", selectedTestKey: readyMisfire.recommendedTestKey, reason: "Reviewed the misfire Phase 7 shadow recommendation and kept it in review-only status.", acknowledgedAt: "2026-07-22T22:06:00.000Z" }),
      createPhase7MechanicalShadowAcknowledgement({ diagnosticCaseId: "case-brake-1", family: familyFor("BRAKE-MEASUREMENT-001"), readiness: readyBrake, actorUserId: "tech-1", decision: "REVIEWED", selectedTestKey: readyBrake.recommendedTestKey, reason: "Reviewed the brake Phase 7 shadow recommendation and kept it in review-only status.", acknowledgedAt: "2026-07-22T22:05:00.000Z" })
    ];

    const first = buildPhase7MechanicalAcknowledgementHistory(records);
    const second = buildPhase7MechanicalAcknowledgementHistory([...records].reverse());

    expect(first).toMatchObject({ replayOnly: true, pilotEvidenceOnly: true, liveExecutionAuthorized: false, managerReviewReady: true, replaySafe: true, recordCount: 3, caseCount: 3, executionAuthorizedCount: 0 });
    expect(first.byFamily).toMatchObject({ BRAKE: 2, MISFIRE_DRIVABILITY: 1 });
    expect(first.byDecision).toMatchObject({ BLOCKER_ACKNOWLEDGED: 1, REVIEWED: 2 });
    expect(first.blockedCases).toEqual(["CASE-BRAKE-2"]);
    expect(first.reviewedFamilies).toEqual(["BRAKE", "MISFIRE_DRIVABILITY"]);
    expect(first.latestByCase.map((item) => item.diagnosticCaseId)).toEqual(["case-brake-1", "case-brake-2", "case-misfire-1"]);
    expect(first.historyChecksum).toBe(second.historyChecksum);
  });

  it("flags duplicate and authority-violating records as not replay safe", () => {
    const ready = readiness("case-brake-1", "BRAKE-MEASUREMENT-001");
    const record = createPhase7MechanicalShadowAcknowledgement({ diagnosticCaseId: "case-brake-1", family: "BRAKE", readiness: ready, actorUserId: "tech-1", decision: "REVIEWED", selectedTestKey: ready.recommendedTestKey, reason: "Reviewed the brake Phase 7 shadow recommendation and kept it in review-only status.", acknowledgedAt: "2026-07-22T22:05:00.000Z" });
    const tampered = { ...record, id: "tampered", pilotAuthorized: true };

    const history = buildPhase7MechanicalAcknowledgementHistory([record, record, tampered]);

    expect(history).toMatchObject({ replaySafe: false, managerReviewReady: false, executionAuthorizedCount: 1 });
    expect(history.validationErrors).toEqual(expect.arrayContaining([`ACK_DUPLICATE_ID:${record.id.toUpperCase()}`, `ACK_DUPLICATE_CHECKSUM:${record.id.toUpperCase()}`, "ACK_AUTHORITY_VIOLATION:TAMPERED"]));
  });
});
