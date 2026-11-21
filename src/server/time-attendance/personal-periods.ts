import { Prisma } from "@prisma/client";
import { INITIAL_ORGANIZATION } from "@/server/appointments/location-foundation";
import type { AuthenticatedUser } from "@/server/auth/store";
import { prisma } from "@/server/db/client";
import { getTimeAttendanceCapabilitySet } from "./capabilities";
import { hashEnterpriseCommand } from "@/server/enterprise-command/domain";

const dateKey = /^\d{4}-\d{2}-\d{2}$/;
const object = (input: unknown): Record<string, unknown> =>
  input && typeof input === "object" && !Array.isArray(input) ? input as Record<string, unknown> : {};
const key = (date: Date) => date.toISOString().slice(0, 10);
const text = (value: unknown) => typeof value === "string" ? value : "";

export function summarizePersonalCardDays(snapshot: unknown, start: string, end: string) {
  const intervals = object(object(object(object(snapshot).replay).projection).intervals);
  if (!Array.isArray(intervals.attendance) || !Array.isArray(intervals.meals) || !Array.isArray(intervals.paidWork)) return null;
  const days = new Map<string, { date: string; span: number; meal: number; paid: number; attendance: { startAt: string; endAt: string }[] }>();
  for (const [name, column] of [["attendance", "span"], ["meals", "meal"], ["paidWork", "paid"]] as const) {
    for (const value of intervals[name] as unknown[]) {
      const interval = object(value);
      const date = text(interval.localDate);
      const startAt = text(interval.startAt);
      const endAt = text(interval.endAt);
      const minutes = interval.durationMinutes;
      if (!dateKey.test(date) || typeof minutes !== "number" || !Number.isSafeInteger(minutes) || minutes < 0 ||
          !startAt || !endAt || !Number.isFinite(Date.parse(startAt)) || !Number.isFinite(Date.parse(endAt))) return null;
      if (date < start || date > end) continue;
      const day = days.get(date) ?? { date, span: 0, meal: 0, paid: 0, attendance: [] };
      day[column] += minutes;
      if (column === "span") day.attendance.push({ startAt, endAt });
      days.set(date, day);
    }
  }
  return [...days.values()].sort((a, b) => a.date.localeCompare(b.date));
}

const periodSelect = {
  id: true, periodStart: true, periodEnd: true, status: true, version: true,
} satisfies Prisma.TimeCardSelect;

export async function getPersonalTimeCardPeriods(user: AuthenticatedUser, currentCardId: string, requestedId?: string) {
  const organizationId = INITIAL_ORGANIZATION.id;
  try {
    const capabilities = await getTimeAttendanceCapabilitySet({ actor: user, organizationId });
    if (!capabilities.TIME_SELF_SERVICE) return { periods: [], selected: null, unavailable: true as const };
    const scope = { organizationId, staffUserId: user.id, status: { not: "VOID" as const } };
    const cards = await prisma.timeCard.findMany({
      where: scope, select: periodSelect,
      distinct: ["periodStart", "periodEnd"],
      orderBy: [{ periodStart: "desc" }, { periodEnd: "desc" }, { version: "desc" }],
      take: 24,
    });
    const periods = cards.map(card => ({
      id: card.id, key: `${key(card.periodStart)}_${key(card.periodEnd)}`, start: key(card.periodStart), end: key(card.periodEnd), status: card.status, version: card.version,
      current: card.id === currentCardId,
    }));
    const requestedPeriod = requestedId === undefined ? periods.find(period => period.current) : periods.find(period => period.key === requestedId);
    const selected = requestedPeriod ? await prisma.timeCard.findFirst({
      where: { ...scope, id: requestedPeriod.id },
      select: {
        calculationSnapshot: true, payrollReady: true, policyProfile: { select: { name: true, timezone: true } },
        exceptions: { where: { status: { in: ["OPEN", "ACKNOWLEDGED"] } }, select: { code: true, message: true, blocking: true } },
      },
    }) : null;
    const timeOff = object(object(selected?.calculationSnapshot).timeOffTotals);
    const credit = selected && requestedPeriod ? await prisma.enterpriseAuditEvent.findFirst({
      where: {
        organizationId, subjectType: "ESSTPayPeriod", eventType: "ESST_PERIOD_CREDITED",
        subjectId: hashEnterpriseCommand({ employee: user.id, start: requestedPeriod.start, end: requestedPeriod.end })
      },
      select: { newValue: true }
    }) : null;
    const posting = object(credit?.newValue);
    return {
      periods,
      unavailable: false as const,
      selected: selected && requestedPeriod ? {
        ...requestedPeriod,
        policy: selected.policyProfile.name,
        timezone: selected.policyProfile.timezone,
        days: summarizePersonalCardDays(selected.calculationSnapshot, requestedPeriod.start, requestedPeriod.end),
        esstUsedMinutes: typeof timeOff.ESST === "number" && timeOff.ESST >= 0 ? timeOff.ESST :
          object(selected.calculationSnapshot).timeOffTotals === undefined ? null : 0,
        esstAvailableAfterPosting: posting.cardId === requestedPeriod.id && typeof posting.availableMinutes === "number"
          ? posting.availableMinutes : null,
        exceptions: selected.exceptions,
        payrollReady: selected.payrollReady,
      } : null,
    };
  } catch {
    return { periods: [], selected: null, unavailable: true as const };
  }
}

export type PersonalTimeCardPeriods = Awaited<ReturnType<typeof getPersonalTimeCardPeriods>>;
