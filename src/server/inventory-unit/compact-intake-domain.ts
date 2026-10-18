import { normalizeCanonicalVin } from "@/server/vehicle-registry/domain";
import { normalizeIntake } from "./intake-domain";

export function normalizeCompactIntake(value: unknown, now: Date) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Compact intake must be an object.");
  const raw = value as Record<string, unknown>;
  const required = (key: string, maximum = 100) => {
    const result = typeof raw[key] === "string" ? raw[key].trim() : "";
    if (!result || result.length > maximum) throw new Error(`Compact intake ${key} is required and must be at most ${maximum} characters.`);
    return result;
  };
  if (raw.action !== "SAVE_INVENTORY" && raw.action !== "SAVE_AND_START_RO") throw new Error("Compact intake action is invalid.");
  if (typeof raw.ownershipConfirmed !== "boolean") throw new Error("Explicit ownership confirmation is required.");
  if (!Number.isSafeInteger(raw.expectedIntakeVersion) || Number(raw.expectedIntakeVersion) < 0) throw new Error("Expected intake version is required.");
  if (raw.expectedUnitVersion !== null && (!Number.isSafeInteger(raw.expectedUnitVersion) || Number(raw.expectedUnitVersion) < 1)) throw new Error("Expected unit version must be positive or null.");
  const normalized = normalizeIntake({ ...raw, status: "CONFIRMED", expectedVersion: raw.expectedIntakeVersion }, now);
  if (!normalized.details.source || !normalized.details.acquiredOn) throw new Error("Acquisition source and date are required to open inventory.");
  if (normalized.details.purchaseCents === null && normalized.details.priceStatus !== "PENDING") throw new Error("A missing purchase amount must be explicitly pending.");
  const vehicleId = raw.vehicleId == null || raw.vehicleId === "" ? null : required("vehicleId");
  const vin = raw.vin == null || raw.vin === "" ? null : normalizeCanonicalVin({ vin: raw.vin }).normalized;
  if (!vehicleId && !vin) throw new Error("A canonical vehicle ID or valid VIN is required.");
  const year = raw.year == null ? null : raw.year;
  if (year !== null && (!Number.isSafeInteger(year) || Number(year) < 1886 || Number(year) > now.getUTCFullYear() + 2)) throw new Error("Vehicle year is invalid.");
  const optionalIdentity = (key: string) => raw[key] == null || raw[key] === "" ? null : required(key);
  const concern = raw.action === "SAVE_AND_START_RO" ? required("concern", 2000) : "";
  const reason = required("reason", 500);
  return {
    action: raw.action, idempotencyKey: required("idempotencyKey", 200), reason,
    vehicleId, vin, year: year as number | null, make: optionalIdentity("make"), model: optionalIdentity("model"),
    locationId: required("locationId"), ownerUserId: required("ownerUserId"),
    expectedIntakeVersion: normalized.expectedVersion, expectedUnitVersion: normalized.expectedUnitVersion,
    details: normalized.details, concern, ownershipConfirmed: raw.ownershipConfirmed,
  };
}

export type CompactIntakeInput = ReturnType<typeof normalizeCompactIntake>;
export type CompactIntakeResult = {
  vehicleId: string;
  inventoryUnitId: string;
  inventoryNumber: string;
  intakeVersion: number;
  unitVersion: number;
  repairOrderId?: string;
};
