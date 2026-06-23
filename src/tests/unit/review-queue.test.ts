import { TaskStatus } from "@prisma/client";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { buildReviewActionPayload, getReviewQueueTasks, ReviewQueue } from "@/features/board/review-queue";
import type { BoardReadTask } from "@/server/services/board-read";

function createTask(overrides: Partial<BoardReadTask> = {}): BoardReadTask {
  return {
    id: "task-1",
    title: "Confirm vehicle ready for sale",
    description: "Final manager review",
    status: TaskStatus.READY_FOR_REVIEW,
    dueAt: "2026-06-22T19:00:00.000Z",
    workflowArea: "INVENTORY",
    sourceType: "TEMPLATE",
    requiresManagerApproval: true,
    assignedUser: {
      id: "user-1",
      name: "Walter James",
      email: "walter@example.test"
    },
    recommendedUser: null,
    recommendationReasonCode: null,
    recommendationReasonText: null,
    recommendationReviewNeeded: false,
    vehicleReference: "Stock #TMS-1023",
    customerReference: null,
    blockerReason: null,
    readyForReviewAt: "2026-06-22T16:00:00.000Z",
    completedAt: null,
    ...overrides
  };
}

describe("review queue", () => {
  it("returns only Ready for Review tasks and prioritizes approval-required work", () => {
    const tasks = [
      createTask({ id: "completed", status: TaskStatus.COMPLETED }),
      createTask({ id: "optional-review", requiresManagerApproval: false, readyForReviewAt: "2026-06-22T14:00:00.000Z" }),
      createTask({ id: "approval-review", requiresManagerApproval: true, readyForReviewAt: "2026-06-22T15:00:00.000Z" })
    ];

    expect(getReviewQueueTasks(tasks).map((task) => task.id)).toEqual([
      "approval-review",
      "optional-review"
    ]);
  });

  it("builds status payloads for approve and reopen actions", () => {
    expect(buildReviewActionPayload("approve")).toEqual({ status: TaskStatus.COMPLETED });
    expect(buildReviewActionPayload("reopen")).toEqual({ status: TaskStatus.IN_PROGRESS });
  });

  it("renders review tasks and manager controls for managers", () => {
    const markup = renderToStaticMarkup(
      createElement(ReviewQueue, {
        isManager: true,
        onReviewActionComplete: () => undefined,
        tasks: [createTask()]
      })
    );

    expect(markup).toContain("Review Queue");
    expect(markup).toContain("1 waiting");
    expect(markup).toContain("Confirm vehicle ready for sale");
    expect(markup).toContain("Stock #TMS-1023");
    expect(markup).toContain("Approve");
    expect(markup).toContain("Reopen");
  });

  it("shows an empty state when no tasks are ready for review", () => {
    const markup = renderToStaticMarkup(
      createElement(ReviewQueue, {
        isManager: true,
        onReviewActionComplete: () => undefined,
        tasks: [createTask({ status: TaskStatus.IN_PROGRESS })]
      })
    );

    expect(markup).toContain("0 waiting");
    expect(markup).toContain("No tasks are ready for manager review.");
  });

  it("does not render manager approval controls for staff", () => {
    const markup = renderToStaticMarkup(
      createElement(ReviewQueue, {
        isManager: false,
        onReviewActionComplete: () => undefined,
        tasks: [createTask()]
      })
    );

    expect(markup).toBe("");
  });
});
