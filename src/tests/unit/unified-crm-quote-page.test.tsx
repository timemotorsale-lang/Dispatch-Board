import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AuthenticatedUser } from "@/server/auth/store";

const mocks = vi.hoisted(() => ({
  getUnifiedCrmQuoteFoundation: vi.fn(),
  requireCurrentUser: vi.fn(),
  requireUnifiedCrmQuoteAccess: vi.fn(),
  resolveUnifiedCrmShellAccess: vi.fn()
}));

vi.mock("@/server/auth/current-user", () => ({ requireCurrentUser: mocks.requireCurrentUser }));
vi.mock("@/server/services/unified-crm-quote-foundation-service", () => ({ getUnifiedCrmQuoteFoundation: mocks.getUnifiedCrmQuoteFoundation }));
vi.mock("@/server/unified-crm/quote-access", () => ({ requireUnifiedCrmQuoteAccess: mocks.requireUnifiedCrmQuoteAccess }));
vi.mock("@/server/unified-crm/shell-access", () => ({ resolveUnifiedCrmShellAccess: mocks.resolveUnifiedCrmShellAccess }));

import QuotePage, { safeCrmQuoteReturn } from "@/app/(app)/crm/quotes/page";

const actor: AuthenticatedUser = {
  id: "manager-1",
  name: "Manager",
  email: "manager@example.test",
  isActive: true,
  roles: ["General Manager"],
  duties: { direct: [], roleDefaults: [], all: [] }
};

function fixture() {
  return {
    contractVersion: "ucrm.quote-foundation/v1",
    generatedAt: "2026-08-15T16:15:00.000Z",
    headline: { title: "Review the quote foundation before commercial commands go live", detail: "Held detail" },
    readiness: [],
    liveObservation: {
      detail: "No same-scope persisted quote is visible right now for organization review. Continue with held commercial review until one is available.",
      freshnessLabel: "No visible persisted quote update is available yet.",
      newestVisibleRecordUpdatedAt: null,
      state: "EMPTY",
      visibleRecordCount: 0
    },
    visibleQuotes: [],
    governance: [],
    nextUnlocks: [],
    source: { href: "/crm?view=more", label: "Unified CRM quote foundation" as const, observedAt: "2026-08-15T16:15:00.000Z" },
    state: "HELD_REVIEW" as const,
    visibility: "organization" as const
  };
}

describe("Unified CRM quote foundation page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireCurrentUser.mockResolvedValue(actor);
    mocks.requireUnifiedCrmQuoteAccess.mockResolvedValue({ recordScope: { kind: "ORGANIZATION" }, organizationId: "org-a" });
    mocks.resolveUnifiedCrmShellAccess.mockReturnValue({ allowed: true, mode: "REVIEW", reason: "ALLOWED", fallbackHref: "/manager-workspace" });
    mocks.getUnifiedCrmQuoteFoundation.mockResolvedValue(fixture());
  });

  it("loads the quote foundation and preserves only a safe CRM return", async () => {
    const markup = renderToStaticMarkup(await QuotePage({ searchParams: Promise.resolve({ crmReturnTo: "/crm?view=more" }) }));
    expect(mocks.getUnifiedCrmQuoteFoundation).toHaveBeenCalledWith(actor, expect.objectContaining({ accessContext: expect.any(Object) }));
    expect(markup).toContain('href="/crm?view=more"');
  });

  it("accepts only safe quote return paths", () => {
    expect(safeCrmQuoteReturn("/crm?view=more")).toBe("/crm?view=more");
    expect(safeCrmQuoteReturn("/crm?view=pipeline")).toBe("/crm?view=pipeline");
    expect(safeCrmQuoteReturn("/crm?view=customers")).toBe("/crm?view=more");
    expect(safeCrmQuoteReturn("https://evil.example")).toBe("/crm?view=more");
    expect(safeCrmQuoteReturn(["/crm?view=more"])).toBe("/crm?view=more");
  });

  it("does not read or serialize the quote foundation when the CRM shell is off", async () => {
    mocks.resolveUnifiedCrmShellAccess.mockReturnValue({ allowed: false, mode: "OFF", reason: "SHELL_OFF", fallbackHref: "/manager-workspace" });
    const markup = renderToStaticMarkup(await QuotePage({ searchParams: Promise.resolve({ crmReturnTo: "/crm?view=more" }) }));
    expect(markup).toContain("Unified CRM is turned off");
    expect(mocks.requireUnifiedCrmQuoteAccess).not.toHaveBeenCalled();
    expect(mocks.getUnifiedCrmQuoteFoundation).not.toHaveBeenCalled();
  });

  it.each([
    ["QUOTE_NOT_AUTHORIZED", "Quote foundation review isn’t available to you"],
    ["ORGANIZATION_SCOPE_UNAVAILABLE", "Quote foundation review isn’t available to you"],
    ["ORGANIZATION_SCOPE_AMBIGUOUS", "Quote foundation review is temporarily unavailable"],
    ["QUOTE_OFF", "Quote foundation review is temporarily unavailable"]
  ])("maps %s to a safe state without echoing backend text", async (code, expectedTitle) => {
    mocks.requireUnifiedCrmQuoteAccess.mockRejectedValue(Object.assign(new Error(`backend ${code} private detail`), { code }));

    const markup = renderToStaticMarkup(await QuotePage({ searchParams: Promise.resolve({}) }));

    expect(markup).toContain(expectedTitle);
    expect(mocks.getUnifiedCrmQuoteFoundation).not.toHaveBeenCalled();
    expect(markup).not.toContain(`backend ${code}`);
  });
});
