import { hashEnterpriseCommand } from "@/server/enterprise-command/domain";

export const DIAGNOSTIC_VERIFICATION_POLICY_VERSION = "DGN-033-034/POLICY/1.0.0";
export const DIAGNOSTIC_VERIFICATION_ACTIONS = ["PLAN", "PASS", "FAIL", "INCONCLUSIVE", "UNSAFE"] as const;
export type DiagnosticVerificationAction = (typeof DIAGNOSTIC_VERIFICATION_ACTIONS)[number];
export type DiagnosticVerificationStatus = "PLANNED" | "PASSED" | "FAILED" | "INCONCLUSIVE" | "UNSAFE";

export type DiagnosticVerificationCheck = {
  key: string;
  label: string;
  method: "FUNCTION_TEST" | "MEASUREMENT" | "ROAD_TEST" | "SCAN" | "VISUAL" | "CUSTOMER_CONCERN_REPRODUCTION";
  expectedResult: string;
  required: boolean;
  safetyCritical: boolean;
};

export type DiagnosticVerificationControlInput = {
  action: DiagnosticVerificationAction;
  diagnosticCaseId: string;
  currentCaseStatus: string;
  riskTier: "R0" | "R1" | "R2" | "R3" | "R4";
  conclusion: { id: string; status: string; conclusionChecksum: string; causeStatement: string | null } | null;
  repairHandoff: { id: string; status: string; repairDiagnosisVersionId: string | null; handoffChecksum: string; occurredAt: string } | null;
  latestVerification: { id: string; status: DiagnosticVerificationStatus } | null;
  originalConcern: string;
  repairSummary: string;
  checks: DiagnosticVerificationCheck[];
  performedChecks: Array<{ checkKey: string; result: "PASS" | "FAIL" | "NOT_PERFORMED"; evidenceKeys: string[]; notes: string | null }>;
  regressionChecks: string[];
  roadTestSafety: "NOT_REQUIRED" | "SAFE" | "UNSAFE" | "UNKNOWN";
  independentReviewRequired: boolean;
  reviewerUserId: string | null;
  actorUserId: string;
};

const canonical = (value: string) => value.trim().toUpperCase();
const unique = (values: string[]) => [...new Set(values.map(canonical).filter(Boolean))].sort((a, b) => a.localeCompare(b));

function text(value: unknown, label: string, maximum = 1000, minimum = 1) {
  const result = typeof value === "string" ? value.trim() : "";
  if (result.length < minimum || result.length > maximum) throw new Error(`${label} must be ${minimum} through ${maximum} characters.`);
  return result;
}

function optionalText(value: unknown, maximum = 1000) {
  const result = typeof value === "string" ? value.trim() : "";
  if (result.length > maximum) throw new Error(`Text value must be ${maximum} characters or fewer.`);
  return result || null;
}

function positiveVersion(value: unknown) {
  const result = Number(value);
  if (!Number.isInteger(result) || result < 1) throw new Error("Expected diagnostic-case version must be a positive integer.");
  return result;
}

function list(value: unknown, label: string, required = false) {
  if (!Array.isArray(value)) throw new Error(`${label} must be a list.`);
  const result = unique(value.map(String));
  if (required && !result.length) throw new Error(`${label} requires at least one item.`);
  return result;
}

function normalizeCheck(value: unknown, index: number): DiagnosticVerificationCheck {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`Verification check ${index + 1} is invalid.`);
  const raw = value as Record<string, unknown>;
  const method = canonical(String(raw.method ?? "")) as DiagnosticVerificationCheck["method"];
  if (!["FUNCTION_TEST", "MEASUREMENT", "ROAD_TEST", "SCAN", "VISUAL", "CUSTOMER_CONCERN_REPRODUCTION"].includes(method)) throw new Error(`Verification check ${index + 1} method is invalid.`);
  return { key: canonical(text(raw.key, `Verification check ${index + 1} key`, 100)), label: text(raw.label, `Verification check ${index + 1} label`, 300), method, expectedResult: text(raw.expectedResult, `Verification check ${index + 1} expected result`, 500), required: raw.required !== false, safetyCritical: raw.safetyCritical === true };
}

function normalizePerformedCheck(value: unknown, index: number) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`Performed verification check ${index + 1} is invalid.`);
  const raw = value as Record<string, unknown>;
  const result = canonical(String(raw.result ?? "")) as "PASS" | "FAIL" | "NOT_PERFORMED";
  if (!["PASS", "FAIL", "NOT_PERFORMED"].includes(result)) throw new Error(`Performed verification check ${index + 1} result is invalid.`);
  return { checkKey: canonical(text(raw.checkKey, `Performed verification check ${index + 1} key`, 100)), result, evidenceKeys: list(raw.evidenceKeys ?? [], `Performed verification check ${index + 1} evidence`), notes: optionalText(raw.notes, 1000) };
}

function statusFor(action: DiagnosticVerificationAction): DiagnosticVerificationStatus {
  if (action === "PLAN") return "PLANNED";
  if (action === "PASS") return "PASSED";
  if (action === "FAIL") return "FAILED";
  if (action === "UNSAFE") return "UNSAFE";
  return "INCONCLUSIVE";
}

