import { describe, expect, it } from "vitest";

import {
  salesConsoleM35DefaultTabForRole,
  salesConsoleM35EveryPrimaryTabIsSelectable,
  salesConsoleM35EveryRoleChangesContext,
  salesConsoleM35HelpPanel,
  salesConsoleM35OnlyManagerReviewIsLiveSubmit,
  salesConsoleM35OperationalTabs,
  salesConsoleM35PanelsRespond,
  salesConsoleM35ScopePanel,
  salesConsoleM35TabById
} from "@/features/sales/sales-console-m35-operational-tab-interactions";

describe("Sales Console M35 operational tab interactions", () => {
  it("makes every primary tab selectable", () => {
    expect(salesConsoleM35EveryPrimaryTabIsSelectable()).toBe(true);
    expect(salesConsoleM35OperationalTabs.map((tab) => tab.label)).toEqual([
      "Salesperson Today",
      "Lead Operations",
      "Manager Command Center",
      "Inventory Intelligence",
      "Deal Desk",
      "Manager Review",
      "Pilot / Rollout Readiness",
      "Admin / Owner"
    ]);
  });

  it("changes visible operating content by selected tab", () => {
    expect(salesConsoleM35TabById("deal-desk").headline).toContain("Deal context");
    expect(salesConsoleM35TabById("inventory-intelligence").headline).toContain("Vehicle match");
    expect(salesConsoleM35TabById("manager-review").safeAction).toContain("only controlled live submit workflow");
  });

  it("changes role context and default tab by role card selection", () => {
    expect(salesConsoleM35EveryRoleChangesContext()).toBe(true);
    expect(salesConsoleM35DefaultTabForRole("sales-manager")).toBe("manager-command-center");
    expect(salesConsoleM35DefaultTabForRole("bdc-lead-coordinator")).toBe("lead-operations");
  });

  it("makes help and MVP scope panels responsive", () => {
    expect(salesConsoleM35PanelsRespond()).toBe(true);
    expect(salesConsoleM35HelpPanel.body).toContain("Choose a tab");
    expect(salesConsoleM35ScopePanel.body).toContain("Manager Review Request only");
  });

  it("keeps excluded risky workflows unavailable", () => {
    expect(salesConsoleM35OnlyManagerReviewIsLiveSubmit()).toBe(true);
    expect(salesConsoleM35TabById("deal-desk").blockedAction).toContain("Quote submission");
    expect(salesConsoleM35TabById("inventory-intelligence").blockedAction).toContain("Vehicle holds");
  });
});
