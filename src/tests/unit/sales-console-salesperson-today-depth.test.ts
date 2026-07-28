import { describe, expect, it } from "vitest";

import {
  salesConsoleM14SalespersonTodayDepth,
  salesConsoleM14SalespersonTodayExplainsBlockersAndFreshness,
  salesConsoleM14SalespersonTodayHasOperatingGroups,
  salesConsoleM14SalespersonTodayRemainsReadOnly
} from "@/features/sales/sales-console-m14-salesperson-today-depth";

describe("Sales Console M14 Salesperson Today depth", () => {
  it("adds operating groups for the seller queue", () => {
    expect(salesConsoleM14SalespersonTodayHasOperatingGroups()).toBe(true);
    expect(salesConsoleM14SalespersonTodayDepth.groups).toHaveLength(4);
  });

  it("keeps the operating guidance read-only", () => {
    expect(salesConsoleM14SalespersonTodayRemainsReadOnly()).toBe(true);
  });

  it("explains blockers, freshness, and source prompts", () => {
    expect(salesConsoleM14SalespersonTodayExplainsBlockersAndFreshness()).toBe(true);
  });
});
