import { describe, expect, it } from "vitest";

import {
  adminPanelsAreRestrictedForOperatingRoles,
  eachRoleHasProductionEmptyState,
  getSalesConsoleProductionView,
  ordinaryRolesDoNotSeeAdminReviewSurface,
  salesConsoleRoleProductionViews
} from "@/features/sales/sales-console-m10-production-views";

describe("Sales Console role-specific production views", () => {
  it("defines production views for salesperson, manager, BDC, admin, and finance", () => {
    expect(salesConsoleRoleProductionViews.map((view) => view.role)).toEqual([
      "salesperson",
      "sales-manager",
      "bdc-lead-coordinator",
      "admin-owner",
      "finance"
    ]);
  });

  it("restricts admin review panels from ordinary operating roles", () => {
    expect(adminPanelsAreRestrictedForOperatingRoles()).toBe(true);
    expect(ordinaryRolesDoNotSeeAdminReviewSurface()).toBe(true);
    expect(getSalesConsoleProductionView("salesperson")?.restrictedSurfaces).toContain("Admin Review");
    expect(getSalesConsoleProductionView("admin-owner")?.visibleSurfaces).toContain("Admin Review");
  });

  it("keeps role-specific production empty states available", () => {
    expect(eachRoleHasProductionEmptyState()).toBe(true);
    for (const view of salesConsoleRoleProductionViews) {
      expect(view.emptyState).toContain(".");
      expect(view.primarySurface).toBeTruthy();
    }
  });

  it("keeps future finance role restricted to finance handoff and deal context", () => {
    const finance = getSalesConsoleProductionView("finance");

    expect(finance?.visibleSurfaces).toEqual(["Deal Desk", "Finance Handoff"]);
    expect(finance?.restrictedSurfaces).toContain("Today");
    expect(finance?.emptyState).toContain("Finance decisions stay outside");
  });
});
