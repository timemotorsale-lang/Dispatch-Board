import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AuthenticatedUser } from "@/server/auth/store";

const mocks = vi.hoisted(() => ({
  getUnifiedCrmOpportunityGuidedJourney: vi.fn(),
  requireCurrentUser: vi.fn(),
  requireUnifiedCrmOpportunityDetailAccess: vi.fn(),
  resolveUnifiedCrmShellAccess: vi.fn()
}));

vi.mock("@/server/auth/current-user", () => ({ requireCurrentUser: mocks.requireCurrentUser }));
vi.mock("@/server/services/unified-crm-opportunity-guided-journey-service", () => ({ getUnifiedCrmOpportunityGuidedJourney: mocks.getUnifiedCrmOpportunityGuidedJourney }));
vi.mock("@/server/unified-crm/opportunity-detail-access", () => ({ requireUnifiedCrmOpportunityDetailAccess: mocks.requireUnifiedCrmOpportunityDetailAccess }));
vi.mock("@/server/unified-crm/shell-access", () => ({ resolveUnifiedCrmShellAccess: mocks.resolveUnifiedCrmShellAccess }));

import OpportunityGuidedJourneyPage from "@/app/(app)/crm/opportunities/guided/page";
import { safeUnifiedCrmOpportunityReturn } from "@/server/unified-crm/opportunity-review-return";

const actor: AuthenticatedUser = {
  id: "manager-1",
  name: "Manager",
  email: "manager@example.test",
  isActive: true,
  roles: ["General Manager"],
  duties: { direct: [], roleDefaults: [], all: [] }
};

function guidedFixture() {
  return {
    contractVersion: "ucrm.opportunity-guided-journey/v1",
    generatedAt: "2026-08-15T01:00:00.000Z",
    headline: {
      title: "Review the first guided opportunity journey safely",
      detail: "Held guided detail"
    },
    nextUnlocks: [],
    phases: [],
    source: {
      href: "/crm?view=pipeline",
      label: "Unified CRM guided opportunity journey",
      observedAt: "2026-08-15T01:00:00.000Z"
    },
    state: "HELD_REVIEW",
    visibility: "organization"
  };
}

describe("Unified CRM guided opportunity journey page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireCurrentUser.mockResolvedValue(actor);
    mocks.requireUnifiedCrmOpportunityDetailAccess.mockResolvedValue({ recordScope: { kind: "ORGANIZATION" }, organizationId: "org-a" });
    mocks.resolveUnifiedCrmShellAccess.mockReturnValue({ allowed: true, mode: "REVIEW", reason: "ALLOWED", fallbackHref: "/manager-workspace" });
    mocks.getUnifiedCrmOpportunityGuidedJourney.mockResolvedValue(guidedFixture());
  });

  it("loads the guided journey and preserves only a safe Pipeline return", async () => {
    const markup = renderToStaticMarkup(await OpportunityGuidedJourneyPage({ searchParams: Promise.resolve({ crmReturnTo: "/crm?view=pipeline" }) }));
    expect(mocks.getUnifiedCrmOpportunityGuidedJourney).toHaveBeenCalledWith(actor, expect.objectContaining({ accessContext: expect.any(Object) }));
    expect(markup).toContain('href="/crm?view=pipeline"');
  });

  it("accepts a safe CRM customer return path", () => {
    expect(safeUnifiedCrmOpportunityReturn("/crm/customers/customer-1?crmReturnTo=%2Fcrm%3Fview%3Dcustomers%26status%3Dactive")).toBe(
      "/crm/customers/customer-1?crmReturnTo=%2Fcrm%3Fview%3Dcustomers%26status%3Dactive"
    );
  });

  it("rejects unsafe return parameters", () => {
    for (const value of ["https://evil.example", "//evil.example", "/crm?view=customers", "/crm?view=pipeline&redirect=https://evil.example"]) {
      expect(safeUnifiedCrmOpportunityReturn(value)).toBe("/crm?view=pipeline");
    }
  });

  it("does not read or serialize the guided journey when the CRM shell is off", async () => {
    mocks.resolveUnifiedCrmShellAccess.mockReturnValue({ allowed: false, mode: "OFF", reason: "SHELL_OFF", fallbackHref: "/manager-workspace" });
    const markup = renderToStaticMarkup(await OpportunityGuidedJourneyPage({ searchParams: Promise.resolve({ crmReturnTo: "/crm?view=pipeline" }) }));
    expect(markup).toContain("Unified CRM is turned off");
    expect(mocks.getUnifiedCrmOpportunityGuidedJourney).not.toHaveBeenCalled();
  });

  it.each([
    ["OPPORTUNITY_NOT_AUTHORIZED", "Guided opportunity review isn’t available to you"],
    ["ORGANIZATION_SCOPE_AMBIGUOUS", "Guided opportunity review is temporarily unavailable"],
    ["OPPORTUNITY_OFF", "Guided opportunity review is temporarily unavailable"]
  ])("maps %s to a safe state without echoing backend text", async (code, expectedTitle) => {
    mocks.requireUnifiedCrmOpportunityDetailAccess.mockRejectedValue(
      Object.assign(new Error(`backend ${code} private detail`), { code })
    );

    const markup = renderToStaticMarkup(await OpportunityGuidedJourneyPage({ searchParams: Promise.resolve({}) }));

    expect(markup).toContain(expectedTitle);
    expect(mocks.getUnifiedCrmOpportunityGuidedJourney).not.toHaveBeenCalled();
    expect(markup).not.toContain(`backend ${code}`);
  });
});
