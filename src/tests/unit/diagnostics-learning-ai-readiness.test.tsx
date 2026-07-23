import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { LearningAiReadinessCard } from "@/features/diagnostics/learning-ai-readiness-card";
import { createDiagnosticControlledCalibrationProposal, createDiagnosticLowRiskAiAssistanceDraft, evaluateDiagnosticAdvancedAiDraftGate, evaluateDiagnosticAiGatewayReadiness, evaluateDiagnosticEnterpriseScaleReadiness, findDiagnosticVerifiedSimilarCases, type DiagnosticVerifiedCaseRecord } from "@/server/diagnostics/learning-ai-readiness";

const checksum = "a".repeat(64);

const verifiedCases: DiagnosticVerifiedCaseRecord[] = [
  { caseId: "case-1", family: "ELECTRICAL_CIRCUIT", vehicle: { make: "Generic", model: "Fixture", year: 2020, powertrain: "2.0L", configurationTags: ["CAN", "12V", "LOAD-SIDE"] }, symptoms: ["intermittent no crank", "voltage drop"], evidenceKeys: ["DVOM_DROP", "LOAD_TEST"], confirmedCauseKey: "HIGH_RESISTANCE_GROUND", verifiedOutcome: "VERIFIED_REPAIR", verificationChecksum: checksum, permissionTags: ["DIAGNOSTICS"], occurredAt: "2026-07-23T05:00:00.000Z" },
  { caseId: "case-2", family: "ELECTRICAL_CIRCUIT", vehicle: { make: "Generic", model: "Fixture", year: 2021, powertrain: "2.0L", configurationTags: ["CAN", "12V", "LOAD-SIDE"] }, symptoms: ["intermittent no crank", "slow crank"], evidenceKeys: ["DVOM_DROP", "SCOPE_CAPTURE"], confirmedCauseKey: "VOLTAGE_DROP_FEED", verifiedOutcome: "VERIFIED_REPAIR", verificationChecksum: checksum, permissionTags: ["DIAGNOSTICS"], occurredAt: "2026-07-23T05:10:00.000Z" },
  { caseId: "case-3", family: "ELECTRICAL_CIRCUIT", vehicle: { make: "Generic", model: "Fixture", year: 2022, powertrain: "2.0L", configurationTags: ["CAN", "12V"] }, symptoms: ["intermittent no crank", "click"], evidenceKeys: ["LOAD_TEST", "DVOM_DROP"], confirmedCauseKey: "STARTER_CONTROL_DROP", verifiedOutcome: "VERIFIED_REPAIR", verificationChecksum: checksum, permissionTags: ["DIAGNOSTICS"], occurredAt: "2026-07-23T05:20:00.000Z" },
  { caseId: "case-unverified", family: "ELECTRICAL_CIRCUIT", vehicle: { make: "Generic", model: "Fixture", year: 2023, configurationTags: ["CAN"] }, symptoms: ["intermittent no crank"], evidenceKeys: ["DVOM_DROP"], confirmedCauseKey: "UNKNOWN", verifiedOutcome: "INCONCLUSIVE", verificationChecksum: checksum, permissionTags: ["DIAGNOSTICS"], occurredAt: "2026-07-23T05:30:00.000Z" }
];

function similarCases() {
  return findDiagnosticVerifiedSimilarCases({
    occurredAt: "2026-07-23T06:00:00.000Z",
    requestedBy: "lead-tech",
    query: { family: "ELECTRICAL_CIRCUIT", vehicle: { make: "Generic", model: "Fixture", year: 2024, configurationTags: ["CAN", "12V", "LOAD-SIDE"] }, symptoms: ["intermittent no crank", "voltage drop"], evidenceKeys: ["DVOM_DROP", "LOAD_TEST"], permissionTags: ["DIAGNOSTICS"] },
    library: verifiedCases
  });
}

