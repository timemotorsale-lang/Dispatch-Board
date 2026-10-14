import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { UnifiedCrmQuoteVersionReview } from "@/features/unified-crm/unified-crm-quote-version-review";

function fixture() {
  return {
    contractVersion: "ucrm.quote-version-review/v1",
    generatedAt: "2026-08-15T18:20:00.000Z",
    governance: ["Presented quote evidence is immutable and remains visible as version history rather than being rewritten."],
    headline: {
      detail: "Presented evidence is visible as immutable history. This surface does not unlock presentation, approval, or self-approval.",
      title: "Review version history for Q-1001"
    },
    liveObservation: {
      detail: "Presented version v2 remains immutable. Later revisions must supersede it rather than rewrite it.",
      presentedVersionLabel: "v2",
      state: "IMMUTABLE_PRESENTED" as const
    },
    presentAction: {
      detail: "Quote presentation stays fail-closed until the immutable lock and approval boundary are fully proven together.",
      label: "Present quote",
      state: "HELD" as const
    },
    quote: {
      customerLabel: "Alex Morgan · CUS-18",
      opportunityLabel: "opp_123456",
      quoteId: "quote-1",
      quoteNumber: "Q-1001",
      state: "PRESENTED" as const,
      updatedAt: "2026-08-15T18:15:00.000Z"
    },
    source: {
      href: "/crm/quotes" as const,
      label: "Unified CRM quote version review" as const,
      observedAt: "2026-08-15T18:20:00.000Z"
    },
    state: "HELD_REVIEW" as const,
    versions: [{
      createdAt: "2026-08-15T18:05:00.000Z",
      immutableNote: "This presented version is immutable evidence.",
      lineItemCount: 2,
      presentedAt: "2026-08-15T18:10:00.000Z",
      state: "PRESENTED" as const,
      subtotalCents: 25000,
      totalCents: 26750,
      versionId: "version-2",
      versionLabel: "v2"
    }],
    visibility: "organization" as const
  };
}

describe("Unified CRM quote version review", () => {
  it("renders immutable history without claiming live presentation", () => {
    const markup = renderToStaticMarkup(<UnifiedCrmQuoteVersionReview model={fixture()} returnHref="/crm/quotes" />);

    expect(markup).toContain("Review version history for Q-1001");
    expect(markup).toContain("Immutable version review");
    expect(markup).toContain("This presented version is immutable evidence.");
    expect(markup).toContain("Return to quotes");
    expect(markup).not.toContain("Present quote");
  });

  it("renders a safe unavailable state", () => {
    const markup = renderToStaticMarkup(
      <UnifiedCrmQuoteVersionReview
        errorMessage="Public-safe message only."
        failureKind="unavailable"
        returnHref="/crm/quotes"
      />
    );

    expect(markup).toContain("Quote version review is temporarily unavailable");
    expect(markup).toContain("Public-safe message only.");
  });
});
