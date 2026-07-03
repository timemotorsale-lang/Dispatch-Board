import { TaskStatus } from "@prisma/client";
import { describe, expect, it } from "vitest";

import type { TaskReadRepository } from "@/server/repositories/task-read-repository";
import { getTaskReadModelById } from "@/server/services/task-read";
import { createTestAuthStore } from "@/tests/support/auth-test-store";

function createTaskReadRepository(): TaskReadRepository {
  return {
    async findTaskById(taskId) {
      if (taskId !== "task-1") {
        return null;
      }

      return {
        id: "task-1",
        title: "Review hot lead",
        description: "Call before lunch.",
        status: TaskStatus.IN_PROGRESS,
        dueAt: new Date("2026-06-18T16:00:00.000Z"),
        workflowArea: "SALES",
        sourceType: "MANAGER",
        requiresManagerApproval: true,
        vehicleReference: "2019 Camry",
        customerReference: "Taylor R.",
        blockerReason: null,
        readyForReviewAt: null,
        completedAt: null,
        createdAt: new Date("2026-06-18T13:00:00.000Z"),
        updatedAt: new Date("2026-06-18T15:00:00.000Z"),
        boardDay: {
          id: "board-day-1",
          date: new Date("2026-06-18T00:00:00.000Z")
        },
        assignedUser: {
          id: "user-sales",
          name: "Baraka Sales",
          email: "jordan.sales@local.test"
        },
        recommendedUser: null,
        recommendationReasonCode: null,
        recommendationExplanation: null,
        createdByUser: {
          id: "user-manager",
          name: "Eli Manager",
          email: "morgan.manager@local.test"
        },
        reviewedByUser: null,
        comments: [
          {
            id: "comment-1",
            taskId: "task-1",
            authorUserId: "user-manager",
            body: "Call logged with lender.\nWaiting on approval.",
            createdAt: new Date("2026-06-18T14:15:00.000Z"),
            authorUser: {
              id: "user-manager",
              name: "Eli Manager",
              email: "morgan.manager@local.test"
            }
          }
        ]
      };
    }
  };
}

describe("task read service", () => {
  it("returns a normalized task detail read model for authenticated users", async () => {
    const { usersByEmail } = await createTestAuthStore();
    const staffUser = usersByEmail.get("jordan.sales@local.test") ?? null;

    const result = await getTaskReadModelById(staffUser, "task-1", createTaskReadRepository());

    expect(result).toEqual({
      id: "task-1",
      boardDayId: "board-day-1",
      boardDate: "2026-06-18",
      title: "Review hot lead",
      description: "Call before lunch.",
      status: "IN_PROGRESS",
      dueAt: "2026-06-18T16:00:00.000Z",
      workflowArea: "SALES",
      sourceType: "MANAGER",
      requiresManagerApproval: true,
      vehicleReference: "2019 Camry",
      customerReference: "Taylor R.",
      blockerReason: null,
      readyForReviewAt: null,
      completedAt: null,
      createdAt: "2026-06-18T13:00:00.000Z",
      updatedAt: "2026-06-18T15:00:00.000Z",
      assignedUser: {
        id: "user-sales",
        name: "Baraka Sales",
        email: "jordan.sales@local.test"
      },
      recommendedUser: null,
      recommendation: null,
      createdByUser: {
        id: "user-manager",
        name: "Eli Manager",
        email: "morgan.manager@local.test"
      },
      reviewedByUser: null,
      comments: [
        {
          id: "comment-1",
          taskId: "task-1",
          authorUserId: "user-manager",
          body: "Call logged with lender.\nWaiting on approval.",
          createdAt: "2026-06-18T14:15:00.000Z",
          author: {
            id: "user-manager",
            name: "Eli Manager",
            email: "morgan.manager@local.test"
          }
        }
      ]
    });
  });

  it("returns null when the task does not exist", async () => {
    const { usersByEmail } = await createTestAuthStore();
    const managerUser = usersByEmail.get("morgan.manager@local.test") ?? null;

    await expect(
      getTaskReadModelById(managerUser, "missing-task", createTaskReadRepository())
    ).resolves.toBeNull();
  });
});
