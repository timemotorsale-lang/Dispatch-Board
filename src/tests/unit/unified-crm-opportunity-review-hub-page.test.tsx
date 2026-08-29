import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AuthenticatedUser } from "@/server/auth/store";

const mocks = vi.hoisted(() => ({
  getUnifiedCrmOpportunityReviewHub: vi.fn(),
  requireCurrentUser: vi.fn(),
  requireUnifiedCrmOpportunityDetailAccess: vi.fn(),
  resolveUnifiedCrmShellAccess: vi.fn()
}));

vi.mock("@/server/auth/current-user", () => ({ requireCurrentUser: mocks.requireCurrentUser }));
vi.mock("@/server/services/unified-crm-opportunity-review-hub-service", () => ({ getUnifiedCrmOpportunityReviewHub: mocks.getUnifiedCrmOpportunityReviewHub }));
vi.mock("@/server/unified-crm/opportunity-detail-access", () => ({ requireUnifiedCrmOpportunityDetailAccess: mocks.requireUnifiedCrmOpportunityDetailAccess }));
vi.mock("@/server/unified-crm/shell-access", () => ({ resolveUnifiedCrmShellAccess: mocks.resolveUnifiedCrmShellAccess }));

import OpportunityHubPage from "@/app/(app)/crm/opportunities/page";
import { safeUnifiedCrmOpportunityReturn } from "@/server/unified-crm/opportunity-review-return";

const actor: AuthenticatedUser = {
  id: "manager-1",
  name: "Manager",
  email: "manager@example.test",
  isActive: true,
  roles: ["General Manager"],
  duties: { direct: [], roleDefaults: [], all: [] }
};

function hubFixture() {
  return {
    contractVersion: "ucrm.opportunity-review-hub/v1",
    generatedAt: "2026-08-15T00:15:00.000Z",
    headline: {
      title: "Review the full opportunity experience from one safe hub",
      detail: "Held hub detail"
    },
    liveReadObservation: {
      detail: "No same-scope persisted read-only opportunity is visible right now for organization review. Continue with held review surfaces until one is available.",
      freshnessLabel: "No visible persisted opportunity update is available yet.",
      newestVisibleRecordUpdatedAt: null,
      state: "EMPTY",
      visibleRecordCount: 0
    },
    nextUnlocks: [],
    sections: [],
    source: {
      href: "/crm?view=pipeline",
      label: "Unified CRM opportunity review hub",
      observedAt: "2026-08-15T00:15:00.000Z"
    },
    state: "HELD_REVIEW",
    visibility: "organization"
  };
}

describe("Unified CRM opportunity review hub page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireCurrentUser.mockResolvedValue(actor);
    mocks.requireUnifiedCrmOpportunityDetailAccess.mockResolvedValue({ recordScope: { kind: "ORGANIZATION" }, organizationId: "org-a" });
    mocks.resolveUnifiedCrmShellAccess.mockReturnValue({ allowed: true, mode: "REVIEW", reason: "ALLOWED", fallbackHref: "/manager-workspace" });
    mocks.getUnifiedCrmOpportunityReviewHub.mockResolvedValue(hubFixture());
  });

  it("loads the review hub and preserves only a safe Pipeline return", async () => {
    const markup = renderToStaticMarkup(await OpportunityHubPage({ searchParams: Promise.resolve({ crmReturnTo: "/crm?view=pipeline" }) }));
    expect(mocks.getUnifiedCrmOpportunityReviewHub).toHaveBeenCalledWith(actor, expect.objectContaining({ accessContext: expect.any(Object) }));
    expect(markup).toContain('href="/crm?view=pipeline"');
  });

  it("accepts a safe CRM customer return path", () => {
    expect(safeUnifiedCrmOpportunityReturn("/crm/customers/customer-1?crmReturnTo=%2Fcrm%3Fview%3Dcustomers%26q%3DAlex")).toBe(
      "/crm/customers/customer-1?crmReturnTo=%2Fcrm%3Fview%3Dcustomers%26q%3DAlex"
    );
  });

  it("rejects unsafe return parameters", () => {
    for (const value of ["https://evil.example", "//evil.example", "/crm?view=customers", "/crm?view=pipeline&redirect=https://evil.example"]) {
      expect(safeUnifiedCrmOpportunityReturn(value)).toBe("/crm?view=pipeline");
    }
  });

  it("does not read or serialize the hub when the CRM shell is off", async () => {
    mocks.resolveUnifiedCrmShellAccess.mockReturnValue({ allowed: false, mode: "OFF", reason: "SHELL_OFF", fallbackHref: "/manager-workspace" });
    const markup = renderToStaticMarkup(await OpportunityHubPage({ searchParams: Promise.resolve({ crmReturnTo: "/crm?view=pipeline" }) }));
    expect(markup).toContain("Unified CRM is turned off");
    expect(mocks.requireUnifiedCrmOpportunityDetailAccess).not.toHaveBeenCalled();
    expect(mocks.getUnifiedCrmOpportunityReviewHub).not.toHaveBeenCalled();
  });

  it.each([
    ["OPPORTUNITY_NOT_AUTHORIZED", "Opportunity review hub isn’t available to you"],
    ["ORGANIZATION_SCOPE_UNAVAILABLE", "Opportunity review hub isn’t available to you"],
    ["ORGANIZATION_SCOPE_AMBIGUOUS", "Opportunity review hub is temporarily unavailable"],
    ["OPPORTUNITY_OFF", "Opportunity review hub is temporarily unavailable"]
  ])("maps %s to a safe state without echoing backend text", async (code, expectedTitle) => {
    mocks.requireUnifiedCrmOpportunityDetailAccess.mockRejectedValue(
      Object.assign(new Error(`backend ${code} private detail`), { code })
    );

    const markup = renderToStaticMarkup(await OpportunityHubPage({ searchParams: Promise.resolve({}) }));

    expect(markup).toContain(expectedTitle);
    expect(mocks.getUnifiedCrmOpportunityReviewHub).not.toHaveBeenCalled();
    expect(markup).not.toContain(`backend ${code}`);
  });

  it("does not serialize a rejected hub model or backend error", async () => {
    mocks.getUnifiedCrmOpportunityReviewHub.mockRejectedValue(
      new Error("secret opportunity hub customer-a")
    );

    const markup = renderToStaticMarkup(await OpportunityHubPage({
      searchParams: Promise.resolve({})
    }));

    expect(markup).toContain("Opportunity review hub couldn’t be loaded");
    expect(markup).not.toContain("secret opportunity hub");
    expect(markup).not.toContain("customer-a");
  });

  it("rejects arrays, duplicate parameters, fragments, and encoded external navigation", () => {
    for (const value of [
      ["/crm?view=pipeline"],
      "/crm?view=pipeline&view=pipeline",
      "/crm?view=pipeline#https://evil.example",
      "/crm?view=pipeline&next=%2F%2Fevil.example"
    ]) {
      expect(safeUnifiedCrmOpportunityReturn(value)).toBe("/crm?view=pipeline");
    }
  });
});
