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
    requiredUpdateFields: [],
    updateFieldValues: {},
    ...overrides
  };
}

describe("my tasks screen", () => {
  it("renders the approved queue and inspector structure with live tasks", () => {
    const markup = renderToStaticMarkup(
      <MyTasksScreen
        boardDate="2026-07-04"
        boardExists
        currentUserId="user-manager"
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
        initialReadinessByTask={{
          blocked: {
            accepted: true,
            acceptedAt: "2026-07-04T13:30:00.000Z",
            completionOverride: null,
            nextCompletionStatus: TaskStatus.READY_FOR_REVIEW,
            ready: false,
            requirements: [{ code: "blocker", label: "Resolve the active blocker", satisfied: false }],
            taskId: "blocked"
          }
        }}
        isManager
        nowIso="2026-07-04T14:00:00.000Z"
        userName="Elia Aswan"
      />
    );

    expect(markup).toContain("My Tasks");
    expect(markup).toContain("Task Queue");
    expect(markup).toContain("Review Blocked Tasks");
    expect(markup).toContain("Task Command Center");
    expect(markup).toContain("Task Information");
    expect(markup).toContain("Task Intake");
    expect(markup).toContain("Open Workspace");
    expect(markup).toContain("1 evidence items");
    expect(markup).toContain("1 completion requirements remain");
    expect(markup).toContain("Next: Resolve the active blocker");
    expect(markup).toContain("Review evidence");
  });

  it("shows the assigned-empty state when a board exists but no tasks are assigned", () => {
    const markup = renderToStaticMarkup(
      <MyTasksScreen
        boardDate="2026-07-04"
        boardExists
        currentUserId="user-baraka"
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

  it("shows only the recovery state when loading fails", () => {
    const markup = renderToStaticMarkup(
      <MyTasksScreen
        boardDate="2026-07-04"
        boardExists={false}
        currentUserId="user-baraka"
        errorMessage="Database temporarily unavailable."
        fullBoardHref="/board?date=2026-07-04"
        generatedAt={null}
        generationStatus={null}
        initialTasks={[]}
        isManager={false}
        nowIso="2026-07-04T14:00:00.000Z"
        userName="Baraka Sales"
      />
    );

    expect(markup).toContain("Couldn&#x27;t load your task list");
    expect(markup).not.toContain("Today&#x27;s board has not been generated");
    expect(markup).not.toContain("No tasks are assigned to you right now");
  });

  it("removes broad board controls in technician mode and routes specialist work", () => {
    const markup = renderToStaticMarkup(
      <MyTasksScreen
        boardDate="2026-07-04"
        boardExists
        currentUserId="mechanic-1"
        fullBoardHref="/board?date=2026-07-04"
        generatedAt={null}
        generationStatus="GENERATED"
        initialTasks={[createTask("repair", { workflowArea: WorkflowArea.SHOP })]}
        isManager={false}
        nowIso="2026-07-04T14:00:00.000Z"
        specialistHrefByTask={{
          repair: "/vehicles/repair-jobs/job-1/workbench"
        }}
        technicianMode
        userName="Walter Mechanic"
      />
    );

    expect(markup).toContain("Assigned Tasks");
    expect(markup).toContain("/my-tasks/available");
    expect(markup).toContain("/vehicles/repair-jobs/job-1/workbench");
    expect(markup).not.toContain("Open full board");
    expect(markup).not.toContain("Task Intake");
  });
});
