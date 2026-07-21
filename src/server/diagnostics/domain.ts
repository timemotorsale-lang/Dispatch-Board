import { hashEnterpriseCommand } from "@/server/enterprise-command/domain";

export const DIAGNOSTIC_CASE_STATUSES = [
  "DRAFT", "TRIAGE", "TEST_PLAN_READY", "TESTING", "CAUSE_PROPOSED",
  "CONFIRMATION_REQUIRED", "CONFIRMED", "REPAIR_PLANNING", "HANDED_OFF",
  "POST_REPAIR_VERIFICATION", "VERIFIED_CLOSED", "WAITING_FOR_VEHICLE",
  "WAITING_FOR_AUTHORIZATION", "WAITING_FOR_TOOL", "WAITING_FOR_INFORMATION",
  "WAITING_FOR_PART", "ESCALATED", "INCONCLUSIVE", "NO_FAULT_FOUND",
  "ABANDONED", "REOPENED"
] as const;

export type DiagnosticCaseStatus = (typeof DIAGNOSTIC_CASE_STATUSES)[number];

export const DIAGNOSTIC_RISK_TIERS = ["R0", "R1", "R2", "R3", "R4"] as const;
export type DiagnosticRiskTier = (typeof DIAGNOSTIC_RISK_TIERS)[number];

const CREATE_REASON_CODES = ["CASE_NEW_CONCERN", "CASE_REPAIR_ORDER_INTAKE"] as const;
const ASSIGN_REASON_CODES = ["CASE_INITIAL_ASSIGNMENT", "CASE_REASSIGNED_CAPABILITY", "CASE_REASSIGNED_LOAD", "CASE_REASSIGNED_ESCALATION"] as const;

const TRANSITION_REASON_TARGETS: Readonly<Record<string, readonly DiagnosticCaseStatus[]>> = {
  CASE_TRIAGE_STARTED: ["TRIAGE"],
  CASE_PLAN_READY: ["TEST_PLAN_READY"],
  CASE_TESTING_STARTED: ["TESTING"],
  CASE_CAUSE_PROPOSED: ["CAUSE_PROPOSED"],
  CASE_CONFIRMATION_REQUIRED: ["CONFIRMATION_REQUIRED"],
  CASE_CAUSE_CONFIRMED: ["CONFIRMED"],
  CASE_REPAIR_PLANNING_STARTED: ["REPAIR_PLANNING"],
  CASE_HANDED_OFF: ["HANDED_OFF"],
  CASE_POST_REPAIR_VERIFICATION_STARTED: ["POST_REPAIR_VERIFICATION"],
  CASE_VERIFIED_CLOSED: ["VERIFIED_CLOSED"],
  CASE_VEHICLE_UNAVAILABLE: ["WAITING_FOR_VEHICLE"],
  CASE_AUTHORIZATION_REQUIRED: ["WAITING_FOR_AUTHORIZATION"],
  CASE_TOOL_UNAVAILABLE: ["WAITING_FOR_TOOL"],
  CASE_INFORMATION_REQUIRED: ["WAITING_FOR_INFORMATION"],
  CASE_PART_REQUIRED: ["WAITING_FOR_PART"],
  CASE_WAITING_RESOLVED: ["DRAFT", "TRIAGE", "TEST_PLAN_READY", "TESTING", "CAUSE_PROPOSED", "CONFIRMATION_REQUIRED", "CONFIRMED", "REPAIR_PLANNING", "HANDED_OFF", "POST_REPAIR_VERIFICATION"],
  CASE_ESCALATED_QUALIFICATION: ["ESCALATED"],
  CASE_ESCALATED_OUT_OF_MODEL: ["ESCALATED"],
  CASE_ESCALATED_SAFETY: ["ESCALATED"],
  CASE_ESCALATION_RESOLVED: ["DRAFT", "TRIAGE", "TEST_PLAN_READY", "TESTING", "CAUSE_PROPOSED", "CONFIRMATION_REQUIRED", "CONFIRMED", "REPAIR_PLANNING", "HANDED_OFF", "POST_REPAIR_VERIFICATION"],
  CASE_INCONCLUSIVE_EVIDENCE: ["INCONCLUSIVE"],
  CASE_NO_FAULT_FOUND: ["NO_FAULT_FOUND"],
  CASE_ABANDONED_SCOPE: ["ABANDONED"],
  CASE_REOPENED_RECURRENCE: ["REOPENED"],
  CASE_REOPEN_TRIAGE_STARTED: ["TRIAGE"]
};

