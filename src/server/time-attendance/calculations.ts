import {
  getTimePolicyVersion,
  resolveOvertimePolicyVersion,
  type OvertimeCoverage
} from "./policy-registry";

export type TimeCalculationExceptionCode =
  | "POLICY_REVIEW_REQUIRED"
  | "MN_REST_BREAK_MISSING"
  | "MN_REST_BREAK_SHORT"
  | "MN_REST_BREAK_LATE"
  | "MN_REST_BREAK_INTERRUPTED"
  | "MN_MEAL_MISSING"
  | "MN_MEAL_SHORT"
  | "MN_MEAL_INTERRUPTED"
  | "BREAK_EVIDENCE_CONFLICT";

export type BreakInterval = {
  startMinute: number;
  endMinute: number;
  kind: "PAID_REST" | "MEAL";
  paid: boolean;
  completelyRelieved: boolean;
};

export type PlannedMealPolicy = {
  expectedMealMinutes: number;
  paid: boolean;
};

export type TimeCalculationException = {
  code: TimeCalculationExceptionCode;
  blocking: boolean;
  message: string;
};

function requireNonnegativeInteger(value: number, label: string) {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${label} must be a nonnegative whole number of minutes.`);
  }
}

function duration(interval: { startMinute: number; endMinute: number }) {
  return interval.endMinute - interval.startMinute;
}

export function calculateTardinessMinutes(input: {
  scheduledStartMinute: number;
  actualStartMinute: number;
}) {
  requireNonnegativeInteger(input.scheduledStartMinute, "Scheduled start");
  requireNonnegativeInteger(input.actualStartMinute, "Actual start");
  return Math.max(0, input.actualStartMinute - input.scheduledStartMinute);
}

export function calculateScheduledPaidMinutes(input: {
  scheduledStartMinute: number;
  scheduledEndMinute: number;
  plannedMealPolicy?: PlannedMealPolicy;
}) {
  requireNonnegativeInteger(input.scheduledStartMinute, "Scheduled start");
  requireNonnegativeInteger(input.scheduledEndMinute, "Scheduled end");
  if (input.scheduledEndMinute <= input.scheduledStartMinute) {
    throw new Error("Scheduled end must be after scheduled start.");
  }

  const scheduledSpanMinutes = input.scheduledEndMinute - input.scheduledStartMinute;
  const expectedMealMinutes = input.plannedMealPolicy?.expectedMealMinutes ?? 0;
  requireNonnegativeInteger(expectedMealMinutes, "Expected meal");
  if (expectedMealMinutes > scheduledSpanMinutes) {
    throw new Error("Expected meal cannot be longer than the scheduled shift.");
  }

  const unpaidMealMinutes = input.plannedMealPolicy?.paid === false
    ? expectedMealMinutes
    : 0;

  return {
    scheduledSpanMinutes,
    expectedMealMinutes,
    unpaidMealMinutes,
    scheduledPaidMinutes: scheduledSpanMinutes - unpaidMealMinutes
  };
}

export function calculateWeeklyOvertime(input: {
  eligibleWorkedMinutes: number;
  coverage: OvertimeCoverage;
}) {
  requireNonnegativeInteger(input.eligibleWorkedMinutes, "Eligible worked time");
  const policy = resolveOvertimePolicyVersion(input.coverage);

  if (!policy || !policy.rules.overtimeThresholdMinutes) {
    return {
      regularMinutes: 0,
      overtimeMinutes: 0,
      policyVersionId: null,
      payrollReady: false,
      exceptions: [{
        code: "POLICY_REVIEW_REQUIRED",
        blocking: true,
        message: "An approved non-exempt overtime coverage profile is required."
      }] satisfies TimeCalculationException[]
    };
  }

  const threshold = policy.rules.overtimeThresholdMinutes;
  return {
    regularMinutes: Math.min(input.eligibleWorkedMinutes, threshold),
    overtimeMinutes: Math.max(0, input.eligibleWorkedMinutes - threshold),
    policyVersionId: policy.id,
    payrollReady: true,
    exceptions: [] satisfies TimeCalculationException[]
  };
}

export function evaluateMinnesotaBreaks(input: {
  shiftDurationMinutes: number;
  breaks: BreakInterval[];
}) {
  requireNonnegativeInteger(input.shiftDurationMinutes, "Shift duration");
  const policy = getTimePolicyVersion("MN-BREAKS-2026-01-01");
  if (!policy) throw new Error("Minnesota break policy baseline is missing.");

  const restMinimum = policy.rules.paidRestMinimumMinutes ?? 15;
  const restWindow = policy.rules.paidRestWithinConsecutiveWorkMinutes ?? 240;
  const mealMinimum = policy.rules.mealMinimumMinutes ?? 30;
  const mealThreshold = policy.rules.mealRequiredAtShiftMinutes ?? 360;
  const exceptions: TimeCalculationException[] = [];
  const sorted = [...input.breaks].sort((a, b) => a.startMinute - b.startMinute);

  for (const entry of sorted) {
    requireNonnegativeInteger(entry.startMinute, "Break start");
    requireNonnegativeInteger(entry.endMinute, "Break end");
    if (entry.endMinute <= entry.startMinute || entry.endMinute > input.shiftDurationMinutes) {
      throw new Error("Every break must be a positive interval inside the shift.");
    }
  }
  for (let index = 1; index < sorted.length; index += 1) {
    if (sorted[index].startMinute < sorted[index - 1].endMinute) {
      exceptions.push({
        code: "BREAK_EVIDENCE_CONFLICT",
        blocking: true,
        message: "Recorded break intervals overlap."
      });
      break;
    }
  }

  const meals = sorted.filter((entry) => entry.kind === "MEAL");
  const qualifyingMeals = meals.filter(
    (entry) => duration(entry) >= mealMinimum && entry.completelyRelieved
  );

  if (input.shiftDurationMinutes >= mealThreshold && qualifyingMeals.length === 0) {
    const code = meals.some((entry) => duration(entry) < mealMinimum)
      ? "MN_MEAL_SHORT"
      : meals.some((entry) => !entry.completelyRelieved)
        ? "MN_MEAL_INTERRUPTED"
        : "MN_MEAL_MISSING";
    exceptions.push({
      code,
      blocking: true,
      message: code === "MN_MEAL_INTERRUPTED"
        ? "The meal was not completely relieved from duty and remains compensable."
        : "A qualifying 30-minute meal was not recorded."
    });
  }

  const workBlocks: Array<{ startMinute: number; endMinute: number }> = [];
  let blockStart = 0;
  for (const meal of qualifyingMeals) {
    workBlocks.push({ startMinute: blockStart, endMinute: meal.startMinute });
    blockStart = meal.endMinute;
  }
  workBlocks.push({ startMinute: blockStart, endMinute: input.shiftDurationMinutes });

  const rests = sorted.filter((entry) => entry.kind === "PAID_REST");
  let requiredRestBreaks = 0;
  let qualifyingRestBreaks = 0;

  for (const block of workBlocks) {
    const required = Math.floor(duration(block) / restWindow);
    requiredRestBreaks += required;
    const inBlock = rests.filter(
      (rest) => rest.startMinute >= block.startMinute && rest.endMinute <= block.endMinute
    );
    const qualifying = inBlock.filter(
      (rest) => rest.paid && rest.completelyRelieved && duration(rest) >= restMinimum
    );
    qualifyingRestBreaks += qualifying.length;

    if (inBlock.some((rest) => duration(rest) < restMinimum)) {
      exceptions.push({
        code: "MN_REST_BREAK_SHORT",
        blocking: true,
        message: "A recorded paid rest break was shorter than 15 minutes."
      });
    }
    if (inBlock.some((rest) => !rest.completelyRelieved)) {
      exceptions.push({
        code: "MN_REST_BREAK_INTERRUPTED",
        blocking: true,
        message: "Duty was performed during a recorded paid rest opportunity and manager review is required."
      });
    }
    for (let index = 0; index < Math.min(required, qualifying.length); index += 1) {
      if (qualifying[index].startMinute >= block.startMinute + (index + 1) * restWindow) {
        exceptions.push({
          code: "MN_REST_BREAK_LATE",
          blocking: true,
          message: "A paid rest break was not offered within its four-hour work window."
        });
      }
    }
    if (qualifying.length < required) {
      exceptions.push({
        code: "MN_REST_BREAK_MISSING",
        blocking: true,
        message: `${required - qualifying.length} required paid rest break opportunity was not recorded.`
      });
    }
  }

  return {
    policyVersionId: policy.id,
    requiredRestBreaks,
    qualifyingRestBreaks,
    mealRequired: input.shiftDurationMinutes >= mealThreshold,
    qualifyingMeals: qualifyingMeals.length,
    exceptions
  };
}

export function calculateMinnesotaEsstStandardAccrual(input: {
  cumulativeEligibleWorkMinutesBefore: number;
  eligibleWorkMinutesInPeriod: number;
  accruedMinutesInYearBefore: number;
  bankMinutesBefore: number;
  usedMinutesInPeriod?: number;
}) {
  const values = [
    input.cumulativeEligibleWorkMinutesBefore,
    input.eligibleWorkMinutesInPeriod,
    input.accruedMinutesInYearBefore,
    input.bankMinutesBefore,
    input.usedMinutesInPeriod ?? 0
  ];
  values.forEach((value) => requireNonnegativeInteger(value, "ESST input"));
  const policy = getTimePolicyVersion("MN-ESST-STANDARD-ACCRUAL-2026-07-06");
  if (!policy) throw new Error("Minnesota ESST policy baseline is missing.");

  const workPerHour = policy.rules.esstWorkMinutesPerAccrualHour ?? 1800;
  const annualCap = policy.rules.esstAnnualAccrualCapMinutes ?? 2880;
  const bankCap = policy.rules.esstBankCapMinutes ?? 4800;
  const cumulativeAfter =
    input.cumulativeEligibleWorkMinutesBefore + input.eligibleWorkMinutesInPeriod;
  const newHours = Math.max(
    0,
    Math.floor(cumulativeAfter / workPerHour) -
      Math.floor(input.cumulativeEligibleWorkMinutesBefore / workPerHour)
  );
  const newlyAccruedMinutes = Math.min(
    newHours * 60,
    Math.max(0, annualCap - input.accruedMinutesInYearBefore),
    Math.max(0, bankCap - input.bankMinutesBefore)
  );

  return {
    policyVersionId: policy.id,
    newlyAccruedMinutes,
    accruedMinutesInYearAfter: input.accruedMinutesInYearBefore + newlyAccruedMinutes,
    bankMinutesAfter: Math.max(
      0,
      Math.min(
        bankCap,
        input.bankMinutesBefore + newlyAccruedMinutes - (input.usedMinutesInPeriod ?? 0)
      )
    ),
    cumulativeEligibleWorkMinutesAfter: cumulativeAfter,
    eligibleWorkMinutesTowardNextAccrual: cumulativeAfter % workPerHour
  };
}

export function reconcileAttendanceAndAllocation(input: {
  attendanceWorkedMinutes: number;
  allocatedMinutes: number;
}) {
  requireNonnegativeInteger(input.attendanceWorkedMinutes, "Attendance worked time");
  requireNonnegativeInteger(input.allocatedMinutes, "Allocated time");
  return {
    unallocatedMinutes: Math.max(0, input.attendanceWorkedMinutes - input.allocatedMinutes),
    overallocatedMinutes: Math.max(0, input.allocatedMinutes - input.attendanceWorkedMinutes),
    reconciled: input.attendanceWorkedMinutes === input.allocatedMinutes
  };
}
