import { describe, expect, it } from "vitest";

import {
  TIME_POLICY_SOURCES,
  TIME_POLICY_PROFILE_TEMPLATES,
  TIME_POLICY_VERSIONS,
  calculateMinnesotaEsstStandardAccrual,
  calculateScheduledPaidMinutes,
  calculateTardinessMinutes,
  calculateWeeklyOvertime,
  evaluateMinnesotaBreaks,
  reconcileAttendanceAndAllocation
} from "@/server/time-attendance";

describe("time and attendance policy foundation", () => {
  it("keeps active policies source-linked and exact-time only", () => {
    const sourceIds = new Set(TIME_POLICY_SOURCES.map((source) => source.id));
    for (const policy of TIME_POLICY_VERSIONS) {
      expect(policy.rules.roundingPolicy).toBe("EXACT_TIME");
      expect(policy.sourceIds.length).toBeGreaterThan(0);
      policy.sourceIds.forEach((sourceId) => expect(sourceIds.has(sourceId)).toBe(true));
    }
  });

  it("keeps MVP profile templates tied to approved policy versions", () => {
    const versionIds = new Set(TIME_POLICY_VERSIONS.map((version) => version.id));
    const mealPolicies = new Map(
      TIME_POLICY_PROFILE_TEMPLATES.map((template) => [
        template.id,
        template.scheduledMealPolicy
      ])
    );

    for (const template of TIME_POLICY_PROFILE_TEMPLATES) {
      expect(template.policyVersionIds.length).toBeGreaterThan(0);
      template.policyVersionIds.forEach((versionId) => expect(versionIds.has(versionId)).toBe(true));
    }
    expect(mealPolicies.get("MN-HOURLY-60-MIN-UNPAID-MEAL")).toEqual({
      expectedMealMinutes: 60,
      paid: false
    });
    expect(mealPolicies.get("MN-HOURLY-30-MIN-PAID-MEAL")).toEqual({
      expectedMealMinutes: 30,
      paid: true
    });
  });

  it("keeps tardiness separate from payroll rounding", () => {
    expect(calculateTardinessMinutes({
      scheduledStartMinute: 8 * 60,
      actualStartMinute: 8 * 60 + 7
    })).toBe(7);
  });

  it("supports staff-specific planned meal pay policies", () => {
    expect(calculateScheduledPaidMinutes({
      scheduledStartMinute: 9 * 60,
      scheduledEndMinute: 18 * 60,
      plannedMealPolicy: { expectedMealMinutes: 60, paid: false }
    })).toEqual({
      scheduledSpanMinutes: 540,
      expectedMealMinutes: 60,
      unpaidMealMinutes: 60,
      scheduledPaidMinutes: 480
    });

    expect(calculateScheduledPaidMinutes({
      scheduledStartMinute: 9 * 60,
      scheduledEndMinute: 18 * 60,
      plannedMealPolicy: { expectedMealMinutes: 30, paid: true }
    })).toEqual({
      scheduledSpanMinutes: 540,
      expectedMealMinutes: 30,
      unpaidMealMinutes: 0,
      scheduledPaidMinutes: 540
    });
  });

  it("classifies federal and Minnesota-only overtime with approved profiles", () => {
    expect(calculateWeeklyOvertime({
      eligibleWorkedMinutes: 40 * 60 + 7,
      coverage: "US_FLSA_NONEXEMPT"
    })).toMatchObject({ regularMinutes: 2400, overtimeMinutes: 7, payrollReady: true });

    expect(calculateWeeklyOvertime({
      eligibleWorkedMinutes: 48 * 60 + 1,
      coverage: "MN_MFLSA_ONLY_NONEXEMPT"
    })).toMatchObject({ regularMinutes: 2880, overtimeMinutes: 1, payrollReady: true });

    expect(calculateWeeklyOvertime({
      eligibleWorkedMinutes: 50 * 60,
      coverage: "UNRESOLVED"
    })).toMatchObject({
      payrollReady: false,
      exceptions: [{ code: "POLICY_REVIEW_REQUIRED", blocking: true }]
    });
  });

  it("evaluates Minnesota rest windows around a qualifying meal", () => {
    expect(evaluateMinnesotaBreaks({
      shiftDurationMinutes: 8 * 60,
      breaks: [
        {
          kind: "MEAL",
          startMinute: 3.5 * 60,
          endMinute: 4 * 60,
          paid: false,
          completelyRelieved: true
        },
        {
          kind: "PAID_REST",
          startMinute: 6 * 60,
          endMinute: 6 * 60 + 15,
          paid: true,
          completelyRelieved: true
        }
      ]
    })).toMatchObject({
      requiredRestBreaks: 1,
      qualifyingRestBreaks: 1,
      mealRequired: true,
      qualifyingMeals: 1,
      exceptions: []
    });
  });

  it("allows a paid meal to satisfy the Minnesota meal opportunity rule", () => {
    expect(evaluateMinnesotaBreaks({
      shiftDurationMinutes: 8 * 60,
      breaks: [
        {
          kind: "MEAL",
          startMinute: 3.5 * 60,
          endMinute: 4 * 60,
          paid: true,
          completelyRelieved: true
        },
        {
          kind: "PAID_REST",
          startMinute: 6 * 60,
          endMinute: 6 * 60 + 15,
          paid: true,
          completelyRelieved: true
        }
      ]
    })).toMatchObject({
      mealRequired: true,
      qualifyingMeals: 1,
      exceptions: []
    });
  });

  it("does not invent missing breaks or deduct an interrupted meal", () => {
    const result = evaluateMinnesotaBreaks({
      shiftDurationMinutes: 8 * 60,
      breaks: [{
        kind: "MEAL",
        startMinute: 4 * 60,
        endMinute: 4 * 60 + 30,
        paid: false,
        completelyRelieved: false
      }]
    });
    expect(result.exceptions.map((exception) => exception.code)).toEqual(
      expect.arrayContaining(["MN_MEAL_INTERRUPTED", "MN_REST_BREAK_MISSING"])
    );
  });

  it("accrues Minnesota ESST in completed 30-hour blocks and applies caps", () => {
    expect(calculateMinnesotaEsstStandardAccrual({
      cumulativeEligibleWorkMinutesBefore: 29 * 60 + 59,
      eligibleWorkMinutesInPeriod: 1,
      accruedMinutesInYearBefore: 0,
      bankMinutesBefore: 0
    })).toMatchObject({
      newlyAccruedMinutes: 60,
      accruedMinutesInYearAfter: 60,
      bankMinutesAfter: 60,
      eligibleWorkMinutesTowardNextAccrual: 0
    });

    expect(calculateMinnesotaEsstStandardAccrual({
      cumulativeEligibleWorkMinutesBefore: 30 * 47 * 60,
      eligibleWorkMinutesInPeriod: 60 * 60,
      accruedMinutesInYearBefore: 47 * 60,
      bankMinutesBefore: 79.5 * 60
    })).toMatchObject({
      newlyAccruedMinutes: 30,
      accruedMinutesInYearAfter: 47.5 * 60,
      bankMinutesAfter: 80 * 60
    });
  });

  it("reconciles attendance and allocation without conflating them", () => {
    expect(reconcileAttendanceAndAllocation({
      attendanceWorkedMinutes: 480,
      allocatedMinutes: 450
    })).toEqual({ unallocatedMinutes: 30, overallocatedMinutes: 0, reconciled: false });
  });
});
