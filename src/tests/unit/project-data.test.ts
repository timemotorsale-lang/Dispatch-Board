import { describe, expect, it } from "vitest";

import {
  getProjectCardSummary,
  getProjectSlugForTask,
  getProjectStageColumns
} from "@/features/projects/project-data";
import type { BoardReadTask } from "@/server/services/board-read";

function createTask(id: string, overrides: Partial<BoardReadTask> = {}): BoardReadTask {
  return {
    id,
    title: `Task ${id}`,
    description: null,
    status: "NOT_STARTED",
    dueAt: "2026-07-03T15:00:00.000Z",
    updatedAt: "2026-07-03T13:00:00.000Z",
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

describe("project data", () => {
  it("maps documentation-oriented admin tasks into the documentation project", () => {
    const task = createTask("1", {
      workflowArea: "ADMIN",
      title: "Resolve title paperwork issue"
    });

    expect(getProjectSlugForTask(task)).toBe("documentation-compliance");
  });

  it("aggregates project cards with real stats from board tasks", () => {
    const summary = getProjectCardSummary(
      [
        createTask("1", { workflowArea: "SHOP", status: "BLOCKED" }),
        createTask("2", { workflowArea: "SHOP", status: "READY_FOR_REVIEW" }),
        createTask("3", { workflowArea: "SHOP", status: "COMPLETED" })
      ],
      "service-repair-shop"
    );

    expect(summary).not.toBeNull();
    expect(summary?.stats.blocked).toBe(1);
    expect(summary?.stats.readyForReview).toBe(1);
    expect(summary?.stats.completedToday).toBe(1);
  });

  it("builds project board columns from stage keywords and status fallbacks", () => {
    const columns = getProjectStageColumns("sales", [
      createTask("1", { title: "New lead follow-up", workflowArea: "SALES" }),
      createTask("2", { title: "Customer test drive scheduled", workflowArea: "SALES" }),
      createTask("3", { title: "Delivery paperwork", workflowArea: "SALES", status: "COMPLETED" })
    ]);

    expect(columns.find((column) => column.label === "New Lead")?.tasks).toHaveLength(1);
    expect(columns.find((column) => column.label === "Test Drive")?.tasks).toHaveLength(1);
    expect(columns.find((column) => column.label === "Sold / Delivery")?.tasks).toHaveLength(1);
  });
});
