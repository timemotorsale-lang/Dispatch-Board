import { describe, expect, it } from "vitest";

import { salesConsoleMvpExecution } from "@/features/sales/sales-console-mvp-execution";
import { salesConsoleReadAdapterPreview } from "@/features/sales/sales-console-mvp-read-adapters";
import {
  buildSalesConsoleRoleView,
  salesConsoleRoleGuardrailsRemainDisabled,
  salesConsoleRoleViews
} from "@/features/sales/sales-console-mvp-role-views";

describe("Sales Console MVP role views", () => {
  it("builds safe read-only views for every MVP role", () => {
    expect(salesConsoleRoleViews.map((role) => role.role).sort()).toEqual([
      "admin-owner",
      "bdc-lead-coordinator",
      "sales-manager",
      "salesperson"
    ]);

    for (const roleView of salesConsoleRoleViews) {
      expect(roleView.readOnly).toBe(true);
      expect(roleView.sourceSystemBoundary).toContain("system of record");
      expect(roleView.blockedActionCount).toBe(salesConsoleMvpExecution.readOnlyGuardrails.length);
    }
  });

  it("limits salesperson visibility to selling surfaces and hides manager/admin surfaces", () => {
    const roleView = buildSalesConsoleRoleView("salesperson");

    expect(roleView.visibleSurfaces).toContain("Salesperson Today");
    expect(roleView.visibleSurfaces).toContain("Deal Desk");
    expect(roleView.visibleSurfaces).toContain("Inventory Intelligence");
    expect(roleView.restrictedSurfaces).toContain("Manager Command Center");
    expect(roleView.restrictedSurfaces).toContain("MVP Planning Panels");
    expect(roleView.sellerQueueVisible).toBe(salesConsoleReadAdapterPreview.sellerQueue.length);
    expect(roleView.managerRisksVisible).toBe(0);
  });

  it("gives sales managers command-center visibility without enabling approvals", () => {
    const roleView = buildSalesConsoleRoleView("sales-manager");

    expect(roleView.visibleSurfaces).toContain("Manager Command Center");
    expect(roleView.visibleSurfaces).toContain("Lead Operations");
    expect(roleView.visibleSurfaces).toContain("Deal Desk");
    expect(roleView.managerRisksVisible).toBe(salesConsoleReadAdapterPreview.managerRisks.length);
    expect(roleView.futureActions.some((action) => action.label === "Discount approvals" && action.enabled === false)).toBe(true);
  });

  it("keeps BDC and lead coordinator views focused on lead operations", () => {
    const roleView = buildSalesConsoleRoleView("bdc-lead-coordinator");

    expect(roleView.visibleSurfaces).toContain("Lead Operations");
    expect(roleView.visibleSurfaces).toContain("Salesperson Today");
    expect(roleView.restrictedSurfaces).toContain("Deal Desk");
    expect(roleView.restrictedSurfaces).toContain("Manager Command Center");
    expect(roleView.leadSignalsVisible).toBe(salesConsoleReadAdapterPreview.leadOperations.length);
    expect(roleView.dealsVisible).toBe(0);
  });

  it("allows admin and owner review of all MVP surfaces but keeps writes unavailable", () => {
    const roleView = buildSalesConsoleRoleView("admin-owner");

    expect(roleView.visibleSurfaces).toContain("Pilot Readiness");
    expect(roleView.visibleSurfaces).toContain("Real Data Wiring");
    expect(roleView.visibleSurfaces).toContain("MVP Planning Panels");
    expect(roleView.restrictedSurfaces).toHaveLength(0);
    expect(roleView.futureActions.every((action) => action.enabled === false)).toBe(true);
  });

  it("proves excluded MVP workflows are unavailable for every role", () => {
    expect(salesConsoleRoleGuardrailsRemainDisabled()).toBe(true);

    for (const roleView of salesConsoleRoleViews) {
      expect(roleView.futureActions.map((action) => action.label)).toEqual([
        "Customer messaging automation",
        "Quote submission",
        "Vehicle holds or reservations",
        "Finance decisions",
        "Discount approvals"
      ]);
      expect(roleView.futureActions.every((action) => action.state === "disabled" || action.state === "planned")).toBe(true);
    }
  });
});
