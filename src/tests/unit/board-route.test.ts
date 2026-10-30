import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  getBoardReadModelForDate: vi.fn(),
  getBoardReadModelForToday: vi.fn(), settings: vi.fn(), operations: vi.fn()
}));

vi.mock("@/server/auth/current-user", () => ({
  getCurrentUser: mocks.getCurrentUser
}));

vi.mock("@/server/services/board-read", () => ({
  getTaskOperationsReadModelForDate: mocks.operations,
  getBoardReadModelForDate: mocks.getBoardReadModelForDate,
  getBoardReadModelForToday: mocks.getBoardReadModelForToday
}));

vi.mock("@/server/services/app-settings-service", () => ({ getGenerationSettings: mocks.settings }));

import { GET as getBoardForDate } from "@/app/api/board/[date]/route";
import { GET as getBoardForToday } from "@/app/api/board/today/route";

const managerUser = {
  id: "user-manager",
  name: "Eli Manager",
  email: "morgan.manager@local.test",
  isActive: true,
  roles: ["General Manager"],
  duties: {
    direct: ["Review blockers and approvals"],
    roleDefaults: ["Review blockers and approvals"],
    all: ["Review blockers and approvals"]
  }
};

const boardPayload = {
  date: "2026-06-17",
  board: {
    id: "board-day-1",
    date: "2026-06-17",
    generationStatus: "GENERATED",
    generatedAt: "2026-06-17T14:30:00.000Z",
    latestGeneration: {
      generationRunId: "generation-run-1",
      status: "success",
      triggeredBy: "scheduled",
      startedAt: "2026-06-17T14:28:00.000Z",
      finishedAt: "2026-06-17T14:30:00.000Z",
      attemptedAt: "2026-06-17T14:30:00.000Z",
      createdTaskCount: 1,
      skippedExistingTaskCount: 0,
      alreadyExistingTaskCount: 0,
      manualTasksPreservedCount: 0,
      summary: "1 tasks created • 0 duplicates skipped • 0 manual tasks preserved",
      errorMessage: null
    },
    taskCount: 1,
    statusCounts: {
      NOT_STARTED: 1
    },
    sourceCounts: {
      template: 1,
      manager: 0,
      staff: 0
    },
    tasks: [
      {
        id: "task-1",
        title: "Review inventory status",
        description: null,
        status: "NOT_STARTED",
        dueAt: "2026-06-17T14:00:00.000Z",
        workflowArea: "INVENTORY",
        sourceType: "TEMPLATE",
        requiresManagerApproval: false,
        assignedUser: {
          id: "user-inventory",
          name: "Brock Inventory",
          email: "riley.inventory@local.test"
        },
        recommendedUser: null,
        recommendation: null,
        vehicleReference: null,
        customerReference: null,
        blockerReason: null,
        readyForReviewAt: null,
        completedAt: null
      }
    ]
  },
  schedulerHealth: {
    status: "healthy",
    expectedToHaveRunByNow: true,
    needsAttention: false,
    managerMessage: "Board generated successfully.",
    nextStepMessage: "No action is needed unless you want to review or retry the board manually.",
    latestScheduledAttempt: {
      id: "scheduler-attempt-1",
      boardDate: "2026-06-17",
      triggerType: "scheduled",
      triggerSource: "platform_cron",
      routePath: "/api/cron/generate-board",
      requestMethod: "GET",
      receivedAt: "2026-06-17T14:28:00.000Z",
      startedAt: null,
      completedAt: "2026-06-17T14:30:00.000Z",
      attemptState: "succeeded",
      authorizationOutcome: "authorized",
      generationRunId: "generation-run-1",
      managerMessage: "Board generated successfully.",
      skipReasonCode: null,
      unauthorizedReasonCode: null,
      failureStage: null,
      failureCode: null,
      failureDiagnostic: null,
      safeErrorMessage: null
    },
    latestManualRun: null,
    lastSuccess: {
      generationRunId: "generation-run-1",
      status: "success",
      triggeredBy: "scheduled",
      startedAt: "2026-06-17T14:28:00.000Z",
      finishedAt: "2026-06-17T14:30:00.000Z",
      attemptedAt: "2026-06-17T14:30:00.000Z",
      createdTaskCount: 1,
      skippedExistingTaskCount: 0,
      alreadyExistingTaskCount: 0,
      manualTasksPreservedCount: 0,
      summary: "1 tasks created â€¢ 0 duplicates skipped â€¢ 0 manual tasks preserved",
      errorMessage: null,
      failureCode: null,
      failureStage: null,
      failureDiagnostic: null
    },
    lastFailure: null,
    latestSkipReason: null,
    boardGenerationStatus: {
      state: "generated",
      generatedAt: "2026-06-17T14:30:00.000Z",
      latestGenerationStatus: "success"
    }
  }
};

