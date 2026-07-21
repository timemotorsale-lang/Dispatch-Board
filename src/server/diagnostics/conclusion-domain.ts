import { hashEnterpriseCommand } from "@/server/enterprise-command/domain";

export const DIAGNOSTIC_CONCLUSION_POLICY_VERSION = "DGN-026/POLICY/1.0.0";
export const DIAGNOSTIC_CONCLUSION_ACTIONS = ["PROPOSE", "CONFIRM", "REJECT", "SUPERSEDE", "ABSTAIN", "ESCALATE"] as const;
export type DiagnosticConclusionAction = (typeof DIAGNOSTIC_CONCLUSION_ACTIONS)[number];
export type DiagnosticConclusionStatus = "PROPOSED" | "CONFIRMED" | "REJECTED" | "ABSTAINED" | "ESCALATED";

export type DiagnosticConclusionCandidate = {
  hypothesisId: string; hypothesisKey: string; status: string; causalState: string; assumptions: string[];
  supportingEvidenceKeys: string[]; contradictingEvidenceKeys: string[]; missingExpectedEvidenceKeys: string[];
};
export type DiagnosticConclusionControlSnapshot = {
  action: DiagnosticConclusionAction; diagnosticCaseId: string; riskTier: "R0" | "R1" | "R2" | "R3" | "R4";
  reasoningEvaluationId: string; reasoningResultChecksum: string; reasoningComplete: boolean; reasoningAbstentionRequired: boolean; reasoningHardBlockers: string[];
  selectedCandidate: DiagnosticConclusionCandidate | null; viableCandidates: DiagnosticConclusionCandidate[];
  causeStatement: string | null; uncertainty: "LOW" | "MEDIUM" | "HIGH" | "UNKNOWN"; evidenceBasisKeys: string[];
  addressedAlternativeHypothesisKeys: string[]; limitations: string[]; sourceVersions: Array<{ sourceKey: string; version: string; rightsStatus: string; current: boolean }>;
  qualityDisposition: "READY" | "BLOCKED" | "ABSTAIN" | "NOT_APPLICABLE";
  qualificationValid: boolean; confirmationCapability: boolean; highRiskCapability: boolean; evidenceSufficient: boolean;
  authorUserId: string; independentReviewRequired: boolean; reviewerUserId: string | null; reviewerQualified: boolean; reviewerAuthorized: boolean;
  priorConclusion: { id: string; status: DiagnosticConclusionStatus; hypothesisKey: string | null } | null;
};

const canonical = (value: string) => value.trim().toUpperCase();
const unique = (values: string[]) => [...new Set(values.map(canonical).filter(Boolean))].sort((a, b) => a.localeCompare(b));

function statusFor(action: DiagnosticConclusionAction): DiagnosticConclusionStatus {
  if (action === "PROPOSE") return "PROPOSED"; if (action === "CONFIRM" || action === "SUPERSEDE") return "CONFIRMED";
  if (action === "REJECT") return "REJECTED"; if (action === "ABSTAIN") return "ABSTAINED"; return "ESCALATED";
}

