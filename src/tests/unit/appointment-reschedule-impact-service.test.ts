import { BusinessDay, LocationSchedulingStatus } from "@prisma/client";
import { describe, expect, it } from "vitest";

import {
  previewAppointmentRescheduleImpact,
  previewRecurrenceRescheduleImpact,
  type AppointmentRescheduleCurrentState
} from "@/server/appointments/appointment-reschedule-impact-service";
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

const vehicleResource: ResourceAvailabilityResource = {
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

function currentState(
  appointmentId = "appointment-1"
): AppointmentRescheduleCurrentState {
  return {
    appointmentId,
    startsAt: localInstant("2026-07-06", 10),
    endsAt: localInstant("2026-07-06", 10, 45),
    reservations: [
      {
        id: `reservation-${appointmentId}`,
        requirementCode: "VEHICLE",
        resourceId: vehicleResource.id,
        status: "COMMITTED",
        startsAt: localInstant("2026-07-06", 10),
        endsAt: localInstant("2026-07-06", 10, 45),
        capacityUnits: 1,
        bufferBeforeMinutes: 15,
        bufferAfterMinutes: 15
      }
    ]
  };
}

function candidate(overrides: Partial<Parameters<typeof previewAppointmentRescheduleImpact>[0]["candidate"]> = {}) {
  return {
    template: getTemplate(),
    location: activeLocation,
    locationOperatingWindows: [mondayWindow],
    locationClosures: [],
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
        resource: vehicleResource,
        operatingWindows: [mondayWindow],
        unavailability: [],
        reservations: []
      }
    ],
    staff: [
      {
        role: "OWNER" as const,
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

describe("appointment reschedule impact service", () => {
  it("previews prior/new times and reservation recreate impact for a clean reschedule", () => {
    const preview = previewAppointmentRescheduleImpact({
      current: currentState(),
      proposedStartsAt: localInstant("2026-07-06", 11),
      candidate: candidate()
    });

    expect(preview).toMatchObject({
      appointmentId: "appointment-1",
      canApply: true,
      reasonRequired: true,
      prior: {
        startsAt: localInstant("2026-07-06", 10),
        endsAt: localInstant("2026-07-06", 10, 45)
      },
      proposed: {
        startsAt: localInstant("2026-07-06", 11),
        endsAt: localInstant("2026-07-06", 11, 45),
        resourceWindowStartsAt: localInstant("2026-07-06", 10, 45),
        resourceWindowEndsAt: localInstant("2026-07-06", 12)
      },
      proposedReservationResourceIds: [vehicleResource.id]
    });
    expect(preview.reservationImpacts).toEqual([
      expect.objectContaining({
        id: "reservation-appointment-1",
        action: "RELEASE_AND_RECREATE",
        reason: "Reservation consumes capacity and must be recreated for the proposed time."
      })
    ]);
    expect(preview.hardConflictResult.canCommit).toBe(true);
    expect(preview.warningResult.canCommit).toBe(true);
  });

  it("previews hard-blocked reschedules without claiming they can apply", () => {
    const preview = previewAppointmentRescheduleImpact({
      current: currentState(),
      proposedStartsAt: localInstant("2026-07-06", 17, 30),
      candidate: candidate()
    });

    expect(preview.canApply).toBe(false);
    expect(preview.hardConflictResult.hardConflicts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "LOCATION_UNAVAILABLE",
          message: "Candidate is outside location operating hours."
        }),
        expect.objectContaining({
          code: "REQUIRED_RESOURCE_UNAVAILABLE",
          resourceId: vehicleResource.id
        })
      ])
    );
    expect(preview.reservationImpacts[0]).toMatchObject({
      action: "RELEASE_AND_RECREATE"
    });
  });

  it("previews warning reschedules that need manager resolution", () => {
    const staffReservation: ResourceAvailabilityReservation = {
      id: "reservation-staff",
      appointmentId: "appointment-existing",
      resourceId: ownerStaffResource.id,
      status: "COMMITTED",
      startsAt: localInstant("2026-07-06", 11),
      endsAt: localInstant("2026-07-06", 12),
      capacityUnits: 1
    };
    const preview = previewAppointmentRescheduleImpact({
      current: currentState(),
      proposedStartsAt: localInstant("2026-07-06", 11),
      candidate: candidate({
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
    });

    expect(preview.hardConflictResult.canCommit).toBe(true);
    expect(preview.canApply).toBe(false);
    expect(preview.warningResult.unresolvedWarnings).toEqual([
      expect.objectContaining({
        code: "STAFF_OVERLAP",
        staffUserId: owner.id
      }),
      expect.objectContaining({
        code: "STAFF_OVERLAP",
        staffUserId: owner.id
      })
    ]);
  });

  it("previews recurrence scope, preserved occurrences, blocks, and warnings", () => {
    const blockedReservation: ResourceAvailabilityReservation = {
      id: "reservation-vehicle-existing",
      appointmentId: "appointment-existing",
      resourceId: vehicleResource.id,
      status: "COMMITTED",
      startsAt: localInstant("2026-07-20", 11),
      endsAt: localInstant("2026-07-20", 12),
      capacityUnits: 1
    };
    const warningReservation: ResourceAvailabilityReservation = {
      id: "reservation-staff-existing",
      appointmentId: "appointment-existing",
      resourceId: ownerStaffResource.id,
      status: "COMMITTED",
      startsAt: localInstant("2026-07-27", 11),
      endsAt: localInstant("2026-07-27", 12),
      capacityUnits: 1
    };
    const preview = previewRecurrenceRescheduleImpact({
      scope: "THIS_AND_FUTURE",
      targetOccurrenceKey: "series-1:2026-07-13",
      occurrences: [
        {
          occurrenceKey: "series-1:2026-07-06",
          localDate: "2026-07-06",
          status: "COMPLETED",
          current: currentState("appointment-20260706"),
          proposedStartsAt: localInstant("2026-07-06", 11),
          candidate: candidate()
        },
        {
          occurrenceKey: "series-1:2026-07-13",
          localDate: "2026-07-13",
          status: "SCHEDULED",
          current: currentState("appointment-20260713"),
          proposedStartsAt: localInstant("2026-07-13", 11),
          candidate: candidate()
        },
        {
          occurrenceKey: "series-1:2026-07-20",
          localDate: "2026-07-20",
          status: "SCHEDULED",
          current: currentState("appointment-20260720"),
          proposedStartsAt: localInstant("2026-07-20", 11),
          candidate: candidate({
            resources: [
              {
                requirementCode: "VEHICLE",
                resource: vehicleResource,
                operatingWindows: [mondayWindow],
                unavailability: [],
                reservations: [blockedReservation]
              }
            ]
          })
        },
        {
          occurrenceKey: "series-1:2026-07-27",
          localDate: "2026-07-27",
          status: "SCHEDULED",
          current: currentState("appointment-20260727"),
          proposedStartsAt: localInstant("2026-07-27", 11),
          candidate: candidate({
            staff: [
              {
                role: "OWNER",
                staff: owner,
                locationAccess: ownerAccess,
                staffResource: ownerStaffResource,
                operatingWindows: [mondayWindow],
                unavailability: [],
                reservations: [warningReservation]
              }
            ]
          })
        },
        {
          occurrenceKey: "series-1:2026-08-03",
          localDate: "2026-08-03",
          status: "CANCELLED",
          current: currentState("appointment-20260803"),
          proposedStartsAt: localInstant("2026-08-03", 11),
          candidate: candidate()
        }
      ]
    });

    expect(preview.canApply).toBe(false);
    expect(preview.recurrenceImpact).toMatchObject({
      affectedOccurrenceKeys: [
        "series-1:2026-07-13",
        "series-1:2026-07-20",
        "series-1:2026-07-27"
      ],
      preservedOccurrenceKeys: ["series-1:2026-08-03"]
    });
    expect(preview.occurrencePreviews.map((occurrence) => occurrence.appointmentId)).toEqual([
      "appointment-20260713",
      "appointment-20260720",
      "appointment-20260727"
    ]);
    expect(preview.blockedOccurrenceKeys).toEqual(["series-1:2026-07-20"]);
    expect(preview.warningOccurrenceKeys).toEqual(["series-1:2026-07-27"]);
    expect(preview.preservedOccurrenceKeys).toEqual(["series-1:2026-08-03"]);
  });
});
