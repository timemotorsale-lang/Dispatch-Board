import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
<<<<<<< HEAD
  getCurrentUser: vi.fn(),
  updateTaskAssignment: vi.fn()
=======
  assignTask: vi.fn(),
  getCurrentUser: vi.fn()
>>>>>>> main
}));

vi.mock("@/server/auth/current-user", () => ({
  getCurrentUser: mocks.getCurrentUser
}));

vi.mock("@/server/services/task-assignment-service", () => ({
<<<<<<< HEAD
  updateTaskAssignment: mocks.updateTaskAssignment
}));

import { PATCH, POST } from "@/app/api/tasks/[id]/assignment/route";
=======
  assignTask: mocks.assignTask
}));

import { POST } from "@/app/api/tasks/[id]/assign/route";
>>>>>>> main

const managerUser = {
  id: "user-morgan.manager@local.test",
  name: "Morgan Manager",
  email: "morgan.manager@local.test",
  isActive: true,
  roles: ["General Manager"],
  duties: {
<<<<<<< HEAD
    direct: ["Review blockers and approvals"],
    roleDefaults: ["Review blockers and approvals"],
    all: ["Review blockers and approvals"]
=======
    direct: ["Review blocked work"],
    roleDefaults: ["Review blocked work"],
    all: ["Review blocked work"]
>>>>>>> main
  }
};

describe("task assignment route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue(managerUser);
  });

<<<<<<< HEAD
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
=======
  it("returns the assigned task when the service succeeds", async () => {
    mocks.assignTask.mockResolvedValue({
>>>>>>> main
      id: "task-1",
      assignedUser: {
        id: "user-casey.mechanic@local.test",
        name: "Casey Mechanic",
        email: "casey.mechanic@local.test"
      },
<<<<<<< HEAD
      recommendedUser: null,
      recommendation: null,
      updatedAt: "2026-06-28T15:45:00.000Z"
    });

    const response = await PATCH(
      new Request("http://localhost/api/tasks/task-1/assignment", {
        method: "PATCH",
        body: JSON.stringify({
          assignedUserId: "user-casey.mechanic@local.test"
=======
      previousAssignedUserId: "user-jordan.sales@local.test",
      recommendedUser: null,
      recommendationReasonCode: null,
      recommendationReasonText: null,
      recommendationReviewNeeded: null,
      updatedAt: "2026-06-18T15:30:00.000Z"
    });

    const response = await POST(
      new Request("http://localhost/api/tasks/task-1/assign", {
        method: "POST",
        body: JSON.stringify({
          assignedUserId: "user-casey.mechanic@local.test",
          mode: "reassign"
>>>>>>> main
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
<<<<<<< HEAD
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
=======
        previousAssignedUserId: "user-jordan.sales@local.test",
        recommendedUser: null,
        recommendationReasonCode: null,
        recommendationReasonText: null,
        recommendationReviewNeeded: null,
        updatedAt: "2026-06-18T15:30:00.000Z"
      }
    });
    expect(mocks.assignTask).toHaveBeenCalledWith(managerUser, "task-1", {
      assignedUserId: "user-casey.mechanic@local.test",
      mode: "reassign"
    });
  });

  it("maps manager-only failures to a 403 response", async () => {
    mocks.assignTask.mockRejectedValue(new Error("Manager access required."));

    const response = await POST(
      new Request("http://localhost/api/tasks/task-1/assign", {
        method: "POST",
        body: JSON.stringify({
          mode: "accept_recommendation"
>>>>>>> main
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

<<<<<<< HEAD
  it("maps duplicate generated-task conflicts to a 400 response", async () => {
    mocks.updateTaskAssignment.mockRejectedValue(
      new Error("This generated task already exists for the selected user on the same board date.")
    );

    const response = await POST(
      new Request("http://localhost/api/tasks/task-1/assignment", {
        method: "POST",
        body: JSON.stringify({
          assignedUserId: "user-casey.mechanic@local.test"
=======
  it("maps missing tasks to a 404 response", async () => {
    mocks.assignTask.mockRejectedValue(new Error("Task not found."));

    const response = await POST(
      new Request("http://localhost/api/tasks/task-1/assign", {
        method: "POST",
        body: JSON.stringify({
          mode: "accept_recommendation"
        })
      }),
      {
        params: Promise.resolve({
          id: "task-1"
        })
      }
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: "Task not found."
    });
  });

  it("maps assignment validation failures to a 400 response", async () => {
    mocks.assignTask.mockRejectedValue(new Error("Task assignment requires an assigned user."));

    const response = await POST(
      new Request("http://localhost/api/tasks/task-1/assign", {
        method: "POST",
        body: JSON.stringify({
          mode: "override"
>>>>>>> main
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
<<<<<<< HEAD
      error: "This generated task already exists for the selected user on the same board date."
=======
      error: "Task assignment requires an assigned user."
    });
  });

  it("maps authentication failures to a 401 response", async () => {
    mocks.assignTask.mockRejectedValue(new Error("Authentication required."));

    const response = await POST(
      new Request("http://localhost/api/tasks/task-1/assign", {
        method: "POST",
        body: JSON.stringify({
          mode: "accept_recommendation"
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
>>>>>>> main
    });
  });
});
