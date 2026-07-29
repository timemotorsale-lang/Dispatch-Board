import { describe, expect, it } from "vitest";

import {
  salesConsoleM15RoleFirstNavigation,
  salesConsoleM15RoleNavigationCoversCoreRoles,
  salesConsoleM15RoleNavigationRemainsReadOnly,
  salesConsoleM15RoleNavigationUsesInternalSections
} from "@/features/sales/sales-console-m15-role-first-navigation";

describe("Sales Console M15 role-first navigation", () => {
  it("covers the core staff roles", () => {
    expect(salesConsoleM15RoleNavigationCoversCoreRoles()).toBe(true);
    expect(salesConsoleM15RoleFirstNavigation.items.map((item) => item.role)).toEqual([
      "salesperson",
      "sales-manager",
      "bdc-lead-coordinator",
      "admin-owner"
    ]);
  });

  it("keeps role navigation inside the sales console", () => {
    expect(salesConsoleM15RoleNavigationUsesInternalSections()).toBe(true);
  });

  it("remains read-only and guardrail-led", () => {
    expect(salesConsoleM15RoleNavigationRemainsReadOnly()).toBe(true);
    expect(salesConsoleM15RoleFirstNavigation.readOnly).toBe(true);
  });
});
