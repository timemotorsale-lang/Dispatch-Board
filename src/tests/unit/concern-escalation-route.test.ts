import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ evaluate: vi.fn() }));

vi.mock("@/server/services/concern-resolution-service", () => ({
  evaluateConcernEscalationsForSystem: mocks.evaluate
}));

vi.mock("@/server/services/scheduler-attempts", () => ({
  evaluateCronRequestAuthorization: (request: Request, secret: string | undefined) => ({
    isAuthorized: request.headers.get("authorization") === `Bearer ${secret}`
  })
}));

import { GET, POST } from "@/app/api/cron/evaluate-concerns/route";

describe("concern escalation cron route", () => {
  beforeEach(() => {
    process.env.CRON_SECRET = "cron-secret";
    mocks.evaluate.mockResolvedValue({ evaluatedAt: "2026-07-11T12:00:00.000Z", candidateCount: 1, escalatedCount: 1, concerns: [] });
  });

  afterEach(() => {
    delete process.env.CRON_SECRET;
    vi.clearAllMocks();
  });

  it("rejects unauthorized evaluation", async () => {
    const response = await GET(new Request("http://localhost/api/cron/evaluate-concerns"));
    expect(response.status).toBe(401);
    expect(mocks.evaluate).not.toHaveBeenCalled();
  });

  it("runs the evaluator for an authorized scheduler request", async () => {
    const response = await POST(new Request("http://localhost/api/cron/evaluate-concerns", { method: "POST", headers: { authorization: "Bearer cron-secret" } }));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ escalatedCount: 1 });
    expect(mocks.evaluate).toHaveBeenCalledTimes(1);
  });
});
