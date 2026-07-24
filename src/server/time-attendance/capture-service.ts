import type { AuthenticatedUser } from "@/server/auth/store";
import { INITIAL_ORGANIZATION } from "@/server/appointments/location-foundation";
import { EnterpriseCommandConflictError } from "@/server/enterprise-command/domain";
import { assertAuthenticatedUser, isManager } from "@/server/policies/access";

import {
  createTimeAttendanceCaptureRepository,
  type TimeAttendanceCaptureRepository
} from "./capture-repository";
import {
  normalizeTimeAttendanceCaptureCommand,
  type TimeAttendanceCaptureCommand
} from "./commands";

type Dependencies = {
  now?: () => Date;
  organizationId?: string;
  repository?: TimeAttendanceCaptureRepository;
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

function assertCaptureAuthorization(actor: AuthenticatedUser, staffUserId: string) {
  if (actor.id === staffUserId || isManager(actor)) {
    return;
  }

  throw new Error("Only the staff member or a manager may record this time.");
}

function toReadModel(input: Awaited<ReturnType<TimeAttendanceCaptureRepository["commitCapture"]>>): TimeAttendanceCaptureResult {
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
    version: input.version
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
    repository: input.repository ?? createTimeAttendanceCaptureRepository()
  };
  const command = normalizeCaptureRequest(user, value, deps);
  assertCaptureAuthorization(user, command.staffUserId);

  try {
    return toReadModel(await deps.repository.commitCapture(command));
  } catch (error) {
    if (error instanceof EnterpriseCommandConflictError) {
      throw error;
    }
    throw error;
  }
}
