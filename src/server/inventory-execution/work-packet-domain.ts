export const INVENTORY_WORK_PACKET_STATES = ["PLANNED", "CURRENT", "STAGED", "WAITING", "BLOCKED", "READY_FOR_REVIEW", "COMPLETED", "CANCELLED"] as const;
export const INVENTORY_WORK_URGENCIES = ["P0", "P1", "P2", "P3", "P4"] as const;
export const INVENTORY_WORK_READINESS = ["READY", "CONDITIONAL", "NOT_READY", "UNKNOWN"] as const;
export const INVENTORY_WORK_POLICY_VERSION = "inventory-eos-mvp/v1";

export type InventoryWorkPacketState = (typeof INVENTORY_WORK_PACKET_STATES)[number];
export type InventoryWorkUrgency = (typeof INVENTORY_WORK_URGENCIES)[number];
export type InventoryWorkReadiness = (typeof INVENTORY_WORK_READINESS)[number];

type JsonObject = Record<string, unknown>;

function object(value: unknown, label: string): JsonObject {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${label} must be an object.`);
  return value as JsonObject;
}

function text(value: unknown, label: string, max = 1_000) {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${label} is required.`);
  if (value.trim().length > max) throw new Error(`${label} cannot exceed ${max} characters.`);
  return value.trim();
}

function optionalText(value: unknown, label: string, max = 200) {
  if (value == null || value === "") return null;
  return text(value, label, max);
}

function date(value: unknown, label: string) {
  const parsed = new Date(String(value ?? ""));
  if (Number.isNaN(parsed.getTime())) throw new Error(`${label} must be a valid date and time.`);
  return parsed;
}

function optionalDate(value: unknown, label: string) {
  return value == null || value === "" ? null : date(value, label);
}

function selection<T extends readonly string[]>(value: unknown, values: T, label: string): T[number] {
  const normalized = String(value ?? "").toUpperCase();
  if (!values.includes(normalized)) throw new Error(`${label} is invalid.`);
  return normalized as T[number];
}

function structuredSnapshot(value: unknown, label: string) {
  const snapshot = object(value, label);
  if (!Array.isArray(snapshot.items)) throw new Error(`${label} must contain an items list.`);
  if (snapshot.items.length > 50) throw new Error(`${label} cannot contain more than 50 items.`);
  const items = snapshot.items.map((entry, index) => {
    const item = object(entry, `${label} item ${index + 1}`);
    return {
      code: text(item.code, `${label} item code`, 100).toUpperCase(),
      label: text(item.label, `${label} item label`, 240),
      required: item.required !== false,
      satisfied: item.satisfied === true,
      source: text(item.source, `${label} item source`, 160),
      ...(item.detail == null || item.detail === "" ? {} : { detail: text(item.detail, `${label} item detail`, 500) })
    };
  });
  return { items };
}

export function normalizeInventoryWorkPacketCreate(value: unknown) {
  const raw = object(value, "Inventory Work Packet");
  const targetAt = date(raw.targetAt, "Target time");
  const nextCheckAt = optionalDate(raw.nextCheckAt, "Next check time");
  const escalationAt = optionalDate(raw.escalationAt, "Escalation time");
  if (nextCheckAt && nextCheckAt > targetAt) throw new Error("Next check time cannot be after the target time.");
  if (escalationAt && escalationAt < targetAt) throw new Error("Escalation time cannot be before the target time.");
  const estimate = raw.estimatedMinutes == null || raw.estimatedMinutes === "" ? null : Number(raw.estimatedMinutes);
  if (estimate != null && (!Number.isInteger(estimate) || estimate < 1 || estimate > 1_440)) throw new Error("Estimated minutes must be a whole number from 1 to 1440.");
  const state = selection(raw.state ?? "PLANNED", INVENTORY_WORK_PACKET_STATES, "Work state");
  if (!["PLANNED", "CURRENT", "STAGED"].includes(state)) throw new Error("A new Inventory Work Packet must be planned, current, or staged.");
  const urgency = selection(raw.urgency ?? "P3", INVENTORY_WORK_URGENCIES, "Urgency");
  const readiness = selection(raw.readiness ?? "UNKNOWN", INVENTORY_WORK_READINESS, "Readiness");
  const readinessSnapshot = structuredSnapshot(raw.readinessSnapshot, "Readiness snapshot");
  const dependencySnapshot = structuredSnapshot(raw.dependencySnapshot, "Dependency snapshot");
  const evidenceRequirements = structuredSnapshot(raw.evidenceRequirements, "Evidence requirements");
  if (readiness === "READY" && readinessSnapshot.items.some(item => item.required && !item.satisfied)) throw new Error("Readiness cannot be READY while a required readiness check is unsatisfied.");
  return {
    dependencySnapshot,
    definitionOfDone: text(raw.definitionOfDone, "Definition of done", 1_000),
    escalationAt,
    estimatedMinutes: estimate,
    evidenceRequirements,
    idempotencyKey: text(raw.idempotencyKey, "Idempotency key", 200),
    inventoryUnitId: optionalText(raw.inventoryUnitId, "Inventory unit ID", 100),
    locationId: optionalText(raw.locationId, "Location ID", 100),
    nextAction: text(raw.nextAction, "Next action", 500),
    nextCheckAt,
    policyVersion: text(raw.policyVersion ?? INVENTORY_WORK_POLICY_VERSION, "Policy version", 100),
    purpose: text(raw.purpose, "Purpose", 1_000),
    readiness,
    readinessSnapshot,
    reason: text(raw.reason, "Business reason", 500),
    repairJobId: optionalText(raw.repairJobId, "Repair job ID", 100),
    repairOrderId: optionalText(raw.repairOrderId, "Repair order ID", 100),
    stageCode: text(raw.stageCode, "Lifecycle stage", 100).toUpperCase(),
    state,
    targetAt,
    taskId: text(raw.taskId, "Task ID", 100),
    urgency,
    urgencyReason: text(raw.urgencyReason, "Urgency reason", 500),
    vehicleId: text(raw.vehicleId, "Vehicle ID", 100)
  };
}

export function normalizeInventoryWorkPacketPosition(value: unknown) {
  const raw = object(value, "Inventory Work Packet position");
  const state = selection(raw.state, INVENTORY_WORK_PACKET_STATES, "Work state");
  if (!["PLANNED", "CURRENT", "STAGED", "CANCELLED"].includes(state)) throw new Error("This command may only plan, make current, stage, or cancel work.");
  const expectedVersion = Number(raw.expectedVersion);
  if (!Number.isInteger(expectedVersion) || expectedVersion < 1) throw new Error("Expected version must be a positive whole number.");
  return {
    expectedVersion,
    idempotencyKey: text(raw.idempotencyKey, "Idempotency key", 200),
    reason: text(raw.reason, "Business reason", 500),
    state: state as "PLANNED" | "CURRENT" | "STAGED" | "CANCELLED"
  };
}

export function explainWorkPacketEligibility(input: { readiness: InventoryWorkReadiness; dependencies: { items: Array<{ required: boolean; satisfied: boolean }> }; state: InventoryWorkPacketState }) {
  const reasons: string[] = [];
  if (input.readiness !== "READY") reasons.push(`READINESS_${input.readiness}`);
  if (input.dependencies.items.some(item => item.required && !item.satisfied)) reasons.push("REQUIRED_DEPENDENCY_UNSATISFIED");
  if (["COMPLETED", "CANCELLED"].includes(input.state)) reasons.push("TERMINAL_STATE");
  return { eligible: reasons.length === 0, reasons, ruleVersion: INVENTORY_WORK_POLICY_VERSION };
}
