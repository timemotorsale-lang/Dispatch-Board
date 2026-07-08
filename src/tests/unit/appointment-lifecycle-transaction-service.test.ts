import { describe, expect, it } from "vitest";

import type { AuthenticatedUser } from "@/server/auth/store";
import {
  planAppointmentLifecycleCommandExecution,
  type AppointmentLifecycleCommandAppointment
} from "@/server/appointments/appointment-lifecycle-command-service";
import {
  executeAppointmentLifecycleCommandPlan,
  type AppointmentLifecycleCommandLedgerCompletion,
  type AppointmentLifecyclePersistedAppointment,
  type AppointmentLifecyclePersistedHistoryEvent,
  type AppointmentLifecyclePersistedTask,
  type AppointmentLifecyclePersistedTaskLink,
  type AppointmentLifecycleTransaction,
  type AppointmentLifecycleTransactionRepository
} from "@/server/appointments/appointment-lifecycle-transaction-service";
import type { AppointmentHardConflict } from "@/server/appointments/appointment-hard-conflict-service";
import type {
  AppointmentCommittedResourceReservation,
  AppointmentReservationCommitCandidate,
  AppointmentReservationReleaseRecord
} from "@/server/appointments/appointment-reservation-commit-service";
import type { AppointmentLocationAccessGrant } from "@/server/policies/access";

const now = new Date("2026-07-06T15:00:00.000Z");
const startsAt = new Date("2026-07-06T16:00:00.000Z");
const endsAt = new Date("2026-07-06T17:00:00.000Z");

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

const managerAccess: AppointmentLocationAccessGrant = {
  canViewSchedule: true,
  canParticipate: true,
  canOwnAppointments: true,
  canManageAppointments: true,
  canViewLimitedData: true
};

const appointment: AppointmentLifecycleCommandAppointment = {
  id: "appointment-1",
  appointmentNumber: "APT-10245",
  organizationId: "org-time-motor-sales",
  locationId: "loc-time-motor-sales-minneapolis",
  ownerUserId: managerUser.id,
  title: "Service / Repair",
  schedulingTimezone: "America/Chicago",
  startsAt: new Date("2026-07-06T15:00:00.000Z"),
  endsAt: new Date("2026-07-06T16:00:00.000Z"),
  bookingStatus: "SCHEDULED",
  version: 3
};

const reservationCandidate: AppointmentReservationCommitCandidate = {
  appointmentId: appointment.id,
  appointmentLocationId: appointment.locationId,
  requirementCode: "SERVICE_BAY",
  resource: {
    id: "resource-bay-1",
    name: "Service Bay 1",
    status: "ACTIVE",
    capacityMode: "EXCLUSIVE",
    capacity: 1,
    conflictPolicy: "HARD_BLOCK",
    effectiveFrom: new Date("2026-01-01T00:00:00.000Z"),
    effectiveTo: null
  },
  resourceLocationId: appointment.locationId,
  operatingWindows: [],
  unavailability: [],
  startsAt,
  endsAt,
  capacityUnits: 1
};

const hardConflict: AppointmentHardConflict = {
  code: "LOCATION_UNAVAILABLE",
  source: "LOCATION",
  message: "Location is closed for the requested slot."
};

function baseCommand(overrides = {}) {
  return {
    commandId: "cmd-1",
    commandType: "SCHEDULE" as const,
    actor: managerUser,
    locationAccess: managerAccess,
    appointment,
    organizationId: appointment.organizationId,
    locationId: appointment.locationId,
    expectedAppointmentVersion: appointment.version,
    correlationId: "corr-1",
    now,
    ...overrides
  };
}

