import { describe, expect, it } from "vitest";

import { filterActivityEvents } from "@/features/activity/activity-feed-panel";
import { formatActivityEventLabel, getActivityEventTone } from "@/features/activity/activity-types";
import type { ActivityFeedModel } from "@/server/services/activity-feed";

const feed: ActivityFeedModel = {
  date: "2026-06-22",
  boardDayId: "board-day-1",
  events: [
    {
      id: "event-1",
      eventType: "TASK_BLOCKED",
      message: "Walter blocked Repair status update",
      createdAt: "2026-06-22T15:00:00.000Z",
      actor: {
        id: "user-mechanic",
        name: "Walter Mechanic",
        email: "walter.mechanic@local.test"
      },
      task: {
        id: "task-1",
        title: "Repair status update",
        status: "BLOCKED",
        workflowArea: "INVENTORY"
      },
      metadata: {}
    },
    {
      id: "event-2",
      eventType: "COMMENT_ADDED",
      message: "Jordan added an update",
      createdAt: "2026-06-22T15:10:00.000Z",
      actor: {
        id: "user-sales",
        name: "Jordan Sales",
        email: "jordan.sales@local.test"
      },
      task: {
        id: "task-2",
        title: "Follow up with lead",
        status: "IN_PROGRESS",
        workflowArea: "SALES"
      },
      metadata: {}
    },
    {
      id: "event-3",
      eventType: "DAILY_BOARD_GENERATED",
      message: "Daily board generated",
      createdAt: "2026-06-22T14:00:00.000Z",
      actor: null,
      task: null,
      metadata: {}
    }
  ]
};

describe("activity feed UI helpers", () => {
  it("formats known and fallback activity labels", () => {
    expect(formatActivityEventLabel("TASK_COMPLETED")).toBe("Task completed");
    expect(formatActivityEventLabel("CUSTOM_EVENT")).toBe("Custom event");
  });

  it("assigns visual tones for important activity", () => {
    expect(getActivityEventTone(feed.events[0])).toBe("danger");
    expect(getActivityEventTone(feed.events[2])).toBe("system");
  });

  it("filters events into user-facing groups", () => {
    expect(filterActivityEvents(feed, "all")).toHaveLength(3);
    expect(filterActivityEvents(feed, "blocked").map((event) => event.id)).toEqual(["event-1"]);
    expect(filterActivityEvents(feed, "comments").map((event) => event.id)).toEqual(["event-2"]);
    expect(filterActivityEvents(feed, "system").map((event) => event.id)).toEqual(["event-3"]);
    expect(filterActivityEvents(feed, "tasks").map((event) => event.id)).toEqual(["event-1", "event-2"]);
  });
});
