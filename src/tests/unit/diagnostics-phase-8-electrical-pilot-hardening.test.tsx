import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { Phase8ElectricalManagerReviewCard } from "@/features/diagnostics/phase-8-electrical-manager-review-card";
import { buildPhase8ElectricalAcknowledgementHistory } from "@/server/diagnostics/phase-8-electrical-acknowledgement-history";
import { evaluatePhase8ElectricalNextTestReadiness } from "@/server/diagnostics/phase-8-electrical-next-test-readiness";
import { buildPhase8ElectricalManagerReviewCard, buildPhase8ElectricalPilotEvidencePackage, normalizePhase8ElectricalAcknowledgementPersistenceCommand } from "@/server/diagnostics/phase-8-electrical-pilot-hardening";
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

function readiness(diagnosticCaseId: string, scenarioId: string) {
  const selected = scenario(scenarioId);
  return evaluatePhase8ElectricalNextTestReadiness({
    diagnosticCaseId,
    reasoningEvaluationId: `reason-${diagnosticCaseId}`,
    proofResult: evaluatePhase8ElectricalProofScenario(selected.input),
    now: "2026-07-23T03:00:00.000Z",
    vehicle: { make: "Generic", model: "Phase 8 Fixture", year: 2020, state: scenarioId.startsWith("WAVE") ? "ENGINE_RUNNING_OBSERVED" : "STATIC_SAFE" },
    environment
  });
}

function ack(diagnosticCaseId: string, scenarioId: string, index: number) {
  const ready = readiness(diagnosticCaseId, scenarioId);
  return createPhase8ElectricalShadowAcknowledgement({
    diagnosticCaseId,
    family: scenario(scenarioId).family as Phase8ElectricalProofFamily,
    readiness: ready,
    actorUserId: `tech-${index}`,
    decision: "REVIEWED",
    selectedTestKey: ready.recommendedTestKey,
    reason: "Reviewed the Phase 8 electrical shadow recommendation and kept it in review-only status.",
    acknowledgedAt: `2026-07-23T03:0${index}:00.000Z`
  });
}

describe("Phase 8 electrical pilot evidence hardening", () => {
  it("builds a manager review card from replay-safe grouped acknowledgement history", () => {
    const history = buildPhase8ElectricalAcknowledgementHistory([
      ack("case-elec-1", "ELEC-NORMAL-001", 1),
      ack("case-wave-1", "WAVE-NORMAL-001", 2),
      ack("case-int-1", "INT-NORMAL-001", 3)
    ]);
    const card = buildPhase8ElectricalManagerReviewCard(history);
    const html = renderToStaticMarkup(<Phase8ElectricalManagerReviewCard card={card} />);

    expect(card).toMatchObject({ status: "READY_FOR_MANAGER_REVIEW", metrics: { acknowledgementCount: 3, caseCount: 3, reviewedFamilyCount: 3, executionAuthorizedCount: 0 } });
    expect(card.cardChecksum).toMatch(/^[0-9a-f]{64}$/);
    expect(html).toContain("Phase 8");
    expect(html).toContain("Electrical, waveform, and intermittent acknowledgement history");
    expect(html).toContain("Manager review cannot authorize live testing");
    expect(html).toContain("unsafe probing");
  });

  it("normalizes an append-only persistence command without creating authority", () => {
    const acknowledgement = ack("case-elec-1", "ELEC-NORMAL-001", 1);
    const command = normalizePhase8ElectricalAcknowledgementPersistenceCommand({
      expectedCaseVersion: 5,
      idempotencyKey: "persist-phase-8-electrical-ack-1",
      reason: "Persist reviewed Phase 8 shadow acknowledgement for manager replay.",
      acknowledgement
    });

    expect(command).toMatchObject({ appendOnly: true, diagnosticCaseId: "case-elec-1", family: "ELECTRICAL_CIRCUIT", acknowledgementChecksum: acknowledgement.acknowledgementChecksum, authorityBoundary: { liveExecutionAuthorized: false, unsafeProbingAuthorized: false, roadTestAuthorized: false } });
    expect(command.commandChecksum).toMatch(/^[0-9a-f]{64}$/);
    expect(() => normalizePhase8ElectricalAcknowledgementPersistenceCommand({ expectedCaseVersion: 5, idempotencyKey: "bad", reason: "Attempt authority.", acknowledgement: { ...acknowledgement, roadTestAuthorized: true } })).toThrow("cannot record execution authority");
  });

  it("builds a blocked pilot evidence package until representative family evidence exists", () => {
    const singleFamily = buildPhase8ElectricalPilotEvidencePackage({ occurredAt: "2026-07-23T03:10:00.000Z", builtBy: "manager-1", acknowledgements: [ack("case-elec-1", "ELEC-NORMAL-001", 1), ack("case-elec-2", "ELEC-MEASUREMENT-001", 2)], representativeCaseMinimum: 2, representativeFamilyMinimum: 3 });
    const ready = buildPhase8ElectricalPilotEvidencePackage({ occurredAt: "2026-07-23T03:10:00.000Z", builtBy: "manager-1", acknowledgements: [ack("case-elec-1", "ELEC-NORMAL-001", 1), ack("case-wave-1", "WAVE-NORMAL-001", 2), ack("case-int-1", "INT-NORMAL-001", 3)], representativeCaseMinimum: 3, representativeFamilyMinimum: 3 });

    expect(singleFamily.status).toBe("BLOCKED");
    expect(singleFamily.holdCodes).toContain("P8E065_REPRESENTATIVE_FAMILY_COVERAGE_REQUIRED");
    expect(ready).toMatchObject({ status: "READY_FOR_PILOT_EVIDENCE_REVIEW", authorityBoundary: { controlledPilotAuthorized: false, productionAuthorized: false, aiActivationAuthorized: false } });
    expect(ready.evidenceRecords.map((record) => record.key)).toEqual(["PROOF_CORPUS", "ACKNOWLEDGEMENT_HISTORY", "FAMILY_COVERAGE", "MANAGER_REVIEW_CARD", "PERSISTENCE_BOUNDARY"]);
    expect(ready.proofSummary).toMatchObject({ scenarioCount: 15, passed: true });
    expect(ready.packageChecksum).toMatch(/^[0-9a-f]{64}$/);
  });

  it("keeps manager review blocked when acknowledgement history is missing or unsafe", () => {
    const empty = buildPhase8ElectricalManagerReviewCard(buildPhase8ElectricalAcknowledgementHistory([]));
    const good = ack("case-elec-1", "ELEC-NORMAL-001", 1);
    const tampered = { ...good, id: "tampered", unsafeProbingAuthorized: true };
    const unsafe = buildPhase8ElectricalManagerReviewCard(buildPhase8ElectricalAcknowledgementHistory([good, tampered]));

    expect(empty).toMatchObject({ status: "BLOCKED", holdCodes: expect.arrayContaining(["P8E063_NO_ACKNOWLEDGEMENT_HISTORY"]) });
    expect(unsafe).toMatchObject({ status: "BLOCKED", holdCodes: expect.arrayContaining(["P8E063_ACKNOWLEDGEMENT_HISTORY_NOT_REPLAY_SAFE", "P8E063_AUTHORITY_VIOLATION_REVIEW_REQUIRED"]) });
  });
});
