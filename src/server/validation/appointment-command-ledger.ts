import {
  APPOINTMENT_COMMAND_STATUSES,
  APPOINTMENT_COMMAND_TYPES,
  type AppointmentCommandStatus,
  type AppointmentCommandType
} from "@/server/appointments/appointment-domain";

const commandTypes = new Set<string>(APPOINTMENT_COMMAND_TYPES);
const commandStatuses = new Set<string>(APPOINTMENT_COMMAND_STATUSES);
const structuredCodePattern = /^[A-Z0-9]+(?:_[A-Z0-9]+)*$/;

const appointmentVersionRequiredCommands = new Set<AppointmentCommandType>([
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

function requiredText(value: string, label: string, maximumLength: number) {
  const normalized = value.trim();

  if (!normalized) {
    throw new Error(`${label} is required.`);
  }

  if (normalized.length > maximumLength) {
    throw new Error(`${label} cannot exceed ${maximumLength} characters.`);
  }

  return normalized;
}

function optionalText(value: string | null | undefined, label: string, maximumLength: number) {
  const normalized = value?.trim() ?? "";

  if (normalized.length > maximumLength) {
    throw new Error(`${label} cannot exceed ${maximumLength} characters.`);
  }

  return normalized || null;
}

function optionalStructuredCode(
  value: string | null | undefined,
  label: string,
  maximumLength = 100
) {
  const normalized = optionalText(value, label, maximumLength)?.toUpperCase() ?? null;

  if (normalized && !structuredCodePattern.test(normalized)) {
    throw new Error(`${label} must contain uppercase letters, numbers, and single underscores only.`);
  }

  return normalized;
}

function optionalPositiveInteger(value: number | null | undefined, label: string) {
  if (value === null || value === undefined) {
    return null;
  }

  if (!Number.isInteger(value) || value < 1) {
    throw new Error(`${label} must be a positive integer.`);
  }

  return value;
}

function nonNegativeInteger(value: number | null | undefined, label: string) {
  const normalized = value ?? 0;

  if (!Number.isInteger(normalized) || normalized < 0) {
    throw new Error(`${label} must be a non-negative integer.`);
  }

  return normalized;
}

function optionalDate(value: Date | null | undefined, label: string) {
  if (value === null || value === undefined) {
    return null;
  }

  if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
    throw new Error(`${label} must be a valid date.`);
  }

  return new Date(value);
}

function jsonObject(value: unknown, label: string) {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be a JSON object.`);
  }

  return value;
}

export type AppointmentCommandLedgerInput = {
  organizationId: string;
  locationId?: string | null;
  appointmentId?: string | null;
  actorUserId?: string | null;
  commandType: string;
  status?: string;
  idempotencyKey: string;
  requestHash: string;
  correlationId: string;
  causationId?: string | null;
  expectedAppointmentVersion?: number | null;
  currentAppointmentVersion?: number | null;
  attemptCount?: number | null;
  maxAttempts?: number | null;
  nextRetryAt?: Date | null;
  lockedAt?: Date | null;
  completedAt?: Date | null;
  failedAt?: Date | null;
  resultSnapshot?: unknown;
  errorCode?: string | null;
  errorMessage?: string | null;
};

export function normalizeAppointmentCommandLedgerEntry(input: AppointmentCommandLedgerInput) {
  if (!commandTypes.has(input.commandType)) {
    throw new Error(`Appointment command type is invalid: "${input.commandType}".`);
  }

  const status = input.status ?? "PENDING";

  if (!commandStatuses.has(status)) {
    throw new Error(`Appointment command status is invalid: "${status}".`);
  }

  const commandType = input.commandType as AppointmentCommandType;
  const commandStatus = status as AppointmentCommandStatus;
  const expectedAppointmentVersion = optionalPositiveInteger(
    input.expectedAppointmentVersion,
    "Appointment command expected version"
  );
  const currentAppointmentVersion = optionalPositiveInteger(
    input.currentAppointmentVersion,
    "Appointment command current version"
  );
  const attemptCount = nonNegativeInteger(
    input.attemptCount,
    "Appointment command attempt count"
  );
  const maxAttempts = nonNegativeInteger(input.maxAttempts, "Appointment command max attempts");
  const errorCode = optionalStructuredCode(input.errorCode, "Appointment command error code");
  const failedAt = optionalDate(input.failedAt, "Appointment command failure time");
  const nextRetryAt = optionalDate(input.nextRetryAt, "Appointment command next retry time");
  const lockedAt = optionalDate(input.lockedAt, "Appointment command lock time");
  const completedAt = optionalDate(input.completedAt, "Appointment command completion time");

  if (appointmentVersionRequiredCommands.has(commandType) && !expectedAppointmentVersion) {
    throw new Error(`${commandType} appointment commands require an expected appointment version.`);
  }

  if (attemptCount > maxAttempts) {
    throw new Error("Appointment command attempt count cannot exceed max attempts.");
  }

  if (commandStatus === "RUNNING" && !lockedAt) {
    throw new Error("Running appointment commands require a lock time.");
  }

  if (commandStatus === "SUCCEEDED" && !completedAt) {
    throw new Error("Succeeded appointment commands require a completion time.");
  }

  if (["FAILED_RETRYABLE", "FAILED_TERMINAL", "CONFLICT"].includes(commandStatus)) {
    if (!failedAt) {
      throw new Error(`${commandStatus} appointment commands require a failure time.`);
    }

    if (!errorCode) {
      throw new Error(`${commandStatus} appointment commands require an error code.`);
    }
  }

  if (commandStatus === "FAILED_RETRYABLE" && !nextRetryAt) {
    throw new Error("Retryable appointment command failures require a next retry time.");
  }

  if (commandStatus === "CONFLICT" && !currentAppointmentVersion) {
    throw new Error("Conflicted appointment commands require the current appointment version.");
  }

  return {
    organizationId: requiredText(input.organizationId, "Appointment command organization", 100),
    locationId: optionalText(input.locationId, "Appointment command location", 100),
    appointmentId: optionalText(input.appointmentId, "Appointment command appointment", 100),
    actorUserId: optionalText(input.actorUserId, "Appointment command actor", 100),
    commandType,
    status: commandStatus,
    idempotencyKey: requiredText(
      input.idempotencyKey,
      "Appointment command idempotency key",
      160
    ),
    requestHash: requiredText(input.requestHash, "Appointment command request hash", 128),
    correlationId: requiredText(input.correlationId, "Appointment command correlation", 120),
    causationId: optionalText(input.causationId, "Appointment command causation", 120),
    expectedAppointmentVersion,
    currentAppointmentVersion,
    attemptCount,
    maxAttempts,
    nextRetryAt,
    lockedAt,
    completedAt,
    failedAt,
    resultSnapshot: jsonObject(input.resultSnapshot, "Appointment command result snapshot"),
    errorCode,
    errorMessage: optionalText(input.errorMessage, "Appointment command error message", 1200)
  };
}

export function assertAppointmentVersionForCommand(input: {
  expectedVersion: number;
  currentVersion: number;
}) {
  const expectedVersion = optionalPositiveInteger(
    input.expectedVersion,
    "Expected appointment version"
  );
  const currentVersion = optionalPositiveInteger(
    input.currentVersion,
    "Current appointment version"
  );

  if (expectedVersion !== currentVersion) {
    throw new Error(
      `Stale appointment command. Expected version ${expectedVersion}; current version is ${currentVersion}.`
    );
  }

  return currentVersion;
}
