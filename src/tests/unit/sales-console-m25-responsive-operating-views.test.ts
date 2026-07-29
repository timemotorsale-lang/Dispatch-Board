import { describe, expect, it } from "vitest";

import {
  salesConsoleM25EveryPrimaryTabIsOperating,
  salesConsoleM25EveryTabHasSafeAction,
  salesConsoleM25NoPlaceholderOnlyPrimaryTabs,
  salesConsoleM25OnlyManagerReviewSubmitIsLive,
  salesConsoleM25ResponsiveOperatingViews
} from "@/features/sales/sales-console-m25-responsive-operating-views";

describe("Sales Console M25 responsive operating views", () => {
  it("marks every primary tab as operating", () => {
    expect(salesConsoleM25EveryPrimaryTabIsOperating()).toBe(true);
    expect(salesConsoleM25ResponsiveOperatingViews.tabs.map((tab) => tab.tab)).toEqual([
      "Salesperson Today",
      "Lead Operations",
      "Deal Desk",
      "Inventory Intelligence",
      "Manager Command Center",
      "Staff Readiness"
    ]);
  });

  it("gives every tab a safe action and blocked-action explanation", () => {
    expect(salesConsoleM25EveryTabHasSafeAction()).toBe(true);
  });

  it("keeps only Manager Review Request live for submit", () => {
    expect(salesConsoleM25OnlyManagerReviewSubmitIsLive()).toBe(true);
  });

  it("removes placeholder-only primary tab posture", () => {
    expect(salesConsoleM25NoPlaceholderOnlyPrimaryTabs()).toBe(true);
  });
});
