import {
  APPOINTMENT_ATTENDANCE_STATUSES,
  APPOINTMENT_BOOKING_STATUSES,
  APPOINTMENT_CONFIRMATION_STATUSES,
  APPOINTMENT_EXECUTION_STATUSES,
  APPOINTMENT_SOURCE_TYPES,
  type AppointmentAttendanceStatus,
  type AppointmentBookingStatus,
  type AppointmentConfirmationStatus,
  type AppointmentExecutionStatus,
  type AppointmentSourceType
} from "@/server/appointments/appointment-domain";

const bookingStatuses = new Set<string>(APPOINTMENT_BOOKING_STATUSES);
const confirmationStatuses = new Set<string>(APPOINTMENT_CONFIRMATION_STATUSES);
const attendanceStatuses = new Set<string>(APPOINTMENT_ATTENDANCE_STATUSES);
const executionStatuses = new Set<string>(APPOINTMENT_EXECUTION_STATUSES);
const sourceTypes = new Set<string>(APPOINTMENT_SOURCE_TYPES);
const appointmentNumberPattern = /^[A-Z0-9]+(?:-[A-Z0-9]+)*$/;
const structuredCodePattern = /^[A-Z0-9]+(?:_[A-Z0-9]+)*$/;

function normalizeRequiredText(value: string, label: string, maximumLength: number) {
  const normalized = value.trim();

  if (!normalized) {
    throw new Error(`${label} is required.`);
  }

  if (normalized.length > maximumLength) {
    throw new Error(`${label} cannot exceed ${maximumLength} characters.`);
  }

  return normalized;
}

function normalizeOptionalText(
  value: string | null | undefined,
  label: string,
  maximumLength: number
) {
  const normalized = value?.trim() ?? "";

  if (normalized.length > maximumLength) {
    throw new Error(`${label} cannot exceed ${maximumLength} characters.`);
  }

  return normalized || null;
}

function normalizeOptionalCode(value: string | null | undefined, label: string) {
  const normalized = normalizeOptionalText(value, label, 100)?.toUpperCase() ?? null;

  if (normalized && !structuredCodePattern.test(normalized)) {
    throw new Error(`${label} must contain uppercase letters, numbers, and single underscores only.`);
  }

  return normalized;
}

function normalizeOptionalDate(value: Date | null | undefined, label: string) {
  if (value === null || value === undefined) {
    return null;
  }

  if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
    throw new Error(`${label} must be a valid date.`);
  }

  return new Date(value);
}

function requireValidTimezone(value: string) {
  const timezone = normalizeRequiredText(value, "Appointment scheduling timezone", 100);

  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone }).format(new Date());
  } catch {
    throw new Error(`Appointment scheduling timezone must be valid. Received "${value}".`);
  }

  return timezone;
}

