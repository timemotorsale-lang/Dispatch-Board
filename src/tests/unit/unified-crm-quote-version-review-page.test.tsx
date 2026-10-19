import { renderToStaticMarkup } from "@/tests/helpers/render-with-app-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AuthenticatedUser } from "@/server/auth/store";

const mocks = vi.hoisted(() => ({
  getUnifiedCrmQuoteVersionReview: vi.fn(),
  requireCurrentUser: vi.fn(),
  resolveUnifiedCrmShellAccess: vi.fn()
}));

vi.mock("@/server/auth/current-user", () => ({ requireCurrentUser: mocks.requireCurrentUser }));
vi.mock("@/server/services/unified-crm-quote-draft-service", () => ({
  getUnifiedCrmQuoteVersionReview: mocks.getUnifiedCrmQuoteVersionReview
}));
vi.mock("@/server/unified-crm/shell-access", () => ({ resolveUnifiedCrmShellAccess: mocks.resolveUnifiedCrmShellAccess }));

import QuoteVersionPage from "@/app/(app)/crm/quotes/[quoteId]/versions/page";

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
    contractVersion: "ucrm.quote-version-review/v1",
    generatedAt: "2026-08-15T18:20:00.000Z",
    governance: [],
    headline: { title: "Review version history for Q-1001", detail: "Held detail" },
    liveObservation: {
      detail: "Presented version v2 remains immutable.",
      presentedVersionLabel: "v2",
      state: "IMMUTABLE_PRESENTED"
    },
    presentAction: { detail: "Held", label: "Present quote", state: "HELD" },
    quote: {
      customerLabel: "Alex Morgan · CUS-18",
      opportunityLabel: "opp_123456",
      quoteId: "quote-1",
      quoteNumber: "Q-1001",
      state: "PRESENTED",
      updatedAt: "2026-08-15T18:15:00.000Z"
    },
    source: { href: "/crm/quotes", label: "Unified CRM quote version review" as const, observedAt: "2026-08-15T18:20:00.000Z" },
    state: "HELD_REVIEW" as const,
    versions: [],
    visibility: "organization" as const
  };
}

describe("Unified CRM quote version review page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireCurrentUser.mockResolvedValue(actor);
    mocks.resolveUnifiedCrmShellAccess.mockReturnValue({ allowed: true, mode: "REVIEW", reason: "ALLOWED", fallbackHref: "/manager-workspace" });
    mocks.getUnifiedCrmQuoteVersionReview.mockResolvedValue(fixture());
  });

  it("loads the version review page and preserves a safe quote return", async () => {
    const markup = renderToStaticMarkup(await QuoteVersionPage({
      params: Promise.resolve({ quoteId: "quote-1" }),
      searchParams: Promise.resolve({ crmReturnTo: "/crm/quotes" })
    }));

    expect(mocks.getUnifiedCrmQuoteVersionReview).toHaveBeenCalledWith(actor, "quote-1");
    expect(markup).toContain('href="/crm/quotes"');
  });

  it("fails closed when the shell is off", async () => {
    mocks.resolveUnifiedCrmShellAccess.mockReturnValue({ allowed: false, mode: "OFF", reason: "SHELL_OFF", fallbackHref: "/manager-workspace" });

    const markup = renderToStaticMarkup(await QuoteVersionPage({
      params: Promise.resolve({ quoteId: "quote-1" }),
      searchParams: Promise.resolve({})
    }));

    expect(markup).toContain("Unified CRM is turned off");
    expect(mocks.getUnifiedCrmQuoteVersionReview).not.toHaveBeenCalled();
  });

  it.each([
    ["QUOTE_NOT_AUTHORIZED", "Quote version review isn’t available to you"],
    ["QUOTE_NOT_AVAILABLE", "Quote version review isn’t available to you"],
    ["QUOTE_DRAFT_OFF", "Quote version review is temporarily unavailable"]
  ])("maps %s to a safe state", async (code, expected) => {
    mocks.getUnifiedCrmQuoteVersionReview.mockRejectedValue(Object.assign(new Error(`backend ${code} private detail`), { code }));

    const markup = renderToStaticMarkup(await QuoteVersionPage({
      params: Promise.resolve({ quoteId: "quote-1" }),
      searchParams: Promise.resolve({})
    }));

    expect(markup).toContain(expected);
    expect(markup).not.toContain(`backend ${code}`);
  });
});
