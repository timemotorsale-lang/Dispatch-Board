import { describe, expect, it } from "vitest";

import {
  salesConsoleManagerCommandHasDrilldowns,
  salesConsoleManagerCommandKeepsApprovalsGoverned,
  salesConsoleManagerQueues
} from "@/features/sales/sales-console-manager-command";

describe("Sales Console M47 manager command center", () => {
  it("defines manager risk queues with drilldown records", () => {
    expect(salesConsoleManagerCommandHasDrilldowns()).toBe(true);
    expect(salesConsoleManagerQueues.map((queue) => queue.title)).toContain("Review Queue");
    expect(salesConsoleManagerQueues.map((queue) => queue.title)).toContain("Stalled Revenue");
    expect(salesConsoleManagerQueues.map((queue) => queue.title)).toContain("Forecast Confidence");
  });

  it("keeps approvals, discounts, and finance decisions governed", () => {
    expect(salesConsoleManagerCommandKeepsApprovalsGoverned()).toBe(true);
  });
});
