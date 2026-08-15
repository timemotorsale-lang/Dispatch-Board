import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AuthenticatedUser } from "@/server/auth/store";

const mocks = vi.hoisted(() => ({
  getUnifiedCrmOpportunityDetail: vi.fn(),
  requireCurrentUser: vi.fn(),
  requireUnifiedCrmOpportunityDetailAccess: vi.fn(),
  resolveUnifiedCrmShellAccess: vi.fn()
}));

vi.mock("@/server/auth/current-user", () => ({ requireCurrentUser: mocks.requireCurrentUser }));
vi.mock("@/server/services/unified-crm-opportunity-detail-service", () => ({ getUnifiedCrmOpportunityDetail: mocks.getUnifiedCrmOpportunityDetail }));
vi.mock("@/server/unified-crm/opportunity-detail-access", () => ({ requireUnifiedCrmOpportunityDetailAccess: mocks.requireUnifiedCrmOpportunityDetailAccess }));
vi.mock("@/server/unified-crm/shell-access", () => ({ resolveUnifiedCrmShellAccess: mocks.resolveUnifiedCrmShellAccess }));

import OpportunityPage, { safeCrmOpportunityReturn } from "@/app/(app)/crm/opportunities/[opportunityId]/page";

const actor: AuthenticatedUser = { id: "manager-1", name: "Manager", email: "manager@example.test", isActive: true, roles: ["General Manager"], duties: { direct: [], roleDefaults: [], all: [] } };

function detailFixture() {
  return {
    contractVersion: "ucrm.opportunity-detail/v1",
    state: "HELD",
    generatedAt: "2026-08-14T18:00:00.000Z",
    requestedOpportunityId: "review01",
    visibility: "organization",
    source: { authority: "UNIFIED_CRM", href: "/crm?view=pipeline", label: "Unified CRM opportunity foundation", observedAt: "2026-08-14T18:00:00.000Z", readMode: "HELD_REVIEW" },
    freshness: { status: "CURRENT", observedAt: "2026-08-14T18:00:00.000Z", sourceRecordUpdatedAt: null },
    identity: { lifecycleStatus: "HELD", ownerScopeLabel: "Organization review scope", title: "Opportunity detail review" },
    summary: { customer: "Held", dueState: "Held", nextAction: "Held", owner: "Held" },
    sourceBridge: { label: "Lead bridge", state: "HELD", detail: "Held" },
    workBridges: [],
    nextUnlocks: ["Unlock"]
  };
}

