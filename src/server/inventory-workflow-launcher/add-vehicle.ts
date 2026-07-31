import type { AuthenticatedUser } from "@/server/auth/store";
import { ADD_VEHICLE_ALLOWED_REASONS, ADD_VEHICLE_REASONS, ADD_VEHICLE_RELATIONSHIPS, recommendAddVehicleWorkflow, type AddVehicleReason, type AddVehicleRelationship } from "@/lib/add-vehicle-workflow";
import { decodeVinWithNhtsa, type NhtsaDecodeResult } from "@/server/vehicle-identification/nhtsa";
import { createRegistryVehicle, findVehicleRegistryByPlate, previewVehicleRegistryImport } from "@/server/vehicle-registry/service";

type Input = {
  addMode: "QUICK" | "DETAILED";
  arrivalMethod?: string;
  bodyClass?: string;
  cabType?: string;
  color?: string;
  description: string;
  detailedNotes?: string;
  displacementLiters?: string;
  doors?: string;
  driveType?: string;
  drivableStatus?: string;
  engineConfiguration?: string;
  engineCylinders?: string;
  existingDamage?: string;
  fuelTypePrimary?: string;
  gvwr?: string;
  idempotencyKey: string;
  keyCount?: number;
  licensePlate?: string;
  licensePlateState?: string;
  locationId: string;
  make: string;
  model: string;
  nonVinReason?: string;
  odometer?: number;
  odometerUnit: "MILES" | "KILOMETERS";
  reasonCode: AddVehicleReason;
  relationship: AddVehicleRelationship;
  runningStatus?: string;
  series?: string;
  transmissionStyle?: string;
  trim?: string;
  vin?: string;
  warningLights?: string;
  year: number | string;
};

const ODOMETER_REQUIRED_REASONS = new Set<AddVehicleReason>(["SERVICE_REPAIR", "INSPECTION_DIAGNOSIS", "INVENTORY_RECON", "TRADE_APPRAISAL", "ACQUISITION_REVIEW"]);

function record(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Add Vehicle request must be an object.");
  return value as Record<string, unknown>;
}

function required(value: unknown, label: string, max = 240) {
  const result = typeof value === "string" ? value.trim() : "";
  if (!result) throw new Error(`${label} is required.`);
  if (result.length > max) throw new Error(`${label} must be ${max} characters or fewer.`);
  return result;
}

function optional(value: unknown, max = 120) {
  const result = typeof value === "string" ? value.trim() : "";
  if (result.length > max) throw new Error(`Optional value must be ${max} characters or fewer.`);
  return result;
}

function enumValue<T extends string>(value: unknown, label: string, values: readonly T[]) {
  if (!values.includes(value as T)) throw new Error(`${label} is invalid.`);
  return value as T;
}

function optionalInteger(value: unknown, label: string, maximum: number) {
  if (value == null || value === "") return undefined;
  const result = Number(value); if (!Number.isInteger(result) || result < 0 || result > maximum) throw new Error(`${label} is outside the supported range.`);
  return result;
}

