import { describe, expect, it } from "vitest";

import {
  adminReviewRequiresAdminOwnerAccess,
  mappedRolesResolveProductionViews,
  resolveSalesConsoleAccess,
  salesConsoleAuthAccessExamples,
  unauthenticatedUsersAreBlocked,
  unknownRolesAreDeniedByDefault
} from "@/features/sales/sales-console-m10-auth-access";

describe("Sales Console M10 auth access mapping", () => {
  it("blocks unauthenticated users from the protected route", () => {
    const decision = resolveSalesConsoleAccess("unauthenticated", null);

    expect(decision.canAccessSalesConsole).toBe(false);
    expect(decision.protectedRouteState).toBe("blocked");
    expect(decision.visibleSurfaces).toEqual([]);
    expect(unauthenticatedUsersAreBlocked()).toBe(true);
  });

  it("denies unmapped authenticated roles by default", () => {
    const decision = resolveSalesConsoleAccess("authenticated", {
      isActive: true,
      roleNames: ["Marketing/Advertisement Manager"],
      userId: "user-marketing"
    });

    expect(decision.canAccessSalesConsole).toBe(false);
    expect(decision.denyByDefault).toBe(true);
    expect(decision.sourceAuth).toBe("role-unmapped");
    expect(unknownRolesAreDeniedByDefault()).toBe(true);
  });

  it("maps real app sales roles into read-only production views", () => {
    const salesperson = resolveSalesConsoleAccess("authenticated", {
      isActive: true,
      roleNames: ["Salesperson"],
      userId: "user-sales"
    });
    const manager = resolveSalesConsoleAccess("authenticated", {
      isActive: true,
      roleNames: ["Sales Manager"],
      userId: "user-manager"
    });

    expect(salesperson.resolvedRole).toBe("salesperson");
    expect(salesperson.visibleSurfaces).toContain("Today");
    expect(manager.resolvedRole).toBe("sales-manager");
    expect(manager.visibleSurfaces).toContain("Manager Command Center");
    expect(mappedRolesResolveProductionViews()).toBe(true);
  });

  it("reserves Admin Review for admin-owner access", () => {
    expect(adminReviewRequiresAdminOwnerAccess()).toBe(true);
    expect(
      salesConsoleAuthAccessExamples
        .filter((decision) => decision.resolvedRole !== "admin-owner")
        .every((decision) => !decision.visibleSurfaces.includes("Admin Review"))
    ).toBe(true);
  });
});
