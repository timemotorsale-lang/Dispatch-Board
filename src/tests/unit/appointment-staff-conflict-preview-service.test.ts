import { BusinessDay } from "@prisma/client";
import { describe, expect, it } from "vitest";

import type { AuthenticatedUser } from "@/server/auth/store";
import { locationLocalDateMinuteToInstant } from "@/server/appointments/location-time-service";
import {
  overrideAppointmentStaffWarning,
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
    participants: [],
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
  participantAccesses?: Record<
    string,
    AppointmentStaffConflictPreviewLocationAccessRecord | null
  >;
  staffResources?: Record<string, AppointmentStaffConflictPreviewStaffResourceRecord | null>;
  warningOverrideKeys?: string[];
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

      if (input?.participantAccesses && userId in input.participantAccesses) {
        return input.participantAccesses[userId] ?? null;
      }

      return input?.ownerAccess === undefined ? access(userId) : input.ownerAccess;
    },
    async findStaffResourceForUser(userId) {
      if (input?.staffResources && userId in input.staffResources) {
        return input.staffResources[userId] ?? null;
      }

      return input?.staffResource === undefined ? staffResource() : input.staffResource;
    },
    async findStaffWarningOverrideKeys() {
      return input?.warningOverrideKeys ?? [];
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
      canProceedWithStaff: false,
      warningOverrideRequired: true,
      warningOverrideSatisfied: false,
      warningKey: expect.stringContaining("STAFF|STAFF_OVERLAP|appointment-1"),
      reasons: expect.arrayContaining([
        "Resource capacity is already reserved during the candidate window.",
        "Resource does not have enough available capacity."
      ])
    });
  });

  it("surfaces warning-only internal participant staff conflicts", async () => {
    const overlappingReservation = {
      id: "reservation-participant-overlap",
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
        appointment: appointment({
          participants: [
            {
              id: "participant-rayana",
              roleCode: "OFFICE_ADMIN",
              userId: "user-rayana",
              displayNameSnapshot: "Rayana Hassan",
              isRequired: true,
              isPrimary: false,
              attendanceRequired: true,
              user: {
                id: "user-rayana",
                name: "Rayana Hassan",
                isActive: true
              }
            }
          ]
        }),
        staffResources: {
          "user-brock": staffResource(),
          "user-rayana": staffResource({
            id: "resource-staff-rayana",
            userId: "user-rayana",
            name: "Rayana Hassan",
            reservations: [overlappingReservation]
          })
        }
      }),
      now
    );

    expect(preview).toMatchObject({
      status: "WARNING",
      canProceedWithStaff: false,
      warningOverrideRequired: true,
      warningOverrideSatisfied: false,
      staff: {
        userId: "user-rayana",
        name: "Rayana Hassan",
        role: "PARTICIPANT",
        roleCode: "OFFICE_ADMIN",
        resourceId: "resource-staff-rayana"
      },
      staffMembers: expect.arrayContaining([
        expect.objectContaining({
          userId: "user-brock",
          role: "OWNER",
          status: "READY"
        }),
        expect.objectContaining({
          userId: "user-rayana",
          role: "PARTICIPANT",
          status: "WARNING",
          warningKey: expect.stringContaining("STAFF|STAFF_OVERLAP|appointment-1|user-rayana")
        })
      ]),
      checks: expect.arrayContaining([
        expect.objectContaining({
          code: "participant_staff_user-rayana_OFFICE_ADMIN",
          status: "WARNING",
          staffRole: "PARTICIPANT"
        })
      ]),
      reasons: expect.arrayContaining([
        "Resource capacity is already reserved during the candidate window.",
        "Resource does not have enough available capacity."
      ])
    });
  });

  it("surfaces persisted internal participant staff warning overrides in the preview", async () => {
    const overlappingReservation = {
      id: "reservation-participant-overlap",
      appointmentId: "appointment-2",
      status: "COMMITTED",
      startsAt: localInstant("2026-07-06", 10),
      endsAt: localInstant("2026-07-06", 11),
      capacityUnits: 1,
      bufferBeforeMinutes: 0,
      bufferAfterMinutes: 0
    };
    const participantAppointment = appointment({
      participants: [
        {
          id: "participant-rayana",
          roleCode: "OFFICE_ADMIN",
          userId: "user-rayana",
          displayNameSnapshot: "Rayana Hassan",
          isRequired: true,
          isPrimary: false,
          attendanceRequired: true,
          user: {
            id: "user-rayana",
            name: "Rayana Hassan",
            isActive: true
          }
        }
      ]
    });
    const resources = {
      "user-brock": staffResource(),
      "user-rayana": staffResource({
        id: "resource-staff-rayana",
        userId: "user-rayana",
        name: "Rayana Hassan",
        reservations: [overlappingReservation]
      })
    };
    const initial = await previewAppointmentStaffConflicts(
      managerUser,
      "appointment-1",
      repository({
        appointment: participantAppointment,
        staffResources: resources
      }),
      now
    );

    const preview = await previewAppointmentStaffConflicts(
      managerUser,
      "appointment-1",
      repository({
        appointment: participantAppointment,
        staffResources: resources,
        warningOverrideKeys: initial.warningKey ? [initial.warningKey] : []
      }),
      now
    );

    expect(preview).toMatchObject({
      status: "WARNING",
      canProceedWithStaff: true,
      warningOverrideRequired: true,
      warningOverrideSatisfied: true,
      warningKey: initial.warningKey,
      staff: {
        userId: "user-rayana",
        role: "PARTICIPANT",
        roleCode: "OFFICE_ADMIN"
      },
      staffMembers: expect.arrayContaining([
        expect.objectContaining({
          userId: "user-rayana",
          warningOverrideSatisfied: true
        })
      ])
    });
  });

  it("surfaces persisted staff warning overrides in the preview", async () => {
    const overlappingReservation = {
      id: "reservation-staff-overlap",
      appointmentId: "appointment-2",
      status: "COMMITTED",
      startsAt: localInstant("2026-07-06", 10),
      endsAt: localInstant("2026-07-06", 11),
      capacityUnits: 1,
      bufferBeforeMinutes: 0,
      bufferAfterMinutes: 0
    };
    const initial = await previewAppointmentStaffConflicts(
      managerUser,
      "appointment-1",
      repository({
        staffResource: staffResource({
          reservations: [overlappingReservation]
        })
      }),
      now
    );

    const preview = await previewAppointmentStaffConflicts(
      managerUser,
      "appointment-1",
      repository({
        staffResource: staffResource({
          reservations: [overlappingReservation]
        }),
        warningOverrideKeys: initial.warningKey ? [initial.warningKey] : []
      }),
      now
    );

    expect(preview).toMatchObject({
      status: "WARNING",
      canProceedWithStaff: true,
      warningOverrideRequired: true,
      warningOverrideSatisfied: true,
      warningKey: initial.warningKey
    });
  });

  it("records a manager override for a warning-level staff conflict", async () => {
    const overlappingReservation = {
      id: "reservation-staff-overlap",
      appointmentId: "appointment-2",
      status: "COMMITTED",
      startsAt: localInstant("2026-07-06", 10),
      endsAt: localInstant("2026-07-06", 11),
      capacityUnits: 1,
      bufferBeforeMinutes: 0,
      bufferAfterMinutes: 0
    };
    const createdHistory: unknown[] = [];
    const database = {
      appointment: {
        async findUnique() {
          return appointment();
        },
        async updateMany() {
          return {
            count: 1
          };
        }
      },
      userLocationAccess: {
        async findUnique(input: { where: { userId_locationId: { userId: string } } }) {
          return access(input.where.userId_locationId.userId);
        }
      },
      schedulableResource: {
        async findFirst() {
          return staffResource({
            reservations: [overlappingReservation]
          });
        }
      },
      appointmentHistoryEvent: {
        async findFirst() {
          return null;
        },
        async create(input: { data: unknown }) {
          createdHistory.push(input.data);
        }
      },
      async $transaction(operation: (tx: unknown) => Promise<unknown>) {
        return operation(this);
      }
    };

    const result = await overrideAppointmentStaffWarning(
      managerUser,
      "appointment-1",
      {
        expectedAppointmentVersion: 3,
        reasonCode: "STAFF_WARNING_OVERRIDDEN",
        reasonNotes: "Manager accepts overlap because another advisor is shadowing.",
        correlationId: "corr-staff-warning"
      },
      database,
      now
    );

    expect(result).toMatchObject({
      appointmentId: "appointment-1",
      staffUserId: "user-brock",
      staffName: "Brock Peterson",
      status: "OVERRIDDEN",
      warningCode: "STAFF_OVERLAP",
      appointmentVersion: 4
    });
    expect(createdHistory).toHaveLength(1);
  });

  it("records a manager override for a proposed-time warning on an unscheduled draft", async () => {
    const overlappingReservation = {
      id: "reservation-proposed-staff-overlap",
      appointmentId: "appointment-2",
      status: "COMMITTED",
      startsAt: localInstant("2026-07-06", 11),
      endsAt: localInstant("2026-07-06", 12),
      capacityUnits: 1,
      bufferBeforeMinutes: 0,
      bufferAfterMinutes: 0
    };
    const createdHistory: Array<{ data: Record<string, unknown> }> = [];
    const unscheduledAppointment = appointment({
      startsAt: null,
      endsAt: null
    });
    const database = {
      appointment: {
        async findUnique() {
          return unscheduledAppointment;
        },
        async updateMany() {
          return {
            count: 1
          };
        }
      },
      userLocationAccess: {
        async findUnique(input: { where: { userId_locationId: { userId: string } } }) {
          return access(input.where.userId_locationId.userId);
        }
      },
      schedulableResource: {
        async findFirst() {
          return staffResource({
            reservations: [overlappingReservation]
          });
        }
      },
      appointmentHistoryEvent: {
        async findFirst() {
          return null;
        },
        async create(input: { data: Record<string, unknown> }) {
          createdHistory.push(input);
        }
      },
      async $transaction(operation: (tx: unknown) => Promise<unknown>) {
        return operation(this);
      }
    };

    const result = await overrideAppointmentStaffWarning(
      managerUser,
      "appointment-1",
      {
        expectedAppointmentVersion: 3,
        reasonCode: "STAFF_WARNING_OVERRIDDEN",
        reasonNotes: "Manager accepts proposed-slot staff overlap.",
        correlationId: "corr-proposed-staff-warning",
        proposedStartsAt: localInstant("2026-07-06", 11),
        proposedEndsAt: localInstant("2026-07-06", 12),
        proposedSchedulingTimezone: timezone
      },
      database,
      now
    );

    expect(result).toMatchObject({
      appointmentId: "appointment-1",
      staffUserId: "user-brock",
      status: "OVERRIDDEN",
      warningCode: "STAFF_OVERLAP",
      appointmentVersion: 4
    });
    expect(createdHistory).toHaveLength(1);
    expect(createdHistory[0].data).toMatchObject({
      metadata: expect.objectContaining({
        warningKey: result.warningKey,
        proposedStartsAt: localInstant("2026-07-06", 11).toISOString(),
        proposedEndsAt: localInstant("2026-07-06", 12).toISOString(),
        proposedSchedulingTimezone: timezone
      })
    });
  });

  it("records a manager override for a warning-level internal participant staff conflict", async () => {
    const overlappingReservation = {
      id: "reservation-participant-overlap",
      appointmentId: "appointment-2",
      status: "COMMITTED",
      startsAt: localInstant("2026-07-06", 10),
      endsAt: localInstant("2026-07-06", 11),
      capacityUnits: 1,
      bufferBeforeMinutes: 0,
      bufferAfterMinutes: 0
    };
    const createdHistory: Array<{ data: Record<string, unknown> }> = [];
    const participantAppointment = appointment({
      participants: [
        {
          id: "participant-rayana",
          roleCode: "OFFICE_ADMIN",
          userId: "user-rayana",
          displayNameSnapshot: "Rayana Hassan",
          isRequired: true,
          isPrimary: false,
          attendanceRequired: true,
          user: {
            id: "user-rayana",
            name: "Rayana Hassan",
            isActive: true
          }
        }
      ]
    });
    const database = {
      appointment: {
        async findUnique() {
          return participantAppointment;
        },
        async updateMany() {
          return {
            count: 1
          };
        }
      },
      userLocationAccess: {
        async findUnique(input: { where: { userId_locationId: { userId: string } } }) {
          return access(input.where.userId_locationId.userId);
        }
      },
      schedulableResource: {
        async findFirst(input: { where: { userId: string } }) {
          if (input.where.userId === "user-rayana") {
            return staffResource({
              id: "resource-staff-rayana",
              userId: "user-rayana",
              name: "Rayana Hassan",
              reservations: [overlappingReservation]
            });
          }

          return staffResource();
        }
      },
      appointmentHistoryEvent: {
        async findFirst() {
          return null;
        },
        async create(input: { data: Record<string, unknown> }) {
          createdHistory.push(input);
        }
      },
      async $transaction(operation: (tx: unknown) => Promise<unknown>) {
        return operation(this);
      }
    };

    const result = await overrideAppointmentStaffWarning(
      managerUser,
      "appointment-1",
      {
        expectedAppointmentVersion: 3,
        reasonCode: "STAFF_WARNING_OVERRIDDEN",
        reasonNotes: "Manager accepts office admin overlap for DMV handoff.",
        correlationId: "corr-participant-staff-warning"
      },
      database,
      now
    );

    expect(result).toMatchObject({
      appointmentId: "appointment-1",
      staffUserId: "user-rayana",
      staffName: "Rayana Hassan",
      staffRole: "PARTICIPANT",
      staffRoleCode: "OFFICE_ADMIN",
      resourceId: "resource-staff-rayana",
      status: "OVERRIDDEN",
      warningCode: "STAFF_OVERLAP",
      appointmentVersion: 4
    });
    expect(createdHistory).toHaveLength(1);
    expect(createdHistory[0].data).toMatchObject({
      eventType: "WARNING_OVERRIDDEN",
      metadata: expect.objectContaining({
        staffUserId: "user-rayana",
        staffRole: "PARTICIPANT",
        staffRoleCode: "OFFICE_ADMIN"
      })
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
