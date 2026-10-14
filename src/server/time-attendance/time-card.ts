import {
  calculateMinnesotaEsstStandardAccrual,
  calculateWeeklyOvertime,
  evaluateMinnesotaBreaks,
  type BreakInterval,
  type TimeCalculationException
} from "./calculations";
import {
  buildTimeCardExceptions,
  hasBlockingTimeCardExceptions,
  type TimeCardExceptionProjection
} from "./exception-engine";
import {
  normalizeTimeAttendanceEvents,
  type TimeAttendanceInterval,
  type TimeAttendanceSourceEvent
} from "./normalization";
import {
  resolveEffectiveTimePolicy,
  type TimePolicyAssignmentCandidate,
  type TimePolicyResolutionResult
} from "./policy-resolution";

export type TimeCardProjectionInput = {
  assignments: TimePolicyAssignmentCandidate[];
  events: TimeAttendanceSourceEvent[];
  locationId: string;
  staffUserId: string;
  timeZone: string;
  workInstant: string;
  workweekStartDay?: string;
  paidRests?: {
    id: string;
    startAt: string;
    endAt: string | null;
    paid: boolean;
    completelyRelieved: boolean;
  }[];
  esst?: {
    accruedMinutesInYearBefore: number;
    bankMinutesBefore: number;
    cumulativeEligibleWorkMinutesBefore: number;
    usedMinutesInPeriod?: number;
  };
};

export type TimeCardProjection = {
  staffUserId: string;
  locationId: string;
  policy: TimePolicyResolutionResult["bundle"];
  intervals: {
    attendance: TimeAttendanceInterval[];
    meals: TimeAttendanceInterval[];
    paidWork: TimeAttendanceInterval[];
    paidRests: NonNullable<TimeCardProjectionInput["paidRests"]>;
  };
  totals: {
    attendanceMinutes: number;
    mealMinutes: number;
    unpaidMealMinutes: number;
    paidWorkMinutes: number;
    regularMinutes: number;
    overtimeMinutes: number;
    esstNewlyAccruedMinutes: number;
  };
  exceptions: TimeCardExceptionProjection[];
  payrollReady: boolean;
};

function earliestAttendanceStart(intervals: TimeAttendanceInterval[]) {
  return intervals
    .map((interval) => new Date(interval.startAt).getTime())
    .sort((left, right) => left - right)[0] ?? null;
}

function intervalMinutesFrom(anchorMs: number, instant: string) {
  return Math.round((new Date(instant).getTime() - anchorMs) / 60_000);
}

function toBreakIntervals(input: {
  attendance: TimeAttendanceInterval;
  meals: TimeAttendanceInterval[];
}): BreakInterval[] {
  const anchor = new Date(input.attendance.startAt).getTime();
  return input.meals
    .filter((meal) => {
      const mealStart = new Date(meal.startAt).getTime();
      const mealEnd = new Date(meal.endAt).getTime();
      return (
        mealStart >= new Date(input.attendance.startAt).getTime() &&
        mealEnd <= new Date(input.attendance.endAt).getTime()
      );
    })
    .map((meal) => ({
      kind: "MEAL",
      startMinute: intervalMinutesFrom(anchor, meal.startAt),
      endMinute: intervalMinutesFrom(anchor, meal.endAt),
      paid: meal.paid,
      completelyRelieved: meal.completelyRelieved === true
    }));
}

function evaluateBreaks(input: {
  attendanceIntervals: TimeAttendanceInterval[];
  mealIntervals: TimeAttendanceInterval[];
  paidRests: NonNullable<TimeCardProjectionInput["paidRests"]>;
}) {
  const exceptions: TimeCalculationException[] = [];
  for (const attendance of input.attendanceIntervals) {
    const anchor = new Date(attendance.startAt).getTime();
    const rests = input.paidRests.filter((rest) => {
      if (!rest.endAt) return false;
      return new Date(rest.startAt) >= new Date(attendance.startAt) && new Date(rest.endAt) <= new Date(attendance.endAt);
    }).map((rest) => ({
      kind: "PAID_REST" as const,
      startMinute: intervalMinutesFrom(anchor, rest.startAt),
      endMinute: intervalMinutesFrom(anchor, rest.endAt as string),
      paid: rest.paid,
      completelyRelieved: rest.completelyRelieved
    }));
    const result = evaluateMinnesotaBreaks({
      shiftDurationMinutes: attendance.durationMinutes,
      breaks: [...toBreakIntervals({ attendance, meals: input.mealIntervals }), ...rests]
    });
    exceptions.push(...result.exceptions);
  }
  if (input.paidRests.some((rest) => rest.endAt === null)) {
    exceptions.push({
      code: "BREAK_EVIDENCE_CONFLICT",
      blocking: true,
      message: "A paid rest interval is still open and must be ended before payroll review."
    });
  }

  return exceptions;
}

