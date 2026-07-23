import { hashEnterpriseCommand } from "@/server/enterprise-command/domain";

export const DIAGNOSTIC_LEARNING_AI_SCALE_READINESS_VERSION = "DGN-046-050+DG-G10/LEARNING-AI-SCALE-READINESS/1.0.0";

export type DiagnosticLearningFamily = "NO_START" | "COOLING_OVERHEATING" | "BRAKE" | "HVAC" | "MISFIRE_DRIVABILITY" | "ELECTRICAL_CIRCUIT" | "WAVEFORM_ANALYSIS" | "INTERMITTENT_FAULT";
export type DiagnosticVerifiedOutcome = "VERIFIED_REPAIR" | "COMEBACK" | "NO_FAULT_FOUND" | "INCONCLUSIVE";
export type DiagnosticAiAssistanceMode = "DISABLED" | "SHADOW" | "ASSISTIVE_REVIEW";

export type DiagnosticVerifiedCaseRecord = {
  caseId: string;
  family: DiagnosticLearningFamily;
  vehicle: { make: string; model: string; year: number; configurationTags: string[] };
  symptoms: string[];
  evidenceKeys: string[];
  confirmedCauseKey: string;
  verifiedOutcome: DiagnosticVerifiedOutcome;
  verificationChecksum: string;
  permissionTags: string[];
  occurredAt: string;
};

export type DiagnosticLearningAiScaleReadinessInput = {
  occurredAt: string;
  requestedBy: string;
  query: {
    family: DiagnosticLearningFamily;
    vehicle: DiagnosticVerifiedCaseRecord["vehicle"];
    symptoms: string[];
    evidenceKeys: string[];
    permissionTags: string[];
  };
  verifiedCaseLibrary: DiagnosticVerifiedCaseRecord[];
  calibration: {
    family: DiagnosticLearningFamily;
    target: "TEST_ORDERING" | "WEIGHT" | "THRESHOLD" | "DURATION_RANGE";
    proposalSummary: string;
    sampleSize: number;
    baselineAccuracy: number;
    proposedAccuracy: number;
    safetyRegressionCount: number;
    independentApprovers: string[];
    rollbackPlanDocumented: boolean;
    shadowMonitoringDocumented: boolean;
  };
  aiGateway: {
    mode: DiagnosticAiAssistanceMode;
    providerNeutralRegistryReady: boolean;
    permissionFilteredRetrievalReady: boolean;
    citationsRequired: boolean;
    promptModelToolVersioningReady: boolean;
    privacyControlsReady: boolean;
    injectionControlsReady: boolean;
    outputValidationReady: boolean;
    telemetryReady: boolean;
    costLatencyLimitsReady: boolean;
    killSwitchVerified: boolean;
    disabledModeVerified: boolean;
    redTeamScenarioCount: number;
    acceptanceSignedBy: string[];
  };
  lowRiskAssistance: {
    citedSourceCount: number;
    draftContentPresent: boolean;
    humanConfirmationRequired: boolean;
  };
  advancedDrafts: {
    groundednessScore: number;
    abstentionRate: number;
    harmfulOutputFindings: number;
    privacyFindings: number;
    humanReviewWorkflowReady: boolean;
    offlineEvaluationComplete: boolean;
  };
  enterpriseScale: {
    multiLocationPolicyInheritanceVerified: boolean;
    fleetSpecialtyPartitionsVerified: boolean;
    approvedAdapterIsolationVerified: boolean;
    licensedConnectorContractsVerified: boolean;
    telemetryIngestionGoverned: boolean;
    reconciliationAndDegradedBehaviorVerified: boolean;
    loadTestP95Ms: number;
    recoveryPointObjectiveMinutes: number;
    recoveryTimeObjectiveMinutes: number;
    regionalDataControlsVerified: boolean;
    supportModelDocumented: boolean;
    changeGovernanceDocumented: boolean;
    serviceExtractionJustifiedByEvidence: boolean;
    acceptanceSignedBy: string[];
  };
};

const authorityBoundary = {
  reviewOnly: true,
  productionLogicMutationAuthorized: false,
  aiAuthorityGranted: false,
  liveExecutionAuthorized: false,
  dispatchAuthorized: false,
  repairAuthorized: false,
  customerPresentationAuthorized: false,
  productionPromotionProhibited: true,
  externalConnectorActivationAuthorized: false,
  humanReviewRequired: true,
  killSwitchRequired: true
} as const;

const checksumOk = (value: string) => /^[0-9a-f]{64}$/.test(value);
const normalized = (value: string) => value.trim().toUpperCase();
const unique = (values: string[]) => [...new Set(values.filter(Boolean))].sort((left, right) => left.localeCompare(right));

function overlap(left: string[], right: string[]) {
  const rightSet = new Set(right.map(normalized));
  return left.map(normalized).filter((item) => rightSet.has(item)).length;
}

