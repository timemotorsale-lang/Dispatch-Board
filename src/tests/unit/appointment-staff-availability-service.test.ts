import { BusinessDay } from "@prisma/client";
import { describe, expect, it } from "vitest";

import {
  evaluateStaffAvailability,
  type StaffAvailabilityUser,
  type StaffLocationAccess,
  type StaffResource
} from "@/server/appointments/staff-availability-service";
import {
  locationLocalDateMinuteToInstant,
} from "@/server/appointments/location-time-service";
import type {
  ResourceAvailabilityOperatingWindow,
  ResourceAvailabilityReservation,
  ResourceAvailabilityUnavailability
} from "@/server/appointments/resource-availability-service";

const timezone = "America/Chicago";
const locationId = "loc-time-motor-sales-minneapolis";

const staff: StaffAvailabilityUser = {
  id: "user-brock",
  name: "Brock Peterson",
  isActive: true
};

const activeOwnerAccess: StaffLocationAccess = {
  userId: staff.id,
  locationId,
  canViewSchedule: true,
  canParticipate: true,
  canOwnAppointments: true,
  canManageAppointments: false,
  canViewLimitedData: true,
  validFrom: new Date("2026-01-01T00:00:00.000Z"),
  validTo: null
};

const staffResource: StaffResource = {
  id: "resource-staff-brock",
  locationId,
  resourceKind: "STAFF",
  userId: staff.id,
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

function evaluate(overrides: Partial<Parameters<typeof evaluateStaffAvailability>[0]> = {}) {
  return evaluateStaffAvailability({
    staff,
    locationId,
    timezone,
    requestedRole: "OWNER",
    locationAccess: activeOwnerAccess,
    staffResource,
    operatingWindows: [mondayWindow],
    unavailability: [],
    reservations: [],
    startsAt: localInstant("2026-07-06", 10),
    endsAt: localInstant("2026-07-06", 11),
    ...overrides
  });
}

describe("appointment staff availability service", () => {
  it("accepts an active eligible owner with available staff capacity", () => {
    expect(evaluate()).toMatchObject({
      staffUserId: staff.id,
      locationId,
      requestedRole: "OWNER",
      localDate: "2026-07-06",
      isEligible: true,
      isAvailable: true,
      isSchedulable: true,
      isHardBlocked: false,
      isWarningOnly: false,
      reasons: []
    });
  });

  it("allows participant eligibility without ownership eligibility", () => {
    const result = evaluate({
      requestedRole: "PARTICIPANT",
      locationAccess: {
        ...activeOwnerAccess,
        canOwnAppointments: false
      }
    });

    expect(result).toMatchObject({
      isEligible: true,
      isSchedulable: true,
      reasons: []
    });
  });

  it("requires owner and manager-specific location grants", () => {
    expect(
      evaluate({
        locationAccess: {
          ...activeOwnerAccess,
          canOwnAppointments: false
        }
      })
    ).toMatchObject({
      isEligible: false,
      isHardBlocked: true,
      reasons: ["Staff user cannot own appointments at this location."]
    });

    expect(
      evaluate({
        requestedRole: "MANAGER",
        locationAccess: {
          ...activeOwnerAccess,
          canManageAppointments: false
        }
      }).reasons
    ).toContain("Staff user cannot manage appointments at this location.");
  });

  it("rejects inactive staff, missing access, and expired location access", () => {
    expect(
      evaluate({
        staff: {
          ...staff,
          isActive: false
        }
      }).reasons
    ).toContain("Staff user is inactive.");

    expect(
      evaluate({
        locationAccess: null
      }).reasons
    ).toContain("Staff user has no location access grant.");

    expect(
      evaluate({
        locationAccess: {
          ...activeOwnerAccess,
          validTo: new Date("2026-06-30T00:00:00.000Z")
        }
      }).reasons
    ).toContain("Staff location access is not effective on the candidate date.");
  });

  it("requires a matching staff resource for the selected staff and location", () => {
    expect(
      evaluate({
        staffResource: null
      })
    ).toMatchObject({
      isEligible: false,
      isAvailable: false,
      isHardBlocked: true,
      resourceAvailability: null,
      reasons: ["Staff user has no schedulable staff resource."]
    });

    expect(
      evaluate({
        staffResource: {
          ...staffResource,
          locationId: "loc-other"
        }
      }).reasons
    ).toContain("Staff resource does not belong to the requested location.");

    expect(
      evaluate({
        staffResource: {
          ...staffResource,
          userId: "user-other"
        }
      }).reasons
    ).toContain("Staff resource does not belong to the staff user.");
  });

  it("surfaces staff resource reservations and absences as warning-only availability issues", () => {
    const reservation: ResourceAvailabilityReservation = {
      appointmentId: "appointment-1",
      status: "COMMITTED",
      startsAt: localInstant("2026-07-06", 10),
      endsAt: localInstant("2026-07-06", 11),
      capacityUnits: 2
    };

    expect(
      evaluate({
        reservations: [reservation]
      })
    ).toMatchObject({
      isEligible: true,
      isAvailable: false,
      isSchedulable: false,
      isHardBlocked: false,
      isWarningOnly: true
    });

    const absence: ResourceAvailabilityUnavailability = {
      type: "ABSENCE",
      startsAt: localInstant("2026-07-06", 9),
      endsAt: localInstant("2026-07-06", 18),
      reason: "Approved PTO"
    };

    expect(
      evaluate({
        unavailability: [absence]
      }).reasons
    ).toContain("Resource capacity is reduced or unavailable during the candidate window.");
  });

  it("keeps outside working windows unavailable through the resource evaluator", () => {
    const result = evaluate({
      startsAt: localInstant("2026-07-06", 8),
      endsAt: localInstant("2026-07-06", 9)
    });

    expect(result).toMatchObject({
      isEligible: true,
      isAvailable: false,
      isSchedulable: false,
      isWarningOnly: true
    });
    expect(result.reasons).toContain("Resource candidate is outside resource operating hours.");
  });
});
