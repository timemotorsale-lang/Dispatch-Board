import {
  BoardGenerationStatus,
  BusinessDay,
  TaskSourceType,
  TaskStatus,
  WorkflowArea
} from "@prisma/client";
import { describe, expect, it } from "vitest";

import type { BoardReadRepository } from "@/server/repositories/board-read-repository";
import { getManagerReviewViewModelForToday } from "@/server/services/manager-review";
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
          title: "Photo vehicle",
          description: "",
          status: TaskStatus.READY_FOR_REVIEW,
          dueAt: new Date("2026-06-18T16:00:00.000Z"),
          workflowArea: WorkflowArea.MARKETING,
          sourceType: TaskSourceType.TEMPLATE,
          requiresManagerApproval: true,
          templateSnapshot: null,
          updateFieldValues: null,
          vehicleReference: "2021 Explorer",
          customerReference: null,
          blockerReason: null,
          readyForReviewAt: new Date("2026-06-18T15:20:00.000Z"),
          completedAt: null,
          assignedUser: {
            id: "user-riley.marketing@local.test",
            name: "Riley Marketing",
            email: "riley.marketing@local.test"
          },
          recommendedUser: null,
          recommendationReasonCode: null,
          recommendationExplanation: null
        },
        {
          id: "task-2",
          title: "Call insurance partner",
          description: "",
          status: TaskStatus.BLOCKED,
          dueAt: new Date("2026-06-18T17:00:00.000Z"),
          workflowArea: WorkflowArea.ADMIN,
          sourceType: TaskSourceType.MANAGER,
          requiresManagerApproval: true,
          templateSnapshot: null,
          updateFieldValues: null,
          vehicleReference: null,
          customerReference: null,
          blockerReason: "Waiting on signed paperwork.",
          readyForReviewAt: null,
          completedAt: null,
          assignedUser: {
            id: "user-office@local.test",
            name: "Office Staff",
            email: "user-office@local.test"
          },
          recommendedUser: null,
          recommendationReasonCode: null,
          recommendationExplanation: null
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

describe("manager review service", () => {
  it("returns only approval-ready tasks for managers", async () => {
    const { usersByEmail } = await createTestAuthStore();
    const managerUser = usersByEmail.get("morgan.manager@local.test") ?? null;

    const result = await getManagerReviewViewModelForToday(managerUser, {
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
          status: TaskStatus.READY_FOR_REVIEW
        }
      ]
    });
    expect(result.tasks).toHaveLength(1);
    expect(result.attentionBuckets).toHaveLength(3);
    expect(result.attentionBuckets[0]).toMatchObject({
      label: "Blocked",
      tasks: [
        {
          id: "task-2",
          status: TaskStatus.BLOCKED
        }
      ]
    });
  });

  it("rejects non-manager access", async () => {
    const { usersByEmail } = await createTestAuthStore();
    const staffUser = usersByEmail.get("jordan.sales@local.test") ?? null;

    await expect(
      getManagerReviewViewModelForToday(staffUser, {
        repository: createBoardReadRepositoryHarness(),
        appSettingsRepository: createAppSettingsRepository(),
        now: () => new Date("2026-06-18T16:00:00.000Z")
      })
    ).rejects.toThrow("Manager review access required.");
  });
});
