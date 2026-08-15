import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { UnifiedCrmQuoteFoundation } from "@/features/unified-crm/unified-crm-quote-foundation";

function fixture() {
  return {
    contractVersion: "ucrm.quote-foundation/v1",
    generatedAt: "2026-08-15T16:15:00.000Z",
    headline: {
      title: "Review the quote foundation before commercial commands go live",
      detail: "Versioned quote storage is now in place for organization review, while draft edits, presentation, and approvals remain governed unlocks."
    },
    readiness: [
      { id: "storage", label: "Versioned storage", detail: "Ready", state: "READY" as const },
      { id: "presentation", label: "Presentation lock", detail: "Held", state: "HELD" as const },
      { id: "approvals", label: "Commercial approvals", detail: "Held", state: "HELD" as const }
    ],
    liveObservation: {
      detail: "Only same-scope persisted quotes are listed here for organization review. Drafting and presentation remain governed separately.",
      freshnessLabel: "Newest visible persisted quote update observed at 2026-08-15T16:00:00.000Z.",
      newestVisibleRecordUpdatedAt: "2026-08-15T16:00:00.000Z",
      state: "READY" as const,
      visibleRecordCount: 1
    },
    visibleQuotes: [{
      id: "quote-Q-1001",
      quoteNumber: "Q-1001",
      state: "DRAFT" as const,
      customerLabel: "Alex Morgan · CUS-18",
      opportunityLabel: "opp_123456",
      summary: "Draft quote version history is retained without rewriting earlier evidence.",
      updatedAt: "2026-08-15T16:00:00.000Z",
      versionLabel: "v2"
    }],
    governance: ["No quote draft, presentation, approval, or conversion command is enabled by this slice."],
    nextUnlocks: ["Implement governed draft create and revise commands before any live seller workflow is enabled."],
    source: { href: "/crm?view=more", label: "Unified CRM quote foundation" as const, observedAt: "2026-08-15T16:15:00.000Z" },
    state: "HELD_REVIEW" as const,
    visibility: "organization" as const
  };
}

describe("Unified CRM quote foundation workspace", () => {
  it("renders the governed commercial foundation honestly", () => {
    const markup = renderToStaticMarkup(<UnifiedCrmQuoteFoundation model={fixture()} returnHref="/crm?view=more" />);

    expect(markup).toContain("Review the quote foundation before commercial commands go live");
    expect(markup).toContain("Versioned storage");
    expect(markup).toContain("Q-1001");
    expect(markup).toContain("Alex Morgan");
    expect(markup).toContain("Return to CRM");
    expect(markup).not.toMatch(/Present quote|Approve quote|Send quote/i);
  });

  it("renders a safe failure state without leaking backend detail", () => {
    const markup = renderToStaticMarkup(
      <UnifiedCrmQuoteFoundation
        errorMessage="Public-safe message only."
        failureKind="unavailable"
        returnHref="/crm?view=more"
      />
    );

    expect(markup).toContain("Quote foundation review is temporarily unavailable");
    expect(markup).toContain("Public-safe message only.");
    expect(markup).toContain('href="/crm?view=more"');
  });
});
