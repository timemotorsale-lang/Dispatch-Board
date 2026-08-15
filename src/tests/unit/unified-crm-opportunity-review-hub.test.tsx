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
    liveReadObservation: {
      newestVisibleRecordUpdatedAt: "2026-08-15T00:10:00.000Z",
      state: "READY" as const,
      visibleRecordCount: 1
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
            id: "detail" as const,
            label: "Open persisted detail",
            description: "Persisted detail review",
            href: "/crm/opportunities/OPP-1001?crmReturnTo=%2Fcrm%3Fview%3Dpipeline",
            state: "LIVE_READ_ONLY" as const
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
    expect(markup).toContain("/crm/opportunities/OPP-1001?crmReturnTo=%2Fcrm%3Fview%3Dpipeline");
    expect(markup).toContain("Held review");
    expect(markup).toContain("Live read-only");
    expect(markup).toContain("Open persisted read-only detail");
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
    expect(markup).toContain("1 visible read-only record");
  });

  it("rewrites in-surface review links to preserve a safe customer-detail return chain", () => {
    const markup = renderToStaticMarkup(
      <UnifiedCrmOpportunityReviewHub
        model={hubFixture()}
        returnHref="/crm/customers/customer-1?crmReturnTo=%2Fcrm%3Fview%3Dcustomers%26q%3DAlex"
      />
    );

    expect(markup).toContain("/crm/opportunities/queue?crmReturnTo=%2Fcrm%2Fcustomers%2Fcustomer-1%3FcrmReturnTo%3D%252Fcrm%253Fview%253Dcustomers%2526q%253DAlex");
    expect(markup).toContain("/crm/opportunities/guided?crmReturnTo=%2Fcrm%2Fcustomers%2Fcustomer-1%3FcrmReturnTo%3D%252Fcrm%253Fview%253Dcustomers%2526q%253DAlex");
    expect(markup).not.toMatch(/crmReturnTo=[^"&]+&amp;crmReturnTo=/);
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

  it("preserves one customer-detail origin on every model-provided review link", () => {
    const customerReturn = "/crm/customers/customer-1?crmReturnTo=%2Fcrm%3Fview%3Dcustomers%26q%3DAlex";
    const markup = renderToStaticMarkup(<UnifiedCrmOpportunityReviewHub model={hubFixture()} returnHref={customerReturn} />);
    const hrefs = [...markup.matchAll(/href="([^"]+)"/g)].map((match) => match[1]!.replaceAll("&amp;", "&"));
    const reviewLinks = hrefs.filter((href) => href.startsWith("/crm/opportunities/") || href.startsWith("/crm?view=pipeline"));

    expect(markup).toContain(`href="${customerReturn}">Return to Customer 360`);
    expect(reviewLinks.length).toBeGreaterThan(0);
    for (const href of reviewLinks) {
      const url = new URL(href, "http://crm.local");
      expect(url.origin).toBe("http://crm.local");
      expect(url.searchParams.getAll("crmReturnTo")).toEqual([customerReturn]);
    }
  });

  it("keeps held-only presentation honest when no live-read-only record is visible from owned scope", () => {
    const markup = renderToStaticMarkup(
      <UnifiedCrmOpportunityReviewHub
        model={{
          ...hubFixture(),
          visibility: "owned",
          liveReadObservation: {
            newestVisibleRecordUpdatedAt: null,
            state: "EMPTY",
            visibleRecordCount: 0
          },
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
                  id: "detail" as const,
                  label: "Review detail",
                  description: "Held detail review",
                  href: "/crm/opportunities/review01?crmReturnTo=%2Fcrm%3Fview%3Dpipeline",
                  state: "HELD_REVIEW" as const
                }
              ]
            },
            {
              id: "live-records" as const,
              label: "Visible read-only opportunities",
              detail: "No permitted persisted opportunity record is visible right now.",
              links: []
            },
            {
              id: "governance" as const,
              label: "Governance",
              detail: "Approval gates remain in review.",
              links: []
            }
          ]
        }}
        returnHref="/crm/customers/customer-1?crmReturnTo=%2Fcrm%3Fview%3Dcustomers"
      />
    );

    expect(markup).toContain("Owned review");
    expect(markup).toContain("No permitted persisted read-only opportunity is visible yet.");
    expect(markup).toContain("No same-scope persisted read-only record is available from this workspace yet.");
    expect(markup).toContain("Held review");
    expect(markup).not.toContain("Live read-only");
    expect(markup).toContain("Back to Customer 360");
  });

  it("keeps customer return language when the review started from Customer 360", () => {
    const markup = renderToStaticMarkup(
      <UnifiedCrmOpportunityReviewHub
        model={hubFixture()}
        returnHref="/crm/customers/customer-1?crmReturnTo=%2Fcrm%3Fview%3Dcustomers"
      />
    );

    expect(markup).toContain("Back to Customer 360");
    expect(markup).toContain("Customer 360 return preserved");
    expect(markup).toContain("Return to Customer 360");
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

  it("renders an honest empty live-record state when no persisted record is visible", () => {
    const markup = renderToStaticMarkup(
      <UnifiedCrmOpportunityReviewHub
        model={{
          ...hubFixture(),
          liveReadObservation: {
            newestVisibleRecordUpdatedAt: null,
            state: "EMPTY",
            visibleRecordCount: 0
          },
          sections: [
            ...hubFixture().sections,
            {
              id: "live-records" as const,
              label: "Visible read-only opportunities",
              detail: "No permitted persisted opportunity record is visible right now.",
              links: []
            }
          ]
        }}
        returnHref="/crm?view=pipeline"
      />
    );

    expect(markup).toContain("No permitted persisted read-only opportunity is visible yet.");
    expect(markup).toContain("No same-scope persisted read-only record is available from this workspace yet.");
  });
});
