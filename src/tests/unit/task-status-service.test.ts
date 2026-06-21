import { TaskStatus } from "@prisma/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  updateTaskStatus,
  type TaskStatusUpdateResult
} from "@/server/services/task-status-service";
import { createTestAuthStore } from "@/tests/support/auth-test-store";

type StoredTask = {
  id: string;
  assignedUserId: string;
  requiresManagerApproval: boolean;
  status: TaskStatus;
  blockerReason: string | null;
  readyForReviewAt: Date | null;
  completedAt: Date | null;
  reviewedByUserId: string | null;
  updatedAt: Date;
};

function createStoredTask(overrides: Partial<StoredTask> = {}): StoredTask {
  return {
    id: "task-1",
    assignedUserId: "user-jordan.sales@local.test",
    requiresManagerApproval: false,
    status: TaskStatus.IN_PROGRESS,
    blockerReason: null,
    readyForReviewAt: null,
    completedAt: null,
    reviewedByUserId: null,
    updatedAt: new Date("2026-06-18T15:00:00.000Z"),
    ...overrides
  };
}

function createTaskStatusRepository(initialTasks: StoredTask[] = [createStoredTask()]) {
  let tasks = initialTasks.map((task) => ({ ...task }));

  return {
    repository: {
      async findTaskById(taskId: string) {
        return tasks.find((task) => task.id === taskId) ?? null;
      },
      async updateTaskStatus(
        taskId: string,
        data: {
          status: TaskStatus;
          blockerReason?: string;
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
    const { repository, readTask } = createTaskStatusRepository();

    const result = await updateTaskStatus(
      staffUser,
      "task-1",
      {
        status: "BLOCKED",
        blockerReason: "  Waiting on lender paperwork.  "
      },
      repository
    );

    expect(result).toEqual<TaskStatusUpdateResult>({
      id: "task-1",
      status: TaskStatus.BLOCKED,
      blockerReason: "Waiting on lender paperwork.",
      updatedAt: "2026-06-18T15:30:00.000Z"
    });
    expect(readTask()).toMatchObject({
      status: TaskStatus.BLOCKED,
      blockerReason: "Waiting on lender paperwork.",
      readyForReviewAt: null,
      completedAt: null,
      reviewedByUserId: null
    });
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
    const { repository, readTask } = createTaskStatusRepository();

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
  });

  it("does not require a blocker reason for non-blocked updates and preserves any existing reason", async () => {
    const { usersByEmail } = await createTestAuthStore();
    const staffUser = usersByEmail.get("jordan.sales@local.test") ?? null;
    const { repository, readTask } = createTaskStatusRepository([
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
    const { repository, readTask } = createTaskStatusRepository([
      createStoredTask({
        requiresManagerApproval: true
      })
    ]);

    const result = await updateTaskStatus(
      staffUser,
      "task-1",
      {
        status: "READY_FOR_REVIEW"
      },
      repository
    );

    expect(result).toMatchObject({
      status: TaskStatus.READY_FOR_REVIEW,
      blockerReason: null
    });
    expect(readTask()).toMatchObject({
      status: TaskStatus.READY_FOR_REVIEW,
      readyForReviewAt: new Date("2026-06-18T15:30:00.000Z"),
      completedAt: null,
      reviewedByUserId: null
    });
  });

  it("allows managers to complete approval-required tasks from ready for review", async () => {
    const { usersByEmail } = await createTestAuthStore();
    const managerUser = usersByEmail.get("morgan.manager@local.test") ?? null;
    const { repository, readTask } = createTaskStatusRepository([
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
    const { repository, readTask } = createTaskStatusRepository([
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
    const { repository, readTask } = createTaskStatusRepository();

    const result = await updateTaskStatus(
      staffUser,
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
      completedAt: new Date("2026-06-18T15:30:00.000Z"),
      reviewedByUserId: null
    });
  });
});
