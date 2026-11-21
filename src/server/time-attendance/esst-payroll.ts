import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";

import { INITIAL_MINNEAPOLIS_LOCATION, INITIAL_ORGANIZATION } from "@/server/appointments/location-foundation";
import { locationLocalDateMinuteToInstant } from "@/server/appointments/location-time-service";
import type { AuthenticatedUser } from "@/server/auth/store";
import { prisma } from "@/server/db/client";
import { hashEnterpriseCommand } from "@/server/enterprise-command/domain";
import { assertAuthenticatedUser } from "@/server/policies/access";
import { calculateMinnesotaEsstStandardAccrual } from "./calculations";
import { requireTimeAttendanceCapability } from "./capabilities";
import { summarizePersonalCardDays } from "./personal-periods";
import { localDateKey } from "./period";
import { storedTimeOffWindows, timeOffEvidence, timeOffMinutes } from "./time-off-windows";

const organizationId = INITIAL_ORGANIZATION.id;
const locationId = INITIAL_MINNEAPOLIS_LOCATION.id;
const finalized = ["LOCKED", "EXPORTED"] as const;
const dayMs = 86_400_000;
const esstPolicyVersion = "MN-ESST-STANDARD-ACCRUAL-2026-07-06";
const dateKey = (date: Date) => date.toISOString().slice(0, 10);
const previousDay = (date: Date) => dateKey(new Date(date.getTime() - dayMs));

type EsstState = {
  through: string;
  eligibleFrom: string;
  remainder: number;
  weekdayMinutes: number[] | null;
};

function isDateKey(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + "T00:00:00Z");
  return Number.isFinite(date.getTime()) && dateKey(date) === value;
}

function minutes(value: unknown, minimum: number, maximum: number, label: string) {
  if (typeof value !== "number" || !Number.isInteger(value) || value < minimum || value > maximum) {
    throw new Error(`${label} must be a whole number of minutes from ${minimum} to ${maximum}.`);
  }
  return value;
}

function weeklySchedule(value: unknown): number[] | null {
  if (value === null) return null;
  if (!Array.isArray(value) || value.length !== 7) throw new Error("Enter verified minutes for each day of the exempt workweek.");
  const schedule = value.map(entry => minutes(entry, 0, 1440, "Daily deemed work time"));
  const weekly = schedule.reduce((total, day) => total + day, 0);
  if (weekly < 1 || weekly > 2400) throw new Error("Use 40 weekly hours for exempt staff, or their verified normal workweek if it is shorter.");
  return schedule;
}

function readState(snapshot: unknown): EsstState | null {
  const value = timeOffEvidence(timeOffEvidence(snapshot).esstAccrual);
  if (!isDateKey(value.through) || !isDateKey(value.eligibleFrom) ||
      typeof value.remainder !== "number" || !Number.isInteger(value.remainder) || value.remainder < 0 || value.remainder >= 1800) return null;
  return { through: value.through, eligibleFrom: value.eligibleFrom, remainder: value.remainder, weekdayMinutes: weeklySchedule(value.weekdayMinutes) };
}

function balanceEvidence(source: unknown, state: EsstState) {
  return { ...timeOffEvidence(source), esstAccrual: state, esstPolicyVersion } as Prisma.InputJsonValue;
}

export function esstWorkByYear(input: { start: Date; end: Date; snapshot: unknown; state: EsstState }) {
  const daily = input.state.weekdayMinutes === null ? summarizePersonalCardDays(input.snapshot, dateKey(input.start), dateKey(input.end)) : null;
  if (input.state.weekdayMinutes === null && !daily) throw new Error("This card lacks daily worked-time evidence. Rebuild or reconcile it before posting ESST.");
  const actualMinutes = new Map(daily?.map(day => [day.date, day.paid]));
  const years = new Map<number, number>();
  for (let time = input.start.getTime(); time <= input.end.getTime(); time += dayMs) {
    const day = new Date(time);
    const year = day.getUTCFullYear();
    const eligibleMinutes = dateKey(day) < input.state.eligibleFrom ? 0 :
      input.state.weekdayMinutes ? input.state.weekdayMinutes[(day.getUTCDay() + 6) % 7] : actualMinutes.get(dateKey(day)) ?? 0;
    years.set(year, (years.get(year) ?? 0) + eligibleMinutes);
  }
  return years;
}

