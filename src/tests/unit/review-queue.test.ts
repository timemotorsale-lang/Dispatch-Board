import { describe, expect, it } from "vitest";

import { getReviewQueueTasks } from "@/features/board/review-queue";
import type { BoardReadTask } from "@/server/services/board-read";

function task(id: string, status: string, requiresManagerApproval: boolean): BoardReadTask {
  return { id, title: id, description: null, status, dueAt: "2026-06-21T17:00:00.000Z", workflowArea: "SALES", sourceType: "STAFF", requiresManagerApproval, assignedUser: { id: "user-1", name: "Jordan" }, recommendedUser: null, recommendationReasonCode: null, recommendationReasonText: null, recommendationReviewNeeded: false, vehicleReference: null, customerReference: null, blockerReason: null, readyForReviewAt: "2026-06-21T16:00:00.000Z", completedAt: null };
}

describe("review queue", () => {
  it("includes only ready-for-review tasks and prioritizes approval-required work", () => {
    const tasks = getReviewQueueTasks([task("optional", "READY_FOR_REVIEW", false), task("completed", "COMPLETED", true), task("required", "READY_FOR_REVIEW", true)]);
    expect(tasks.map((item) => item.id)).toEqual(["required", "optional"]);
  });

  it("returns an empty queue when nothing is ready for review", () => {
    expect(getReviewQueueTasks([task("active", "IN_PROGRESS", true)])).toEqual([]);
  });
});