describe("Unified CRM opportunity detail page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireCurrentUser.mockResolvedValue(actor);
    mocks.requireUnifiedCrmOpportunityDetailAccess.mockResolvedValue({ recordScope: { kind: "ORGANIZATION" }, organizationId: "org-a" });
    mocks.resolveUnifiedCrmShellAccess.mockReturnValue({ allowed: true, mode: "REVIEW", reason: "ALLOWED", fallbackHref: "/manager-workspace" });
    mocks.getUnifiedCrmOpportunityDetail.mockResolvedValue(detailFixture());
  });

  it("loads an exact opportunity and preserves only a safe Pipeline return", async () => {
    const markup = renderToStaticMarkup(await OpportunityPage({ params: Promise.resolve({ opportunityId: "review01" }), searchParams: Promise.resolve({ crmReturnTo: "/crm?view=pipeline" }) }));
    expect(mocks.getUnifiedCrmOpportunityDetail).toHaveBeenCalledWith(actor, "review01", expect.objectContaining({ accessContext: expect.any(Object) }));
    expect(markup).toContain('href="/crm?view=pipeline"');
  });

  it("preserves a safe CRM customer-detail return when detail review is opened from customer context", async () => {
    const markup = renderToStaticMarkup(await OpportunityPage({
      params: Promise.resolve({ opportunityId: "review01" }),
      searchParams: Promise.resolve({ crmReturnTo: "/crm/customers/customer-1?crmReturnTo=%2Fcrm%3Fview%3Dcustomers%26q%3DAlex" })
    }));

    expect(markup).toContain('href="/crm/customers/customer-1?crmReturnTo=%2Fcrm%3Fview%3Dcustomers%26q%3DAlex"');
    expect(markup).toContain('href="/crm?view=pipeline&amp;crmReturnTo=%2Fcrm%2Fcustomers%2Fcustomer-1%3FcrmReturnTo%3D%252Fcrm%253Fview%253Dcustomers%2526q%253DAlex">Open pipeline source review');
    expect(markup).toContain("Back to Customer 360");
    expect(markup).toContain("Customer 360 return preserved");
  });

  it("rejects external, protocol-relative, wrong-view, and unknown return parameters", () => {
    for (const value of ["https://evil.example", "//evil.example", "/crm?view=customers", "/crm?view=pipeline&redirect=https://evil.example"]) {
      expect(safeCrmOpportunityReturn(value)).toBe("/crm?view=pipeline");
    }
  });

  it("accepts only safe CRM customer-detail return parameters", () => {
    expect(safeCrmOpportunityReturn("/crm/customers/customer-1?crmReturnTo=%2Fcrm%3Fview%3Dcustomers%26q%3DAlex")).toBe(
      "/crm/customers/customer-1?crmReturnTo=%2Fcrm%3Fview%3Dcustomers%26q%3DAlex"
    );
    expect(safeCrmOpportunityReturn("/crm/customers/customer-1?crmReturnTo=%2Fcrm%3Fview%3Dpipeline")).toBe(
      "/crm/customers/customer-1?crmReturnTo=%2Fcrm%3Fview%3Dcustomers"
    );
  });

  it("does not read or serialize detail when the CRM shell is off", async () => {
    mocks.resolveUnifiedCrmShellAccess.mockReturnValue({ allowed: false, mode: "OFF", reason: "SHELL_OFF", fallbackHref: "/manager-workspace" });
    const markup = renderToStaticMarkup(await OpportunityPage({ params: Promise.resolve({ opportunityId: "secret-review" }), searchParams: Promise.resolve({ crmReturnTo: "/crm?view=pipeline" }) }));
    expect(markup).toContain("Unified CRM is turned off");
    expect(mocks.getUnifiedCrmOpportunityDetail).not.toHaveBeenCalled();
    expect(markup).not.toContain("secret-review");
  });

  it("does not invoke the detail service when the full opportunity guard rejects", async () => {
    mocks.requireUnifiedCrmOpportunityDetailAccess.mockRejectedValue(Object.assign(new Error("private feature detail"), { code: "OPPORTUNITY_OFF" }));
    const markup = renderToStaticMarkup(await OpportunityPage({ params: Promise.resolve({ opportunityId: "held-review" }), searchParams: Promise.resolve({}) }));
    expect(markup).toContain("Opportunity detail is temporarily unavailable");
    expect(mocks.getUnifiedCrmOpportunityDetail).not.toHaveBeenCalled();
    expect(markup).not.toContain("held-review");
    expect(markup).not.toContain("private feature detail");
  });

  it.each([
    ["INVALID_OPPORTUNITY_ID", "Opportunity detail isn’t available"],
    ["OPPORTUNITY_NOT_AUTHORIZED", "Opportunity detail isn’t available to you"],
    ["ORGANIZATION_SCOPE_AMBIGUOUS", "Opportunity detail is temporarily unavailable"]
  ])("maps %s to a safe state without echoing the route id or backend message", async (code, expectedTitle) => {
    mocks.requireUnifiedCrmOpportunityDetailAccess.mockRejectedValue(
      Object.assign(new Error(`backend ${code} for private-review-id`), { code })
    );

    const markup = renderToStaticMarkup(await OpportunityPage({
      params: Promise.resolve({ opportunityId: "private-review-id" }),
      searchParams: Promise.resolve({ crmReturnTo: "/crm?view=pipeline" })
    }));

    expect(markup).toContain(expectedTitle);
    expect(mocks.getUnifiedCrmOpportunityDetail).not.toHaveBeenCalled();
    expect(markup).not.toContain("private-review-id");
    expect(markup).not.toContain(`backend ${code}`);
  });
});
