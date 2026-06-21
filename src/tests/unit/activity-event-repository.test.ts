import { ActivityEventType } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";

import { createActivityEvent } from "@/server/repositories/activity-event-repository";

describe("activity event repository", () => {
  it("persists a system board-day event with default metadata", async () => {
    const create = vi.fn().mockResolvedValue({ id: "event-1" });

    await createActivityEvent(
      {
        boardDayId: "board-day-1",
        eventType: ActivityEventType.DAILY_BOARD_GENERATED,
        message: "Today's board was generated."
      },
      { activityEvent: { create } } as never
    );

    expect(create).toHaveBeenCalledWith({
      data: {
        boardDayId: "board-day-1",
        actorUserId: null,
        taskId: null,
        eventType: ActivityEventType.DAILY_BOARD_GENERATED,
        message: "Today's board was generated.",
        metadata: {}
      }
    });
  });

  it("passes actor, task, and structured metadata to an injected transaction client", async () => {
    const create = vi.fn().mockResolvedValue({ id: "event-2" });

    await createActivityEvent(
      {
        boardDayId: "board-day-1",
        actorUserId: "user-1",
        taskId: "task-1",
        eventType: ActivityEventType.STATUS_CHANGED,
        message: "Alex moved the task to In Progress.",
        metadata: { fromStatus: "NOT_STARTED", toStatus: "IN_PROGRESS" }
      },
      { activityEvent: { create } } as never
    );

    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        actorUserId: "user-1",
        taskId: "task-1",
        metadata: { fromStatus: "NOT_STARTED", toStatus: "IN_PROGRESS" }
      })
    });
  });
});
