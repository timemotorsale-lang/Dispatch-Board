import { TaskSourceType, TaskStatus, WorkflowArea } from "@prisma/client";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { MyTasksScreen } from "@/features/tasks/my-tasks-screen";
import type { BoardReadTask } from "@/server/services/board-read";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: vi.fn()
  })
}));

function createTask(id: string, overrides: Partial<BoardReadTask> = {}): BoardReadTask {
  return {
    id,
    title: `Task ${id}`,
    description: "Review and move this task forward.",
    status: TaskStatus.IN_PROGRESS,
    dueAt: "2026-07-04T16:00:00.000Z",
    workflowArea: WorkflowArea.SALES,
    sourceType: TaskSourceType.TEMPLATE,
    requiresManagerApproval: false,
    assignedUser: {
      id: `user-${id}`,
      name: `User ${id}`,
      email: `user-${id}@local.test`
    },
    recommendedUser: null,
    recommendation: null,
    vehicleReference: null,
    customerReference: "Taylor R.",
    blockerReason: null,
    readyForReviewAt: null,
    completedAt: null,
    ...overrides
  };
}

describe("my tasks screen", () => {
  it("renders the approved queue and inspector structure with live tasks", () => {
    const markup = renderToStaticMarkup(
      <MyTasksScreen
        boardDate="2026-07-04"
        boardExists
        fullBoardHref="/board?date=2026-07-04"
        generatedAt="2026-07-04T13:00:00.000Z"
        generationStatus="GENERATED"
        initialTasks={[
          createTask("blocked", {
            title: "Review Blocked Tasks",
            status: TaskStatus.BLOCKED,
            requiresManagerApproval: true,
            workflowArea: WorkflowArea.GENERAL_MANAGER,
            blockerReason: "Waiting on manager direction."
          }),
          createTask("repair", {
            title: "Complete Vehicle Repair Update",
            workflowArea: WorkflowArea.SHOP,
            vehicleReference: "2014 Acura MDX",
            customerReference: null
          })
        ]}
        isManager
        nowIso="2026-07-04T14:00:00.000Z"
        userName="Elia Aswan"
      />
    );

    expect(markup).toContain("My Tasks");
    expect(markup).toContain("Review Blocked Tasks");
    expect(markup).toContain("Required Update");
    expect(markup).toContain("Task Information");
    expect(markup).toContain("Expand workspace");
  });

  it("shows the assigned-empty state when a board exists but no tasks are assigned", () => {
    const markup = renderToStaticMarkup(
      <MyTasksScreen
        boardDate="2026-07-04"
        boardExists
        fullBoardHref="/board?date=2026-07-04"
        generatedAt={null}
        generationStatus={null}
        initialTasks={[]}
        isManager={false}
        nowIso="2026-07-04T14:00:00.000Z"
        userName="Baraka Sales"
      />
    );

    expect(markup).toContain("No tasks are assigned to you right now");
    expect(markup).toContain("Check full board");
  });
});