export function normalizeDiagnosticVerificationCommand(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Diagnostic verification request must be an object.");
  const raw = value as Record<string, unknown>;
  const action = canonical(String(raw.action ?? "")) as DiagnosticVerificationAction;
  if (!DIAGNOSTIC_VERIFICATION_ACTIONS.includes(action)) throw new Error("Diagnostic verification action is invalid.");
  return {
    action,
    expectedVersion: positiveVersion(raw.expectedVersion),
    idempotencyKey: text(raw.idempotencyKey, "Verification idempotency key", 200),
    reason: text(raw.reason, "Verification reason", 500, 10),
    conclusionId: optionalText(raw.conclusionId, 200),
    repairHandoffId: optionalText(raw.repairHandoffId, 200),
    originalConcern: text(raw.originalConcern, "Original concern", 2000),
    repairSummary: text(raw.repairSummary, "Repair summary", 2000),
    checks: Array.isArray(raw.checks) ? raw.checks.map(normalizeCheck) : [],
    performedChecks: Array.isArray(raw.performedChecks) ? raw.performedChecks.map(normalizePerformedCheck) : [],
    regressionChecks: list(raw.regressionChecks ?? [], "Regression checks"),
    roadTestSafety: canonical(String(raw.roadTestSafety ?? "NOT_REQUIRED")) as DiagnosticVerificationControlInput["roadTestSafety"],
    limitations: list(raw.limitations ?? [], "Verification limitations"),
    reviewerUserId: optionalText(raw.reviewerUserId, 200),
    supersedesId: optionalText(raw.supersedesId, 200)
  };
}

export function evaluateDiagnosticVerificationControls(input: DiagnosticVerificationControlInput) {
  const blockers: string[] = [];
  const warnings: string[] = [];
  if (!input.conclusion || input.conclusion.status !== "CONFIRMED") blockers.push("VERIFICATION_CONFIRMED_CONCLUSION_REQUIRED");
  if (!input.repairHandoff || input.repairHandoff.status !== "PUBLISHED" || !input.repairHandoff.repairDiagnosisVersionId) blockers.push("VERIFICATION_PUBLISHED_REPAIR_DIAGNOSIS_REQUIRED");
  if (input.currentCaseStatus !== "HANDED_OFF" && input.currentCaseStatus !== "POST_REPAIR_VERIFICATION") blockers.push("VERIFICATION_CASE_NOT_READY");
  if (!input.originalConcern.trim() || !input.repairSummary.trim()) blockers.push("VERIFICATION_CONCERN_AND_REPAIR_SUMMARY_REQUIRED");
  if (!input.checks.length) blockers.push("VERIFICATION_PLAN_CHECKS_REQUIRED");
  if (input.action === "PLAN" && input.latestVerification && input.latestVerification.status === "PLANNED") blockers.push("VERIFICATION_PLAN_ALREADY_ACTIVE");
  if (input.action !== "PLAN") {
    if (!input.latestVerification || input.latestVerification.status !== "PLANNED") blockers.push("VERIFICATION_ACTIVE_PLAN_REQUIRED");
    if (!input.performedChecks.length) blockers.push("VERIFICATION_RESULTS_REQUIRED");
    const performed = new Map(input.performedChecks.map((check) => [check.checkKey, check]));
    const missingRequired = input.checks.filter((check) => check.required && performed.get(check.key)?.result !== "PASS");
    if (input.action === "PASS" && missingRequired.length) blockers.push("VERIFICATION_REQUIRED_CHECK_NOT_PASSED");
    if (input.action === "PASS" && input.performedChecks.some((check) => check.result === "FAIL")) blockers.push("VERIFICATION_FAILED_CHECK_PRESENT");
    if (input.action === "PASS" && input.regressionChecks.length < 1) blockers.push("VERIFICATION_REGRESSION_CHECK_REQUIRED");
  }
  if (input.action === "PASS" && input.roadTestSafety === "UNSAFE") blockers.push("VERIFICATION_UNSAFE_ROAD_TEST");
  if (input.action === "UNSAFE" && input.roadTestSafety !== "UNSAFE") blockers.push("VERIFICATION_UNSAFE_DISPOSITION_REQUIRES_UNSAFE_CONTEXT");
  if (input.riskTier === "R3" && input.action === "PASS") {
    if (!input.independentReviewRequired) blockers.push("VERIFICATION_INDEPENDENT_REVIEW_POLICY_REQUIRED");
    if (!input.reviewerUserId) blockers.push("VERIFICATION_INDEPENDENT_REVIEW_REQUIRED");
    if (input.reviewerUserId === input.actorUserId) blockers.push("VERIFICATION_REVIEWER_MUST_BE_INDEPENDENT");
  }
  if (input.checks.some((check) => check.safetyCritical)) warnings.push("VERIFICATION_SAFETY_CRITICAL_CHECK_INCLUDED");
  const reasonCodes = unique(blockers);
  const warningCodes = unique(warnings);
  const allowed = reasonCodes.length === 0;
  const status = statusFor(input.action);
  const decision = { allowed, status, reasonCodes, warningCodes, policyVersion: DIAGNOSTIC_VERIFICATION_POLICY_VERSION, checkCount: input.checks.length, performedCheckCount: input.performedChecks.length };
  return { ...decision, decisionChecksum: hashEnterpriseCommand({ input, decision }) };
}

export function diagnosticVerificationId(organizationId: string, caseId: string, idempotencyKey: string) {
  return `dvr_${hashEnterpriseCommand({ organizationId, caseId, idempotencyKey }).slice(0, 24)}`;
}
