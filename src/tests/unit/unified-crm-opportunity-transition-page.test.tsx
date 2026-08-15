import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AuthenticatedUser } from "@/server/auth/store";

const mocks = vi.hoisted(() => ({
  getUnifiedCrmOpportunityTransitionReview: vi.fn(),
  requireCurrentUser: vi.fn(),
  requireUnifiedCrmOpportunityDetailAccess: vi.fn(),
  resolveUnifiedCrmShellAccess: vi.fn()
}));

vi.mock("@/server/auth/current-user", () => ({ requireCurrentUser: mocks.requireCurrentUser }));
vi.mock("@/server/services/unified-crm-opportunity-transition-service", () => ({ getUnifiedCrmOpportunityTransitionReview: mocks.getUnifiedCrmOpportunityTransitionReview }));
vi.mock("@/server/unified-crm/opportunity-detail-access", () => ({ requireUnifiedCrmOpportunityDetailAccess: mocks.requireUnifiedCrmOpportunityDetailAccess }));
vi.mock("@/server/unified-crm/shell-access", () => ({ resolveUnifiedCrmShellAccess: mocks.resolveUnifiedCrmShellAccess }));

import OpportunityTransitionPage, { safeCrmOpportunityTransitionReturn } from "@/app/(app)/crm/opportunities/[opportunityId]/transition/page";

const actor: AuthenticatedUser = { id: "manager-1", name: "Manager", email: "manager@example.test", isActive: true, roles: ["General Manager"], duties: { direct: [], roleDefaults: [], all: [] } };

function transitionFixture() {
  return {
    contractVersion: "ucrm.opportunity-transition/v1",
    state: "HELD_REVIEW",
    generatedAt: "2026-08-14T19:30:00.000Z",
    requestedOpportunityId: "review01",
    visibility: "organization",
    source: { href: "/crm?view=pipeline", label: "Unified CRM opportunity transition review", observedAt: "2026-08-14T19:30:00.000Z" },
    headline: { title: "Review the first governed opportunity transition flow", detail: "Held transition detail" },
    currentState: { label: "Current lifecycle state", detail: "Held current state", status: "HELD" },
    transitionChecks: [],
    governance: [],
    nextUnlocks: [],
    transitionAction: { label: "Move to next stage", state: "HELD" }
  };
}

describe("Unified CRM opportunity transition page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireCurrentUser.mockResolvedValue(actor);
    mocks.requireUnifiedCrmOpportunityDetailAccess.mockResolvedValue({ recordScope: { kind: "ORGANIZATION" }, organizationId: "org-a" });
    mocks.resolveUnifiedCrmShellAccess.mockReturnValue({ allowed: true, mode: "REVIEW", reason: "ALLOWED", fallbackHref: "/manager-workspace" });
    mocks.getUnifiedCrmOpportunityTransitionReview.mockResolvedValue(transitionFixture());
  });

  it("loads the transition review and preserves a safe Pipeline return", async () => {
    const markup = renderToStaticMarkup(await OpportunityTransitionPage({ params: Promise.resolve({ opportunityId: "review01" }), searchParams: Promise.resolve({ crmReturnTo: "/crm?view=pipeline" }) }));
    expect(mocks.getUnifiedCrmOpportunityTransitionReview).toHaveBeenCalled();
    expect(markup).toContain('href="/crm?view=pipeline"');
  });

  it("preserves a safe CRM customer-detail return when transition review is opened from customer context", async () => {
    const markup = renderToStaticMarkup(await OpportunityTransitionPage({
      params: Promise.resolve({ opportunityId: "review01" }),
      searchParams: Promise.resolve({ crmReturnTo: "/crm/customers/customer-1?crmReturnTo=%2Fcrm%3Fview%3Dcustomers%26status%3Dactive" })
    }));

    expect(markup).toContain('href="/crm/customers/customer-1?crmReturnTo=%2Fcrm%3Fview%3Dcustomers%26status%3Dactive"');
    expect(markup).toContain('href="/crm/customers/customer-1?crmReturnTo=%2Fcrm%3Fview%3Dcustomers%26status%3Dactive">Return to Customer 360');
  });

  it("rejects unsafe return parameters", () => {
    for (const value of ["https://evil.example", "//evil.example", "/crm?view=customers", "/crm?view=pipeline&redirect=https://evil.example"]) {
      expect(safeCrmOpportunityTransitionReturn(value)).toBe("/crm?view=pipeline");
    }
  });

  it("accepts only safe CRM customer-detail return parameters", () => {
    expect(safeCrmOpportunityTransitionReturn("/crm/customers/customer-1?crmReturnTo=%2Fcrm%3Fview%3Dcustomers%26status%3Dactive")).toBe(
      "/crm/customers/customer-1?crmReturnTo=%2Fcrm%3Fview%3Dcustomers%26status%3Dactive"
    );
    expect(safeCrmOpportunityTransitionReturn("/crm/customers/customer-1?crmReturnTo=%2Fcrm%3Fview%3Dpipeline")).toBe(
      "/crm/customers/customer-1?crmReturnTo=%2Fcrm%3Fview%3Dcustomers"
    );
  });

  it("does not read transition review when the shell is off", async () => {
    mocks.resolveUnifiedCrmShellAccess.mockReturnValue({ allowed: false, mode: "OFF", reason: "SHELL_OFF", fallbackHref: "/manager-workspace" });
    const markup = renderToStaticMarkup(await OpportunityTransitionPage({ params: Promise.resolve({ opportunityId: "review01" }), searchParams: Promise.resolve({ crmReturnTo: "/crm?view=pipeline" }) }));
    expect(markup).toContain("Unified CRM is turned off");
    expect(mocks.getUnifiedCrmOpportunityTransitionReview).not.toHaveBeenCalled();
  });

  it.each([
    ["OPPORTUNITY_NOT_AUTHORIZED", "Opportunity transition review isn’t available to you"],
    ["INVALID_OPPORTUNITY_ID", "Opportunity transition review is temporarily unavailable"],
    ["ORGANIZATION_SCOPE_AMBIGUOUS", "Opportunity transition review is temporarily unavailable"]
  ])("maps %s to a safe state without calling or serializing transition data", async (code, expectedTitle) => {
    mocks.requireUnifiedCrmOpportunityDetailAccess.mockRejectedValue(
      Object.assign(new Error(`private transition ${code}`), { code })
    );

    const markup = renderToStaticMarkup(await OpportunityTransitionPage({
      params: Promise.resolve({ opportunityId: "private-review-id" }),
      searchParams: Promise.resolve({})
    }));

    expect(markup).toContain(expectedTitle);
    expect(mocks.getUnifiedCrmOpportunityTransitionReview).not.toHaveBeenCalled();
    expect(markup).not.toContain("private-review-id");
    expect(markup).not.toContain(`private transition ${code}`);
  });
});
