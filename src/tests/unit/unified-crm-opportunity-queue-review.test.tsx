import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  UnifiedCrmOpportunityQueueReview,
  UnifiedCrmOpportunityQueueReviewLoading
} from "@/features/unified-crm/unified-crm-opportunity-queue-review";
import type { UnifiedCrmOpportunityQueueReviewModel } from "@/server/unified-crm/opportunity-queue-contract";

function fixture(): UnifiedCrmOpportunityQueueReviewModel {
  return {
    contractVersion: "ucrm.opportunity-queue/v1",
    generatedAt: "2026-08-14T20:00:00.000Z",
    governance: [
      "This queue is review only and does not reorder, assign, or transition any opportunity."
    ],
    headline: {
      title: "Review the first opportunity queue before it goes live",
      detail: "Held queue review detail."
    },
    liveReadObservation: {
      detail: "Only same-scope persisted opportunities are shown in this queue for team and manager review. Lifecycle movement remains off.",
      freshnessLabel: "Newest visible persisted update observed at 2026-08-14T20:00:00.000Z.",
      newestVisibleRecordUpdatedAt: "2026-08-14T20:00:00.000Z",
      state: "READY",
      visibleRecordCount: 1
    },
    items: [
      {
        detailHref: "/crm/opportunities/review01?crmReturnTo=%2Fcrm%3Fview%3Dpipeline",
        dueLabel: "Due next",
        id: "review01",
        ownerLabel: "Seller-owned review",
        reason: "Queue reason",
        riskLabel: "Stage held",
        state: "HELD_REVIEW",
        title: "Keep intake follow-up obvious"
      }
    ],
    nextUnlocks: [
      "Approve stage names, order, and evidence rules so queue membership can be tied to real lifecycle states."
    ],
    segments: [
      {
        countLabel: "Seller-owned review",
        detail: "Owned detail",
        id: "owned",
        label: "Owned next actions",
        state: "REVIEW"
      },
      {
        countLabel: "No live overdue math",
        detail: "Overdue detail",
        id: "overdue",
        label: "Overdue work",
        state: "HELD"
      }
    ],
    source: {
      href: "/crm?view=pipeline",
      label: "Unified CRM opportunity queue review",
      observedAt: "2026-08-14T20:00:00.000Z"
    },
    state: "HELD_REVIEW",
    visibility: "organization"
  };
}