export function evaluateDiagnosticConclusionControls(input: DiagnosticConclusionControlSnapshot) {
  if (!/^[0-9a-f]{64}$/.test(input.reasoningResultChecksum)) throw new Error("Conclusion controls require an immutable reasoning result checksum.");
  if (!DIAGNOSTIC_CONCLUSION_ACTIONS.includes(input.action)) throw new Error("Diagnostic conclusion action is invalid.");
  const blockers: string[] = []; const warnings: string[] = []; const selected = input.selectedCandidate;
  const decisive = ["PROPOSE", "CONFIRM", "SUPERSEDE"].includes(input.action); const confirming = ["CONFIRM", "SUPERSEDE"].includes(input.action);
  if (decisive && !selected) blockers.push("CONCLUSION_HYPOTHESIS_REQUIRED");
  if (decisive && (!input.causeStatement || input.causeStatement.trim().length < 10)) blockers.push("CONCLUSION_CAUSE_STATEMENT_REQUIRED");
  if (decisive && !input.reasoningComplete) blockers.push("CONCLUSION_REASONING_INCOMPLETE");
  if (decisive && input.reasoningAbstentionRequired) blockers.push("CONCLUSION_REASONING_REQUIRES_ABSTENTION");
  if (decisive && input.reasoningHardBlockers.length) blockers.push(...input.reasoningHardBlockers.map((item) => `CONCLUSION_REASONING_BLOCKER:${canonical(item)}`));
  if (decisive && input.qualityDisposition !== "READY") blockers.push(`CONCLUSION_QUALITY_${input.qualityDisposition}`);
  if (decisive && !input.qualificationValid) blockers.push("CONCLUSION_QUALIFICATION_REQUIRED");
  if (decisive && !input.confirmationCapability) blockers.push("CONCLUSION_CONFIRMATION_CAPABILITY_REQUIRED");
  if (decisive && input.riskTier === "R4") blockers.push("CONCLUSION_R4_PROHIBITED");
  if (decisive && input.sourceVersions.some((source) => source.rightsStatus !== "AUTHORIZED" || !source.current)) blockers.push("CONCLUSION_SOURCE_UNAVAILABLE");
  if (selected && ["CONTRADICTED", "OUT_OF_MODEL", "REJECTED_BY_TECHNICIAN", "SUPERSEDED"].includes(selected.status)) blockers.push("CONCLUSION_HYPOTHESIS_NOT_VIABLE");
  if (selected?.causalState === "ASSOCIATION_ONLY") blockers.push("CONCLUSION_ASSOCIATION_ONLY");
  if (selected?.contradictingEvidenceKeys.length) blockers.push("CONCLUSION_UNRESOLVED_CONTRADICTION");
  if (confirming && !input.evidenceSufficient) blockers.push("CONCLUSION_EVIDENCE_INSUFFICIENT");
  if (confirming && !input.evidenceBasisKeys.length) blockers.push("CONCLUSION_EVIDENCE_BASIS_REQUIRED");
  if (confirming && selected && selected.supportingEvidenceKeys.length < Math.max(1, selected.assumptions.length)) blockers.push("CONCLUSION_MULTIPLE_CAUSE_SUPPORT_INCOMPLETE");
  const alternatives = input.viableCandidates.filter((candidate) => candidate.hypothesisKey !== selected?.hypothesisKey).map((candidate) => canonical(candidate.hypothesisKey));
  const addressed = new Set(unique(input.addressedAlternativeHypothesisKeys)); if (confirming && alternatives.some((item) => !addressed.has(item))) blockers.push("CONCLUSION_ALTERNATIVES_NOT_ADDRESSED");
  if (confirming && input.riskTier === "R3" && !input.highRiskCapability) blockers.push("CONCLUSION_HIGH_RISK_CAPABILITY_REQUIRED");
  if (confirming && input.independentReviewRequired) {
    if (!input.reviewerUserId) blockers.push("CONCLUSION_INDEPENDENT_REVIEW_REQUIRED");
    else if (input.reviewerUserId === input.authorUserId) blockers.push("CONCLUSION_REVIEWER_MUST_BE_INDEPENDENT");
    if (!input.reviewerQualified) blockers.push("CONCLUSION_REVIEWER_QUALIFICATION_REQUIRED");
    if (!input.reviewerAuthorized) blockers.push("CONCLUSION_REVIEWER_AUTHORITY_REQUIRED");
  }
  if (input.action === "CONFIRM" && input.priorConclusion?.status !== "PROPOSED") blockers.push("CONCLUSION_PROPOSAL_REQUIRED");
  if (input.action === "CONFIRM" && input.priorConclusion?.hypothesisKey && input.priorConclusion.hypothesisKey !== selected?.hypothesisKey) blockers.push("CONCLUSION_CONFIRM_MUST_MATCH_PROPOSAL");
  if (input.action === "REJECT" && input.priorConclusion?.status !== "PROPOSED") blockers.push("CONCLUSION_REJECT_REQUIRES_PROPOSAL");
  if (input.action === "SUPERSEDE" && input.priorConclusion?.status !== "CONFIRMED") blockers.push("CONCLUSION_SUPERSEDE_REQUIRES_CONFIRMED_PRIOR");
  if (input.action === "PROPOSE" && input.priorConclusion && !["REJECTED", "ABSTAINED", "ESCALATED"].includes(input.priorConclusion.status)) blockers.push("CONCLUSION_PRIOR_DECISION_REQUIRES_EXPLICIT_ACTION");
  if (["ABSTAIN", "ESCALATE"].includes(input.action) && !input.limitations.length) blockers.push("CONCLUSION_LIMITATION_REQUIRED");
  if (input.uncertainty === "HIGH" || input.uncertainty === "UNKNOWN") warnings.push("CONCLUSION_HIGH_UNCERTAINTY");
  if (selected?.missingExpectedEvidenceKeys.length) warnings.push("CONCLUSION_EXPECTED_EFFECTS_MISSING");
  const reasonCodes = unique(blockers); const warningCodes = unique(warnings); const allowed = reasonCodes.length === 0;
  const decision = { action: input.action, status: statusFor(input.action), allowed, reasonCodes, warningCodes, hypothesisId: selected?.hypothesisId ?? null, hypothesisKey: selected?.hypothesisKey ?? null, alternativesAddressed: unique(input.addressedAlternativeHypothesisKeys), evidenceBasisKeys: unique(input.evidenceBasisKeys), reviewerUserId: input.reviewerUserId, policyVersion: DIAGNOSTIC_CONCLUSION_POLICY_VERSION };
  return { ...decision, decisionChecksum: hashEnterpriseCommand({ input, decision }) };
}

