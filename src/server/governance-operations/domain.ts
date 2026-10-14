import { createHash, randomUUID } from "node:crypto";

export const GOVERNANCE_RECORD_TYPES = ["REPORT_SNAPSHOT", "REPORT_RESTATEMENT", "CONTROLLED_EXPORT", "OPERATIONS_INCIDENT", "PRIVACY_SUPPORT_CASE"] as const;
export type GovernanceRecordType = typeof GOVERNANCE_RECORD_TYPES[number];
export const EXPORT_RESOURCES = ["REPORT_FACTS", "REVIEWS", "APPROVALS", "OPERATIONS"] as const;
export type ExportResource = typeof EXPORT_RESOURCES[number];

export function object(value: unknown, label = "Request") { if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${label} must be an object.`); return value as Record<string, unknown>; }
export function text(value: unknown, label: string, min = 1, max = 500) { const result = typeof value === "string" ? value.trim() : ""; if (result.length < min) throw new Error(`${label} must be at least ${min} characters.`); if (result.length > max) throw new Error(`${label} must be ${max} characters or fewer.`); return result; }
export function integer(value: unknown, label: string, min: number, max: number) { const result = Number(value); if (!Number.isInteger(result) || result < min || result > max) throw new Error(`${label} must be from ${min} through ${max}.`); return result; }
export function optionalText(value: unknown, max = 200) { if (value == null || value === "") return null; return text(value, "Value", 1, max); }
export function list(value: unknown, label: string) { if (!Array.isArray(value)) throw new Error(`${label} must be an array.`); return [...new Set(value.map(item => text(item, `${label} item`, 1, 100)))]; }
export function date(value: unknown, label: string) { const result = new Date(String(value ?? "")); if (Number.isNaN(result.getTime())) throw new Error(`${label} must be a valid date.`); return result; }
function canonical(value: unknown): unknown { if (Array.isArray(value)) return value.map(canonical); if (value instanceof Date) return value.toISOString(); if (value && typeof value === "object") return Object.fromEntries(Object.entries(value as Record<string, unknown>).sort(([left], [right]) => left.localeCompare(right)).map(([key, item]) => [key, canonical(item)])); return value; }
export function hash(value: unknown) { return createHash("sha256").update(JSON.stringify(canonical(value))).digest("hex"); }
export function correlationId() { return randomUUID(); }

export const EXPORT_FIELDS: Record<ExportResource, readonly string[]> = {
  REPORT_FACTS: ["code", "label", "value", "unit", "definitionVersion", "quality", "cutoffAt", "cohort"],
  REVIEWS: ["id", "domain", "type", "title", "subject", "owner", "location", "dueAt", "overdue", "version", "state"],
  APPROVALS: ["id", "domain", "type", "title", "subject", "owner", "location", "dueAt", "overdue", "version", "policyVersion", "amountCents", "state"],
  OPERATIONS: ["code", "state", "lagSeconds", "lastError"],
};

export function normalizeControlledExport(value: unknown, now: Date) {
  const raw = object(value), resource = text(raw.resource, "Export resource", 1, 40).toUpperCase() as ExportResource;
  if (!EXPORT_RESOURCES.includes(resource)) throw new Error("Export resource is not supported.");
  const fields = list(raw.fields, "Export fields"); if (!fields.length) throw new Error("At least one export field is required.");
  const invalid = fields.filter(field => !EXPORT_FIELDS[resource].includes(field)); if (invalid.length) throw new Error(`Export fields are not permitted: ${invalid.join(", ")}.`);
  return { fields, idempotencyKey: text(raw.idempotencyKey, "Idempotency key", 8, 200), reason: text(raw.reason, "Export reason", 20, 500), resource, rowLimit: integer(raw.rowLimit ?? 100, "Row limit", 1, 500), cutoffAt: now };
}

export function normalizeReportSnapshot(value: unknown, now: Date) { const raw = object(value), periodStart = date(raw.periodStart, "Period start"), periodEnd = date(raw.periodEnd, "Period end"); if (periodStart >= periodEnd) throw new Error("Report period start must precede period end."); if (periodEnd > now) throw new Error("Report period cannot end in the future."); return { idempotencyKey: text(raw.idempotencyKey, "Idempotency key", 8, 200), periodEnd, periodStart, reason: text(raw.reason, "Snapshot reason", 20, 500) }; }
export function normalizeRestatement(value: unknown) { const raw = object(value); return { baseRecordId: text(raw.baseRecordId, "Base report snapshot", 1, 200), idempotencyKey: text(raw.idempotencyKey, "Idempotency key", 8, 200), reason: text(raw.reason, "Restatement reason", 20, 500) }; }
export function normalizeIncident(value: unknown) { const raw = object(value); return { idempotencyKey: text(raw.idempotencyKey, "Idempotency key", 8, 200), ownerUserId: text(raw.ownerUserId, "Incident owner", 1, 200), reason: text(raw.reason, "Incident reason", 20, 500), subjectId: text(raw.subjectId, "Affected record", 1, 200), subjectType: text(raw.subjectType, "Affected record type", 1, 80).toUpperCase(), severity: text(raw.severity, "Severity", 1, 20).toUpperCase() }; }
export function normalizePrivacySupport(value: unknown) { const raw = object(value), requestKind = text(raw.requestKind, "Request kind", 1, 40).toUpperCase(); if (!['ACCESS_REVIEW','RETENTION_REVIEW','LEGAL_HOLD','DELETION_REVIEW','SUPPORT_CASE'].includes(requestKind)) throw new Error("Privacy/support request kind is invalid."); return { idempotencyKey: text(raw.idempotencyKey, "Idempotency key", 8, 200), ownerUserId: text(raw.ownerUserId, "Case owner", 1, 200), reason: text(raw.reason, "Case reason", 20, 500), requestKind, runbookReference: text(raw.runbookReference, "Runbook reference", 3, 200), subjectId: text(raw.subjectId, "Affected record", 1, 200), subjectType: text(raw.subjectType, "Affected record type", 1, 80).toUpperCase() }; }
export function normalizeTransition(value: unknown) { const raw = object(value); return { expectedVersion: integer(raw.expectedVersion, "Expected version", 1, 1_000_000), reason: text(raw.reason, "Transition reason", 20, 500), resolutionEvidence: text(raw.resolutionEvidence, "Resolution evidence", 10, 2_000) }; }