export function evaluateDiagnosticLearningAiScaleReadiness(input: DiagnosticLearningAiScaleReadinessInput) {
  const occurredAt = new Date(input.occurredAt);
  if (Number.isNaN(occurredAt.getTime())) throw new Error("Learning, AI, and scale readiness requires a valid timestamp.");
  if (!input.requestedBy.trim()) throw new Error("Learning, AI, and scale readiness requires a requester.");

  const exclusions = input.verifiedCaseLibrary.flatMap((item) => {
    if (item.family !== input.query.family) return [{ caseId: item.caseId, reasonCode: "FAMILY_MISMATCH" }];
    if (item.verifiedOutcome !== "VERIFIED_REPAIR") return [{ caseId: item.caseId, reasonCode: "UNVERIFIED_OUTCOME" }];
    if (!checksumOk(item.verificationChecksum)) return [{ caseId: item.caseId, reasonCode: "CHECKSUM_INVALID" }];
    if (!item.permissionTags.every((tag) => input.query.permissionTags.map(normalized).includes(normalized(tag)))) return [{ caseId: item.caseId, reasonCode: "PERMISSION_FILTERED" }];
    return [];
  });
  const matches = input.verifiedCaseLibrary.filter((item) => !exclusions.some((excluded) => excluded.caseId === item.caseId)).map((item) => {
    const config = overlap(item.vehicle.configurationTags, input.query.vehicle.configurationTags);
    const symptoms = overlap(item.symptoms, input.query.symptoms);
    const evidence = overlap(item.evidenceKeys, input.query.evidenceKeys);
    const score = Math.min(1, Number(((config * 0.12) + (symptoms * 0.18) + (evidence * 0.16)).toFixed(3)));
    return { caseId: item.caseId, score, confirmedCauseKey: item.confirmedCauseKey, differenceExplanation: `${config} configuration, ${symptoms} symptom, and ${evidence} evidence overlaps.`, verificationChecksum: item.verificationChecksum };
  }).filter((item) => item.score >= 0.45).sort((left, right) => right.score - left.score || left.caseId.localeCompare(right.caseId)).slice(0, 5);

  const calibrationImprovement = Number((input.calibration.proposedAccuracy - input.calibration.baselineAccuracy).toFixed(4));
  const gatewayReady = input.aiGateway.mode === "DISABLED" || [
    input.aiGateway.providerNeutralRegistryReady,
    input.aiGateway.permissionFilteredRetrievalReady,
    input.aiGateway.citationsRequired,
    input.aiGateway.promptModelToolVersioningReady,
    input.aiGateway.privacyControlsReady,
    input.aiGateway.injectionControlsReady,
    input.aiGateway.outputValidationReady,
    input.aiGateway.telemetryReady,
    input.aiGateway.costLatencyLimitsReady,
    input.aiGateway.killSwitchVerified,
    input.aiGateway.disabledModeVerified,
    input.aiGateway.redTeamScenarioCount >= 5,
    unique(input.aiGateway.acceptanceSignedBy.map(normalized)).length >= 2
  ].every(Boolean);
  const enterpriseReady = [
    input.enterpriseScale.multiLocationPolicyInheritanceVerified,
    input.enterpriseScale.fleetSpecialtyPartitionsVerified,
    input.enterpriseScale.approvedAdapterIsolationVerified,
    input.enterpriseScale.licensedConnectorContractsVerified,
    input.enterpriseScale.telemetryIngestionGoverned,
    input.enterpriseScale.reconciliationAndDegradedBehaviorVerified,
    input.enterpriseScale.loadTestP95Ms > 0 && input.enterpriseScale.loadTestP95Ms <= 750,
    input.enterpriseScale.recoveryPointObjectiveMinutes > 0 && input.enterpriseScale.recoveryPointObjectiveMinutes <= 15,
    input.enterpriseScale.recoveryTimeObjectiveMinutes > 0 && input.enterpriseScale.recoveryTimeObjectiveMinutes <= 60,
    input.enterpriseScale.regionalDataControlsVerified,
    input.enterpriseScale.supportModelDocumented,
    input.enterpriseScale.changeGovernanceDocumented,
    input.enterpriseScale.serviceExtractionJustifiedByEvidence,
    unique(input.enterpriseScale.acceptanceSignedBy.map(normalized)).length >= 2
  ].every(Boolean);
  const holdCodes = unique([
    matches.length ? "" : "DGN046_VERIFIED_SIMILAR_CASE_MATCH_REQUIRED",
    input.calibration.sampleSize >= 3 ? "" : "DGN047_VERIFIED_OUTCOME_SAMPLE_REQUIRED",
    calibrationImprovement > 0 ? "" : "DGN047_NO_MEASURED_IMPROVEMENT",
    input.calibration.safetyRegressionCount === 0 ? "" : "DGN047_SAFETY_REGRESSION_BLOCK",
    input.calibration.rollbackPlanDocumented ? "" : "DGN047_ROLLBACK_PLAN_REQUIRED",
    input.calibration.shadowMonitoringDocumented ? "" : "DGN047_SHADOW_MONITORING_REQUIRED",
    unique(input.calibration.independentApprovers.map(normalized)).length >= 2 ? "" : "DGN047_INDEPENDENT_APPROVAL_REQUIRED",
    gatewayReady ? "" : "DGN048_AI_GATEWAY_READINESS_REQUIRED",
    input.lowRiskAssistance.citedSourceCount > 0 ? "" : "DGN049_CITED_SOURCES_REQUIRED",
    input.lowRiskAssistance.draftContentPresent ? "" : "DGN049_DRAFT_CONTENT_REQUIRED",
    input.lowRiskAssistance.humanConfirmationRequired ? "" : "DGN049_HUMAN_CONFIRMATION_REQUIRED",
    input.advancedDrafts.groundednessScore >= 0.9 ? "" : "DGN050_GROUNDEDNESS_THRESHOLD_REQUIRED",
    input.advancedDrafts.abstentionRate >= 0.15 ? "" : "DGN050_ABSTENTION_BEHAVIOR_REQUIRED",
    input.advancedDrafts.harmfulOutputFindings === 0 ? "" : "DGN050_HARMFUL_OUTPUT_BLOCK",
    input.advancedDrafts.privacyFindings === 0 ? "" : "DGN050_PRIVACY_FINDING_BLOCK",
    input.advancedDrafts.humanReviewWorkflowReady ? "" : "DGN050_HUMAN_REVIEW_WORKFLOW_REQUIRED",
    input.advancedDrafts.offlineEvaluationComplete ? "" : "DGN050_OFFLINE_EVALUATION_REQUIRED",
    enterpriseReady ? "" : "DGG10_ENTERPRISE_SCALE_EVIDENCE_REQUIRED"
  ]);
  const result = {
    version: DIAGNOSTIC_LEARNING_AI_SCALE_READINESS_VERSION,
    occurredAt: occurredAt.toISOString(),
    requestedBy: input.requestedBy.trim(),
    status: holdCodes.length ? "HELD" as const : "READY_FOR_GOVERNED_REVIEW" as const,
    dashboard: [
      { key: "SIMILAR_CASES", label: "Verified similar cases", status: matches.length ? "READY" as const : "HOLD" as const, detail: `${matches.length} verified matches; ${exclusions.length} excluded.` },
      { key: "CALIBRATION", label: "Controlled calibration", status: input.calibration.sampleSize >= 3 && calibrationImprovement > 0 && input.calibration.safetyRegressionCount === 0 ? "READY" as const : "HOLD" as const, detail: `${input.calibration.target}; improvement ${calibrationImprovement}.` },
      { key: "AI_GATEWAY", label: "AI gateway and low-risk drafts", status: gatewayReady && input.lowRiskAssistance.humanConfirmationRequired ? "READY" as const : "HOLD" as const, detail: `${input.aiGateway.mode}; ${input.aiGateway.redTeamScenarioCount} red-team scenarios.` },
      { key: "ADVANCED_DRAFTS", label: "Advanced AI draft gate", status: input.advancedDrafts.groundednessScore >= 0.9 && input.advancedDrafts.harmfulOutputFindings === 0 && input.advancedDrafts.privacyFindings === 0 ? "READY" as const : "HOLD" as const, detail: `Groundedness ${input.advancedDrafts.groundednessScore}; abstention ${input.advancedDrafts.abstentionRate}.` },
      { key: "ENTERPRISE_SCALE", label: "Enterprise scale and ecosystem", status: enterpriseReady ? "READY" as const : "HOLD" as const, detail: `P95 ${input.enterpriseScale.loadTestP95Ms}ms; RTO ${input.enterpriseScale.recoveryTimeObjectiveMinutes}m.` }
    ],
    holdCodes,
    metrics: {
      similarCaseMatches: matches.length,
      excludedCases: exclusions.length,
      calibrationImprovement,
      gatewayHoldCount: gatewayReady ? 0 : 1,
      redTeamScenarioCount: input.aiGateway.redTeamScenarioCount,
      enterpriseLoadP95Ms: input.enterpriseScale.loadTestP95Ms,
      enterpriseRecoveryTimeObjectiveMinutes: input.enterpriseScale.recoveryTimeObjectiveMinutes
    },
    matches,
    warningCodes: ["LEARNING_AI_SCALE_READY_IS_NOT_AUTHORITY", "AI_REMAINS_OPTIONAL_SUPERVISED_AND_REVERSIBLE", "ENTERPRISE_CONNECTORS_REMAIN_ISOLATED"],
    authorityBoundary
  };
  return { ...result, readinessChecksum: hashEnterpriseCommand({ input, result }) };
}
