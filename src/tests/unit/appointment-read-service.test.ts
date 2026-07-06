import { describe, expect, it } from "vitest";

import type { AuthenticatedUser } from "@/server/auth/store";
import type {
  AppointmentReadAppointmentRecord,
  AppointmentReadLocationAccessRecord,
  AppointmentReadRepository
} from "@/server/repositories/appointment-read-repository";
import { listAppointmentReadModels } from "@/server/services/appointment-read-service";

const now = new Date("2026-07-06T15:00:00.000Z");
const windowStart = new Date("2026-07-06T14:00:00.000Z");
const windowEnd = new Date("2026-07-07T00:00:00.000Z");

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

const ownerUser: AuthenticatedUser = {
  id: "user-owner",
  name: "Brock Peterson",
  email: "owner@local.test",
  isActive: true,
  roles: ["Service Advisor"],
  duties: {
    direct: [],
    roleDefaults: [],
    all: []
  }
};

const participantUser: AuthenticatedUser = {
  id: "user-participant",
  name: "Walter James",
  email: "participant@local.test",
  isActive: true,
  roles: ["Sales Manager"],
  duties: {
    direct: [],
    roleDefaults: [],
    all: []
  }
};

const viewerUser: AuthenticatedUser = {
  id: "user-viewer",
  name: "Rayana Hassan",
  email: "viewer@local.test",
  isActive: true,
  roles: ["Office / Admin"],
  duties: {
    direct: [],
    roleDefaults: [],
    all: []
  }
};

function createAccess(input: {
  userId: string;
  canOwnAppointments?: boolean;
  canManageAppointments?: boolean;
  canViewLimitedData?: boolean;
  canParticipate?: boolean;
  canViewSchedule?: boolean;
}): AppointmentReadLocationAccessRecord {
  return {
    userId: input.userId,
    locationId: "loc-time-motor-sales-minneapolis",
    canViewSchedule: input.canViewSchedule ?? true,
    canParticipate: input.canParticipate ?? true,
    canOwnAppointments: input.canOwnAppointments ?? false,
    canManageAppointments: input.canManageAppointments ?? false,
    canViewLimitedData: input.canViewLimitedData ?? true,
    validFrom: new Date("2026-01-01T00:00:00.000Z"),
    validTo: null
  };
}

function createAppointment(
  overrides: Partial<AppointmentReadAppointmentRecord> = {}
): AppointmentReadAppointmentRecord {
  return {
    id: "appointment-1",
    appointmentNumber: "APT-10245",
    organizationId: "org-time-motor-sales",
    locationId: "loc-time-motor-sales-minneapolis",
    ownerUserId: ownerUser.id,
    createdByUserId: managerUser.id,
    sourceType: "MANUAL",
    sourceReference: null,
    title: "Service / Repair",
    schedulingTimezone: "America/Chicago",
    startsAt: new Date("2026-07-06T15:00:00.000Z"),
    endsAt: new Date("2026-07-06T16:00:00.000Z"),
    bookingStatus: "SCHEDULED",
    confirmationStatus: "CONFIRMED",
    attendanceStatus: "EXPECTED",
    executionStatus: "NOT_STARTED",
    version: 3,
    purposeSnapshot: { purposeCode: "SERVICE_REPAIR" },
    customerSnapshot: null,
    vehicleSnapshot: null,
    sourceSnapshot: null,
    cancelledAt: null,
    completedAt: null,
    outcomeCode: null,
    followUpDispositionCode: null,
    createdAt: new Date("2026-07-05T18:00:00.000Z"),
    updatedAt: new Date("2026-07-05T18:10:00.000Z"),
    ownerUser: {
      id: ownerUser.id,
      name: ownerUser.name,
      email: ownerUser.email
    },
    participants: [
      {
        id: "participant-customer",
        participantType: "CUSTOMER",
        roleCode: "PRIMARY_CUSTOMER",
        userId: null,
        customerId: "customer-1",
        displayNameSnapshot: "Ahmed Ibrahim",
        contactSnapshot: {
          phoneNumber: "612-555-0147",
          email: "ahmed@example.test"
        },
        isRequired: true,
        isPrimary: true,
        attendanceRequired: true,
        user: null,
        customer: {
          id: "customer-1",
          customerNumber: "CUST-1001",
          displayName: "Ahmed Ibrahim",
          phoneNumber: "612-555-0147",
          email: "ahmed@example.test"
        }
      },
      {
        id: "participant-staff",
        participantType: "STAFF",
        roleCode: "SALES_MANAGER",
        userId: participantUser.id,
        customerId: null,
        displayNameSnapshot: participantUser.name,
        contactSnapshot: null,
        isRequired: false,
        isPrimary: false,
        attendanceRequired: false,
        user: {
          id: participantUser.id,
          name: participantUser.name,
          email: participantUser.email
        },
        customer: null
      }
    ],
    vehicles: [
      {
        id: "appointment-vehicle-1",
        vehicleId: "vehicle-1",
        roleCode: "SUBJECT_VEHICLE",
        vehicleSnapshot: null,
        isPrimary: true,
        isRequired: true,
        exclusiveReservationRequired: true,
        vehicle: {
          id: "vehicle-1",
          vehicleNumber: "VEH-2014-FORD-TAURUS",
          stockNumber: "TM-4587",
          year: 2014,
          make: "Ford",
          model: "Taurus",
          vin: "1FAHP2E82EG123456",
          licensePlate: "ABC-123"
        }
      }
    ],
    taskLinks: [
      {
        id: "link-1",
        taskId: "task-intake",
        linkType: "PREPARATION",
        blocksAppointment: true,
        appointmentRequiredForTask: false,
        createdAt: new Date("2026-07-05T18:05:00.000Z")
      }
    ],
    resourceReservations: [
      {
        id: "reservation-1",
        resourceId: "resource-bay-1",
        status: "COMMITTED",
        startsAt: new Date("2026-07-06T14:45:00.000Z"),
        endsAt: new Date("2026-07-06T16:15:00.000Z"),
        capacityUnits: 1,
        resource: {
          id: "resource-bay-1",
          code: "BAY-1",
          name: "Service Bay 1"
        }
      }
    ],
    ...overrides
  };
}

