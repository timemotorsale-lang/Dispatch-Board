import { ActivityEventType, TaskStatus } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";

import type { AuthenticatedUser } from "@/server/auth/store";
import type { ActivityEventRepository } from "@/server/repositories/activity-event-repository";
import { getActivityFeedForDate } from "@/server/services/activity-feed";

const manager = { id: "manager", roles: ["General Manager"] } as AuthenticatedUser;
const staff = { id: "staff", roles: ["Salesperson"] } as AuthenticatedUser;

function repository(): ActivityEventRepository {
  return {
    createActivityEvent: vi.fn(),
    findBoardDayByDate: vi.fn(async (date) => date === "2026-06-21" ? { id: "board-today" } : null),
    listActivityEventsForBoardDay: vi.fn(async (boardDayId) => boardDayId === "board-today" ? [
      {
        id: "event-new",
        boardDayId,
        actorUserId: "manager",
        taskId: "task-1",
        eventType: ActivityEventType.MANAGER_APPROVED_COMPLETION,
        message: "Manager approved task completion",
        metadata: { reviewedByUserId: "manager" },
        createdAt: new Date("2026-06-21T16:00:00.000Z"),
        actorUser: { id: "manager", name: "Morgan", email: "morgan@example.com" },
        task: { id: "task-1", title: "Inspect vehicle", status: TaskStatus.COMPLETED, workflowArea: "INVENTORY" }
      },
      {
        id: "event-old",
        boardDayId,
        actorUserId: "staff",
        taskId: "task-1",
        eventType: ActivityEventType.TASK_READY_FOR_REVIEW,
        message: "Task marked Ready for Review",
        metadata: {},
        createdAt: new Date("2026-06-21T15:00:00.000Z"),
        actorUser: { id: "staff", name: "Jordan", email: "jordan@example.com" },
        task: { id: "task-1", title: "Inspect vehicle", status: TaskStatus.COMPLETED, workflowArea: "INVENTORY" }
      }
    ] : [])
  } as ActivityEventRepository;
}

describe("activity feed service", () => {
  it.each([manager, staff])("allows authenticated full-board visibility for $id", async (user) => {
    const repo = repository();
    const result = await getActivityFeedForDate(user, "2026-06-21", { repository: repo });

    expect(result).toMatchObject({
      date: "2026-06-21",
      boardDayId: "board-today",
      events: [
        { id: "event-new", actor: { name: "Morgan" }, task: { title: "Inspect vehicle" }, eventType: ActivityEventType.MANAGER_APPROVED_COMPLETION, createdAt: "2026-06-21T16:00:00.000Z" },
        { id: "event-old", createdAt: "2026-06-21T15:00:00.000Z" }
      ]
    });
    expect(repo.listActivityEventsForBoardDay).toHaveBeenCalledWith("board-today");
  });

  it("does not query or leak events when the selected board date does not exist", async () => {
    const repo = repository();
    await expect(getActivityFeedForDate(staff, "2026-06-20", { repository: repo })).resolves.toEqual({ date: "2026-06-20", boardDayId: null, events: [] });
    expect(repo.listActivityEventsForBoardDay).not.toHaveBeenCalled();
  });

  it("rejects unauthenticated feed access", async () => {
    await expect(getActivityFeedForDate(null, "2026-06-21", { repository: repository() })).rejects.toThrow("Authentication required.");
  });
});
