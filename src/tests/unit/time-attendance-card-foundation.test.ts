import { describe, expect, it } from "vitest";

import {
  calculateTimeCardProjection,
  replayTimeCardProjection,
  resolveEffectiveTimePolicy,
  type TimeAttendanceSourceEvent,
  type TimePolicyAssignmentCandidate
} from "@/server/time-attendance";

const assignment: TimePolicyAssignmentCandidate = {
  id: "assign-1",
  staffUserId: "staff-1",
  locationId: "loc-1",
  profileTemplateId: "MN-HOURLY-60-MIN-UNPAID-MEAL",
  effectiveFrom: "2026-01-01T00:00:00.000Z",
  effectiveTo: null,
  overtimeCoverage: "US_FLSA_NONEXEMPT"
};

const events: TimeAttendanceSourceEvent[] = [
  { id: "in-1", eventType: "CLOCK_IN", occurredAt: "2026-07-23T14:00:00.000Z" },
  {
    id: "meal-start-1",
    eventType: "START_MEAL",
    occurredAt: "2026-07-23T18:00:00.000Z",
    paid: false
  },
  {
    id: "meal-end-1",
    eventType: "END_MEAL",
    occurredAt: "2026-07-23T18:30:00.000Z",
    completelyRelieved: true
  },
  { id: "out-1", eventType: "CLOCK_OUT", occurredAt: "2026-07-23T23:00:00.000Z" }
];

describe("time attendance card foundation", () => {
  it("resolves one effective policy bundle for the staff member", () => {
    expect(resolveEffectiveTimePolicy({
      assignments: [assignment],
      staffUserId: "staff-1",
      locationId: "loc-1",
      workInstant: "2026-07-23T14:00:00.000Z"
    })).toMatchObject({
      payrollReady: true,
      bundle: {
        assignmentId: "assign-1",
        overtimeCoverage: "US_FLSA_NONEXEMPT",
        profileTemplate: { id: "MN-HOURLY-60-MIN-UNPAID-MEAL" }
      },
      exceptions: []
    });
  });

  it("fails closed when active policy assignments overlap", () => {
    const result = resolveEffectiveTimePolicy({
      assignments: [{ ...assignment }, { ...assignment, id: "assign-2" }],
      staffUserId: "staff-1",
      locationId: "loc-1",
      workInstant: "2026-07-23T14:00:00.000Z"
    });

    expect(result).toMatchObject({
      payrollReady: false,
      bundle: null,
      exceptions: [{ code: "POLICY_ASSIGNMENT_CONFLICT", blocking: true }]
    });
  });

  it("calculates a card from exact worked time and actual meal evidence", () => {
    const card = calculateTimeCardProjection({
      assignments: [assignment],
      events,
      locationId: "loc-1",
      staffUserId: "staff-1",
      timeZone: "America/Chicago",
      workInstant: "2026-07-23T14:00:00.000Z",
      workweekStartDay: "SUNDAY"
    });

    expect(card.totals).toMatchObject({
      attendanceMinutes: 540,
      mealMinutes: 30,
      unpaidMealMinutes: 30,
      paidWorkMinutes: 510,
      regularMinutes: 510,
      overtimeMinutes: 0
    });
    expect(card.exceptions.map((exception) => exception.code)).toEqual(
      expect.arrayContaining(["MN_REST_BREAK_MISSING", "PLANNED_MEAL_SHORT_USED"])
    );
    expect(card.exceptions.find((exception) => exception.code === "PLANNED_MEAL_SHORT_USED"))
      .toMatchObject({ blocking: false });
    expect(card.payrollReady).toBe(false);
  });

  it("fails payroll readiness when policy is missing", () => {
    const card = calculateTimeCardProjection({
      assignments: [],
      events,
      locationId: "loc-1",
      staffUserId: "staff-1",
      timeZone: "America/Chicago",
      workInstant: "2026-07-23T14:00:00.000Z"
    });

    expect(card.policy).toBeNull();
    expect(card.totals.paidWorkMinutes).toBe(510);
    expect(card.exceptions).toMatchObject([
      { code: "POLICY_ASSIGNMENT_MISSING", blocking: true }
    ]);
    expect(card.payrollReady).toBe(false);
  });

  it("replays the same input to the same checksums", () => {
    const input = {
      assignments: [assignment],
      events,
      locationId: "loc-1",
      staffUserId: "staff-1",
      timeZone: "America/Chicago",
      workInstant: "2026-07-23T14:00:00.000Z"
    };

    const first = replayTimeCardProjection(input, new Date("2026-07-23T23:05:00.000Z"));
    const second = replayTimeCardProjection(input, new Date("2026-07-24T01:00:00.000Z"));

    expect(first.inputChecksum).toBe(second.inputChecksum);
    expect(first.projectionChecksum).toBe(second.projectionChecksum);
    expect(first.checksum).toBe(second.checksum);
    expect(first.projection.totals.paidWorkMinutes).toBe(510);
  });
});
