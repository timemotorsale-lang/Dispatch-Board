import { describe, expect, it } from "vitest";

import { buildPhase8ElectricalAcknowledgementHistory } from "@/server/diagnostics/phase-8-electrical-acknowledgement-history";
import { evaluatePhase8ElectricalNextTestReadiness } from "@/server/diagnostics/phase-8-electrical-next-test-readiness";
import { PHASE_8_ELECTRICAL_PROOF_CORPUS, evaluatePhase8ElectricalProofScenario, type Phase8ElectricalProofFamily } from "@/server/diagnostics/phase-8-electrical-proof";
import { createPhase8ElectricalShadowAcknowledgement } from "@/server/diagnostics/phase-8-electrical-shadow-acknowledgement";

const environment = {
  sourceAuthorized: true,
  controlledHazards: ["ELECTRICAL_SHORT_ARC", "BATTERY_ENERGY", "ROTATING_COMPONENTS", "HOT_EXHAUST", "ROAD_TEST_RISK", "MOVING_COMPONENTS"],
  capabilities: ["DIAGNOSTICS_ADVANCED_SHADOW"],
  qualifications: ["ELECTRICAL_DIAGNOSIS_L2", "WAVEFORM_DIAGNOSIS_L2", "INTERMITTENT_DIAGNOSIS_L2"],
  tools: ["DVOM_CAT_III", "INSPECTION_LIGHT", "LOAD_TOOL", "FUSED_JUMPER_SET", "OSCILLOSCOPE", "BACKPROBE_OR_BREAKOUT_LEADS", "SYNC_PROBE", "TRANSDUCER", "SCAN_TOOL", "CASE_NOTES", "DATA_LOGGER", "THERMAL_MEASUREMENT_TOOL"],
  satisfiedPrerequisites: ["BATTERY_SAFE_ACCESS_CONFIRMED", "CIRCUIT_LOAD_SAFE_STATE", "CIRCUIT_DEENERGIZED_CONFIRMED", "PROBE_CONNECTION_SAFE_STATE", "ROTATING_COMPONENT_CLEARANCE_CONFIRMED", "TRANSDUCER_SAFE_SETUP", "CAPTURE_WINDOW_DEFINED", "HARNESS_ACCESS_SAFE_STATE"]
};

const scenario = (id: string) => PHASE_8_ELECTRICAL_PROOF_CORPUS.find((item) => item.id === id)!;

function readiness(diagnosticCaseId: string, scenarioId: string, sourceAuthorized = true) {
  const selected = scenario(scenarioId);
  return evaluatePhase8ElectricalNextTestReadiness({
    diagnosticCaseId,
    reasoningEvaluationId: `reason-${diagnosticCaseId}`,
    proofResult: evaluatePhase8ElectricalProofScenario(selected.input),
    now: "2026-07-23T03:00:00.000Z",
    vehicle: { make: "Generic", model: "Phase 8 Fixture", year: 2020, state: scenarioId.startsWith("WAVE") ? "ENGINE_RUNNING_OBSERVED" : "STATIC_SAFE" },
    environment: { ...environment, sourceAuthorized }
  });
}

function familyFor(scenarioId: string): Phase8ElectricalProofFamily {
  return scenario(scenarioId).family;
}