export function normalizeAddVehicleWorkflowInput(value: unknown): Input {
  const raw = record(value);
  const addMode = enumValue(raw.addMode ?? "QUICK", "Add mode", ["QUICK", "DETAILED"] as const);
  const relationship = enumValue(raw.relationship, "Vehicle relationship", ADD_VEHICLE_RELATIONSHIPS);
  const reasonCode = enumValue(raw.reasonCode, "Operational reason", ADD_VEHICLE_REASONS);
  if (!ADD_VEHICLE_ALLOWED_REASONS[relationship].includes(reasonCode)) throw new Error("Operational reason is not valid for the selected vehicle relationship.");
  const description = required(raw.description, "Brief description", 240);
  if (description.length < 10) throw new Error("Brief description must be at least 10 characters.");
  const year = Number(raw.year);
  if (!Number.isInteger(year) || year < 1886 || year > new Date().getFullYear() + 2) throw new Error("Vehicle year is outside the supported range.");
  const vin = optional(raw.vin, 40);
  const nonVinReason = optional(raw.nonVinReason, 500);
  if (!vin && !nonVinReason) throw new Error("VIN is required unless the documented non-VIN exception path is used.");
  const odometer = optionalInteger(raw.odometer, "Odometer reading", 9_999_999);
  if (ODOMETER_REQUIRED_REASONS.has(reasonCode) && odometer == null) throw new Error("Odometer reading is required for this operational reason.");
  const licensePlate = optional(raw.licensePlate);
  const licensePlateState = licensePlate ? required(raw.licensePlateState, "License plate state", 2).toUpperCase() : "";
  if (licensePlateState && !/^[A-Z]{2}$/.test(licensePlateState)) throw new Error("License plate state must be a two-letter code.");
  return {
    addMode, arrivalMethod: optional(raw.arrivalMethod), bodyClass: optional(raw.bodyClass), cabType: optional(raw.cabType), color: optional(raw.color), description, detailedNotes: optional(raw.detailedNotes, 1000),
    displacementLiters: optional(raw.displacementLiters), doors: optional(raw.doors), driveType: optional(raw.driveType), drivableStatus: optional(raw.drivableStatus), engineConfiguration: optional(raw.engineConfiguration), engineCylinders: optional(raw.engineCylinders), existingDamage: optional(raw.existingDamage, 1000), fuelTypePrimary: optional(raw.fuelTypePrimary), gvwr: optional(raw.gvwr), idempotencyKey: required(raw.idempotencyKey, "Idempotency key", 200), keyCount: optionalInteger(raw.keyCount, "Key count", 20),
    licensePlate, licensePlateState, locationId: required(raw.locationId, "Current location", 100),
    make: required(raw.make, "Make", 100), model: required(raw.model, "Model", 100), nonVinReason,
    odometer, odometerUnit: enumValue(raw.odometerUnit ?? "MILES", "Odometer unit", ["MILES", "KILOMETERS"] as const), reasonCode, relationship, runningStatus: optional(raw.runningStatus), series: optional(raw.series), transmissionStyle: optional(raw.transmissionStyle), trim: optional(raw.trim), vin, warningLights: optional(raw.warningLights, 1000), year
  };
}

function nextHref(code: string, vehicleId: string, description: string) {
  if (code === "CREATE_SERVICE_INTAKE") return `/vehicles/repair-orders?${new URLSearchParams({ concernSummary: description, intakeSource: "WALK_IN", vehicleId }).toString()}`;
  if (code === "SCHEDULE_APPOINTMENT") return `/appointments?${new URLSearchParams({ vehicleId }).toString()}`;
  if (code === "START_ACQUISITION_APPRAISAL") return `/vehicles/acquisition-appraisal?${new URLSearchParams({ vehicleId }).toString()}`;
  if (code === "REVIEW_INVENTORY_CONTROL") return `/vehicles/inventory/units?${new URLSearchParams({ vehicleId }).toString()}`;
  return `/vehicles/360/${vehicleId}`;
}

export async function previewAddVehicleIdentity(actor: AuthenticatedUser | null, value: unknown) {
  const raw = record(value);
  if (raw.lookupType === "PLATE") {
    const vehicle = await findVehicleRegistryByPlate(actor, raw);
    return { identity: vehicle?.vin ? { validationSource: "EXISTING_CANONICAL_RECORD", vin: vehicle.vin, vinState: "VALID" } : null, lookupType: "PLATE", plateMatch: Boolean(vehicle), potentialDuplicate: vehicle ?? null };
  }
  const vin = required(raw.vin, "VIN", 40);
  const preview = await previewVehicleRegistryImport(actor, { rows: [{ idempotencyKey: `add-vehicle-preview-${vin}`, reason: "Validate identity before Add Vehicle workflow creation.", vehicleNumber: "ADD-VEHICLE-PREVIEW", vin }] });
  const row = preview.rows[0];
  if (!row || row.status === "INVALID") throw new Error(row && "error" in row ? row.error : "Vehicle identity could not be validated.");
  const potentialDuplicate = "potentialDuplicate" in row ? row.potentialDuplicate : null;
  const decode = await decodeVinWithNhtsa(vin);
  return { decode, identity: { validationSource: decode.provider, vin: row.normalized.vin, vinState: row.normalized.vinState }, lookupType: "VIN", plateMatch: false, potentialDuplicate: potentialDuplicate ?? null };
}

