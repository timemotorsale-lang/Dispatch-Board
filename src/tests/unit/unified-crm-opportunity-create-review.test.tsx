import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { UnifiedCrmOpportunityCreateReview, UnifiedCrmOpportunityCreateReviewLoading } from "@/features/unified-crm/unified-crm-opportunity-create-review";

function fixture() {
  return {
    contractVersion: "ucrm.opportunity-create/v1",
    state: "HELD_REVIEW",
    generatedAt: "2026-08-14T19:15:00.000Z",
    visibility: "organization",
    source: { href: "/crm?view=pipeline", label: "Unified CRM opportunity create review", observedAt: "2026-08-14T19:15:00.000Z" },
    headline: {
      title: "Review the first governed opportunity create flow",
      detail: "This shows exactly how create will feel before live opportunity records, stage entry, and forecast behavior are turned on."
    },
    requiredInputs: [
      { id: "customer", label: "Customer or lead context", detail: "detail", state: "REQUIRED" as const },
      { id: "stage", label: "Initial lifecycle state", detail: "detail", state: "HELD" as const }
    ],
    governance: ["No live opportunity is created from this review surface."],
    nextUnlocks: ["Approve the initial stage and entry evidence so the first create command has a governed landing state."],
    createAction: { label: "Create opportunity", state: "HELD" as const }
  };
}

describe("Unified CRM opportunity create review", () => {
  it("renders an honest create-flow review", () => {
    const markup = renderToStaticMarkup(<UnifiedCrmOpportunityCreateReview model={fixture()} returnHref="/crm?view=pipeline" />);
    expect(markup).toContain("Review the first governed opportunity create flow");
    expect(markup).toContain("Customer or lead context");
    expect(markup).toContain("Initial lifecycle state");
    expect(markup).toContain("Create opportunity");
    expect(markup).toContain("HELD");
  });

  it("renders failure and loading states", () => {
    const unavailable = renderToStaticMarkup(<UnifiedCrmOpportunityCreateReview failureKind="unavailable" returnHref="/crm?view=pipeline" />);
    const loading = renderToStaticMarkup(<UnifiedCrmOpportunityCreateReviewLoading />);
    expect(unavailable).toContain("Opportunity create review is temporarily unavailable");
    expect(loading).toContain("Loading opportunity create review");
  });
});