const WAITING_STATUSES = new Set<DiagnosticCaseStatus>([
  "WAITING_FOR_VEHICLE", "WAITING_FOR_AUTHORIZATION", "WAITING_FOR_TOOL",
  "WAITING_FOR_INFORMATION", "WAITING_FOR_PART", "ESCALATED"
]);
const TERMINAL_STATUSES = new Set<DiagnosticCaseStatus>(["VERIFIED_CLOSED", "INCONCLUSIVE", "NO_FAULT_FOUND", "ABANDONED"]);

const NORMAL_TRANSITIONS: Readonly<Record<DiagnosticCaseStatus, readonly DiagnosticCaseStatus[]>> = {
  DRAFT: ["TRIAGE"],
  TRIAGE: ["TEST_PLAN_READY", "INCONCLUSIVE", "NO_FAULT_FOUND"],
  TEST_PLAN_READY: ["TRIAGE", "TESTING"],
  TESTING: ["TRIAGE", "CAUSE_PROPOSED", "INCONCLUSIVE", "NO_FAULT_FOUND"],
  CAUSE_PROPOSED: ["TESTING", "CONFIRMATION_REQUIRED", "CONFIRMED"],
  CONFIRMATION_REQUIRED: ["TESTING", "CONFIRMED"],
  CONFIRMED: ["TESTING", "REPAIR_PLANNING"],
  REPAIR_PLANNING: ["TESTING", "HANDED_OFF"],
  HANDED_OFF: ["REPAIR_PLANNING", "POST_REPAIR_VERIFICATION"],
  POST_REPAIR_VERIFICATION: ["TESTING", "VERIFIED_CLOSED"],
  VERIFIED_CLOSED: [],
  WAITING_FOR_VEHICLE: [],
  WAITING_FOR_AUTHORIZATION: [],
  WAITING_FOR_TOOL: [],
  WAITING_FOR_INFORMATION: [],
  WAITING_FOR_PART: [],
  ESCALATED: [],
  INCONCLUSIVE: [],
  NO_FAULT_FOUND: [],
  ABANDONED: [],
  REOPENED: ["TRIAGE"]
};

export class DiagnosticCaseDuplicateError extends Error {
  constructor(public readonly existingCaseId: string) {
    super(`A diagnostic case already exists for this repair-order concern (${existingCaseId}).`);
  }
}

