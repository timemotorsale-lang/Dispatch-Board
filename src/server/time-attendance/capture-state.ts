import { INITIAL_MINNEAPOLIS_LOCATION, INITIAL_ORGANIZATION } from "@/server/appointments/location-foundation";
import type { AuthenticatedUser } from "@/server/auth/store";
import { prisma } from "@/server/db/client";
import { assertAuthenticatedUser } from "@/server/policies/access";

import type { AttendanceSessionState, TimeAttendanceCaptureCommand } from "./commands";

export type TimeAttendanceCaptureAction = TimeAttendanceCaptureCommand["commandType"];

export type TimeAttendanceCaptureState = {
  allowedActions: TimeAttendanceCaptureAction[];
  unavailableReason?: string;
  expectedVersion: number;
  locationId: string;
  nextPrimaryAction: TimeAttendanceCaptureAction;
  paidRestActive: boolean;
  lastAcceptedPunch: { eventType: string; occurredAt: string } | null;
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
  timeAttendanceBreakInterval?: {
    findFirst(input: { where: Record<string, unknown>; orderBy: Record<string, string>; select: { id: true } }): Promise<{ id: string } | null>;
  };
  timeAttendanceEvent?: {
    findFirst(input: Record<string, unknown>): Promise<{ eventType: string; occurredAt: Date } | null>;
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

function allowedActionsFor(state: AttendanceSessionState, paidRestActive = false): TimeAttendanceCaptureAction[] {
  if (state === "NONE" || state === "CLOSED") return ["CLOCK_IN"];
  if (state === "OPEN") return paidRestActive ? ["END_PAID_REST"] : ["START_MEAL", "START_PAID_REST", "CLOCK_OUT"];
  return ["END_MEAL"];
}

function primaryActionFor(state: AttendanceSessionState, paidRestActive = false): TimeAttendanceCaptureAction {
  if (paidRestActive) return "END_PAID_REST";
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

export function unavailableTimeAttendanceCaptureState(input: {
  locationId: string;
  reason: string;
  staffUserId: string;
  timezone: string;
}): TimeAttendanceCaptureState {
  return {
    allowedActions: [],
    expectedVersion: 0,
    locationId: input.locationId,
    nextPrimaryAction: "CLOCK_IN",
    paidRestActive: false,
    lastAcceptedPunch: null,
    session: null,
    staffUserId: input.staffUserId,
    state: "NONE",
    statusLabel: "Capture unavailable",
    timezone: input.timezone,
    unavailableReason: input.reason
  };
}

export function createTimeAttendanceCaptureStateRepository(
  database: TimeAttendanceCaptureStateDatabase = prisma as unknown as TimeAttendanceCaptureStateDatabase
): TimeAttendanceCaptureStateRepository {
  return {
    getCurrentState(input) {
      return database.$transaction(async (tx) => {
        const subjectId = `attendance-session:${input.staffUserId}`;
        const [aggregate, session, lastAcceptedPunch] = await Promise.all([
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
          }),
          tx.timeAttendanceEvent
            ? tx.timeAttendanceEvent.findFirst({
                where: { organizationId: input.organizationId, staffUserId: input.staffUserId },
                orderBy: [{ occurredAt: "desc" }, { recordedAt: "desc" }],
                select: { eventType: true, occurredAt: true }
              })
            : Promise.resolve(null)
        ]);
        const state = session?.state ?? "NONE";
        const openPaidRest = session && tx.timeAttendanceBreakInterval
          ? await tx.timeAttendanceBreakInterval.findFirst({
              where: { sessionId: session.id, kind: "PAID_REST", endAt: null },
              orderBy: { startAt: "desc" },
              select: { id: true }
            })
          : null;
        const paidRestActive = Boolean(openPaidRest);

        return {
          allowedActions: allowedActionsFor(state, paidRestActive),
          expectedVersion: aggregate?.version ?? 0,
          locationId: input.locationId,
          nextPrimaryAction: primaryActionFor(state, paidRestActive),
          paidRestActive,
          lastAcceptedPunch: lastAcceptedPunch ? { eventType: lastAcceptedPunch.eventType, occurredAt: lastAcceptedPunch.occurredAt.toISOString() } : null,
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

export async function getSafeTimeAttendanceCaptureState(
  actor: AuthenticatedUser | null,
  input: {
    locationId?: string;
    organizationId?: string;
    repository?: TimeAttendanceCaptureStateRepository;
    timezone?: string;
  } = {}
) {
  const user = assertAuthenticatedUser(actor);
  const locationId = input.locationId ?? INITIAL_MINNEAPOLIS_LOCATION.id;
  const timezone = input.timezone ?? INITIAL_MINNEAPOLIS_LOCATION.timezone;

  try {
    return await getTimeAttendanceCaptureState(user, {
      ...input,
      locationId,
      timezone
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Time attendance capture state is unavailable.";
    return unavailableTimeAttendanceCaptureState({
      locationId,
      reason: message,
      staffUserId: user.id,
      timezone
    });
  }
}
