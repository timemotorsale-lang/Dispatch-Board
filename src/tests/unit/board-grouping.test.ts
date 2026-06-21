import { describe, expect, it } from "vitest";

import {
  DEFAULT_BOARD_FILTERS,
  getBoardPresentation,
  type BoardGroupMode
} from "@/features/board/board-grouping";
import type { BoardReadTask } from "@/server/services/board-read";

type GroupableBoardTask = Omit<BoardReadTask, "assignedUser"> & {
  assignedUser: BoardReadTask["assignedUser"] | null;
};

type BoardTaskOverrides = Partial<Omit<BoardReadTask, "assignedUser">> & {
  assignedUser?: BoardReadTask["assignedUser"] | null;
};

function createTask(id: string, overrides: BoardTaskOverrides = {}): GroupableBoardTask {
  return {
    id,
    title: `Task ${id}`,
    description: null,
    status: "NOT_STARTED",
    dueAt: "2026-06-18T14:00:00.000Z",
    workflowArea: "SALES",
    sourceType: "TEMPLATE",
    requiresManagerApproval: false,
    assignedUser: {
      id: `user-${id}`,
      name: `User ${id}`
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

function getGroupLabels(mode: BoardGroupMode, tasks: GroupableBoardTask[]) {
  return getBoardPresentation(tasks, mode, DEFAULT_BOARD_FILTERS).groups.map((group) => group.label);
}

describe("board grouping helper", () => {
  it("orders status groups and keeps unknown statuses visible under Other", () => {
    const tasks = [
      createTask("blocked", {
        status: "BLOCKED"
      }),
      createTask("review", {
        status: "READY_FOR_REVIEW"
      }),
      createTask("unknown", {
        status: "CUSTOM_STATUS"
      })
    ];

    const result = getBoardPresentation(tasks, "status", DEFAULT_BOARD_FILTERS);

    expect(result.groups).toHaveLength(3);
    expect(result.groups.map((group) => group.label)).toEqual([
      "Blocked",
      "Ready For Review",
      "Other"
    ]);
    expect(result.groups[result.groups.length - 1]?.tasks[0]?.id).toBe("unknown");
  });

  it("groups assignees alphabetically and leaves unassigned tasks visible at the end", () => {
    const tasks = [
      createTask("bravo", {
        assignedUser: {
          id: "user-bravo",
          name: "Bravo"
        }
      }),
      createTask("missing", {
        assignedUser: null
      }),
      createTask("alpha", {
        assignedUser: {
          id: "user-alpha",
          name: "Alpha"
        }
      })
    ];

    const groupLabels = getGroupLabels("assignee", tasks);

    expect(groupLabels).toEqual(["Alpha", "Bravo", "Unassigned"]);
  });

  it("applies combined filters and case-insensitive search without mutating tasks", () => {
    const tasks = [
      createTask("inventory", {
        title: "Inspect red Camry",
        workflowArea: "INVENTORY",
        status: "IN_PROGRESS",
        assignedUser: {
          id: "user-walter",
          name: "Walter James"
        },
        vehicleReference: "2019 Toyota Camry"
      }),
      createTask("sales", {
        title: "Follow up with lead",
        workflowArea: "SALES",
        status: "NOT_STARTED",
        assignedUser: {
          id: "user-sarah",
          name: "Sarah Cole"
        },
        customerReference: "Taylor Rivera"
      })
    ];

    const result = getBoardPresentation(tasks, "workflowArea", {
      status: "IN_PROGRESS",
      assigneeId: "user-walter",
      workflowArea: "INVENTORY",
      searchText: "camry"
    });

    expect(result.filteredTasks.map((task) => task.id)).toEqual(["inventory"]);
    expect(result.groups).toHaveLength(1);
    expect(result.groups[0]).toMatchObject({
      key: "INVENTORY",
      label: "Inventory",
      taskCount: 1
    });
    expect(tasks[0].title).toBe("Inspect red Camry");
    expect(tasks[1].title).toBe("Follow up with lead");
  });

  it("builds filter options from the current board task list", () => {
    const tasks = [
      createTask("ops", {
        status: "WAITING_ON_APPROVAL",
        workflowArea: "ADMIN",
        assignedUser: {
          id: "user-james",
          name: "James Cole"
        }
      }),
      createTask("shop", {
        status: "BLOCKED",
        workflowArea: "SHOP",
        assignedUser: null
      })
    ];

    const result = getBoardPresentation(tasks, "status", DEFAULT_BOARD_FILTERS);

    expect(result.filterOptions.statuses).toEqual([
      {
        value: "BLOCKED",
        label: "Blocked"
      },
      {
        value: "WAITING_ON_APPROVAL",
        label: "Waiting On Approval"
      }
    ]);
    expect(result.filterOptions.assignees).toEqual([
      {
        value: "user-james",
        label: "James Cole"
      },
      {
        value: "unassigned",
        label: "Unassigned"
      }
    ]);
    expect(result.filterOptions.workflowAreas).toEqual([
      {
        value: "ADMIN",
        label: "Admin"
      },
      {
        value: "SHOP",
        label: "Shop"
      }
    ]);
  });
});
