import {
  APPOINTMENT_COMMAND_TYPES,
  type AppointmentCommandType
} from "@/server/appointments/appointment-domain";

const commandTypes = new Set<string>(APPOINTMENT_COMMAND_TYPES);
const existingAppointmentCommands = new Set<AppointmentCommandType>([
  "SCHEDULE",
  "RESCHEDULE",
  "CANCEL",
  "COMPLETE",
  "CONFIRM",
  "DECLINE",
  "CHECK_IN",
  "NO_SHOW",
  "START",
  "WAIT",
  "FINISH",
  "TRANSFER_OWNER",
  "OVERRIDE_WARNING",
  "LINK_TASK",
  "UNLINK_TASK"
]);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function requiredText(value: unknown, label: string, maximumLength: number) {
  if (typeof value !== "string") {
    throw new Error(`${label} is required.`);
  }

  const normalized = value.trim();

  if (!normalized) {
    throw new Error(`${label} is required.`);
  }

  if (normalized.length > maximumLength) {
    throw new Error(`${label} cannot exceed ${maximumLength} characters.`);
  }

  return normalized;
}

function optionalText(value: unknown, label: string, maximumLength: number) {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value !== "string") {
    throw new Error(`${label} must be text.`);
  }

  const normalized = value.trim();

  if (normalized.length > maximumLength) {
    throw new Error(`${label} cannot exceed ${maximumLength} characters.`);
  }

  return normalized || null;
}

function optionalPositiveInteger(value: unknown, label: string) {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value !== "number" || !Number.isInteger(value) || value < 1) {
    throw new Error(`${label} must be a positive integer.`);
  }

  return value;
}

function optionalNonNegativeInteger(value: unknown, label: string) {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    throw new Error(`${label} must be a non-negative integer.`);
  }

  return value;
}

function normalizePayload(value: unknown) {
  if (value === null || value === undefined) {
    return {};
  }

  if (!isPlainObject(value)) {
    throw new Error("Appointment command payload must be a JSON object.");
  }

  return value;
}

export type NormalizedAppointmentCommandRequest = {
  commandType: AppointmentCommandType;
  organizationId: string | null;
  locationId: string | null;
  appointmentId: string | null;
  ownerUserId: string | null;
  idempotencyKey: string;
  correlationId: string | null;
  causationId: string | null;
  expectedAppointmentVersion: number | null;
  maxAttempts: number;
  payload: Record<string, unknown>;
};

export function normalizeAppointmentCommandRequest(
  input: unknown
): NormalizedAppointmentCommandRequest {
  if (!isPlainObject(input)) {
    throw new Error("Appointment command payload must be an object.");
  }

  const commandType = requiredText(input.commandType, "Appointment command type", 80);

  if (!commandTypes.has(commandType)) {
    throw new Error(`Appointment command type is invalid: "${commandType}".`);
  }

  const normalizedCommandType = commandType as AppointmentCommandType;
  const appointmentId = optionalText(input.appointmentId, "Appointment command appointment", 100);
  const organizationId = optionalText(input.organizationId, "Appointment command organization", 100);
  const locationId = optionalText(input.locationId, "Appointment command location", 100);
  const expectedAppointmentVersion = optionalPositiveInteger(
    input.expectedAppointmentVersion,
    "Appointment command expected version"
  );
  const maxAttempts =
    optionalNonNegativeInteger(input.maxAttempts, "Appointment command max attempts") ?? 0;

  if (existingAppointmentCommands.has(normalizedCommandType) && !appointmentId) {
    throw new Error(`${normalizedCommandType} appointment commands require an appointment id.`);
  }

  if (normalizedCommandType === "CREATE_DRAFT" && (!organizationId || !locationId)) {
    throw new Error("CREATE_DRAFT appointment commands require an organization and location.");
  }

  return {
    commandType: normalizedCommandType,
    organizationId,
    locationId,
    appointmentId,
    ownerUserId: optionalText(input.ownerUserId, "Appointment command owner", 100),
    idempotencyKey: requiredText(
      input.idempotencyKey,
      "Appointment command idempotency key",
      160
    ),
    correlationId: optionalText(input.correlationId, "Appointment command correlation", 120),
    causationId: optionalText(input.causationId, "Appointment command causation", 120),
    expectedAppointmentVersion,
    maxAttempts,
    payload: normalizePayload(input.payload)
  };
}
