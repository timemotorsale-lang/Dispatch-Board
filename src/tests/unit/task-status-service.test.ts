import { Prisma, TaskStatus } from "@prisma/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  updateTaskStatus,
  type TaskStatusUpdateResult
} from "@/server/services/task-status-service";
import { createTestAuthStore } from "@/tests/support/auth-test-store";

type StoredTask = {
  id: string;
  boardDayId: string;
  assignedUserId: string;
  requiresManagerApproval: boolean;
  status: TaskStatus;
  blockerReason: string | null;
  templateSnapshot: Prisma.JsonValue | null;
  updateFieldValues: Prisma.JsonValue | null;
  readyForReviewAt: Date | null;
  completedAt: Date | null;
  reviewedByUserId: string | null;
  acceptedAt?: Date | null;
  acceptedByUserId?: string | null;
  completionOverrideAt?: Date | null;
  completionOverrideByUserId?: string | null;
  completionOverrideReason?: string | null;
  updatedAt: Date;
  checklistItems?: Array<{ label: string; isRequired: boolean; completed: boolean }>;
  concernLink?: {
    dependsOnStepCodes: string[];
    concernCase: { taskLinks: Array<{ stepCode: string; task: { status: TaskStatus } }> };
  } | null;
};

type StoredActivityEvent = {
  actorUserId: string | null;
  boardDayId: string;
  eventType: string;
  message: string;
  metadata: Prisma.InputJsonValue;
  taskId: string | null;
};

function createStoredTask(overrides: Partial<StoredTask> = {}): StoredTask {
  return {
    id: "task-1",
    boardDayId: "board-day-1",
    assignedUserId: "user-jordan.sales@local.test",
    requiresManagerApproval: false,
    status: TaskStatus.IN_PROGRESS,
    blockerReason: null,
    templateSnapshot: null,
    updateFieldValues: null,
    readyForReviewAt: null,
    completedAt: null,
    reviewedByUserId: null,
    acceptedAt: null,
    acceptedByUserId: null,
    completionOverrideAt: null,
    completionOverrideByUserId: null,
    completionOverrideReason: null,
    updatedAt: new Date("2026-06-18T15:00:00.000Z"),
    ...overrides
  };
}

function createTaskStatusRepository(initialTasks: StoredTask[] = [createStoredTask()]) {
  let tasks = initialTasks.map((task) => ({ ...task }));
  const activityEvents: StoredActivityEvent[] = [];

  return {
    repository: {
      async createActivityEvent(input: StoredActivityEvent) {
        activityEvents.push(input);
      },

      async findTaskById(taskId: string) {
        return tasks.find((task) => task.id === taskId) ?? null;
      },
      async updateTaskStatus(
        taskId: string,
        data: {
          status: TaskStatus;
          blockerReason?: string;
          updateFieldValues?: Prisma.InputJsonValue;
          readyForReviewAt?: Date | null;
          completedAt?: Date | null;
          reviewedByUserId?: string | null;
        }
      ) {
        const taskIndex = tasks.findIndex((task) => task.id === taskId);

        if (taskIndex === -1) {
          throw new Error("Task not found.");
        }

        const updatedTask = {
          ...tasks[taskIndex],
          status: data.status,
          blockerReason:
            data.blockerReason !== undefined ? data.blockerReason : tasks[taskIndex].blockerReason,
          updateFieldValues:
            data.updateFieldValues !== undefined
              ? (data.updateFieldValues as Prisma.JsonValue)
              : tasks[taskIndex].updateFieldValues,
          readyForReviewAt:
            data.readyForReviewAt !== undefined
              ? data.readyForReviewAt
              : tasks[taskIndex].readyForReviewAt,
          completedAt:
            data.completedAt !== undefined ? data.completedAt : tasks[taskIndex].completedAt,
          reviewedByUserId:
            data.reviewedByUserId !== undefined
              ? data.reviewedByUserId
              : tasks[taskIndex].reviewedByUserId,
          updatedAt: new Date("2026-06-18T15:30:00.000Z")
        };

        tasks = tasks.map((task, index) => (index === taskIndex ? updatedTask : task));

        return updatedTask;
      }
    },
    readTask(taskId = "task-1") {
      return tasks.find((task) => task.id === taskId) ?? null;
    },
    readActivityEvents() {
      return [...activityEvents];
    }
  };
}

