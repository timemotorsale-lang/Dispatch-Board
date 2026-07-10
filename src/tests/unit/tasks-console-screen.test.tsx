import { TaskSourceType, TaskStatus, WorkflowArea } from "@prisma/client";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import {
  createTasksConsoleAssigneeOptions,
  TasksConsoleScreen
} from "@/features/tasks/tasks-console-screen";
import type { BoardReadModel, BoardReadTask } from "@/server/services/board-read";
import type { TaskReadModel } from "@/server/services/task-read";
import type { ActiveUserSummary } from "@/server/services/user-summary";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: vi.fn()
  })
}));

const boardDate = "2026-07-09";

function countClass(markup: string, className: string) {
  return (markup.match(new RegExp(`class="${className}(?:\\s|")`, "g")) ?? []).length;
}

function createBoardTask(index: number, overrides: Partial<BoardReadTask> = {}): BoardReadTask {
  const statusCycle = [
    TaskStatus.NOT_STARTED,
    TaskStatus.IN_PROGRESS,
    TaskStatus.BLOCKED,
    TaskStatus.WAITING_ON_PARTS,
    TaskStatus.WAITING_ON_APPROVAL,
    TaskStatus.READY_FOR_REVIEW,
    TaskStatus.NOT_STARTED,
    TaskStatus.IN_PROGRESS,
    TaskStatus.NOT_STARTED,
    TaskStatus.OVERDUE
  ] as string[];

  return {
    id: `task-${index}`,
    title: `Console Smoke Task ${index}`,
    description: "Keep this work moving today.",
    status: statusCycle[index - 1] ?? TaskStatus.NOT_STARTED,
    dueAt: `2026-07-09T${String(8 + index).padStart(2, "0")}:00:00.000Z`,
    updatedAt: `2026-07-09T${String(9 + index).padStart(2, "0")}:15:00.000Z`,
    workflowArea: index % 2 === 0 ? WorkflowArea.SALES : WorkflowArea.SHOP,
    sourceType: TaskSourceType.TEMPLATE,
    requiresManagerApproval: index === 6,
    requiredUpdateFields: [],
    updateFieldValues: {},
    assignedUser: {
      id: `user-${index}`,
      name: index % 2 === 0 ? "Baraka Sales" : "Walter Mechanic",
      email: `user-${index}@local.test`
    },
    recommendedUser: null,
    recommendation: null,
    vehicleReference: index % 2 === 0 ? `Stock #A${index}` : null,
    customerReference: index % 2 === 0 ? null : `Customer ${index}`,
    blockerReason: index === 3 ? "Waiting on manager direction." : null,
    readyForReviewAt: index === 6 ? "2026-07-09T14:00:00.000Z" : null,
    completedAt: null,
    ...overrides
  };
}

function createTaskReadModel(task: BoardReadTask): TaskReadModel {
  return {
    id: task.id,
    boardDayId: "board-day-1",
    boardDate,
    title: task.title,
    description: task.description,
    status: task.status,
    dueAt: task.dueAt,
    workflowArea: task.workflowArea,
    sourceType: task.sourceType,
    requiresManagerApproval: task.requiresManagerApproval,
    requiredUpdateFields: [],
    updateFieldValues: {},
    templateChecklistItems: [
      {
        key: "confirm_status",
        label: "Confirm current status",
        description: null,
        required: true
      }
    ],
    completionCriteria: null,
    approvalRules: null,
    intelligenceSignalType: null,
    vehicleReference: task.vehicleReference,
    customerReference: task.customerReference,
    blockerReason: task.blockerReason,
    readyForReviewAt: task.readyForReviewAt,
    completedAt: task.completedAt,
    createdAt: "2026-07-09T08:00:00.000Z",
    updatedAt: task.updatedAt,
    assignedUser: task.assignedUser,
    recommendedUser: {
      id: "user-recommended",
      name: "Recommended Owner",
      email: "recommended@local.test"
    },
    recommendation: {
      reasonCode: "ROLE_MATCH",
      explanation: "Recommended because this task matches the owner's department."
    },
    createdByUser: {
      id: "user-manager",
      name: "Eli Manager",
      email: "morgan.manager@local.test"
    },
    reviewedByUser: null,
    checklistItems: [
      {
        id: "checklist-1",
        kind: "template",
        label: "Confirm current status",
        completed: false,
        sortOrder: 1,
        completedAt: null,
        createdAt: "2026-07-09T08:00:00.000Z",
        updatedAt: "2026-07-09T08:00:00.000Z"
      }
    ],
    activityHistory: [
      {
        id: "activity-1",
        eventType: "task.created",
        message: "Task created for the daily board.",
        createdAt: "2026-07-09T08:00:00.000Z",
        actor: {
          id: "user-manager",
          name: "Eli Manager",
          email: "morgan.manager@local.test"
        }
      }
    ],
    comments: [
      {
        id: "comment-1",
        taskId: task.id,
        authorUserId: "user-manager",
        body: "Initial manager note for the team.",
        createdAt: "2026-07-09T09:00:00.000Z",
        author: {
          id: "user-manager",
          name: "Eli Manager",
          email: "morgan.manager@local.test"
        }
      }
    ]
  };
}

