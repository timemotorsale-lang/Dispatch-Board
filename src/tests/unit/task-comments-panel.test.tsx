import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

import {
  appendTaskComment,
  canSubmitTaskComment,
  TaskCommentsPanel
} from "@/features/tasks/task-comments-panel";

const existingComments = [
  {
    id: "comment-1",
    taskId: "task-1",
    authorUserId: "user-manager",
    body: "First update",
    createdAt: "2026-06-18T14:00:00.000Z",
    author: {
      id: "user-manager",
      name: "Eli Manager",
      email: "morgan.manager@local.test"
    }
  }
];

describe("task comments panel", () => {
  it("shows the empty state and a comment form when no updates exist", () => {
    const markup = renderToStaticMarkup(
      <TaskCommentsPanel canComment initialComments={[]} taskId="task-1" />
    );

    expect(markup).toContain("No comments on this task");
    expect(markup).toContain("Task updates will appear here");
    expect(markup).toContain("Add update");
    expect(markup).toContain("Plain text only. Line breaks are preserved.");
  });

  it("shows existing comments and a readonly message when commenting is disabled", () => {
    const markup = renderToStaticMarkup(
      <TaskCommentsPanel canComment={false} initialComments={existingComments} taskId="task-1" />
    );

    expect(markup).toContain("Eli Manager");
    expect(markup).toContain("First update");
    expect(markup).toContain("Only the assigned staff member or a manager can add updates");
  });

  it("appends new comments to the end of the current list", () => {
    expect(
      appendTaskComment(existingComments, {
        id: "comment-2",
        taskId: "task-1",
        authorUserId: "user-staff",
        body: "Second update",
        createdAt: "2026-06-18T14:30:00.000Z",
        author: {
          id: "user-staff",
          name: "Baraka Sales",
          email: "jordan.sales@local.test"
        }
      })
    ).toEqual([
      existingComments[0],
      {
        id: "comment-2",
        taskId: "task-1",
        authorUserId: "user-staff",
        body: "Second update",
        createdAt: "2026-06-18T14:30:00.000Z",
        author: {
          id: "user-staff",
          name: "Baraka Sales",
          email: "jordan.sales@local.test"
        }
      }
    ]);
  });

  it("requires non-empty input before a comment can be submitted", () => {
    expect(canSubmitTaskComment("   ", false)).toBe(false);
    expect(canSubmitTaskComment("Real update", false)).toBe(true);
    expect(canSubmitTaskComment("Real update", true)).toBe(false);
  });
});
