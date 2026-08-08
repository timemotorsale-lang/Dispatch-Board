import type { AuthenticatedUser } from "@/server/auth/store";
import { INITIAL_ORGANIZATION } from "@/server/appointments/location-foundation";
import { EnterpriseCommandConflictError } from "@/server/enterprise-command/domain";
import { assertAuthenticatedUser } from "@/server/policies/access";

import {
  createTimeAttendanceCaptureRepository,
  type TimeAttendanceCaptureRepository
} from "./capture-repository";
import {
  normalizeTimeAttendanceCaptureCommand,
  type TimeAttendanceCaptureCommand
} from "./commands";
import { requireTimeAttendanceCapability } from "./capabilities";
import {
  createTimeCardProjectionService,
  type TimeCardProjectionService,
  type TimeCardProjectionOutcome
} from "./projection-service";
import { recordSafeInternalTimeAttendanceNotification } from "./notification-service";

type Dependencies = {
  now?: () => Date;
  organizationId?: string;
  repository?: TimeAttendanceCaptureRepository;
  projectionService?: TimeCardProjectionService;
};

export type TimeAttendanceCaptureResult = {
  commandId: string;
  correlationId: string;
  duplicate: boolean;
  event: {
    id: string;
    eventType: TimeAttendanceCaptureCommand["commandType"];
    occurredAt: string;
    recordedAt: string;
  } | null;
  session: {
    id: string;
    state: string;
    staffUserId: string;
    version: number;
  } | null;
  version: number;
  projection: TimeCardProjectionOutcome;
};

function requireObject(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Time attendance capture payload must be an object.");
  }

  return value as Record<string, unknown>;
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function optionalBoolean(value: unknown) {
  return typeof value === "boolean" ? value : undefined;
}

function normalizeCaptureRequest(
  actor: AuthenticatedUser,
  value: unknown,
  deps: Required<Pick<Dependencies, "now" | "organizationId">>
) {
  const raw = requireObject(value);
  const occurredAt = stringValue(raw.occurredAt) || deps.now().toISOString();
  const staffUserId = stringValue(raw.staffUserId) || actor.id;

  return normalizeTimeAttendanceCaptureCommand({
    actorUserId: actor.id,
    commandType: stringValue(raw.commandType) as TimeAttendanceCaptureCommand["commandType"],
    completelyRelieved: optionalBoolean(raw.completelyRelieved),
    expectedVersion: Number(raw.expectedVersion),
    idempotencyKey: stringValue(raw.idempotencyKey),
    locationId: stringValue(raw.locationId),
    occurredAt,
    organizationId: deps.organizationId,
    paid: optionalBoolean(raw.paid),
    reason: stringValue(raw.reason),
    staffUserId,
    timezone: stringValue(raw.timezone)
  });
}

async function assertCaptureAuthorization(input: {
  actor: AuthenticatedUser;
  locationId: string;
  organizationId: string;
  staffUserId: string;
}) {
  try {
    await requireTimeAttendanceCapability({
      actor: input.actor,
      capability: input.actor.id === input.staffUserId ? "TIME_SELF_SERVICE" : "TIME_ATTENDANCE_MANAGER",
      locationId: input.locationId,
      organizationId: input.organizationId
    });
  } catch (error) {
    if (input.actor.id !== input.staffUserId) {
      throw new Error("Only the staff member or a manager with time attendance authority may record this time.");
    }
    throw error;
  }
}

function toReadModel(
  input: Awaited<ReturnType<TimeAttendanceCaptureRepository["commitCapture"]>>,
  projection: TimeCardProjectionOutcome
): TimeAttendanceCaptureResult {
  return {
    commandId: input.command.id,
    correlationId: input.command.correlationId,
    duplicate: input.duplicate,
    event: input.event
      ? {
          id: input.event.id,
          eventType: input.event.eventType,
          occurredAt: input.event.occurredAt.toISOString(),
          recordedAt: input.event.recordedAt.toISOString()
        }
      : null,
    session: input.session
      ? {
          id: input.session.id,
          state: input.session.state,
          staffUserId: input.session.staffUserId,
          version: input.session.version
        }
      : null,
    version: input.version,
    projection
  };
}

export async function submitTimeAttendanceCaptureCommand(
  actor: AuthenticatedUser | null,
  value: unknown,
  input: Dependencies = {}
) {
  const user = assertAuthenticatedUser(actor);
  const deps = {
    now: input.now ?? (() => new Date()),
    organizationId: input.organizationId ?? INITIAL_ORGANIZATION.id,
    repository: input.repository ?? createTimeAttendanceCaptureRepository(),
    projectionService: input.projectionService ?? createTimeCardProjectionService()
  };
  const command = normalizeCaptureRequest(user, value, deps);
  await assertCaptureAuthorization({
    actor: user,
    locationId: command.locationId,
    organizationId: command.organizationId,
    staffUserId: command.staffUserId
  });

  try {
    const captured = await deps.repository.commitCapture(command);
    let projection: TimeCardProjectionOutcome;
    try {
      projection = await deps.projectionService.project({
        organizationId: command.organizationId,
        staffUserId: command.staffUserId,
        locationId: command.locationId,
        occurredAt: new Date(command.occurredAt),
        trigger: "CAPTURE"
      });
    } catch (projectionError) {
      projection = {
        state: "BLOCKED",
        cardId: null,
        cardVersion: null,
        checksum: null,
        payrollReady: false,
        reason: `Punch accepted and preserved, but card projection is unavailable. Refresh to retry. ${projectionError instanceof Error ? projectionError.message : "Unknown projection error."}`
      };
    }
    if (projection.state === "BLOCKED" && !captured.duplicate) {
      const stalePolicy = projection.reason?.includes("policy assignment") === true;
      await recordSafeInternalTimeAttendanceNotification({
        organizationId: command.organizationId,
        locationId: command.locationId,
        recipientUserId: command.staffUserId,
        notificationType: stalePolicy ? "STALE_POLICY_ASSIGNMENT" : "PROJECTION_FAILURE",
        severity: "WARNING",
        title: stalePolicy ? "Time card policy setup required" : "Time card update needs attention",
        body: projection.reason ?? "The punch was preserved, but the card could not be refreshed.",
        sourceType: "TIME_ATTENDANCE_EVENT",
        sourceId: captured.event?.id ?? null,
        payload: { punchAccepted: true, commandId: captured.command.id }
      });
    }
    return toReadModel(captured, projection);
  } catch (error) {
    if (error instanceof EnterpriseCommandConflictError) {
      throw error;
    }
    throw error;
  }
}