function createBoard(tasks: BoardReadTask[]): BoardReadModel {
  return {
    id: "board-day-1",
    date: boardDate,
    generationStatus: "GENERATED",
    generatedAt: "2026-07-09T08:00:00.000Z",
    latestGeneration: null,
    taskCount: tasks.length,
    statusCounts: tasks.reduce<Record<string, number>>((counts, task) => {
      counts[task.status] = (counts[task.status] ?? 0) + 1;
      return counts;
    }, {}),
    sourceCounts: {
      template: tasks.length,
      manager: 0,
      staff: 0
    },
    tasks
  };
}

function createActiveUser(id: string, name: string): ActiveUserSummary {
  return {
    id,
    name,
    email: `${id}@local.test`,
    roles: ["Staff"],
    dutySource: "custom",
    dutyPreview: [],
    dutyCount: 0
  };
}

describe("tasks console screen", () => {
  it("renders the compact operations-console shell with an 8-row first page", () => {
    const tasks = Array.from({ length: 10 }, (_, index) => createBoardTask(index + 1));
    const markup = renderToStaticMarkup(
      <TasksConsoleScreen
        assignableUsers={[
          createActiveUser("user-off-board", "Off Board Active User"),
          createActiveUser("user-manager", "Eli Manager")
        ]}
        board={createBoard(tasks)}
        boardDate={boardDate}
        currentUserId="user-manager"
        errorMessage={null}
        initialTask={createTaskReadModel(tasks[0])}
        isManager
        todayBoardDate={boardDate}
      />
    );

    expect(markup).toContain("Task Operations Console");
    expect(markup).toContain("Search tasks, vehicles, customers...");
    expect(markup).toContain("Create Task");
    expect(markup).toContain("Generate Today&#x27;s Board");
    expect(markup).toContain("Local Views");
    expect(markup).toContain("Filters");
    expect(markup).toContain("Export");
    expect(markup).toContain("Total Tasks");
    expect(markup).toContain("Ready for Review");
    expect(markup).toContain("Time Motor Sales");
    expect(markup).toContain("Team Tasks");
    expect(markup).toContain("List View");
    expect(markup).toContain("Board View");
    expect(markup).toContain("Showing 1 to 8 of 10 tasks");
    expect(markup).toContain("8 / page");
    expect(markup).toContain("Details");
    expect(markup).toContain("Comments (1)");
    expect(markup).toContain("Activity");
    expect(markup).toContain("Update Status");
    expect(markup).toContain("Recommendation");
    expect(markup).toContain("Blocked Tasks");
    expect(markup).toContain("Due Next 2 Hours");
    expect(markup).toContain("Unassigned Queue");
    expect(countClass(markup, "tasks-console-row")).toBe(8);
  });

  it("builds quick-create owner options from active users before board fallbacks", () => {
    const boardTask = createBoardTask(1, {
      assignedUser: {
        id: "user-board",
        name: "Board User",
        email: "board@local.test"
      },
      recommendedUser: {
        id: "user-recommended",
        name: "Recommended User",
        email: "recommended@local.test"
      }
    });

    const options = createTasksConsoleAssigneeOptions(
      [boardTask],
      null,
      [
        createActiveUser("user-active", "Active Off-Board User"),
        createActiveUser("user-board", "Board User")
      ]
    );

    expect(options.map((option) => option.name)).toEqual([
      "Active Off-Board User",
      "Board User",
      "Recommended User"
    ]);
  });
});
