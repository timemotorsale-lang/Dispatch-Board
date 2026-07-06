import { BusinessDay, LocationSchedulingStatus } from "@prisma/client";
import { describe, expect, it } from "vitest";

import {
  evaluateAppointmentHardConflicts,
  evaluateAppointmentRecurrenceHardConflicts,
  type AppointmentHardConflictEvaluationInput
} from "@/server/appointments/appointment-hard-conflict-service";
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

const serviceBay: ResourceAvailabilityResource = {
  id: "resource-service-bay-1",
  name: "Service Bay 1",
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
  name: "Brock Peterson",
  status: "ACTIVE",
  capacityMode: "CAPACITY",
  capacity: 2,
  conflictPolicy: "WARNING",
  effectiveFrom: new Date("2026-01-01T00:00:00.000Z"),
  effectiveTo: null
};

function getTemplate(code: string) {
  const template = getInitialAppointmentTemplateDefinition(code);

  if (!template) {
    throw new Error(`Missing template fixture ${code}`);
  }

  return template;
}

function localInstant(localDate: string, hour: number, minute = 0) {
  return locationLocalDateMinuteToInstant({
    localDate,
    minuteOfDay: hour * 60 + minute,
    timezone
  });
}

function baseInput(
  overrides: Partial<AppointmentHardConflictEvaluationInput> = {}
): AppointmentHardConflictEvaluationInput {
  return {
    template: getTemplate("APT-TEST-DRIVE"),
    location: activeLocation,
    locationOperatingWindows: [mondayWindow],
    locationClosures: [],
    startsAt: localInstant("2026-07-06", 10),
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
        resource: serviceBay,
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
  };
}

