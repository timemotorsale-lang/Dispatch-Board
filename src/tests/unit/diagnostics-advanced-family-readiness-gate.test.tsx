import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { AdvancedFamilyReadinessGateCard } from "@/features/diagnostics/advanced-family-readiness-gate-card";
import { evaluateDiagnosticAdvancedFamilyReadinessGate } from "@/server/diagnostics/advanced-family-readiness-gate";
import { createCoolingOverheatingShadowAcknowledgement } from "@/server/diagnostics/cooling-overheating-shadow-acknowledgement";
import { evaluateCoolingOverheatingNextTestReadiness } from "@/server/diagnostics/cooling-overheating-next-test-readiness";
import { buildCoolingOverheatingPilotEvidencePackage } from "@/server/diagnostics/cooling-overheating-pilot-hardening";
import { COOLING_OVERHEATING_PROOF_CORPUS, evaluateCoolingOverheatingProofScenario } from "@/server/diagnostics/cooling-overheating-proof";
import { evaluatePhase7MechanicalNextTestReadiness } from "@/server/diagnostics/phase-7-mechanical-next-test-readiness";
import { buildPhase7MechanicalPilotEvidencePackage } from "@/server/diagnostics/phase-7-mechanical-pilot-hardening";
import { PHASE_7_MECHANICAL_PROOF_CORPUS, evaluatePhase7MechanicalProofScenario, type Phase7MechanicalProofFamily } from "@/server/diagnostics/phase-7-mechanical-proof";
import { createPhase7MechanicalShadowAcknowledgement } from "@/server/diagnostics/phase-7-mechanical-shadow-acknowledgement";

const coolingEnvironment = {
  sourceAuthorized: true,
  systemCoolEnoughForSafeAccess: true,
  rotatingFanHazardControlled: true,
  toxicFluidHandlingReady: true,
  capabilities: ["DIAGNOSTICS_ADVANCED_SHADOW"],
  qualifications: ["COOLING_SYSTEM_L2"],
  tools: ["COOLING_PRESSURE_TESTER", "SCAN_TOOL", "THERMAL_MEASUREMENT_TOOL", "CALIBRATED_DVOM", "COMBUSTION_GAS_TESTER"]
};

const mechanicalEnvironment = {
  sourceAuthorized: true,
  controlledHazards: ["LIFTING_AND_WHEEL_REMOVAL", "BRAKE_DUST_HANDLING", "BRAKE_SAFETY_CRITICAL_SYSTEM", "TOXIC_FLUID_HANDLING", "REFRIGERANT_PRESSURE", "ROTATING_COMPONENTS", "HOT_COOLANT_OR_HEATER_CIRCUIT", "HOT_EXHAUST", "IGNITION_HIGH_ENERGY", "ROTATING_ENGINE_COMPONENTS"],
  capabilities: ["DIAGNOSTICS_ADVANCED_SHADOW"],
  qualifications: ["BRAKE_DIAGNOSIS_L2", "HVAC_DIAGNOSIS_L2", "DRIVABILITY_DIAGNOSIS_L2"],
  tools: ["LIFT_OR_SAFE_SUPPORT", "BRAKE_MEASUREMENT_TOOLS", "DIAL_INDICATOR", "MICROMETER", "BRAKE_PRESSURE_GAUGES", "SCAN_TOOL", "TEMPERATURE_PROBES", "HVAC_PRESSURE_GAUGES", "AIRFLOW_METER", "THERMAL_MEASUREMENT_TOOL", "OSCILLOSCOPE", "COMPRESSION_OR_PRESSURE_TRANSDUCER"],
  satisfiedPrerequisites: ["WHEEL_REMOVAL_SAFE_STATE", "BRAKE_FLUID_SAFE_HANDLING", "REFRIGERANT_SERVICE_NOT_REQUESTED", "HOT_COMPONENT_CONTACT_CONTROLLED", "IGNITION_TEST_SAFE_STATE", "ENGINE_MECHANICAL_TEST_SAFE_STATE"]
};

function coolingAck(diagnosticCaseId: string, index: number) {
  const scenario = COOLING_OVERHEATING_PROOF_CORPUS.find((item) => item.family === "COOLANT_LEAK")!;
  const readiness = evaluateCoolingOverheatingNextTestReadiness({
    diagnosticCaseId,
    reasoningEvaluationId: `reason-${diagnosticCaseId}`,
    proofResult: evaluateCoolingOverheatingProofScenario(scenario.input),
    now: "2026-07-22T23:00:00.000Z",
    vehicle: { make: "Generic", model: "Cooling Fixture", year: 2020, state: "STATIC_SAFE" },
    environment: coolingEnvironment
  });
  return createCoolingOverheatingShadowAcknowledgement({ diagnosticCaseId, readiness, actorUserId: `cool-tech-${index}`, decision: "REVIEWED", selectedTestKey: readiness.recommendedTestKey, reason: "Reviewed the cooling shadow recommendation and kept it in review-only status.", acknowledgedAt: `2026-07-22T23:0${index}:00.000Z` });
}

const mechanicalScenario = (id: string) => PHASE_7_MECHANICAL_PROOF_CORPUS.find((item) => item.id === id)!;

