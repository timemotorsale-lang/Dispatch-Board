import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  triggerScheduledBoardGeneration: vi.fn()
}));

vi.mock("@/server/services/board-generation", () => ({
  triggerScheduledBoardGeneration: mocks.triggerScheduledBoardGeneration
}));

import { GET, POST } from "@/app/api/cron/generate-board/route";

describe("scheduled generation cron route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = "dispatch-cron-secret";
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
  });
});
