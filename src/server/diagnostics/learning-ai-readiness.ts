import { hashEnterpriseCommand } from "@/server/enterprise-command/domain";

export const DIAGNOSTIC_VERIFIED_SIMILAR_CASE_RETRIEVAL_VERSION = "DGN-046/VERIFIED-SIMILAR-CASE-RETRIEVAL/1.0.0";
export const DIAGNOSTIC_CONTROLLED_CALIBRATION_PROPOSAL_VERSION = "DGN-047/CONTROLLED-CALIBRATION-PROPOSAL/1.0.0";
export const DIAGNOSTIC_AI_GATEWAY_READINESS_VERSION = "DGN-048/PROVIDER-NEUTRAL-AI-GATEWAY-READINESS/1.0.0";
export const DIAGNOSTIC_LOW_RISK_AI_ASSISTANCE_VERSION = "DGN-049/LOW-RISK-AI-ASSISTANCE/1.0.0";
export const DIAGNOSTIC_ADVANCED_AI_DRAFT_GATE_VERSION = "DGN-050/ADVANCED-AI-DIAGNOSTIC-DRAFT-GATE/1.0.0";
export const DIAGNOSTIC_ENTERPRISE_SCALE_READINESS_VERSION = "DG-G10/ENTERPRISE-SCALE-ECOSYSTEM-READINESS/1.0.0";

export type DiagnosticLearningFamily = "NO_START" | "COOLING_OVERHEATING" | "BRAKE" | "HVAC" | "MISFIRE_DRIVABILITY" | "ELECTRICAL_CIRCUIT" | "WAVEFORM_ANALYSIS" | "INTERMITTENT_FAULT";
export type DiagnosticVerifiedOutcome = "VERIFIED_REPAIR" | "COMEBACK" | "NO_FAULT_FOUND" | "INCONCLUSIVE";
export type DiagnosticSimilarityWarning = "LOW_CONFIDENCE_MATCH" | "CONFIGURATION_MISMATCH" | "EVIDENCE_GAP" | "UNVERIFIED_CASE_EXCLUDED" | "PERMISSION_FILTERED";
export type DiagnosticAiAssistanceMode = "DISABLED" | "SHADOW" | "ASSISTIVE_REVIEW";
export type DiagnosticAiDraftType = "HYPOTHESIS_DRAFT" | "TEST_PLAN_DRAFT" | "SIMILAR_CASE_SYNTHESIS" | "REPAIR_HANDOFF_DRAFT";
export type DiagnosticSimilarCaseExclusionReason = "FAMILY_MISMATCH" | "UNVERIFIED_OUTCOME" | "CHECKSUM_INVALID" | "PERMISSION_FILTERED";

export type DiagnosticVerifiedCaseRecord = {
  caseId: string;
  family: DiagnosticLearningFamily;
  vehicle: { make: string; model: string; year: number; powertrain?: string; configurationTags: string[] };
  symptoms: string[];
  evidenceKeys: string[];
  confirmedCauseKey: string;
  verifiedOutcome: DiagnosticVerifiedOutcome;
  verificationChecksum: string;
  permissionTags: string[];
  occurredAt: string;
};

export type DiagnosticSimilarCaseRetrievalInput = {
  occurredAt: string;
  requestedBy: string;
  query: {
    family: DiagnosticLearningFamily;
    vehicle: DiagnosticVerifiedCaseRecord["vehicle"];
    symptoms: string[];
    evidenceKeys: string[];
    permissionTags: string[];
  };
  library: DiagnosticVerifiedCaseRecord[];
  minimumScore?: number;
};

export type DiagnosticCalibrationProposalInput = {
  occurredAt: string;
  proposedBy: string;
  target: "TEST_ORDERING" | "WEIGHT" | "THRESHOLD" | "DURATION_RANGE";
  family: DiagnosticLearningFamily;
  outcomeWindow: DiagnosticVerifiedCaseRecord[];
  proposalSummary: string;
  offlineEvaluation: { sampleSize: number; baselineAccuracy: number; proposedAccuracy: number; safetyRegressionCount: number; unnecessaryPartsDelta: number };
  independentApprovers: string[];
  rollbackPlanDocumented: boolean;
  shadowMonitoringDocumented: boolean;
};

