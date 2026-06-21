import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  getActivityFeedForDate: vi.fn(),
  getActivityFeedForToday: vi.fn()
}));

vi.mock("@/server/auth/current-user", () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock("@/server/services/activity-feed", () => ({
  getActivityFeedForDate: mocks.getActivityFeedForDate,
  getActivityFeedForToday: mocks.getActivityFeedForToday
}));

import { GET } from "@/app/api/activity/route";

describe("activity feed route", () => {
  beforeEach(() => vi.clearAllMocks());

  it("loads a selected board date", async () => {
    const payload = { date: "2026-06-21", boardDayId: null, events: [] };
    mocks.getCurrentUser.mockResolvedValue({ id: "user-1" });
    mocks.getActivityFeedForDate.mockResolvedValue(payload);
    const response = await GET(new Request("http://localhost/api/activity?date=2026-06-21"));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(payload);
    expect(mocks.getActivityFeedForDate).toHaveBeenCalledWith({ id: "user-1" }, "2026-06-21");
  });

  it("defaults to today's board date", async () => {
    mocks.getCurrentUser.mockResolvedValue({ id: "user-1" });
    mocks.getActivityFeedForToday.mockResolvedValue({ date: "2026-06-21", boardDayId: null, events: [] });
    const response = await GET(new Request("http://localhost/api/activity"));
    expect(response.status).toBe(200);
    expect(mocks.getActivityFeedForToday).toHaveBeenCalledWith({ id: "user-1" });
  });

  it("maps authentication and date errors", async () => {
    mocks.getCurrentUser.mockResolvedValue(null);
    mocks.getActivityFeedForToday.mockRejectedValue(new Error("Authentication required."));
    expect((await GET(new Request("http://localhost/api/activity"))).status).toBe(401);

    mocks.getActivityFeedForDate.mockRejectedValue(new Error("Board date must use YYYY-MM-DD format."));
    expect((await GET(new Request("http://localhost/api/activity?date=nope"))).status).toBe(400);
  });
});
