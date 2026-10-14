import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { UnifiedCrmOpportunityTransitionReview, UnifiedCrmOpportunityTransitionReviewLoading } from "@/features/unified-crm/unified-crm-opportunity-transition-review";

function fixture() {
  return {
    contractVersion: "ucrm.opportunity-transition/v1",
    state: "LIVE_TRANSITION",
    generatedAt: "2026-08-14T19:30:00.000Z",
    requestedOpportunityId: "review01",
    visibility: "organization",
    source: { href: "/crm?view=pipeline", label: "Unified CRM opportunity transition review", observedAt: "2026-08-14T19:30:00.000Z" },
    headline: { title: "Move opportunity to the next governed stage", detail: "Live transition detail" },
    currentState: {
      allowedNextStages: ["QUALIFIED", "LOST"],
      label: "Current lifecycle state",
      detail: "Current state",
      nextActionDueAt: "2026-08-15T18:30:00.000Z",
      nextActionLabel: "Call customer",
      stage: "NEW_INQUIRY",
      status: "READY" as const,
      version: 2
    },
    transitionChecks: [
      { id: "allowed-edge", label: "Allowed stage change", detail: "detail", state: "REQUIRED" as const },
      { id: "next-action", label: "Next action stays clear", detail: "detail", state: "REQUIRED" as const }
    ],
    governance: ["Every live stage move uses the CRM opportunity transition command."],
    nextUnlocks: ["Use this same command from the visual pipeline board in UCRM-033."],
    transitionAction: { label: "Move to next stage", state: "READY" as const }
  };
}

describe("Unified CRM opportunity transition review", () => {
  it("renders a governed transition form", () => {
    const markup = renderToStaticMarkup(<UnifiedCrmOpportunityTransitionReview model={fixture()} returnHref="/crm?view=pipeline" />);
    expect(markup).toContain("Move opportunity to the next governed stage");
    expect(markup).toContain("Allowed stage change");
    expect(markup).toContain("Move to next stage");
    expect(markup).toContain("Review create flow");
    expect(markup).toContain("<main");
    expect(markup).toContain("<h1>");
    expect(markup).toContain("<form");
    expect(markup).toContain("Current version 2");
  });

  it("renders failure and loading states", () => {
    const unavailable = renderToStaticMarkup(<UnifiedCrmOpportunityTransitionReview failureKind="unavailable" returnHref="/crm?view=pipeline" />);
    const loading = renderToStaticMarkup(<UnifiedCrmOpportunityTransitionReviewLoading />);
    expect(unavailable).toContain("Opportunity transition review is temporarily unavailable");
    expect(unavailable).toContain('role="alert"');
    expect(loading).toContain("Loading opportunity transition review");
    expect(loading).toContain('aria-busy="true"');
  });

  it("keeps customer return continuity in transition review", () => {
    const markup = renderToStaticMarkup(
      <UnifiedCrmOpportunityTransitionReview
        model={fixture()}
        returnHref="/crm/customers/customer-1?crmReturnTo=%2Fcrm%3Fview%3Dcustomers"
      />
    );

    expect(markup).toContain("Back to Customer 360");
    expect(markup).toContain("Customer 360 return preserved");
    expect(markup).toContain("Return to Customer 360");
  });
});