export type DiagnosticAiGatewayReadinessInput = {
  occurredAt: string;
  requestedBy: string;
  mode: DiagnosticAiAssistanceMode;
  providerNeutralRegistryReady: boolean;
  permissionFilteredRetrievalReady: boolean;
  citationAndSourceVersionRequired: boolean;
  promptModelToolVersioningReady: boolean;
  privacyControlsReady: boolean;
  injectionControlsReady: boolean;
  deterministicOutputValidationReady: boolean;
  telemetryReady: boolean;
  costLatencyLimitsReady: boolean;
  killSwitchVerified: boolean;
  disabledModeVerified: boolean;
  redTeamScenarioCount: number;
  acceptanceSignedBy: string[];
};

export type DiagnosticLowRiskAiAssistanceInput = {
  occurredAt: string;
  requestedBy: string;
  gateway: ReturnType<typeof evaluateDiagnosticAiGatewayReadiness>;
  task: "DICTATION_STRUCTURING" | "CITED_CASE_SUMMARY" | "MISSING_OR_CONTRADICTORY_EVIDENCE_DRAFT" | "APPROVED_PROCEDURE_EXPLANATION";
  sourceCitations: Array<{ sourceId: string; version: string; checksum: string }>;
  draftText: string;
  humanConfirmationRequired: boolean;
};

export type DiagnosticAdvancedAiDraftGateInput = {
  occurredAt: string;
  requestedBy: string;
  gateway: ReturnType<typeof evaluateDiagnosticAiGatewayReadiness>;
  draftType: DiagnosticAiDraftType;
  similarCaseRetrieval: ReturnType<typeof findDiagnosticVerifiedSimilarCases>;
  groundednessScore: number;
  abstentionRate: number;
  harmfulOutputFindings: number;
  privacyFindings: number;
  humanReviewWorkflowReady: boolean;
  offlineEvaluationComplete: boolean;
};

