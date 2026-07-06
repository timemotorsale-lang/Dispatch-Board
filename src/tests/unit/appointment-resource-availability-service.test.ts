import { BusinessDay } from "@prisma/client";
import { describe, expect, it } from "vitest";

import {
  evaluateResourceAvailability,
  type ResourceAvailabilityOperatingWindow,
  type ResourceAvailabilityReservation,
  type ResourceAvailabilityResource,
  type ResourceAvailabilityUnavailability
} from "@/server/appointments/resource-availability-service";
import { locationLocalDateMinuteToInstant } from "@/server/appointments/location-time-service";

const timezone = "America/Chicago";

const serviceBay: ResourceAvailabilityResource = {
  id: "bay-1",
  name: "Service Bay 1",
  status: "ACTIVE",
  capacityMode: "EXCLUSIVE",
  capacity: 1,
  conflictPolicy: "HARD_BLOCK",
  effectiveFrom: new Date("2026-01-01T00:00:00.000Z"),
  effectiveTo: null
};

const staffAdvisor: ResourceAvailabilityResource = {
  id: "staff-brock",
  name: "Brock Peterson",
  status: "ACTIVE",
  capacityMode: "CAPACITY",
  capacity: 2,
  conflictPolicy: "WARNING",
  effectiveFrom: new Date("2026-01-01T00:00:00.000Z"),
  effectiveTo: null
};

const mondayWindow: ResourceAvailabilityOperatingWindow = {
  businessDay: BusinessDay.MONDAY,
  opensAtMinute: 9 * 60,
  closesAtMinute: 18 * 60,
  capacityOverride: null,
  validFrom: new Date("2026-01-01T00:00:00.000Z"),
  validTo: null
};

function localInstant(localDate: string, hour: number, minute = 0) {
  return locationLocalDateMinuteToInstant({
    localDate,
    minuteOfDay: hour * 60 + minute,
    timezone
  });
}

