import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { UnifiedCrmOpportunityTransitionReview, UnifiedCrmOpportunityTransitionReviewLoading } from "@/features/unified-crm/unified-crm-opportunity-transition-review";

function fixture() {
  return {
    contractVersion: "ucrm.opportunity-transition/v1",
    state: "HELD_REVIEW",
    generatedAt: "2026-08-14T19:30:00.000Z",
    requestedOpportunityId: "review01",
    visibility: "organization",
    source: { href: "/crm?view=pipeline", label: "Unified CRM opportunity transition review", observedAt: "2026-08-14T19:30:00.000Z" },
    headline: { title: "Review the first governed opportunity transition flow", detail: "Held transition detail" },
    currentState: { label: "Current lifecycle state", detail: "Held current state", status: "HELD" as const },
    transitionChecks: [
      { id: "allowed-edge", label: "Allowed stage change", detail: "detail", state: "HELD" as const },
      { id: "next-action", label: "Next action stays clear", detail: "detail", state: "REQUIRED" as const }
    ],
    governance: ["No live stage transition is available from this review surface."],
    nextUnlocks: ["Approve the lifecycle graph, transition authority, and evidence requirements for each stage change."],
    transitionAction: { label: "Move to next stage", state: "HELD" as const }
  };
}

describe("Unified CRM opportunity transition review", () => {
  it("renders an honest transition review", () => {
    const markup = renderToStaticMarkup(<UnifiedCrmOpportunityTransitionReview model={fixture()} returnHref="/crm?view=pipeline" />);
    expect(markup).toContain("Review the first governed opportunity transition flow");
    expect(markup).toContain("Allowed stage change");
    expect(markup).toContain("Move to next stage");
    expect(markup).toContain("Review create flow");
    expect(markup).toContain("<main");
    expect(markup).toContain("<h1>");
    expect(markup).not.toContain("<form");
    expect(markup).not.toContain("<button");
  });

  it("renders failure and loading states", () => {
    const unavailable = renderToStaticMarkup(<UnifiedCrmOpportunityTransitionReview failureKind="unavailable" returnHref="/crm?view=pipeline" />);
    const loading = renderToStaticMarkup(<UnifiedCrmOpportunityTransitionReviewLoading />);
    expect(unavailable).toContain("Opportunity transition review is temporarily unavailable");
    expect(unavailable).toContain('role="alert"');
    expect(loading).toContain("Loading opportunity transition review");
    expect(loading).toContain('aria-busy="true"');
  });
});
