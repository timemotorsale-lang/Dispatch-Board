import { TaskStatus } from "@prisma/client";
import { describe, expect, it } from "vitest";

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
  updatedAt: Date;
};

function createStoredTask(overrides: Partial<StoredTask> = {}): StoredTask {
  return {
    id: "task-1",
    assignedUserId: "user-jordan.sales@local.test",
    requiresManagerApproval: false,
    status: TaskStatus.IN_PROGRESS,
    blockerReason: null,
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
      async updateTaskStatus(taskId: string, data: { status: TaskStatus; blockerReason?: string }) {
        const taskIndex = tasks.findIndex((task) => task.id === taskId);

        if (taskIndex === -1) {
          throw new Error("Task not found.");
        }

        const updatedTask = {
          ...tasks[taskIndex],
          status: data.status,
          blockerReason:
            data.blockerReason !== undefined ? data.blockerReason : tasks[taskIndex].blockerReason,
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
      blockerReason: "Waiting on lender paperwork."
    });
  });

  it("rejects blocked updates when the blocker reason is missing", async () => {
    const { usersByEmail } = await createTestAuthStore();
    const staffUser = usersByEmail.get("jordan.sales@local.test") ?? null;
    const { repository } = createTaskStatusRepository();

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
    const { repository } = createTaskStatusRepository();

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
      blockerReason: "Waiting on photos"
    });
  });

  it("rejects staff users who try to update another user's task", async () => {
    const { usersByEmail } = await createTestAuthStore();
    const staffUser = usersByEmail.get("jordan.sales@local.test") ?? null;
    const otherStaffUser = usersByEmail.get("casey.mechanic@local.test") ?? null;
    const { repository } = createTaskStatusRepository([
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
  });

  it("preserves approval-required completion rules for staff users", async () => {
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
});
