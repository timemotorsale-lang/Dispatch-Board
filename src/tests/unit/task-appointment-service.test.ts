import { describe, expect, it, vi } from "vitest";

import type { AuthenticatedUser } from "@/server/auth/store";
import {
  INITIAL_MINNEAPOLIS_LOCATION,
  INITIAL_ORGANIZATION
} from "@/server/appointments/location-foundation";
import type { AppointmentCommandExecutionResult } from "@/server/services/appointment-command-execution-service";
import { createAppointmentDraftFromTask } from "@/server/services/task-appointment-service";
import type { TaskReadModel } from "@/server/services/task-read";

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

const assignedUser: AuthenticatedUser = {
  id: "user-brock",
  name: "Brock Peterson",
  email: "brock@local.test",
  isActive: true,
  roles: ["Service Advisor"],
  duties: {
    direct: [],
    roleDefaults: [],
    all: []
  }
};

const otherUser: AuthenticatedUser = {
  ...assignedUser,
  id: "user-other",
  name: "Other Staff",
  email: "other@local.test"
};

function createTask(overrides: Partial<TaskReadModel> = {}): TaskReadModel {
  return {
    id: "task-1",
    boardDayId: "board-day-1",
    boardDate: "2026-07-06",
    title: "Review brake estimate with customer",
    description: "Customer needs a call and appointment before approval.",
    status: "IN_PROGRESS",
    dueAt: "2026-07-06T21:00:00.000Z",
    workflowArea: "SHOP",
    sourceType: "MANAGER",
    requiresManagerApproval: false,
    requiredUpdateFields: [],
    updateFieldValues: {},
    templateChecklistItems: [],
    completionCriteria: null,
    approvalRules: null,
    intelligenceSignalType: null,
    vehicleReference: "2014 Ford Taurus",
    customerReference: "Abdi Hussein",
    blockerReason: null,
    readyForReviewAt: null,
    completedAt: null,
    createdAt: "2026-07-06T14:00:00.000Z",
    updatedAt: "2026-07-06T14:30:00.000Z",
    assignedUser: {
      id: assignedUser.id,
      name: assignedUser.name,
      email: assignedUser.email
    },
    recommendedUser: null,
    recommendation: null,
    createdByUser: null,
    reviewedByUser: null,
    checklistItems: [],
    activityHistory: [],
    appointmentLinks: [],
    comments: [],
    ...overrides
  };
}

function createCommandResult(): AppointmentCommandExecutionResult {
  return {
    accepted: true,
    conflict: null,
    duplicate: false,
    command: {
      id: "cmd-1",
      organizationId: INITIAL_ORGANIZATION.id,
      locationId: INITIAL_MINNEAPOLIS_LOCATION.id,
      appointmentId: null,
      actorUserId: managerUser.id,
      commandType: "CREATE_DRAFT",
      status: "SUCCEEDED",
      idempotencyKey: "task-appointment-key",
      requestHash: "sha256:test",
      correlationId: "task-appointment-key",
      causationId: null,
      expectedAppointmentVersion: null,
      currentAppointmentVersion: null,
      attemptCount: 0,
      maxAttempts: 0,
      nextRetryAt: null,
      lockedAt: null,
      completedAt: now.toISOString(),
      failedAt: null,
      resultSnapshot: null,
      errorCode: null,
      errorMessage: null,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString()
    },
    execution: {
      executed: true,
      commandId: "cmd-1",
      commandStatus: "SUCCEEDED",
      appointment: {
        id: "appointment-created",
        appointmentNumber: "APT-TASK-MOCK",
        version: 1
      },
      createdAppointmentCount: 1,
      committedReservationCount: 0,
      releasedReservationCount: 0,
      createdTaskCount: 0,
      createdTaskLinkCount: 1,
      removedTaskLinkCount: 0,
      historyEventCount: 1,
      resultSnapshot: {
        appointmentId: "appointment-created"
      }
    }
  };
}

