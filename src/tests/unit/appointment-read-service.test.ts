import { describe, expect, it } from "vitest";

import type { AuthenticatedUser } from "@/server/auth/store";
import type {
  AppointmentReadAppointmentRecord,
  AppointmentReadLocationAccessRecord,
  AppointmentReadRepository
} from "@/server/repositories/appointment-read-repository";
import {
  getAppointmentReadModelById,
  listAppointmentReadModels
} from "@/server/services/appointment-read-service";

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

const appointmentAdminUser: AuthenticatedUser = {
  id: "user-appointment-admin",
  name: "Appointment Admin",
  email: "appointment-admin@local.test",
  isActive: true,
  roles: ["Appointment Administrator"],
  duties: {
    direct: [],
    roleDefaults: [],
    all: []
  }
};

function createAccess(input: {
  userId: string;
  locationId?: string;
  canOwnAppointments?: boolean;
  canManageAppointments?: boolean;
  canViewLimitedData?: boolean;
  canParticipate?: boolean;
  canViewSchedule?: boolean;
}): AppointmentReadLocationAccessRecord {
  return {
    userId: input.userId,
    locationId: input.locationId ?? "loc-time-motor-sales-minneapolis",
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
    outcomeNotes: null,
    followUpDispositionCode: null,
    followUpNotes: null,
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
        linkCode: "INTAKE_AND_INSPECTION",
        title: "Intake & Inspection",
        explanation: "Complete intake before service begins.",
        isRequired: true,
        blocksAppointment: true,
        blocksTask: false,
        createdAt: new Date("2026-07-05T18:05:00.000Z"),
        task: {
          id: "task-intake",
          title: "Inspect vehicle intake",
          status: "IN_PROGRESS",
          dueAt: new Date("2026-07-06T14:45:00.000Z"),
          assignedUser: {
            id: ownerUser.id,
            name: ownerUser.name,
            email: ownerUser.email
          }
        }
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
    automationExecutions: [],
    ...overrides
  };
}

