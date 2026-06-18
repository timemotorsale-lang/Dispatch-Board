import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  getBoardReadModelForDate: vi.fn(),
  getBoardReadModelForToday: vi.fn()
}));

vi.mock("@/server/auth/current-user", () => ({
  getCurrentUser: mocks.getCurrentUser
}));

vi.mock("@/server/services/board-read", () => ({
  getBoardReadModelForDate: mocks.getBoardReadModelForDate,
  getBoardReadModelForToday: mocks.getBoardReadModelForToday
}));

import { GET as getBoardForDate } from "@/app/api/board/[date]/route";
import { GET as getBoardForToday } from "@/app/api/board/today/route";

const managerUser = {
  id: "user-manager",
  name: "Morgan Manager",
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
          name: "Riley Inventory",
          email: "riley.inventory@local.test"
        },
        recommendedUser: null,
        vehicleReference: null,
        customerReference: null,
        blockerReason: null,
        readyForReviewAt: null,
        completedAt: null
      }
    ]
  }
};

describe("board read routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue(managerUser);
  });

  afterEach(() => {
    vi.clearAllMocks();
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
      board: null
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
