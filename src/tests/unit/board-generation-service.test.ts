import {
  BusinessDay,
  BoardGenerationStatus,
  GenerationRunStatus,
  GenerationTriggerType,
  Prisma,
  TaskSourceType,
  TaskStatus,
  WorkflowArea
} from "@prisma/client";
import { describe, expect, it } from "vitest";

import {
  getLatestGenerationStatusForDate,
  triggerManualBoardGeneration,
  triggerScheduledBoardGeneration
} from "@/server/services/board-generation";
import type { GenerationTasksRepository } from "@/server/services/generation-tasks";
import type { GenerationInput } from "@/server/services/generation-inputs";
import { createTestAuthStore } from "@/tests/support/auth-test-store";

type StoredBoardDay = {
  id: string;
  date: Date;
  generationStatus: BoardGenerationStatus;
  generatedAt: Date | null;
  generatedByUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type StoredTask = {
  id: string;
  boardDayId: string;
  title: string;
  description: string;
  assignedUserId: string;
  recommendedUserId: string | null;
  recommendationReasonCode: string | null;
  recommendationExplanation: string | null;
  status: TaskStatus;
  dueAt: Date;
  createdByUserId: string | null;
  requiresManagerApproval: boolean;
  sourceType: TaskSourceType;
  sourceTemplateId: string | null;
  sourceDutyId: string | null;
  workflowArea: WorkflowArea;
  createdAt: Date;
  updatedAt: Date;
};

type StoredGenerationRun = {
  id: string;
  boardDate: Date;
  startedAt: Date;
  finishedAt: Date | null;
  status: GenerationRunStatus;
  triggeredBy: GenerationTriggerType;
  triggeredByUserId: string | null;
  summary: Prisma.JsonValue;
  errorMessage: string | null;
};

function createGenerationInput(): GenerationInput {
  return {
    boardDate: "2026-06-17",
    users: [
      {
        userId: "user-inventory",
        userName: "Avery Inventory",
        userEmail: "avery.inventory@local.test",
        roles: [{ roleId: "role-inventory", roleName: "Inventory Manager" }],
        directDuties: [],
        dutySource: "role_default",
        resolvedDuties: [
          {
            dutyId: "duty-inventory",
            title: "Review inventory status",
            workflowArea: "Inventory",
            source: "role_default",
            roleIds: ["role-inventory"],
            roleNames: ["Inventory Manager"]
          }
        ],
        templates: [
          {
            templateId: "template-inventory",
            title: "Review inventory status",
            description: "Check stale and ready-for-sale units.",
            workflowArea: WorkflowArea.INVENTORY,
            defaultDueTime: "09:00",
            requiresManagerApproval: false,
            roleId: "role-inventory",
            roleName: "Inventory Manager",
            dutyId: "duty-inventory",
            dutyName: "Review inventory status",
            matchedByRole: true,
            matchedByDuty: true
          }
        ]
      }
    ],
    warnings: []
  };
}

function createNowSequence(...timestamps: string[]) {
  let index = 0;

  return () => {
    const timestamp = timestamps[Math.min(index, timestamps.length - 1)];

    index += 1;

    return new Date(timestamp);
  };
}

function createGenerationSettings(
  overrides: Partial<{
    dailyGenerationTime: string;
    timezone: string;
    businessDays: BusinessDay[];
  }> = {}
) {
  return {
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
    ...overrides
  };
}

function createGenerationTasksRepositoryHarness(
  generationInput = createGenerationInput(),
  options: {
    beforeCreateTask?: (task: Pick<StoredTask, "boardDayId" | "assignedUserId" | "sourceTemplateId">) => void;
  } = {}
) {
  let boardDayCounter = 1;
  let taskCounter = 1;
  let generationRunCounter = 1;
  const boardDays: StoredBoardDay[] = [];
  const tasks: StoredTask[] = [];
  const generationRuns: StoredGenerationRun[] = [];

  const repository: GenerationTasksRepository = {
    async getOrCreateBoardDay(boardDate) {
      const existingBoardDay = boardDays.find(
        (candidate) => candidate.date.toISOString().slice(0, 10) === boardDate
      );

      if (existingBoardDay) {
        return existingBoardDay;
      }

      const boardDay: StoredBoardDay = {
        id: `board-day-${boardDayCounter++}`,
        date: new Date(`${boardDate}T00:00:00.000Z`),
        generationStatus: BoardGenerationStatus.NOT_STARTED,
        generatedAt: null,
        generatedByUserId: null,
        createdAt: new Date("2026-06-17T08:00:00.000Z"),
        updatedAt: new Date("2026-06-17T08:00:00.000Z")
      };

      boardDays.push(boardDay);

      return boardDay;
    },

    async listExistingGeneratedTasks(boardDayId) {
      return tasks
        .filter((task) => task.boardDayId === boardDayId && task.sourceType === TaskSourceType.TEMPLATE)
        .map((task) => ({
          id: task.id,
          sourceTemplateId: task.sourceTemplateId,
          assignedUserId: task.assignedUserId
        }));
    },

    async countManualTasks(boardDayId) {
      return tasks.filter(
        (task) =>
          task.boardDayId === boardDayId &&
          (task.sourceType === TaskSourceType.MANAGER || task.sourceType === TaskSourceType.STAFF)
      ).length;
    },

    async createGeneratedTask(input) {
      options.beforeCreateTask?.({
        boardDayId: input.boardDayId,
        assignedUserId: input.assignedUserId,
        sourceTemplateId: input.sourceTemplateId
      });

      const existingTask = tasks.find(
        (task) =>
          task.boardDayId === input.boardDayId &&
          task.assignedUserId === input.assignedUserId &&
          task.sourceTemplateId === input.sourceTemplateId
      );

      if (existingTask) {
        return null;
      }

      const createdTask: StoredTask = {
        id: `task-${taskCounter++}`,
        boardDayId: input.boardDayId,
        title: input.title,
        description: input.description,
        assignedUserId: input.assignedUserId,
        recommendedUserId: input.recommendedUserId,
        recommendationReasonCode: input.recommendationReasonCode,
        recommendationExplanation: input.recommendationExplanation,
        status: TaskStatus.NOT_STARTED,
        dueAt: input.dueAt,
        createdByUserId: input.createdByUserId,
        requiresManagerApproval: input.requiresManagerApproval,
        sourceType: TaskSourceType.TEMPLATE,
        sourceTemplateId: input.sourceTemplateId,
        sourceDutyId: input.sourceDutyId,
        workflowArea: input.workflowArea,
        createdAt: new Date("2026-06-17T08:10:00.000Z"),
        updatedAt: new Date("2026-06-17T08:10:00.000Z")
      };

      tasks.push(createdTask);

      return {
        id: createdTask.id,
        title: createdTask.title,
        assignedUserId: createdTask.assignedUserId,
        recommendedUserId: createdTask.recommendedUserId,
        recommendationReasonCode: createdTask.recommendationReasonCode,
        recommendationExplanation: createdTask.recommendationExplanation,
        dueAt: createdTask.dueAt,
        sourceTemplateId: createdTask.sourceTemplateId,
        sourceDutyId: createdTask.sourceDutyId,
        workflowArea: createdTask.workflowArea
      };
    },

    async startGenerationRun(input) {
      const generationRun: StoredGenerationRun = {
        id: `generation-run-${generationRunCounter++}`,
        boardDate: new Date(`${input.boardDate}T00:00:00.000Z`),
        startedAt: input.startedAt,
        finishedAt: null,
        status: GenerationRunStatus.RUNNING,
        triggeredBy: input.triggeredBy,
        triggeredByUserId: input.triggeredByUserId,
        summary: input.summary as Prisma.JsonValue,
        errorMessage: null
      };

      generationRuns.push(generationRun);

      return generationRun;
    },

    async completeGenerationRun(input) {
      const generationRun = generationRuns.find((candidate) => candidate.id === input.id);

      if (!generationRun) {
        throw new Error(`Unknown generation run ${input.id}.`);
      }

      generationRun.finishedAt = input.finishedAt;
      generationRun.status = GenerationRunStatus.SUCCEEDED;
      generationRun.summary = input.summary as Prisma.JsonValue;
      generationRun.errorMessage = null;

      return generationRun;
    },

    async failGenerationRun(input) {
      const generationRun = generationRuns.find((candidate) => candidate.id === input.id);

      if (!generationRun) {
        throw new Error(`Unknown generation run ${input.id}.`);
      }

      generationRun.finishedAt = input.finishedAt;
      generationRun.status = GenerationRunStatus.FAILED;
      generationRun.summary = input.summary as Prisma.JsonValue;
      generationRun.errorMessage = input.errorMessage;

      return generationRun;
    },

    async listGenerationRunsForDate(boardDate) {
      return generationRuns
        .filter((candidate) => candidate.boardDate.toISOString().slice(0, 10) === boardDate)
        .sort((left, right) => right.startedAt.getTime() - left.startedAt.getTime());
    }
  };

  return {
    repository,
    loadGenerationInputs: async () => generationInput,
    readGenerationRuns() {
      return generationRuns;
    }
  };
}

describe("board generation service", () => {
  it("lets a manager trigger manual generation and returns structured success data", async () => {
    const { usersByEmail } = await createTestAuthStore();
    const manager = usersByEmail.get("morgan.manager@local.test") ?? null;
    const harness = createGenerationTasksRepositoryHarness();

    const result = await triggerManualBoardGeneration(manager, "2026-06-17", {
      repository: harness.repository,
      loadGenerationInputs: harness.loadGenerationInputs,
      now: createNowSequence("2026-06-17T08:00:00.000Z", "2026-06-17T08:00:04.000Z")
    });

    expect(result).toMatchObject({
      status: "success",
      boardDate: "2026-06-17",
      generationRunId: "generation-run-1",
      createdTaskCount: 1,
      skippedExistingTaskCount: 0,
      alreadyExistingTaskCount: 0,
      errorMessage: null,
      summary: "1 tasks created • 0 duplicates skipped • 0 manual tasks preserved"
    });
    expect(result.latestGeneration).toMatchObject({
      generationRunId: "generation-run-1",
      status: "success",
      triggeredBy: "manual",
      createdTaskCount: 1,
      skippedExistingTaskCount: 0
    });

    const latestGeneration = await getLatestGenerationStatusForDate("2026-06-17", harness.repository);

    expect(latestGeneration).toMatchObject({
      generationRunId: "generation-run-1",
      status: "success",
      triggeredBy: "manual"
    });
  });

  it("rejects staff users before generation starts", async () => {
    const { usersByEmail } = await createTestAuthStore();
    const staffUser = usersByEmail.get("jordan.sales@local.test") ?? null;
    const harness = createGenerationTasksRepositoryHarness();

    await expect(
      triggerManualBoardGeneration(staffUser, "2026-06-17", {
        repository: harness.repository,
        loadGenerationInputs: harness.loadGenerationInputs
      })
    ).rejects.toThrow("Manager access required.");

    expect(harness.readGenerationRuns()).toHaveLength(0);
  });

  it("returns a structured failed result when the shared generation flow records a failed run", async () => {
    const { usersByEmail } = await createTestAuthStore();
    const manager = usersByEmail.get("morgan.manager@local.test") ?? null;
    const harness = createGenerationTasksRepositoryHarness(createGenerationInput(), {
      beforeCreateTask(task) {
        if (task.sourceTemplateId === "template-inventory") {
          throw new Error("Template insert failed.");
        }
      }
    });

    const result = await triggerManualBoardGeneration(manager, "2026-06-17", {
      repository: harness.repository,
      loadGenerationInputs: harness.loadGenerationInputs,
      now: createNowSequence("2026-06-17T08:00:00.000Z", "2026-06-17T08:00:05.000Z")
    });

    expect(result).toMatchObject({
      status: "failed",
      boardDate: "2026-06-17",
      generationRunId: "generation-run-1",
      errorMessage: "Template insert failed."
    });
    expect(result.latestGeneration).toMatchObject({
      generationRunId: "generation-run-1",
      status: "failed",
      triggeredBy: "manual",
      errorMessage: "Template insert failed."
    });
  });

  it("runs scheduled generation through the shared workflow using the configured timezone and records a scheduled run", async () => {
    const harness = createGenerationTasksRepositoryHarness();

    const result = await triggerScheduledBoardGeneration({
      repository: harness.repository,
      loadGenerationInputs: harness.loadGenerationInputs,
      getGenerationSettings: async () =>
        createGenerationSettings({
          timezone: "America/Chicago"
        }),
      now: createNowSequence("2026-06-17T15:00:00.000Z", "2026-06-17T15:00:04.000Z")
    });

    expect(result).toMatchObject({
      status: "success",
      boardDate: "2026-06-17",
      generationRunId: "generation-run-1",
      createdTaskCount: 1,
      skippedExistingTaskCount: 0,
      errorMessage: null,
      summary: "1 tasks created • 0 duplicates skipped • 0 manual tasks preserved"
    });
    expect(result.latestGeneration).toMatchObject({
      generationRunId: "generation-run-1",
      status: "success",
      triggeredBy: "scheduled",
      createdTaskCount: 1
    });
    expect(harness.readGenerationRuns()).toEqual([
      expect.objectContaining({
        id: "generation-run-1",
        status: GenerationRunStatus.SUCCEEDED,
        triggeredBy: GenerationTriggerType.SCHEDULED,
        triggeredByUserId: null,
        summary: expect.objectContaining({
          triggeredBy: "scheduled",
          triggeredByUserId: null
        })
      })
    ]);
  });

  it("skips scheduled generation on a non-business day without creating a run", async () => {
    const harness = createGenerationTasksRepositoryHarness();

    const result = await triggerScheduledBoardGeneration({
      repository: harness.repository,
      loadGenerationInputs: harness.loadGenerationInputs,
      getGenerationSettings: async () =>
        createGenerationSettings({
          businessDays: [
            BusinessDay.MONDAY,
            BusinessDay.TUESDAY,
            BusinessDay.WEDNESDAY,
            BusinessDay.THURSDAY,
            BusinessDay.FRIDAY,
            BusinessDay.SATURDAY
          ]
        }),
      now: createNowSequence("2026-06-21T15:00:00.000Z")
    });

    expect(result).toEqual({
      status: "skipped",
      boardDate: "2026-06-21",
      generationRunId: null,
      createdTaskCount: 0,
      skippedExistingTaskCount: 0,
      alreadyExistingTaskCount: null,
      summary: "Skipped scheduled generation because sunday is not configured as a business day.",
      errorMessage: null,
      latestGeneration: null
    });
    expect(harness.readGenerationRuns()).toHaveLength(0);
  });

  it("skips scheduled generation before the configured local generation time", async () => {
    const harness = createGenerationTasksRepositoryHarness();

    const result = await triggerScheduledBoardGeneration({
      repository: harness.repository,
      loadGenerationInputs: harness.loadGenerationInputs,
      getGenerationSettings: async () =>
        createGenerationSettings({
          dailyGenerationTime: "09:00",
          timezone: "America/Chicago"
        }),
      now: createNowSequence("2026-06-17T13:45:00.000Z")
    });

    expect(result).toEqual({
      status: "skipped",
      boardDate: "2026-06-17",
      generationRunId: null,
      createdTaskCount: 0,
      skippedExistingTaskCount: 0,
      alreadyExistingTaskCount: null,
      summary:
        "Skipped scheduled generation because America/Chicago has not reached the configured daily generation time of 09:00.",
      errorMessage: null,
      latestGeneration: null
    });
    expect(harness.readGenerationRuns()).toHaveLength(0);
  });

  it("skips later scheduled attempts after the board is already generated for the day", async () => {
    const harness = createGenerationTasksRepositoryHarness();

    const firstResult = await triggerScheduledBoardGeneration({
      repository: harness.repository,
      loadGenerationInputs: harness.loadGenerationInputs,
      getGenerationSettings: async () => createGenerationSettings(),
      now: createNowSequence("2026-06-17T15:00:00.000Z", "2026-06-17T15:00:04.000Z")
    });
    const secondResult = await triggerScheduledBoardGeneration({
      repository: harness.repository,
      loadGenerationInputs: harness.loadGenerationInputs,
      getGenerationSettings: async () => createGenerationSettings(),
      now: createNowSequence("2026-06-17T15:15:00.000Z")
    });

    expect(firstResult.status).toBe("success");
    expect(secondResult).toMatchObject({
      status: "skipped",
      boardDate: "2026-06-17",
      generationRunId: "generation-run-1",
      summary: "Skipped scheduled generation because the board for 2026-06-17 is already generated."
    });
    expect(secondResult.latestGeneration).toMatchObject({
      generationRunId: "generation-run-1",
      status: "success",
      triggeredBy: "scheduled"
    });
    expect(harness.readGenerationRuns()).toHaveLength(1);
  });

  it("keeps manual retries working after a scheduled run creates the board for that date", async () => {
    const { usersByEmail } = await createTestAuthStore();
    const manager = usersByEmail.get("morgan.manager@local.test") ?? null;
    const harness = createGenerationTasksRepositoryHarness();

    const scheduledResult = await triggerScheduledBoardGeneration({
      repository: harness.repository,
      loadGenerationInputs: harness.loadGenerationInputs,
      getGenerationSettings: async () => createGenerationSettings(),
      now: createNowSequence("2026-06-17T15:00:00.000Z", "2026-06-17T15:00:03.000Z")
    });
    const manualResult = await triggerManualBoardGeneration(manager, "2026-06-17", {
      repository: harness.repository,
      loadGenerationInputs: harness.loadGenerationInputs,
      now: createNowSequence("2026-06-17T16:00:00.000Z", "2026-06-17T16:00:02.000Z")
    });

    expect(scheduledResult.status).toBe("success");
    expect(manualResult).toMatchObject({
      status: "success",
      boardDate: "2026-06-17",
      createdTaskCount: 0,
      skippedExistingTaskCount: 1
    });
    expect(harness.readGenerationRuns()).toHaveLength(2);
    expect(harness.readGenerationRuns().map((run) => run.triggeredBy)).toEqual([
      GenerationTriggerType.SCHEDULED,
      GenerationTriggerType.MANUAL
    ]);
  });
});