export async function startAddVehicleWorkflow(actor: AuthenticatedUser | null, value: unknown) {
  const input = normalizeAddVehicleWorkflowInput(value); const recommendation = recommendAddVehicleWorkflow(input);
  let decode: NhtsaDecodeResult | null = null;
  if (input.vin) { try { decode = await decodeVinWithNhtsa(input.vin); } catch { decode = null; } }
  const year = decode?.decoded.modelYear ?? Number(input.year); const make = decode?.decoded.make ?? input.make; const model = decode?.decoded.model ?? input.model;
  const decodedOrigin = decode ? { authority: "MANUFACTURER_SUBMITTED_VIN_DATA", confirmedAt: new Date().toISOString(), source: decode.provider, sourceReference: decode.vin } : { authority: "STAFF_CONFIRMATION", confirmedAt: new Date().toISOString(), source: "STAFF_CONFIRMED" };
  const staffOrigin = { authority: "STAFF_OBSERVATION", confirmedAt: new Date().toISOString(), source: "STAFF_OBSERVED" };
  const specifications = { ...(decode?.decoded ?? {}), arrivalMethod: input.arrivalMethod || null, bodyClass: input.bodyClass || decode?.decoded.bodyClass || null, cabType: input.cabType || decode?.decoded.cabType || null, detailedNotes: input.detailedNotes || null, displacementLiters: input.displacementLiters || decode?.decoded.displacementLiters || null, doors: input.doors || decode?.decoded.doors || null, driveType: input.driveType || decode?.decoded.driveType || null, drivableStatus: input.drivableStatus || null, engineConfiguration: input.engineConfiguration || decode?.decoded.engineConfiguration || null, engineCylinders: input.engineCylinders || decode?.decoded.engineCylinders || null, existingDamage: input.existingDamage || null, fuelTypePrimary: input.fuelTypePrimary || decode?.decoded.fuelTypePrimary || null, gvwr: input.gvwr || decode?.decoded.gvwr || null, keyCount: input.keyCount ?? null, runningStatus: input.runningStatus || null, series: input.series || decode?.decoded.series || null, transmissionStyle: input.transmissionStyle || decode?.decoded.transmissionStyle || null, trim: input.trim || decode?.decoded.trim || null, warningLights: input.warningLights || null };
  const fieldOrigins = Object.fromEntries(Object.entries(specifications).filter(([, value]) => value != null && value !== "").map(([field]) => {
    const staffFields = new Set(["arrivalMethod", "detailedNotes", "drivableStatus", "existingDamage", "keyCount", "runningStatus", "warningLights"]);
    const explicitOverrides = new Set(["bodyClass", "cabType", "displacementLiters", "doors", "driveType", "engineConfiguration", "engineCylinders", "fuelTypePrimary", "gvwr", "series", "transmissionStyle", "trim"].filter(key => Boolean(input[key as keyof Input])));
    return [field, staffFields.has(field) || explicitOverrides.has(field) ? staffOrigin : decodedOrigin];
  }));
  const result = await createRegistryVehicle(actor, {
    color: input.color || null, idempotencyKey: input.idempotencyKey, licensePlate: input.licensePlate || null, licensePlateState: input.licensePlateState || null,
    locationId: input.locationId, make, model, nonVinReason: input.nonVinReason || null,
    reason: `Add vehicle for ${input.reasonCode.toLowerCase().replaceAll("_", " ")}: ${input.description}`,
    vin: input.vin || null, year,
    workflowContext: { addMode: input.addMode, description: input.description, recommendedWorkflowCode: recommendation.code, relationship: input.relationship, reasonCode: input.reasonCode }
  }, {}, {
    canonicalOrigins: { color: input.color ? staffOrigin : null, licensePlate: input.licensePlate ? staffOrigin : null, licensePlateState: input.licensePlateState ? staffOrigin : null, make: decodedOrigin, model: decodedOrigin, vin: input.vin ? decodedOrigin : { ...staffOrigin, source: "DOCUMENTED_NON_VIN_EXCEPTION" }, year: decodedOrigin },
    initialOdometer: input.odometer == null ? null : { observedAt: new Date(), reading: input.odometer, sourceCode: "ADD_VEHICLE_STAFF_OBSERVATION", unit: input.odometerUnit },
    specificationSnapshot: { addMode: input.addMode, decodedAt: decode?.retrievedAt ?? null, fieldOrigins, mappingVersion: decode?.mappingVersion ?? 1, provider: decode?.provider ?? "STAFF_CONFIRMED", specifications, vin: input.vin || null, warnings: decode?.warnings ?? ["NHTSA decoding was unavailable during canonical creation; year, make, and model were staff-confirmed."] }
  });
  const created = result.result as { duplicateReviewId?: string | null; id: string; vehicleNumber: string };
  return { ...result, nextWorkflow: { ...recommendation, href: nextHref(recommendation.code, created.id, input.description) } };
}