function createAppointmentReadRepositoryHarness(input?: {
  appointments?: AppointmentReadAppointmentRecord[];
  accessByUserId?: Record<string, AppointmentReadLocationAccessRecord | null>;
}) {
  const appointments = input?.appointments ?? [createAppointment()];
  const accessByUserId = input?.accessByUserId ?? {
    [managerUser.id]: createAccess({
      userId: managerUser.id,
      canOwnAppointments: true,
      canManageAppointments: true,
      canViewLimitedData: true
    }),
    [ownerUser.id]: createAccess({
      userId: ownerUser.id,
      canOwnAppointments: true,
      canViewLimitedData: true
    }),
    [participantUser.id]: createAccess({
      userId: participantUser.id,
      canOwnAppointments: true,
      canViewLimitedData: true
    }),
    [viewerUser.id]: createAccess({
      userId: viewerUser.id,
      canParticipate: false,
      canViewLimitedData: false
    })
  };

  const repository: AppointmentReadRepository = {
    async findActiveLocationAccess(userId, locationId) {
      const access = accessByUserId[userId];

      return access?.locationId === locationId ? access : null;
    },

    async listAppointmentsForLocationWindow(query) {
      return appointments.filter((appointment) => {
        const startsAt = appointment.startsAt?.getTime();
        const endsAt = appointment.endsAt?.getTime();

        if (!startsAt || !endsAt || appointment.locationId !== query.locationId) {
          return false;
        }

        if (!query.includeCancelled && appointment.bookingStatus === "CANCELLED") {
          return false;
        }

        return startsAt < query.windowEnd.getTime() && endsAt > query.windowStart.getTime();
      });
    }
  };

  return repository;
}

