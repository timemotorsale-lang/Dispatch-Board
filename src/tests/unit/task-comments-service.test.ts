import { describe, expect, it } from "vitest";

import type { TaskCommentRepository } from "@/server/repositories/task-comment-repository";
import { createTaskComment, listTaskComments } from "@/server/services/task-comments";
import { createTestAuthStore } from "@/tests/support/auth-test-store";

function createTaskCommentRepositoryHarness(): TaskCommentRepository {
  const comments = [
    {
      id: "comment-2",
      taskId: "task-1",
      authorUserId: "user-jordan.sales@local.test",
      body: "Pulled customer file.",
      createdAt: new Date("2026-06-18T14:30:00.000Z"),
      authorUser: {
        id: "user-jordan.sales@local.test",
        name: "Jordan Sales",
        email: "jordan.sales@local.test"
      }
    },
    {
      id: "comment-1",
      taskId: "task-1",
      authorUserId: "user-morgan.manager@local.test",
      body: "Lead came back in.\nNeeds follow-up before lunch.",
      createdAt: new Date("2026-06-18T14:00:00.000Z"),
      authorUser: {
        id: "user-morgan.manager@local.test",
        name: "Morgan Manager",
        email: "morgan.manager@local.test"
      }
    }
  ];

  const authorsById = new Map(
    comments.map((comment) => [
      comment.authorUser.id,
      {
        id: comment.authorUser.id,
        name: comment.authorUser.name,
        email: comment.authorUser.email
      }
    ])
  );

  authorsById.set("user-casey.mechanic@local.test", {
    id: "user-casey.mechanic@local.test",
    name: "Casey Mechanic",
    email: "casey.mechanic@local.test"
  });

  const tasks = new Map([
    [
      "task-1",
      {
        id: "task-1",
        assignedUserId: "user-jordan.sales@local.test",
        requiresManagerApproval: false
      }
    ],
    [
      "task-2",
      {
        id: "task-2",
        assignedUserId: "user-casey.mechanic@local.test",
        requiresManagerApproval: true
      }
    ]
  ]);

  return {
    async findTaskById(taskId) {
      return tasks.get(taskId) ?? null;
    },

    async listCommentsForTask(taskId) {
      return comments
        .filter((comment) => comment.taskId === taskId)
        .sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime());
    },

    async createComment(taskId, authorUserId, body) {
      const authorUser = authorsById.get(authorUserId);

      if (!authorUser) {
        throw new Error(`Missing author for ${authorUserId}.`);
      }

      const comment = {
        id: `comment-${comments.length + 1}`,
        taskId,
        authorUserId,
        body,
        createdAt: new Date("2026-06-18T15:00:00.000Z"),
        authorUser
      };

      comments.push(comment);

      return comment;
    }
  };
}

describe("task comments service", () => {
  it("returns task comments with author and timestamp context", async () => {
    const { usersByEmail } = await createTestAuthStore();
    const staffUser = usersByEmail.get("jordan.sales@local.test") ?? null;

    const comments = await listTaskComments(staffUser, "task-1", createTaskCommentRepositoryHarness());

    expect(comments).toEqual([
      {
        id: "comment-1",
        taskId: "task-1",
        authorUserId: "user-morgan.manager@local.test",
        body: "Lead came back in.\nNeeds follow-up before lunch.",
        createdAt: "2026-06-18T14:00:00.000Z",
        author: {
          id: "user-morgan.manager@local.test",
          name: "Morgan Manager",
          email: "morgan.manager@local.test"
        }
      },
      {
        id: "comment-2",
        taskId: "task-1",
        authorUserId: "user-jordan.sales@local.test",
        body: "Pulled customer file.",
        createdAt: "2026-06-18T14:30:00.000Z",
        author: {
          id: "user-jordan.sales@local.test",
          name: "Jordan Sales",
          email: "jordan.sales@local.test"
        }
      }
    ]);
  });

  it("creates a comment on the task with the authenticated author", async () => {
    const { usersByEmail } = await createTestAuthStore();
    const staffUser = usersByEmail.get("jordan.sales@local.test") ?? null;

    const comment = await createTaskComment(
      staffUser,
      "task-1",
      {
        body: "  Contacted customer.\nWaiting on return call.  "
      },
      createTaskCommentRepositoryHarness()
    );

    expect(comment).toEqual({
      id: "comment-3",
      taskId: "task-1",
      authorUserId: "user-jordan.sales@local.test",
      body: "Contacted customer.\nWaiting on return call.",
      createdAt: "2026-06-18T15:00:00.000Z",
      author: {
        id: "user-jordan.sales@local.test",
        name: "Jordan Sales",
        email: "jordan.sales@local.test"
      }
    });
  });

  it("rejects empty and whitespace-only comments", async () => {
    const { usersByEmail } = await createTestAuthStore();
    const staffUser = usersByEmail.get("jordan.sales@local.test") ?? null;

    await expect(
      createTaskComment(
        staffUser,
        "task-1",
        {
          body: "   "
        },
        createTaskCommentRepositoryHarness()
      )
    ).rejects.toThrow("Task comments require a comment body.");
  });

  it("rejects comments longer than 2000 characters", async () => {
    const { usersByEmail } = await createTestAuthStore();
    const staffUser = usersByEmail.get("jordan.sales@local.test") ?? null;

    await expect(
      createTaskComment(
        staffUser,
        "task-1",
        {
          body: "x".repeat(2001)
        },
        createTaskCommentRepositoryHarness()
      )
    ).rejects.toThrow("Task comments must be 2000 characters or fewer.");
  });

  it("allows staff to comment on their own assigned task and rejects other staff tasks", async () => {
    const { usersByEmail } = await createTestAuthStore();
    const staffUser = usersByEmail.get("jordan.sales@local.test") ?? null;

    await expect(
      createTaskComment(
        staffUser,
        "task-1",
        {
          body: "Own task update."
        },
        createTaskCommentRepositoryHarness()
      )
    ).resolves.toMatchObject({
      taskId: "task-1",
      authorUserId: "user-jordan.sales@local.test"
    });

    await expect(
      createTaskComment(
        staffUser,
        "task-2",
        {
          body: "Trying to update another staff task."
        },
        createTaskCommentRepositoryHarness()
      )
    ).rejects.toThrow("You do not have permission to comment on this task.");
  });

  it("allows a manager to comment on any visible task", async () => {
    const { usersByEmail } = await createTestAuthStore();
    const managerUser = usersByEmail.get("morgan.manager@local.test") ?? null;

    await expect(
      createTaskComment(
        managerUser,
        "task-2",
        {
          body: "Manager review note."
        },
        createTaskCommentRepositoryHarness()
      )
    ).resolves.toMatchObject({
      taskId: "task-2",
      authorUserId: "user-morgan.manager@local.test"
    });
  });
});