describe("task status service", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-18T15:30:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows staff to block their own task when they provide a meaningful blocker reason", async () => {
    const { usersByEmail } = await createTestAuthStore();
    const staffUser = usersByEmail.get("jordan.sales@local.test") ?? null;
    const { repository, readActivityEvents, readTask } = createTaskStatusRepository();
    const taskAppointmentAutomationRunner = vi.fn().mockResolvedValue({
      taskId: "task-1",
      triggerCode: "BLOCKED_TASK_REVIEW",
      evaluatedRuleCount: 0,
      createdAppointmentCount: 0,
      executions: []
    });

    const result = await updateTaskStatus(
      staffUser,
      "task-1",
      {
        status: "BLOCKED",
        blockerReason: "  Waiting on lender paperwork.  "
      },
      repository,
      {
        taskAppointmentAutomationRunner
      }
    );

    expect(result).toEqual<TaskStatusUpdateResult>({
      id: "task-1",
      status: TaskStatus.BLOCKED,
      blockerReason: "Waiting on lender paperwork.",
      updateFieldValues: {},
      updatedAt: "2026-06-18T15:30:00.000Z"
    });
    expect(readTask()).toMatchObject({
      status: TaskStatus.BLOCKED,
      blockerReason: "Waiting on lender paperwork.",
      readyForReviewAt: null,
      completedAt: null,
      reviewedByUserId: null
    });
    expect(readActivityEvents()).toEqual([]);
  });

  it("rejects blocked updates when the blocker reason is missing for approval-required tasks", async () => {
    const { usersByEmail } = await createTestAuthStore();
    const staffUser = usersByEmail.get("jordan.sales@local.test") ?? null;
    const { repository } = createTaskStatusRepository([
      createStoredTask({
        requiresManagerApproval: true
      })
    ]);

    await expect(
      updateTaskStatus(
        staffUser,
        "task-1",
        {
          status: "BLOCKED"
        },
        repository
      )
    ).rejects.toThrow(/blocker reason/);
  });

  it("rejects blocked updates when the blocker reason is blank", async () => {
    const { usersByEmail } = await createTestAuthStore();
    const staffUser = usersByEmail.get("jordan.sales@local.test") ?? null;
    const { repository, readActivityEvents, readTask } = createTaskStatusRepository();

    await expect(
      updateTaskStatus(
        staffUser,
        "task-1",
        {
          status: "BLOCKED",
          blockerReason: "   "
        },
        repository
      )
    ).rejects.toThrow(/blocker reason/);
    expect(readTask()).toMatchObject({
      status: TaskStatus.IN_PROGRESS,
      blockerReason: null
    });
    expect(readActivityEvents()).toHaveLength(0);
  });

  it("does not require a blocker reason for non-blocked updates and preserves any existing reason", async () => {
    const { usersByEmail } = await createTestAuthStore();
    const staffUser = usersByEmail.get("jordan.sales@local.test") ?? null;
    const { repository, readActivityEvents, readTask } = createTaskStatusRepository([
      createStoredTask({
        status: TaskStatus.BLOCKED,
        blockerReason: "Waiting on photos"
      })
    ]);

    const result = await updateTaskStatus(
      staffUser,
      "task-1",
      {
        status: "IN_PROGRESS"
      },
      repository
    );

    expect(result).toMatchObject({
      status: TaskStatus.IN_PROGRESS,
      blockerReason: "Waiting on photos"
    });
    expect(readTask()).toMatchObject({
      status: TaskStatus.IN_PROGRESS,
      blockerReason: "Waiting on photos",
      completedAt: null,
      reviewedByUserId: null
    });
    expect(readActivityEvents()).toEqual([]);
  });

  it("clears ready-for-review metadata when a manager blocks a review-required task", async () => {
    const { usersByEmail } = await createTestAuthStore();
    const managerUser = usersByEmail.get("morgan.manager@local.test") ?? null;
    const { repository, readTask } = createTaskStatusRepository([
      createStoredTask({
        requiresManagerApproval: true,
        status: TaskStatus.READY_FOR_REVIEW,
        readyForReviewAt: new Date("2026-06-18T15:15:00.000Z"),
        completedAt: new Date("2026-06-18T15:20:00.000Z"),
        reviewedByUserId: "user-morgan.manager@local.test"
      })
    ]);
    const taskAppointmentAutomationRunner = vi.fn().mockResolvedValue({
      taskId: "task-1",
      triggerCode: "BLOCKED_TASK_REVIEW",
      evaluatedRuleCount: 0,
      createdAppointmentCount: 0,
      executions: []
    });

    const result = await updateTaskStatus(
      managerUser,
      "task-1",
      {
        status: "BLOCKED",
        blockerReason: " Waiting on final manager sign-off details. "
      },
      repository,
      {
        taskAppointmentAutomationRunner
      }
    );

    expect(result).toMatchObject({
      status: TaskStatus.BLOCKED,
      blockerReason: "Waiting on final manager sign-off details."
    });
    expect(readTask()).toMatchObject({
      status: TaskStatus.BLOCKED,
      blockerReason: "Waiting on final manager sign-off details.",
      readyForReviewAt: null,
      completedAt: null,
      reviewedByUserId: null
    });
  });

  it("rejects blank task ids before loading the task", async () => {
    const { usersByEmail } = await createTestAuthStore();
    const staffUser = usersByEmail.get("jordan.sales@local.test") ?? null;
    const { repository } = createTaskStatusRepository();

    await expect(
      updateTaskStatus(
        staffUser,
        "   ",
        {
          status: "IN_PROGRESS"
        },
        repository
      )
    ).rejects.toThrow("Task id is required.");
  });

  it("rejects staff users who try to update another user's task", async () => {
    const { usersByEmail } = await createTestAuthStore();
    const staffUser = usersByEmail.get("jordan.sales@local.test") ?? null;
    const otherStaffUser = usersByEmail.get("casey.mechanic@local.test") ?? null;
    const { repository, readTask } = createTaskStatusRepository([
      createStoredTask({
        assignedUserId: otherStaffUser?.id ?? "user-casey.mechanic@local.test"
      })
    ]);

    await expect(
      updateTaskStatus(
        staffUser,
        "task-1",
        {
          status: "IN_PROGRESS"
        },
        repository
      )
    ).rejects.toThrow(/permission/);
    expect(readTask()).toMatchObject({
      status: TaskStatus.IN_PROGRESS,
      assignedUserId: otherStaffUser?.id ?? "user-casey.mechanic@local.test"
    });
  });

  it("allows managers to update tasks assigned to other staff members", async () => {
    const { usersByEmail } = await createTestAuthStore();
    const managerUser = usersByEmail.get("morgan.manager@local.test") ?? null;
    const otherStaffUser = usersByEmail.get("casey.mechanic@local.test") ?? null;
    const { repository, readTask } = createTaskStatusRepository([
      createStoredTask({
        assignedUserId: otherStaffUser?.id ?? "user-casey.mechanic@local.test",
        status: TaskStatus.NOT_STARTED
      })
    ]);

    const result = await updateTaskStatus(
      managerUser,
      "task-1",
      {
        status: "IN_PROGRESS"
      },
      repository
    );

    expect(result).toMatchObject({
      status: TaskStatus.IN_PROGRESS
    });
    expect(readTask()).toMatchObject({
      status: TaskStatus.IN_PROGRESS,
      assignedUserId: otherStaffUser?.id ?? "user-casey.mechanic@local.test"
    });
  });

  it("rejects staff users who try to directly complete an approval-required task", async () => {
    const { usersByEmail } = await createTestAuthStore();
    const staffUser = usersByEmail.get("jordan.sales@local.test") ?? null;
    const { repository } = createTaskStatusRepository([
      createStoredTask({
        requiresManagerApproval: true
      })
    ]);

    await expect(
      updateTaskStatus(
        staffUser,
        "task-1",
        {
          status: "COMPLETED"
        },
        repository
      )
    ).rejects.toThrow(/permission/);
  });

  it("allows staff to move approval-required tasks to ready for review", async () => {
    const { usersByEmail } = await createTestAuthStore();
    const staffUser = usersByEmail.get("jordan.sales@local.test") ?? null;
    const { repository, readActivityEvents, readTask } = createTaskStatusRepository([
      createStoredTask({
        requiresManagerApproval: true
      })
    ]);
    const taskAppointmentAutomationRunner = vi.fn().mockResolvedValue({
      taskId: "task-1",
      triggerCode: "ESCALATION_TASK_REVIEW",
      evaluatedRuleCount: 0,
      createdAppointmentCount: 0,
      executions: []
    });

    const result = await updateTaskStatus(
      staffUser,
      "task-1",
      {
        status: "READY_FOR_REVIEW"
      },
      repository,
      {
        taskAppointmentAutomationRunner
      }
    );

    expect(result).toMatchObject({
      status: TaskStatus.READY_FOR_REVIEW,
      blockerReason: null,
      updateFieldValues: {}
    });
    expect(readTask()).toMatchObject({
      status: TaskStatus.READY_FOR_REVIEW,
      readyForReviewAt: new Date("2026-06-18T15:30:00.000Z"),
      completedAt: null,
      reviewedByUserId: null
    });
    expect(readActivityEvents()).toEqual([]);
    expect(taskAppointmentAutomationRunner).toHaveBeenCalledWith(staffUser, {
      reasonNotes: null,
      taskId: "task-1",
      triggerCode: "ESCALATION_TASK_REVIEW"
    });
  });

  it("runs escalation appointment automation when an approval-required task moves to ready for review", async () => {
    const { usersByEmail } = await createTestAuthStore();
    const staffUser = usersByEmail.get("jordan.sales@local.test") ?? null;
    const { repository } = createTaskStatusRepository([
      createStoredTask({
        requiresManagerApproval: true
      })
    ]);
    const taskAppointmentAutomationRunner = vi.fn().mockResolvedValue({
      taskId: "task-1",
      triggerCode: "ESCALATION_TASK_REVIEW",
      evaluatedRuleCount: 1,
      createdAppointmentCount: 1,
      executions: []
    });

    await updateTaskStatus(
      staffUser,
      "task-1",
      {
        status: "READY_FOR_REVIEW"
      },
      repository,
      {
        taskAppointmentAutomationRunner
      }
    );

    expect(taskAppointmentAutomationRunner).toHaveBeenCalledWith(staffUser, {
      reasonNotes: null,
      taskId: "task-1",
      triggerCode: "ESCALATION_TASK_REVIEW"
    });
  });

  it("allows managers to complete approval-required tasks from ready for review", async () => {
    const { usersByEmail } = await createTestAuthStore();
    const managerUser = usersByEmail.get("morgan.manager@local.test") ?? null;
    const { repository, readActivityEvents, readTask } = createTaskStatusRepository([
      createStoredTask({
        requiresManagerApproval: true,
        status: TaskStatus.READY_FOR_REVIEW,
        readyForReviewAt: new Date("2026-06-18T15:15:00.000Z")
      })
    ]);

    const result = await updateTaskStatus(
      managerUser,
      "task-1",
      {
        status: "COMPLETED"
      },
      repository
    );

    expect(result).toMatchObject({
      status: TaskStatus.COMPLETED
    });
    expect(readTask()).toMatchObject({
      status: TaskStatus.COMPLETED,
      readyForReviewAt: new Date("2026-06-18T15:15:00.000Z"),
      completedAt: new Date("2026-06-18T15:30:00.000Z"),
      reviewedByUserId: managerUser?.id ?? null
    });
    expect(readActivityEvents()).toEqual([]);
  });

  it("rejects managers who try to complete approval-required tasks before ready for review", async () => {
    const { usersByEmail } = await createTestAuthStore();
    const managerUser = usersByEmail.get("morgan.manager@local.test") ?? null;
    const { repository } = createTaskStatusRepository([
      createStoredTask({
        requiresManagerApproval: true,
        status: TaskStatus.IN_PROGRESS
      })
    ]);

    await expect(
      updateTaskStatus(
        managerUser,
        "task-1",
        {
          status: "COMPLETED"
        },
        repository
      )
    ).rejects.toThrow("Approval-required tasks must move through Ready for Review before Completed.");
  });

  it("allows managers to send ready-for-review tasks back to in progress", async () => {
    const { usersByEmail } = await createTestAuthStore();
    const managerUser = usersByEmail.get("morgan.manager@local.test") ?? null;
    const { repository, readActivityEvents, readTask } = createTaskStatusRepository([
      createStoredTask({
        requiresManagerApproval: true,
        status: TaskStatus.READY_FOR_REVIEW,
        readyForReviewAt: new Date("2026-06-18T15:15:00.000Z"),
        completedAt: new Date("2026-06-18T15:20:00.000Z"),
        reviewedByUserId: "user-morgan.manager@local.test"
      })
    ]);

    const result = await updateTaskStatus(
      managerUser,
      "task-1",
      {
        status: "IN_PROGRESS"
      },
      repository
    );

    expect(result).toMatchObject({
      status: TaskStatus.IN_PROGRESS
    });
    expect(readTask()).toMatchObject({
      status: TaskStatus.IN_PROGRESS,
      readyForReviewAt: null,
      completedAt: null,
      reviewedByUserId: null
    });
    expect(readActivityEvents()).toEqual([]);
  });

  it("rejects staff users who try to send ready-for-review tasks back to in progress", async () => {
    const { usersByEmail } = await createTestAuthStore();
    const staffUser = usersByEmail.get("jordan.sales@local.test") ?? null;
    const { repository } = createTaskStatusRepository([
      createStoredTask({
        requiresManagerApproval: true,
        status: TaskStatus.READY_FOR_REVIEW,
        readyForReviewAt: new Date("2026-06-18T15:15:00.000Z")
      })
    ]);

    await expect(
      updateTaskStatus(
        staffUser,
        "task-1",
        {
          status: "IN_PROGRESS"
        },
        repository
      )
    ).rejects.toThrow(/permission/);
  });

  it("allows staff to directly complete non-approval-required tasks assigned to them", async () => {
    const { usersByEmail } = await createTestAuthStore();
    const staffUser = usersByEmail.get("jordan.sales@local.test") ?? null;
    const { repository, readActivityEvents, readTask } = createTaskStatusRepository();

    const result = await updateTaskStatus(
      staffUser,
      "task-1",
      {
        status: "COMPLETED"
      },
      repository
    );

    expect(result).toMatchObject({
      status: TaskStatus.COMPLETED,
      updateFieldValues: {}
    });
    expect(readTask()).toMatchObject({
      status: TaskStatus.COMPLETED,
      completedAt: new Date("2026-06-18T15:30:00.000Z"),
      reviewedByUserId: null
    });
    expect(readActivityEvents()).toEqual([]);
  });

  it("rejects completion when template-required update fields are missing", async () => {
    const { usersByEmail } = await createTestAuthStore();
    const staffUser = usersByEmail.get("jordan.sales@local.test") ?? null;
    const { repository, readTask } = createTaskStatusRepository([
      createStoredTask({
        templateSnapshot: {
          requiredUpdateFields: [
            {
              key: "vehicle",
              label: "Vehicle",
              type: "short_text",
              required: true,
              helpText: null
            },
            {
              key: "repair_status",
              label: "Repair status",
              type: "single_select",
              required: true,
              helpText: null,
              options: ["In progress", "Waiting on parts", "Completed"]
            },
            {
              key: "next_step",
              label: "Next step",
              type: "long_text",
              required: true,
              helpText: null
            }
          ],
          completionCriteria: {
            mode: "checklist_and_update_fields",
            requiredChecklistKeys: [],
            requiredFieldKeys: ["vehicle", "repair_status", "next_step"]
          }
        }
      })
    ]);

    await expect(
      updateTaskStatus(
        staffUser,
        "task-1",
        {
          status: "COMPLETED"
        },
        repository
      )
    ).rejects.toThrow("Task update is missing required fields: Vehicle, Repair status, Next step.");
    expect(readTask()).toMatchObject({
      status: TaskStatus.IN_PROGRESS,
      updateFieldValues: null
    });
  });

  it("stores guided update fields and allows completion once required values are present", async () => {
    const { usersByEmail } = await createTestAuthStore();
    const staffUser = usersByEmail.get("jordan.sales@local.test") ?? null;
    const { repository, readTask } = createTaskStatusRepository([
      createStoredTask({
        templateSnapshot: {
          requiredUpdateFields: [
            {
              key: "vehicle",
              label: "Vehicle",
              type: "short_text",
              required: true,
              helpText: null
            },
            {
              key: "repair_status",
              label: "Repair status",
              type: "single_select",
              required: true,
              helpText: null,
              options: ["In progress", "Waiting on parts", "Completed"]
            },
            {
              key: "next_step",
              label: "Next step",
              type: "long_text",
              required: true,
              helpText: null
            }
          ],
          completionCriteria: {
            mode: "update_fields",
            requiredChecklistKeys: [],
            requiredFieldKeys: ["vehicle", "repair_status", "next_step"]
          }
        }
      })
    ]);

    const result = await updateTaskStatus(
      staffUser,
      "task-1",
      {
        status: "COMPLETED",
        updateFields: {
          vehicle: "2018 F-150",
          repair_status: "Completed",
          next_step: "Send to QC"
        }
      },
      repository
    );

    expect(result).toMatchObject({
      status: TaskStatus.COMPLETED,
      updateFieldValues: {
        vehicle: "2018 F-150",
        repair_status: "Completed",
        next_step: "Send to QC"
      }
    });
    expect(readTask()).toMatchObject({
      updateFieldValues: {
        vehicle: "2018 F-150",
        repair_status: "Completed",
        next_step: "Send to QC"
      }
    });
  });

  it("runs blocked-task appointment automation after a task is marked blocked", async () => {
    const { usersByEmail } = await createTestAuthStore();
    const staffUser = usersByEmail.get("jordan.sales@local.test") ?? null;
    const { repository } = createTaskStatusRepository();
    const taskAppointmentAutomationRunner = vi.fn().mockResolvedValue({
      taskId: "task-1",
      triggerCode: "BLOCKED_TASK_REVIEW",
      evaluatedRuleCount: 1,
      createdAppointmentCount: 1,
      executions: []
    });

    await updateTaskStatus(
      staffUser,
      "task-1",
      {
        status: "BLOCKED",
        blockerReason: "Waiting on lender paperwork."
      },
      repository,
      {
        taskAppointmentAutomationRunner
      }
    );

    expect(taskAppointmentAutomationRunner).toHaveBeenCalledWith(staffUser, {
      reasonNotes: "Waiting on lender paperwork.",
      taskId: "task-1",
      triggerCode: "BLOCKED_TASK_REVIEW"
    });
  });

  it("does not rerun blocked-task automation when the task was already blocked and no explicit trigger was provided", async () => {
    const { usersByEmail } = await createTestAuthStore();
    const staffUser = usersByEmail.get("jordan.sales@local.test") ?? null;
    const { repository } = createTaskStatusRepository([
      createStoredTask({
        status: TaskStatus.BLOCKED,
        blockerReason: "Waiting on lender paperwork."
      })
    ]);
    const taskAppointmentAutomationRunner = vi.fn().mockResolvedValue({
      taskId: "task-1",
      triggerCode: "BLOCKED_TASK_REVIEW",
      evaluatedRuleCount: 1,
      createdAppointmentCount: 0,
      executions: []
    });

    await updateTaskStatus(
      staffUser,
      "task-1",
      {
        status: "BLOCKED",
        blockerReason: "Waiting on lender paperwork."
      },
      repository,
      {
        taskAppointmentAutomationRunner
      }
    );

    expect(taskAppointmentAutomationRunner).not.toHaveBeenCalled();
  });

  it("runs an explicit appointment automation trigger from task status updates", async () => {
    const { usersByEmail } = await createTestAuthStore();
    const staffUser = usersByEmail.get("jordan.sales@local.test") ?? null;
    const { repository } = createTaskStatusRepository();
    const taskAppointmentAutomationRunner = vi.fn().mockResolvedValue({
      taskId: "task-1",
      triggerCode: "QUALIFIED_SALES_FOLLOW_UP_TASK",
      evaluatedRuleCount: 1,
      createdAppointmentCount: 1,
      executions: []
    });

    await updateTaskStatus(
      staffUser,
      "task-1",
      {
        status: "COMPLETED",
        appointmentAutomationReasonNotes: "Meet the customer after the lender confirms approval.",
        appointmentAutomationTriggerCode: "qualified_sales_follow_up_task"
      },
      repository,
      {
        taskAppointmentAutomationRunner
      }
    );

    expect(taskAppointmentAutomationRunner).toHaveBeenCalledWith(staffUser, {
      reasonNotes: "Meet the customer after the lender confirms approval.",
      taskId: "task-1",
      triggerCode: "QUALIFIED_SALES_FOLLOW_UP_TASK"
    });
  });

  it("rejects completion while required persisted checklist evidence is incomplete", async () => {
    const { usersByEmail } = await createTestAuthStore();
    const staffUser = usersByEmail.get("jordan.sales@local.test") ?? null;
    const { repository } = createTaskStatusRepository([
      createStoredTask({ checklistItems: [{ label: "Confirm submission status", isRequired: true, completed: false }] })
    ]);

    await expect(updateTaskStatus(staffUser, "task-1", { status: "COMPLETED" }, repository)).rejects.toThrow(
      "Task checklist is incomplete"
    );
  });

  it("rejects concern work when its dependency steps are incomplete", async () => {
    const { usersByEmail } = await createTestAuthStore();
    const staffUser = usersByEmail.get("jordan.sales@local.test") ?? null;
    const { repository } = createTaskStatusRepository([
      createStoredTask({
        status: TaskStatus.NOT_STARTED,
        concernLink: {
          dependsOnStepCodes: ["VERIFY_RECORD"],
          concernCase: { taskLinks: [{ stepCode: "VERIFY_RECORD", task: { status: TaskStatus.IN_PROGRESS } }] }
        }
      })
    ]);

    await expect(updateTaskStatus(staffUser, "task-1", { status: "IN_PROGRESS" }, repository)).rejects.toThrow(
      "Concern task dependencies are incomplete: VERIFY_RECORD"
    );
  });

  it("requires task acceptance before completion when the execution gate is enabled", async () => {
    const { usersByEmail } = await createTestAuthStore();
    const staffUser = usersByEmail.get("jordan.sales@local.test") ?? null;
    const { repository } = createTaskStatusRepository();

    await expect(updateTaskStatus(staffUser, "task-1", { status: "COMPLETED" }, repository, {
      staffExecutionFlags: {
        enabled: true,
        startDayGateEnabled: true,
        taskAcceptanceEnabled: true,
        availableWorkEnabled: false,
        endOfDayReportEnabled: false,
        managerHealthEnabled: false
      }
    })).rejects.toThrow("Accept this task before submitting it for completion.");
  });

  it("rejects completion directly from blocked work when the execution gate is enabled", async () => {
    const { usersByEmail } = await createTestAuthStore();
    const staffUser = usersByEmail.get("jordan.sales@local.test") ?? null;
    const { repository } = createTaskStatusRepository([
      createStoredTask({
        acceptedAt: new Date("2026-07-11T14:00:00.000Z"),
        acceptedByUserId: "user-jordan.sales@local.test",
        blockerReason: "Waiting for customer",
        status: TaskStatus.BLOCKED
      })
    ]);

    await expect(updateTaskStatus(staffUser, "task-1", { status: "COMPLETED" }, repository, {
      staffExecutionFlags: {
        enabled: true,
        startDayGateEnabled: true,
        taskAcceptanceEnabled: true,
        availableWorkEnabled: false,
        endOfDayReportEnabled: false,
        managerHealthEnabled: false
      }
    })).rejects.toThrow("Resolve the task's blocked or waiting condition before completion.");
  });

  it("allows a manager with a recorded override to complete despite unmet evidence", async () => {
    const { usersByEmail } = await createTestAuthStore();
    const managerUser = usersByEmail.get("morgan.manager@local.test") ?? null;
    const { repository } = createTaskStatusRepository([
      createStoredTask({
        assignedUserId: "user-jordan.sales@local.test",
        checklistItems: [{ label: "Confirm customer receipt", isRequired: true, completed: false }],
        completionOverrideAt: new Date("2026-07-11T15:00:00.000Z"),
        completionOverrideByUserId: "user-morgan.manager@local.test",
        completionOverrideReason: "Customer safety requires immediate documented closure."
      })
    ]);

    const result = await updateTaskStatus(managerUser, "task-1", { status: "COMPLETED" }, repository, {
      staffExecutionFlags: {
        enabled: true,
        startDayGateEnabled: true,
        taskAcceptanceEnabled: true,
        availableWorkEnabled: false,
        endOfDayReportEnabled: false,
        managerHealthEnabled: false
      }
    });

    expect(result.status).toBe(TaskStatus.COMPLETED);
  });
});
