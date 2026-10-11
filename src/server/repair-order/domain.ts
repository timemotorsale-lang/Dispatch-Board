export const REPAIR_ORDER_CORE_STAGE = "INTAKE" as const;
export const REPAIR_ORDER_CORE_STATES = ["ACTIVE", "WAITING", "BLOCKED"] as const;
export const REPAIR_ORDER_INTAKE_SOURCES = ["APPOINTMENT", "WALK_IN", "INVENTORY_RECON"] as const;
export const REPAIR_ORDER_CONSENT_STATUSES = ["DOCUMENTED", "NOT_REQUIRED", "PENDING"] as const;
export const REPAIR_ORDER_TRANSPORT_MODES = ["CUSTOMER_WAITING", "DROP_OFF", "LOANER", "SHUTTLE", "TOW", "INTERNAL_TRANSPORT", "OTHER"] as const;
type CoreState = (typeof REPAIR_ORDER_CORE_STATES)[number];
const CONCERN_CONTEXT_WORDS = new Set(["a","acquired","all","an","and","are","at","auction","be","but","customer","dash","dealership","does","drive","drives","excellently","for","from","has","have","i","in","inventory","is","it","kind","kinds","my","newly","of","on","other","report","reports","runs","says","the","their","these","this","to","vehicle","was","with"]);
const CONCERN_SYNONYMS: Readonly<Record<string,string>> = { illuminated:"light",indicator:"light",indicators:"light",lamp:"light",lamps:"light",warning:"light",warnings:"light" };
function required(value: unknown, label: string, max = 500) { const result = typeof value === "string" ? value.trim() : ""; if (!result) throw new Error(`${label} is required.`); if (result.length > max) throw new Error(`${label} must be ${max} characters or fewer.`); return result; }
function optional(value: unknown, max = 500) { const result = typeof value === "string" ? value.trim() : ""; if (result.length > max) throw new Error(`Text must be ${max} characters or fewer.`); return result || null; }
function timestamp(value: unknown, label: string, optionalValue = false) { if (optionalValue && !value) return null; const result = new Date(required(value, label, 100)); if (Number.isNaN(result.getTime())) throw new Error(`${label} must be a valid date and time.`); return result; }
function oneOf<T extends readonly string[]>(value: unknown, values: T, label: string): T[number] { const result = String(value ?? ""); if (!values.includes(result)) throw new Error(`${label} is invalid.`); return result as T[number]; }
function operating(value: unknown): CoreState { return oneOf(value ?? "ACTIVE", REPAIR_ORDER_CORE_STATES, "Repair-order operating state"); }
function stateReason(state: CoreState, value: unknown) { if (state === "ACTIVE") return null; const result = required(value, "Waiting or blocker reason", 500); if (result.length < 10) throw new Error("Waiting or blocker reason must be at least 10 characters."); return result; }

export function repairOrderConcernFingerprint(value:string){
  const tokens=value.normalize("NFKD").toLocaleLowerCase("en-US").replace(/[^a-z0-9]+/g," ").trim().split(/\s+/).filter(Boolean).map(token=>CONCERN_SYNONYMS[token]??(token.length>4&&token.endsWith("s")?token.slice(0,-1):token)).filter(token=>!CONCERN_CONTEXT_WORDS.has(token));
  return [...new Set(tokens)].sort().join("|");
}

export function isSameRepairOrderConcern(left:string,right:string){const first=repairOrderConcernFingerprint(left),second=repairOrderConcernFingerprint(right);return Boolean(first&&second&&first===second);}

