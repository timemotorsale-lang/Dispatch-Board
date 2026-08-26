import { describe, expect, it, vi } from "vitest";

import type { AuthenticatedUser } from "@/server/auth/store";
import { getUnifiedCrmDashboardReconciliation } from "@/server/services/unified-crm-dashboard-reconciliation-service";
import type { UnifiedCrmDashboardReconciliationRepository } from "@/server/repositories/unified-crm-dashboard-reconciliation-repository";

const manager: AuthenticatedUser = {
  id: "manager-1",
  name: "Manager One",
  email: "manager@example.test",
  isActive: true,
  roles: ["General Manager"],
  duties: { all: [], direct: [], roleDefaults: [] }
};
const seller: AuthenticatedUser = {
  ...manager,
  id: "seller-1",
  roles: ["Salesperson"]
};
const now = new Date("2026-08-26T18:00:00.000Z");

function repository(overrides: Partial<UnifiedCrmDashboardReconciliationRepository> = {}) {
  return {
    listActiveOrganizationIds: vi.fn(async () => ["org-1"]),
    listRows: vi.fn(async () => [
      { entity: "opportunity", href: "/crm/opportunities/opp-1", id: "opp-1", label: "Accord follow-up", metricId: "ownedWork", updatedAt: now },
      { entity: "opportunity", href: "/crm/opportunities/opp-1", id: "opp-1", label: "Accord follow-up", metricId: "pipeline", updatedAt: now },
      { entity: "opportunity", href: "/crm/opportunities/opp-1", id: "opp-1", label: "Accord follow-up", metricId: "overdueFollowUp", updatedAt: now },
      { entity: "quote", href: "/crm/quotes/quote-1", id: "quote-1", label: "Q-100", metricId: "quotes", updatedAt: now },
      { entity: "dispatch", href: "/crm/opportunities/opp-1", id: "dispatch-1", label: "RO handoff", metricId: "dispatchHandoffs", updatedAt: now }
    ]),
    ...overrides
  } satisfies UnifiedCrmDashboardReconciliationRepository;
}

describe("Unified CRM dashboard reconciliation", () => {
  it("returns manager-only reconciliation metrics, checks, and safe drill-through samples", async () => {
    const result = await getUnifiedCrmDashboardReconciliation(manager, {
      now: () => now,
      repository: repository()
    });

    expect(result.state).toBe("PASS");
    expect(result.visibility).toBe("organization");
    expect(result.metrics.map((metric) => [metric.id, metric.count])).toEqual([
      ["ownedWork", 1],
      ["overdueFollowUp", 1],
      ["pipeline", 1],
      ["quotes", 1],
      ["dispatchHandoffs", 1]
    ]);
    expect(result.checks.every((check) => check.status === "PASS")).toBe(true);
    expect(JSON.stringify(result)).not.toContain("manager@example.test");
  });

  it("warns when the reconciliation query exceeds the budget", async () => {
    const result = await getUnifiedCrmDashboardReconciliation(manager, {
      now: () => now,
      performanceBudgetMs: -1,
      repository: repository()
    });

    expect(result.state).toBe("WARN");
    expect(result.checks.find((check) => check.id === "performance")).toMatchObject({ status: "WARN" });
  });

  it("denies non-manager CRM workspaces and ambiguous organizations", async () => {
    await expect(getUnifiedCrmDashboardReconciliation(seller, { repository: repository() })).rejects.toMatchObject({
      code: "DASHBOARD_RECONCILIATION_NOT_AUTHORIZED"
    });
    await expect(getUnifiedCrmDashboardReconciliation(manager, {
      repository: repository({ listActiveOrganizationIds: vi.fn(async () => ["org-1", "org-2"]) })
    })).rejects.toMatchObject({ code: "ORGANIZATION_SCOPE_AMBIGUOUS" });
  });
});
