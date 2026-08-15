import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { UnifiedCrmShell, UnifiedCrmUnavailable } from "@/features/unified-crm/unified-crm-shell";
import { parseUnifiedCrmView, UNIFIED_CRM_REVIEW_NOTICE } from "@/features/unified-crm/unified-crm-shell-review-model";
import type { UnifiedCrmOpportunityDiscoveryModel } from "@/server/unified-crm/opportunity-discovery-contract";

const opportunityDiscovery: UnifiedCrmOpportunityDiscoveryModel = {
  contractVersion: "ucrm.opportunity-discovery/v1",
  generatedAt: "2026-08-15T03:00:00.000Z",
  headline: {
    title: "Opportunity workspace is ready to review, not yet to operate",
    detail: "Home and Work can point to the held opportunity workspace without fake counts or operational commands."
  },
  nextUnlocks: ["Approve lifecycle rules before enabling live actions."],
  panels: [
    {
      id: "workspace-entry",
      label: "Start in the opportunity workspace",
      detail: "Use the held pipeline review.",
      emphasis: "ENTRY",
      link: {
        id: "pipeline",
        label: "Open pipeline review",
        description: "Review without live stages, forecasts, or writes.",
        href: "/crm?view=pipeline",
        state: "HELD_REVIEW"
      }
    },
    {
      id: "workspace-map",
      label: "Choose the exact review surface",
      detail: "Compare held review surfaces.",
      emphasis: "MAP",
      link: {
        id: "hub",
        label: "Open review hub",
        description: "Review the safe workspace map.",
        href: "/crm/opportunities?crmReturnTo=%2Fcrm%3Fview%3Dpipeline",
        state: "HELD_REVIEW"
      }
    },
    {
      id: "guided-path",
      label: "Follow the intended end-to-end review path",
      detail: "Walk the held path in user order.",
      emphasis: "GUIDED",
      link: {
        id: "guided",
        label: "Open guided journey",
        description: "Walk a held, read-only sequence.",
        href: "/crm/opportunities/guided?crmReturnTo=%2Fcrm%3Fview%3Dpipeline",
        state: "HELD_REVIEW"
      }
    }
  ],
  source: {
    href: "/crm?view=pipeline",
    label: "Unified CRM opportunity workspace discovery",
    observedAt: "2026-08-15T03:00:00.000Z"
  },
  state: "HELD_REVIEW",
  visibility: "organization"
};

describe("Unified CRM UX review shell", () => {
  it("leads with prioritized work and labels every scenario as synthetic review", () => {
    const markup = renderToStaticMarkup(<UnifiedCrmShell activeView="home" userName="Alex Operator" />);

    expect(markup).toContain("Here’s what needs attention, Alex");
    expect(markup).toContain("Do this next");
    expect(markup).toContain("synthetic scenarios only");
    expect(markup).toContain(UNIFIED_CRM_REVIEW_NOTICE.replace("Experience review — ", ""));
    expect(markup).toContain("The CRM review does not write or send anything");
    expect(markup).toContain("/customers?returnTo=%2Fcrm");
    expect(markup).not.toContain("Send message");
    expect(markup).not.toContain("Save opportunity");
  });

  it("keeps manual conversations and pipeline movement visibly non-operational", () => {
    const conversations = renderToStaticMarkup(<UnifiedCrmShell activeView="conversations" userName="Alex Operator" />);
    const pipeline = renderToStaticMarkup(<UnifiedCrmShell activeView="pipeline" userName="Alex Operator" />);

    expect(conversations).toContain("No external messages are sent or synchronized");
    expect(pipeline).toContain("Lifecycle rules are intentionally held");
    expect(pipeline).toContain("No opportunity record is created in this preview");
    expect(pipeline).toContain("How the first opportunity board will feel");
  });

  it.each(["home", "work"] as const)("discovers the same held opportunity workspace from %s", (activeView) => {
    const markup = renderToStaticMarkup(
      <UnifiedCrmShell
        activeView={activeView}
        opportunityDiscovery={opportunityDiscovery}
        userName="Alex Operator"
        workQueueError="The CRM work queue is temporarily unavailable."
        workQueueFailureKind="unavailable"
      />
    );

    expect(markup).toContain('<main');
    expect(markup).toContain('aria-label="Opportunity workspace discovery"');
    expect(markup).toContain("Opportunity workspace is ready to review, not yet to operate");
    expect(markup).toContain("held only");
    expect(markup).toContain('href="/crm?view=pipeline"');
    expect(markup).toContain('href="/crm/opportunities?crmReturnTo=%2Fcrm%3Fview%3Dpipeline"');
    expect(markup).toContain('href="/crm/opportunities/guided?crmReturnTo=%2Fcrm%3Fview%3Dpipeline"');
    expect(markup).not.toMatch(/href="(?:https?:)?\/\//);
    expect(markup).not.toMatch(/Create opportunity|Move stage|Mark won|Save opportunity|live forecast/i);
  });

  it("falls back safely for unknown views and renders an honest unavailable state", () => {
    expect(parseUnifiedCrmView("unknown")).toBe("home");
    expect(parseUnifiedCrmView(["work", "pipeline"])).toBe("work");

    const unavailable = renderToStaticMarkup(
      <UnifiedCrmUnavailable fallbackHref="/my-tasks" reason="The review is off." />
    );
    expect(unavailable).toContain("Experience review is not available");
    expect(unavailable).toContain('href="/my-tasks"');
    expect(unavailable).toContain("The review is off.");
  });
});
