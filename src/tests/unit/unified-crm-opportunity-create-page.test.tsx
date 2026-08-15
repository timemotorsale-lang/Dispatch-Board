import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AuthenticatedUser } from "@/server/auth/store";

const mocks = vi.hoisted(() => ({
  getUnifiedCrmOpportunityCreateReview: vi.fn(),
  requireCurrentUser: vi.fn(),
  requireUnifiedCrmOpportunityDetailAccess: vi.fn(),
  resolveUnifiedCrmShellAccess: vi.fn()
}));

vi.mock("@/server/auth/current-user", () => ({ requireCurrentUser: mocks.requireCurrentUser }));
vi.mock("@/server/services/unified-crm-opportunity-create-service", () => ({ getUnifiedCrmOpportunityCreateReview: mocks.getUnifiedCrmOpportunityCreateReview }));
vi.mock("@/server/unified-crm/opportunity-detail-access", () => ({ requireUnifiedCrmOpportunityDetailAccess: mocks.requireUnifiedCrmOpportunityDetailAccess }));
vi.mock("@/server/unified-crm/shell-access", () => ({ resolveUnifiedCrmShellAccess: mocks.resolveUnifiedCrmShellAccess }));

import OpportunityCreatePage, { safeCrmOpportunityCreateReturn } from "@/app/(app)/crm/opportunities/new/page";

const actor: AuthenticatedUser = { id: "manager-1", name: "Manager", email: "manager@example.test", isActive: true, roles: ["General Manager"], duties: { direct: [], roleDefaults: [], all: [] } };

function createFixture() {
  return {
    contractVersion: "ucrm.opportunity-create/v1",
    state: "HELD_REVIEW",
    generatedAt: "2026-08-14T19:15:00.000Z",
    visibility: "organization",
    source: { href: "/crm?view=pipeline", label: "Unified CRM opportunity create review", observedAt: "2026-08-14T19:15:00.000Z" },
    headline: { title: "Review the first governed opportunity create flow", detail: "Held create detail" },
    requiredInputs: [],
    governance: [],
    nextUnlocks: [],
    createAction: { label: "Create opportunity", state: "HELD" }
  };
}

describe("Unified CRM opportunity create page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireCurrentUser.mockResolvedValue(actor);
    mocks.requireUnifiedCrmOpportunityDetailAccess.mockResolvedValue({ recordScope: { kind: "ORGANIZATION" }, organizationId: "org-a" });
    mocks.resolveUnifiedCrmShellAccess.mockReturnValue({ allowed: true, mode: "REVIEW", reason: "ALLOWED", fallbackHref: "/manager-workspace" });
    mocks.getUnifiedCrmOpportunityCreateReview.mockResolvedValue(createFixture());
  });

  it("loads the create review and preserves only a safe Pipeline return", async () => {
    const markup = renderToStaticMarkup(await OpportunityCreatePage({ searchParams: Promise.resolve({ crmReturnTo: "/crm?view=pipeline" }) }));
    expect(mocks.getUnifiedCrmOpportunityCreateReview).toHaveBeenCalled();
    expect(markup).toContain('href="/crm?view=pipeline"');
  });

  it("preserves a safe CRM customer-detail return when create review is opened from customer context", async () => {
    const markup = renderToStaticMarkup(await OpportunityCreatePage({
      searchParams: Promise.resolve({ crmReturnTo: "/crm/customers/customer-1?crmReturnTo=%2Fcrm%3Fview%3Dcustomers%26owner%3Dmine" })
    }));

    expect(markup).toContain('href="/crm/customers/customer-1?crmReturnTo=%2Fcrm%3Fview%3Dcustomers%26owner%3Dmine"');
  });

  it("rejects unsafe return parameters", () => {
    for (const value of ["https://evil.example", "//evil.example", "/crm?view=customers", "/crm?view=pipeline&redirect=https://evil.example"]) {
      expect(safeCrmOpportunityCreateReturn(value)).toBe("/crm?view=pipeline");
    }
  });

  it("accepts only safe CRM customer-detail return parameters", () => {
    expect(safeCrmOpportunityCreateReturn("/crm/customers/customer-1?crmReturnTo=%2Fcrm%3Fview%3Dcustomers%26owner%3Dmine")).toBe(
      "/crm/customers/customer-1?crmReturnTo=%2Fcrm%3Fview%3Dcustomers%26owner%3Dmine"
    );
    expect(safeCrmOpportunityCreateReturn("/crm/customers/customer-1?crmReturnTo=%2Fcrm%3Fview%3Dpipeline")).toBe(
      "/crm/customers/customer-1?crmReturnTo=%2Fcrm%3Fview%3Dcustomers"
    );
  });

  it("does not read create review when the shell is off", async () => {
    mocks.resolveUnifiedCrmShellAccess.mockReturnValue({ allowed: false, mode: "OFF", reason: "SHELL_OFF", fallbackHref: "/manager-workspace" });
    const markup = renderToStaticMarkup(await OpportunityCreatePage({ searchParams: Promise.resolve({ crmReturnTo: "/crm?view=pipeline" }) }));
    expect(markup).toContain("Unified CRM is turned off");
    expect(mocks.getUnifiedCrmOpportunityCreateReview).not.toHaveBeenCalled();
  });
});