function calibration() {
  return createDiagnosticControlledCalibrationProposal({
    occurredAt: "2026-07-23T06:10:00.000Z",
    proposedBy: "diagnostic-owner",
    target: "TEST_ORDERING",
    family: "ELECTRICAL_CIRCUIT",
    outcomeWindow: verifiedCases.slice(0, 3),
    proposalSummary: "Promote load-side voltage drop checks earlier for similar verified intermittent no-crank cases.",
    offlineEvaluation: { sampleSize: 3, baselineAccuracy: 0.72, proposedAccuracy: 0.81, safetyRegressionCount: 0, unnecessaryPartsDelta: -0.08 },
    independentApprovers: ["service-manager", "quality-lead"],
    rollbackPlanDocumented: true,
    shadowMonitoringDocumented: true
  });
}

function gateway(overrides: Partial<Parameters<typeof evaluateDiagnosticAiGatewayReadiness>[0]> = {}) {
  return evaluateDiagnosticAiGatewayReadiness({
    occurredAt: "2026-07-23T06:20:00.000Z",
    requestedBy: "diagnostic-owner",
    mode: "SHADOW",
    providerNeutralRegistryReady: true,
    permissionFilteredRetrievalReady: true,
    citationAndSourceVersionRequired: true,
    promptModelToolVersioningReady: true,
    privacyControlsReady: true,
    injectionControlsReady: true,
    deterministicOutputValidationReady: true,
    telemetryReady: true,
    costLatencyLimitsReady: true,
    killSwitchVerified: true,
    disabledModeVerified: true,
    redTeamScenarioCount: 8,
    acceptanceSignedBy: ["service-manager", "security-owner"],
    ...overrides
  });
}

function advancedDraftGate(overrides: Partial<Parameters<typeof evaluateDiagnosticAdvancedAiDraftGate>[0]> = {}) {
  return evaluateDiagnosticAdvancedAiDraftGate({
    occurredAt: "2026-07-23T06:30:00.000Z",
    requestedBy: "diagnostic-owner",
    gateway: gateway(),
    draftType: "TEST_PLAN_DRAFT",
    similarCaseRetrieval: similarCases(),
    groundednessScore: 0.94,
    abstentionRate: 0.22,
    harmfulOutputFindings: 0,
    privacyFindings: 0,
    humanReviewWorkflowReady: true,
    offlineEvaluationComplete: true,
    ...overrides
  });
}

function enterpriseScale(overrides: Partial<Parameters<typeof evaluateDiagnosticEnterpriseScaleReadiness>[0]> = {}) {
  return evaluateDiagnosticEnterpriseScaleReadiness({
    occurredAt: "2026-07-23T06:40:00.000Z",
    requestedBy: "ops-owner",
    multiLocationPolicyInheritanceVerified: true,
    fleetSpecialtyPartitionsVerified: true,
    approvedAdapterIsolationVerified: true,
    licensedConnectorContractsVerified: true,
    telemetryIngestionGoverned: true,
    reconciliationAndDegradedBehaviorVerified: true,
    loadTestP95Ms: 420,
    recoveryPointObjectiveMinutes: 10,
    recoveryTimeObjectiveMinutes: 45,
    regionalDataControlsVerified: true,
    supportModelDocumented: true,
    changeGovernanceDocumented: true,
    serviceExtractionJustifiedByEvidence: true,
    acceptanceSignedBy: ["ops-owner", "security-owner"],
    ...overrides
  });
}

