import type { EnterpriseCommandInput } from "@/server/enterprise-command/domain";

export type TimeAttendanceCommandType =
  | "CLOCK_IN"
  | "START_MEAL"
  | "END_MEAL"
  | "CLOCK_OUT"
  | "REQUEST_CORRECTION"
  | "ATTEST_CARD"
  | "APPROVE_CARD"
  | "SUBMIT_TIME_OFF"
  | "DECIDE_TIME_OFF"
  | "EXPORT_PAYROLL";

export type AttendanceSessionState = "NONE" | "OPEN" | "ON_MEAL" | "CLOSED";

export type TimeAttendanceCaptureCommand = {
  actorUserId: string;
  completelyRelieved?: boolean;
  commandType: Extract<
    TimeAttendanceCommandType,
    "CLOCK_IN" | "START_MEAL" | "END_MEAL" | "CLOCK_OUT"
  >;
  expectedVersion: number;
  idempotencyKey: string;
  locationId: string;
  occurredAt: string;
  organizationId: string;
  reason: string;
  paid?: boolean;
  staffUserId: string;
  timezone: string;
};

export type AttendanceTransitionResult = {
  nextState: AttendanceSessionState;
  eventType: TimeAttendanceCaptureCommand["commandType"];
};

const allowedTransitions: Record<
  AttendanceSessionState,
  Partial<Record<TimeAttendanceCaptureCommand["commandType"], AttendanceSessionState>>
> = {
  NONE: { CLOCK_IN: "OPEN" },
  OPEN: { START_MEAL: "ON_MEAL", CLOCK_OUT: "CLOSED" },
  ON_MEAL: { END_MEAL: "OPEN" },
  CLOSED: {}
};

const captureCommandTypes = new Set(["CLOCK_IN", "START_MEAL", "END_MEAL", "CLOCK_OUT"]);

function requireText(value: string, label: string) {
  if (!value.trim()) {
    throw new Error(`${label} is required.`);
  }
}

function requireTimestamp(value: string) {
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    throw new Error("Occurred at must be an ISO timestamp.");
  }
}

function requireNonnegativeInteger(value: number, label: string) {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${label} must be a nonnegative integer.`);
  }
}

export function evaluateAttendanceCaptureTransition(input: {
  currentState: AttendanceSessionState;
  commandType: TimeAttendanceCaptureCommand["commandType"];
}): AttendanceTransitionResult {
  const nextState = allowedTransitions[input.currentState][input.commandType];
  if (!nextState) {
    throw new Error(
      `Cannot apply ${input.commandType} while attendance session is ${input.currentState}.`
    );
  }

  return {
    eventType: input.commandType,
    nextState
  };
}

export function normalizeTimeAttendanceCaptureCommand(
  input: TimeAttendanceCaptureCommand
): TimeAttendanceCaptureCommand {
  const commandType = input.commandType.trim().toUpperCase();
  requireText(input.actorUserId, "Actor user");
  requireText(commandType, "Command type");
  requireText(input.idempotencyKey, "Idempotency key");
  requireText(input.locationId, "Location");
  requireText(input.organizationId, "Organization");
  requireText(input.reason, "Reason");
  requireText(input.staffUserId, "Staff user");
  requireText(input.timezone, "Timezone");
  requireTimestamp(input.occurredAt);
  requireNonnegativeInteger(input.expectedVersion, "Expected version");

  if (input.reason.trim().length < 10) {
    throw new Error("Time attendance commands require a reason of at least 10 characters.");
  }
  if (!captureCommandTypes.has(commandType)) {
    throw new Error("Time attendance capture command type is invalid.");
  }

  return {
    ...input,
    actorUserId: input.actorUserId.trim(),
    commandType: commandType as TimeAttendanceCaptureCommand["commandType"],
    idempotencyKey: input.idempotencyKey.trim(),
    locationId: input.locationId.trim(),
    organizationId: input.organizationId.trim(),
    reason: input.reason.trim(),
    staffUserId: input.staffUserId.trim(),
    timezone: input.timezone.trim()
  };
}

export function toEnterpriseTimeAttendanceCommand(
  input: TimeAttendanceCaptureCommand
): EnterpriseCommandInput {
  const command = normalizeTimeAttendanceCaptureCommand(input);
  return {
    actorUserId: command.actorUserId,
    commandType: command.commandType,
    domain: "TIME_ATTENDANCE",
    expectedVersion: command.expectedVersion,
    idempotencyKey: command.idempotencyKey,
    locationId: command.locationId,
    organizationId: command.organizationId,
    payload: {
      completelyRelieved: command.completelyRelieved ?? null,
      occurredAt: command.occurredAt,
      paid: command.paid ?? null,
      staffUserId: command.staffUserId,
      timezone: command.timezone
    },
    reason: command.reason,
    subjectId: `attendance-session:${command.staffUserId}`,
    subjectType: "ATTENDANCE_SESSION"
  };
}
