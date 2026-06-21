import { TaskStatus } from "@prisma/client";
import { describe, expect, it } from "vitest";

import {
  filterMyTasks,
  getAllowedMyTaskStatuses,
  getTasksAssignedToUser
} from "@/features/tasks/my-tasks-helpers";
import type { BoardReadTask } from "@/server/services/board-read";

function createTask(overrides: Partial<BoardReadTask> = {}): BoardReadTask {
  return {
    id: "task-1",
    title: "Follow up with customer",
    description: null,
    status: TaskStatus.NOT_STARTED,
    dueAt: "2026-06-18T16:00:00.000Z",
    workflowArea: "SALES",
    sourceType: "TEMPLATE",
    requiresManagerApproval: false,
    assignedUser: {
      id: "user-1",
      name: "Jordan Sales",
      email: "jordan.sales@local.test"
    },
    recommendedUser: null,
    vehicleReference: null,
    customerReference: null,
    blockerReason: null,
    readyForReviewAt: null,
    completedAt: null,
    ...overrides
  };
}

describe("my tasks helpers", () => {
  it("keeps only tasks assigned to the current user", () => {
    const tasks = [
      createTask({
        id: "task-1",
        assignedUser: {
          id: "user-1",
          name: "Jordan Sales",
          email: "jordan.sales@local.test"
        }
      }),
      createTask({
        id: "task-2",
        assignedUser: {
          id: "user-2",
          name: "Casey Mechanic",
          email: "casey.mechanic@local.test"
        }
      })
    ];

    expect(getTasksAssignedToUser(tasks, "user-1").map((task) => task.id)).toEqual(["task-1"]);
  });

  it("filters due-soon tasks without including completed work", () => {
    const tasks = [
      createTask({
        id: "task-soon",
        dueAt: "2026-06-18T16:30:00.000Z"
      }),
      createTask({
        id: "task-completed",
        dueAt: "2026-06-18T16:15:00.000Z",
        status: TaskStatus.COMPLETED
      }),
      createTask({
        id: "task-later",
        dueAt: "2026-06-18T19:30:00.000Z"
      })
    ];

    expect(
      filterMyTasks(tasks, "dueSoon", new Date("2026-06-18T15:30:00.000Z")).map((task) => task.id)
    ).toEqual(["task-soon"]);
  });

  it("offers ready-for-review instead of completed for approval-required staff work", () => {
    const options = getAllowedMyTaskStatuses(
      {
        status: TaskStatus.IN_PROGRESS,
        requiresManagerApproval: true
      },
      false
    );

    expect(options.map((option) => option.value)).toContain(TaskStatus.READY_FOR_REVIEW);
    expect(options.map((option) => option.value)).not.toContain(TaskStatus.COMPLETED);
  });
});
