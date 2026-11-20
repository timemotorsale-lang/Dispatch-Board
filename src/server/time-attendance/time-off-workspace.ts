import { getLocationLocalDate, getLocationMinuteOfDay } from "@/server/appointments/location-time-service";
import { INITIAL_ORGANIZATION } from "@/server/appointments/location-foundation";
import type { Prisma } from "@prisma/client";
import type { AuthenticatedUser } from "@/server/auth/store";
import { prisma } from "@/server/db/client";
import { getTimeAttendanceCapabilitySet } from "./capabilities";
import { pendingTimeOffStatuses, storedTimeOffWindows, timeOffEvidence, type TimeOffWindow } from "./time-off-windows";

export type TimeOffDay = { date: string; start: string; end: string };

const requestSelect = {
  id: true, requestType: true, status: true, requestedMinutes: true, startsAt: true, endsAt: true,
  updatedAt: true, operationalNote: true, protectedRouting: true, evidence: true, decisionReason: true
} satisfies Prisma.TimeOffRequestSelect;

function windowDay(window: TimeOffWindow, timezone: string): TimeOffDay {
  const clock = (time: Date) => {
    const minutes = getLocationMinuteOfDay(time, timezone);
    return [Math.floor(minutes / 60), minutes % 60].map(part => String(part).padStart(2, "0")).join(":");
  };
  return { date: getLocationLocalDate(window.startsAt, timezone), start: clock(window.startsAt), end: clock(window.endsAt) };
}

export async function getMyTimeOffWorkspace(actor: AuthenticatedUser, locationId: string, fallbackTimezone: string, now = new Date()) {
  const empty = { today: getLocationLocalDate(now, fallbackTimezone), timezone: fallbackTimezone, locationId, available: false, requests: [], balances: [] };
  try {
    const organizationId = INITIAL_ORGANIZATION.id;
    const [capabilities, location] = await Promise.all([
      getTimeAttendanceCapabilitySet({ actor, organizationId, locationId }),
      prisma.location.findFirst({ where: { id: locationId, organizationId }, select: { timezone: true } })
    ]);
    if (!capabilities.TIME_SELF_SERVICE || !location) return empty;
    const timezone = location.timezone;
    const today = getLocationLocalDate(now, timezone);
    const year = Number(today.slice(0, 4));
    const [requests, balances, pendingRequests] = await Promise.all([
      prisma.timeOffRequest.findMany({
        where: { organizationId, requesterUserId: actor.id, locationId },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 100, select: requestSelect
      }),
      prisma.timeOffBalance.findMany({
        where: { organizationId, userId: actor.id, balanceYear: { in: [year, year + 1] }, balanceType: { in: ["PTO", "ESST"] } },
        select: { balanceType: true, balanceYear: true, availableMinutes: true }
      }),
      prisma.timeOffRequest.findMany({
        where: { organizationId, requesterUserId: actor.id, status: { in: [...pendingTimeOffStatuses] } },
        select: { id: true, startsAt: true, requestType: true, requestedMinutes: true, evidence: true }
      })
    ]);
    return {
      today, timezone, locationId, available: true,
      balances: [year, year + 1].flatMap(balanceYear => (["PTO", "ESST"] as const).map(type => ({
        balanceYear, type,
        availableMinutes: balances.find(balance => balance.balanceType === type && balance.balanceYear === balanceYear)?.availableMinutes ?? null,
        pending: pendingRequests.filter(request => request.requestType === type &&
          (timeOffEvidence(request.evidence).balanceYear ?? request.startsAt.getUTCFullYear()) === balanceYear)
          .map(request => ({ id: request.id, minutes: request.requestedMinutes }))
      }))),
      requests: requests.map(request => {
        const evidence = timeOffEvidence(request.evidence);
        const windows = storedTimeOffWindows(request);
        return {
          id: request.id, requestType: request.requestType, status: request.status, requestedMinutes: request.requestedMinutes,
          startsAt: request.startsAt.toISOString(), endsAt: request.endsAt.toISOString(), version: request.updatedAt.toISOString(),
          canWithdraw: ["DRAFT", "SUBMITTED", "LEAVE_ADMIN_REVIEW"].includes(request.status),
          canRevise: ["DRAFT", "SUBMITTED", "LEAVE_ADMIN_REVIEW"].includes(request.status) &&
            ["PTO", "ESST", "UNPAID"].includes(request.requestType) &&
            windows.every(window => getLocationLocalDate(window.startsAt, timezone) === getLocationLocalDate(window.endsAt, timezone)),
          days: windows.map(window => windowDay(window, timezone)),
          note: request.protectedRouting ? null : request.operationalNote,
          decisionReason: request.decisionReason,
          returned: evidence.returnedForRevision === true,
          projectionPending: evidence.projectionPending === true,
          rebuiltPeriods: Array.isArray(evidence.rebuiltPeriods) ? evidence.rebuiltPeriods.flatMap(value => {
            const period = timeOffEvidence(value);
            return typeof period.start === "string" && typeof period.end === "string" ? [{ start: period.start, end: period.end }] : [];
          }) : []
        };
      })
    };
  } catch (error) {
    console.error("Could not load employee time off", error);
    return empty;
  }
}

export type MyTimeOffWorkspace = Awaited<ReturnType<typeof getMyTimeOffWorkspace>>;
