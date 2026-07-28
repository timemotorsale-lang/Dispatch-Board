import { describe, expect, it } from "vitest";

import {
  buildSalesConsoleProductionReadiness,
  salesConsoleProductionReadiness
} from "@/features/sales/sales-console-mvp-production-readiness";

describe("Sales Console MVP production readiness", () => {
  it("keeps the production MVP read-only with no blocked readiness checks", () => {
    expect(salesConsoleProductionReadiness.readOnly).toBe(true);
    expect(salesConsoleProductionReadiness.productionChecks.every((check) => check.status !== "blocked")).toBe(true);
  });

  it("separates operational surfaces from admin review surfaces", () => {
    const readiness = buildSalesConsoleProductionReadiness();

    expect(readiness.operationalSurfaces.map((surface) => surface.surface)).toEqual([
      "Salesperson Today",
      "Lead Operations",
      "Deal Desk",
      "Inventory Intelligence",
      "Manager Command Center"
    ]);
    expect(readiness.adminReviewSurfaces.map((surface) => surface.surface)).toContain("MVP Planning Panels");
    expect(readiness.adminReviewSurfaces.every((surface) => surface.audience === "admin-review")).toBe(true);
  });

  it("confirms excluded write workflows remain disabled or planned", () => {
    const readiness = buildSalesConsoleProductionReadiness();

    expect(readiness.productionChecks).toContainEqual(
      expect.objectContaining({
        check: "Read-only production guardrails",
        status: "ready"
      })
    );
    expect(readiness.knownLimitations[0]).toContain("no customer messaging");
    expect(readiness.knownLimitations[0]).toContain("quote submission");
    expect(readiness.knownLimitations[0]).toContain("holds");
    expect(readiness.knownLimitations[0]).toContain("finance decisions");
    expect(readiness.knownLimitations[0]).toContain("discount approvals");
  });

  it("requires honest source, freshness, fallback, and unavailable labels", () => {
    const readiness = buildSalesConsoleProductionReadiness();

    expect(readiness.productionChecks).toContainEqual(
      expect.objectContaining({
        check: "Honest source data labels",
        status: "ready"
      })
    );
    expect(readiness.knownLimitations.some((limitation) => limitation.includes("source of truth"))).toBe(true);
  });

  it("defines production empty states for clean operational use", () => {
    const readiness = buildSalesConsoleProductionReadiness();

    expect(readiness.emptyStates).toHaveLength(4);
    expect(readiness.emptyStates.every((state) => state.userMessage.length > 0)).toBe(true);
    expect(readiness.emptyStates.every((state) => state.verification.length > 0)).toBe(true);
  });
});
