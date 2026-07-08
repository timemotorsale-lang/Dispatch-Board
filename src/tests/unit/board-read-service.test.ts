import {
  BoardGenerationStatus,
  BusinessDay,
  GenerationRunStatus,
  GenerationTriggerType,
  Prisma,
  SchedulerAttemptState,
  SchedulerAuthorizationOutcome,
  SchedulerTriggerSource,
  TaskSourceType,
  TaskStatus,
  WorkflowArea,
  type AppSetting
} from "@prisma/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { BoardReadRepository } from "@/server/repositories/board-read-repository";
import type { SchedulerAttemptsRepository } from "@/server/repositories/scheduler-attempts-repository";
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
      templateSnapshot?: unknown;
      updateFieldValues?: unknown;
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
        templateSnapshot: task.templateSnapshot ?? null,
        updateFieldValues: task.updateFieldValues ?? null,
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

function createGenerationRunsRepository(
  runs: Array<{
    id: string;
    boardDate: string;
    startedAt: string;
    finishedAt?: string | null;
    status: GenerationRunStatus;
    triggeredBy: GenerationTriggerType;
    triggeredByUserId?: string | null;
    summary: Prisma.JsonValue;
    errorMessage?: string | null;
  }> = []
) {
  return {
    async listGenerationRunsForDate(boardDate: string) {
      return runs
        .filter((run) => run.boardDate === boardDate)
        .map((run) => ({
          id: run.id,
          boardDate: new Date(`${run.boardDate}T00:00:00.000Z`),
          startedAt: new Date(run.startedAt),
          finishedAt: run.finishedAt ? new Date(run.finishedAt) : null,
          status: run.status,
          triggeredBy: run.triggeredBy,
          triggeredByUserId: run.triggeredByUserId ?? null,
          summary: run.summary,
          errorMessage: run.errorMessage ?? null
        }))
        .sort((left, right) => right.startedAt.getTime() - left.startedAt.getTime());
    }
  };
}

function createSchedulerAttemptsRepository(
  attempts: Array<{
    id: string;
    boardDate: string;
    receivedAt: string;
    completedAt?: string | null;
    attemptState: SchedulerAttemptState;
    authorizationOutcome: SchedulerAuthorizationOutcome;
    triggerSource?: SchedulerTriggerSource;
    generationRunId?: string | null;
    managerMessage: string;
    skipReasonCode?: string | null;
    unauthorizedReasonCode?: string | null;
    failureStage?: "PREFLIGHT" | "GENERATION_RUN" | "POST_RUN_FINALIZE" | null;
    failureCode?: string | null;
    failureDiagnostic?: Prisma.JsonValue | null;
    safeErrorMessage?: string | null;
  }> = []
): SchedulerAttemptsRepository {
  return {
    async createSchedulerAttempt() {
      throw new Error("Not implemented in test harness.");
    },
    async updateSchedulerAttempt() {
      throw new Error("Not implemented in test harness.");
    },
    async listSchedulerAttemptsForDate(boardDate: string) {
      return attempts
        .filter((attempt) => attempt.boardDate === boardDate)
        .map((attempt) => ({
          id: attempt.id,
          boardDate: new Date(`${attempt.boardDate}T00:00:00.000Z`),
          triggerType: GenerationTriggerType.SCHEDULED,
          triggerSource: attempt.triggerSource ?? SchedulerTriggerSource.PLATFORM_CRON,
          routePath: "/api/cron/generate-board",
          requestMethod: "GET",
          receivedAt: new Date(attempt.receivedAt),
          startedAt: null,
          completedAt: attempt.completedAt ? new Date(attempt.completedAt) : null,
          attemptState: attempt.attemptState,
          authorizationOutcome: attempt.authorizationOutcome,
          generationRunId: attempt.generationRunId ?? null,
          managerMessage: attempt.managerMessage,
          skipReasonCode: attempt.skipReasonCode ?? null,
          unauthorizedReasonCode: attempt.unauthorizedReasonCode ?? null,
          failureStage: attempt.failureStage ?? null,
          failureCode: attempt.failureCode ?? null,
          failureDiagnostic: attempt.failureDiagnostic ?? null,
          safeErrorMessage: attempt.safeErrorMessage ?? null,
          createdAt: new Date(attempt.receivedAt),
          updatedAt: new Date(attempt.completedAt ?? attempt.receivedAt)
        }));
    }
  };
}

