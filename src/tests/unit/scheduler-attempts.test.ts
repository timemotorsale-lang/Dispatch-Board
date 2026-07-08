import {
  SchedulerAttemptState,
  SchedulerAuthorizationOutcome,
  type GenerationTriggerType,
  type SchedulerAttempt
} from "@prisma/client";
import { describe, expect, it } from "vitest";

import type { SchedulerAttemptsRepository } from "@/server/repositories/scheduler-attempts-repository";
import {
  createReceivedSchedulerAttempt,
  listSchedulerAttemptsForDate,
  recordFailedSchedulerAttempt,
  recordSchedulerAttemptResult,
  recordUnauthorizedSchedulerAttempt
} from "@/server/services/scheduler-attempts";

type StoredSchedulerAttempt = SchedulerAttempt;

function createSchedulerAttemptsRepositoryHarness() {
  let attemptCounter = 1;
  const attempts: StoredSchedulerAttempt[] = [];

  const repository: SchedulerAttemptsRepository = {
    async createSchedulerAttempt(input) {
      const attempt: StoredSchedulerAttempt = {
        id: `scheduler-attempt-${attemptCounter++}`,
        boardDate: new Date(`${input.boardDate}T00:00:00.000Z`),
        triggerType: "SCHEDULED" as GenerationTriggerType,
        triggerSource: input.triggerSource,
        routePath: input.routePath,
        requestMethod: input.requestMethod,
        receivedAt: input.receivedAt,
        startedAt: null,
        completedAt: null,
        attemptState: SchedulerAttemptState.RECEIVED,
        authorizationOutcome: SchedulerAuthorizationOutcome.PENDING,
        generationRunId: null,
        managerMessage: input.managerMessage,
        skipReasonCode: null,
        unauthorizedReasonCode: null,
        failureStage: null,
        failureCode: null,
        failureDiagnostic: null,
        safeErrorMessage: null,
        createdAt: input.receivedAt,
        updatedAt: input.receivedAt
      };

      attempts.push(attempt);

      return attempt;
    },

    async updateSchedulerAttempt(input) {
      const attempt = attempts.find((candidate) => candidate.id === input.id);

      if (!attempt) {
        throw new Error(`Unknown scheduler attempt ${input.id}.`);
      }

      attempt.attemptState = input.attemptState;
      attempt.authorizationOutcome = input.authorizationOutcome;
      attempt.managerMessage = input.managerMessage;
      attempt.startedAt = input.startedAt === undefined ? attempt.startedAt : input.startedAt;
      attempt.completedAt = input.completedAt === undefined ? attempt.completedAt : input.completedAt;
      attempt.generationRunId =
        input.generationRunId === undefined ? attempt.generationRunId : input.generationRunId;
      attempt.skipReasonCode =
        input.skipReasonCode === undefined ? attempt.skipReasonCode : input.skipReasonCode;
      attempt.unauthorizedReasonCode =
        input.unauthorizedReasonCode === undefined
          ? attempt.unauthorizedReasonCode
          : input.unauthorizedReasonCode;
      attempt.failureStage =
        input.failureStage === undefined ? attempt.failureStage : input.failureStage;
      attempt.failureCode = input.failureCode === undefined ? attempt.failureCode : input.failureCode;
      attempt.failureDiagnostic =
        input.failureDiagnostic === undefined
          ? attempt.failureDiagnostic
          : (input.failureDiagnostic as StoredSchedulerAttempt["failureDiagnostic"]);
      attempt.safeErrorMessage =
        input.safeErrorMessage === undefined ? attempt.safeErrorMessage : input.safeErrorMessage;
      attempt.updatedAt = input.completedAt ?? input.startedAt ?? attempt.updatedAt;

      return attempt;
    },

    async listSchedulerAttemptsForDate(boardDate) {
      return attempts
        .filter((candidate) => candidate.boardDate.toISOString().slice(0, 10) === boardDate)
        .sort((left, right) => right.receivedAt.getTime() - left.receivedAt.getTime());
    }
  };

  return {
    repository,
    readAttempts() {
      return attempts;
    }
  };
}

