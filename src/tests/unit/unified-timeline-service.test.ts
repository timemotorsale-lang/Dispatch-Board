import { describe, expect, it } from "vitest";
import { buildUnifiedTimeline, orderUnifiedTimelineItems } from "@/server/services/unified-timeline-service";

describe("unified timeline service", () => {
  it("orders events newest first with deterministic same-time ties", () => {
    const timeline = orderUnifiedTimelineItems([
      { id: "a", occurredAt: "2026-09-08T15:00:00.000Z" },
      { id: "c", occurredAt: "2026-09-08T14:00:00.000Z" },
      { id: "b", occurredAt: "2026-09-08T15:00:00.000Z" }
    ]);

    expect(timeline.map((item) => item.id)).toEqual(["b", "a", "c"]);
  });

  it("filters by source and type while preserving available filter counts", () => {
    const timeline = buildUnifiedTimeline([
      { id: "customer-call", type: "contacted", source: "customer_360", title: "Called customer", occurredAt: "2026-09-08T16:00:00.000Z" },
      { id: "vehicle-photo", type: "uploaded", source: "vehicle_360", title: "Uploaded walkaround", occurredAt: "2026-09-08T15:00:00.000Z" },
      { id: "manager-review", type: "escalated", source: "manager_command_center", title: "Manager review", occurredAt: "2026-09-08T14:00:00.000Z" }
    ], { source: "vehicle_360", type: "uploaded" });

    expect(timeline.items.map((item) => item.id)).toEqual(["vehicle-photo"]);
    expect(timeline.filters.sources.find((source) => source.value === "vehicle_360")).toMatchObject({ count: 1, selected: true });
    expect(timeline.filters.types.find((type) => type.value === "uploaded")).toMatchObject({ count: 1, selected: true });
  });

  it("caps the visible timeline so execution surfaces stay compact", () => {
    const timeline = buildUnifiedTimeline([
      { id: "one", type: "created", source: "staff_workbook", title: "One", occurredAt: "2026-09-08T13:00:00.000Z" },
      { id: "two", type: "updated", source: "staff_workbook", title: "Two", occurredAt: "2026-09-08T14:00:00.000Z" },
      { id: "three", type: "completed", source: "staff_workbook", title: "Three", occurredAt: "2026-09-08T15:00:00.000Z" }
    ], { limit: 2 });

    expect(timeline.items.map((item) => item.id)).toEqual(["three", "two"]);
    expect(timeline.page).toMatchObject({ limit: 2, hasMore: true });
  });
});
