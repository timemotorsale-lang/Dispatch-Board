import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { Phase8ReadinessGateCard } from "@/features/diagnostics/phase-8-readiness-gate-card";
import { evaluatePhase8ElectricalNextTestReadiness } from "@/server/diagnostics/phase-8-electrical-next-test-readiness";
import { buildPhase8ElectricalPilotEvidencePackage } from "@/server/diagnostics/phase-8-electrical-pilot-hardening";
import { PHASE_8_ELECTRICAL_PROOF_CORPUS, evaluatePhase8ElectricalProofScenario, type Phase8ElectricalProofFamily } from "@/server/diagnostics/phase-8-electrical-proof";
import { createPhase8ElectricalShadowAcknowledgement } from "@/server/diagnostics/phase-8-electrical-shadow-acknowledgement";
import { evaluateDiagnosticPhase8ReadinessGate } from "@/server/diagnostics/phase-8-readiness-gate";

const environment = {
  sourceAuthorized: true,
  controlledHazards: ["ELECTRICAL_SHORT_ARC", "BATTERY_ENERGY", "ROTATING_COMPONENTS", "HOT_EXHAUST", "ROAD_TEST_RISK", "MOVING_COMPONENTS"],
  capabilities: ["DIAGNOSTICS_ADVANCED_SHADOW"],
  qualifications: ["ELECTRICAL_DIAGNOSIS_L2", "WAVEFORM_DIAGNOSIS_L2", "INTERMITTENT_DIAGNOSIS_L2"],
  tools: ["DVOM_CAT_III", "INSPECTION_LIGHT", "LOAD_TOOL", "FUSED_JUMPER_SET", "OSCILLOSCOPE", "BACKPROBE_OR_BREAKOUT_LEADS", "SYNC_PROBE", "TRANSDUCER", "SCAN_TOOL", "CASE_NOTES", "DATA_LOGGER", "THERMAL_MEASUREMENT_TOOL"],
  satisfiedPrerequisites: ["BATTERY_SAFE_ACCESS_CONFIRMED", "CIRCUIT_LOAD_SAFE_STATE", "CIRCUIT_DEENERGIZED_CONFIRMED", "PROBE_CONNECTION_SAFE_STATE", "ROTATING_COMPONENT_CLEARANCE_CONFIRMED", "TRANSDUCER_SAFE_SETUP", "CAPTURE_WINDOW_DEFINED", "HARNESS_ACCESS_SAFE_STATE"]
};

const scenario = (id: string) => PHASE_8_ELECTRICAL_PROOF_CORPUS.find((item) => item.id === id)!;

function ack(diagnosticCaseId: string, scenarioId: string, index: number) {
  const selected = scenario(scenarioId);
  const readiness = evaluatePhase8ElectricalNextTestReadiness({
    diagnosticCaseId,
    reasoningEvaluationId: `reason-${diagnosticCaseId}`,
    proofResult: evaluatePhase8ElectricalProofScenario(selected.input),
    now: "2026-07-23T03:00:00.000Z",
    vehicle: { make: "Generic", model: "Phase 8 Fixture", year: 2020, state: scenarioId.startsWith("WAVE") ? "ENGINE_RUNNING_OBSERVED" : "STATIC_SAFE" },
    environment
  });
  return createPhase8ElectricalShadowAcknowledgement({ diagnosticCaseId, family: selected.family as Phase8ElectricalProofFamily, readiness, actorUserId: `tech-${index}`, decision: "REVIEWED", selectedTestKey: readiness.recommendedTestKey, reason: "Reviewed the Phase 8 electrical shadow recommendation and kept it in review-only status.", acknowledgedAt: `2026-07-23T03:1${index}:00.000Z` });
}

function readyPackage() {
  return buildPhase8ElectricalPilotEvidencePackage({ occurredAt: "2026-07-23T03:30:00.000Z", builtBy: "manager-1", acknowledgements: [ack("case-elec-1", "ELEC-NORMAL-001", 1), ack("case-wave-1", "WAVE-NORMAL-001", 2), ack("case-int-1", "INT-NORMAL-001", 3)], representativeCaseMinimum: 3, representativeFamilyMinimum: 3 });
}

