import { describe, expect, it } from "vitest";
import { activityActionLabel, filterActivityEvents, type ActivityEvent } from "@/features/activity/activity-types";
const event = (eventType: string, actor: ActivityEvent["actor"] = { id: "u1", name: "Pat", email: "p@example.com" }): ActivityEvent => ({ id: eventType, eventType, message: "Update", createdAt: "2026-06-21T12:00:00.000Z", actor, task: eventType === "DAILY_BOARD_GENERATED" ? null : { id: "t1", title: "Inspect car", status: "IN_PROGRESS", workflowArea: "INVENTORY" } });
describe("activity presentation", () => {
  const events = [event("TASK_BLOCKED"), event("COMMENT_ADDED"), event("STATUS_CHANGED"), event("DAILY_BOARD_GENERATED", null)];
  it("filters common feed categories", () => { expect(filterActivityEvents(events, "blocked")).toHaveLength(1); expect(filterActivityEvents(events, "comments")).toHaveLength(1); expect(filterActivityEvents(events, "status")).toHaveLength(1); expect(filterActivityEvents(events, "system")).toHaveLength(1); expect(filterActivityEvents(events, "tasks")).toHaveLength(3); });
  it("uses readable action labels", () => { expect(activityActionLabel("TASK_READY_FOR_REVIEW")).toBe("Marked ready for review"); });
});
