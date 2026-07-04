import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { MetricStrip, OperationsStrip, StaffDutyStrip, TaskBoard } from "@/features/board/board-dashboard";
import { DEFAULT_BOARD_FILTERS, getBoardPresentation } from "@/features/board/board-grouping";
import type { BoardReadTask } from "@/server/services/board-read";
import type { ActiveUserSummary } from "@/server/services/user-summary";

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
    recommendation: null,
    vehicleReference: null,
    customerReference: null,
    blockerReason: null,
    readyForReviewAt: null,
    completedAt: null,
    ...overrides
  };
}

describe("board dashboard task board", () => {
  it("renders metrics as interactive buttons instead of static placeholders", () => {
    const markup = renderToStaticMarkup(
      <MetricStrip
        activeMetricKey="stuck"
        metrics={[
          {
            label: "Stuck",
            value: 2,
            detail: "Needs attention",
            tone: "red",
            icon: "stuck",
            metricKey: "stuck"
          }
        ]}
        onMetricSelect={() => undefined}
      />
    );

    expect(markup).toContain("button");
    expect(markup).toContain("aria-pressed");
    expect(markup).toContain("Stuck");
  });

  it("shows active staff with their roles and duty previews for manager board scanning", () => {
    const staff: ActiveUserSummary[] = [
      {
        id: "user-eli",
        name: "Eli Manager",
        email: "morgan.manager@local.test",
        roles: ["General Manager"],
        dutySource: "role_default",
        dutyPreview: ["Review today's dispatch board", "Review blocked tasks"],
        dutyCount: 2
      },
      {
        id: "user-walter",
        name: "Walter Mechanic",
        email: "casey.mechanic@local.test",
        roles: ["Mechanic"],
        dutySource: "custom",
        dutyPreview: ["Move finished repair work to Ready for Review"],
        dutyCount: 1
      }
    ];

    const markup = renderToStaticMarkup(<StaffDutyStrip staff={staff} />);

    expect(markup).toContain("Staff and duties");
    expect(markup).toContain("Eli Manager");
    expect(markup).toContain("General Manager");
    expect(markup).toContain("Review today");
    expect(markup).toContain("Walter Mechanic");
    expect(markup).toContain("Custom duties");
  });

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

  it("shows assignment recommendations directly on the board when they exist", () => {
    const task = createTask("1", {
      assignedUser: {
        id: "user-baraka",
        name: "Baraka Sales"
      },
      recommendedUser: {
        id: "user-baraka",
        name: "Baraka Sales"
      },
      recommendation: {
        reasonCode: "DIRECT_DUTY_MATCH",
        explanation: "Baraka Sales is recommended because they have the direct duty for this template."
      }
    });

    const presentation = getBoardPresentation([task], "assignee", DEFAULT_BOARD_FILTERS);
    const markup = renderToStaticMarkup(
      <TaskBoard
        boardDate="2026-06-18"
        isFiltered={false}
        isManager
        presentation={presentation}
        taskCount={1}
      />
    );

    expect(markup).toContain("Recommended: Baraka Sales");
  });

  it("renders a compact projects hub entry in place of the old workflow flow card", () => {
    const tasks = [
      createTask("1", { workflowArea: "INVENTORY", assignedUser: { id: "user-brock", name: "Brock Inventory" } }),
      createTask("2", { workflowArea: "SHOP", assignedUser: { id: "user-walter", name: "Walter Mechanic" } }),
      createTask("3", { workflowArea: "SALES", assignedUser: { id: "user-baraka", name: "Baraka Sales" } })
    ];

    const markup = renderToStaticMarkup(
      <OperationsStrip activeAssigneeId="" onAssigneeSelect={() => undefined} tasks={tasks} />
    );

    expect(markup).toContain("Projects");
    expect(markup).toContain("/projects");
    expect(markup).toContain("Open Projects Hub");
    expect(markup).toContain("active project areas today");
    expect(markup).not.toContain("Workflow flow");
  });
});