describe("appointment hard-conflict service", () => {
  it("accepts a fully valid appointment candidate without hard conflicts", () => {
    const result = evaluateAppointmentHardConflicts(baseInput());

    expect(result.canCommit).toBe(true);
    expect(result.hardConflicts).toEqual([]);
    expect(result.timeFootprint).toMatchObject({
      appointmentStartsAt: localInstant("2026-07-06", 10),
      appointmentEndsAt: localInstant("2026-07-06", 10, 45),
      resourceWindowStartsAt: localInstant("2026-07-06", 9, 45),
      resourceWindowEndsAt: localInstant("2026-07-06", 11)
    });
    expect(result.locationResult?.isSchedulable).toBe(true);
    expect(result.resourceResults[0]?.result.isAvailable).toBe(true);
    expect(result.staffResults[0]?.result.isSchedulable).toBe(true);
  });

  it("hard-blocks inactive templates and missing required context", () => {
    const inactiveTemplate: AppointmentTemplateDefinition = {
      ...getTemplate("APT-TEST-DRIVE"),
      isActive: false
    };
    const result = evaluateAppointmentHardConflicts(
      baseInput({
        template: inactiveTemplate,
        providedContextFields: ["customer", "location"]
      })
    );

    expect(result.canCommit).toBe(false);
    expect(result.hardConflicts.map((conflict) => conflict.code)).toEqual([
      "INACTIVE_TEMPLATE",
      "REQUIRED_CONTEXT_MISSING",
      "REQUIRED_CONTEXT_MISSING",
      "REQUIRED_CONTEXT_MISSING"
    ]);
    expect(result.hardConflicts.map((conflict) => conflict.contextField).filter(Boolean)).toEqual([
      "vehicle",
      "owner",
      "driverEligibility"
    ]);
  });

  it("hard-blocks invalid appointment timing before availability is evaluated", () => {
    const result = evaluateAppointmentHardConflicts(
      baseInput({
        startsAt: localInstant("2026-07-06", 10, 7)
      })
    );

    expect(result.canCommit).toBe(false);
    expect(result.timeFootprint).toBeNull();
    expect(result.locationResult).toBeNull();
    expect(result.hardConflicts).toEqual([
      expect.objectContaining({
        code: "INVALID_TIME",
        source: "TIME",
        message: expect.stringMatching(/15-minute start interval/i)
      })
    ]);
  });

  it("hard-blocks candidates outside active location hours", () => {
    const result = evaluateAppointmentHardConflicts(
      baseInput({
        startsAt: localInstant("2026-07-06", 17, 30)
      })
    );

    expect(result.canCommit).toBe(false);
    expect(result.hardConflicts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "LOCATION_UNAVAILABLE",
          source: "LOCATION",
          message: "Candidate is outside location operating hours."
        })
      ])
    );
  });

  it("hard-blocks mandatory exclusive resources that are already committed", () => {
    const committedReservation: ResourceAvailabilityReservation = {
      appointmentId: "appointment-existing",
      status: "COMMITTED",
      startsAt: localInstant("2026-07-06", 10),
      endsAt: localInstant("2026-07-06", 11),
      capacityUnits: 1
    };
    const result = evaluateAppointmentHardConflicts(
      baseInput({
        resources: [
          {
            requirementCode: "VEHICLE",
            resource: serviceBay,
            operatingWindows: [mondayWindow],
            unavailability: [],
            reservations: [committedReservation]
          }
        ]
      })
    );

    expect(result.canCommit).toBe(false);
    expect(result.resourceResults[0]?.result.isHardBlocked).toBe(true);
    expect(result.hardConflicts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "REQUIRED_RESOURCE_UNAVAILABLE",
          source: "RESOURCE",
          resourceId: serviceBay.id,
          message: "Resource capacity is already reserved during the candidate window."
        }),
        expect.objectContaining({
          code: "REQUIRED_RESOURCE_UNAVAILABLE",
          source: "RESOURCE",
          resourceId: serviceBay.id,
          message: "Resource does not have enough available capacity."
        })
      ])
    );
  });

  it("hard-blocks owners who lack appointment ownership access", () => {
    const result = evaluateAppointmentHardConflicts(
      baseInput({
        staff: [
          {
            role: "OWNER",
            staff: owner,
            locationAccess: {
              ...ownerAccess,
              canOwnAppointments: false
            },
            staffResource: ownerStaffResource,
            operatingWindows: [mondayWindow],
            unavailability: [],
            reservations: []
          }
        ]
      })
    );

    expect(result.canCommit).toBe(false);
    expect(result.hardConflicts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "OWNER_UNAVAILABLE_OR_UNAUTHORIZED",
          source: "STAFF",
          staffUserId: owner.id,
          message: "Staff user cannot own appointments at this location."
        })
      ])
    );
  });

  it("does not hard-block warning-only staff availability conflicts in EAPT-018", () => {
    const staffReservation: ResourceAvailabilityReservation = {
      appointmentId: "appointment-existing",
      status: "COMMITTED",
      startsAt: localInstant("2026-07-06", 10),
      endsAt: localInstant("2026-07-06", 11),
      capacityUnits: 2
    };
    const result = evaluateAppointmentHardConflicts(
      baseInput({
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
      })
    );

    expect(result.staffResults[0]?.result.isWarningOnly).toBe(true);
    expect(result.canCommit).toBe(true);
    expect(result.hardConflicts).toEqual([]);
  });

  it("rejects recurring series when any required occurrence has hard conflicts", () => {
    const result = evaluateAppointmentRecurrenceHardConflicts({
      occurrences: [
        {
          ...baseInput(),
          occurrenceKey: "series-1:2026-07-06"
        },
        {
          ...baseInput({
            startsAt: localInstant("2026-07-06", 17, 30)
          }),
          occurrenceKey: "series-1:2026-07-13"
        }
      ]
    });

    expect(result.canCommitSeries).toBe(false);
    expect(result.occurrenceResults.map((occurrence) => occurrence.canCommit)).toEqual([
      true,
      false
    ]);
    expect(result.hardConflicts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "RECURRENCE_OCCURRENCE_INVALID",
          source: "RECURRENCE",
          occurrenceKey: "series-1:2026-07-13"
        }),
        expect.objectContaining({
          code: "LOCATION_UNAVAILABLE",
          source: "LOCATION",
          occurrenceKey: "series-1:2026-07-13"
        })
      ])
    );
  });
});
