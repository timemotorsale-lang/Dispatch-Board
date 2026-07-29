import { describe, expect, it } from "vitest";

import {
  salesConsoleM15EmptyStateClarity,
  salesConsoleM15EmptyStatesCoverOperatingSections,
  salesConsoleM15EmptyStatesExplainFallbacks,
  salesConsoleM15EmptyStatesRemainReadOnly
} from "@/features/sales/sales-console-m15-empty-state-clarity";

describe("Sales Console M15 empty state clarity", () => {
  it("covers the operating sections that staff can misunderstand when data is missing", () => {
    expect(salesConsoleM15EmptyStatesCoverOperatingSections()).toBe(true);
    expect(salesConsoleM15EmptyStateClarity.items.map((item) => item.section)).toEqual([
      "Salesperson Today",
      "Lead Operations",
      "Deal Desk",
      "Inventory Intelligence"
    ]);
  });

  it("explains fallback labels and verification steps", () => {
    expect(salesConsoleM15EmptyStatesExplainFallbacks()).toBe(true);
    expect(salesConsoleM15EmptyStateClarity.items.some((item) => item.fallbackLabel === "stale")).toBe(true);
    expect(salesConsoleM15EmptyStateClarity.items.some((item) => item.fallbackLabel === "verify-first")).toBe(true);
  });

  it("remains read-only", () => {
    expect(salesConsoleM15EmptyStatesRemainReadOnly()).toBe(true);
    expect(salesConsoleM15EmptyStateClarity.readOnly).toBe(true);
  });
});