function gate(overrides: Partial<Parameters<typeof evaluateDiagnosticPhase8ReadinessGate>[0]> = {}) {
  return evaluateDiagnosticPhase8ReadinessGate({
    occurredAt: "2026-07-23T03:40:00.000Z",
    requestedMode: "CONTROLLED_PHASE_8_PILOT",
    requestedBy: "manager-1",
    phase8Evidence: readyPackage(),
    licensedSourceActivationComplete: true,
    runtimeWorkflowAcceptanceComplete: true,
    roleTrainingComplete: true,
    monitoringPlanDocumented: true,
    rollbackPlanDocumented: true,
    pauseControlVerified: true,
    acceptanceSignedBy: ["service-manager", "lead-technician"],
    unresolvedRisks: [{ riskId: "phase8-risk-1", disposition: "MITIGATED", owner: "manager-1", note: "Phase 8 shadow pilot risk has monitoring and pause controls documented." }],
    ...overrides
  });
}

describe("DG-G9 Phase 8 readiness gate", () => {
  it("marks Phase 8 evidence ready for pilot review without approving a pilot", () => {
    const result = gate();
    const html = renderToStaticMarkup(<Phase8ReadinessGateCard gate={result} />);

    expect(result).toMatchObject({ dashboardStatus: "PHASE_8_PILOT_REVIEW_ELIGIBLE", gateDecision: "READY_FOR_PHASE_8_PILOT_REVIEW", authorityBoundary: { phase8PilotApprovalGranted: false, liveExecutionAuthorized: false, unsafeProbingAuthorized: false, roadTestAuthorized: false, productionPromotionProhibited: true, aiActivationProhibited: true } });
    expect(result.metrics).toMatchObject({ acknowledgementCount: 3, caseCount: 3, reviewedFamilies: 3, evidenceRecords: 5 });
    expect(result.gateChecksum).toMatch(/^[0-9a-f]{64}$/);
    expect(html).toContain("DG-G9");
    expect(html).toContain("Electrical, waveform, and intermittent evidence");
    expect(html).toContain("not pilot approval");
  });

  it("allows shadow expansion readiness while keeping authority locked", () => {
    const result = gate({ requestedMode: "SHADOW_EXPANSION", licensedSourceActivationComplete: false, runtimeWorkflowAcceptanceComplete: false });

    expect(result).toMatchObject({ dashboardStatus: "SHADOW_EXPANSION_READY", gateDecision: "HELD" });
    expect(result.warningCodes).toContain("DGG9_SHADOW_EXPANSION_NO_OPERATIONAL_AUTHORITY");
    expect(result.holdCodes).toEqual(expect.arrayContaining(["DGG9_LICENSED_SOURCE_ACTIVATION_REQUIRED", "DGG9_RUNTIME_WORKFLOW_ACCEPTANCE_REQUIRED"]));
  });

  it("fails closed when Phase 8 evidence is incomplete", () => {
    const incomplete = buildPhase8ElectricalPilotEvidencePackage({ occurredAt: "2026-07-23T03:30:00.000Z", builtBy: "manager-1", acknowledgements: [ack("case-elec-1", "ELEC-NORMAL-001", 1)], representativeCaseMinimum: 3, representativeFamilyMinimum: 3 });
    const result = gate({ phase8Evidence: incomplete });

    expect(result).toMatchObject({ dashboardStatus: "BLOCKED", gateDecision: "HELD" });
    expect(result.holdCodes).toContain("DGG9_PHASE_8_EVIDENCE_NOT_READY");
    expect(result.dashboard.find((item) => item.key === "PHASE_8_EVIDENCE")).toMatchObject({ status: "BLOCKED" });
  });

  it("prohibits production even when evidence is otherwise ready", () => {
    const result = gate({ requestedMode: "PRODUCTION" });

    expect(result).toMatchObject({ dashboardStatus: "BLOCKED", gateDecision: "PRODUCTION_PROHIBITED" });
    expect(result.holdCodes).toContain("DGG9_PRODUCTION_PROMOTION_NOT_AUTHORIZED");
  });
});
