import {
  BoardGenerationStatus,
  BusinessDay,
  TaskSourceType,
  TaskStatus,
  WorkflowArea,
  type AppSetting
} from "@prisma/client";
import { describe, expect, it } from "vitest";

import type { BoardReadRepository } from "@/server/repositories/board-read-repository";
import {
  getBoardReadModelForDate,
  getBoardReadModelForToday
} from "@/server/services/board-read";
import { createTestAuthStore } from "@/tests/support/auth-test-store";

function createBoardReadRepositoryHarness(options: {
  boardDays?: Array<{
    id: string;
    date: string;
    generationStatus?: BoardGenerationStatus;
    generatedAt?: string | null;
  }>;
  tasksByBoardDayId?: Record<
    string,
    Array<{
      id: string;
      title: string;
      description?: string;
      status?: TaskStatus;
      dueAt: string;
      workflowArea?: WorkflowArea;
      sourceType?: TaskSourceType;
      requiresManagerApproval?: boolean;
      assignedUser: {
        id: string;
        name: string;
        email: string;
      };
      recommendedUser?: {
        id: string;
        name: string;
        email: string;
      } | null;
      recommendationReasonCode?: string | null;
      recommendationExplanation?: string | null;
      vehicleReference?: string | null;
      customerReference?: string | null;
      blockerReason?: string | null;
      readyForReviewAt?: string | null;
      completedAt?: string | null;
    }>
  >;
} = {}) {
  const boardDays =
    options.boardDays?.map((boardDay) => ({
      id: boardDay.id,
      date: new Date(`${boardDay.date}T00:00:00.000Z`),
      generationStatus: boardDay.generationStatus ?? BoardGenerationStatus.GENERATED,
      generatedAt: boardDay.generatedAt ? new Date(boardDay.generatedAt) : null
    })) ?? [];
  const tasksByBoardDayId = new Map(
    Object.entries(options.tasksByBoardDayId ?? {}).map(([boardDayId, tasks]) => [
      boardDayId,
      tasks.map((task) => ({
        id: task.id,
        title: task.title,
        description: task.description ?? "",
        status: task.status ?? TaskStatus.NOT_STARTED,
        dueAt: new Date(task.dueAt),
        workflowArea: task.workflowArea ?? WorkflowArea.SALES,
        sourceType: task.sourceType ?? TaskSourceType.TEMPLATE,
        requiresManagerApproval: task.requiresManagerApproval ?? false,
        vehicleReference: task.vehicleReference ?? null,
        customerReference: task.customerReference ?? null,
        blockerReason: task.blockerReason ?? null,
        readyForReviewAt: task.readyForReviewAt ? new Date(task.readyForReviewAt) : null,
        completedAt: task.completedAt ? new Date(task.completedAt) : null,
        assignedUser: task.assignedUser,
        recommendedUser: task.recommendedUser ?? null,
        recommendationReasonCode: task.recommendationReasonCode ?? null,
        recommendationExplanation: task.recommendationExplanation ?? null
      }))
    ])
  );

  const repository: BoardReadRepository = {
    async findBoardDayByDate(boardDate) {
      return (
        boardDays.find((candidate) => candidate.date.toISOString().slice(0, 10) === boardDate) ??
        null
      );
    },
    async listTasksForBoardDay(boardDayId) {
      return tasksByBoardDayId.get(boardDayId) ?? [];
    }
  };

  return {
    repository
  };
}

function createAppSettingsRepository() {
  const settings: AppSetting = {
    id: "dispatch-board-settings",
    dailyGenerationTime: "09:00",
    timezone: "America/Chicago",
    businessDays: [
      BusinessDay.MONDAY,
      BusinessDay.TUESDAY,
      BusinessDay.WEDNESDAY,
      BusinessDay.THURSDAY,
      BusinessDay.FRIDAY,
      BusinessDay.SATURDAY
    ],
    createdAt: new Date("2026-06-17T08:00:00.000Z"),
    updatedAt: new Date("2026-06-17T08:00:00.000Z")
  };

  return {
    async getOrCreateAppSettings() {
      return settings;
    },
    async updateAppSettings() {
      return settings;
    }
  };
}

