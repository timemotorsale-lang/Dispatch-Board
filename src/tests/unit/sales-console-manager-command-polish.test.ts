import { describe, expect, it } from "vitest";

import {
  salesConsoleM15ManagerCommandExplainsManagerAction,
  salesConsoleM15ManagerCommandHasDailyPriorities,
  salesConsoleM15ManagerCommandPolish,
  salesConsoleM15ManagerCommandRemainsReadOnly
} from "@/features/sales/sales-console-m15-manager-command-polish";

describe("Sales Console M15 manager command polish", () => {
  it("creates manager daily priorities", () => {
    expect(salesConsoleM15ManagerCommandHasDailyPriorities()).toBe(true);
    expect(salesConsoleM15ManagerCommandPolish.priorities.map((priority) => priority.priority)).toEqual([
      "approval-visibility",
      "lead-leakage",
      "stale-work",
      "vehicle-readiness"
    ]);
  });

  it("explains manager action without creating commands", () => {
    expect(salesConsoleM15ManagerCommandExplainsManagerAction()).toBe(true);
  });

  it("keeps manager command center read-only", () => {
    expect(salesConsoleM15ManagerCommandRemainsReadOnly()).toBe(true);
    expect(salesConsoleM15ManagerCommandPolish.readOnly).toBe(true);
  });
});
