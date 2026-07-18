import { createHash } from "node:crypto";
import { R11_SYSTEM_CODES, type R11SystemCode } from "./r11-catalog";

const object = (value: unknown, label = "Request") => { if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${label} must be an object.`); return value as Record<string, unknown>; };
const text = (value: unknown, label: string, max = 500) => { const result = typeof value === "string" ? value.trim() : ""; if (!result) throw new Error(`${label} is required.`); if (result.length > max) throw new Error(`${label} must be ${max} characters or fewer.`); return result; };
const integer = (value: unknown, label: string, minimum = 0) => { const result = Number(value); if (!Number.isInteger(result) || result < minimum) throw new Error(`${label} must be a whole number of at least ${minimum}.`); return result; };
const date = (value: unknown, label: string) => { const result = new Date(text(value, label, 100)); if (Number.isNaN(result.getTime())) throw new Error(`${label} must be a valid date and time.`); return result; };
const system = (value: unknown) => { const result = text(value, "System code", 100) as R11SystemCode; if (!(R11_SYSTEM_CODES as readonly string[]).includes(result)) throw new Error("System code is not in the approved R11 registry."); return result; };
const base = (raw: Record<string, unknown>) => ({ idempotencyKey: text(raw.idempotencyKey, "Idempotency key", 200), occurredAt: date(raw.occurredAt, "Occurrence time"), reason: text(raw.reason, "Business reason", 1000) });
const record = (value: unknown) => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
export const stableHash = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
export function assertIntegrationPayloadSafe(value: unknown, path = "payload") {
  if (Array.isArray(value)) { value.forEach((item, index) => assertIntegrationPayloadSafe(item, `${path}[${index}]`)); return; }
  if (!value || typeof value !== "object") return;
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    if (/(password|secret|token|authorization|cardnumber|pan|cvv|cvc|trackdata)/i.test(key.replaceAll("_", ""))) throw new Error(`Sensitive credential or payment-card field is prohibited at ${path}.${key}.`);
    assertIntegrationPayloadSafe(item, `${path}.${key}`);
  }
}

export function normalizeSandboxExchange(value: unknown) {
  const raw = object(value), direction = text(raw.direction, "Direction", 20).toUpperCase();
  if (!["INBOUND", "OUTBOUND"].includes(direction)) throw new Error("Exchange direction is invalid.");
  if (String(raw.environment ?? "SANDBOX").toUpperCase() !== "SANDBOX") throw new Error("R11 repository commands are limited to SANDBOX exchanges.");
  const payload = record(raw.payload), internalSnapshot = record(raw.internalSnapshot), externalSnapshot = record(raw.externalSnapshot);
  assertIntegrationPayloadSafe({ externalSnapshot, internalSnapshot, payload });
  return { ...base(raw), adapterVersion: text(raw.adapterVersion, "Adapter version", 100), direction: direction as "INBOUND" | "OUTBOUND", environment: "SANDBOX" as const, externalReference: typeof raw.externalReference === "string" && raw.externalReference.trim() ? raw.externalReference.trim() : null, externalSnapshot, internalRecordId: typeof raw.internalRecordId === "string" && raw.internalRecordId.trim() ? raw.internalRecordId.trim() : null, internalSnapshot, mappingVersion: text(raw.mappingVersion, "Mapping version", 100), payload, requestHash: stableHash({ direction, externalSnapshot, internalSnapshot, payload, resourceType: raw.resourceType, systemCode: raw.systemCode }), resourceType: text(raw.resourceType, "Resource type", 100), systemCode: system(raw.systemCode) };
}

export function detectR11Conflict(input: { actual: unknown; expected: unknown; rejected?: boolean; stale?: boolean; duplicate?: boolean; missing?: boolean; outOfBalance?: boolean }) {
  if (input.rejected) return { kind: "REJECTED" as const, summary: "Provider rejected the exchange." };
  if (input.missing) return { kind: "MISSING" as const, summary: "Required internal or external record is missing." };
  if (input.duplicate) return { kind: "DUPLICATE" as const, summary: "Duplicate external identity or delivery key detected." };
  if (input.outOfBalance) return { kind: "OUT_OF_BALANCE" as const, summary: "Reconciled quantities or amounts do not balance." };
  if (input.stale) return { kind: "STALE" as const, summary: "Provider evidence exceeded the approved freshness window." };
  if (stableHash(input.expected) !== stableHash(input.actual)) return { kind: "MISMATCHED" as const, summary: "Expected and acknowledged provider values differ." };
  return null;
}

export function normalizeSandboxAcknowledgement(value: unknown) {
  const raw = object(value), status = text(raw.status, "Acknowledgement status", 30).toUpperCase();
  if (!["ACKNOWLEDGED", "REJECTED", "FAILED_RETRYABLE", "FAILED_FINAL"].includes(status)) throw new Error("Acknowledgement status is invalid.");
  const actual = record(raw.actual), expected = record(raw.expected);
  assertIntegrationPayloadSafe({ actual, expected }, "acknowledgement");
  return { ...base(raw), acknowledgementCode: text(raw.acknowledgementCode, "Acknowledgement code", 200), actual, duplicate: raw.duplicate === true, expected, expectedVersion: integer(raw.expectedVersion, "Expected exchange version", 1), missing: raw.missing === true, outOfBalance: raw.outOfBalance === true, stale: raw.stale === true, status: status as "ACKNOWLEDGED" | "REJECTED" | "FAILED_RETRYABLE" | "FAILED_FINAL" };
}

export function normalizeConflictResolution(value: unknown) {
  const raw = object(value), status = text(raw.status, "Resolution status", 30).toUpperCase();
  if (!["RESOLVED", "ACCEPTED_DIFFERENCE", "CANCELLED"].includes(status)) throw new Error("Conflict resolution status is invalid.");
  return { ...base(raw), conflictId: text(raw.conflictId, "Conflict ID", 100), expectedVersion: integer(raw.expectedVersion, "Expected exchange version", 1), resolutionCode: text(raw.resolutionCode, "Resolution code", 100), resolutionNotes: text(raw.resolutionNotes, "Resolution notes", 1000), status: status as "RESOLVED" | "ACCEPTED_DIFFERENCE" | "CANCELLED" };
}
