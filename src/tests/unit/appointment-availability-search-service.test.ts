import { BusinessDay, LocationSchedulingStatus } from "@prisma/client";
import { describe, expect, it } from "vitest";

import { searchAppointmentAvailability } from "@/server/appointments/appointment-availability-search-service";
import {
  getInitialAppointmentTemplateDefinition,
  type AppointmentTemplateDefinition
} from "@/server/appointments/appointment-template-domain";
import { locationLocalDateMinuteToInstant } from "@/server/appointments/location-time-service";
import type {
  ResourceAvailabilityOperatingWindow,
  ResourceAvailabilityReservation,
  ResourceAvailabilityResource
} from "@/server/appointments/resource-availability-service";
import type {
  StaffAvailabilityUser,
  StaffLocationAccess,
  StaffResource
} from "@/server/appointments/staff-availability-service";

const timezone = "America/Chicago";
const locationId = "loc-time-motor-sales-minneapolis";

const activeLocation = {
  id: locationId,
  timezone,
  schedulingStatus: LocationSchedulingStatus.ACTIVE
};

const mondayWindow: ResourceAvailabilityOperatingWindow = {
  businessDay: BusinessDay.MONDAY,
  opensAtMinute: 9 * 60,
  closesAtMinute: 18 * 60,
  capacityOverride: null,
  validFrom: new Date("2026-01-01T00:00:00.000Z"),
  validTo: null
};

const testDriveVehicle: ResourceAvailabilityResource = {
  id: "resource-vehicle-camry",
  name: "2018 Toyota Camry",
  status: "ACTIVE",
  capacityMode: "EXCLUSIVE",
  capacity: 1,
  conflictPolicy: "HARD_BLOCK",
  effectiveFrom: new Date("2026-01-01T00:00:00.000Z"),
  effectiveTo: null
};

const owner: StaffAvailabilityUser = {
  id: "user-brock",
  name: "Brock Peterson",
  isActive: true
};

const ownerAccess: StaffLocationAccess = {
  userId: owner.id,
  locationId,
  canViewSchedule: true,
  canParticipate: true,
  canOwnAppointments: true,
  canManageAppointments: false,
  canViewLimitedData: true,
  validFrom: new Date("2026-01-01T00:00:00.000Z"),
  validTo: null
};

const ownerStaffResource: StaffResource = {
  id: "resource-staff-brock",
  locationId,
  resourceKind: "STAFF",
  userId: owner.id,
  name: owner.name,
  status: "ACTIVE",
  capacityMode: "CAPACITY",
  capacity: 1,
  conflictPolicy: "WARNING",
  effectiveFrom: new Date("2026-01-01T00:00:00.000Z"),
  effectiveTo: null
};

function localInstant(localDate: string, hour: number, minute = 0) {
  return locationLocalDateMinuteToInstant({
    localDate,
    minuteOfDay: hour * 60 + minute,
    timezone
  });
}

function getTemplate(): AppointmentTemplateDefinition {
  const template = getInitialAppointmentTemplateDefinition("APT-TEST-DRIVE");

  if (!template) {
    throw new Error("Missing test-drive template fixture.");
  }

  return template;
}

function search(overrides: Partial<Parameters<typeof searchAppointmentAvailability>[0]> = {}) {
  return searchAppointmentAvailability({
    template: getTemplate(),
    location: activeLocation,
    locationOperatingWindows: [mondayWindow],
    locationClosures: [],
    windowStartLocalDate: "2026-07-06",
    windowEndLocalDate: "2026-07-06",
    earliestStartMinuteOfDay: 9 * 60,
    latestStartMinuteOfDay: 12 * 60,
    maximumResults: 10,
    providedContextFields: [
      "customer",
      "vehicle",
      "owner",
      "driverEligibility",
      "location"
    ],
    resources: [
      {
        requirementCode: "VEHICLE",
        resource: testDriveVehicle,
        operatingWindows: [mondayWindow],
        unavailability: [],
        reservations: []
      }
    ],
    staff: [
      {
        role: "OWNER",
        staff: owner,
        locationAccess: ownerAccess,
        staffResource: ownerStaffResource,
        operatingWindows: [mondayWindow],
        unavailability: [],
        reservations: []
      }
    ],
    ...overrides
  });
}