function createRepositoryHarness(options?: { failHistory?: boolean }) {
  const appointments: AppointmentLifecyclePersistedAppointment[] = [];
  const committedReservations: AppointmentCommittedResourceReservation[] = [];
  const releasedReservations: AppointmentReservationReleaseRecord[] = [];
  const createdTasks: AppointmentLifecyclePersistedTask[] = [];
  const createdTaskLinks: AppointmentLifecyclePersistedTaskLink[] = [];
  const removedTaskLinks: AppointmentLifecyclePersistedTaskLink[] = [];
  const historyEvents: AppointmentLifecyclePersistedHistoryEvent[] = [];
  const activityEvents: Array<{
    boardDayId: string;
    actorUserId: string | null;
    taskId: string;
    eventType: string;
    message: string;
    metadata: Record<string, unknown>;
  }> = [];
  const commandCompletions: AppointmentLifecycleCommandLedgerCompletion[] = [];

  function snapshot() {
    return {
      appointments: [...appointments],
      committedReservations: [...committedReservations],
      releasedReservations: [...releasedReservations],
      createdTasks: [...createdTasks],
      createdTaskLinks: [...createdTaskLinks],
      removedTaskLinks: [...removedTaskLinks],
      historyEvents: [...historyEvents],
      activityEvents: [...activityEvents],
      commandCompletions: [...commandCompletions]
    };
  }

  function restore(state: ReturnType<typeof snapshot>) {
    appointments.splice(0, appointments.length, ...state.appointments);
    committedReservations.splice(0, committedReservations.length, ...state.committedReservations);
    releasedReservations.splice(0, releasedReservations.length, ...state.releasedReservations);
    createdTasks.splice(0, createdTasks.length, ...state.createdTasks);
    createdTaskLinks.splice(0, createdTaskLinks.length, ...state.createdTaskLinks);
    removedTaskLinks.splice(0, removedTaskLinks.length, ...state.removedTaskLinks);
    historyEvents.splice(0, historyEvents.length, ...state.historyEvents);
    activityEvents.splice(0, activityEvents.length, ...state.activityEvents);
    commandCompletions.splice(0, commandCompletions.length, ...state.commandCompletions);
  }

  const transaction: AppointmentLifecycleTransaction = {
    async createAppointment(effect) {
      const created = {
        id: "appointment-created-1",
        appointmentNumber: effect.values.appointmentNumber,
        version: 1
      };

      appointments.push(created);
      return created;
    },

    async updateAppointment(effect) {
      const updated = {
        id: effect.appointmentId,
        appointmentNumber: appointment.appointmentNumber,
        version: effect.expectedVersion + effect.incrementVersion
      };

      appointments.push(updated);
      return updated;
    },

    async commitReservations(effect) {
      const records = effect.candidates.map((candidate, index) => ({
        id: `reservation-${index + 1}`,
        appointmentId: candidate.appointmentId,
        requirementId: candidate.requirementId ?? null,
        resourceId: candidate.resource.id,
        status: "COMMITTED" as const,
        startsAt: candidate.startsAt,
        endsAt: candidate.endsAt,
        capacityUnits: candidate.capacityUnits ?? 1,
        bufferBeforeMinutes: candidate.bufferBeforeMinutes ?? 0,
        bufferAfterMinutes: candidate.bufferAfterMinutes ?? 0,
        createdAt: now,
        updatedAt: now
      }));

      committedReservations.push(...records);
      return records;
    },

    async releaseReservations(effect) {
      const records = effect.reservations.map((reservation) => ({
        ...reservation,
        status: "RELEASED" as const,
        releasedAt: now,
        releasedByUserId: effect.releasedByUserId,
        reasonCode: effect.reasonCode,
        reasonNotes: effect.reasonNotes
      }));

      releasedReservations.push(...records);
      return records;
    },

    async createTasks(effects) {
      const records = effects.map((effect, index) => ({
        id: `task-${index + 1}`,
        title: effect.title,
        boardDayId: `board-day-${index + 1}`
      }));

      createdTasks.push(...records);
      return records;
    },

    async createTaskLinks(input) {
      const records = input.links.map((link, index) => ({
        id: `link-${index + 1}`,
        appointmentId: input.appointmentId,
        taskId: link.taskId,
        linkCode: link.linkCode
      }));

      createdTaskLinks.push(...records);
      return records;
    },

    async removeTaskLinks(input) {
      const records = input.links.map((link, index) => ({
        id: `removed-link-${index + 1}`,
        appointmentId: input.appointmentId,
        taskId: link.taskId,
        linkCode: link.linkCode
      }));

      removedTaskLinks.push(...records);
      return records;
    },

    async createHistoryEvents(input) {
      if (options?.failHistory) {
        throw new Error("history write failed");
      }

      const records = input.events.map((event, index) => ({
        id: `history-${index + 1}`,
        appointmentId: input.appointmentId,
        eventType: event.eventType
      }));

      historyEvents.push(...records);
      return records;
    },

    async createActivityEvents(input) {
      activityEvents.push(...input.events);
    },

    async completeCommand(completion) {
      commandCompletions.push(completion);
      return completion;
    }
  };

  const repository: AppointmentLifecycleTransactionRepository = {
    async withLifecycleTransaction(operation) {
      const before = snapshot();

      try {
        return await operation(transaction);
      } catch (error) {
        restore(before);
        throw error;
      }
    }
  };

  return {
    appointments,
    commandCompletions,
    committedReservations,
    createdTasks,
    createdTaskLinks,
    historyEvents,
    activityEvents,
    releasedReservations,
    removedTaskLinks,
    repository
  };
}