describe("appointment resource availability service", () => {
  it("accepts an active exclusive resource inside its operating window", () => {
    const result = evaluateResourceAvailability({
      resource: serviceBay,
      timezone,
      operatingWindows: [mondayWindow],
      unavailability: [],
      reservations: [],
      startsAt: localInstant("2026-07-06", 10),
      endsAt: localInstant("2026-07-06", 11)
    });

    expect(result).toMatchObject({
      resourceId: "bay-1",
      localDate: "2026-07-06",
      businessDay: BusinessDay.MONDAY,
      isAvailable: true,
      isHardBlocked: false,
      effectiveWindowCapacity: 1,
      reservedCapacity: 0,
      unavailableCapacity: 0,
      availableCapacity: 1,
      reasons: []
    });
    expect(result.matchingOperatingWindow?.startsAt.toISOString()).toBe(
      "2026-07-06T14:00:00.000Z"
    );
  });

  it("hard-blocks exclusive resources when a held or committed reservation overlaps", () => {
    const reservation: ResourceAvailabilityReservation = {
      id: "reservation-1",
      appointmentId: "appointment-1",
      status: "COMMITTED",
      startsAt: localInstant("2026-07-06", 10),
      endsAt: localInstant("2026-07-06", 11),
      capacityUnits: 1
    };
    const result = evaluateResourceAvailability({
      resource: serviceBay,
      timezone,
      operatingWindows: [mondayWindow],
      unavailability: [],
      reservations: [reservation],
      startsAt: localInstant("2026-07-06", 10, 30),
      endsAt: localInstant("2026-07-06", 11, 30)
    });

    expect(result).toMatchObject({
      isAvailable: false,
      isHardBlocked: true,
      isWarningOnly: false,
      reservedCapacity: 1,
      availableCapacity: 0
    });
    expect(result.reasons).toEqual([
      "Resource capacity is already reserved during the candidate window.",
      "Resource does not have enough available capacity."
    ]);
    expect(result.overlappingReservations).toEqual([reservation]);
  });

  it("counts reservation preparation and cleanup buffers when checking overlap", () => {
    const bufferedReservation: ResourceAvailabilityReservation = {
      id: "reservation-buffered",
      appointmentId: "appointment-1",
      status: "HELD",
      startsAt: localInstant("2026-07-06", 11),
      endsAt: localInstant("2026-07-06", 12),
      capacityUnits: 1,
      bufferBeforeMinutes: 30,
      bufferAfterMinutes: 30
    };
    const result = evaluateResourceAvailability({
      resource: serviceBay,
      timezone,
      operatingWindows: [mondayWindow],
      unavailability: [],
      reservations: [bufferedReservation],
      startsAt: localInstant("2026-07-06", 10, 45),
      endsAt: localInstant("2026-07-06", 11)
    });

    expect(result.isAvailable).toBe(false);
    expect(result.overlappingReservations).toEqual([bufferedReservation]);
  });

  it("treats proposed, released, and cancelled reservations as non-consuming", () => {
    const result = evaluateResourceAvailability({
      resource: serviceBay,
      timezone,
      operatingWindows: [mondayWindow],
      unavailability: [],
      reservations: [
        {
          appointmentId: "appointment-1",
          status: "PROPOSED",
          startsAt: localInstant("2026-07-06", 10),
          endsAt: localInstant("2026-07-06", 11),
          capacityUnits: 1
        },
        {
          appointmentId: "appointment-2",
          status: "CANCELLED",
          startsAt: localInstant("2026-07-06", 10),
          endsAt: localInstant("2026-07-06", 11),
          capacityUnits: 1
        }
      ],
      startsAt: localInstant("2026-07-06", 10, 30),
      endsAt: localInstant("2026-07-06", 11, 30)
    });

    expect(result.isAvailable).toBe(true);
    expect(result.reservedCapacity).toBe(0);
  });

  it("supports capacity resources with partial reservations and capacity reductions", () => {
    const reduction: ResourceAvailabilityUnavailability = {
      id: "reduction-1",
      type: "CAPACITY_REDUCTION",
      startsAt: localInstant("2026-07-06", 9),
      endsAt: localInstant("2026-07-06", 12),
      capacityReduction: 1,
      reason: "Advisor in training"
    };
    const result = evaluateResourceAvailability({
      resource: staffAdvisor,
      timezone,
      operatingWindows: [mondayWindow],
      unavailability: [reduction],
      reservations: [
        {
          appointmentId: "appointment-1",
          status: "COMMITTED",
          startsAt: localInstant("2026-07-06", 10),
          endsAt: localInstant("2026-07-06", 11),
          capacityUnits: 1
        }
      ],
      startsAt: localInstant("2026-07-06", 10),
      endsAt: localInstant("2026-07-06", 11),
      requiredCapacity: 1
    });

    expect(result).toMatchObject({
      isAvailable: false,
      isHardBlocked: false,
      isWarningOnly: true,
      effectiveWindowCapacity: 2,
      reservedCapacity: 1,
      unavailableCapacity: 1,
      availableCapacity: 0
    });
    expect(result.overlappingUnavailability).toEqual([reduction]);
  });

  it("applies resource-window capacity overrides", () => {
    const result = evaluateResourceAvailability({
      resource: staffAdvisor,
      timezone,
      operatingWindows: [
        {
          ...mondayWindow,
          capacityOverride: 1
        }
      ],
      unavailability: [],
      reservations: [],
      startsAt: localInstant("2026-07-06", 10),
      endsAt: localInstant("2026-07-06", 11),
      requiredCapacity: 2
    });

    expect(result).toMatchObject({
      isAvailable: false,
      isWarningOnly: true,
      effectiveWindowCapacity: 1,
      availableCapacity: 1
    });
    expect(result.reasons).toEqual(["Resource does not have enough available capacity."]);
  });

  it("blocks full outages and inactive resources", () => {
    const outage: ResourceAvailabilityUnavailability = {
      type: "OUTAGE",
      startsAt: localInstant("2026-07-06", 9),
      endsAt: localInstant("2026-07-06", 18),
      reason: "Bay lift is down"
    };

    expect(
      evaluateResourceAvailability({
        resource: serviceBay,
        timezone,
        operatingWindows: [mondayWindow],
        unavailability: [outage],
        reservations: [],
        startsAt: localInstant("2026-07-06", 10),
        endsAt: localInstant("2026-07-06", 11)
      })
    ).toMatchObject({
      isAvailable: false,
      isHardBlocked: true,
      unavailableCapacity: 1,
      availableCapacity: 0
    });

    expect(
      evaluateResourceAvailability({
        resource: {
          ...serviceBay,
          status: "OUT_OF_SERVICE"
        },
        timezone,
        operatingWindows: [mondayWindow],
        unavailability: [],
        reservations: [],
        startsAt: localInstant("2026-07-06", 10),
        endsAt: localInstant("2026-07-06", 11)
      }).reasons
    ).toContain("Resource status is OUT_OF_SERVICE.");
  });

  it("rejects resources outside effective dates or operating hours", () => {
    const futureResource = {
      ...serviceBay,
      effectiveFrom: new Date("2026-08-01T00:00:00.000Z")
    };
    const result = evaluateResourceAvailability({
      resource: futureResource,
      timezone,
      operatingWindows: [mondayWindow],
      unavailability: [],
      reservations: [],
      startsAt: localInstant("2026-07-06", 10),
      endsAt: localInstant("2026-07-06", 11)
    });

    expect(result.isAvailable).toBe(false);
    expect(result.reasons).toContain("Resource is not effective on the candidate date.");

    expect(
      evaluateResourceAvailability({
        resource: serviceBay,
        timezone,
        operatingWindows: [mondayWindow],
        unavailability: [],
        reservations: [],
        startsAt: localInstant("2026-07-06", 8),
        endsAt: localInstant("2026-07-06", 9)
      }).reasons
    ).toContain("Resource candidate is outside resource operating hours.");
  });

  it("requires candidates to stay within one local day and rejects impossible ranges", () => {
    expect(() =>
      evaluateResourceAvailability({
        resource: serviceBay,
        timezone,
        operatingWindows: [mondayWindow],
        unavailability: [],
        reservations: [],
        startsAt: localInstant("2026-07-06", 11),
        endsAt: localInstant("2026-07-06", 10)
      })
    ).toThrow(/end must be after/);

    expect(
      evaluateResourceAvailability({
        resource: serviceBay,
        timezone,
        operatingWindows: [
          {
            ...mondayWindow,
            closesAtMinute: 1440
          }
        ],
        unavailability: [],
        reservations: [],
        startsAt: localInstant("2026-07-06", 23),
        endsAt: localInstant("2026-07-07", 1)
      }).reasons
    ).toContain("Resource candidate must fit within one location-local day.");
  });
});
