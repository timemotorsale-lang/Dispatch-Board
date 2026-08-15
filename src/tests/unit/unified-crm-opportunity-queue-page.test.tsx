import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AuthenticatedUser } from "@/server/auth/store";

const mocks = vi.hoisted(() => ({
  getUnifiedCrmOpportunityQueueReview: vi.fn(),
  requireCurrentUser: vi.fn(),
  requireUnifiedCrmOpportunityDetailAccess: vi.fn(),
  resolveUnifiedCrmShellAccess: vi.fn()
}));

vi.mock("@/server/auth/current-user", () => ({ requireCurrentUser: mocks.requireCurrentUser }));
vi.mock("@/server/services/unified-crm-opportunity-queue-service", () => ({ getUnifiedCrmOpportunityQueueReview: mocks.getUnifiedCrmOpportunityQueueReview }));
vi.mock("@/server/unified-crm/opportunity-detail-access", () => ({ requireUnifiedCrmOpportunityDetailAccess: mocks.requireUnifiedCrmOpportunityDetailAccess }));
vi.mock("@/server/unified-crm/shell-access", () => ({ resolveUnifiedCrmShellAccess: mocks.resolveUnifiedCrmShellAccess }));

import OpportunityQueuePage, { safeCrmOpportunityQueueReturn } from "@/app/(app)/crm/opportunities/queue/page";

const actor: AuthenticatedUser = { id: "manager-1", name: "Manager", email: "manager@example.test", isActive: true, roles: ["General Manager"], duties: { direct: [], roleDefaults: [], all: [] } };

function fixture() {
  return {
    contractVersion: "ucrm.opportunity-queue/v1",
    generatedAt: "2026-08-14T20:00:00.000Z",
    governance: [],
    headline: { title: "Review the first opportunity queue before it goes live", detail: "Held queue review detail" },
    items: [],
    nextUnlocks: [],
    segments: [],
    source: { href: "/crm?view=pipeline", label: "Unified CRM opportunity queue review", observedAt: "2026-08-14T20:00:00.000Z" },
    state: "HELD_REVIEW",
    visibility: "organization"
  };
}

describe("Unified CRM opportunity queue page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireCurrentUser.mockResolvedValue(actor);
    mocks.requireUnifiedCrmOpportunityDetailAccess.mockResolvedValue({ recordScope: { kind: "ORGANIZATION" }, organizationId: "org-a" });
    mocks.resolveUnifiedCrmShellAccess.mockReturnValue({ allowed: true, mode: "REVIEW", reason: "ALLOWED", fallbackHref: "/manager-workspace" });
    mocks.getUnifiedCrmOpportunityQueueReview.mockResolvedValue(fixture());
  });

  it("loads the queue review and preserves only a safe Pipeline return", async () => {
    const markup = renderToStaticMarkup(await OpportunityQueuePage({ searchParams: Promise.resolve({ crmReturnTo: "/crm?view=pipeline" }) }));
    expect(mocks.getUnifiedCrmOpportunityQueueReview).toHaveBeenCalledWith(
      actor,
      { accessContext: expect.objectContaining({ organizationId: "org-a" }) }
    );
    expect(markup).toContain('href="/crm?view=pipeline"');
  });

  it("rejects unsafe return parameters", () => {
    for (const value of ["https://evil.example", "//evil.example", "/crm?view=customers", "/crm?view=pipeline&redirect=https://evil.example"]) {
      expect(safeCrmOpportunityQueueReturn(value)).toBe("/crm?view=pipeline");
    }
  });

  it("does not read queue review when the shell is off", async () => {
    mocks.resolveUnifiedCrmShellAccess.mockReturnValue({ allowed: false, mode: "OFF", reason: "SHELL_OFF", fallbackHref: "/manager-workspace" });
    const markup = renderToStaticMarkup(await OpportunityQueuePage({ searchParams: Promise.resolve({ crmReturnTo: "/crm?view=pipeline" }) }));
    expect(markup).toContain("Unified CRM is turned off");
    expect(mocks.getUnifiedCrmOpportunityQueueReview).not.toHaveBeenCalled();
  });

  it.each([
    ["OPPORTUNITY_NOT_AUTHORIZED", "Opportunity queue review isn’t available to you"],
    ["ORGANIZATION_SCOPE_UNAVAILABLE", "Opportunity queue review isn’t available to you"],
    ["OPPORTUNITY_OFF", "Opportunity queue review is temporarily unavailable"],
    ["ORGANIZATION_SCOPE_AMBIGUOUS", "Opportunity queue review is temporarily unavailable"]
  ])("maps %s to a safe state without calling or serializing queue data", async (code, expectedTitle) => {
    mocks.requireUnifiedCrmOpportunityDetailAccess.mockRejectedValue(
      Object.assign(new Error(`private queue ${code}`), { code })
    );

    const markup = renderToStaticMarkup(await OpportunityQueuePage({
      searchParams: Promise.resolve({ crmReturnTo: "/crm?view=pipeline" })
    }));

    expect(markup).toContain(expectedTitle);
    expect(mocks.getUnifiedCrmOpportunityQueueReview).not.toHaveBeenCalled();
    expect(markup).not.toContain(`private queue ${code}`);
  });

  it("does not serialize a rejected queue model or backend error", async () => {
    mocks.getUnifiedCrmOpportunityQueueReview.mockRejectedValue(
      new Error("secret queue row customer-a")
    );

    const markup = renderToStaticMarkup(await OpportunityQueuePage({
      searchParams: Promise.resolve({})
    }));

    expect(markup).toContain("Opportunity queue review couldn’t be loaded");
    expect(markup).not.toContain("secret queue row");
    expect(markup).not.toContain("customer-a");
  });
});
