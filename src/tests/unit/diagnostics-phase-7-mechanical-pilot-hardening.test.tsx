import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { Phase7MechanicalManagerReviewCard } from "@/features/diagnostics/phase-7-mechanical-manager-review-card";
import { buildPhase7MechanicalAcknowledgementHistory } from "@/server/diagnostics/phase-7-mechanical-acknowledgement-history";
import { evaluatePhase7MechanicalNextTestReadiness } from "@/server/diagnostics/phase-7-mechanical-next-test-readiness";
import { buildPhase7MechanicalManagerReviewCard, buildPhase7MechanicalPilotEvidencePackage, normalizePhase7MechanicalAcknowledgementPersistenceCommand } from "@/server/diagnostics/phase-7-mechanical-pilot-hardening";
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

function readiness(diagnosticCaseId: string, scenarioId: string) {
  const selected = scenario(scenarioId);
  return evaluatePhase7MechanicalNextTestReadiness({
    diagnosticCaseId,
    reasoningEvaluationId: `reason-${diagnosticCaseId}`,
    proofResult: evaluatePhase7MechanicalProofScenario(selected.input),
    now: "2026-07-22T22:00:00.000Z",
    vehicle: { make: "Generic", model: "Phase 7 Fixture", year: 2020, state: scenarioId.startsWith("HVAC") || scenarioId.startsWith("MISFIRE") ? "ENGINE_RUNNING_OBSERVED" : "STATIC_SAFE" },
    environment
  });
}

function ack(diagnosticCaseId: string, scenarioId: string, index: number) {
  const ready = readiness(diagnosticCaseId, scenarioId);
  return createPhase7MechanicalShadowAcknowledgement({
    diagnosticCaseId,
    family: scenario(scenarioId).family as Phase7MechanicalProofFamily,
    readiness: ready,
    actorUserId: `tech-${index}`,
    decision: "REVIEWED",
    selectedTestKey: ready.recommendedTestKey,
    reason: "Reviewed the Phase 7 mechanical shadow recommendation and kept it in review-only status.",
    acknowledgedAt: `2026-07-22T22:0${index}:00.000Z`
  });
}

describe("Phase 7 mechanical pilot evidence hardening", () => {
  it("builds a manager review card from replay-safe grouped acknowledgement history", () => {
    const history = buildPhase7MechanicalAcknowledgementHistory([
      ack("case-brake-1", "BRAKE-MEASUREMENT-001", 1),
      ack("case-hvac-1", "HVAC-NORMAL-001", 2),
      ack("case-misfire-1", "MISFIRE-NORMAL-001", 3)
    ]);
    const card = buildPhase7MechanicalManagerReviewCard(history);
    const html = renderToStaticMarkup(<Phase7MechanicalManagerReviewCard card={card} />);

    expect(card).toMatchObject({ status: "READY_FOR_MANAGER_REVIEW", metrics: { acknowledgementCount: 3, caseCount: 3, reviewedFamilyCount: 3, executionAuthorizedCount: 0 } });
    expect(card.cardChecksum).toMatch(/^[0-9a-f]{64}$/);
    expect(html).toContain("Phase 7");
    expect(html).toContain("Brake, HVAC, and misfire acknowledgement history");
    expect(html).toContain("Manager review cannot authorize live testing");
    expect(html).toContain("AI activation");
  });

  it("normalizes an append-only persistence command without creating authority", () => {
    const acknowledgement = ack("case-brake-1", "BRAKE-MEASUREMENT-001", 1);
    const command = normalizePhase7MechanicalAcknowledgementPersistenceCommand({
      expectedCaseVersion: 5,
      idempotencyKey: "persist-phase-7-mechanical-ack-1",
      reason: "Persist reviewed Phase 7 shadow acknowledgement for manager replay.",
      acknowledgement
    });

    expect(command).toMatchObject({ appendOnly: true, diagnosticCaseId: "case-brake-1", family: "BRAKE", acknowledgementChecksum: acknowledgement.acknowledgementChecksum, authorityBoundary: { liveExecutionAuthorized: false, controlledPilotAuthorized: false, productionAuthorized: false } });
    expect(command.commandChecksum).toMatch(/^[0-9a-f]{64}$/);
    expect(() => normalizePhase7MechanicalAcknowledgementPersistenceCommand({ expectedCaseVersion: 5, idempotencyKey: "bad", reason: "Attempt authority.", acknowledgement: { ...acknowledgement, pilotAuthorized: true } })).toThrow("cannot record execution authority");
  });

  it("builds a blocked pilot evidence package until representative family evidence exists", () => {
    const singleFamily = buildPhase7MechanicalPilotEvidencePackage({
      occurredAt: "2026-07-22T22:10:00.000Z",
      builtBy: "manager-1",
      acknowledgements: [ack("case-brake-1", "BRAKE-MEASUREMENT-001", 1), ack("case-brake-2", "BRAKE-NORMAL-001", 2)],
      representativeCaseMinimum: 2,
      representativeFamilyMinimum: 3
    });
    const ready = buildPhase7MechanicalPilotEvidencePackage({
      occurredAt: "2026-07-22T22:10:00.000Z",
      builtBy: "manager-1",
      acknowledgements: [ack("case-brake-1", "BRAKE-MEASUREMENT-001", 1), ack("case-hvac-1", "HVAC-NORMAL-001", 2), ack("case-misfire-1", "MISFIRE-NORMAL-001", 3)],
      representativeCaseMinimum: 3,
      representativeFamilyMinimum: 3
    });

    expect(singleFamily.status).toBe("BLOCKED");
    expect(singleFamily.holdCodes).toContain("P7M065_REPRESENTATIVE_FAMILY_COVERAGE_REQUIRED");
    expect(ready).toMatchObject({ status: "READY_FOR_PILOT_EVIDENCE_REVIEW", authorityBoundary: { controlledPilotAuthorized: false, productionAuthorized: false, aiActivationAuthorized: false } });
    expect(ready.evidenceRecords.map((record) => record.key)).toEqual(["PROOF_CORPUS", "ACKNOWLEDGEMENT_HISTORY", "FAMILY_COVERAGE", "MANAGER_REVIEW_CARD", "PERSISTENCE_BOUNDARY"]);
    expect(ready.proofSummary).toMatchObject({ scenarioCount: 15, passed: true });
    expect(ready.packageChecksum).toMatch(/^[0-9a-f]{64}$/);
  });

  it("keeps manager review blocked when acknowledgement history is missing or unsafe", () => {
    const empty = buildPhase7MechanicalManagerReviewCard(buildPhase7MechanicalAcknowledgementHistory([]));
    const good = ack("case-brake-1", "BRAKE-MEASUREMENT-001", 1);
    const tampered = { ...good, id: "tampered", productionAuthorized: true };
    const unsafe = buildPhase7MechanicalManagerReviewCard(buildPhase7MechanicalAcknowledgementHistory([good, tampered]));

    expect(empty).toMatchObject({ status: "BLOCKED", holdCodes: expect.arrayContaining(["P7M063_NO_ACKNOWLEDGEMENT_HISTORY"]) });
    expect(unsafe).toMatchObject({ status: "BLOCKED", holdCodes: expect.arrayContaining(["P7M063_ACKNOWLEDGEMENT_HISTORY_NOT_REPLAY_SAFE", "P7M063_AUTHORITY_VIOLATION_REVIEW_REQUIRED"]) });
  });
});
