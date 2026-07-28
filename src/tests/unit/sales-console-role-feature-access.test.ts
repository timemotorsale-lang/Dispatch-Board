import { describe, expect, it } from "vitest";

import {
  getSalesConsoleM11RoleFeatureAccess,
  salesConsoleM11EveryRoleHasFeatureAccess,
  salesConsoleM11FeatureAccessRemainsReadOnly,
  salesConsoleM11FinanceVisibilityCannotDecideFinance,
  salesConsoleM11OnlyAdminOwnerSeesAdminReviewPanels,
  salesConsoleM11RoleFeatureAccess
} from "@/features/sales/sales-console-m11-role-feature-access";

describe("Sales Console M11 role-to-feature access", () => {
  it("defines read-only feature access for every dogfood role", () => {
    expect(salesConsoleM11EveryRoleHasFeatureAccess()).toBe(true);
    expect(salesConsoleM11RoleFeatureAccess).toHaveLength(7);
  });

  it("keeps excluded workflows disabled for every role", () => {
    expect(salesConsoleM11FeatureAccessRemainsReadOnly()).toBe(true);
  });

  it("restricts admin review panels to Admin / Owner", () => {
    expect(salesConsoleM11OnlyAdminOwnerSeesAdminReviewPanels()).toBe(true);
  });

  it("keeps finance visibility from becoming finance decisions", () => {
    expect(salesConsoleM11FinanceVisibilityCannotDecideFinance()).toBe(true);
    expect(getSalesConsoleM11RoleFeatureAccess("finance-visibility")?.disabledPlannedActions).toContain("Finance decisions");
  });
});