describe("appointment availability search service", () => {
  it("finds available slots using the same duration, buffer, location, resource, and staff rules", () => {
    const result = search({
      maximumResults: 3
    });

    expect(result).toMatchObject({
      windowStartLocalDate: "2026-07-06",
      windowEndLocalDate: "2026-07-06",
      truncated: true,
      blockedSlotCount: 1
    });
    expect(result.slots.map((slot) => slot.status)).toEqual([
      "AVAILABLE",
      "AVAILABLE",
      "AVAILABLE"
    ]);
    expect(result.slots.map((slot) => slot.startMinuteOfDay)).toEqual([555, 570, 585]);
    expect(result.slots[0]).toMatchObject({
      localDate: "2026-07-06",
      canCommit: true
    });
    expect(result.slots[0]?.startsAt.toISOString()).toBe("2026-07-06T14:15:00.000Z");
    expect(result.slots[0]?.endsAt?.toISOString()).toBe("2026-07-06T15:00:00.000Z");
  });

  it("excludes hard-blocked resource conflicts from available results", () => {
    const existingReservation: ResourceAvailabilityReservation = {
      id: "reservation-existing",
      appointmentId: "appointment-existing",
      resourceId: testDriveVehicle.id,
      status: "COMMITTED",
      startsAt: localInstant("2026-07-06", 10),
      endsAt: localInstant("2026-07-06", 11),
      capacityUnits: 1
    };
    const result = search({
      earliestStartMinuteOfDay: 10 * 60,
      latestStartMinuteOfDay: 11 * 60 + 15,
      includeBlockedSlots: true,
      resources: [
        {
          requirementCode: "VEHICLE",
          resource: testDriveVehicle,
          operatingWindows: [mondayWindow],
          unavailability: [],
          reservations: [existingReservation]
        }
      ]
    });

    expect(result.blockedSlotCount).toBeGreaterThan(0);
    expect(result.slots.some((slot) => slot.status === "BLOCKED")).toBe(true);
    expect(result.availableSlots.map((slot) => slot.startMinuteOfDay)).toEqual([675]);
    expect(result.slots.find((slot) => slot.status === "BLOCKED")).toMatchObject({
      canCommit: false,
      hardConflictResult: {
        canCommit: false,
        hardConflicts: [
          expect.objectContaining({
            code: "REQUIRED_RESOURCE_UNAVAILABLE",
            resourceId: testDriveVehicle.id
          }),
          expect.objectContaining({
            code: "REQUIRED_RESOURCE_UNAVAILABLE",
            resourceId: testDriveVehicle.id
          })
        ]
      }
    });
  });

  it("returns warning slots separately when manager override would be required", () => {
    const staffReservation: ResourceAvailabilityReservation = {
      id: "reservation-staff",
      appointmentId: "appointment-existing",
      resourceId: ownerStaffResource.id,
      status: "COMMITTED",
      startsAt: localInstant("2026-07-06", 10),
      endsAt: localInstant("2026-07-06", 11),
      capacityUnits: 1
    };
    const result = search({
      earliestStartMinuteOfDay: 10 * 60,
      latestStartMinuteOfDay: 10 * 60,
      staff: [
        {
          role: "OWNER",
          staff: owner,
          locationAccess: ownerAccess,
          staffResource: ownerStaffResource,
          operatingWindows: [mondayWindow],
          unavailability: [],
          reservations: [staffReservation]
        }
      ]
    });

    expect(result.availableSlots).toEqual([]);
    expect(result.warningSlots).toHaveLength(1);
    expect(result.warningSlots[0]).toMatchObject({
      status: "WARNING",
      canCommit: false,
      warningResult: {
        warnings: [
          expect.objectContaining({
            code: "STAFF_OVERLAP",
            managerOverrideRequired: true,
            staffUserId: owner.id
          }),
          expect.objectContaining({
            code: "STAFF_OVERLAP",
            managerOverrideRequired: true,
            staffUserId: owner.id
          })
        ]
      }
    });
  });

  it("can suppress warning and blocked slots when the caller needs clean availability only", () => {
    const result = search({
      earliestStartMinuteOfDay: 10 * 60,
      latestStartMinuteOfDay: 10 * 60,
      includeWarningSlots: false,
      includeBlockedSlots: false,
      warningSignalFactory: () => [
        {
          code: "CUSTOMER_NEARBY_APPOINTMENT",
          source: "CUSTOMER",
          message: "Customer has another nearby appointment.",
          managerOverrideRequired: true
        }
      ]
    });

    expect(result.slots).toEqual([]);
    expect(result.warningSlots).toEqual([]);
    expect(result.blockedSlotCount).toBe(0);
    expect(result.searchedCandidateCount).toBe(1);
  });

  it("rejects searches beyond the enterprise horizon", () => {
    expect(() =>
      search({
        windowStartLocalDate: "2026-07-06",
        windowEndLocalDate: "2026-08-20"
      })
    ).toThrow(/horizon/i);
  });
});