describe("task appointment service", () => {
  it("creates an audited draft appointment from a task and links the source task", async () => {
    const commandExecutor = vi.fn(async () => createCommandResult());
    const recordActivity = vi.fn(async () => ({
      id: "activity-1"
    }));
    const task = createTask();

    const result = await createAppointmentDraftFromTask(
      managerUser,
      task.id,
      {
        idempotencyKey: "task-appointment-key",
        reasonNotes: "Customer must meet with service before repair approval.",
        title: "Brake estimate appointment"
      },
      {
        commandExecutor,
        now,
        recordActivity,
        taskReader: async () => task
      }
    );

    expect(result).toEqual({
      appointmentId: "appointment-created",
      appointmentNumber: "APT-TASK-MOCK",
      commandId: "cmd-1",
      commandStatus: "SUCCEEDED",
      createdTaskLinkCount: 1,
      taskId: task.id
    });
    expect(commandExecutor).toHaveBeenCalledWith(
      managerUser,
      expect.objectContaining({
        commandType: "CREATE_DRAFT",
        idempotencyKey: "task-appointment-key",
        locationId: INITIAL_MINNEAPOLIS_LOCATION.id,
        organizationId: INITIAL_ORGANIZATION.id,
        ownerUserId: assignedUser.id,
        payload: expect.objectContaining({
          ownerUserId: assignedUser.id,
          sourceReference: task.id,
          sourceType: "TASK",
          taskLinks: [
            expect.objectContaining({
              action: "CREATE_LINK",
              explanation: "Customer must meet with service before repair approval.",
              linkCode: "SOURCE_TASK",
              linkType: "SOURCE",
              taskId: task.id
            })
          ]
        })
      }),
      {
        now
      }
    );
    expect(recordActivity).toHaveBeenCalledWith({
      actorUserId: managerUser.id,
      boardDayId: task.boardDayId,
      eventType: "task.appointment_draft_created",
      message: expect.stringContaining("created draft appointment"),
      metadata: expect.objectContaining({
        appointmentId: "appointment-created",
        appointmentNumber: "APT-TASK-MOCK"
      }),
      taskId: task.id
    });
  });

  it("lets the assigned task owner create their own draft appointment", async () => {
    const commandExecutor = vi.fn(async () => createCommandResult());
    const task = createTask();

    await createAppointmentDraftFromTask(
      assignedUser,
      task.id,
      {
        reasonNotes: "I need a customer appointment to finish the task."
      },
      {
        commandExecutor,
        now,
        recordActivity: vi.fn(async () => ({ id: "activity-1" })),
        taskReader: async () => task
      }
    );

    expect(commandExecutor).toHaveBeenCalledWith(
      assignedUser,
      expect.objectContaining({
        ownerUserId: assignedUser.id,
        payload: expect.objectContaining({
          ownerUserId: assignedUser.id
        })
      }),
      {
        now
      }
    );
  });

  it("creates a vehicle delivery draft from task delivery timing details", async () => {
    const commandExecutor = vi.fn(async () => createCommandResult());
    const task = createTask({
      title: "Deliver All Sold Vehicles",
      description: "We have 4 vehicles already sold that need to be delivered on Tuesday 9/8/2026.",
      workflowArea: "SALES"
    });

    await createAppointmentDraftFromTask(
      managerUser,
      task.id,
      {
        customerReference: "Nimo Ibrahim",
        deliveryNotes: "Confirm windshield and trunk lid alignment before handoff.",
        durationMinutes: 60,
        localDate: "2026-09-08",
        purposeCode: "APT-VEHICLE-DELIVERY",
        reasonNotes: "Schedule one delivery block from the parent sold-vehicle task.",
        startTime: "14:30",
        title: "Vehicle Delivery - 2023 Toyota Camry Gray",
        vehicleReference: "2023 Toyota Camry Gray"
      },
      {
        commandExecutor,
        now,
        recordActivity: vi.fn(async () => ({ id: "activity-1" })),
        taskReader: async () => task
      }
    );

    expect(commandExecutor).toHaveBeenCalledWith(
      managerUser,
      expect.objectContaining({
        payload: expect.objectContaining({
          customerSnapshot: {
            displayName: "Nimo Ibrahim"
          },
          endsAt: new Date("2026-09-08T20:30:00.000Z"),
          purposeSnapshot: expect.objectContaining({
            category: "DELIVERY",
            purposeCode: "APT-VEHICLE-DELIVERY"
          }),
          sourceSnapshot: expect.objectContaining({
            deliveryNotes: "Confirm windshield and trunk lid alignment before handoff.",
            requestedLocalDate: "2026-09-08",
            requestedStartTime: "14:30",
            vehicleReference: "2023 Toyota Camry Gray"
          }),
          startsAt: new Date("2026-09-08T19:30:00.000Z"),
          title: "Vehicle Delivery - 2023 Toyota Camry Gray",
          vehicleSnapshot: {
            displayName: "2023 Toyota Camry Gray",
            vehicleNumber: "2023 Toyota Camry Gray"
          }
        })
      }),
      {
        now
      }
    );
  });

  it("blocks staff who are not assigned to the task", async () => {
    await expect(
      createAppointmentDraftFromTask(
        otherUser,
        "task-1",
        {
          reasonNotes: "I want to make an appointment."
        },
        {
          now,
          taskReader: async () => createTask()
        }
      )
    ).rejects.toThrow("You do not have permission to create an appointment from this task.");
  });
});