function normalizeSnapshot(value: unknown, label: string) {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be a JSON object.`);
  }

  return value;
}

function requireCode(value: string | null, label: string) {
  if (!value) {
    throw new Error(`${label} is required.`);
  }
}

function requireDate(value: Date | null, label: string) {
  if (!value) {
    throw new Error(`${label} is required.`);
  }
}

export type AppointmentAggregateInput = {
  appointmentNumber: string;
  organizationId: string;
  locationId: string;
  ownerUserId?: string | null;
  createdByUserId?: string | null;
  sourceType: string;
  sourceReference?: string | null;
  title: string;
  schedulingTimezone: string;
  startsAt?: Date | null;
  endsAt?: Date | null;
  bookingStatus: string;
  confirmationStatus: string;
  attendanceStatus: string;
  executionStatus: string;
  version: number;
  purposeSnapshot?: unknown;
  customerSnapshot?: unknown;
  vehicleSnapshot?: unknown;
  sourceSnapshot?: unknown;
  confirmedAt?: Date | null;
  declinedAt?: Date | null;
  checkedInAt?: Date | null;
  noShowAt?: Date | null;
  startedAt?: Date | null;
  waitingAt?: Date | null;
  finishedAt?: Date | null;
  cancelledAt?: Date | null;
  completedAt?: Date | null;
  cancellationReasonCode?: string | null;
  cancellationReasonNotes?: string | null;
  confirmationDeclineReasonCode?: string | null;
  confirmationDeclineReasonNotes?: string | null;
  noShowReasonCode?: string | null;
  noShowReasonNotes?: string | null;
  waitingReasonCode?: string | null;
  waitingReasonNotes?: string | null;
  outcomeCode?: string | null;
  outcomeNotes?: string | null;
  followUpDispositionCode?: string | null;
  followUpNotes?: string | null;
};

export function normalizeAppointmentAggregate(input: AppointmentAggregateInput) {
  const appointmentNumber = normalizeRequiredText(
    input.appointmentNumber,
    "Appointment number",
    64
  ).toUpperCase();

  if (!appointmentNumberPattern.test(appointmentNumber)) {
    throw new Error(
      "Appointment number must contain uppercase letters, numbers, and single hyphens only."
    );
  }

  if (!sourceTypes.has(input.sourceType)) {
    throw new Error(`Appointment source type is invalid: "${input.sourceType}".`);
  }

  if (!bookingStatuses.has(input.bookingStatus)) {
    throw new Error(`Appointment booking status is invalid: "${input.bookingStatus}".`);
  }

  if (!confirmationStatuses.has(input.confirmationStatus)) {
    throw new Error(
      `Appointment confirmation status is invalid: "${input.confirmationStatus}".`
    );
  }

  if (!attendanceStatuses.has(input.attendanceStatus)) {
    throw new Error(`Appointment attendance status is invalid: "${input.attendanceStatus}".`);
  }

  if (!executionStatuses.has(input.executionStatus)) {
    throw new Error(`Appointment execution status is invalid: "${input.executionStatus}".`);
  }

  if (!Number.isInteger(input.version) || input.version < 1) {
    throw new Error("Appointment version must be a positive integer.");
  }

  const normalized = {
    appointmentNumber,
    organizationId: normalizeRequiredText(input.organizationId, "Appointment organization", 100),
    locationId: normalizeRequiredText(input.locationId, "Appointment location", 100),
    ownerUserId: normalizeOptionalText(input.ownerUserId, "Appointment owner", 100),
    createdByUserId: normalizeOptionalText(input.createdByUserId, "Appointment creator", 100),
    sourceType: input.sourceType as AppointmentSourceType,
    sourceReference: normalizeOptionalText(
      input.sourceReference,
      "Appointment source reference",
      200
    ),
    title: normalizeRequiredText(input.title, "Appointment title", 200),
    schedulingTimezone: requireValidTimezone(input.schedulingTimezone),
    startsAt: normalizeOptionalDate(input.startsAt, "Appointment start"),
    endsAt: normalizeOptionalDate(input.endsAt, "Appointment end"),
    bookingStatus: input.bookingStatus as AppointmentBookingStatus,
    confirmationStatus: input.confirmationStatus as AppointmentConfirmationStatus,
    attendanceStatus: input.attendanceStatus as AppointmentAttendanceStatus,
    executionStatus: input.executionStatus as AppointmentExecutionStatus,
    version: input.version,
    purposeSnapshot: normalizeSnapshot(input.purposeSnapshot, "Appointment purpose snapshot"),
    customerSnapshot: normalizeSnapshot(input.customerSnapshot, "Appointment customer snapshot"),
    vehicleSnapshot: normalizeSnapshot(input.vehicleSnapshot, "Appointment vehicle snapshot"),
    sourceSnapshot: normalizeSnapshot(input.sourceSnapshot, "Appointment source snapshot"),
    confirmedAt: normalizeOptionalDate(input.confirmedAt, "Appointment confirmation time"),
    declinedAt: normalizeOptionalDate(input.declinedAt, "Appointment decline time"),
    checkedInAt: normalizeOptionalDate(input.checkedInAt, "Appointment check-in time"),
    noShowAt: normalizeOptionalDate(input.noShowAt, "Appointment no-show time"),
    startedAt: normalizeOptionalDate(input.startedAt, "Appointment execution start"),
    waitingAt: normalizeOptionalDate(input.waitingAt, "Appointment waiting time"),
    finishedAt: normalizeOptionalDate(input.finishedAt, "Appointment finish time"),
    cancelledAt: normalizeOptionalDate(input.cancelledAt, "Appointment cancellation time"),
    completedAt: normalizeOptionalDate(input.completedAt, "Appointment completion time"),
    cancellationReasonCode: normalizeOptionalCode(
      input.cancellationReasonCode,
      "Appointment cancellation reason code"
    ),
    cancellationReasonNotes: normalizeOptionalText(
      input.cancellationReasonNotes,
      "Appointment cancellation reason notes",
      4000
    ),
    confirmationDeclineReasonCode: normalizeOptionalCode(
      input.confirmationDeclineReasonCode,
      "Appointment confirmation-decline reason code"
    ),
    confirmationDeclineReasonNotes: normalizeOptionalText(
      input.confirmationDeclineReasonNotes,
      "Appointment confirmation-decline reason notes",
      4000
    ),
    noShowReasonCode: normalizeOptionalCode(
      input.noShowReasonCode,
      "Appointment no-show reason code"
    ),
    noShowReasonNotes: normalizeOptionalText(
      input.noShowReasonNotes,
      "Appointment no-show reason notes",
      4000
    ),
    waitingReasonCode: normalizeOptionalCode(
      input.waitingReasonCode,
      "Appointment waiting reason code"
    ),
    waitingReasonNotes: normalizeOptionalText(
      input.waitingReasonNotes,
      "Appointment waiting reason notes",
      4000
    ),
    outcomeCode: normalizeOptionalCode(input.outcomeCode, "Appointment outcome code"),
    outcomeNotes: normalizeOptionalText(input.outcomeNotes, "Appointment outcome notes", 4000),
    followUpDispositionCode: normalizeOptionalCode(
      input.followUpDispositionCode,
      "Appointment follow-up disposition code"
    ),
    followUpNotes: normalizeOptionalText(
      input.followUpNotes,
      "Appointment follow-up notes",
      4000
    )
  };

  const hasStart = Boolean(normalized.startsAt);
  const hasEnd = Boolean(normalized.endsAt);

  if (hasStart !== hasEnd) {
    throw new Error("Appointment start and end must either both be supplied or both be empty.");
  }

  if (normalized.startsAt && normalized.endsAt && normalized.endsAt <= normalized.startsAt) {
    throw new Error("Appointment end must be after its start.");
  }

  const isCommitted = ["SCHEDULED", "CANCELLED", "COMPLETED"].includes(
    normalized.bookingStatus
  );

  if (isCommitted) {
    if (!normalized.ownerUserId) {
      throw new Error("A committed appointment requires exactly one accountable owner.");
    }

    requireDate(normalized.startsAt, "Committed appointment start");
    requireDate(normalized.endsAt, "Committed appointment end");

    if (!normalized.purposeSnapshot) {
      throw new Error("A committed appointment requires a purpose snapshot.");
    }
  } else if (
    normalized.attendanceStatus !== "EXPECTED" ||
    normalized.executionStatus !== "NOT_STARTED"
  ) {
    throw new Error("Draft and pending appointments cannot record attendance or execution.");
  }

  if (normalized.bookingStatus === "CANCELLED") {
    requireDate(normalized.cancelledAt, "Appointment cancellation time");
    requireCode(normalized.cancellationReasonCode, "Appointment cancellation reason code");
    requireCode(
      normalized.followUpDispositionCode,
      "Cancelled appointment follow-up disposition code"
    );
  }

  if (normalized.bookingStatus === "COMPLETED") {
    requireDate(normalized.completedAt, "Appointment completion time");
    requireCode(normalized.outcomeCode, "Completed appointment outcome code");
    requireCode(
      normalized.followUpDispositionCode,
      "Completed appointment follow-up disposition code"
    );

    if (normalized.executionStatus !== "FINISHED") {
      throw new Error("A completed appointment requires finished execution.");
    }
  }

  if (normalized.confirmationStatus === "CONFIRMED") {
    requireDate(normalized.confirmedAt, "Appointment confirmation time");
  }

  if (normalized.confirmationStatus === "DECLINED") {
    requireDate(normalized.declinedAt, "Appointment decline time");
    requireCode(
      normalized.confirmationDeclineReasonCode,
      "Appointment confirmation-decline reason code"
    );
    requireCode(
      normalized.followUpDispositionCode,
      "Declined appointment follow-up disposition code"
    );
  }

  if (normalized.attendanceStatus === "CHECKED_IN") {
    requireDate(normalized.checkedInAt, "Appointment check-in time");
  }

  if (normalized.attendanceStatus === "NO_SHOW") {
    requireDate(normalized.noShowAt, "Appointment no-show time");
    requireCode(normalized.noShowReasonCode, "Appointment no-show reason code");
    requireCode(
      normalized.followUpDispositionCode,
      "No-show appointment follow-up disposition code"
    );

    if (normalized.executionStatus !== "NOT_STARTED") {
      throw new Error("A no-show appointment cannot have started execution.");
    }
  }

  if (normalized.executionStatus === "IN_PROGRESS") {
    requireDate(normalized.startedAt, "Appointment execution start");
  }

  if (normalized.executionStatus === "WAITING") {
    requireDate(normalized.startedAt, "Appointment execution start");
    requireDate(normalized.waitingAt, "Appointment waiting time");
    requireCode(normalized.waitingReasonCode, "Appointment waiting reason code");

    if (!normalized.waitingReasonNotes) {
      throw new Error("A waiting appointment requires the expected next step in reason notes.");
    }
  }

  if (normalized.executionStatus === "FINISHED") {
    requireDate(normalized.startedAt, "Appointment execution start");
    requireDate(normalized.finishedAt, "Appointment finish time");
  }

  return normalized;
}
