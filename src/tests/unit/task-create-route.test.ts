import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createManualTask: vi.fn(),
  getCurrentUser: vi.fn()
}));

vi.mock("@/server/auth/current-user", () => ({
  getCurrentUser: mocks.getCurrentUser
}));

vi.mock("@/server/services/task-create-service", () => ({
  createManualTask: mocks.createManualTask
}));

import { POST } from "@/app/api/tasks/route";

const managerUser = {
  id: "user-morgan.manager@local.test",
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

describe("task create route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue(managerUser);
  });

  it("creates a manual task from the POST route", async () => {
    mocks.createManualTask.mockResolvedValue({
      id: "task-1",
      boardDayId: "board-day-1",
      boardDate: "2026-06-18",
      title: "Review hot lead",
      description: "Call before lunch.",
      status: "NOT_STARTED",
      dueAt: "2026-06-18T17:00:00.000Z",
      workflowArea: "SALES",
      sourceType: "MANAGER",
      requiresManagerApproval: false,
      vehicleReference: "2019 Camry",
      customerReference: "Taylor R.",
      blockerReason: null,
      readyForReviewAt: null,
      completedAt: null,
      createdAt: "2026-06-18T15:30:00.000Z",
      updatedAt: "2026-06-18T15:30:00.000Z",
      assignedUser: {
        id: "user-jordan.sales@local.test",
        name: "Baraka Sales",
        email: "jordan.sales@local.test"
      },
      createdByUser: {
        id: "user-morgan.manager@local.test",
        name: "Eli Manager",
        email: "morgan.manager@local.test"
      },
      reviewedByUser: null
    });

    const response = await POST(
      new Request("http://localhost/api/tasks", {
        method: "POST",
        body: JSON.stringify({
          assignedUserId: "user-jordan.sales@local.test",
          boardDate: "2026-06-18",
          dueAt: "2026-06-18T17:00:00.000Z",
          title: "Review hot lead",
          workflowArea: "SALES"
        })
      })
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({
      task: expect.objectContaining({
        id: "task-1",
        title: "Review hot lead"
      })
    });
    expect(mocks.createManualTask).toHaveBeenCalledWith(managerUser, {
      assignedUserId: "user-jordan.sales@local.test",
      boardDate: "2026-06-18",
      dueAt: "2026-06-18T17:00:00.000Z",
      title: "Review hot lead",
      workflowArea: "SALES"
    });
  });

  it("maps validation failures to a 400 response", async () => {
    mocks.createManualTask.mockRejectedValue(new Error("Task creation requires a due time."));

    const response = await POST(
      new Request("http://localhost/api/tasks", {
        method: "POST",
        body: JSON.stringify({
          boardDate: "2026-06-18",
          title: "Review hot lead",
          workflowArea: "SALES"
        })
      })
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Task creation requires a due time."
    });
  });

  it("maps manager permission failures to a 403 response", async () => {
    mocks.createManualTask.mockRejectedValue(new Error("Manager access required."));

    const response = await POST(
      new Request("http://localhost/api/tasks", {
        method: "POST",
        body: JSON.stringify({
          assignedUserId: "user-jordan.sales@local.test",
          boardDate: "2026-06-18",
          dueAt: "2026-06-18T17:00:00.000Z",
          title: "Review hot lead",
          workflowArea: "SALES"
        })
      })
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: "Manager access required."
    });
  });

  it("maps authentication failures to a 401 response", async () => {
    mocks.createManualTask.mockRejectedValue(new Error("Authentication required."));

    const response = await POST(
      new Request("http://localhost/api/tasks", {
        method: "POST",
        body: JSON.stringify({
          assignedUserId: "user-jordan.sales@local.test",
          boardDate: "2026-06-18",
          dueAt: "2026-06-18T17:00:00.000Z",
          title: "Review hot lead",
          workflowArea: "SALES"
        })
      })
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: "Authentication required."
    });
  });
});
