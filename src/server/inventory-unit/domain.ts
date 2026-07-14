export const INVENTORY_UNIT_FOUNDATION_STAGE = "PURCHASED_OR_TRADE_IN" as const;
export const INVENTORY_UNIT_FOUNDATION_STATES = ["ACTIVE", "WAITING", "BLOCKED"] as const;
export type InventoryUnitFoundationState = (typeof INVENTORY_UNIT_FOUNDATION_STATES)[number];

function required(value: unknown, label: string, max = 500) {
  const result = typeof value === "string" ? value.trim() : "";
  if (!result) throw new Error(`${label} is required.`);
  if (result.length > max) throw new Error(`${label} must be ${max} characters or fewer.`);
  return result;
}
function timestamp(value: unknown, label: string) {
  const result = new Date(required(value, label, 100));
  if (Number.isNaN(result.getTime())) throw new Error(`${label} must be a valid date and time.`);
  return result;
}
function state(value: unknown): InventoryUnitFoundationState {
  const result = String(value ?? "ACTIVE") as InventoryUnitFoundationState;
  if (!INVENTORY_UNIT_FOUNDATION_STATES.includes(result)) throw new Error("Inventory operating state is invalid for the foundation milestone.");
  return result;
}
function stateReason(operatingState: InventoryUnitFoundationState, value: unknown) {
  if (operatingState === "ACTIVE") return null;
  const result = required(value, "Waiting or blocker reason", 500);
  if (result.length < 10) throw new Error("Waiting or blocker reason must be at least 10 characters.");
  return result;
}

export function normalizeInventoryUnitCreate(value: unknown, now = new Date()) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Inventory unit create request must be an object.");
  const raw = value as Record<string, unknown>; const financialAcquiredAt = timestamp(raw.financialAcquiredAt, "Financial acquisition time"); const targetAt = timestamp(raw.targetAt, "Stage target");
  if (financialAcquiredAt.getTime() > now.getTime() + 5 * 60_000) throw new Error("Financial acquisition time cannot be in the future.");
  if (targetAt < financialAcquiredAt) throw new Error("Stage target cannot be before financial acquisition.");
  const operatingState = state(raw.operatingState);
  return { financialAcquiredAt, idempotencyKey: required(raw.idempotencyKey, "Idempotency key", 200), inventoryNumber: required(raw.inventoryNumber, "Inventory number", 100).toUpperCase(), lifecycleStage: INVENTORY_UNIT_FOUNDATION_STAGE, locationId: required(raw.locationId, "Location ID", 100), nextAction: required(raw.nextAction, "Next action", 500), operatingState, ownerUserId: required(raw.ownerUserId, "Owner user ID", 100), reason: required(raw.reason, "Business reason", 500), stateReason: stateReason(operatingState, raw.stateReason), targetAt, vehicleId: required(raw.vehicleId, "Vehicle ID", 100) };
}

export function normalizeInventoryUnitControlUpdate(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Inventory unit update request must be an object.");
  const raw = value as Record<string, unknown>; const operatingState = state(raw.operatingState); const expectedVersion = Number(raw.expectedVersion);
  if (!Number.isInteger(expectedVersion) || expectedVersion < 1) throw new Error("Expected inventory version must be a positive whole number.");
  return { expectedVersion, idempotencyKey: required(raw.idempotencyKey, "Idempotency key", 200), locationId: required(raw.locationId, "Location ID", 100), nextAction: required(raw.nextAction, "Next action", 500), operatingState, ownerUserId: required(raw.ownerUserId, "Owner user ID", 100), reason: required(raw.reason, "Business reason", 500), stateReason: stateReason(operatingState, raw.stateReason), targetAt: timestamp(raw.targetAt, "Stage target") };
}

export function inventoryUnitAge(input: { financialAcquiredAt: Date; now: Date; stageStartedAt: Date; targetAt: Date }) {
  const hours = (start: Date, end: Date) => Math.max(0, (end.getTime() - start.getTime()) / 3_600_000);
  return { stageAgeHours: hours(input.stageStartedAt, input.now), totalAgeHours: hours(input.financialAcquiredAt, input.now), targetVarianceHours: (input.now.getTime() - input.targetAt.getTime()) / 3_600_000, overdue: input.now > input.targetAt };
}