describe("Unified CRM opportunity queue review", () => {
  it("renders a held queue review without claiming live prioritization", () => {
    const markup = renderToStaticMarkup(<UnifiedCrmOpportunityQueueReview model={fixture()} returnHref="/crm?view=pipeline" />);

    expect(markup).toContain("Review the first opportunity queue before it goes live");
    expect(markup).toContain("Owned next actions");
    expect(markup).toContain("Overdue work");
    expect(markup).toContain("Keep intake follow-up obvious");
    expect(markup).toContain("Visible persisted read-only queue entries");
    expect(markup).toContain("Only same-scope persisted opportunities are shown in this queue for team and manager review. Lifecycle movement remains off.");
    expect(markup).toContain("Newest visible persisted update observed at 2026-08-14T20:00:00.000Z.");
    expect(markup).toContain("Move through the opportunity flow without leaving the queue");
    expect(markup).toContain("/crm/opportunities/new?crmReturnTo=%2Fcrm%3Fview%3Dpipeline");
    expect(markup).not.toContain("Auto-assign");
    expect(markup).not.toContain("Won");
    expect(markup).toContain("<main");
    expect(markup).toContain("<h1>");
    expect(markup).not.toContain("<form");
    expect(markup).not.toContain("<button");
    expect(markup).not.toContain("risk score");
    expect(markup).not.toContain("probability");
  });

  it("rewrites queue item detail links to preserve a safe customer-detail return chain", () => {
    const markup = renderToStaticMarkup(
      <UnifiedCrmOpportunityQueueReview
        model={fixture()}
        returnHref="/crm/customers/customer-1?crmReturnTo=%2Fcrm%3Fview%3Dcustomers%26owner%3Dmine"
      />
    );

    expect(markup).toContain("/crm/opportunities/review01?crmReturnTo=%2Fcrm%2Fcustomers%2Fcustomer-1%3FcrmReturnTo%3D%252Fcrm%253Fview%253Dcustomers%2526owner%253Dmine");
    expect(markup).toContain("/crm/opportunities/new?crmReturnTo=%2Fcrm%2Fcustomers%2Fcustomer-1%3FcrmReturnTo%3D%252Fcrm%253Fview%253Dcustomers%2526owner%253Dmine");
    expect(markup).toContain("/crm/opportunities/review01/transition?crmReturnTo=%2Fcrm%2Fcustomers%2Fcustomer-1%3FcrmReturnTo%3D%252Fcrm%253Fview%253Dcustomers%2526owner%253Dmine");
    expect(markup).not.toMatch(/crmReturnTo=[^"&]+&amp;crmReturnTo=/);
  });

  it("renders safe unavailable and loading states", () => {
    const unavailable = renderToStaticMarkup(<UnifiedCrmOpportunityQueueReview failureKind="unavailable" returnHref="/crm?view=pipeline" />);
    const loading = renderToStaticMarkup(<UnifiedCrmOpportunityQueueReviewLoading />);

    expect(unavailable).toContain("Opportunity queue review is temporarily unavailable");
    expect(unavailable).toContain('role="alert"');
    expect(unavailable).toContain("Retry");
    expect(loading).toContain("Loading opportunity queue review");
    expect(loading).toContain('aria-busy="true"');
  });

  it("preserves one customer-detail origin on every queue-to-review link", () => {
    const customerReturn = "/crm/customers/customer-1?crmReturnTo=%2Fcrm%3Fview%3Dcustomers%26status%3Dactive";
    const markup = renderToStaticMarkup(<UnifiedCrmOpportunityQueueReview model={fixture()} returnHref={customerReturn} />);
    const hrefs = [...markup.matchAll(/href="([^"]+)"/g)].map((match) => match[1]!.replaceAll("&amp;", "&"));
    const reviewLinks = hrefs.filter((href) => href.startsWith("/crm/opportunities/"));

    expect(markup).toContain(`href="${customerReturn}">Return to Customer 360`);
    expect(reviewLinks.length).toBeGreaterThan(0);
    for (const href of reviewLinks) {
      expect(new URL(href, "http://crm.local").searchParams.getAll("crmReturnTo")).toEqual([customerReturn]);
    }
  });

  it("renders a non-retryable restricted state without a mutation control", () => {
    const restricted = renderToStaticMarkup(
      <UnifiedCrmOpportunityQueueReview
        failureKind="restricted"
        returnHref="/crm?view=pipeline"
      />
    );

    expect(restricted).toContain("Opportunity queue review isn’t available to you");
    expect(restricted).toContain('role="status"');
    expect(restricted).not.toContain("<button");
  });

  it("keeps customer return continuity in queue review actions", () => {
    const markup = renderToStaticMarkup(
      <UnifiedCrmOpportunityQueueReview
        model={fixture()}
        returnHref="/crm/customers/customer-1?crmReturnTo=%2Fcrm%3Fview%3Dcustomers"
      />
    );

    expect(markup).toContain("Back to Customer 360");
    expect(markup).toContain("Customer 360 return preserved");
    expect(markup).toContain("Return to customer");
  });

  it("keeps the queue honest when no persisted read-only queue entry is visible", () => {
    const markup = renderToStaticMarkup(
      <UnifiedCrmOpportunityQueueReview
        model={{
          ...fixture(),
          liveReadObservation: {
            detail: "No same-scope persisted read-only opportunity is visible in this queue right now for team and manager review. Continue with held queue review until one is available.",
            freshnessLabel: "No visible persisted opportunity update is available yet.",
            newestVisibleRecordUpdatedAt: null,
            state: "EMPTY",
            visibleRecordCount: 0
          }
        }}
        returnHref="/crm?view=pipeline"
      />
    );

    expect(markup).toContain("Persisted read-only queue visibility pending");
    expect(markup).toContain("No same-scope persisted read-only opportunity is visible in this queue right now for team and manager review. Continue with held queue review until one is available.");
    expect(markup).toContain("No visible persisted opportunity update is available yet.");
  });
});
