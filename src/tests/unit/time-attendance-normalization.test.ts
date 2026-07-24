import { describe, expect, it } from "vitest";

import { normalizeTimeAttendanceEvents, type TimeAttendanceSourceEvent } from "@/server/time-attendance";

const event = (
  id: string,
  eventType: TimeAttendanceSourceEvent["eventType"],
  occurredAt: string,
  extra: Partial<TimeAttendanceSourceEvent> = {}
): TimeAttendanceSourceEvent => ({ id, eventType, occurredAt, ...extra });

describe("time attendance event normalization", () => {
  it("builds paid work from exact events and deducts only the actual unpaid relieved meal", () => {
    const result = normalizeTimeAttendanceEvents({
      timeZone: "America/Chicago",
      workweekStartDay: "SUNDAY",
      events: [
        event("in-1", "CLOCK_IN", "2026-07-23T14:00:00.000Z"),
        event("meal-start-1", "START_MEAL", "2026-07-23T18:00:00.000Z", { paid: false }),
        event("meal-end-1", "END_MEAL", "2026-07-23T18:30:00.000Z", {
          completelyRelieved: true
        }),
        event("out-1", "CLOCK_OUT", "2026-07-23T23:00:00.000Z")
      ]
    });

    expect(result.exceptions).toEqual([]);
    expect(result.totalAttendanceMinutes).toBe(540);
    expect(result.totalMealMinutes).toBe(30);
    expect(result.totalUnpaidMealMinutes).toBe(30);
    expect(result.totalPaidWorkMinutes).toBe(510);
    expect(result.paidWorkIntervals.map((interval) => interval.durationMinutes)).toEqual([240, 270]);
  });

  it("keeps a paid meal compensable while preserving meal evidence", () => {
    const result = normalizeTimeAttendanceEvents({
      timeZone: "America/Chicago",
      events: [
        event("in-1", "CLOCK_IN", "2026-07-23T14:00:00.000Z"),
        event("meal-start-1", "START_MEAL", "2026-07-23T18:00:00.000Z", { paid: true }),
        event("meal-end-1", "END_MEAL", "2026-07-23T18:30:00.000Z", {
          completelyRelieved: true
        }),
        event("out-1", "CLOCK_OUT", "2026-07-23T23:00:00.000Z")
      ]
    });

    expect(result.totalAttendanceMinutes).toBe(540);
    expect(result.totalMealMinutes).toBe(30);
    expect(result.totalUnpaidMealMinutes).toBe(0);
    expect(result.totalPaidWorkMinutes).toBe(540);
    expect(result.mealIntervals).toMatchObject([{ paid: true, completelyRelieved: true }]);
  });

  it("does not deduct an unpaid meal when the employee was not completely relieved", () => {
    const result = normalizeTimeAttendanceEvents({
      timeZone: "America/Chicago",
      events: [
        event("in-1", "CLOCK_IN", "2026-07-23T14:00:00.000Z"),
        event("meal-start-1", "START_MEAL", "2026-07-23T18:00:00.000Z", { paid: false }),
        event("meal-end-1", "END_MEAL", "2026-07-23T18:30:00.000Z", {
          completelyRelieved: false
        }),
        event("out-1", "CLOCK_OUT", "2026-07-23T23:00:00.000Z")
      ]
    });

    expect(result.totalUnpaidMealMinutes).toBe(0);
    expect(result.totalPaidWorkMinutes).toBe(540);
  });

  it("flags missing and open event pairs without inventing intervals", () => {
    const result = normalizeTimeAttendanceEvents({
      timeZone: "America/Chicago",
      events: [
        event("meal-start-1", "START_MEAL", "2026-07-23T18:00:00.000Z"),
        event("in-1", "CLOCK_IN", "2026-07-23T19:00:00.000Z"),
        event("meal-start-2", "START_MEAL", "2026-07-23T20:00:00.000Z", { paid: false })
      ]
    });

    expect(result.attendanceIntervals).toEqual([]);
    expect(result.mealIntervals).toEqual([]);
    expect(result.exceptions.map((exception) => exception.code)).toEqual([
      "MISSING_CLOCK_IN",
      "OPEN_MEAL",
      "MISSING_CLOCK_OUT"
    ]);
  });

  it("splits overnight intervals by location-local day", () => {
    const result = normalizeTimeAttendanceEvents({
      timeZone: "America/Chicago",
      workweekStartDay: "MONDAY",
      events: [
        event("in-1", "CLOCK_IN", "2026-07-24T03:00:00.000Z"),
        event("out-1", "CLOCK_OUT", "2026-07-24T07:00:00.000Z")
      ]
    });

    expect(result.totalPaidWorkMinutes).toBe(240);
    expect(result.attendanceIntervals.map((interval) => ({
      durationMinutes: interval.durationMinutes,
      localDate: interval.localDate,
      workweekStartDate: interval.workweekStartDate
    }))).toEqual([
      { durationMinutes: 120, localDate: "2026-07-23", workweekStartDate: "2026-07-20" },
      { durationMinutes: 120, localDate: "2026-07-24", workweekStartDate: "2026-07-20" }
    ]);
  });

  it("deduplicates by source event identity, not similar timestamps", () => {
    const result = normalizeTimeAttendanceEvents({
      timeZone: "America/Chicago",
      events: [
        event("in-1", "CLOCK_IN", "2026-07-23T14:00:00.000Z"),
        event("in-1", "CLOCK_IN", "2026-07-23T14:00:00.000Z"),
        event("out-1", "CLOCK_OUT", "2026-07-23T15:00:00.000Z")
      ]
    });

    expect(result.totalPaidWorkMinutes).toBe(60);
    expect(result.exceptions).toMatchObject([{ code: "DUPLICATE_EVENT_IGNORED", blocking: false }]);
  });
});