describe("board read service", () => {
  it("returns a normalized board read model for an authenticated staff user", async () => {
    const { usersByEmail } = await createTestAuthStore();
    const staffUser = usersByEmail.get("jordan.sales@local.test") ?? null;
    const harness = createBoardReadRepositoryHarness({
      boardDays: [
        {
          id: "board-day-1",
          date: "2026-06-17",
          generationStatus: BoardGenerationStatus.GENERATED,
          generatedAt: "2026-06-17T14:30:00.000Z"
        }
      ],
      tasksByBoardDayId: {
        "board-day-1": [
          {
            id: "task-1",
            title: "Follow up with hot lead",
            description: "Call the customer before noon.",
            dueAt: "2026-06-17T15:00:00.000Z",
            workflowArea: WorkflowArea.SALES,
            sourceType: TaskSourceType.TEMPLATE,
            assignedUser: {
              id: "user-sales",
              name: "Jordan Sales",
              email: "jordan.sales@local.test"
            },
            recommendedUser: {
              id: "user-sales",
              name: "Jordan Sales",
              email: "jordan.sales@local.test"
            },
            recommendationReasonCode: "DIRECT_DUTY_MATCH",
            recommendationExplanation:
              "Recommended because this task matches the direct duty Follow up with assigned leads.",
            customerReference: "Taylor R.",
            status: TaskStatus.IN_PROGRESS
          },
          {
            id: "task-2",
            title: "Review blocked listing",
            description: "",
            dueAt: "2026-06-17T17:00:00.000Z",
            workflowArea: WorkflowArea.ADVERTISING,
            sourceType: TaskSourceType.MANAGER,
            requiresManagerApproval: true,
            assignedUser: {
              id: "user-ops",
              name: "Avery Ops",
              email: "avery.ops@local.test"
            },
            vehicleReference: "2019 Camry",
            blockerReason: "Missing photo set",
            status: TaskStatus.BLOCKED
          }
        ]
      }
    });

    const result = await getBoardReadModelForDate(staffUser, "2026-06-17", {
      repository: harness.repository
    });

    expect(result).toMatchObject({
      date: "2026-06-17",
      board: {
        id: "board-day-1",
        date: "2026-06-17",
        generationStatus: "GENERATED",
        taskCount: 2,
        statusCounts: {
          IN_PROGRESS: 1,
          BLOCKED: 1
        },
        sourceCounts: {
          template: 1,
          manager: 1,
          staff: 0
        },
        tasks: [
          {
            id: "task-1",
            title: "Follow up with hot lead",
            customerReference: "Taylor R.",
            recommendation: {
              reasonCode: "DIRECT_DUTY_MATCH",
              explanation:
                "Recommended because this task matches the direct duty Follow up with assigned leads."
            },
            recommendedUser: {
              id: "user-sales",
              name: "Jordan Sales",
              email: "jordan.sales@local.test"
            }
          },
          {
            id: "task-2",
            title: "Review blocked listing",
            description: null,
            blockerReason: "Missing photo set",
            vehicleReference: "2019 Camry"
          }
        ]
      }
    });
    expect(result.board?.generatedAt).toBe("2026-06-17T14:30:00.000Z");
  });

  it("returns a null board for valid dates that do not exist yet", async () => {
    const { usersByEmail } = await createTestAuthStore();
    const manager = usersByEmail.get("morgan.manager@local.test") ?? null;
    const harness = createBoardReadRepositoryHarness();

    const result = await getBoardReadModelForDate(manager, "2026-06-18", {
      repository: harness.repository
    });

    expect(result).toEqual({
      date: "2026-06-18",
      board: null
    });
  });

  it("rejects invalid board dates before querying the repository", async () => {
    const { usersByEmail } = await createTestAuthStore();
    const manager = usersByEmail.get("morgan.manager@local.test") ?? null;
    const harness = createBoardReadRepositoryHarness();

    await expect(
      getBoardReadModelForDate(manager, "2026-13-99", {
        repository: harness.repository
      })
    ).rejects.toThrow("Board date must be a valid calendar date.");
  });

  it("rejects unauthenticated board reads", async () => {
    const harness = createBoardReadRepositoryHarness();

    await expect(
      getBoardReadModelForDate(null, "2026-06-17", {
        repository: harness.repository
      })
    ).rejects.toThrow("Authentication required.");
  });

  it("resolves today's board using the configured timezone", async () => {
    const { usersByEmail } = await createTestAuthStore();
    const manager = usersByEmail.get("morgan.manager@local.test") ?? null;
    const harness = createBoardReadRepositoryHarness({
      boardDays: [
        {
          id: "board-day-2",
          date: "2026-06-17"
        }
      ]
    });

    const result = await getBoardReadModelForToday(manager, {
      repository: harness.repository,
      appSettingsRepository: createAppSettingsRepository(),
      now: () => new Date("2026-06-18T02:30:00.000Z")
    });

    expect(result).toEqual({
      date: "2026-06-17",
      board: expect.objectContaining({
        id: "board-day-2",
        date: "2026-06-17"
      })
    });
  });
});
