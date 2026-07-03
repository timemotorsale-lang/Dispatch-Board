import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  updateTaskAssignment: vi.fn()
}));

vi.mock("@/server/auth/current-user", () => ({
  getCurrentUser: mocks.getCurrentUser
}));

vi.mock("@/server/services/task-assignment-service", () => ({
  updateTaskAssignment: mocks.updateTaskAssignment
}));

import { PATCH, POST } from "@/app/api/tasks/[id]/assignment/route";

const managerUser = {
  id: "user-morgan.manager@local.test",
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

describe("task assignment route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue(managerUser);
  });

  it("returns the updated assignment when the service succeeds", async () => {
    mocks.updateTaskAssignment.mockResolvedValue({
      id: "task-1",
      assignedUser: {
        id: "user-casey.mechanic@local.test",
        name: "Casey Mechanic",
        email: "casey.mechanic@local.test"
      },
      recommendedUser: {
        id: "user-jordan.sales@local.test",
        name: "Jordan Sales",
        email: "jordan.sales@local.test"
      },
      recommendation: {
        reasonCode: "DIRECT_DUTY_MATCH",
        explanation:
          "Recommended because this task matches the direct duty Follow up with assigned leads."
      },
      updatedAt: "2026-06-28T15:45:00.000Z"
    });

    const response = await POST(
      new Request("http://localhost/api/tasks/task-1/assignment", {
        method: "POST",
        body: JSON.stringify({
          assignedUserId: "user-casey.mechanic@local.test"
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
        assignedUser: {
          id: "user-casey.mechanic@local.test",
          name: "Casey Mechanic",
          email: "casey.mechanic@local.test"
        },
        recommendedUser: {
          id: "user-jordan.sales@local.test",
          name: "Jordan Sales",
          email: "jordan.sales@local.test"
        },
        recommendation: {
          reasonCode: "DIRECT_DUTY_MATCH",
          explanation:
            "Recommended because this task matches the direct duty Follow up with assigned leads."
        },
        updatedAt: "2026-06-28T15:45:00.000Z"
      }
    });
  });

  it("supports PATCH requests through the same shared handler", async () => {
    mocks.updateTaskAssignment.mockResolvedValue({
      id: "task-1",
      assignedUser: {
        id: "user-casey.mechanic@local.test",
        name: "Casey Mechanic",
        email: "casey.mechanic@local.test"
      },
      recommendedUser: null,
      recommendation: null,
      updatedAt: "2026-06-28T15:45:00.000Z"
    });

    const response = await PATCH(
      new Request("http://localhost/api/tasks/task-1/assignment", {
        method: "PATCH",
        body: JSON.stringify({
          assignedUserId: "user-casey.mechanic@local.test"
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
        assignedUser: {
          id: "user-casey.mechanic@local.test",
          name: "Casey Mechanic",
          email: "casey.mechanic@local.test"
        },
        recommendedUser: null,
        recommendation: null,
        updatedAt: "2026-06-28T15:45:00.000Z"
      }
    });
  });

  it("maps manager permission failures to a 403 response", async () => {
    mocks.updateTaskAssignment.mockRejectedValue(new Error("Manager access required."));

    const response = await POST(
      new Request("http://localhost/api/tasks/task-1/assignment", {
        method: "POST",
        body: JSON.stringify({
          assignedUserId: "user-casey.mechanic@local.test"
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
      error: "Manager access required."
    });
  });

  it("maps duplicate generated-task conflicts to a 400 response", async () => {
    mocks.updateTaskAssignment.mockRejectedValue(
      new Error("This generated task already exists for the selected user on the same board date.")
    );

    const response = await POST(
      new Request("http://localhost/api/tasks/task-1/assignment", {
        method: "POST",
        body: JSON.stringify({
          assignedUserId: "user-casey.mechanic@local.test"
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
      error: "This generated task already exists for the selected user on the same board date."
    });
  });
});
