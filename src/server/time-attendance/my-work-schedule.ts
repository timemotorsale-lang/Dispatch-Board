import { INITIAL_ORGANIZATION } from "@/server/appointments/location-foundation";
import { getLocationLocalDate, locationLocalDateMinuteToInstant } from "@/server/appointments/location-time-service";
import type { AuthenticatedUser } from "@/server/auth/store";
import { resolveWorkRecordRoute } from "@/server/auth/navigation";
import { prisma } from "@/server/db/client";
import { evaluateVehicleCapability } from "@/server/enterprise-command/vehicle-capabilities";
import { canUseStaffCalendar } from "@/server/policies/access";
import { evaluateTimeAttendanceCapability, getTimeAttendanceCapabilityGrants } from "./capabilities";
import { storedTimeOffWindows } from "./time-off-windows";

export type MyScheduleEntry = {
  id: string;
  title: string;
  type: "Appointment" | "Repair assignment" | "Approved time off";
  start: string;
  end: string;
  href?: string;
};

function offsetDate(date: string, offset: number) {
  const value = new Date(date + "T00:00:00Z");
  value.setUTCDate(value.getUTCDate() + offset);
  return value.toISOString().slice(0, 10);
}

export async function getMyWorkSchedule(actor: AuthenticatedUser, locationId: string, fallbackTimezone: string, requestedWeek?: string) {
  const organizationId = INITIAL_ORGANIZATION.id;
  const location = await prisma.location.findFirst({ where: { id: locationId, organizationId }, select: { timezone: true } }).catch(() => null);
  const timezone = location?.timezone ?? fallbackTimezone;
  const today = getLocationLocalDate(new Date(), timezone);
  const candidate = typeof requestedWeek === "string" && /^\d{4}-\d{2}-\d{2}$/.test(requestedWeek) ? new Date(requestedWeek + "T00:00:00Z") : null;
  const date = candidate && Number.isFinite(candidate.getTime()) && candidate.toISOString().slice(0, 10) === requestedWeek
    ? requestedWeek : today;
  const day = new Date(date + "T00:00:00Z").getUTCDay();
  const start = offsetDate(date, -((day + 6) % 7));
  const end = offsetDate(start, 6);
  const base = { start, end, previous: offsetDate(start, -7), next: offsetDate(start, 7), timezone };
  try {
    const grants = await getTimeAttendanceCapabilityGrants({ actor, organizationId });
    if (!location || !evaluateTimeAttendanceCapability({ actor, locationId, grants, capability: "TIME_SELF_SERVICE" }).allowed) {
      return { ...base, available: false, entries: [] as MyScheduleEntry[] };
    }
    const startsAt = locationLocalDateMinuteToInstant({ localDate: start, minuteOfDay: 0, timezone });
    const endsAt = locationLocalDateMinuteToInstant({ localDate: offsetDate(start, 7), minuteOfDay: 0, timezone });
    const overlapping = { startsAt: { lt: endsAt }, endsAt: { gt: startsAt } };
    const scope = { locationId, organizationId };
    const appointmentsPermitted = canUseStaffCalendar(actor);
    const repairPermitted = evaluateVehicleCapability({ actor, grants, locationId, capability: "REPAIR_ORDER_VIEW" }).allowed;
    const [appointments, jobs, absences] = await Promise.all([
      appointmentsPermitted ? prisma.appointment.findMany({
        where: { ...scope, ...overlapping, bookingStatus: "SCHEDULED", OR: [{ ownerUserId: actor.id }, { participants: { some: { userId: actor.id } } }] },
        select: { id: true, startsAt: true, endsAt: true, title: true }
      }) : [],
      repairPermitted ? prisma.repairJobDispatch.findMany({
        where: { ...scope, technicianUserId: actor.id, status: { in: ["STAGED", "ACTIVE", "COMPLETED"] },
          scheduledStartAt: { lt: endsAt }, scheduledEndAt: { gt: startsAt } },
        select: { id: true, repairJobId: true, scheduledStartAt: true, scheduledEndAt: true, repairJob: { select: { jobNumber: true } } }
      }) : [],
      prisma.timeOffRequest.findMany({
        where: { ...scope, ...overlapping, requesterUserId: actor.id, status: "APPROVED" },
        select: { id: true, startsAt: true, endsAt: true, evidence: true }
      })
    ]);
    const entries: MyScheduleEntry[] = [
      ...appointments.flatMap(row => row.startsAt && row.endsAt ? [{
        id: row.id, title: row.title, type: "Appointment" as const, start: row.startsAt.toISOString(), end: row.endsAt.toISOString(),
        href: `/appointments?view=calendar&appointment=${encodeURIComponent(row.id)}`
      }] : []),
      ...jobs.map(row => ({
        id: row.id, title: row.repairJob.jobNumber, type: "Repair assignment" as const,
        start: row.scheduledStartAt.toISOString(), end: row.scheduledEndAt.toISOString(), href: resolveWorkRecordRoute({ repairJobId: row.repairJobId })
      })),
      ...absences.flatMap(row => storedTimeOffWindows(row).filter(window => window.startsAt < endsAt && window.endsAt > startsAt).map(window => ({
        id: `${row.id}:${window.startsAt.toISOString()}`, title: "Approved time off", type: "Approved time off" as const,
        start: window.startsAt.toISOString(), end: window.endsAt.toISOString(), href: "/time-attendance?view=my-time&action=leave#time-off-request"
      })))
    ];
    return { ...base, available: true, entries: entries.sort((a, b) => a.start.localeCompare(b.start)) };
  } catch (error) {
    console.error("Could not load personal work schedule", error);
    return { ...base, available: false, entries: [] as MyScheduleEntry[] };
  }
}