export function normalizeRepairOrderCreate(value: unknown, now = new Date()) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Repair-order intake request must be an object.");
  const raw = value as Record<string, unknown>; const intakeSource = oneOf(raw.intakeSource, REPAIR_ORDER_INTAKE_SOURCES, "Intake source"); const arrivedAt = timestamp(raw.arrivedAt, "Arrival time")!; const targetAt = timestamp(raw.targetAt, "Intake target")!; const consentStatus = oneOf(raw.consentStatus, REPAIR_ORDER_CONSENT_STATUSES, "Consent status"); const operatingState = operating(raw.operatingState); const keysReceivedCount = Number(raw.keysReceivedCount ?? 0);
  if (arrivedAt.getTime() > now.getTime() + 5 * 60_000) throw new Error("Arrival time cannot be in the future."); if (targetAt < arrivedAt) throw new Error("Intake target cannot be before arrival."); if (!Number.isInteger(keysReceivedCount) || keysReceivedCount < 0 || keysReceivedCount > 20) throw new Error("Keys received must be a whole number from 0 through 20.");
  const consentReference = optional(raw.consentReference, 200); const consentedAt = timestamp(raw.consentedAt, "Consent time", true); if (consentStatus === "DOCUMENTED" && (!consentReference || !consentedAt)) throw new Error("Documented consent requires its reference and time.");
  return { appointmentId: intakeSource === "APPOINTMENT" ? required(raw.appointmentId, "Appointment ID", 100) : null, arrivedAt, consentReference, consentStatus, consentedAt, concernSummary: required(raw.concernSummary, "Customer or inventory concern", 2000), customerId: intakeSource === "WALK_IN" ? required(raw.customerId, "Customer ID", 100) : null, idempotencyKey: required(raw.idempotencyKey, "Idempotency key", 200), intakeNotes: optional(raw.intakeNotes, 2000), intakeSource, inventoryUnitId: intakeSource === "INVENTORY_RECON" ? optional(raw.inventoryUnitId, 100) : null, keyTag: optional(raw.keyTag, 100), keysReceivedCount, locationId: required(raw.locationId, "Location ID", 100), nextAction: required(raw.nextAction, "Next action", 500), operatingState, ownerUserId: required(raw.ownerUserId, "Owner user ID", 100), promisedAt: timestamp(raw.promisedAt, "Promised time", true), promiseNotes: optional(raw.promiseNotes, 500), readinessSnapshotId: optional(raw.readinessSnapshotId, 100), reason: required(raw.reason, "Business reason", 500), stateReason: stateReason(operatingState, raw.stateReason), targetAt, transportMode: oneOf(raw.transportMode, REPAIR_ORDER_TRANSPORT_MODES, "Transportation mode"), vehicleId: intakeSource === "WALK_IN" || intakeSource === "INVENTORY_RECON" && !optional(raw.inventoryUnitId, 100) ? required(raw.vehicleId, "Vehicle ID", 100) : intakeSource === "INVENTORY_RECON" ? optional(raw.vehicleId, 100) : null };
}

export function normalizeRepairOrderControlUpdate(value: unknown) { if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Repair-order update request must be an object."); const raw = value as Record<string, unknown>; const operatingState = operating(raw.operatingState); const expectedVersion = Number(raw.expectedVersion); if (!Number.isInteger(expectedVersion) || expectedVersion < 1) throw new Error("Expected repair-order version must be a positive whole number."); return { expectedVersion, idempotencyKey: required(raw.idempotencyKey, "Idempotency key", 200), locationId: required(raw.locationId, "Location ID", 100), nextAction: required(raw.nextAction, "Next action", 500), operatingState, ownerUserId: required(raw.ownerUserId, "Owner user ID", 100), reason: required(raw.reason, "Business reason", 500), stateReason: stateReason(operatingState, raw.stateReason), targetAt: timestamp(raw.targetAt, "Intake target")! }; }

export function normalizeRepairOrderDuplicateClose(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Duplicate repair-order close request must be an object.");
  const raw = value as Record<string, unknown>;
  const expectedVersion = Number(raw.expectedVersion);
  if (!Number.isInteger(expectedVersion) || expectedVersion < 1) throw new Error("Expected repair-order version must be a positive whole number.");
  return {
    duplicateOfRepairOrderId: optional(raw.duplicateOfRepairOrderId, 100),
    expectedVersion,
    idempotencyKey: required(raw.idempotencyKey, "Idempotency key", 200),
    reason: required(raw.reason, "Business reason", 500),
  };
}

export function normalizeRepairOrderNoWorkClose(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Repair-order close request must be an object.");
  const raw = value as Record<string, unknown>;
  const expectedVersion = Number(raw.expectedVersion);
  if (!Number.isInteger(expectedVersion) || expectedVersion < 1) throw new Error("Expected repair-order version must be a positive whole number.");
  return {
    expectedVersion,
    idempotencyKey: required(raw.idempotencyKey, "Idempotency key", 200),
    reason: required(raw.reason, "Closure reason", 500),
  };
}

export function repairOrderAge(input: { now: Date; openedAt: Date; stageStartedAt: Date; targetAt: Date }) { const hours = (a: Date, b: Date) => Math.max(0, (b.getTime() - a.getTime()) / 3_600_000); return { openAgeHours: hours(input.openedAt, input.now), overdue: input.now > input.targetAt, stageAgeHours: hours(input.stageStartedAt, input.now), targetVarianceHours: (input.now.getTime() - input.targetAt.getTime()) / 3_600_000 }; }