function mechanicalAck(diagnosticCaseId: string, scenarioId: string, index: number) {
  const selected = mechanicalScenario(scenarioId);
  const readiness = evaluatePhase7MechanicalNextTestReadiness({
    diagnosticCaseId,
    reasoningEvaluationId: `reason-${diagnosticCaseId}`,
    proofResult: evaluatePhase7MechanicalProofScenario(selected.input),
    now: "2026-07-22T23:00:00.000Z",
    vehicle: { make: "Generic", model: "Phase 7 Fixture", year: 2020, state: scenarioId.startsWith("HVAC") || scenarioId.startsWith("MISFIRE") ? "ENGINE_RUNNING_OBSERVED" : "STATIC_SAFE" },
    environment: mechanicalEnvironment
  });
  return createPhase7MechanicalShadowAcknowledgement({ diagnosticCaseId, family: selected.family as Phase7MechanicalProofFamily, readiness, actorUserId: `mech-tech-${index}`, decision: "REVIEWED", selectedTestKey: readiness.recommendedTestKey, reason: "Reviewed the Phase 7 mechanical shadow recommendation and kept it in review-only status.", acknowledgedAt: `2026-07-22T23:1${index}:00.000Z` });
}

function readyCoolingPackage() {
  return buildCoolingOverheatingPilotEvidencePackage({ occurredAt: "2026-07-22T23:20:00.000Z", builtBy: "manager-1", acknowledgements: [coolingAck("case-cool-1", 1), coolingAck("case-cool-2", 2)], representativeCaseMinimum: 2 });
}

function readyMechanicalPackage() {
  return buildPhase7MechanicalPilotEvidencePackage({ occurredAt: "2026-07-22T23:20:00.000Z", builtBy: "manager-1", acknowledgements: [mechanicalAck("case-brake-1", "BRAKE-MEASUREMENT-001", 1), mechanicalAck("case-hvac-1", "HVAC-NORMAL-001", 2), mechanicalAck("case-misfire-1", "MISFIRE-NORMAL-001", 3)], representativeCaseMinimum: 3, representativeFamilyMinimum: 3 });
}

function gate(overrides: Partial<Parameters<typeof evaluateDiagnosticAdvancedFamilyReadinessGate>[0]> = {}) {
  return evaluateDiagnosticAdvancedFamilyReadinessGate({
    occurredAt: "2026-07-22T23:30:00.000Z",
    requestedMode: "CONTROLLED_ADVANCED_PILOT",
    requestedBy: "manager-1",
    coolingEvidence: readyCoolingPackage(),
    mechanicalEvidence: readyMechanicalPackage(),
    licensedSourceActivationComplete: true,
    runtimeWorkflowAcceptanceComplete: true,
    roleTrainingComplete: true,
    monitoringPlanDocumented: true,
    rollbackPlanDocumented: true,
    pauseControlVerified: true,
    acceptanceSignedBy: ["service-manager", "lead-technician"],
    unresolvedRisks: [{ riskId: "adv-risk-1", disposition: "MITIGATED", owner: "manager-1", note: "Advanced-family shadow pilot risk has documented monitoring and pause controls." }],
    ...overrides
  });
}

describe("DG-G8 advanced-family readiness gate", () => {
  it("marks cooling plus Phase 7 mechanical evidence ready for advanced pilot review without approving a pilot", () => {
    const result = gate();
    const html = renderToStaticMarkup(<AdvancedFamilyReadinessGateCard gate={result} />);

    expect(result).toMatchObject({ dashboardStatus: "ADVANCED_PILOT_REVIEW_ELIGIBLE", gateDecision: "READY_FOR_ADVANCED_PILOT_REVIEW", authorityBoundary: { advancedPilotApprovalGranted: false, liveExecutionAuthorized: false, productionPromotionProhibited: true, aiActivationProhibited: true } });
    expect(result.metrics).toMatchObject({ coolingAcknowledgements: 2, mechanicalAcknowledgements: 3, mechanicalReviewedFamilies: 3, totalEvidenceRecords: 9 });
    expect(result.gateChecksum).toMatch(/^[0-9a-f]{64}$/);
    expect(html).toContain("DG-G8");
    expect(html).toContain("Cooling plus Phase 7 mechanical evidence");
    expect(html).toContain("not pilot approval");
  });

  it("allows shadow expansion readiness but keeps operational authority locked", () => {
    const result = gate({ requestedMode: "SHADOW_EXPANSION", licensedSourceActivationComplete: false, runtimeWorkflowAcceptanceComplete: false });

    expect(result).toMatchObject({ dashboardStatus: "SHADOW_EXPANSION_READY", gateDecision: "HELD" });
    expect(result.warningCodes).toContain("DGG8_SHADOW_EXPANSION_NO_OPERATIONAL_AUTHORITY");
    expect(result.holdCodes).toEqual(expect.arrayContaining(["DGG8_LICENSED_SOURCE_ACTIVATION_REQUIRED", "DGG8_RUNTIME_WORKFLOW_ACCEPTANCE_REQUIRED"]));
  });

  it("fails closed when mechanical evidence is incomplete", () => {
    const incompleteMechanical = buildPhase7MechanicalPilotEvidencePackage({ occurredAt: "2026-07-22T23:20:00.000Z", builtBy: "manager-1", acknowledgements: [mechanicalAck("case-brake-1", "BRAKE-MEASUREMENT-001", 1)], representativeCaseMinimum: 3, representativeFamilyMinimum: 3 });
    const result = gate({ mechanicalEvidence: incompleteMechanical });

    expect(result).toMatchObject({ dashboardStatus: "BLOCKED", gateDecision: "HELD" });
    expect(result.holdCodes).toContain("DGG8_MECHANICAL_EVIDENCE_NOT_READY");
    expect(result.dashboard.find((item) => item.key === "MECHANICAL_EVIDENCE")).toMatchObject({ status: "BLOCKED" });
  });

  it("prohibits production even when evidence is otherwise ready", () => {
    const result = gate({ requestedMode: "PRODUCTION" });

    expect(result).toMatchObject({ dashboardStatus: "BLOCKED", gateDecision: "PRODUCTION_PROHIBITED" });
    expect(result.holdCodes).toContain("DGG8_PRODUCTION_PROMOTION_NOT_AUTHORIZED");
  });
});
