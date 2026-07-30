import { describe, expect, it } from "vitest";

import {
  buildSalesConsoleSourceBackedTabStates,
  salesConsoleSourceBackedTabs,
  salesConsoleSourceBackedUiCoversEveryTab
} from "@/features/sales/sales-console-source-backed-ui";

describe("Sales Console source-backed UI", () => {
  it("covers every visible Sales Console tab", () => {
    const states = buildSalesConsoleSourceBackedTabStates();

    expect(states.map((state) => state.tab)).toEqual([...salesConsoleSourceBackedTabs]);
    expect(salesConsoleSourceBackedUiCoversEveryTab()).toBe(true);
  });

  it("exposes fallback and source links honestly", () => {
    const states = buildSalesConsoleSourceBackedTabStates();
    const finance = states.find((state) => state.tab === "Finance Handoff");
    const inventory = states.find((state) => state.tab === "Inventory Intelligence");

    expect(finance?.status).toBe("fallback");
    expect(finance?.staffMessage).toContain("fallback");
    expect(inventory?.status).toBe("ready");
    expect(inventory?.sourceLinks[0]).toBe("/vehicles/360/TMS22145?returnTo=%2Fsales");
  });
});
