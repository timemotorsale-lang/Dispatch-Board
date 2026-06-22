import { ActivityEventType, TaskStatus } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";

import { createTaskAssignmentRepository } from "@/server/repositories/task-assignment-repository";
import { createTaskCommentRepository } from "@/server/repositories/task-comment-repository";
import { createTaskStatusRepository } from "@/server/repositories/task-status-repository";

describe("workflow activity persistence", () => {
  it.each([
    [TaskStatus.IN_PROGRESS, ActivityEventType.STATUS_CHANGED, undefined],
    [TaskStatus.READY_FOR_REVIEW, ActivityEventType.TASK_READY_FOR_REVIEW, undefined],
    [TaskStatus.COMPLETED, ActivityEventType.MANAGER_APPROVED_COMPLETION, "manager"]
  ])("ties %s status events to the board, task, actor, and useful metadata", async (status, expectedType, reviewedByUserId) => {
    const previous = { id: "task", boardDayId: "board", assignedUserId: "staff", requiresManagerApproval: true, status: status === TaskStatus.IN_PROGRESS ? TaskStatus.READY_FOR_REVIEW : TaskStatus.IN_PROGRESS, blockerReason: null, readyForReviewAt: null, completedAt: null, reviewedByUserId: null, updatedAt: new Date() };
    const updated = { ...previous, status, reviewedByUserId: reviewedByUserId ?? null, completedAt: status === TaskStatus.COMPLETED ? new Date("2026-06-21T16:00:00Z") : null };
    const create = vi.fn();
    const tx = { task: { findUniqueOrThrow: vi.fn().mockResolvedValue(previous), update: vi.fn().mockResolvedValue(updated) }, activityEvent: { create } };
    const database = { task: {}, activityEvent: {}, $transaction: (callback: (value: typeof tx) => unknown) => callback(tx) };

    await createTaskStatusRepository(database as never).updateTaskStatusWithActivityEvents("task", "manager", { status, reviewedByUserId });

    expect(create).toHaveBeenCalledWith({ data: expect.objectContaining({ boardDayId: "board", taskId: "task", actorUserId: "manager", eventType: expectedType, metadata: expect.objectContaining({ previousStatus: previous.status, newStatus: status, reviewedByUserId: reviewedByUserId ?? null }) }) });
  });

  it("records an override separately while preserving the recommendation", async () => {
    const previous = { id: "task", boardDayId: "board", assignedUserId: "old", recommendedUserId: "recommended", updatedAt: new Date() };
    const updated = { ...previous, assignedUserId: "override" };
    const create = vi.fn();
    const tx = { task: { findUniqueOrThrow: vi.fn().mockResolvedValue(previous), update: vi.fn().mockResolvedValue(updated) }, activityEvent: { create } };
    const database = { task: {}, user: {}, activityEvent: {}, $transaction: (callback: (value: typeof tx) => unknown) => callback(tx) };

    const result = await createTaskAssignmentRepository(database as never).assignWithActivity("task", "manager", "override", "override", "Better availability");

    expect(result).toMatchObject({ assignedUserId: "override", recommendedUserId: "recommended" });
    expect(tx.task.update).toHaveBeenCalledWith({ where: { id: "task" }, data: { assignedUserId: "override" }, select: expect.any(Object) });
    expect(create).toHaveBeenCalledWith({ data: expect.objectContaining({ boardDayId: "board", taskId: "task", actorUserId: "manager", eventType: ActivityEventType.ASSIGNMENT_CHANGED, metadata: { previousAssignedUserId: "old", assignedUserId: "override", recommendedUserId: "recommended", mode: "override", reason: "Better availability" } }) });
  });

  it("records comment context in a durable activity event", async () => {
    const comment = { id: "comment", taskId: "task", authorUserId: "staff", body: "Work is ready", createdAt: new Date(), authorUser: { id: "staff", name: "Jordan", email: "j@example.com" } };
    const create = vi.fn();
    const tx = { task: { findUniqueOrThrow: vi.fn().mockResolvedValue({ boardDayId: "board" }) }, taskComment: { create: vi.fn().mockResolvedValue(comment) }, activityEvent: { create } };
    const database = { task: {}, taskComment: {}, activityEvent: {}, $transaction: (callback: (value: typeof tx) => unknown) => callback(tx) };

    await createTaskCommentRepository(database as never).createCommentWithActivityEvent("task", "staff", "Work is ready");

    expect(create).toHaveBeenCalledWith({ data: { boardDayId: "board", taskId: "task", actorUserId: "staff", eventType: ActivityEventType.COMMENT_ADDED, message: "Comment added", metadata: { commentId: "comment", authorUserId: "staff", preview: "Work is ready" } } });
  });
});