describe("DGN-046 through DGN-050 learning and AI readiness", () => {
  it("retrieves only verified, permission-safe similar cases with difference explanations", () => {
    const result = similarCases();

    expect(result.status).toBe("MATCHES_AVAILABLE");
    expect(result.matches).toHaveLength(3);
    expect(result.matches[0]).toMatchObject({ caseId: "case-1", verifiedOutcome: "VERIFIED_REPAIR" });
    expect(result.excludedCases).toContainEqual({ caseId: "case-unverified", reasonCode: "UNVERIFIED_OUTCOME" });
    expect(result.authorityBoundary.aiAuthorityGranted).toBe(false);
    expect(result.retrievalChecksum).toMatch(/^[0-9a-f]{64}$/);
  });

  it("creates controlled calibration proposals without production mutation authority", () => {
    const result = calibration();

    expect(result).toMatchObject({ status: "READY_FOR_SHADOW_EVALUATION", holdCodes: [], authorityBoundary: { productionLogicMutationAuthorized: false, humanReviewRequired: true } });
    expect(result.metrics.improvement).toBeCloseTo(0.09);
    expect(result.warningCodes).toContain("DGN047_NO_SELF_MODIFYING_PRODUCTION_LOGIC");
  });

  it("evaluates the provider-neutral AI gateway as supervised shadow only", () => {
    const result = gateway();

    expect(result).toMatchObject({ status: "READY_FOR_SUPERVISED_SHADOW", holdCodes: [], authorityBoundary: { aiAuthorityGranted: false, killSwitchRequired: true } });
    expect(result.dashboard.every((item) => item.status === "READY")).toBe(true);
    expect(result.gatewayChecksum).toMatch(/^[0-9a-f]{64}$/);
  });

  it("keeps low-risk AI assistance drafts behind citations and human confirmation", () => {
    const result = createDiagnosticLowRiskAiAssistanceDraft({ occurredAt: "2026-07-23T06:25:00.000Z", requestedBy: "lead-tech", gateway: gateway(), task: "CITED_CASE_SUMMARY", sourceCitations: [{ sourceId: "case-1", version: "v1", checksum }], draftText: "Draft summary cites verified evidence and must be confirmed by a qualified human reviewer.", humanConfirmationRequired: true });

    expect(result).toMatchObject({ status: "READY_FOR_HUMAN_REVIEW", holdCodes: [], citationCount: 1, authorityBoundary: { customerPresentationAuthorized: false, humanReviewRequired: true } });
    expect(result.warningCodes).toContain("DGN049_DRAFT_IS_NOT_AUTHORITY");
  });

  it("gates advanced AI diagnostic drafts and enterprise scale to review-only readiness", () => {
    const result = advancedDraftGate();
    const scale = enterpriseScale();
    const html = renderToStaticMarkup(<LearningAiReadinessCard similarCases={similarCases()} calibration={calibration()} gateway={gateway()} advancedDraftGate={result} enterpriseScale={scale} />);

    expect(result).toMatchObject({ status: "READY_FOR_SHADOW_DRAFT_REVIEW", holdCodes: [], authorityBoundary: { aiAuthorityGranted: false, repairAuthorized: false } });
    expect(result.metrics).toMatchObject({ groundednessScore: 0.94, harmfulOutputFindings: 0, similarCaseMatches: 3 });
    expect(scale).toMatchObject({ status: "READY_FOR_ENTERPRISE_SCALE_REVIEW", holdCodes: [], authorityBoundary: { productionPromotionProhibited: true } });
    expect(html).toContain("DGN-046-050 + DG-G10");
    expect(html).toContain("Outcome learning, calibration, and supervised AI");
    expect(html).toContain("cannot self-modify production logic");
  });

  it("fails closed when gateway safety or advanced draft evidence is incomplete", () => {
    const unsafeGateway = gateway({ injectionControlsReady: false, redTeamScenarioCount: 2 });
    const result = advancedDraftGate({ gateway: unsafeGateway, groundednessScore: 0.7, harmfulOutputFindings: 1 });

    expect(unsafeGateway.status).toBe("HELD");
    expect(unsafeGateway.holdCodes).toEqual(expect.arrayContaining(["DGN048_INJECTION_CONTROLS_REQUIRED", "DGN048_RED_TEAM_SCENARIOS_REQUIRED"]));
    expect(result.status).toBe("HELD");
    expect(result.holdCodes).toEqual(expect.arrayContaining(["DGN050_GATEWAY_SHADOW_READY_REQUIRED", "DGN050_GROUNDEDNESS_THRESHOLD_REQUIRED", "DGN050_HARMFUL_OUTPUT_BLOCK"]));
  });

  it("holds enterprise scale when recovery or connector evidence is incomplete", () => {
    const result = enterpriseScale({ approvedAdapterIsolationVerified: false, loadTestP95Ms: 1_200, recoveryTimeObjectiveMinutes: 90 });

    expect(result.status).toBe("HELD");
    expect(result.holdCodes).toEqual(expect.arrayContaining(["DGG10_ADAPTER_ISOLATION_REQUIRED", "DGG10_LOAD_TEST_P95_REQUIRED", "DGG10_RECOVERY_TIME_OBJECTIVE_REQUIRED"]));
    expect(result.warningCodes).toContain("DGG10_READY_FOR_REVIEW_IS_NOT_ENTERPRISE_PRODUCTION_APPROVAL");
  });
});
