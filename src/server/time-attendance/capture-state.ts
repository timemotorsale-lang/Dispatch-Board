import { INITIAL_MINNEAPOLIS_LOCATION, INITIAL_ORGANIZATION } from "@/server/appointments/location-foundation";
import type { AuthenticatedUser } from "@/server/auth/store";
import { prisma } from "@/server/db/client";
import { assertAuthenticatedUser } from "@/server/policies/access";

import type { AttendanceSessionState, TimeAttendanceCaptureCommand } from "./commands";

export type TimeAttendanceCaptureAction = TimeAttendanceCaptureCommand["commandType"];

export type TimeAttendanceCaptureState = {
  allowedActions: TimeAttendanceCaptureAction[];
  expectedVersion: number;
  locationId: string;
  nextPrimaryAction: TimeAttendanceCaptureAction;
  session: {
    id: string;
    openedAt: string;
    state: Exclude<AttendanceSessionState, "NONE">;
    version: number;
  } | null;
  staffUserId: string;
  state: AttendanceSessionState;
  statusLabel: string;
  timezone: string;
};

type SessionRecord = {
  id: string;
  openedAt: Date;
  state: "OPEN" | "ON_MEAL";
  version: number;
};

type AggregateVersionRecord = {
  version: number;
};

type TimeAttendanceCaptureStateTransaction = {
  enterpriseAggregateVersion: {
    findUnique(input: { where: Record<string, unknown>; select: { version: true } }): Promise<AggregateVersionRecord | null>;
  };
  timeAttendanceSession: {
    findFirst(input: { where: Record<string, unknown>; orderBy: Record<string, string>; select: Record<string, boolean> }): Promise<SessionRecord | null>;
  };
};

type TimeAttendanceCaptureStateDatabase = {
  $transaction<T>(callback: (tx: TimeAttendanceCaptureStateTransaction) => Promise<T>): Promise<T>;
};

export type TimeAttendanceCaptureStateRepository = {
  getCurrentState(input: {
    locationId: string;
    organizationId: string;
    staffUserId: string;
    timezone: string;
  }): Promise<TimeAttendanceCaptureState>;
};

function allowedActionsFor(state: AttendanceSessionState): TimeAttendanceCaptureAction[] {
  if (state === "NONE" || state === "CLOSED") return ["CLOCK_IN"];
  if (state === "OPEN") return ["START_MEAL", "CLOCK_OUT"];
  return ["END_MEAL"];
}

function primaryActionFor(state: AttendanceSessionState): TimeAttendanceCaptureAction {
  if (state === "OPEN") return "START_MEAL";
  if (state === "ON_MEAL") return "END_MEAL";
  return "CLOCK_IN";
}

function statusLabelFor(state: AttendanceSessionState) {
  if (state === "OPEN") return "Clocked in";
  if (state === "ON_MEAL") return "On meal break";
  if (state === "CLOSED") return "Shift closed";
  return "Ready to clock in";
}

export function createTimeAttendanceCaptureStateRepository(
  database: TimeAttendanceCaptureStateDatabase = prisma as unknown as TimeAttendanceCaptureStateDatabase
): TimeAttendanceCaptureStateRepository {
  return {
    getCurrentState(input) {
      return database.$transaction(async (tx) => {
        const subjectId = `attendance-session:${input.staffUserId}`;
        const [aggregate, session] = await Promise.all([
          tx.enterpriseAggregateVersion.findUnique({
            where: {
              organizationId_domain_subjectType_subjectId: {
                organizationId: input.organizationId,
                domain: "TIME_ATTENDANCE",
                subjectType: "ATTENDANCE_SESSION",
                subjectId
              }
            },
            select: { version: true }
          }),
          tx.timeAttendanceSession.findFirst({
            where: {
              organizationId: input.organizationId,
              staffUserId: input.staffUserId,
              state: { in: ["OPEN", "ON_MEAL"] }
            },
            orderBy: { openedAt: "desc" },
            select: {
              id: true,
              openedAt: true,
              state: true,
              version: true
            }
          })
        ]);
        const state = session?.state ?? "NONE";

        return {
          allowedActions: allowedActionsFor(state),
          expectedVersion: aggregate?.version ?? 0,
          locationId: input.locationId,
          nextPrimaryAction: primaryActionFor(state),
          session: session
            ? {
                id: session.id,
                openedAt: session.openedAt.toISOString(),
                state: session.state,
                version: session.version
              }
            : null,
          staffUserId: input.staffUserId,
          state,
          statusLabel: statusLabelFor(state),
          timezone: input.timezone
        };
      });
    }
  };
}

export async function getTimeAttendanceCaptureState(
  actor: AuthenticatedUser | null,
  input: {
    locationId?: string;
    organizationId?: string;
    repository?: TimeAttendanceCaptureStateRepository;
    timezone?: string;
  } = {}
) {
  const user = assertAuthenticatedUser(actor);
  const repository = input.repository ?? createTimeAttendanceCaptureStateRepository();

  return repository.getCurrentState({
    locationId: input.locationId ?? INITIAL_MINNEAPOLIS_LOCATION.id,
    organizationId: input.organizationId ?? INITIAL_ORGANIZATION.id,
    staffUserId: user.id,
    timezone: input.timezone ?? INITIAL_MINNEAPOLIS_LOCATION.timezone
  });
}