export function calculateTimeCardProjection(input: TimeCardProjectionInput): TimeCardProjection {
  const normalization = normalizeTimeAttendanceEvents({
    events: input.events,
    timeZone: input.timeZone,
    workweekStartDay: input.workweekStartDay
  });
  const policy = resolveEffectiveTimePolicy({
    assignments: input.assignments,
    locationId: input.locationId,
    staffUserId: input.staffUserId,
    workInstant: input.workInstant
  });
  const calculationExceptions: TimeCalculationException[] = [];
  let regularMinutes = 0;
  let overtimeMinutes = 0;
  let esstNewlyAccruedMinutes = 0;

  if (policy.bundle) {
    const overtime = calculateWeeklyOvertime({
      coverage: policy.bundle.overtimeCoverage,
      eligibleWorkedMinutes: normalization.totalPaidWorkMinutes
    });
    regularMinutes = overtime.regularMinutes;
    overtimeMinutes = overtime.overtimeMinutes;
    calculationExceptions.push(...overtime.exceptions);
    calculationExceptions.push(...evaluateBreaks({
      attendanceIntervals: normalization.attendanceIntervals,
      mealIntervals: normalization.mealIntervals,
      paidRests: input.paidRests ?? []
    }));

    const esst = calculateMinnesotaEsstStandardAccrual({
      cumulativeEligibleWorkMinutesBefore: input.esst?.cumulativeEligibleWorkMinutesBefore ?? 0,
      eligibleWorkMinutesInPeriod: normalization.totalPaidWorkMinutes,
      accruedMinutesInYearBefore: input.esst?.accruedMinutesInYearBefore ?? 0,
      bankMinutesBefore: input.esst?.bankMinutesBefore ?? 0,
      usedMinutesInPeriod: input.esst?.usedMinutesInPeriod
    });
    esstNewlyAccruedMinutes = esst.newlyAccruedMinutes;
  }

  const expectedMealMinutes = policy.bundle?.profileTemplate.scheduledMealPolicy.paid === false
    ? policy.bundle.profileTemplate.scheduledMealPolicy.expectedMealMinutes
    : 0;
  const exceptions = buildTimeCardExceptions({
    normalizationExceptions: normalization.exceptions,
    policyExceptions: policy.exceptions,
    calculationExceptions,
    plannedMeal: {
      expectedMinutes: expectedMealMinutes,
      actualUnpaidMealMinutes: normalization.totalUnpaidMealMinutes
    }
  });

  return {
    staffUserId: input.staffUserId,
    locationId: input.locationId,
    policy: policy.bundle,
    intervals: {
      attendance: normalization.attendanceIntervals,
      meals: normalization.mealIntervals,
      paidWork: normalization.paidWorkIntervals,
      paidRests: input.paidRests ?? []
    },
    totals: {
      attendanceMinutes: normalization.totalAttendanceMinutes,
      mealMinutes: normalization.totalMealMinutes,
      unpaidMealMinutes: normalization.totalUnpaidMealMinutes,
      paidWorkMinutes: normalization.totalPaidWorkMinutes,
      regularMinutes,
      overtimeMinutes,
      esstNewlyAccruedMinutes
    },
    exceptions,
    payrollReady: Boolean(
      policy.payrollReady &&
      normalization.attendanceIntervals.length > 0 &&
      earliestAttendanceStart(normalization.attendanceIntervals) !== null &&
      !hasBlockingTimeCardExceptions(exceptions)
    )
  };
}
