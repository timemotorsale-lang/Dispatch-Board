import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  getActivityFeedForDate: vi.fn(),
  getActivityFeedForToday: vi.fn()
}));

vi.mock("@/server/auth/current-user", () => ({
  getCurrentUser: mocks.getCurrentUser
}));

vi.mock("@/server/services/activity-feed", () => ({
  getActivityFeedForDate: mocks.getActivityFeedForDate,
  getActivityFeedForToday: mocks.getActivityFeedForToday
}));

import { GET } from "@/app/api/activity/route";

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

const feedPayload = {
  date: "2026-06-21",
  boardDayId: "board-day-1",
  events: [
    {
      id: "activity-event-1",
      eventType: "TASK_COMPLETED",
      message: "Jordan completed Follow up with hot lead",
      createdAt: "2026-06-21T16:00:00.000Z",
      actor: {
        id: "user-sales",
        name: "Baraka Sales",
        email: "jordan.sales@local.test"
      },
      task: {
        id: "task-1",
        title: "Follow up with hot lead",
        status: "COMPLETED",
        workflowArea: "SALES"
      },
      metadata: {}
    }
  ]
};

describe("activity feed route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue(managerUser);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns activity feed data for a selected date", async () => {
    mocks.getActivityFeedForDate.mockResolvedValue(feedPayload);

    const response = await GET(new Request("http://localhost/api/activity?date=2026-06-21"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(feedPayload);
    expect(mocks.getActivityFeedForDate).toHaveBeenCalledWith(managerUser, "2026-06-21");
  });

  it("returns today's feed when no date query is provided", async () => {
    mocks.getActivityFeedForToday.mockResolvedValue(feedPayload);

    const response = await GET(new Request("http://localhost/api/activity"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(feedPayload);
    expect(mocks.getActivityFeedForToday).toHaveBeenCalledWith(managerUser);
  });

  it("maps missing auth to a 401 response", async () => {
    mocks.getActivityFeedForToday.mockRejectedValue(new Error("Authentication required."));

    const response = await GET(new Request("http://localhost/api/activity"));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: "Authentication required."
    });
  });

  it("maps invalid dates to a 400 response", async () => {
    mocks.getActivityFeedForDate.mockRejectedValue(
      new Error("Board date must use YYYY-MM-DD format.")
    );

    const response = await GET(new Request("http://localhost/api/activity?date=not-a-date"));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Board date must use YYYY-MM-DD format."
    });
  });
});