describe("appointment lifecycle transaction execution", () => {
  it("executes appointment, reservation, task-link, history, and command completion effects together", async () => {
    const plan = planAppointmentLifecycleCommandExecution(
      baseCommand({
        commandType: "SCHEDULE",
        payload: {
          startsAt,
          endsAt,
          reservationCandidates: [reservationCandidate],
          taskLinks: [
            {
              action: "CREATE_LINK",
              taskId: "task-1",
              linkType: "PREPARATION",
              linkCode: "PREP_TASK",
              blocksAppointment: true,
              appointmentRequiredForTask: false
            }
          ]
        }
      })
    );
    const harness = createRepositoryHarness();
    const result = await executeAppointmentLifecycleCommandPlan({
      plan,
      repository: harness.repository,
      now
    });

    expect(result).toMatchObject({
      executed: true,
      commandStatus: "SUCCEEDED",
      appointment: {
        id: appointment.id,
        version: 4
      },
      committedReservationCount: 1,
      createdTaskLinkCount: 1,
      historyEventCount: 1
    });
    expect(harness.appointments).toHaveLength(1);
    expect(harness.committedReservations).toHaveLength(1);
    expect(harness.createdTaskLinks).toEqual([
      {
        id: "link-1",
        appointmentId: appointment.id,
        taskId: "task-1",
        linkCode: "PREP_TASK"
      }
    ]);
    expect(harness.historyEvents).toEqual([
      {
        id: "history-1",
        appointmentId: appointment.id,
        eventType: "SCHEDULED"
      }
    ]);
    expect(harness.commandCompletions).toEqual([
      expect.objectContaining({
        commandId: "cmd-1",
        status: "SUCCEEDED",
        appointmentId: appointment.id,
        completedAt: now,
        resultSnapshot: expect.objectContaining({
          appointmentId: appointment.id,
          committedReservationCount: 1,
          createdTaskLinkCount: 1,
          historyEventCount: 1
        })
      })
    ]);
  });

  it("creates schedule-time template blueprint tasks and links during execution", async () => {
    const plan = planAppointmentLifecycleCommandExecution(
      baseCommand({
        commandType: "SCHEDULE",
        appointment: {
          ...appointment,
          title: "Test Drive",
          startsAt: null,
          endsAt: null,
          bookingStatus: "DRAFT",
          confirmationStatus: "PENDING",
          purposeSnapshot: {
            purposeCode: "APT-TEST-DRIVE",
            version: 1
          },
          customerSnapshot: {
            displayName: "Ahmed Ibrahim"
          },
          vehicleSnapshot: {
            displayName: "2014 Ford Taurus"
          }
        },
        payload: {
          startsAt,
          endsAt
        }
      })
    );
    const harness = createRepositoryHarness();
    const result = await executeAppointmentLifecycleCommandPlan({
      plan,
      repository: harness.repository,
      now
    });

    expect(result).toMatchObject({
      executed: true,
      commandStatus: "SUCCEEDED",
      createdTaskCount: 2,
      createdTaskLinkCount: 2,
      historyEventCount: 2,
      resultSnapshot: expect.objectContaining({
        automatedTaskCount: 2,
        templateBlueprintTaskCount: 2,
        createdTaskCount: 2,
        createdTaskLinkCount: 2
      })
    });
    expect(harness.createdTasks).toEqual([
      {
        id: "task-1",
        title: "Vehicle availability and readiness",
        boardDayId: "board-day-1"
      },
      {
        id: "task-2",
        title: "Keys and route readiness",
        boardDayId: "board-day-2"
      }
    ]);
    expect(harness.createdTaskLinks).toEqual([
      {
        id: "link-1",
        appointmentId: appointment.id,
        taskId: "task-1",
        linkCode: "APT_TEST_DRIVE_1_ON_SCHEDULE_PREP_VEHICLE_READY"
      },
      {
        id: "link-2",
        appointmentId: appointment.id,
        taskId: "task-2",
        linkCode: "APT_TEST_DRIVE_1_ON_SCHEDULE_PREP_KEYS_ROUTE"
      }
    ]);
    expect(harness.activityEvents).toEqual([
      {
        boardDayId: "board-day-1",
        actorUserId: managerUser.id,
        taskId: "task-1",
        eventType: "task.appointment_linked_created",
        message: "Appointment APT-10245 generated linked task Vehicle availability and readiness.",
        metadata: {
          appointmentId: appointment.id,
          appointmentNumber: appointment.appointmentNumber,
          automationRuleCode:
            "APPOINTMENT_TEMPLATE_BLUEPRINT_APT_TEST_DRIVE_PREP_VEHICLE_READY",
          triggerCode: "APPOINTMENT_SCHEDULED",
          templateVersion: 1,
          templateBlueprintCode: "PREP-VEHICLE-READY",
          creationTiming: "ON_SCHEDULE",
          linkCode: "APT_TEST_DRIVE_1_ON_SCHEDULE_PREP_VEHICLE_READY",
          linkType: "PREPARATION",
          generatedTaskTitle: "Vehicle availability and readiness"
        }
      },
      {
        boardDayId: "board-day-2",
        actorUserId: managerUser.id,
        taskId: "task-2",
        eventType: "task.appointment_linked_created",
        message: "Appointment APT-10245 generated linked task Keys and route readiness.",
        metadata: {
          appointmentId: appointment.id,
          appointmentNumber: appointment.appointmentNumber,
          automationRuleCode:
            "APPOINTMENT_TEMPLATE_BLUEPRINT_APT_TEST_DRIVE_PREP_KEYS_ROUTE",
          triggerCode: "APPOINTMENT_SCHEDULED",
          templateVersion: 1,
          templateBlueprintCode: "PREP-KEYS-ROUTE",
          creationTiming: "ON_SCHEDULE",
          linkCode: "APT_TEST_DRIVE_1_ON_SCHEDULE_PREP_KEYS_ROUTE",
          linkType: "PREPARATION",
          generatedTaskTitle: "Keys and route readiness"
        }
      }
    ]);
    expect(harness.historyEvents.map((event) => event.eventType)).toEqual([
      "SCHEDULED",
      "TASK_LINKED"
    ]);
  });

  it("creates automated follow-up tasks and links during completion execution", async () => {
    const plan = planAppointmentLifecycleCommandExecution(
      baseCommand({
        commandType: "COMPLETE",
        appointment: {
          ...appointment,
          confirmationStatus: "CONFIRMED",
          attendanceStatus: "CHECKED_IN",
          executionStatus: "FINISHED"
        },
        payload: {
          outcomeCode: "FOLLOW_UP_REQUIRED",
          followUpDispositionCode: "CALLBACK_REQUIRED",
          followUpNotes: "Call customer with estimate.",
          customerReference: "Ahmed Ibrahim",
          vehicleReference: "2014 Ford Taurus",
          reasonCode: "OUTCOME_RECORDED",
          reasonNotes: "Callback required after inspection."
        }
      })
    );
    const harness = createRepositoryHarness();
    const result = await executeAppointmentLifecycleCommandPlan({
      plan,
      repository: harness.repository,
      now
    });

    expect(result).toMatchObject({
      executed: true,
      commandStatus: "SUCCEEDED",
      createdTaskCount: 1,
      createdTaskLinkCount: 1,
      historyEventCount: 3,
      resultSnapshot: expect.objectContaining({
        automatedTaskCount: 1,
        createdTaskCount: 1,
        createdTaskLinkCount: 1
      })
    });
    expect(harness.createdTasks).toEqual([
      {
        id: "task-1",
        title: "Callback required for appointment APT-10245",
        boardDayId: "board-day-1"
      }
    ]);
    expect(harness.createdTaskLinks).toEqual([
      {
        id: "link-1",
        appointmentId: appointment.id,
        taskId: "task-1",
        linkCode: "OUTCOME_CALLBACK_REQUIRED"
      }
    ]);
    expect(harness.activityEvents).toEqual([
      {
        boardDayId: "board-day-1",
        actorUserId: managerUser.id,
        taskId: "task-1",
        eventType: "task.appointment_follow_up_created",
        message:
          "Appointment APT-10245 generated follow-up task Callback required for appointment APT-10245.",
        metadata: {
          appointmentId: appointment.id,
          appointmentNumber: appointment.appointmentNumber,
          automationRuleCode: "APPOINTMENT_OUTCOME_FOLLOW_UP_TASK",
          triggerCode: "APPOINTMENT_OUTCOME_RECORDED",
          templateVersion: 1,
          templateBlueprintCode: null,
          creationTiming: "ON_OUTCOME",
          linkCode: "OUTCOME_CALLBACK_REQUIRED",
          linkType: "FOLLOW_UP",
          generatedTaskTitle: "Callback required for appointment APT-10245"
        }
      }
    ]);
    expect(harness.historyEvents.map((event) => event.eventType)).toEqual([
      "COMPLETED",
      "OUTCOME_RECORDED",
      "TASK_LINKED"
    ]);
  });

  it("creates automated draft follow-up appointments during completion execution", async () => {
    const plan = planAppointmentLifecycleCommandExecution(
      baseCommand({
        commandType: "COMPLETE",
        appointment: {
          ...appointment,
          confirmationStatus: "CONFIRMED",
          attendanceStatus: "CHECKED_IN",
          executionStatus: "FINISHED"
        },
        payload: {
          outcomeCode: "FOLLOW_UP_REQUIRED",
          followUpDispositionCode: "FOLLOW_UP_APPOINTMENT_REQUIRED",
          followUpNotes: "Schedule another inspection visit.",
          customerReference: "Ahmed Ibrahim",
          vehicleReference: "2014 Ford Taurus",
          reasonCode: "OUTCOME_RECORDED",
          reasonNotes: "Follow-up appointment required."
        }
      })
    );
    const harness = createRepositoryHarness();
    const result = await executeAppointmentLifecycleCommandPlan({
      plan,
      repository: harness.repository,
      now
    });

    expect(result).toMatchObject({
      executed: true,
      commandStatus: "SUCCEEDED",
      createdAppointmentCount: 1,
      createdTaskCount: 1,
      createdTaskLinkCount: 1,
      historyEventCount: 4,
      resultSnapshot: expect.objectContaining({
        automatedFollowUpAppointmentCount: 1,
        generatedFollowUpAppointmentNumbers: [expect.stringMatching(/^FUP-APT-10245-/)],
        createdAppointmentCount: 1,
        automatedTaskCount: 1
      })
    });
    expect(harness.appointments).toEqual([
      {
        id: appointment.id,
        appointmentNumber: appointment.appointmentNumber,
        version: 4
      },
      {
        id: "appointment-created-1",
        appointmentNumber: expect.stringMatching(/^FUP-APT-10245-/),
        version: 1
      }
    ]);
    expect(harness.historyEvents.map((event) => event.eventType)).toEqual([
      "COMPLETED",
      "OUTCOME_RECORDED",
      "TASK_LINKED",
      "AUTOMATION_EVALUATED"
    ]);
  });

  it("records rejected plans as failed command results without applying side effects", async () => {
    const plan = planAppointmentLifecycleCommandExecution(
      baseCommand({
        commandType: "SCHEDULE",
        payload: {
          startsAt,
          endsAt,
          hardConflicts: [hardConflict],
          reservationCandidates: [reservationCandidate]
        }
      })
    );
    const harness = createRepositoryHarness();
    const result = await executeAppointmentLifecycleCommandPlan({
      plan,
      repository: harness.repository,
      now
    });

    expect(result).toMatchObject({
      executed: false,
      commandStatus: "FAILED_TERMINAL",
      committedReservationCount: 0,
      historyEventCount: 0
    });
    expect(harness.appointments).toEqual([]);
    expect(harness.committedReservations).toEqual([]);
    expect(harness.historyEvents).toEqual([]);
    expect(harness.commandCompletions).toEqual([
      expect.objectContaining({
        commandId: "cmd-1",
        status: "FAILED_TERMINAL",
        errorCode: "HARD_CONFLICT",
        errorMessage: "Location is closed for the requested slot."
      })
    ]);
  });

  it("rolls back every planned effect when a later transaction step fails", async () => {
    const plan = planAppointmentLifecycleCommandExecution(
      baseCommand({
        commandType: "SCHEDULE",
        payload: {
          startsAt,
          endsAt,
          reservationCandidates: [reservationCandidate]
        }
      })
    );
    const harness = createRepositoryHarness({ failHistory: true });

    await expect(
      executeAppointmentLifecycleCommandPlan({
        plan,
        repository: harness.repository,
        now
      })
    ).rejects.toThrow("history write failed");

    expect(harness.appointments).toEqual([]);
    expect(harness.committedReservations).toEqual([]);
    expect(harness.historyEvents).toEqual([]);
    expect(harness.commandCompletions).toEqual([]);
  });
});
