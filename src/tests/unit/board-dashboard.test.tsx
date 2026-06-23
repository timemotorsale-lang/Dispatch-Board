import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { TaskBoard } from "@/features/board/board-dashboard";
import { DEFAULT_BOARD_FILTERS, getBoardPresentation } from "@/features/board/board-grouping";
import type { BoardReadTask } from "@/server/services/board-read";

type GroupableBoardTask = Omit<BoardReadTask, "assignedUser"> & {
  assignedUser: BoardReadTask["assignedUser"] | null;
};

function createTask(id: string, overrides: Partial<GroupableBoardTask> = {}): GroupableBoardTask {
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

describe("board dashboard task board", () => {
  it("shows a real empty-board message when the board has zero tasks", () => {
    const presentation = getBoardPresentation([], "assignee", DEFAULT_BOARD_FILTERS);
    const markup = renderToStaticMarkup(
      <TaskBoard
        boardDate="2026-06-18"
        isFiltered={false}
        isManager
        presentation={presentation}
        taskCount={0}
      />
    );

    expect(markup).toContain("No tasks on");
    expect(markup).toContain("Jun 18");
    expect(markup).toContain("This board exists, but no tasks have been created for it yet.");
  });

  it("shows a filter-specific empty message when filters hide the current tasks", () => {
    const presentation = getBoardPresentation([createTask("1")], "assignee", {
      ...DEFAULT_BOARD_FILTERS,
      status: "BLOCKED"
    });
    const markup = renderToStaticMarkup(
      <TaskBoard
        boardDate="2026-06-18"
        isFiltered
        isManager={false}
        presentation={presentation}
        taskCount={1}
      />
    );

    expect(markup).toContain("No tasks match this view");
    expect(markup).toContain("No tasks match the current filters.");
  });
});
