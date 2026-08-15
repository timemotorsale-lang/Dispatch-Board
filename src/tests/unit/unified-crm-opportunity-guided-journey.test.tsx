import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  UnifiedCrmOpportunityGuidedJourney,
  UnifiedCrmOpportunityGuidedJourneyLoading
} from "@/features/unified-crm/unified-crm-opportunity-guided-journey";

function guidedFixture() {
  return {
    contractVersion: "ucrm.opportunity-guided-journey/v1",
    generatedAt: "2026-08-15T01:00:00.000Z",
    headline: {
      title: "Review the first guided opportunity journey safely",
      detail: "This guided journey walks through entry, queue, detail, and transition review."
    },
    nextUnlocks: ["Approve lifecycle stages before enabling live opportunity journey steps."],
    phases: [
      {
        id: "intake" as const,
        label: "Start with entry and prioritization",
        detail: "Start safely.",
        steps: [
          {
            id: "entry" as const,
            label: "Start from pipeline review",
            description: "Begin at pipeline.",
            href: "/crm?view=pipeline",
            state: "HELD_REVIEW" as const
          },
          {
            id: "queue" as const,
            label: "Check queue priorities",
            description: "Then queue.",
            href: "/crm/opportunities/queue?crmReturnTo=%2Fcrm%3Fview%3Dpipeline",
            state: "HELD_REVIEW" as const
          }
        ]
      }
    ],
    source: {
      href: "/crm?view=pipeline" as const,
      label: "Unified CRM guided opportunity journey",
      observedAt: "2026-08-15T01:00:00.000Z"
    },
    state: "HELD_REVIEW" as const,
    visibility: "organization" as const
  };
}

describe("Unified CRM opportunity guided journey", () => {
  it("renders the held guided path with only safe internal links", () => {
    const markup = renderToStaticMarkup(
      <UnifiedCrmOpportunityGuidedJourney model={guidedFixture()} returnHref="/crm?view=pipeline" />
    );

    expect(markup).toContain("Guided opportunity journey · review only");
    expect(markup).toContain("You are following the intended review path");
    expect(markup).toContain('aria-label="Opportunity workspace orientation"');
    expect(markup).toContain("Start with entry and prioritization");
    expect(markup).toContain("You are following the intended review path");
    expect(markup).toContain("/crm?view=pipeline");
    expect(markup).toContain("/crm/opportunities/queue?crmReturnTo=%2Fcrm%3Fview%3Dpipeline");
    expect(markup).not.toContain("forecast");
    expect(markup).not.toContain("probability");
  });

  it("renders a safe unavailable state", () => {
    const markup = renderToStaticMarkup(
      <UnifiedCrmOpportunityGuidedJourney
        errorMessage="Guided opportunity review is temporarily unavailable. No guided review data was displayed."
        failureKind="unavailable"
        returnHref="/crm?view=pipeline"
      />
    );

    expect(markup).toContain("Guided opportunity review is temporarily unavailable");
    expect(markup).toContain("Retry");
  });

  it("renders an honest loading state", () => {
    const markup = renderToStaticMarkup(<UnifiedCrmOpportunityGuidedJourneyLoading />);

    expect(markup).toContain("Loading guided opportunity review");
    expect(markup).toContain("No opportunity action has been executed.");
    expect(markup).toContain("aria-busy=\"true\"");
  });
});