function createAppSettingsRepository(overrides: Partial<AppSetting> = {}) {
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
    updatedAt: new Date("2026-06-17T08:00:00.000Z"),
    ...overrides
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

const originalCronSecret = process.env.CRON_SECRET;

describe("board read service", () => {
  beforeEach(() => {
    process.env.CRON_SECRET = "test-cron-secret";
  });

  afterEach(() => {
    if (typeof originalCronSecret === "string") {
      process.env.CRON_SECRET = originalCronSecret;
      return;
    }

    delete process.env.CRON_SECRET;
  });

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
              name: "Baraka Sales",
              email: "jordan.sales@local.test"
            },
            templateSnapshot: {
              requiredUpdateFields: [
                {
                  key: "customer_name",
                  label: "Customer name",
                  type: "short_text",
                  required: true,
                  helpText: null
                }
              ]
            },
            updateFieldValues: {
              customer_name: "Taylor R."
            },
            recommendedUser: {
              id: "user-sales",
              name: "Baraka Sales",
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
              name: "Ancilla Ops",
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
      repository: harness.repository,
      generationTasksRepository: createGenerationRunsRepository([
        {
          id: "generation-run-1",
          boardDate: "2026-06-17",
          startedAt: "2026-06-17T14:28:00.000Z",
          finishedAt: "2026-06-17T14:30:00.000Z",
          status: GenerationRunStatus.SUCCEEDED,
          triggeredBy: GenerationTriggerType.SCHEDULED,
          summary: {
            tasksCreated: 2,
            tasksSkippedAsDuplicates: 0,
            manualTasksPreserved: 0
          }
        }
      ]),
      schedulerAttemptsRepository: createSchedulerAttemptsRepository([
        {
          id: "scheduler-attempt-1",
          boardDate: "2026-06-17",
          receivedAt: "2026-06-17T14:28:00.000Z",
          completedAt: "2026-06-17T14:30:00.000Z",
          attemptState: SchedulerAttemptState.SUCCEEDED,
          authorizationOutcome: SchedulerAuthorizationOutcome.AUTHORIZED,
          generationRunId: "generation-run-1",
          managerMessage: "2 tasks created"
        }
      ]),
      appSettingsRepository: createAppSettingsRepository(),
      now: () => new Date("2026-06-17T15:30:00.000Z")
    });

    expect(result).toMatchObject({
      date: "2026-06-17",
      board: {
        id: "board-day-1",
        date: "2026-06-17",
        generationStatus: "GENERATED",
        latestGeneration: {
          generationRunId: "generation-run-1",
          status: "success",
          triggeredBy: "scheduled",
          attemptedAt: "2026-06-17T14:30:00.000Z",
          summary: "2 tasks created • 0 duplicates skipped • 0 manual tasks preserved"
        },
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
            requiredUpdateFields: [
              {
                key: "customer_name",
                label: "Customer name"
              }
            ],
            updateFieldValues: {
              customer_name: "Taylor R."
            },
            recommendation: {
              reasonCode: "DIRECT_DUTY_MATCH",
              explanation:
                "Recommended because this task matches the direct duty Follow up with assigned leads."
            },
            recommendedUser: {
              id: "user-sales",
              name: "Baraka Sales",
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
      },
      schedulerHealth: {
        status: "healthy",
        expectedToHaveRunByNow: true,
        needsAttention: false,
        guidance: {
          code: "healthy",
          actionRequired: false,
          safeToRetry: false
        },
        latestScheduledAttempt: {
          id: "scheduler-attempt-1",
          attemptState: "succeeded",
          generationRunId: "generation-run-1"
        },
        latestManualRun: null,
        lastSuccess: {
          generationRunId: "generation-run-1",
          triggeredBy: "scheduled"
        },
        latestSkipReason: null,
        unauthorizedSummary: null,
        readiness: {
          status: "ready"
        },
        boardGenerationStatus: {
          state: "generated",
          latestGenerationStatus: "success"
        }
      }
    });
    expect(result.board?.generatedAt).toBe("2026-06-17T14:30:00.000Z");
  });

  it("returns a null board for valid dates that do not exist yet", async () => {
    const { usersByEmail } = await createTestAuthStore();
    const manager = usersByEmail.get("morgan.manager@local.test") ?? null;
    const harness = createBoardReadRepositoryHarness();

    const result = await getBoardReadModelForDate(manager, "2026-06-18", {
      repository: harness.repository,
      schedulerAttemptsRepository: createSchedulerAttemptsRepository([]),
      appSettingsRepository: createAppSettingsRepository(),
      now: () => new Date("2026-06-18T15:30:00.000Z")
    });

    expect(result).toMatchObject({
      date: "2026-06-18",
      board: null,
      schedulerHealth: {
        status: "attention",
        expectedToHaveRunByNow: true,
        needsAttention: true,
        guidance: {
          code: "no_scheduled_evidence",
          actionRequired: true,
          safeToRetry: true,
          retryLabel: "Generate Board Manually"
        },
        managerMessage: "No scheduled generation evidence has been recorded for 2026-06-18 yet.",
        nextStepMessage:
          "Verify the production scheduler is enabled and that cron requests are reaching the app.",
        latestScheduledAttempt: null,
        latestManualRun: null,
        lastSuccess: null,
        lastFailure: null,
        latestSkipReason: null,
        unauthorizedSummary: null,
        readiness: {
          status: "attention"
        },
        boardGenerationStatus: {
          state: "not_created",
          generatedAt: null,
          latestGenerationStatus: "none"
        }
      }
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
      schedulerAttemptsRepository: createSchedulerAttemptsRepository([]),
      now: () => new Date("2026-06-18T02:30:00.000Z")
    });

    expect(result).toEqual({
      date: "2026-06-17",
      board: expect.objectContaining({
        id: "board-day-2",
        date: "2026-06-17"
      }),
      schedulerHealth: expect.objectContaining({
        boardGenerationStatus: {
          state: "generated",
          generatedAt: null,
          latestGenerationStatus: "none"
        }
      })
    });
  });

  it("surfaces repeated unauthorized scheduled requests as a manager-visible signal", async () => {
    const { usersByEmail } = await createTestAuthStore();
    const manager = usersByEmail.get("morgan.manager@local.test") ?? null;
    const harness = createBoardReadRepositoryHarness();

    const result = await getBoardReadModelForDate(manager, "2026-06-18", {
      repository: harness.repository,
      schedulerAttemptsRepository: createSchedulerAttemptsRepository([
        {
          id: "scheduler-attempt-2",
          boardDate: "2026-06-18",
          receivedAt: "2026-06-18T15:01:00.000Z",
          completedAt: "2026-06-18T15:01:02.000Z",
          attemptState: SchedulerAttemptState.UNAUTHORIZED,
          authorizationOutcome: SchedulerAuthorizationOutcome.UNAUTHORIZED,
          managerMessage: "Scheduled request was blocked because the cron secret did not match.",
          unauthorizedReasonCode: "SECRET_MISMATCH"
        },
        {
          id: "scheduler-attempt-1",
          boardDate: "2026-06-18",
          receivedAt: "2026-06-18T14:59:00.000Z",
          completedAt: "2026-06-18T14:59:01.000Z",
          attemptState: SchedulerAttemptState.UNAUTHORIZED,
          authorizationOutcome: SchedulerAuthorizationOutcome.UNAUTHORIZED,
          managerMessage: "Scheduled request was blocked because the cron secret did not match.",
          unauthorizedReasonCode: "SECRET_MISMATCH"
        }
      ]),
      appSettingsRepository: createAppSettingsRepository(),
      now: () => new Date("2026-06-18T15:30:00.000Z")
    });

    expect(result.schedulerHealth).toMatchObject({
      status: "attention",
      guidance: {
        code: "unauthorized_scheduled_request",
        actionRequired: true,
        safeToRetry: true,
        retryLabel: "Generate Board Manually"
      },
      unauthorizedSummary: {
        count: 2,
        repeated: true,
        latestReasonCode: "SECRET_MISMATCH"
      },
      readiness: {
        status: "ready"
      }
    });
  });

  it("reports app-known readiness gaps when cron secret or generation settings are invalid", async () => {
    const { usersByEmail } = await createTestAuthStore();
    const manager = usersByEmail.get("morgan.manager@local.test") ?? null;
    const harness = createBoardReadRepositoryHarness();

    delete process.env.CRON_SECRET;

    const result = await getBoardReadModelForDate(manager, "2026-06-18", {
      repository: harness.repository,
      schedulerAttemptsRepository: createSchedulerAttemptsRepository([]),
      appSettingsRepository: createAppSettingsRepository({
        dailyGenerationTime: "25:99",
        timezone: "",
        businessDays: []
      }),
      now: () => new Date("2026-06-18T15:30:00.000Z")
    });

    expect(result.schedulerHealth).toMatchObject({
      status: "attention",
      guidance: {
        code: "settings_invalid",
        actionRequired: true,
        safeToRetry: false
      },
      readiness: {
        status: "attention"
      }
    });
    expect(result.schedulerHealth.readiness.checks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "cron_secret",
          status: "attention"
        }),
        expect.objectContaining({
          code: "generation_timezone",
          status: "attention"
        }),
        expect.objectContaining({
          code: "generation_time",
          status: "attention"
        }),
        expect.objectContaining({
          code: "business_days",
          status: "attention"
        })
      ])
    );
  });
});
