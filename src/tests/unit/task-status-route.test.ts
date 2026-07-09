import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  updateTaskStatus: vi.fn()
}));

vi.mock("@/server/auth/current-user", () => ({
  getCurrentUser: mocks.getCurrentUser
}));

vi.mock("@/server/services/task-status-service", () => ({
  updateTaskStatus: mocks.updateTaskStatus
}));

import { PATCH, POST } from "@/app/api/tasks/[id]/status/route";

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

describe("task status route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue(staffUser);
  });

  it("returns the updated task when the service succeeds", async () => {
    mocks.updateTaskStatus.mockResolvedValue({
      id: "task-1",
      status: "BLOCKED",
      blockerReason: "Waiting on lender paperwork.",
      updatedAt: "2026-06-18T15:30:00.000Z"
    });

    const response = await POST(
      new Request("http://localhost/api/tasks/task-1/status", {
        method: "POST",
        body: JSON.stringify({
          status: "BLOCKED",
          blockerReason: "Waiting on lender paperwork."
        })
      }),
      {
        params: Promise.resolve({
          id: "task-1"
        })
      }
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      task: {
        id: "task-1",
        status: "BLOCKED",
        blockerReason: "Waiting on lender paperwork.",
        updatedAt: "2026-06-18T15:30:00.000Z"
      }
    });
    expect(mocks.updateTaskStatus).toHaveBeenCalledWith(staffUser, "task-1", {
      status: "BLOCKED",
      blockerReason: "Waiting on lender paperwork."
    });
  });

  it("passes task appointment automation trigger fields through to the service", async () => {
    mocks.updateTaskStatus.mockResolvedValue({
      id: "task-1",
      status: "READY_FOR_REVIEW",
      blockerReason: null,
      updatedAt: "2026-06-18T15:30:00.000Z"
    });

    const response = await PATCH(
      new Request("http://localhost/api/tasks/task-1/status", {
        method: "PATCH",
        body: JSON.stringify({
          status: "READY_FOR_REVIEW",
          appointmentAutomationTriggerCode: "escalation_task_review",
          appointmentAutomationReasonNotes: "Queue a manager review appointment."
        })
      }),
      {
        params: Promise.resolve({
          id: "task-1"
        })
      }
    );

    expect(response.status).toBe(200);
    expect(mocks.updateTaskStatus).toHaveBeenCalledWith(staffUser, "task-1", {
      status: "READY_FOR_REVIEW",
      appointmentAutomationTriggerCode: "escalation_task_review",
      appointmentAutomationReasonNotes: "Queue a manager review appointment."
    });
  });

  it("supports PATCH requests through the same shared handler", async () => {
    mocks.updateTaskStatus.mockResolvedValue({
      id: "task-1",
      status: "IN_PROGRESS",
      blockerReason: null,
      updatedAt: "2026-06-18T15:30:00.000Z"
    });

    const response = await PATCH(
      new Request("http://localhost/api/tasks/task-1/status", {
        method: "PATCH",
        body: JSON.stringify({
          status: "IN_PROGRESS"
        })
      }),
      {
        params: Promise.resolve({
          id: "task-1"
        })
      }
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      task: {
        id: "task-1",
        status: "IN_PROGRESS",
        blockerReason: null,
        updatedAt: "2026-06-18T15:30:00.000Z"
      }
    });
  });

  it("maps blocker validation failures to a 400 response", async () => {
    mocks.updateTaskStatus.mockRejectedValue(new Error("Blocked tasks require a blocker reason."));

    const response = await POST(
      new Request("http://localhost/api/tasks/task-1/status", {
        method: "POST",
        body: JSON.stringify({
          status: "BLOCKED"
        })
      }),
      {
        params: Promise.resolve({
          id: "task-1"
        })
      }
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Blocked tasks require a blocker reason."
    });
  });

  it("maps approval-transition validation failures to a 400 response", async () => {
    mocks.updateTaskStatus.mockRejectedValue(
      new Error("Approval-required tasks must move through Ready for Review before Completed.")
    );

    const response = await POST(
      new Request("http://localhost/api/tasks/task-1/status", {
        method: "POST",
        body: JSON.stringify({
          status: "COMPLETED"
        })
      }),
      {
        params: Promise.resolve({
          id: "task-1"
        })
      }
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Approval-required tasks must move through Ready for Review before Completed."
    });
  });

  it("maps permission failures to a 403 response", async () => {
    mocks.updateTaskStatus.mockRejectedValue(
      new Error("You do not have permission to update this task.")
    );

    const response = await POST(
      new Request("http://localhost/api/tasks/task-1/status", {
        method: "POST",
        body: JSON.stringify({
          status: "IN_PROGRESS"
        })
      }),
      {
        params: Promise.resolve({
          id: "task-1"
        })
      }
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: "You do not have permission to update this task."
    });
  });

  it("maps authentication failures to a 401 response", async () => {
    mocks.updateTaskStatus.mockRejectedValue(new Error("Authentication required."));

    const response = await POST(
      new Request("http://localhost/api/tasks/task-1/status", {
        method: "POST",
        body: JSON.stringify({
          status: "IN_PROGRESS"
        })
      }),
      {
        params: Promise.resolve({
          id: "task-1"
        })
      }
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: "Authentication required."
    });
  });
});
