import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { UnifiedCrmOpportunityReviewHub, UnifiedCrmOpportunityReviewHubLoading } from "@/features/unified-crm/unified-crm-opportunity-review-hub";

function hubFixture() {
  return {
    contractVersion: "ucrm.opportunity-review-hub/v1",
    generatedAt: "2026-08-15T00:15:00.000Z",
    headline: {
      title: "Review the full opportunity experience from one safe hub",
      detail: "This hub keeps pipeline, queue, create, detail, and transition review one click away."
    },
    nextUnlocks: [
      "Approve stage names, order, and evidence rules before turning any opportunity write path on."
    ],
    sections: [
      {
        id: "overview" as const,
        label: "Core review surfaces",
        detail: "Review-only links.",
        links: [
          {
            id: "pipeline" as const,
            label: "Review pipeline",
            description: "Pipeline review",
            href: "/crm?view=pipeline",
            state: "HELD_REVIEW" as const
          },
          {
            id: "queue" as const,
            label: "Review queue",
            description: "Queue review",
            href: "/crm/opportunities/queue?crmReturnTo=%2Fcrm%3Fview%3Dpipeline",
            state: "HELD_REVIEW" as const
          }
        ]
      }
    ],
    source: {
      href: "/crm?view=pipeline" as const,
      label: "Unified CRM opportunity review hub",
      observedAt: "2026-08-15T00:15:00.000Z"
    },
    state: "HELD_REVIEW" as const,
    visibility: "organization" as const
  };
}

describe("Unified CRM opportunity review hub", () => {
  it("renders the held review hub with only safe internal review links", () => {
    const markup = renderToStaticMarkup(
      <UnifiedCrmOpportunityReviewHub model={hubFixture()} returnHref="/crm?view=pipeline" />
    );

    expect(markup).toContain("Opportunity review hub · review only");
    expect(markup).toContain("Core review surfaces");
    expect(markup).toContain("You are in the workspace map");
    expect(markup).toContain("/crm?view=pipeline");
    expect(markup).toContain("/crm/opportunities/queue?crmReturnTo=%2Fcrm%3Fview%3Dpipeline");
    expect(markup).toContain("HELD_REVIEW");
    expect(markup).not.toContain("forecast");
    expect(markup).not.toContain("Won");
    expect(markup).toContain("<main");
    expect(markup).toContain("<h1>");
    expect(markup).not.toContain("<form");
    expect(markup).not.toContain("<button");
    expect(markup).not.toMatch(/href="(?:https?:)?\/\//);
    expect(markup).toContain("Open guided journey");
    expect(markup).toContain("/crm/opportunities/guided?crmReturnTo=%2Fcrm%3Fview%3Dpipeline");
    expect(markup).toContain("You are in the workspace map");
    expect(markup).toContain('aria-label="Opportunity workspace orientation"');
  });

  it("renders a safe restricted state without a retry button", () => {
    const markup = renderToStaticMarkup(
      <UnifiedCrmOpportunityReviewHub
        errorMessage="Your current CRM access does not include the opportunity review hub."
        failureKind="restricted"
        returnHref="/crm?view=pipeline"
      />
    );

    expect(markup).toContain("Opportunity review hub isn’t available to you");
    expect(markup).toContain("Return to Pipeline review");
    expect(markup).toContain('role="status"');
    expect(markup).not.toContain("Retry");
  });

  it("renders an honest loading state", () => {
    const markup = renderToStaticMarkup(<UnifiedCrmOpportunityReviewHubLoading />);

    expect(markup).toContain("Loading opportunity review hub");
    expect(markup).toContain("No opportunity action has been executed.");
    expect(markup).toContain("aria-busy=\"true\"");
  });

  it("renders an alert and retry affordance only for retryable failure", () => {
    const markup = renderToStaticMarkup(
      <UnifiedCrmOpportunityReviewHub
        failureKind="unavailable"
        returnHref="/crm?view=pipeline"
      />
    );

    expect(markup).toContain("Opportunity review hub is temporarily unavailable");
    expect(markup).toContain('role="alert"');
    expect(markup).toContain("Retry");
  });
});