describe("board read routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue(managerUser);
    mocks.settings.mockResolvedValue({ timezone: "America/Chicago" });
  });

  afterEach(() => {
    vi.useRealTimers(); vi.clearAllMocks();
  });

  it("uses the existing operations ledger for today's Live Board work list", async () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date("2026-06-17T15:00Z"));
    mocks.operations.mockResolvedValue(boardPayload);
    const response = await getBoardForDate(new Request("http://localhost/api/board/2026-06-17?scope=operations"), { params: Promise.resolve({ date: "2026-06-17" }) });
    expect(response.status).toBe(200); expect(mocks.operations).toHaveBeenCalledWith(managerUser, "2026-06-17");
    expect(mocks.getBoardReadModelForDate).not.toHaveBeenCalled();
  });
  it("does not present current operational state as a past-date replay", async () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date("2026-06-18T15:00Z"));
    mocks.getBoardReadModelForDate.mockResolvedValue(boardPayload);
    const response = await getBoardForDate(new Request("http://localhost/api/board/2026-06-17?scope=operations"), { params: Promise.resolve({ date: "2026-06-17" }) });
    expect(response.status).toBe(200); expect(mocks.operations).not.toHaveBeenCalled();
    expect(mocks.getBoardReadModelForDate).toHaveBeenCalledWith(managerUser, "2026-06-17");
  });
  it("returns board data for a specific date", async () => {
    mocks.getBoardReadModelForDate.mockResolvedValue(boardPayload);

    const response = await getBoardForDate(new Request("http://localhost/api/board/2026-06-17"), {
      params: Promise.resolve({
        date: "2026-06-17"
      })
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(boardPayload);
    expect(mocks.getBoardReadModelForDate).toHaveBeenCalledWith(managerUser, "2026-06-17");
  });

  it("returns an empty-board 404 payload for a missing date", async () => {
    mocks.getBoardReadModelForDate.mockResolvedValue({
      date: "2026-06-18",
      board: null,
      schedulerHealth: {
        status: "attention",
        expectedToHaveRunByNow: true,
        needsAttention: true,
        managerMessage: "No scheduled generation evidence has been recorded for 2026-06-18 yet.",
        nextStepMessage:
          "Verify the production scheduler is enabled and that cron requests are reaching the app.",
        latestScheduledAttempt: null,
        latestManualRun: null,
        lastSuccess: null,
        lastFailure: null,
        latestSkipReason: null,
        boardGenerationStatus: {
          state: "not_created",
          generatedAt: null,
          latestGenerationStatus: "none"
        }
      }
    });

    const response = await getBoardForDate(new Request("http://localhost/api/board/2026-06-18"), {
      params: Promise.resolve({
        date: "2026-06-18"
      })
    });

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      date: "2026-06-18",
      board: null,
      schedulerHealth: {
        status: "attention",
        expectedToHaveRunByNow: true,
        needsAttention: true,
        managerMessage: "No scheduled generation evidence has been recorded for 2026-06-18 yet.",
        nextStepMessage:
          "Verify the production scheduler is enabled and that cron requests are reaching the app.",
        latestScheduledAttempt: null,
        latestManualRun: null,
        lastSuccess: null,
        lastFailure: null,
        latestSkipReason: null,
        boardGenerationStatus: {
          state: "not_created",
          generatedAt: null,
          latestGenerationStatus: "none"
        }
      },
      error: "No board exists for 2026-06-18 yet."
    });
  });

  it("maps date validation errors to a 400 response", async () => {
    mocks.getBoardReadModelForDate.mockRejectedValue(
      new Error("Board date must use YYYY-MM-DD format.")
    );

    const response = await getBoardForDate(new Request("http://localhost/api/board/not-a-date"), {
      params: Promise.resolve({
        date: "not-a-date"
      })
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Board date must use YYYY-MM-DD format."
    });
  });

  it("maps authentication failures to a 401 response for the today route", async () => {
    mocks.getBoardReadModelForToday.mockRejectedValue(new Error("Authentication required."));

    const response = await getBoardForToday();

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: "Authentication required."
    });
  });

  it("returns today's board data when the service resolves it", async () => {
    mocks.getBoardReadModelForToday.mockResolvedValue(boardPayload);

    const response = await getBoardForToday();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(boardPayload);
    expect(mocks.getBoardReadModelForToday).toHaveBeenCalledWith(managerUser);
  });
});