describe("Phase 8 electrical acknowledgement and replay history", () => {
  it("records reviewed acknowledgement without creating execution authority", () => {
    const ready = readiness("case-elec-1", "ELEC-NORMAL-001");
    const acknowledgement = createPhase8ElectricalShadowAcknowledgement({
      diagnosticCaseId: "case-elec-1",
      family: "ELECTRICAL_CIRCUIT",
      readiness: ready,
      actorUserId: "tech-1",
      decision: "REVIEWED",
      selectedTestKey: ready.recommendedTestKey,
      reason: "Reviewed the Phase 8 electrical shadow recommendation and kept it in review-only status.",
      acknowledgedAt: "2026-07-23T03:05:00.000Z"
    });

    expect(acknowledgement).toMatchObject({ family: "ELECTRICAL_CIRCUIT", decision: "REVIEWED", executionAuthorized: false, unsafeProbingAuthorized: false, roadTestAuthorized: false, dispatchAuthorized: false, repairAuthorized: false, customerPresentationAuthorized: false, pilotAuthorized: false, productionAuthorized: false });
    expect(acknowledgement.reasonCodes).toContain("PHASE_8_SHADOW_ACKNOWLEDGEMENT_NOT_EXECUTION_AUTHORITY");
    expect(acknowledgement.acknowledgementChecksum).toMatch(/^[0-9a-f]{64}$/);
  });

  it("rejects acknowledgement drift from the recommended shadow test", () => {
    expect(() => createPhase8ElectricalShadowAcknowledgement({
      diagnosticCaseId: "case-elec-1",
      family: "ELECTRICAL_CIRCUIT",
      readiness: readiness("case-elec-1", "ELEC-NORMAL-001"),
      actorUserId: "tech-1",
      decision: "REVIEWED",
      selectedTestKey: "ELECTRICAL_SAFE_STATE_VISUAL_INSPECTION",
      reason: "Attempt to acknowledge a different Phase 8 test than the recommendation.",
      acknowledgedAt: "2026-07-23T03:05:00.000Z"
    })).toThrow("must match the recommended shadow test");
  });

  it("allows blocked and escalated acknowledgement decisions only in matching states", () => {
    const blocked = readiness("case-elec-2", "ELEC-NORMAL-001", false);
    const escalated = readiness("case-wave-1", "WAVE-UNSAFE-001");

    expect(createPhase8ElectricalShadowAcknowledgement({ diagnosticCaseId: "case-elec-2", family: "ELECTRICAL_CIRCUIT", readiness: blocked, actorUserId: "tech-2", decision: "BLOCKER_ACKNOWLEDGED", reason: "Acknowledged source-rights blockers for the Phase 8 electrical shadow recommendation.", acknowledgedAt: "2026-07-23T03:07:00.000Z" })).toMatchObject({ decision: "BLOCKER_ACKNOWLEDGED", executionAuthorized: false });
    expect(createPhase8ElectricalShadowAcknowledgement({ diagnosticCaseId: "case-wave-1", family: "WAVEFORM_ANALYSIS", readiness: escalated, actorUserId: "tech-3", decision: "ESCALATION_REQUESTED", reason: "Requested escalation because the waveform shadow result crossed an excluded authority boundary.", acknowledgedAt: "2026-07-23T03:09:00.000Z" })).toMatchObject({ decision: "ESCALATION_REQUESTED", executionAuthorized: false });
    expect(() => createPhase8ElectricalShadowAcknowledgement({ diagnosticCaseId: "case-wave-1", family: "WAVEFORM_ANALYSIS", readiness: escalated, actorUserId: "tech-3", decision: "REVIEWED", selectedTestKey: "WAVEFORM_SCOPE_SETUP_CAPTURE", reason: "Attempt to review an escalated Phase 8 shadow result as ready.", acknowledgedAt: "2026-07-23T03:09:00.000Z" })).toThrow("Only ready Phase 8 shadow recommendations");
  });

  it("builds deterministic grouped replay history without execution authority", () => {
    const readyElectrical = readiness("case-elec-1", "ELEC-NORMAL-001");
    const readyIntermittent = readiness("case-int-1", "INT-NORMAL-001");
    const blockedElectrical = readiness("case-elec-2", "ELEC-NORMAL-001", false);
    const records = [
      createPhase8ElectricalShadowAcknowledgement({ diagnosticCaseId: "case-elec-2", family: familyFor("ELEC-NORMAL-001"), readiness: blockedElectrical, actorUserId: "tech-2", decision: "BLOCKER_ACKNOWLEDGED", reason: "Acknowledged source-rights blockers for the Phase 8 electrical shadow recommendation.", acknowledgedAt: "2026-07-23T03:07:00.000Z" }),
      createPhase8ElectricalShadowAcknowledgement({ diagnosticCaseId: "case-int-1", family: familyFor("INT-NORMAL-001"), readiness: readyIntermittent, actorUserId: "tech-3", decision: "REVIEWED", selectedTestKey: readyIntermittent.recommendedTestKey, reason: "Reviewed the intermittent Phase 8 shadow recommendation and kept it in review-only status.", acknowledgedAt: "2026-07-23T03:06:00.000Z" }),
      createPhase8ElectricalShadowAcknowledgement({ diagnosticCaseId: "case-elec-1", family: familyFor("ELEC-NORMAL-001"), readiness: readyElectrical, actorUserId: "tech-1", decision: "REVIEWED", selectedTestKey: readyElectrical.recommendedTestKey, reason: "Reviewed the electrical Phase 8 shadow recommendation and kept it in review-only status.", acknowledgedAt: "2026-07-23T03:05:00.000Z" })
    ];

    const first = buildPhase8ElectricalAcknowledgementHistory(records);
    const second = buildPhase8ElectricalAcknowledgementHistory([...records].reverse());

    expect(first).toMatchObject({ replayOnly: true, pilotEvidenceOnly: true, liveExecutionAuthorized: false, unsafeProbingAuthorized: false, roadTestAuthorized: false, managerReviewReady: true, replaySafe: true, recordCount: 3, caseCount: 3, executionAuthorizedCount: 0 });
    expect(first.byFamily).toMatchObject({ ELECTRICAL_CIRCUIT: 2, INTERMITTENT_FAULT: 1 });
    expect(first.byDecision).toMatchObject({ BLOCKER_ACKNOWLEDGED: 1, REVIEWED: 2 });
    expect(first.blockedCases).toEqual(["CASE-ELEC-2"]);
    expect(first.reviewedFamilies).toEqual(["ELECTRICAL_CIRCUIT", "INTERMITTENT_FAULT"]);
    expect(first.latestByCase.map((item) => item.diagnosticCaseId)).toEqual(["case-elec-1", "case-elec-2", "case-int-1"]);
    expect(first.historyChecksum).toBe(second.historyChecksum);
  });

  it("flags duplicate and authority-violating records as not replay safe", () => {
    const ready = readiness("case-elec-1", "ELEC-NORMAL-001");
    const record = createPhase8ElectricalShadowAcknowledgement({ diagnosticCaseId: "case-elec-1", family: "ELECTRICAL_CIRCUIT", readiness: ready, actorUserId: "tech-1", decision: "REVIEWED", selectedTestKey: ready.recommendedTestKey, reason: "Reviewed the electrical Phase 8 shadow recommendation and kept it in review-only status.", acknowledgedAt: "2026-07-23T03:05:00.000Z" });
    const tampered = { ...record, id: "tampered", unsafeProbingAuthorized: true };

    const history = buildPhase8ElectricalAcknowledgementHistory([record, record, tampered]);

    expect(history).toMatchObject({ replaySafe: false, managerReviewReady: false, executionAuthorizedCount: 1 });
    expect(history.validationErrors).toEqual(expect.arrayContaining([`ACK_DUPLICATE_ID:${record.id.toUpperCase()}`, `ACK_DUPLICATE_CHECKSUM:${record.id.toUpperCase()}`, "ACK_AUTHORITY_VIOLATION:TAMPERED"]));
  });
});
