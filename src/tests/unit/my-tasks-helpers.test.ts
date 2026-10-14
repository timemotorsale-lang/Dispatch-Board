import { TaskStatus } from "@prisma/client";
import { describe, expect, it } from "vitest";

import {
  filterMyTasks,
  getAllowedMyTaskStatuses,
  getMyTasksFilterLabel,
  getPrimaryMyTaskStatusActions,
  getTasksAssignedToUser,
  hasMissingRequiredUpdate,
  isTaskDueSoon,
  isTaskOverdue,
  needsManagerDecision
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
    requiredUpdateFields: [],
    updateFieldValues: {},
    assignedUser: {
      id: "user-1",
      name: "Baraka Sales",
      email: "jordan.sales@local.test"
    },
    recommendedUser: null,
    recommendation: null,
    vehicleReference: null,
    customerReference: null,
    blockerReason: null,
    readyForReviewAt: null,
    completedAt: null,
    ...overrides
  };
}

describe("my tasks helpers", () => {
  it("keeps tasks assigned to or requesting collaboration from the current user", () => {
    const tasks = [
      createTask({
        id: "task-1",
        assignedUser: {
          id: "user-1",
          name: "Baraka Sales",
          email: "jordan.sales@local.test"
        }
      }),
      createTask({
        id: "task-2",
        assignedUser: {
          id: "user-2",
          name: "Walter Mechanic",
          email: "casey.mechanic@local.test"
        }
      }),
      createTask({
        id: "task-3",
        assignedUser: {
          id: "user-2",
          name: "Walter Mechanic",
          email: "casey.mechanic@local.test"
        },
        collaborators: [{
          id: "user-1",
          name: "Baraka Sales",
          email: "jordan.sales@local.test",
          collaborationScope: "Confirm customer pickup timing",
          capacityRequested: "Before noon",
          addedAt: "2026-06-18T14:00:00.000Z"
        }]
      })
    ];

    expect(getTasksAssignedToUser(tasks, "user-1").map((task) => task.id)).toEqual(["task-1", "task-3"]);
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

  it("distinguishes overdue from due soon", () => {
    const overdueTask = createTask({
      dueAt: "2026-06-18T15:00:00.000Z"
    });
    const dueSoonTask = createTask({
      dueAt: "2026-06-18T16:30:00.000Z"
    });

    expect(isTaskOverdue(overdueTask, new Date("2026-06-18T15:30:00.000Z"))).toBe(true);
    expect(isTaskDueSoon(overdueTask, new Date("2026-06-18T15:30:00.000Z"))).toBe(false);
    expect(isTaskDueSoon(dueSoonTask, new Date("2026-06-18T15:30:00.000Z"))).toBe(true);
  });

  it("flags missing required updates and manager-decision work", () => {
    const missingUpdateTask = createTask({
      requiredUpdateFields: [
        {
          key: "repair_status",
          label: "Repair status",
          type: "short_text",
          required: true,
          helpText: null
        }
      ],
      updateFieldValues: {}
    });
    const managerDecisionTask = createTask({
      status: TaskStatus.READY_FOR_REVIEW,
      requiresManagerApproval: true
    });

    expect(hasMissingRequiredUpdate(missingUpdateTask)).toBe(true);
    expect(needsManagerDecision(managerDecisionTask)).toBe(true);
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

  it("builds mobile quick actions without the task's current status", () => {
    const actions = getPrimaryMyTaskStatusActions(
      {
        status: TaskStatus.IN_PROGRESS,
        requiresManagerApproval: false
      },
      false
    );

    expect(actions.map((action) => action.value)).not.toContain(TaskStatus.IN_PROGRESS);
    expect(actions.map((action) => action.value)).toContain(TaskStatus.BLOCKED);
    expect(actions.map((action) => action.value)).toContain(TaskStatus.COMPLETED);
  });

  it("returns stable user-facing labels for task filters", () => {
    expect(getMyTasksFilterLabel("all")).toBe("My work today");
    expect(getMyTasksFilterLabel("blockedWaiting")).toBe("Blocked / waiting");
    expect(getMyTasksFilterLabel("readyForReview")).toBe("Ready for review");
  });
});
