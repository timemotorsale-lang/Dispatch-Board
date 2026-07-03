import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  listTaskComments: vi.fn(),
  createTaskComment: vi.fn()
}));

vi.mock("@/server/auth/current-user", () => ({
  getCurrentUser: mocks.getCurrentUser
}));

vi.mock("@/server/services/task-comments", () => ({
  listTaskComments: mocks.listTaskComments,
  createTaskComment: mocks.createTaskComment
}));

import { GET, POST } from "@/app/api/tasks/[id]/comments/route";

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

describe("task comments route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue(staffUser);
  });

  it("returns task comments from the GET route", async () => {
    mocks.listTaskComments.mockResolvedValue([
      {
        id: "comment-1",
        taskId: "task-1",
        authorUserId: "user-jordan.sales@local.test",
        body: "Customer called back.",
        createdAt: "2026-06-18T14:30:00.000Z",
        author: {
          id: "user-jordan.sales@local.test",
          name: "Baraka Sales",
          email: "jordan.sales@local.test"
        }
      }
    ]);

    const response = await GET(new Request("http://localhost/api/tasks/task-1/comments"), {
      params: Promise.resolve({
        id: "task-1"
      })
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      comments: [
        {
          id: "comment-1",
          taskId: "task-1",
          authorUserId: "user-jordan.sales@local.test",
          body: "Customer called back.",
          createdAt: "2026-06-18T14:30:00.000Z",
          author: {
            id: "user-jordan.sales@local.test",
            name: "Baraka Sales",
            email: "jordan.sales@local.test"
          }
        }
      ]
    });
    expect(mocks.listTaskComments).toHaveBeenCalledWith(staffUser, "task-1");
  });

  it("creates a task comment from the POST route", async () => {
    mocks.createTaskComment.mockResolvedValue({
      id: "comment-2",
      taskId: "task-1",
      authorUserId: "user-jordan.sales@local.test",
      body: "Updated lender paperwork status.",
      createdAt: "2026-06-18T15:00:00.000Z",
      author: {
        id: "user-jordan.sales@local.test",
        name: "Baraka Sales",
        email: "jordan.sales@local.test"
      }
    });

    const response = await POST(
      new Request("http://localhost/api/tasks/task-1/comments", {
        method: "POST",
        body: JSON.stringify({
          body: "Updated lender paperwork status."
        })
      }),
      {
        params: Promise.resolve({
          id: "task-1"
        })
      }
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({
      comment: {
        id: "comment-2",
        taskId: "task-1",
        authorUserId: "user-jordan.sales@local.test",
        body: "Updated lender paperwork status.",
        createdAt: "2026-06-18T15:00:00.000Z",
        author: {
          id: "user-jordan.sales@local.test",
          name: "Baraka Sales",
          email: "jordan.sales@local.test"
        }
      }
    });
    expect(mocks.createTaskComment).toHaveBeenCalledWith(staffUser, "task-1", {
      body: "Updated lender paperwork status."
    });
  });

  it("maps validation failures to a 400 response", async () => {
    mocks.createTaskComment.mockRejectedValue(new Error("Task comments require a comment body."));

    const response = await POST(
      new Request("http://localhost/api/tasks/task-1/comments", {
        method: "POST",
        body: JSON.stringify({
          body: "   "
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
      error: "Task comments require a comment body."
    });
  });

  it("maps permission failures to a 403 response", async () => {
    mocks.createTaskComment.mockRejectedValue(
      new Error("You do not have permission to comment on this task.")
    );

    const response = await POST(
      new Request("http://localhost/api/tasks/task-1/comments", {
        method: "POST",
        body: JSON.stringify({
          body: "Trying to update another task."
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
      error: "You do not have permission to comment on this task."
    });
  });

  it("maps authentication failures to a 401 response", async () => {
    mocks.listTaskComments.mockRejectedValue(new Error("Authentication required."));

    const response = await GET(new Request("http://localhost/api/tasks/task-1/comments"), {
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
