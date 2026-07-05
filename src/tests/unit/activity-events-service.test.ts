import { Prisma } from "@prisma/client";
import { describe, expect, it } from "vitest";

import type {
  ActivityEventRecord,
  ActivityEventRepository,
  CreateActivityEventInput
} from "@/server/repositories/activity-event-repository";
import { ActivityEventType, createActivityEvent } from "@/server/services/activity-events";

function createActivityEventRepositoryHarness(): {
  events: ActivityEventRecord[];
  repository: ActivityEventRepository;
} {
  const events: ActivityEventRecord[] = [];

  return {
    events,
    repository: {
      async createActivityEvent(input: CreateActivityEventInput) {
        const event = {
          id: `activity-event-${events.length + 1}`,
          boardDayId: input.boardDayId,
          actorUserId: input.actorUserId ?? null,
          taskId: input.taskId ?? null,
          eventType: input.eventType,
          message: input.message,
          metadata: (input.metadata ?? {}) as Prisma.JsonValue,
          createdAt: new Date("2026-06-22T15:00:00.000Z")
        };

        events.push(event);

        return event;
      }
    }
  };
}

describe("activity events service", () => {
  it("creates a system board-day event without actor or task relations", async () => {
    const { events, repository } = createActivityEventRepositoryHarness();

    const event = await createActivityEvent(
      {
        boardDayId: "board-day-1",
        eventType: ActivityEventType.DAILY_BOARD_GENERATED,
        message: "Daily board generated.",
        metadata: {
          createdTaskCount: 12
        }
      },
      repository
    );

    expect(event).toEqual({
      id: "activity-event-1",
      boardDayId: "board-day-1",
      actorUserId: null,
      taskId: null,
      eventType: ActivityEventType.DAILY_BOARD_GENERATED,
      message: "Daily board generated.",
      metadata: {
        createdTaskCount: 12
      },
      createdAt: "2026-06-22T15:00:00.000Z"
    });
    expect(events).toHaveLength(1);
  });

  it("creates a user-generated task event with structured metadata", async () => {
    const { repository } = createActivityEventRepositoryHarness();

    await expect(
      createActivityEvent(
        {
          boardDayId: " board-day-1 ",
          actorUserId: " user-manager-1 ",
          taskId: " task-1 ",
          eventType: ActivityEventType.STATUS_CHANGED,
          message: "  Marked task in progress.  ",
          metadata: {
            fromStatus: "NOT_STARTED",
            toStatus: "IN_PROGRESS"
          }
        },
        repository
      )
    ).resolves.toMatchObject({
      boardDayId: "board-day-1",
      actorUserId: "user-manager-1",
      taskId: "task-1",
      eventType: ActivityEventType.STATUS_CHANGED,
      message: "Marked task in progress.",
      metadata: {
        fromStatus: "NOT_STARTED",
        toStatus: "IN_PROGRESS"
      }
    });
  });

  it("defaults metadata to an empty object", async () => {
    const { repository } = createActivityEventRepositoryHarness();

    await expect(
      createActivityEvent(
        {
          boardDayId: "board-day-1",
          eventType: ActivityEventType.TASK_CREATED,
          message: "Task created."
        },
        repository
      )
    ).resolves.toMatchObject({
      metadata: {}
    });
  });

  it("rejects missing board day ids and messages", async () => {
    const { repository } = createActivityEventRepositoryHarness();

    await expect(
      createActivityEvent(
        {
          boardDayId: " ",
          eventType: ActivityEventType.TASK_CREATED,
          message: "Task created."
        },
        repository
      )
    ).rejects.toThrow("Board day id is required.");

    await expect(
      createActivityEvent(
        {
          boardDayId: "board-day-1",
          eventType: ActivityEventType.TASK_CREATED,
          message: " "
        },
        repository
      )
    ).rejects.toThrow("Activity event message is required.");
  });
});