function createAppointmentReadRepositoryHarness(input?: {
  appointments?: AppointmentReadAppointmentRecord[];
  accessByUserId?: Record<string, AppointmentReadLocationAccessRecord | null>;
  leakCrossLocationAppointments?: boolean;
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
    }),
    [appointmentAdminUser.id]: createAccess({
      userId: appointmentAdminUser.id,
      canParticipate: false,
      canViewLimitedData: false
    })
  };

  const repository: AppointmentReadRepository = {
    async findActiveLocationAccess(userId, locationId) {
      const access = accessByUserId[userId];

      return access?.locationId === locationId ? access : null;
    },

    async findAppointmentById(appointmentId) {
      return appointments.find((appointment) => appointment.id === appointmentId) ?? null;
    },

    async listAppointmentsForLocationWindow(query) {
      return appointments.filter((appointment) => {
        const startsAt = appointment.startsAt?.getTime();
        const endsAt = appointment.endsAt?.getTime();

        if (!input?.leakCrossLocationAppointments && appointment.locationId !== query.locationId) {
          return false;
        }

        if (!query.includeCancelled && appointment.bookingStatus === "CANCELLED") {
          return false;
        }

        if (
          !startsAt &&
          !endsAt &&
          (appointment.bookingStatus === "DRAFT" ||
            appointment.bookingStatus === "PENDING_APPROVAL")
        ) {
          return true;
        }

        if (!startsAt || !endsAt) {
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
      },
      taskLinks: [
        {
          taskId: "task-intake",
          taskTitle: "Inspect vehicle intake",
          taskStatus: "IN_PROGRESS",
          taskDueAt: "2026-07-06T14:45:00.000Z",
          assignedUser: {
            id: ownerUser.id,
            name: ownerUser.name
          },
          linkCode: "INTAKE_AND_INSPECTION",
          linkTitle: "Intake & Inspection",
          explanation: "Complete intake before service begins.",
          isRequired: true,
          blocksAppointment: true,
          appointmentRequiredForTask: false
        }
      ]
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

  it("keeps board search scoped to authorized location even if upstream data includes another location", async () => {
    const localAppointment = createAppointment({
      appointmentNumber: "APT-MPLS-10245",
      title: "Service / Repair"
    });
    const otherLocationAppointment = createAppointment({
      id: "appointment-duluth",
      appointmentNumber: "APT-DULUTH-9001",
      locationId: "loc-time-motor-sales-duluth",
      title: "Duluth leaked search result",
      customerSnapshot: {
        displayName: "Duluth Customer"
      },
      startsAt: new Date("2026-07-06T15:30:00.000Z"),
      endsAt: new Date("2026-07-06T16:30:00.000Z")
    });
    const repository = createAppointmentReadRepositoryHarness({
      appointments: [localAppointment, otherLocationAppointment],
      leakCrossLocationAppointments: true
    });

    const result = await listAppointmentReadModels(
      managerUser,
      {
        locationId: "loc-time-motor-sales-minneapolis",
        windowStart,
        windowEnd,
        searchText: "Duluth"
      },
      repository,
      now
    );

    expect(result).toMatchObject({
      locationId: "loc-time-motor-sales-minneapolis",
      appointmentCount: 0,
      appointments: []
    });
  });

  it("searches only fields visible through the actor's projected read model", async () => {
    const repository = createAppointmentReadRepositoryHarness();

    const managerVinResult = await listAppointmentReadModels(
      managerUser,
      {
        locationId: "loc-time-motor-sales-minneapolis",
        windowStart,
        windowEnd,
        searchText: "1FAHP2E82EG123456"
      },
      repository,
      now
    );
    const viewerVinResult = await listAppointmentReadModels(
      viewerUser,
      {
        locationId: "loc-time-motor-sales-minneapolis",
        windowStart,
        windowEnd,
        searchText: "1FAHP2E82EG123456"
      },
      repository,
      now
    );
    const viewerTitleResult = await listAppointmentReadModels(
      viewerUser,
      {
        locationId: "loc-time-motor-sales-minneapolis",
        windowStart,
        windowEnd,
        searchText: "Service"
      },
      repository,
      now
    );

    expect(managerVinResult.appointments).toHaveLength(1);
    expect(viewerVinResult.appointments).toHaveLength(0);
    expect(viewerTitleResult.appointments).toHaveLength(1);
    expect(viewerTitleResult.appointments[0]).toMatchObject({
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
        relationship: "LOCATION_VIEWER",
        dataAccessLevel: "SCHEDULE_SUMMARY"
      }
    });
  });

  it("includes unscheduled draft appointments so generated follow-up drafts remain selectable", async () => {
    const scheduled = createAppointment();
    const generatedDraft = createAppointment({
      id: "appointment-follow-up-draft",
      appointmentNumber: "FUP-APT-10245-MOCK",
      bookingStatus: "DRAFT",
      startsAt: null,
      endsAt: null,
      sourceType: "AUTOMATION",
      sourceReference: scheduled.id,
      title: "Follow-up: Service / Repair"
    });
    const unscheduledCompleted = createAppointment({
      id: "appointment-completed-unscheduled",
      appointmentNumber: "APT-COMPLETED-UNSCHEDULED",
      bookingStatus: "COMPLETED",
      startsAt: null,
      endsAt: null
    });
    const repository = createAppointmentReadRepositoryHarness({
      appointments: [scheduled, generatedDraft, unscheduledCompleted]
    });

    const result = await listAppointmentReadModels(
      managerUser,
      {
        locationId: "loc-time-motor-sales-minneapolis",
        windowStart,
        windowEnd
      },
      repository,
      now
    );

    expect(result.appointments.map((appointment) => appointment.appointmentNumber)).toEqual([
      "APT-10245",
      "FUP-APT-10245-MOCK"
    ]);
    expect(result.appointments[1]).toMatchObject({
      appointmentNumber: "FUP-APT-10245-MOCK",
      startsAt: null,
      endsAt: null,
      bookingStatus: "DRAFT",
      sourceReference: scheduled.id
    });
  });

  it("returns recent automation execution summaries for live board visibility", async () => {
    const appointment = createAppointment({
      automationExecutions: [
        {
          id: "execution-review",
          automationRuleId: "rule-follow-up",
          triggerCode: "APPOINTMENT_OUTCOME_RECORDED",
          purposeCode: "FOLLOW_UP_APPOINTMENT",
          status: "REVIEW_REQUIRED",
          sourceType: "APPOINTMENT",
          sourceReference: "appointment-1",
          inputSnapshot: {
            automationRuleCode: "APPOINTMENT_OUTCOME_FOLLOW_UP_APPOINTMENT",
            automationRuleVersion: 3,
            catalogVersionId: "catalog-version-1"
          },
          resultSnapshot: {
            automationRuleCode: "APPOINTMENT_OUTCOME_FOLLOW_UP_APPOINTMENT",
            automationRuleVersion: 3,
            catalogVersionId: "catalog-version-1",
            generatedAppointmentNumber: "FUP-APT-10245-001"
          },
          failureCode: null,
          failureMessage: null,
          attemptCount: 1,
          maxAttempts: 3,
          nextRetryAt: null,
          resolvedAt: null,
          createdAt: new Date("2026-07-06T16:05:00.000Z"),
          updatedAt: new Date("2026-07-06T16:10:00.000Z")
        },
        {
          id: "execution-failure",
          automationRuleId: "rule-task",
          triggerCode: "APPOINTMENT_OUTCOME_RECORDED",
          purposeCode: "FOLLOW_UP_TASK",
          status: "FAILED_RETRYABLE",
          sourceType: "APPOINTMENT",
          sourceReference: "appointment-1",
          inputSnapshot: {
            automationRuleCode: "APPOINTMENT_OUTCOME_FOLLOW_UP_TASK"
          },
          resultSnapshot: {
            automationRuleCode: "APPOINTMENT_OUTCOME_FOLLOW_UP_TASK"
          },
          failureCode: "TRANSIENT_FAILURE",
          failureMessage: "Task service timed out.",
          attemptCount: 2,
          maxAttempts: 3,
          nextRetryAt: new Date("2026-07-06T16:30:00.000Z"),
          resolvedAt: null,
          createdAt: new Date("2026-07-06T15:45:00.000Z"),
          updatedAt: new Date("2026-07-06T16:12:00.000Z")
        }
      ]
    });

    const result = await listAppointmentReadModels(
      managerUser,
      {
        locationId: "loc-time-motor-sales-minneapolis",
        windowStart,
        windowEnd
      },
      createAppointmentReadRepositoryHarness({
        appointments: [appointment]
      }),
      now
    );

    expect(result.appointments[0].automationExecutions).toEqual([
      expect.objectContaining({
        id: "execution-review",
        automationRuleCode: "APPOINTMENT_OUTCOME_FOLLOW_UP_APPOINTMENT",
        automationRuleVersion: 3,
        catalogVersionId: "catalog-version-1",
        status: "REVIEW_REQUIRED",
        generatedAppointmentNumber: "FUP-APT-10245-001"
      }),
      expect.objectContaining({
        id: "execution-failure",
        automationRuleCode: "APPOINTMENT_OUTCOME_FOLLOW_UP_TASK",
        status: "FAILED_RETRYABLE",
        failureCode: "TRANSIENT_FAILURE",
        failureMessage: "Task service timed out."
      })
    ]);
  });

  it("shows task-sourced automation history on generated automated appointments", async () => {
    const automatedDraft = createAppointment({
      id: "appointment-auto-1",
      appointmentNumber: "APT-TASK-AUTO-001",
      bookingStatus: "DRAFT",
      startsAt: null,
      endsAt: null,
      sourceType: "AUTOMATION",
      sourceReference: "task-1",
      title: "Blocked task review: Call lender and verify packet",
      automationExecutions: [
        {
          id: "execution-task-auto-1",
          automationRuleId: "rule-blocked-task-review",
          triggerCode: "BLOCKED_TASK_REVIEW",
          purposeCode: "APT-TASK-MEETING",
          status: "SUCCEEDED",
          sourceType: "TASK",
          sourceReference: "task-1",
          inputSnapshot: {
            automationRuleCode: "RULE-BLOCKED-TASK-REVIEW",
            automationRuleVersion: 2,
            catalogVersionId: "catalog-version-2",
            sourceTaskId: "task-1",
            sourceTaskTitle: "Call lender and verify packet"
          },
          resultSnapshot: {
            automationRuleCode: "RULE-BLOCKED-TASK-REVIEW",
            automationRuleVersion: 2,
            catalogVersionId: "catalog-version-2",
            sourceTaskId: "task-1",
            sourceTaskTitle: "Call lender and verify packet",
            generatedAppointmentNumber: "APT-TASK-AUTO-001",
            retryReplayAction: "REPLAY",
            replayedAt: "2026-07-06T16:15:00.000Z"
          },
          failureCode: null,
          failureMessage: null,
          attemptCount: 1,
          maxAttempts: 3,
          nextRetryAt: null,
          resolvedAt: null,
          createdAt: new Date("2026-07-06T16:05:00.000Z"),
          updatedAt: new Date("2026-07-06T16:10:00.000Z")
        }
      ]
    });

    const result = await listAppointmentReadModels(
      managerUser,
      {
        locationId: "loc-time-motor-sales-minneapolis",
        windowStart,
        windowEnd
      },
      createAppointmentReadRepositoryHarness({
        appointments: [automatedDraft]
      }),
      now
    );

    expect(result.appointments[0]).toMatchObject({
      appointmentNumber: "APT-TASK-AUTO-001",
      sourceType: "AUTOMATION",
      sourceReference: "task-1",
      automationExecutions: [
        {
          automationRuleCode: "RULE-BLOCKED-TASK-REVIEW",
          automationRuleVersion: 2,
          catalogVersionId: "catalog-version-2",
          sourceType: "TASK",
          sourceTaskId: "task-1",
          sourceTaskTitle: "Call lender and verify packet",
          generatedAppointmentNumber: "APT-TASK-AUTO-001",
          retryReplayAction: "REPLAY",
          replayedAt: "2026-07-06T16:15:00.000Z",
          status: "SUCCEEDED"
        }
      ]
    });
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

  it("returns direct appointment detail through the same masked read projection", async () => {
    const repository = createAppointmentReadRepositoryHarness();

    const managerDetail = await getAppointmentReadModelById(
      managerUser,
      "appointment-1",
      repository,
      now
    );
    const participantDetail = await getAppointmentReadModelById(
      participantUser,
      "appointment-1",
      repository,
      now
    );
    const viewerDetail = await getAppointmentReadModelById(
      viewerUser,
      "appointment-1",
      repository,
      now
    );

    expect(managerDetail).toMatchObject({
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
        canMutate: true
      }
    });
    expect(participantDetail).toMatchObject({
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
    expect(viewerDetail).toMatchObject({
      customer: {
        displayName: "Ahmed I.",
        phoneNumber: null,
        email: null
      },
      visibility: {
        relationship: "LOCATION_VIEWER",
        dataAccessLevel: "SCHEDULE_SUMMARY",
        canMutate: false
      }
    });
  });

  it("does not grant direct detail access from appointment-admin identity alone", async () => {
    const repository = createAppointmentReadRepositoryHarness({
      accessByUserId: {
        [appointmentAdminUser.id]: null
      }
    });

    await expect(
      getAppointmentReadModelById(appointmentAdminUser, "appointment-1", repository, now)
    ).rejects.toThrow("Appointment detail is not available.");
  });

  it("uses the same safe direct-detail denial for missing appointments and inactive access", async () => {
    await expect(
      getAppointmentReadModelById(
        managerUser,
        "missing-appointment",
        createAppointmentReadRepositoryHarness(),
        now
      )
    ).rejects.toThrow("Appointment detail is not available.");

    await expect(
      getAppointmentReadModelById(
        viewerUser,
        "appointment-1",
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
    ).rejects.toThrow("Appointment detail is not available.");
  });
});
