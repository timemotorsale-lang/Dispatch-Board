import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  triggerScheduledBoardGeneration: vi.fn(),
  createReceivedSchedulerAttempt: vi.fn(),
  recordUnauthorizedSchedulerAttempt: vi.fn(),
  recordSchedulerAttemptResult: vi.fn(),
  recordFailedSchedulerAttempt: vi.fn()
}));

vi.mock("@/server/services/board-generation", () => ({
  triggerScheduledBoardGeneration: mocks.triggerScheduledBoardGeneration
}));

vi.mock("@/server/services/scheduler-attempts", () => ({
  createReceivedSchedulerAttempt: mocks.createReceivedSchedulerAttempt,
  evaluateCronRequestAuthorization: vi.fn((request: Request, cronSecret: string | null | undefined) => {
    const normalizedCronSecret = cronSecret?.trim();

    if (!normalizedCronSecret) {
      throw new Error("CRON_SECRET is not configured.");
    }

    const authorization = request.headers.get("authorization");
    const headerSecret = request.headers.get("x-cron-secret");
    const bearerToken = authorization?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim() ?? null;
    const providedCredential = bearerToken || headerSecret?.trim() || null;

    if (!providedCredential) {
      return {
        isAuthorized: false as const,
        reasonCode: "MISSING_CREDENTIAL" as const
      };
    }

    if (providedCredential === normalizedCronSecret) {
      return {
        isAuthorized: true as const
      };
    }

    return {
      isAuthorized: false as const,
      reasonCode: "SECRET_MISMATCH" as const
    };
  }),
  recordUnauthorizedSchedulerAttempt: mocks.recordUnauthorizedSchedulerAttempt,
  recordSchedulerAttemptResult: mocks.recordSchedulerAttemptResult,
  recordFailedSchedulerAttempt: mocks.recordFailedSchedulerAttempt
}));

import { GET, POST } from "@/app/api/cron/generate-board/route";

