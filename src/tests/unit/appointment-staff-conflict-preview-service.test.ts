import { BusinessDay } from "@prisma/client";
import { describe, expect, it } from "vitest";

import type { AuthenticatedUser } from "@/server/auth/store";
import { locationLocalDateMinuteToInstant } from "@/server/appointments/location-time-service";
import {
  previewAppointmentStaffConflicts,
  type AppointmentStaffConflictPreviewAppointmentRecord,
  type AppointmentStaffConflictPreviewLocationAccessRecord,
  type AppointmentStaffConflictPreviewRepository,
  type AppointmentStaffConflictPreviewStaffResourceRecord
} from "@/server/services/appointment-staff-conflict-preview-service";

const timezone = "America/Chicago";
const locationId = "loc-time-motor-sales-minneapolis";
const now = new Date("2026-07-06T15:00:00.000Z");

const managerUser: AuthenticatedUser = {
  id: "user-manager",
  name: "Abdi Farah",
  email: "manager@local.test",
  isActive: true,
  roles: ["General Manager"],
  duties: {
    direct: [],
    roleDefaults: [],
    all: []
  }
};

function localInstant(localDate: string, hour: number, minute = 0) {
  return locationLocalDateMinuteToInstant({
    localDate,
    minuteOfDay: hour * 60 + minute,
    timezone
  });
}

function access(
  userId: string,
  overrides: Partial<AppointmentStaffConflictPreviewLocationAccessRecord> = {}
): AppointmentStaffConflictPreviewLocationAccessRecord {
  return {
    userId,
    locationId,
    canViewSchedule: true,
    canParticipate: true,
    canOwnAppointments: true,
    canManageAppointments: userId === managerUser.id,
    canViewLimitedData: true,
    validFrom: new Date("2026-01-01T00:00:00.000Z"),
    validTo: null,
    ...overrides
  };
}

function appointment(
  overrides: Partial<AppointmentStaffConflictPreviewAppointmentRecord> = {}
): AppointmentStaffConflictPreviewAppointmentRecord {
  return {
    id: "appointment-1",
    appointmentNumber: "APT-20001",
    locationId,
    ownerUserId: "user-brock",
    startsAt: localInstant("2026-07-06", 10),
    endsAt: localInstant("2026-07-06", 11),
    schedulingTimezone: timezone,
    bookingStatus: "DRAFT",
    ownerUser: {
      id: "user-brock",
      name: "Brock Peterson",
      isActive: true
    },
    ...overrides
  };
}

function staffResource(
  overrides: Partial<AppointmentStaffConflictPreviewStaffResourceRecord> = {}
): AppointmentStaffConflictPreviewStaffResourceRecord {
  return {
    id: "resource-staff-brock",
    locationId,
    userId: "user-brock",
    name: "Brock Peterson",
    status: "ACTIVE",
    capacityMode: "CAPACITY",
    capacity: 1,
    conflictPolicy: "WARNING",
    effectiveFrom: new Date("2026-01-01T00:00:00.000Z"),
    effectiveTo: null,
    resourceType: {
      kind: "STAFF"
    },
    operatingWindows: [
      {
        businessDay: BusinessDay.MONDAY,
        opensAtMinute: 9 * 60,
        closesAtMinute: 18 * 60,
        capacityOverride: null,
        validFrom: new Date("2026-01-01T00:00:00.000Z"),
        validTo: null
      }
    ],
    unavailability: [],
    reservations: [],
    ...overrides
  };
}

function repository(input?: {
  appointment?: AppointmentStaffConflictPreviewAppointmentRecord | null;
  actorAccess?: AppointmentStaffConflictPreviewLocationAccessRecord | null;
  ownerAccess?: AppointmentStaffConflictPreviewLocationAccessRecord | null;
  staffResource?: AppointmentStaffConflictPreviewStaffResourceRecord | null;
}): AppointmentStaffConflictPreviewRepository {
  return {
    async findAppointmentById() {
      return input?.appointment === undefined ? appointment() : input.appointment;
    },
    async findLocationAccess(userId) {
      if (userId === managerUser.id) {
        return input?.actorAccess === undefined
          ? access(managerUser.id)
          : input.actorAccess;
      }

      return input?.ownerAccess === undefined ? access(userId) : input.ownerAccess;
    },
    async findStaffResourceForUser() {
      return input?.staffResource === undefined ? staffResource() : input.staffResource;
    }
  };
}

describe("appointment staff conflict preview service", () => {
  it("returns ready staff preview when the owner is available", async () => {
    const preview = await previewAppointmentStaffConflicts(
      managerUser,
      "appointment-1",
      repository(),
      now
    );

    expect(preview).toMatchObject({
      appointmentId: "appointment-1",
      appointmentNumber: "APT-20001",
      status: "READY",
      canProceedWithStaff: true,
      staff: {
        userId: "user-brock",
        name: "Brock Peterson",
        role: "OWNER",
        resourceId: "resource-staff-brock"
      },
      reasons: []
    });
  });

  it("blocks preview when no accountable owner is assigned", async () => {
    const preview = await previewAppointmentStaffConflicts(
      managerUser,
      "appointment-1",
      repository({
        appointment: appointment({
          ownerUserId: null,
          ownerUser: null
        })
      }),
      now
    );

    expect(preview).toMatchObject({
      status: "BLOCKED",
      canProceedWithStaff: false,
      staff: null,
      checks: [
        {
          code: "owner_required",
          status: "BLOCKED"
        }
      ]
    });
  });

  it("surfaces warning-only owner staff conflicts", async () => {
    const overlappingReservation =
      staffResource().reservations[0] ?? {
        id: "reservation-staff-overlap",
        appointmentId: "appointment-2",
        status: "COMMITTED",
        startsAt: localInstant("2026-07-06", 10),
        endsAt: localInstant("2026-07-06", 11),
        capacityUnits: 1,
        bufferBeforeMinutes: 0,
        bufferAfterMinutes: 0
      };

    const preview = await previewAppointmentStaffConflicts(
      managerUser,
      "appointment-1",
      repository({
        staffResource: staffResource({
          reservations: [overlappingReservation]
        })
      }),
      now
    );

    expect(preview).toMatchObject({
      status: "WARNING",
      canProceedWithStaff: true,
      reasons: expect.arrayContaining([
        "Resource capacity is already reserved during the candidate window.",
        "Resource does not have enough available capacity."
      ])
    });
  });

  it("rejects unauthorized preview access", async () => {
    await expect(
      previewAppointmentStaffConflicts(
        managerUser,
        "appointment-1",
        repository({
          actorAccess: access(managerUser.id, {
            canManageAppointments: false
          })
        }),
        now
      )
    ).rejects.toThrow("Appointment command is not authorized.");
  });
});