describe("appointment read service", () => {
  it("returns operational detail and mutation authority for a location manager", async () => {
    const result = await listAppointmentReadModels(
      managerUser,
      {
        locationId: "loc-time-motor-sales-minneapolis",
        windowStart,
        windowEnd
      },
      createAppointmentReadRepositoryHarness(),
      now
    );

    expect(result.appointmentCount).toBe(1);
    expect(result.appointments[0]).toMatchObject({
      appointmentNumber: "APT-10245",
      customer: {
        displayName: "Ahmed Ibrahim",
        phoneNumber: "612-555-0147",
        email: "ahmed@example.test"
      },
      vehicles: [
        expect.objectContaining({
          vin: "1FAHP2E82EG123456",
          licensePlate: "ABC-123"
        })
      ],
      visibility: {
        relationship: "MANAGER",
        dataAccessLevel: "LIMITED_DETAIL",
        canMutate: true,
        canViewSensitiveContact: true
      }
    });
  });

  it("allows an appointment owner to see limited detail and mutate only their own appointment", async () => {
    const result = await listAppointmentReadModels(
      ownerUser,
      {
        locationId: "loc-time-motor-sales-minneapolis",
        windowStart,
        windowEnd
      },
      createAppointmentReadRepositoryHarness(),
      now
    );

    expect(result.appointments[0]).toMatchObject({
      visibility: {
        relationship: "OWNER",
        dataAccessLevel: "LIMITED_DETAIL",
        canMutate: true
      },
      customer: {
        phoneNumber: "612-555-0147"
      }
    });
  });

  it("keeps participant and location-viewer records visible but masks sensitive fields", async () => {
    const participantResult = await listAppointmentReadModels(
      participantUser,
      {
        locationId: "loc-time-motor-sales-minneapolis",
        windowStart,
        windowEnd
      },
      createAppointmentReadRepositoryHarness(),
      now
    );
    const viewerResult = await listAppointmentReadModels(
      viewerUser,
      {
        locationId: "loc-time-motor-sales-minneapolis",
        windowStart,
        windowEnd
      },
      createAppointmentReadRepositoryHarness(),
      now
    );

    expect(participantResult.appointments[0]).toMatchObject({
      customer: {
        displayName: "Ahmed I.",
        phoneNumber: null,
        email: null
      },
      vehicles: [
        expect.objectContaining({
          vin: null,
          licensePlate: null
        })
      ],
      visibility: {
        relationship: "PARTICIPANT",
        dataAccessLevel: "SCHEDULE_SUMMARY",
        canMutate: false
      }
    });
    expect(viewerResult.appointments[0].visibility).toMatchObject({
      relationship: "LOCATION_VIEWER",
      dataAccessLevel: "SCHEDULE_SUMMARY",
      canMutate: false
    });
  });

  it("filters cancelled and out-of-window appointments unless explicitly requested", async () => {
    const scheduled = createAppointment();
    const cancelled = createAppointment({
      id: "appointment-cancelled",
      appointmentNumber: "APT-CANCELLED",
      bookingStatus: "CANCELLED",
      cancelledAt: new Date("2026-07-05T20:00:00.000Z")
    });
    const outsideWindow = createAppointment({
      id: "appointment-later",
      appointmentNumber: "APT-LATER",
      startsAt: new Date("2026-07-07T15:00:00.000Z"),
      endsAt: new Date("2026-07-07T16:00:00.000Z")
    });
    const repository = createAppointmentReadRepositoryHarness({
      appointments: [scheduled, cancelled, outsideWindow]
    });

    const defaultResult = await listAppointmentReadModels(
      managerUser,
      {
        locationId: "loc-time-motor-sales-minneapolis",
        windowStart,
        windowEnd
      },
      repository,
      now
    );
    const includeCancelledResult = await listAppointmentReadModels(
      managerUser,
      {
        locationId: "loc-time-motor-sales-minneapolis",
        windowStart,
        windowEnd,
        includeCancelled: true
      },
      repository,
      now
    );

    expect(defaultResult.appointments.map((appointment) => appointment.appointmentNumber)).toEqual([
      "APT-10245"
    ]);
    expect(
      includeCancelledResult.appointments.map((appointment) => appointment.appointmentNumber)
    ).toEqual(["APT-10245", "APT-CANCELLED"]);
  });

  it("rejects unauthenticated users and users without active schedule access", async () => {
    await expect(
      listAppointmentReadModels(
        null,
        {
          locationId: "loc-time-motor-sales-minneapolis",
          windowStart,
          windowEnd
        },
        createAppointmentReadRepositoryHarness(),
        now
      )
    ).rejects.toThrow("Authentication required.");

    await expect(
      listAppointmentReadModels(
        viewerUser,
        {
          locationId: "loc-time-motor-sales-minneapolis",
          windowStart,
          windowEnd
        },
        createAppointmentReadRepositoryHarness({
          accessByUserId: {
            [viewerUser.id]: createAccess({
              userId: viewerUser.id,
              canViewSchedule: false
            })
          }
        }),
        now
      )
    ).rejects.toThrow("Appointment schedule is not authorized.");
  });
});