describe("scheduled generation cron route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = "dispatch-cron-secret";
    mocks.createReceivedSchedulerAttempt.mockResolvedValue({
      id: "scheduler-attempt-1"
    });
    mocks.recordUnauthorizedSchedulerAttempt.mockResolvedValue(undefined);
    mocks.recordSchedulerAttemptResult.mockResolvedValue(undefined);
    mocks.recordFailedSchedulerAttempt.mockResolvedValue(undefined);
  });

  afterEach(() => {
    delete process.env.CRON_SECRET;
  });

  it("rejects unauthorized requests when the cron secret does not match", async () => {
    const response = await GET(new Request("http://localhost/api/cron/generate-board"));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: "Unauthorized cron request."
    });
    expect(mocks.triggerScheduledBoardGeneration).not.toHaveBeenCalled();
    expect(mocks.createReceivedSchedulerAttempt).toHaveBeenCalledTimes(1);
    expect(mocks.recordUnauthorizedSchedulerAttempt).toHaveBeenCalledWith(
      "scheduler-attempt-1",
      "MISSING_CREDENTIAL"
    );
    expect(mocks.recordSchedulerAttemptResult).not.toHaveBeenCalled();
  });

  it("records a secret mismatch as unauthorized scheduler evidence", async () => {
    const response = await GET(
      new Request("http://localhost/api/cron/generate-board", {
        headers: {
          "x-cron-secret": "wrong-secret"
        }
      })
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: "Unauthorized cron request."
    });
    expect(mocks.recordUnauthorizedSchedulerAttempt).toHaveBeenCalledWith(
      "scheduler-attempt-1",
      "SECRET_MISMATCH"
    );
    expect(mocks.triggerScheduledBoardGeneration).not.toHaveBeenCalled();
  });

  it("returns a structured success response for authorized requests", async () => {
    mocks.triggerScheduledBoardGeneration.mockResolvedValue({
      status: "success",
      boardDate: "2026-06-17",
      generationRunId: "generation-run-1",
      createdTaskCount: 2,
      skippedExistingTaskCount: 1,
      alreadyExistingTaskCount: 1,
      summary: "2 tasks created",
      errorMessage: null,
      latestGeneration: null
    });

    const response = await POST(
      new Request("http://localhost/api/cron/generate-board", {
        method: "POST",
        headers: {
          authorization: "Bearer dispatch-cron-secret"
        }
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      status: "success",
      boardDate: "2026-06-17",
      generationRunId: "generation-run-1",
      createdTaskCount: 2,
      skippedExistingTaskCount: 1
    });
    expect(mocks.triggerScheduledBoardGeneration).toHaveBeenCalledTimes(1);
    expect(mocks.recordSchedulerAttemptResult).toHaveBeenCalledWith("scheduler-attempt-1", {
      status: "success",
      boardDate: "2026-06-17",
      generationRunId: "generation-run-1",
      createdTaskCount: 2,
      skippedExistingTaskCount: 1,
      alreadyExistingTaskCount: 1,
      summary: "2 tasks created",
      errorMessage: null,
      latestGeneration: null
    });
  });

  it("returns a structured failure response for authorized requests", async () => {
    mocks.triggerScheduledBoardGeneration.mockResolvedValue({
      status: "failed",
      boardDate: "2026-06-17",
      generationRunId: "generation-run-2",
      createdTaskCount: null,
      skippedExistingTaskCount: null,
      alreadyExistingTaskCount: null,
      summary: null,
      errorMessage: "Input loading failed.",
      latestGeneration: null
    });

    const response = await GET(
      new Request("http://localhost/api/cron/generate-board", {
        headers: {
          "x-cron-secret": "dispatch-cron-secret"
        }
      })
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toMatchObject({
      status: "failed",
      boardDate: "2026-06-17",
      generationRunId: "generation-run-2",
      errorMessage: "Input loading failed."
    });
    expect(mocks.triggerScheduledBoardGeneration).toHaveBeenCalledTimes(1);
    expect(mocks.recordSchedulerAttemptResult).toHaveBeenCalledWith("scheduler-attempt-1", {
      status: "failed",
      boardDate: "2026-06-17",
      generationRunId: "generation-run-2",
      createdTaskCount: null,
      skippedExistingTaskCount: null,
      alreadyExistingTaskCount: null,
      summary: null,
      errorMessage: "Input loading failed.",
      latestGeneration: null
    });
  });

  it("returns a structured skipped response for authorized requests", async () => {
    mocks.triggerScheduledBoardGeneration.mockResolvedValue({
      status: "skipped",
      boardDate: "2026-06-17",
      generationRunId: null,
      createdTaskCount: 0,
      skippedExistingTaskCount: 0,
      alreadyExistingTaskCount: null,
      skipReasonCode: "BEFORE_GENERATION_TIME",
      summary:
        "Skipped scheduled generation because America/Chicago has not reached the configured daily generation time of 09:00.",
      errorMessage: null,
      failureCode: null,
      failureStage: null,
      failureDiagnostic: null,
      latestGeneration: null
    });

    const response = await POST(
      new Request("http://localhost/api/cron/generate-board", {
        method: "POST",
        headers: {
          authorization: "Bearer dispatch-cron-secret"
        }
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      status: "skipped",
      boardDate: "2026-06-17",
      skipReasonCode: "BEFORE_GENERATION_TIME"
    });
    expect(mocks.recordSchedulerAttemptResult).toHaveBeenCalledWith("scheduler-attempt-1", {
      status: "skipped",
      boardDate: "2026-06-17",
      generationRunId: null,
      createdTaskCount: 0,
      skippedExistingTaskCount: 0,
      alreadyExistingTaskCount: null,
      skipReasonCode: "BEFORE_GENERATION_TIME",
      summary:
        "Skipped scheduled generation because America/Chicago has not reached the configured daily generation time of 09:00.",
      errorMessage: null,
      failureCode: null,
      failureStage: null,
      failureDiagnostic: null,
      latestGeneration: null
    });
  });

  it("returns a configuration error when the cron secret is missing", async () => {
    delete process.env.CRON_SECRET;

    const response = await GET(
      new Request("http://localhost/api/cron/generate-board", {
        headers: {
          authorization: "Bearer dispatch-cron-secret"
        }
      })
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "CRON_SECRET is not configured."
    });
    expect(mocks.triggerScheduledBoardGeneration).not.toHaveBeenCalled();
    expect(mocks.recordFailedSchedulerAttempt).toHaveBeenCalledWith({
      attemptId: "scheduler-attempt-1",
      authorizationOutcome: "system_misconfigured",
      failureCode: "CRON_SECRET_MISSING",
      error: expect.any(Error)
    });
  });

  it("records failed evidence when the shared generation service throws unexpectedly", async () => {
    mocks.triggerScheduledBoardGeneration.mockRejectedValue(new Error("Database unavailable."));

    const response = await POST(
      new Request("http://localhost/api/cron/generate-board", {
        method: "POST",
        headers: {
          authorization: "Bearer dispatch-cron-secret"
        }
      })
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "Database unavailable."
    });
    expect(mocks.recordFailedSchedulerAttempt).toHaveBeenCalledWith({
      attemptId: "scheduler-attempt-1",
      authorizationOutcome: "authorized",
      failureCode: "SCHEDULED_REQUEST_FAILED",
      error: expect.any(Error)
    });
  });
});