export type DiagnosticEnterpriseScaleReadinessInput = {
  occurredAt: string;
  requestedBy: string;
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

const checksumOk = (value: string) => /^[0-9a-f]{64}$/.test(value);
const normalized = (value: string) => value.trim().toUpperCase();
const unique = (values: string[]) => [...new Set(values.filter(Boolean))].sort((left, right) => left.localeCompare(right));
const authorityBoundary = {
  reviewOnly: true,
  productionLogicMutationAuthorized: false,
  aiAuthorityGranted: false,
  liveExecutionAuthorized: false,
  dispatchAuthorized: false,
  repairAuthorized: false,
  customerPresentationAuthorized: false,
  productionPromotionProhibited: true,
  humanReviewRequired: true,
  killSwitchRequired: true
} as const;

function validDate(value: string, message: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error(message);
  return date.toISOString();
}

function overlap(left: string[], right: string[]) {
  const rightSet = new Set(right.map(normalized));
  return left.map(normalized).filter((item) => rightSet.has(item)).length;
}

export function findDiagnosticVerifiedSimilarCases(input: DiagnosticSimilarCaseRetrievalInput) {
  const occurredAt = validDate(input.occurredAt, "DGN-046 similar-case retrieval requires a valid timestamp.");
  const requestedBy = input.requestedBy.trim();
  if (!requestedBy) throw new Error("DGN-046 similar-case retrieval requires a requester.");
  const minimumScore = input.minimumScore ?? 0.45;
  const excluded: Array<{ caseId: string; reasonCode: DiagnosticSimilarCaseExclusionReason }> = input.library.flatMap((item): Array<{ caseId: string; reasonCode: DiagnosticSimilarCaseExclusionReason }> => {
    if (item.family !== input.query.family) return [{ caseId: item.caseId, reasonCode: "FAMILY_MISMATCH" as const }];
    if (item.verifiedOutcome !== "VERIFIED_REPAIR") return [{ caseId: item.caseId, reasonCode: "UNVERIFIED_OUTCOME" as const }];
    if (!checksumOk(item.verificationChecksum)) return [{ caseId: item.caseId, reasonCode: "CHECKSUM_INVALID" as const }];
    if (!item.permissionTags.every((tag) => input.query.permissionTags.map(normalized).includes(normalized(tag)))) return [{ caseId: item.caseId, reasonCode: "PERMISSION_FILTERED" as const }];
    return [];
  });
  const candidates = input.library.filter((item) => !excluded.some((excludedItem) => excludedItem.caseId === item.caseId)).map((item) => {
    const configOverlap = overlap(item.vehicle.configurationTags, input.query.vehicle.configurationTags);
    const symptomOverlap = overlap(item.symptoms, input.query.symptoms);
    const evidenceOverlap = overlap(item.evidenceKeys, input.query.evidenceKeys);
    const modelBonus = normalized(item.vehicle.make) === normalized(input.query.vehicle.make) && normalized(item.vehicle.model) === normalized(input.query.vehicle.model) ? 0.12 : 0;
    const score = Math.min(1, Number(((configOverlap * 0.12) + (symptomOverlap * 0.18) + (evidenceOverlap * 0.16) + modelBonus).toFixed(3)));
    const warnings = unique([
      score < 0.7 ? "LOW_CONFIDENCE_MATCH" : "",
      configOverlap === 0 ? "CONFIGURATION_MISMATCH" : "",
      evidenceOverlap === 0 ? "EVIDENCE_GAP" : ""
    ]) as DiagnosticSimilarityWarning[];
    return { caseId: item.caseId, score, family: item.family, confirmedCauseKey: item.confirmedCauseKey, verifiedOutcome: item.verifiedOutcome, differenceExplanation: `${configOverlap} configuration, ${symptomOverlap} symptom, and ${evidenceOverlap} evidence overlaps.`, warnings, verificationChecksum: item.verificationChecksum };
  }).filter((item) => item.score >= minimumScore).sort((left, right) => right.score - left.score || left.caseId.localeCompare(right.caseId)).slice(0, 5);
  const result = {
    version: DIAGNOSTIC_VERIFIED_SIMILAR_CASE_RETRIEVAL_VERSION,
    occurredAt,
    requestedBy,
    status: candidates.length ? "MATCHES_AVAILABLE" as const : "NO_SAFE_MATCHES" as const,
    matches: candidates,
    excludedCases: excluded,
    warningCodes: unique([excluded.some((item) => item.reasonCode === "UNVERIFIED_OUTCOME") ? "UNVERIFIED_CASE_EXCLUDED" : "", excluded.some((item) => item.reasonCode === "PERMISSION_FILTERED") ? "PERMISSION_FILTERED" : ""]),
    authorityBoundary
  };
  return { ...result, retrievalChecksum: hashEnterpriseCommand({ input, result }) };
}

export function createDiagnosticControlledCalibrationProposal(input: DiagnosticCalibrationProposalInput) {
  const occurredAt = validDate(input.occurredAt, "DGN-047 calibration proposal requires a valid timestamp.");
  const proposedBy = input.proposedBy.trim();
  if (!proposedBy) throw new Error("DGN-047 calibration proposal requires a proposer.");
  if (input.proposalSummary.trim().length < 20) throw new Error("DGN-047 calibration proposal requires a meaningful summary.");
  const verifiedCases = input.outcomeWindow.filter((item) => item.verifiedOutcome === "VERIFIED_REPAIR" && checksumOk(item.verificationChecksum));
  const approvers = unique(input.independentApprovers.map(normalized).filter((item) => item !== normalized(proposedBy)));
  const improvement = Number((input.offlineEvaluation.proposedAccuracy - input.offlineEvaluation.baselineAccuracy).toFixed(4));
  const holdCodes = unique([
    verifiedCases.length >= 3 ? "" : "DGN047_VERIFIED_OUTCOME_SAMPLE_REQUIRED",
    input.offlineEvaluation.sampleSize >= verifiedCases.length && input.offlineEvaluation.sampleSize >= 3 ? "" : "DGN047_OFFLINE_EVALUATION_SAMPLE_REQUIRED",
    improvement > 0 ? "" : "DGN047_NO_MEASURED_IMPROVEMENT",
    input.offlineEvaluation.safetyRegressionCount === 0 ? "" : "DGN047_SAFETY_REGRESSION_BLOCK",
    input.rollbackPlanDocumented ? "" : "DGN047_ROLLBACK_PLAN_REQUIRED",
    input.shadowMonitoringDocumented ? "" : "DGN047_SHADOW_MONITORING_REQUIRED",
    approvers.length >= 2 ? "" : "DGN047_INDEPENDENT_APPROVAL_REQUIRED"
  ]);
  const result = {
    version: DIAGNOSTIC_CONTROLLED_CALIBRATION_PROPOSAL_VERSION,
    occurredAt,
    proposedBy,
    target: input.target,
    family: input.family,
    status: holdCodes.length ? "HELD_FOR_REVIEW" as const : "READY_FOR_SHADOW_EVALUATION" as const,
    holdCodes,
    metrics: { verifiedOutcomeCount: verifiedCases.length, sampleSize: input.offlineEvaluation.sampleSize, baselineAccuracy: input.offlineEvaluation.baselineAccuracy, proposedAccuracy: input.offlineEvaluation.proposedAccuracy, improvement, unnecessaryPartsDelta: input.offlineEvaluation.unnecessaryPartsDelta },
    warningCodes: ["DGN047_NO_SELF_MODIFYING_PRODUCTION_LOGIC"],
    authorityBoundary
  };
  return { ...result, proposalChecksum: hashEnterpriseCommand({ input, result }) };
}

export function evaluateDiagnosticAiGatewayReadiness(input: DiagnosticAiGatewayReadinessInput) {
  const occurredAt = validDate(input.occurredAt, "DGN-048 AI gateway readiness requires a valid timestamp.");
  const requestedBy = input.requestedBy.trim();
  const signatures = unique(input.acceptanceSignedBy.map(normalized));
  const holdCodes = unique([
    requestedBy ? "" : "DGN048_REQUESTER_REQUIRED",
    input.providerNeutralRegistryReady ? "" : "DGN048_PROVIDER_REGISTRY_REQUIRED",
    input.permissionFilteredRetrievalReady ? "" : "DGN048_PERMISSION_FILTERED_RETRIEVAL_REQUIRED",
    input.citationAndSourceVersionRequired ? "" : "DGN048_CITATIONS_REQUIRED",
    input.promptModelToolVersioningReady ? "" : "DGN048_PROMPT_MODEL_TOOL_VERSIONING_REQUIRED",
    input.privacyControlsReady ? "" : "DGN048_PRIVACY_CONTROLS_REQUIRED",
    input.injectionControlsReady ? "" : "DGN048_INJECTION_CONTROLS_REQUIRED",
    input.deterministicOutputValidationReady ? "" : "DGN048_OUTPUT_VALIDATION_REQUIRED",
    input.telemetryReady ? "" : "DGN048_TELEMETRY_REQUIRED",
    input.costLatencyLimitsReady ? "" : "DGN048_COST_LATENCY_LIMITS_REQUIRED",
    input.killSwitchVerified ? "" : "DGN048_KILL_SWITCH_REQUIRED",
    input.disabledModeVerified ? "" : "DGN048_DISABLED_MODE_REQUIRED",
    input.redTeamScenarioCount >= 5 ? "" : "DGN048_RED_TEAM_SCENARIOS_REQUIRED",
    signatures.length >= 2 ? "" : "DGN048_ACCEPTANCE_SIGNATURES_REQUIRED"
  ]);
  const result = {
    version: DIAGNOSTIC_AI_GATEWAY_READINESS_VERSION,
    occurredAt,
    requestedBy,
    mode: input.mode,
    status: input.mode === "DISABLED" ? "DISABLED_READY" as const : holdCodes.length ? "HELD" as const : "READY_FOR_SUPERVISED_SHADOW" as const,
    holdCodes: input.mode === "DISABLED" ? [] : holdCodes,
    dashboard: [
      { key: "RETRIEVAL", label: "Permission-filtered cited retrieval", status: input.permissionFilteredRetrievalReady && input.citationAndSourceVersionRequired ? "READY" as const : "HOLD" as const },
      { key: "SAFETY", label: "Privacy, injection, validation, and red-team controls", status: input.privacyControlsReady && input.injectionControlsReady && input.deterministicOutputValidationReady && input.redTeamScenarioCount >= 5 ? "READY" as const : "HOLD" as const },
      { key: "OPERATIONS", label: "Telemetry, cost/latency, kill switch, and disabled mode", status: input.telemetryReady && input.costLatencyLimitsReady && input.killSwitchVerified && input.disabledModeVerified ? "READY" as const : "HOLD" as const }
    ],
    authorityBoundary
  };
  return { ...result, gatewayChecksum: hashEnterpriseCommand({ input, result }) };
}

export function createDiagnosticLowRiskAiAssistanceDraft(input: DiagnosticLowRiskAiAssistanceInput) {
  const occurredAt = validDate(input.occurredAt, "DGN-049 low-risk AI assistance requires a valid timestamp.");
  const citationsValid = input.sourceCitations.length > 0 && input.sourceCitations.every((citation) => citation.sourceId.trim() && citation.version.trim() && checksumOk(citation.checksum));
  const holdCodes = unique([
    input.requestedBy.trim() ? "" : "DGN049_REQUESTER_REQUIRED",
    input.gateway.status === "READY_FOR_SUPERVISED_SHADOW" || input.gateway.status === "DISABLED_READY" ? "" : "DGN049_GATEWAY_NOT_READY",
    citationsValid ? "" : "DGN049_CITED_SOURCES_REQUIRED",
    input.draftText.trim().length >= 20 ? "" : "DGN049_DRAFT_CONTENT_REQUIRED",
    input.humanConfirmationRequired ? "" : "DGN049_HUMAN_CONFIRMATION_REQUIRED"
  ]);
  const result = {
    version: DIAGNOSTIC_LOW_RISK_AI_ASSISTANCE_VERSION,
    occurredAt,
    requestedBy: input.requestedBy.trim(),
    task: input.task,
    status: holdCodes.length ? "HELD" as const : "READY_FOR_HUMAN_REVIEW" as const,
    holdCodes,
    citationCount: input.sourceCitations.length,
    warningCodes: ["DGN049_DRAFT_IS_NOT_AUTHORITY", "DGN049_HUMAN_MUST_CONFIRM_OR_EDIT"],
    authorityBoundary
  };
  return { ...result, draftChecksum: hashEnterpriseCommand({ input, result }) };
}

export function evaluateDiagnosticAdvancedAiDraftGate(input: DiagnosticAdvancedAiDraftGateInput) {
  const occurredAt = validDate(input.occurredAt, "DGN-050 advanced AI draft gate requires a valid timestamp.");
  const retrievalReady = input.similarCaseRetrieval.status === "MATCHES_AVAILABLE" && checksumOk(input.similarCaseRetrieval.retrievalChecksum);
  const holdCodes = unique([
    input.requestedBy.trim() ? "" : "DGN050_REQUESTER_REQUIRED",
    input.gateway.status === "READY_FOR_SUPERVISED_SHADOW" ? "" : "DGN050_GATEWAY_SHADOW_READY_REQUIRED",
    retrievalReady ? "" : "DGN050_SIMILAR_CASE_RETRIEVAL_REQUIRED",
    input.groundednessScore >= 0.9 ? "" : "DGN050_GROUNDEDNESS_THRESHOLD_REQUIRED",
    input.abstentionRate >= 0.15 ? "" : "DGN050_ABSTENTION_BEHAVIOR_REQUIRED",
    input.harmfulOutputFindings === 0 ? "" : "DGN050_HARMFUL_OUTPUT_BLOCK",
    input.privacyFindings === 0 ? "" : "DGN050_PRIVACY_FINDING_BLOCK",
    input.humanReviewWorkflowReady ? "" : "DGN050_HUMAN_REVIEW_WORKFLOW_REQUIRED",
    input.offlineEvaluationComplete ? "" : "DGN050_OFFLINE_EVALUATION_REQUIRED"
  ]);
  const result = {
    version: DIAGNOSTIC_ADVANCED_AI_DRAFT_GATE_VERSION,
    occurredAt,
    requestedBy: input.requestedBy.trim(),
    draftType: input.draftType,
    status: holdCodes.length ? "HELD" as const : "READY_FOR_SHADOW_DRAFT_REVIEW" as const,
    holdCodes,
    metrics: { groundednessScore: input.groundednessScore, abstentionRate: input.abstentionRate, harmfulOutputFindings: input.harmfulOutputFindings, privacyFindings: input.privacyFindings, similarCaseMatches: input.similarCaseRetrieval.matches.length },
    warningCodes: ["DGN050_AI_DRAFTS_REMAIN_SHADOW_ONLY", "DGN050_NO_DIAGNOSIS_OR_REPAIR_AUTHORITY"],
    authorityBoundary
  };
  return { ...result, gateChecksum: hashEnterpriseCommand({ input, result }) };
}

export function evaluateDiagnosticEnterpriseScaleReadiness(input: DiagnosticEnterpriseScaleReadinessInput) {
  const occurredAt = validDate(input.occurredAt, "DG-G10 enterprise scale readiness requires a valid timestamp.");
  const requestedBy = input.requestedBy.trim();
  const signatures = unique(input.acceptanceSignedBy.map(normalized));
  const holdCodes = unique([
    requestedBy ? "" : "DGG10_REQUESTER_REQUIRED",
    input.multiLocationPolicyInheritanceVerified ? "" : "DGG10_MULTI_LOCATION_POLICY_REQUIRED",
    input.fleetSpecialtyPartitionsVerified ? "" : "DGG10_FLEET_SPECIALTY_PARTITIONS_REQUIRED",
    input.approvedAdapterIsolationVerified ? "" : "DGG10_ADAPTER_ISOLATION_REQUIRED",
    input.licensedConnectorContractsVerified ? "" : "DGG10_LICENSED_CONNECTOR_CONTRACTS_REQUIRED",
    input.telemetryIngestionGoverned ? "" : "DGG10_TELEMETRY_INGESTION_GOVERNANCE_REQUIRED",
    input.reconciliationAndDegradedBehaviorVerified ? "" : "DGG10_RECONCILIATION_DEGRADED_BEHAVIOR_REQUIRED",
    input.loadTestP95Ms > 0 && input.loadTestP95Ms <= 750 ? "" : "DGG10_LOAD_TEST_P95_REQUIRED",
    input.recoveryPointObjectiveMinutes > 0 && input.recoveryPointObjectiveMinutes <= 15 ? "" : "DGG10_RECOVERY_POINT_OBJECTIVE_REQUIRED",
    input.recoveryTimeObjectiveMinutes > 0 && input.recoveryTimeObjectiveMinutes <= 60 ? "" : "DGG10_RECOVERY_TIME_OBJECTIVE_REQUIRED",
    input.regionalDataControlsVerified ? "" : "DGG10_REGIONAL_DATA_CONTROLS_REQUIRED",
    input.supportModelDocumented ? "" : "DGG10_SUPPORT_MODEL_REQUIRED",
    input.changeGovernanceDocumented ? "" : "DGG10_CHANGE_GOVERNANCE_REQUIRED",
    input.serviceExtractionJustifiedByEvidence ? "" : "DGG10_SERVICE_EXTRACTION_EVIDENCE_REQUIRED",
    signatures.length >= 2 ? "" : "DGG10_ACCEPTANCE_SIGNATURES_REQUIRED"
  ]);
  const result = {
    version: DIAGNOSTIC_ENTERPRISE_SCALE_READINESS_VERSION,
    occurredAt,
    requestedBy,
    status: holdCodes.length ? "HELD" as const : "READY_FOR_ENTERPRISE_SCALE_REVIEW" as const,
    holdCodes,
    dashboard: [
      { key: "LOCATION_POLICY", label: "Multi-location policy inheritance", status: input.multiLocationPolicyInheritanceVerified && input.fleetSpecialtyPartitionsVerified ? "READY" as const : "HOLD" as const },
      { key: "CONNECTORS", label: "Adapters and licensed connectors", status: input.approvedAdapterIsolationVerified && input.licensedConnectorContractsVerified && input.telemetryIngestionGoverned ? "READY" as const : "HOLD" as const },
      { key: "RESILIENCE", label: "Load, recovery, degraded operation", status: input.reconciliationAndDegradedBehaviorVerified && input.loadTestP95Ms <= 750 && input.recoveryPointObjectiveMinutes <= 15 && input.recoveryTimeObjectiveMinutes <= 60 ? "READY" as const : "HOLD" as const },
      { key: "GOVERNANCE", label: "Regional data, support, change governance", status: input.regionalDataControlsVerified && input.supportModelDocumented && input.changeGovernanceDocumented && input.serviceExtractionJustifiedByEvidence ? "READY" as const : "HOLD" as const }
    ],
    metrics: { loadTestP95Ms: input.loadTestP95Ms, recoveryPointObjectiveMinutes: input.recoveryPointObjectiveMinutes, recoveryTimeObjectiveMinutes: input.recoveryTimeObjectiveMinutes, acceptanceSignatureCount: signatures.length },
    warningCodes: ["DGG10_READY_FOR_REVIEW_IS_NOT_ENTERPRISE_PRODUCTION_APPROVAL", "DGG10_EXTERNAL_CONNECTORS_REMAIN_ISOLATED"],
    authorityBoundary
  };
  return { ...result, gateChecksum: hashEnterpriseCommand({ input, result }) };
}
