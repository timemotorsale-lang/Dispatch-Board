import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  getTaskReadModelById: vi.fn()
}));

vi.mock("@/server/auth/current-user", () => ({
  getCurrentUser: mocks.getCurrentUser
}));

vi.mock("@/server/services/task-read", () => ({
  getTaskReadModelById: mocks.getTaskReadModelById
}));

import { GET } from "@/app/api/tasks/[id]/route";

const staffUser = {
  id: "user-jordan.sales@local.test",
  name: "Baraka Sales",
  email: "jordan.sales@local.test",
  isActive: true,
  roles: ["Salesperson"],
  duties: {
    direct: ["Follow up with assigned leads"],
    roleDefaults: ["Follow up with assigned leads"],
    all: ["Follow up with assigned leads"]
  }
};

describe("task read route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue(staffUser);
  });

  it("returns a task detail payload with blocker and review state", async () => {
    mocks.getTaskReadModelById.mockResolvedValue({
      id: "task-1",
      boardDayId: "board-day-1",
      boardDate: "2026-06-18",
      title: "Review hot lead",
      description: "Call before lunch.",
      status: "READY_FOR_REVIEW",
      dueAt: "2026-06-18T17:00:00.000Z",
      workflowArea: "SALES",
      sourceType: "MANAGER",
      requiresManagerApproval: true,
      vehicleReference: "2019 Camry",
      customerReference: "Taylor R.",
      blockerReason: "Waiting on lender paperwork.",
      readyForReviewAt: "2026-06-18T15:15:00.000Z",
      completedAt: null,
      createdAt: "2026-06-18T13:00:00.000Z",
      updatedAt: "2026-06-18T15:20:00.000Z",
      assignedUser: {
        id: "user-jordan.sales@local.test",
        name: "Baraka Sales",
        email: "jordan.sales@local.test"
      },
      recommendedUser: null,
      recommendation: null,
      createdByUser: {
        id: "user-morgan.manager@local.test",
        name: "Eli Manager",
        email: "morgan.manager@local.test"
      },
      reviewedByUser: null,
      comments: []
    });

    const response = await GET(new Request("http://localhost/api/tasks/task-1"), {
      params: Promise.resolve({
        id: "task-1"
      })
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      task: expect.objectContaining({
        blockerReason: "Waiting on lender paperwork.",
        id: "task-1",
        readyForReviewAt: "2026-06-18T15:15:00.000Z",
        status: "READY_FOR_REVIEW"
      })
    });
    expect(mocks.getTaskReadModelById).toHaveBeenCalledWith(staffUser, "task-1");
  });

  it("returns a 404 when the task does not exist", async () => {
    mocks.getTaskReadModelById.mockResolvedValue(null);

    const response = await GET(new Request("http://localhost/api/tasks/missing-task"), {
      params: Promise.resolve({
        id: "missing-task"
      })
    });

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: "Task not found."
    });
  });

  it("maps authentication failures to a 401 response", async () => {
    mocks.getTaskReadModelById.mockRejectedValue(new Error("Authentication required."));

    const response = await GET(new Request("http://localhost/api/tasks/task-1"), {
      params: Promise.resolve({
        id: "task-1"
      })
    });

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: "Authentication required."
    });
  });
});