async function payrollActor(actor: AuthenticatedUser | null) {
  const user = assertAuthenticatedUser(actor);
  await requireTimeAttendanceCapability({ actor: user, capability: "TIME_PAYROLL_ADMIN", organizationId, locationId });
  return user;
}

export async function getEsstPayrollCards(actor: AuthenticatedUser | null, period: { start: string; end: string }) {
  const user = await payrollActor(actor);
  if (!isDateKey(period.start) || !isDateKey(period.end) || period.start > period.end) {
    throw new Error("Choose a valid pay-period start and end.");
  }
  const cards = await prisma.timeCard.findMany({
    where: { organizationId, locationId, staffUserId: { not: user.id }, periodStart: new Date(period.start), periodEnd: new Date(period.end), status: { not: "VOID" } },
    distinct: ["staffUserId"], orderBy: [{ staffUserId: "asc" }, { version: "desc" }],
    select: { id: true, status: true, payrollReady: true, staffUser: { select: { name: true } } }
  });
  return cards.filter(card => card.payrollReady && (card.status === "LOCKED" || card.status === "EXPORTED"))
    .map(card => ({ id: card.id, name: card.staffUser.name }));
}

export async function recordEsstPayroll(actor: AuthenticatedUser | null, payload: unknown) {
  const user = await payrollActor(actor);
  const raw = timeOffEvidence(payload);
  if (typeof raw.cardId !== "string" || !["SETUP", "POST"].includes(String(raw.action))) throw new Error("Choose a finalized pay-period card and action.");
  const cardId = raw.cardId;
  const reason = typeof raw.reason === "string" ? raw.reason.trim() : "";
  if (reason.length < 15 || reason.length > 500) throw new Error("Enter a payroll reference or explanation of 15–500 characters.");
  return prisma.$transaction(async tx => {
    const card = await tx.timeCard.findFirst({
      where: { id: cardId, organizationId, locationId }, include: { policyProfile: true, location: { select: { timezone: true } } }
    });
    if (!card || !card.payrollReady || !finalized.some(status => status === card.status)) throw new Error("Choose a locked or exported payroll card.");
    if (card.staffUserId === user.id) throw new Error("A separate payroll reviewer must post your own ESST.");
    const latest = await tx.timeCard.findFirst({
      where: { organizationId, staffUserId: card.staffUserId, periodStart: card.periodStart, periodEnd: card.periodEnd, status: { not: "VOID" } },
      orderBy: { version: "desc" }, select: { id: true }
    });
    if (latest?.id !== card.id) throw new Error("A newer card revision exists for this pay period.");
    if (card.policyProfile.jurisdiction !== "MINNESOTA" || card.policyProfile.esstPolicyVersionId !== esstPolicyVersion) {
      throw new Error("The finalized card must use the Minnesota standard-accrual policy.");
    }
    const start = dateKey(card.periodStart);
    const end = dateKey(card.periodEnd);
    if (end >= localDateKey(new Date(), card.location.timezone)) throw new Error("This pay period has not ended.");
    const periodId = hashEnterpriseCommand({ employee: card.staffUserId, start, end });
    const scope = { organizationId, userId: card.staffUserId, balanceType: "ESST" as const };
    const recent = await tx.timeOffBalance.findFirst({ where: scope, orderBy: { balanceYear: "desc" } });
    const state = readState(recent?.sourceSnapshot);
    if (recent && ((recent.annualAccrualCapMinutes !== null && recent.annualAccrualCapMinutes !== 2880) ||
      (recent.bankCapMinutes !== null && recent.bankCapMinutes !== 4800) ||
      recent.accruedMinutes > 2880 || recent.availableMinutes > 4800)) {
      throw new Error("The saved employee balance uses a different ESST policy. Reconcile it with payroll before proceeding.");
    }

    if (raw.action === "SETUP") {
      if (state) throw new Error("Payroll has already verified this employee's ESST opening. Use the existing balance.");
      if (raw.calendarYearConfirmed !== true || raw.standardAccrualConfirmed !== true || raw.eligibleConfirmed !== true || !isDateKey(raw.eligibleFrom)) {
        throw new Error("Confirm the calendar accrual year, standard accrual method, and the employee's ESST eligibility.");
      }
      const balanceYear = card.periodStart.getUTCFullYear();
      const available = minutes(raw.availableMinutes, 0, 4800, "Verified available balance");
      const accrued = minutes(raw.accruedMinutes, 0, 2880, "Verified year-to-date accrual");
      const remainder = minutes(raw.remainder, 0, 1799, "Verified worked-minute remainder");
      if (recent && (recent.balanceYear !== balanceYear || recent.availableMinutes !== available || recent.accruedMinutes !== accrued)) {
        throw new Error("The saved ESST balance differs from the verified opening. Reconcile it with payroll first.");
      }
      const setup = { through: previousDay(card.periodStart), eligibleFrom: raw.eligibleFrom, remainder, weekdayMinutes: weeklySchedule(raw.weekdayMinutes) };
      const sourceSnapshot = balanceEvidence(recent?.sourceSnapshot, setup);
      if (recent) await tx.timeOffBalance.update({ where: { id: recent.id }, data: { sourceSnapshot } });
      else await tx.timeOffBalance.create({ data: { ...scope, balanceYear, availableMinutes: available, accruedMinutes: accrued, annualAccrualCapMinutes: 2880, bankCapMinutes: 4800, sourceSnapshot } });
      await tx.enterpriseAuditEvent.create({ data: {
        organizationId, locationId, actorUserId: user.id, domain: "TIME_ATTENDANCE", subjectType: "ESSTOpening", subjectId: card.staffUserId,
        eventType: "ESST_OPENING_VERIFIED", reason, correlationId: randomUUID(), metadata: { policyVersion: esstPolicyVersion },
        newValue: { cardId, balanceYear, availableMinutes: available, accruedMinutes: accrued, ...setup }
      } });
      return { action: "SETUP" as const };
    }

    const prior = await tx.enterpriseAuditEvent.findFirst({
      where: { organizationId, subjectType: "ESSTPayPeriod", subjectId: periodId, eventType: "ESST_PERIOD_CREDITED" },
      select: { newValue: true }
    });
    if (prior) {
      const posted = timeOffEvidence(prior.newValue);
      if (posted.cardId !== card.id || posted.checksum !== card.sourceEventChecksum) {
        throw new Error("This period was credited from a different revision. Reconcile the difference through payroll.");
      }
      return { action: "POST" as const, duplicate: true, creditedMinutes: posted.creditedMinutes };
    }
    if (!state || !recent) throw new Error("Verify this employee's opening ESST balance before posting.");
    let zeroWorkGap: { start: string; end: string } | null = null;
    if (state.through !== previousDay(card.periodStart)) {
      if (raw.confirmedNoWorkGap !== true || state.weekdayMinutes || state.through >= start) {
        throw new Error(`Post the next consecutive period after ${state.through}, or verify a gap with no worked time for a nonexempt employee.`);
      }
      const gap = {
        start: dateKey(new Date(new Date(state.through).getTime() + dayMs)),
        end: previousDay(card.periodStart)
      };
      const startsAt = locationLocalDateMinuteToInstant({ localDate: gap.start, minuteOfDay: 0, timezone: card.location.timezone });
      const endsAt = locationLocalDateMinuteToInstant({ localDate: start, minuteOfDay: 0, timezone: card.location.timezone });
      const [otherCard, attendance] = await Promise.all([
        tx.timeCard.findFirst({
          where: { organizationId, staffUserId: card.staffUserId, status: { not: "VOID" },
            periodStart: { lte: new Date(gap.end) }, periodEnd: { gte: new Date(gap.start) } }, select: { id: true }
        }),
        tx.timeAttendanceEvent.findFirst({
          where: { organizationId, staffUserId: card.staffUserId, correctedByEventId: null, occurredAt: { gte: startsAt, lt: endsAt } },
          select: { id: true }
        })
      ]);
      if (otherCard || attendance) throw new Error("The skipped dates contain an attendance record. Resolve that period before posting.");
      zeroWorkGap = gap;
    }
    const definitionId = timeOffEvidence(timeOffEvidence(card.calculationSnapshot).payPeriod).definitionId;
    const definition = typeof definitionId === "string" ? await tx.timeAttendancePayPeriodDefinition.findFirst({
      where: { id: definitionId, organizationId }, select: { timezone: true }
    }) : null;
    if (card.policyProfile.timezone !== card.location.timezone ||
        (typeof definitionId === "string" && definition?.timezone !== card.location.timezone)) {
      throw new Error("Reconcile the work and payroll time zones before crediting this card.");
    }
    const requestedUses = await tx.timeOffRequest.findMany({
      where: {
        organizationId, requesterUserId: card.staffUserId, requestType: "ESST", status: "APPROVED",
        OR: [
          { endsAt: { gt: card.periodStart } },
          { evidence: { path: ["esstDebitedBalanceYear"], equals: recent.balanceYear } }
        ]
      },
      select: { startsAt: true, endsAt: true, requestedMinutes: true, evidence: true }
    });

    let available = recent.availableMinutes;
    let accrued = recent.accruedMinutes;
    let remainder = state.remainder;
    let creditedMinutes = 0;
    const years = esstWorkByYear({ start: card.periodStart, end: card.periodEnd, snapshot: card.calculationSnapshot, state });
    const credits = [];
    for (const [year, workedMinutes] of years) {
      if (year < recent.balanceYear || year > recent.balanceYear + 1) throw new Error("Reconcile the balance year before posting.");
      if (year > recent.balanceYear) accrued = 0;
      const cutoff = locationLocalDateMinuteToInstant({
        localDate: year === card.periodEnd.getUTCFullYear() ? end : `${year}-12-31`, minuteOfDay: 1440, timezone: card.location.timezone
      });
      const reservedMinutes = requestedUses.reduce((total, request) => {
        const evidence = timeOffEvidence(request.evidence);
        if ((evidence.balanceYear ?? request.startsAt.getUTCFullYear()) !== year && evidence.esstDebitedBalanceYear !== year) return total;
        const windows = storedTimeOffWindows(request);
        const recorded = windows.reduce((sum, window) => sum + timeOffMinutes(window), 0);
        const future = windows.reduce((sum, window) => window.endsAt <= cutoff ? sum :
          sum + timeOffMinutes({ startsAt: window.startsAt > cutoff ? window.startsAt : cutoff, endsAt: window.endsAt }), 0);
        return total + (recorded === 0 ? 0 : Math.round(request.requestedMinutes * future / recorded));
      }, 0);
      const calculated = calculateMinnesotaEsstStandardAccrual({
        cumulativeEligibleWorkMinutesBefore: remainder, eligibleWorkMinutesInPeriod: workedMinutes,
        accruedMinutesInYearBefore: accrued, bankMinutesBefore: available + reservedMinutes
      });
      available += calculated.newlyAccruedMinutes;
      accrued = calculated.accruedMinutesInYearAfter;
      remainder = calculated.eligibleWorkMinutesTowardNextAccrual;
      creditedMinutes += calculated.newlyAccruedMinutes;
      credits.push({ year, workedMinutes, reservedMinutes, creditedMinutes: calculated.newlyAccruedMinutes });
      const nextState = { ...state, through: year === card.periodEnd.getUTCFullYear() ? end : `${year}-12-31`, remainder };
      const sourceSnapshot = balanceEvidence(year === recent.balanceYear ? recent.sourceSnapshot : null, nextState);
      if (year === recent.balanceYear) {
        await tx.timeOffBalance.update({ where: { id: recent.id }, data: { availableMinutes: available, accruedMinutes: accrued, sourceSnapshot } });
      } else {
        const carriedUsage = requestedUses.filter(request => {
          const evidence = timeOffEvidence(request.evidence);
          return (evidence.balanceYear ?? request.startsAt.getUTCFullYear()) === year && evidence.esstDebitedBalanceYear === recent.balanceYear;
        }).reduce((total, request) => total + request.requestedMinutes, 0);
        await tx.timeOffBalance.create({ data: { ...scope, balanceYear: year, availableMinutes: available, accruedMinutes: accrued,
          usedMinutes: carriedUsage, annualAccrualCapMinutes: 2880, bankCapMinutes: 4800, sourceSnapshot } });
      }
    }
    await tx.enterpriseAuditEvent.create({ data: {
      organizationId, locationId, actorUserId: user.id, domain: "TIME_ATTENDANCE", subjectType: "ESSTPayPeriod", subjectId: periodId,
      eventType: "ESST_PERIOD_CREDITED", reason, correlationId: randomUUID(), metadata: { policyVersion: esstPolicyVersion },
      priorValue: { availableMinutes: recent.availableMinutes, accruedMinutes: recent.accruedMinutes, remainder: state.remainder },
      newValue: { cardId: card.id, checksum: card.sourceEventChecksum, start, end, availableMinutes: available, remainder, creditedMinutes, credits, zeroWorkGap }
    } });
    return { action: "POST" as const, duplicate: false, creditedMinutes };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}