describe("scheduler attempts service", () => {
  it("creates durable received evidence for a scheduled route hit", async () => {
    const harness = createSchedulerAttemptsRepositoryHarness();

    const attempt = await createReceivedSchedulerAttempt(
      new Request("http://localhost/api/cron/generate-board", {
        method: "POST",
        headers: {
          "x-scheduler-trigger-source": "external_scheduler"
        }
      }),
      {
        repository: harness.repository,
        now: () => new Date("2026-07-08T15:00:00.000Z"),
        getGenerationSettings: async () => ({
          dailyGenerationTime: "09:00",
          timezone: "America/Chicago",
          businessDays: []
        })
      }
    );

    expect(attempt).toMatchObject({
      id: "scheduler-attempt-1",
      boardDate: "2026-07-08",
      triggerType: "scheduled",
      triggerSource: "external_scheduler",
      routePath: "/api/cron/generate-board",
      requestMethod: "POST",
      attemptState: "received",
      authorizationOutcome: "pending",
      managerMessage: "Scheduled generation request received."
    });
    expect(harness.readAttempts()).toHaveLength(1);
  });

  it("persists unauthorized evidence and keeps it queryable for the board date", async () => {
    const harness = createSchedulerAttemptsRepositoryHarness();
    const received = await createReceivedSchedulerAttempt(
      new Request("http://localhost/api/cron/generate-board", {
        headers: {
          referer: "http://127.0.0.1:3000/settings"
        }
      }),
      {
        repository: harness.repository,
        now: () => new Date("2026-07-08T15:00:00.000Z"),
        getGenerationSettings: async () => ({
          dailyGenerationTime: "09:00",
          timezone: "America/Chicago",
          businessDays: []
        })
      }
    );

    const unauthorized = await recordUnauthorizedSchedulerAttempt(received.id, "MISSING_CREDENTIAL", {
      repository: harness.repository,
      now: () => new Date("2026-07-08T15:00:02.000Z")
    });
    const attempts = await listSchedulerAttemptsForDate("2026-07-08", harness.repository);

    expect(unauthorized).toMatchObject({
      id: received.id,
      attemptState: "unauthorized",
      authorizationOutcome: "unauthorized",
      triggerSource: "manual_http_test",
      unauthorizedReasonCode: "MISSING_CREDENTIAL"
    });
    expect(attempts).toEqual([
      expect.objectContaining({
        id: received.id,
        attemptState: "unauthorized",
        authorizationOutcome: "unauthorized"
      })
    ]);
  });

  it("records succeeded evidence with generation run linkage for authorized cron hits", async () => {
    const harness = createSchedulerAttemptsRepositoryHarness();
    const received = await createReceivedSchedulerAttempt(
      new Request("http://localhost/api/cron/generate-board"),
      {
        repository: harness.repository,
        now: () => new Date("2026-07-08T15:00:00.000Z"),
        getGenerationSettings: async () => ({
          dailyGenerationTime: "09:00",
          timezone: "America/Chicago",
          businessDays: []
        })
      }
    );

    const completed = await recordSchedulerAttemptResult(
      received.id,
      {
        status: "success",
        boardDate: "2026-07-08",
        generationRunId: "generation-run-7",
        createdTaskCount: 3,
        skippedExistingTaskCount: 1,
        alreadyExistingTaskCount: 1,
        skipReasonCode: null,
        summary: "3 tasks created",
        errorMessage: null,
        latestGeneration: null
      },
      {
        repository: harness.repository,
        now: () => new Date("2026-07-08T15:00:05.000Z")
      }
    );

    expect(completed).toMatchObject({
      id: received.id,
      attemptState: "succeeded",
      authorizationOutcome: "authorized",
      generationRunId: "generation-run-7",
      managerMessage: "3 tasks created"
    });
  });

  it("records normalized skip reasons for scheduled skip outcomes", async () => {
    const harness = createSchedulerAttemptsRepositoryHarness();
    const received = await createReceivedSchedulerAttempt(
      new Request("http://localhost/api/cron/generate-board"),
      {
        repository: harness.repository,
        now: () => new Date("2026-07-08T15:00:00.000Z"),
        getGenerationSettings: async () => ({
          dailyGenerationTime: "09:00",
          timezone: "America/Chicago",
          businessDays: []
        })
      }
    );

    const skipped = await recordSchedulerAttemptResult(
      received.id,
      {
        status: "skipped",
        boardDate: "2026-07-08",
        generationRunId: null,
        createdTaskCount: 0,
        skippedExistingTaskCount: 0,
        alreadyExistingTaskCount: null,
        skipReasonCode: "BEFORE_GENERATION_TIME",
        summary:
          "Skipped scheduled generation because America/Chicago has not reached the configured daily generation time of 09:00.",
        errorMessage: null,
        latestGeneration: null
      },
      {
        repository: harness.repository,
        now: () => new Date("2026-07-08T15:00:02.000Z")
      }
    );

    expect(skipped).toMatchObject({
      id: received.id,
      attemptState: "skipped",
      authorizationOutcome: "authorized",
      skipReasonCode: "BEFORE_GENERATION_TIME",
      managerMessage:
        "Skipped scheduled generation because America/Chicago has not reached the configured daily generation time of 09:00."
    });
  });

  it("sanitizes protected failures before persisting scheduler evidence", async () => {
    const harness = createSchedulerAttemptsRepositoryHarness();
    const received = await createReceivedSchedulerAttempt(
      new Request("http://localhost/api/cron/generate-board"),
      {
        repository: harness.repository,
        now: () => new Date("2026-07-08T15:00:00.000Z"),
        getGenerationSettings: async () => ({
          dailyGenerationTime: "09:00",
          timezone: "America/Chicago",
          businessDays: []
        })
      }
    );

    const failed = await recordFailedSchedulerAttempt(
      {
        attemptId: received.id,
        authorizationOutcome: "system_misconfigured",
        failureCode: "DATABASE_DOWN",
        error: new Error("DATABASE_URL postgres://secret-user:secret-pass@db.example.com/app")
      },
      {
        repository: harness.repository,
        now: () => new Date("2026-07-08T15:00:03.000Z")
      }
    );

    expect(failed).toMatchObject({
      id: received.id,
      attemptState: "failed",
      authorizationOutcome: "system_misconfigured",
      failureStage: "PREFLIGHT",
      failureCode: "DATABASE_DOWN",
      failureDiagnostic: expect.objectContaining({
        failureCode: "DATABASE_DOWN",
        failureStage: "PREFLIGHT",
        phase: "request_preflight",
        safeErrorMessage: "Scheduled generation failed due to a protected internal error."
      }),
      safeErrorMessage: "Scheduled generation failed due to a protected internal error."
    });
  });

  it("persists structured diagnostics for scheduled generation failures", async () => {
    const harness = createSchedulerAttemptsRepositoryHarness();
    const received = await createReceivedSchedulerAttempt(
      new Request("http://localhost/api/cron/generate-board"),
      {
        repository: harness.repository,
        now: () => new Date("2026-07-08T15:00:00.000Z"),
        getGenerationSettings: async () => ({
          dailyGenerationTime: "09:00",
          timezone: "America/Chicago",
          businessDays: []
        })
      }
    );

    const failed = await recordSchedulerAttemptResult(
      received.id,
      {
        status: "failed",
        boardDate: "2026-07-08",
        generationRunId: "generation-run-8",
        createdTaskCount: 1,
        skippedExistingTaskCount: 0,
        alreadyExistingTaskCount: 0,
        skipReasonCode: null,
        summary: "Task creation failed after one task was created.",
        errorMessage: "Task creation failed after one task was created.",
        failureCode: "TASK_CREATION_FAILED",
        failureStage: "GENERATION_RUN",
        failureDiagnostic: {
          failureCode: "TASK_CREATION_FAILED",
          failureStage: "GENERATION_RUN",
          phase: "creating_tasks",
          safeErrorMessage: "Task creation failed after one task was created.",
          errorName: "Error",
          durationMs: 5000,
          boardDayId: "board-day-4",
          usersConsidered: 2,
          templatesConsidered: 3,
          tasksCreated: 1,
          tasksSkippedAsDuplicates: 0,
          tasksAlreadyExisting: 0,
          manualTasksPreserved: 0
        },
        latestGeneration: null
      },
      {
        repository: harness.repository,
        now: () => new Date("2026-07-08T15:00:04.000Z")
      }
    );

    expect(failed).toMatchObject({
      id: received.id,
      attemptState: "failed",
      authorizationOutcome: "authorized",
      generationRunId: "generation-run-8",
      failureCode: "TASK_CREATION_FAILED",
      failureStage: "GENERATION_RUN",
      failureDiagnostic: expect.objectContaining({
        failureCode: "TASK_CREATION_FAILED",
        failureStage: "GENERATION_RUN",
        phase: "creating_tasks",
        tasksCreated: 1
      }),
      safeErrorMessage: "Task creation failed after one task was created."
    });
  });
});