function object(value: unknown, label: string) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${label} must be an object.`);
  return value as Record<string, unknown>;
}

function text(value: unknown, label: string, maximum: number, minimum = 1) {
  const normalized = typeof value === "string" ? value.trim() : "";
  if (normalized.length < minimum || normalized.length > maximum) throw new Error(`${label} must be ${minimum} through ${maximum} characters.`);
  return normalized;
}

function optionalId(value: unknown, label: string) {
  if (value == null || value === "") return null;
  return text(value, label, 100);
}

function optionalText(value: unknown, label: string, maximum: number) {
  if (value == null || value === "") return null;
  return text(value, label, maximum);
}

function expectedVersion(value: unknown) {
  const version = Number(value);
  if (!Number.isInteger(version) || version < 1) throw new Error("Expected diagnostic-case version must be a positive integer.");
  return version;
}

function jsonObject(value: unknown) {
  if (value == null) return {};
  const normalized = object(value, "Operating conditions");
  if (JSON.stringify(normalized).length > 10_000) throw new Error("Operating conditions exceed the 10,000-character limit.");
  return normalized;
}

function concernKey(value: unknown) {
  const normalized = text(value ?? "PRIMARY", "Concern key", 80).toUpperCase();
  if (!/^[A-Z0-9][A-Z0-9_-]*$/.test(normalized)) throw new Error("Concern key may contain only letters, numbers, underscores, and hyphens, and must begin with a letter or number.");
  return normalized;
}

function oneOf<T extends readonly string[]>(value: unknown, values: T, label: string): T[number] {
  const normalized = String(value ?? "").trim().toUpperCase();
  if (!(values as readonly string[]).includes(normalized)) throw new Error(`${label} is invalid.`);
  return normalized as T[number];
}

export function normalizeCreateDiagnosticCase(value: unknown) {
  const raw = object(value, "Diagnostic case creation");
  return {
    assignedUserId: optionalId(raw.assignedUserId, "Assigned user ID"),
    concernKey: concernKey(raw.concernKey),
    concernStatement: optionalText(raw.concernStatement, "Concern statement", 2000),
    idempotencyKey: text(raw.idempotencyKey, "Idempotency key", 200),
    operatingConditions: jsonObject(raw.operatingConditions),
    reason: text(raw.reason, "Creation reason", 500, 10),
    reasonCode: oneOf(raw.reasonCode, CREATE_REASON_CODES, "Creation reason code"),
    repairOrderId: text(raw.repairOrderId, "Repair order ID", 100),
    riskTier: oneOf(raw.riskTier ?? "R1", DIAGNOSTIC_RISK_TIERS, "Diagnostic risk tier")
  };
}

export function normalizeDiagnosticAssignment(value: unknown) {
  const raw = object(value, "Diagnostic assignment");
  return {
    assignedUserId: text(raw.assignedUserId, "Assigned user ID", 100),
    expectedVersion: expectedVersion(raw.expectedVersion),
    idempotencyKey: text(raw.idempotencyKey, "Idempotency key", 200),
    reason: text(raw.reason, "Assignment reason", 500, 10),
    reasonCode: oneOf(raw.reasonCode, ASSIGN_REASON_CODES, "Assignment reason code")
  };
}

export function normalizeDiagnosticTransition(value: unknown) {
  const raw = object(value, "Diagnostic case transition");
  const targetStatus = oneOf(raw.targetStatus, DIAGNOSTIC_CASE_STATUSES, "Target diagnostic status");
  if (targetStatus === "DRAFT") throw new Error("A diagnostic case cannot transition back to DRAFT.");
  const reasonCode = text(raw.reasonCode, "Transition reason code", 100).toUpperCase();
  if (!TRANSITION_REASON_TARGETS[reasonCode]?.includes(targetStatus)) throw new Error(`Reason code ${reasonCode} is not valid for ${targetStatus}.`);
  return {
    expectedVersion: expectedVersion(raw.expectedVersion),
    idempotencyKey: text(raw.idempotencyKey, "Idempotency key", 200),
    reason: text(raw.reason, "Transition reason", 500, 10),
    reasonCode,
    targetStatus
  };
}

export function diagnosticCaseId(organizationId: string, idempotencyKey: string) {
  return `dgc_${hashEnterpriseCommand({ organizationId, idempotencyKey: idempotencyKey.trim() }).slice(0, 24)}`;
}

export function diagnosticConcernFingerprint(statement: string) {
  const normalized = statement.trim().replace(/\s+/g, " ").toLocaleLowerCase("en-US");
  return hashEnterpriseCommand({ normalized });
}

export function assertDiagnosticTransition(current: DiagnosticCaseStatus, target: DiagnosticCaseStatus, resumeStatus: DiagnosticCaseStatus | null) {
  if (current === target) throw new Error(`Diagnostic case is already ${target}.`);
  if (TERMINAL_STATUSES.has(current)) {
    if (target !== "REOPENED") throw new Error(`Terminal diagnostic case ${current} must be reopened before further work.`);
    return;
  }
  if (current === "REOPENED") {
    if (target !== "TRIAGE") throw new Error("A reopened diagnostic case must return to TRIAGE.");
    return;
  }
  if (WAITING_STATUSES.has(current)) {
    if (target !== resumeStatus && target !== "ABANDONED") throw new Error(`Diagnostic case must resume at ${resumeStatus ?? "its prior state"} or be abandoned.`);
    return;
  }
  if (target === "REOPENED") throw new Error("Only a terminal diagnostic case can be reopened.");
  if (target === "ABANDONED" || WAITING_STATUSES.has(target)) return;
  if (!NORMAL_TRANSITIONS[current].includes(target)) throw new Error(`Diagnostic transition ${current} -> ${target} is not allowed.`);
}

export function nextDiagnosticCaseState(current: { status: DiagnosticCaseStatus; resumeStatus: DiagnosticCaseStatus | null }, target: DiagnosticCaseStatus, now: Date) {
  assertDiagnosticTransition(current.status, target, current.resumeStatus);
  const resumeStatus = WAITING_STATUSES.has(target) ? (WAITING_STATUSES.has(current.status) ? current.resumeStatus : current.status) : target === "REOPENED" ? "TRIAGE" : null;
  const closedAt = TERMINAL_STATUSES.has(target) ? now : null;
  const eventType = target === "ESCALATED" ? "ESCALATED" : target === "REOPENED" ? "REOPENED" : target === "ABANDONED" ? "ABANDONED" : "STATUS_CHANGED";
  return { closedAt, eventType, resumeStatus, status: target } as const;
}

export function isTerminalDiagnosticStatus(status: DiagnosticCaseStatus) {
  return TERMINAL_STATUSES.has(status);
}
