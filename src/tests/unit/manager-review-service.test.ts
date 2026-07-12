import {
  BoardGenerationStatus,
  BusinessDay,
  TaskSourceType,
  TaskStatus,
  TaskTemplatePriority,
  WorkflowArea
} from "@prisma/client";
import { describe, expect, it } from "vitest";

import type { BoardReadRepository } from "@/server/repositories/board-read-repository";
import type { BoardReadTask } from "@/server/services/board-read";
import {
  createManagerReviewCommandItems,
  getManagerReviewViewModelForToday
} from "@/server/services/manager-review";
import { createTestAuthStore } from "@/tests/support/auth-test-store";

function createBoardReadTask(
  id: string,
  overrides: Partial<BoardReadTask> = {}
): BoardReadTask {
  return {
    id,
    title: `Task ${id}`,
    description: "Keep the current workflow moving.",
    status: TaskStatus.READY_FOR_REVIEW,
    priority: TaskTemplatePriority.MEDIUM,
    dueAt: "2026-06-18T18:00:00.000Z",
    updatedAt: "2026-06-18T15:00:00.000Z",
    workflowArea: WorkflowArea.SALES,
    sourceType: TaskSourceType.TEMPLATE,
    requiresManagerApproval: true,
    isClaimable: false,
    requiredUpdateFields: [],
    updateFieldValues: {},
    assignedUser: {
      id: `user-${id}`,
      name: `User ${id}`,
      email: `user-${id}@local.test`
    },
    recommendedUser: null,
    recommendation: null,
    vehicleReference: null,
    customerReference: null,
    blockerReason: null,
    readyForReviewAt: "2026-06-18T15:20:00.000Z",
    completedAt: null,
    ...overrides
  };
}

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
          priority: TaskTemplatePriority.MEDIUM,
          dueAt: new Date("2026-06-18T16:00:00.000Z"),
          updatedAt: new Date("2026-06-18T15:30:00.000Z"),
          workflowArea: WorkflowArea.MARKETING,
          sourceType: TaskSourceType.TEMPLATE,
          requiresManagerApproval: true,
          isClaimable: false,
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
          priority: TaskTemplatePriority.HIGH,
          dueAt: new Date("2026-06-18T17:00:00.000Z"),
          updatedAt: new Date("2026-06-18T15:45:00.000Z"),
          workflowArea: WorkflowArea.ADMIN,
          sourceType: TaskSourceType.MANAGER,
          requiresManagerApproval: true,
          isClaimable: false,
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
  it("creates one command item per supported queue without duplicating multi-signal tasks", () => {
    const commandItems = createManagerReviewCommandItems(
      [
        createBoardReadTask("ready"),
        createBoardReadTask("blocked", {
          status: TaskStatus.BLOCKED,
          isClaimable: true,
          blockerReason: "Waiting for a manager decision."
        }),
        createBoardReadTask("parts", {
          status: TaskStatus.WAITING_ON_PARTS
        }),
        createBoardReadTask("approval", {
          status: TaskStatus.WAITING_ON_APPROVAL
        }),
        createBoardReadTask("assignment", {
          status: TaskStatus.NOT_STARTED,
          isClaimable: true,
          requiresManagerApproval: false
        }),
        createBoardReadTask("completed", {
          status: TaskStatus.COMPLETED
        }),
        createBoardReadTask("optional-review", {
          requiresManagerApproval: false
        })
      ],
      new Date("2026-06-18T16:00:00.000Z")
    );

    expect(commandItems.map((item) => item.queue)).toEqual([
      "WAITING_ON_APPROVAL",
      "BLOCKED",
      "WAITING_ON_PARTS",
      "READY_FOR_REVIEW",
      "NEEDS_ASSIGNMENT"
    ]);
    expect(commandItems.map((item) => item.task.id)).toHaveLength(5);
    expect(new Set(commandItems.map((item) => item.task.id)).size).toBe(commandItems.length);
    expect(commandItems.filter((item) => item.task.id === "blocked")).toHaveLength(1);
  });

  it("reports required submission update completion and explains missing evidence", () => {
    const [commandItem] = createManagerReviewCommandItems(
      [
        createBoardReadTask("evidence", {
          requiredUpdateFields: [
            {
              key: "inspection_note",
              label: "Inspection note",
              type: "long_text",
              required: true,
              helpText: null
            },
            {
              key: "customer_contacted",
              label: "Customer contacted",
              type: "boolean",
              required: true,
              helpText: null
            },
            {
              key: "final_qc",
              label: "Final QC evidence",
              type: "short_text",
              required: true,
              helpText: null
            },
            {
              key: "optional_note",
              label: "Optional note",
              type: "short_text",
              required: false,
              helpText: null
            }
          ],
          updateFieldValues: {
            inspection_note: "Inspection passed.",
            customer_contacted: false,
            final_qc: "   "
          }
        })
      ],
      new Date("2026-06-18T16:00:00.000Z")
    );

    expect(commandItem).toMatchObject({
      requiredUpdateCount: 3,
      completedRequiredUpdateCount: 2,
      missingRequiredUpdateCount: 1,
      attentionReason: "1 required submission update is missing."
    });
  });

  it("orders current command work deterministically by task priority, due time, then id", () => {
    const commandItems = createManagerReviewCommandItems(
      [
        createBoardReadTask("medium", {
          priority: TaskTemplatePriority.MEDIUM,
          dueAt: "2026-06-18T12:00:00.000Z"
        }),
        createBoardReadTask("high-late", {
          priority: TaskTemplatePriority.HIGH,
          dueAt: "2026-06-18T14:00:00.000Z"
        }),
        createBoardReadTask("high-early-b", {
          priority: TaskTemplatePriority.HIGH,
          dueAt: "2026-06-18T13:00:00.000Z"
        }),
        createBoardReadTask("low", {
          priority: TaskTemplatePriority.LOW,
          dueAt: "2026-06-18T11:00:00.000Z"
        }),
        createBoardReadTask("critical", {
          priority: TaskTemplatePriority.CRITICAL,
          dueAt: "2026-06-18T15:00:00.000Z"
        }),
        createBoardReadTask("high-early-a", {
          priority: TaskTemplatePriority.HIGH,
          dueAt: "2026-06-18T13:00:00.000Z"
        })
      ],
      new Date("2026-06-18T10:00:00.000Z")
    );

    expect(commandItems.map((item) => item.task.id)).toEqual([
      "critical",
      "high-early-a",
      "high-early-b",
      "high-late",
      "medium",
      "low"
    ]);
  });

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
