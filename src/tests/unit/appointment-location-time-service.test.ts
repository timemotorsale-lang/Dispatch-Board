import { BusinessDay, LocationClosureType, LocationSchedulingStatus } from "@prisma/client";
import { describe, expect, it } from "vitest";

import {
  evaluateLocationScheduleCandidate,
  getBusinessDayForLocalDate,
  getLocationLocalDate,
  getLocationMinuteOfDay,
  locationLocalDateMinuteToInstant,
  resolveLocationDaySchedule,
  type LocationTimeClosure,
  type LocationTimeLocation,
  type LocationTimeOperatingWindow
} from "@/server/appointments/location-time-service";

const activeLocation: LocationTimeLocation = {
  id: "loc-time-motor-sales-minneapolis",
  timezone: "America/Chicago",
  schedulingStatus: LocationSchedulingStatus.ACTIVE
};

const draftLocation: LocationTimeLocation = {
  ...activeLocation,
  schedulingStatus: LocationSchedulingStatus.DRAFT
};

const weekdayWindows: LocationTimeOperatingWindow[] = [
  BusinessDay.MONDAY,
  BusinessDay.TUESDAY,
  BusinessDay.WEDNESDAY,
  BusinessDay.THURSDAY,
  BusinessDay.FRIDAY
].map((businessDay) => ({
  businessDay,
  opensAtMinute: 9 * 60,
  closesAtMinute: 18 * 60,
  validFrom: new Date("2026-01-01T00:00:00.000Z"),
  validTo: null
}));

function localInstant(localDate: string, hour: number, minute = 0) {
  return locationLocalDateMinuteToInstant({
    localDate,
    minuteOfDay: hour * 60 + minute,
    timezone: "America/Chicago"
  });
}

describe("appointment location time service", () => {
  it("resolves location-local dates, minutes, and business days from UTC instants", () => {
    const instant = new Date("2026-07-06T14:30:00.000Z");

    expect(getLocationLocalDate(instant, "America/Chicago")).toBe("2026-07-06");
    expect(getLocationMinuteOfDay(instant, "America/Chicago")).toBe(9 * 60 + 30);
    expect(getBusinessDayForLocalDate("2026-07-06")).toBe(BusinessDay.MONDAY);
    expect(getBusinessDayForLocalDate("2026-07-11")).toBe(BusinessDay.SATURDAY);
  });

  it("turns location-local operating windows into UTC intervals", () => {
    const schedule = resolveLocationDaySchedule({
      location: activeLocation,
      localDate: "2026-07-06",
      operatingWindows: weekdayWindows,
      closures: []
    });

    expect(schedule).toMatchObject({
      businessDay: BusinessDay.MONDAY,
      isOpen: true,
      timezone: "America/Chicago"
    });
    expect(schedule.operatingIntervals).toHaveLength(1);
    expect(schedule.operatingIntervals[0]).toMatchObject({
      opensAtMinute: 540,
      closesAtMinute: 1080
    });
    expect(schedule.operatingIntervals[0].startsAt.toISOString()).toBe(
      "2026-07-06T14:00:00.000Z"
    );
    expect(schedule.operatingIntervals[0].endsAt.toISOString()).toBe(
      "2026-07-06T23:00:00.000Z"
    );
  });

  it("keeps weekend dates closed when no operating window is active", () => {
    const schedule = resolveLocationDaySchedule({
      location: activeLocation,
      localDate: "2026-07-11",
      operatingWindows: weekdayWindows,
      closures: []
    });

    expect(schedule.businessDay).toBe(BusinessDay.SATURDAY);
    expect(schedule.isOpen).toBe(false);
    expect(schedule.operatingIntervals).toEqual([]);
  });

  it("accepts candidates inside active operating hours", () => {
    const result = evaluateLocationScheduleCandidate({
      location: activeLocation,
      operatingWindows: weekdayWindows,
      closures: [],
      startsAt: localInstant("2026-07-06", 10),
      endsAt: localInstant("2026-07-06", 11)
    });

    expect(result).toMatchObject({
      isSchedulable: true,
      isWithinOperatingHours: true,
      overlapsClosure: false,
      localStartDate: "2026-07-06",
      localEndDate: "2026-07-06",
      startMinute: 600,
      endMinute: 660,
      reasons: []
    });
  });

  it("blocks candidates outside hours, across local days, or while location scheduling is draft", () => {
    expect(
      evaluateLocationScheduleCandidate({
        location: activeLocation,
        operatingWindows: weekdayWindows,
        closures: [],
        startsAt: localInstant("2026-07-06", 8, 30),
        endsAt: localInstant("2026-07-06", 9, 30)
      })
    ).toMatchObject({
      isSchedulable: false,
      reasons: ["Candidate is outside location operating hours."]
    });

    expect(
      evaluateLocationScheduleCandidate({
        location: activeLocation,
        operatingWindows: weekdayWindows,
        closures: [],
        startsAt: localInstant("2026-07-06", 17, 30),
        endsAt: localInstant("2026-07-07", 9, 30)
      }).reasons
    ).toContain("Candidate must fit within one location-local day.");

    expect(
      evaluateLocationScheduleCandidate({
        location: draftLocation,
        operatingWindows: weekdayWindows,
        closures: [],
        startsAt: localInstant("2026-07-06", 10),
        endsAt: localInstant("2026-07-06", 11)
      }).reasons
    ).toContain("Location scheduling is DRAFT.");
  });

  it("blocks candidates that overlap location closures", () => {
    const closure: LocationTimeClosure = {
      id: "closure-1",
      type: LocationClosureType.PLANNED,
      name: "Staff training",
      startsAt: localInstant("2026-07-06", 12),
      endsAt: localInstant("2026-07-06", 14),
      reason: "All-hands training"
    };
    const result = evaluateLocationScheduleCandidate({
      location: activeLocation,
      operatingWindows: weekdayWindows,
      closures: [closure],
      startsAt: localInstant("2026-07-06", 13),
      endsAt: localInstant("2026-07-06", 14, 30)
    });

    expect(result).toMatchObject({
      isSchedulable: false,
      isWithinOperatingHours: true,
      overlapsClosure: true,
      reasons: ["Candidate overlaps a location closure."]
    });
    expect(result.overlappingClosures).toEqual([closure]);
  });

  it("resolves daylight-saving spring and fall local business times safely", () => {
    expect(localInstant("2026-03-09", 9).toISOString()).toBe(
      "2026-03-09T14:00:00.000Z"
    );
    expect(localInstant("2026-11-02", 9).toISOString()).toBe(
      "2026-11-02T15:00:00.000Z"
    );
  });

  it("keeps DST transition days at their real UTC duration", () => {
    const springForward = resolveLocationDaySchedule({
      location: activeLocation,
      localDate: "2026-03-08",
      operatingWindows: [],
      closures: []
    });
    const fallBack = resolveLocationDaySchedule({
      location: activeLocation,
      localDate: "2026-11-01",
      operatingWindows: [],
      closures: []
    });

    expect(springForward.dayEndsAt.getTime() - springForward.dayStartsAt.getTime()).toBe(
      23 * 60 * 60 * 1000
    );
    expect(fallBack.dayEndsAt.getTime() - fallBack.dayStartsAt.getTime()).toBe(
      25 * 60 * 60 * 1000
    );
  });
});
