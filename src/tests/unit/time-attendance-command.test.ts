import { describe, expect, it } from "vitest";

import {
  evaluateAttendanceCaptureTransition,
  toEnterpriseTimeAttendanceCommand
} from "@/server/time-attendance";

describe("time attendance command contracts", () => {
  it("guards the clock and meal session transitions", () => {
    expect(evaluateAttendanceCaptureTransition({
      commandType: "CLOCK_IN",
      currentState: "NONE"
    })).toEqual({ eventType: "CLOCK_IN", nextState: "OPEN" });

    expect(evaluateAttendanceCaptureTransition({
      commandType: "START_MEAL",
      currentState: "OPEN"
    })).toEqual({ eventType: "START_MEAL", nextState: "ON_MEAL" });

    expect(evaluateAttendanceCaptureTransition({
      commandType: "END_MEAL",
      currentState: "ON_MEAL"
    })).toEqual({ eventType: "END_MEAL", nextState: "OPEN" });

    expect(evaluateAttendanceCaptureTransition({
      commandType: "CLOCK_OUT",
      currentState: "OPEN"
    })).toEqual({ eventType: "CLOCK_OUT", nextState: "CLOSED" });
  });

  it("rejects invalid capture order", () => {
    expect(() => evaluateAttendanceCaptureTransition({
      commandType: "CLOCK_OUT",
      currentState: "NONE"
    })).toThrow("Cannot apply CLOCK_OUT");

    expect(() => evaluateAttendanceCaptureTransition({
      commandType: "START_MEAL",
      currentState: "ON_MEAL"
    })).toThrow("Cannot apply START_MEAL");
  });

  it("maps capture commands into the enterprise command boundary", () => {
    expect(toEnterpriseTimeAttendanceCommand({
      actorUserId: "staff-1",
      commandType: "CLOCK_IN",
      expectedVersion: 0,
      idempotencyKey: "clock-in-2026-07-23-staff-1",
      locationId: "loc-1",
      occurredAt: "2026-07-23T14:00:00.000Z",
      organizationId: "org-1",
      reason: "Employee clocked in from the web console.",
      staffUserId: "staff-1",
      timezone: "America/Chicago"
    })).toEqual({
      actorUserId: "staff-1",
      commandType: "CLOCK_IN",
      domain: "TIME_ATTENDANCE",
      expectedVersion: 0,
      idempotencyKey: "clock-in-2026-07-23-staff-1",
      locationId: "loc-1",
      organizationId: "org-1",
      payload: {
        completelyRelieved: null,
        occurredAt: "2026-07-23T14:00:00.000Z",
        paid: null,
        staffUserId: "staff-1",
        timezone: "America/Chicago"
      },
      reason: "Employee clocked in from the web console.",
      subjectId: "attendance-session:staff-1",
      subjectType: "ATTENDANCE_SESSION"
    });
  });
});
