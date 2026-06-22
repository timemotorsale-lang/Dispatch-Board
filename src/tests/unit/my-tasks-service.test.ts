import {
  BoardGenerationStatus,
  BusinessDay,
  TaskSourceType,
  TaskStatus,
  WorkflowArea
} from "@prisma/client";
import { describe, expect, it } from "vitest";

import type { BoardReadRepository } from "@/server/repositories/board-read-repository";
import { getMyTasksViewModelForToday } from "@/server/services/my-tasks";
import { createTestAuthStore } from "@/tests/support/auth-test-store";

function createBoardReadRepositoryHarness(): BoardReadRepository {
  return {
    async findBoardDayByDate() {
      return {
        id: "board-day-1",
        date: new Date("2026-06-18T00:00:00.000Z"),
        generationStatus: BoardGenerationStatus.GENERATED,
        generatedAt: new Date("2026-06-18T13:30:00.000Z")
      };
    },
    async listTasksForBoardDay() {
      return [
        {
          id: "task-1",
          title: "Call hot lead",
          description: "",
          status: TaskStatus.IN_PROGRESS,
          dueAt: new Date("2026-06-18T16:00:00.000Z"),
          workflowArea: WorkflowArea.SALES,
          sourceType: TaskSourceType.TEMPLATE,
          requiresManagerApproval: false,
          vehicleReference: null,
          customerReference: "Taylor R.",
          blockerReason: null,
          readyForReviewAt: null,
          completedAt: null,
          assignedUser: {
            id: "user-jordan.sales@local.test",
            name: "Jordan Sales",
            email: "jordan.sales@local.test"
          },
          recommendedUser: null
          ,recommendationReasonCode: null
          ,recommendationReasonText: null
          ,recommendationReviewNeeded: false
        },
        {
          id: "task-2",
          title: "Repair brake system",
          description: "",
          status: TaskStatus.BLOCKED,
          dueAt: new Date("2026-06-18T17:00:00.000Z"),
          workflowArea: WorkflowArea.SHOP,
          sourceType: TaskSourceType.MANAGER,
          requiresManagerApproval: true,
          vehicleReference: "2018 F-150",
          customerReference: null,
          blockerReason: "Waiting on parts",
          readyForReviewAt: null,
          completedAt: null,
          assignedUser: {
            id: "user-casey.mechanic@local.test",
            name: "Casey Mechanic",
            email: "casey.mechanic@local.test"
          },
          recommendedUser: null
          ,recommendationReasonCode: null
          ,recommendationReasonText: null
          ,recommendationReviewNeeded: false
        }
      ];
    }
  };
}

function createAppSettingsRepository() {
  return {
    async getOrCreateAppSettings() {
      return {
        id: "dispatch-board-settings",
        dailyGenerationTime: "09:00",
        timezone: "America/Chicago",
        businessDays: [BusinessDay.MONDAY],
        createdAt: new Date("2026-06-17T08:00:00.000Z"),
        updatedAt: new Date("2026-06-17T08:00:00.000Z")
      };
    },
    async updateAppSettings() {
      throw new Error("Not implemented.");
    }
  };
}

describe("my tasks service", () => {
  it("returns only the current user's assigned tasks for today", async () => {
    const { usersByEmail } = await createTestAuthStore();
    const staffUser = usersByEmail.get("jordan.sales@local.test") ?? null;

    const result = await getMyTasksViewModelForToday(staffUser, {
      repository: createBoardReadRepositoryHarness(),
      appSettingsRepository: createAppSettingsRepository(),
      now: () => new Date("2026-06-18T16:00:00.000Z")
    });

    expect(result).toMatchObject({
      date: "2026-06-18",
      boardExists: true,
      boardId: "board-day-1",
      tasks: [
        {
          id: "task-1",
          assignedUser: {
            id: "user-jordan.sales@local.test"
          }
        }
      ]
    });
    expect(result.tasks).toHaveLength(1);
  });
});