export function normalizeDiagnosticConclusionCommand(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Diagnostic conclusion request must be an object."); const raw = value as Record<string, unknown>;
  const action = typeof raw.action === "string" ? canonical(raw.action) as DiagnosticConclusionAction : "" as DiagnosticConclusionAction;
  const expectedVersion = Number(raw.expectedVersion); const idempotencyKey = typeof raw.idempotencyKey === "string" ? raw.idempotencyKey.trim() : ""; const reason = typeof raw.reason === "string" ? raw.reason.trim() : "";
  if (!DIAGNOSTIC_CONCLUSION_ACTIONS.includes(action)) throw new Error("Diagnostic conclusion action is invalid.");
  if (!Number.isInteger(expectedVersion) || expectedVersion < 1) throw new Error("Expected diagnostic-case version must be a positive integer.");
  if (!idempotencyKey || idempotencyKey.length > 200) throw new Error("Conclusion idempotency key is required and cannot exceed 200 characters.");
  if (reason.length < 10 || reason.length > 500) throw new Error("Conclusion command requires a reason of 10 through 500 characters.");
  const text = (name: string, maximum = 2000) => { const result = typeof raw[name] === "string" ? raw[name].trim() : ""; if (result.length > maximum) throw new Error(`${name} exceeds ${maximum} characters.`); return result || null; };
  const list = (name: string) => Array.isArray(raw[name]) ? unique((raw[name] as unknown[]).map(String)) : [];
  const uncertainty = typeof raw.uncertainty === "string" ? canonical(raw.uncertainty) : "UNKNOWN"; if (!["LOW", "MEDIUM", "HIGH", "UNKNOWN"].includes(uncertainty)) throw new Error("Conclusion uncertainty is invalid.");
  const abstentionDisposition = raw.abstentionDisposition === "NO_FAULT_FOUND" ? "NO_FAULT_FOUND" as const : "INCONCLUSIVE" as const;
  return { action, expectedVersion, idempotencyKey, reason, hypothesisId: text("hypothesisId", 200), causeStatement: text("causeStatement"), uncertainty: uncertainty as DiagnosticConclusionControlSnapshot["uncertainty"], evidenceBasisKeys: list("evidenceBasisKeys"), addressedAlternativeHypothesisKeys: list("addressedAlternativeHypothesisKeys"), limitations: list("limitations"), reviewerUserId: text("reviewerUserId", 200), supersedesId: text("supersedesId", 200), abstentionDisposition };
}

export function diagnosticConclusionId(organizationId: string, caseId: string, idempotencyKey: string) {
  return `dco_${hashEnterpriseCommand({ organizationId, caseId, idempotencyKey }).slice(0, 24)}`;
}
