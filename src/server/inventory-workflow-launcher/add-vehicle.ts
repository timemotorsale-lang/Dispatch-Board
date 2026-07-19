import type { AuthenticatedUser } from "@/server/auth/store";
import { ADD_VEHICLE_ALLOWED_REASONS, ADD_VEHICLE_REASONS, ADD_VEHICLE_RELATIONSHIPS, recommendAddVehicleWorkflow, type AddVehicleReason, type AddVehicleRelationship } from "@/lib/add-vehicle-workflow";
import { createRegistryVehicle, previewVehicleRegistryImport } from "@/server/vehicle-registry/service";

type Input = {
  color?: string;
  description: string;
  idempotencyKey: string;
  licensePlate?: string;
  locationId: string;
  make: string;
  model: string;
  nonVinReason?: string;
  reasonCode: AddVehicleReason;
  relationship: AddVehicleRelationship;
  vin?: string;
  year: number | string;
};

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

export function normalizeAddVehicleWorkflowInput(value: unknown): Input {
  const raw = record(value);
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
  return {
    color: optional(raw.color), description, idempotencyKey: required(raw.idempotencyKey, "Idempotency key", 200),
    licensePlate: optional(raw.licensePlate), locationId: required(raw.locationId, "Current location", 100),
    make: required(raw.make, "Make", 100), model: required(raw.model, "Model", 100), nonVinReason,
    reasonCode, relationship, vin, year
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
  const raw = record(value); const vin = required(raw.vin, "VIN", 40);
  const preview = await previewVehicleRegistryImport(actor, { rows: [{ idempotencyKey: `add-vehicle-preview-${vin}`, reason: "Validate identity before Add Vehicle workflow creation.", vehicleNumber: "ADD-VEHICLE-PREVIEW", vin }] });
  const row = preview.rows[0];
  if (!row || row.status === "INVALID") throw new Error(row && "error" in row ? row.error : "Vehicle identity could not be validated.");
  const potentialDuplicate = "potentialDuplicate" in row ? row.potentialDuplicate : null;
  return { identity: { validationSource: row.normalized.vinValidationSource, vin: row.normalized.vin, vinState: row.normalized.vinState }, potentialDuplicate: potentialDuplicate ?? null };
}

export async function startAddVehicleWorkflow(actor: AuthenticatedUser | null, value: unknown) {
  const input = normalizeAddVehicleWorkflowInput(value); const recommendation = recommendAddVehicleWorkflow(input);
  const result = await createRegistryVehicle(actor, {
    color: input.color || null, idempotencyKey: input.idempotencyKey, licensePlate: input.licensePlate || null,
    locationId: input.locationId, make: input.make, model: input.model, nonVinReason: input.nonVinReason || null,
    reason: `Add vehicle for ${input.reasonCode.toLowerCase().replaceAll("_", " ")}: ${input.description}`,
    vin: input.vin || null, year: input.year,
    workflowContext: { description: input.description, recommendedWorkflowCode: recommendation.code, relationship: input.relationship, reasonCode: input.reasonCode }
  });
  const created = result.result as { duplicateReviewId?: string | null; id: string; vehicleNumber: string };
  return { ...result, nextWorkflow: { ...recommendation, href: nextHref(recommendation.code, created.id, input.description) } };
}
