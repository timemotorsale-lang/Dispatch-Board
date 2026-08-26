import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { UnifiedCrmOpportunityPipelinePreview, UnifiedCrmOpportunityPreview } from "@/features/unified-crm/unified-crm-opportunity-preview";
import type { UnifiedCrmOpportunityPreviewModel } from "@/server/unified-crm/opportunity-read-contract";

function previewFixture(): UnifiedCrmOpportunityPreviewModel {
  return {
    contractVersion: "ucrm.opportunity-read/v1",
    generatedAt: "2026-08-14T00:00:00.000Z",
    state: "PREVIEW",
    visibility: "organization",
    cards: [
      { id: "foundation", label: "Foundation", value: "Ready", detail: "Foundation detail", tone: "ready" },
      { id: "policy", label: "Stage policy", value: "Held", detail: "Policy detail", tone: "held" },
      { id: "bridges", label: "Owning-system bridges", value: "Prepared", detail: "Bridge detail", tone: "neutral" }
    ],
    columns: [{
      id: "intake",
      label: "Intake review",
      itemCountLabel: "2 scenarios",
      valueLabel: "No governed stage yet",
      items: [{
        id: "review01",
        customerLabel: "Customer appears after approved create path",
        detailHref: "/crm/opportunities/review01?crmReturnTo=%2Fcrm%3Fview%3Dpipeline",
        nextActionLabel: "Review create contract",
        ownerLabel: "Team-owned preview",
        reason: "First secure create path will surface here after lifecycle approval.",
        state: "HELD_REVIEW"
      }, {
        id: "live-opp-1",
        customerLabel: "ACME Industries · CUS-44",
        detailHref: "/crm/opportunities/OPP-1001?crmReturnTo=%2Fcrm%3Fview%3Dpipeline",
        dueLabel: "Due soon",
        moveHref: "/crm/opportunities/OPP-1001/transition?crmReturnTo=%2Fcrm%3Fview%3Dpipeline",
        nextActionLabel: "Call customer",
        ownerLabel: "Jordan Smith",
        reason: "Open this persisted opportunity in read-only mode.",
        stage: "NEW_INQUIRY",
        state: "LIVE_READ_ONLY",
        version: 2
      }]
    }],
    constraints: [
      "No opportunity record is created in this preview.",
      "Stage movement must use the governed transition command; board cards link into that command instead of mutating directly."
    ],
    listPreview: {
      observation: {
        detail: "Only same-scope persisted opportunities are listed here for organization review. Lifecycle movement opens through the governed transition command.",
        freshnessLabel: "Newest visible persisted update observed at 2026-08-14T00:00:00.000Z.",
        newestVisibleRecordUpdatedAt: "2026-08-14T00:00:00.000Z",
        state: "READY",
        visibleRecordCount: 1
      },
      heading: "What the first live list will surface",
      emptyMessage: "No live opportunities are shown while lifecycle rules are held.",
      items: [
        {
          id: "live-opp-1",
          title: "ACME refresh project",
          customerLabel: "ACME Industries · CUS-44",
          href: "/crm/opportunities/OPP-1001?crmReturnTo=%2Fcrm%3Fview%3Dpipeline",
          detailHref: "/crm/opportunities/OPP-1001?crmReturnTo=%2Fcrm%3Fview%3Dpipeline",
          dueLabel: "Due soon",
          moveHref: "/crm/opportunities/OPP-1001/transition?crmReturnTo=%2Fcrm%3Fview%3Dpipeline",
          nextActionLabel: "Call customer",
          ownerLabel: "Jordan Smith",
          reason: "Open this persisted opportunity in read-only mode.",
          stage: "NEW_INQUIRY",
          state: "LIVE_READ_ONLY"
        },
        {
          id: "row01",
          title: "Customer and owner at a glance",
          ownerLabel: "Organization visibility",
          reason: "Every live record row will show the next action, owner, and due state before any deeper details.",
          state: "HELD_REVIEW"
        }
      ]
    }
  };
}

describe("Unified CRM opportunity preview", () => {
  it("renders an honest held-state preview without claiming operational pipeline behavior", () => {
    const markup = renderToStaticMarkup(<UnifiedCrmOpportunityPreview />);

    expect(markup).toContain("Foundation is ready. Lifecycle rules are intentionally held.");
    expect(markup).toContain("Stage policy");
    expect(markup).toContain("Owning-system bridges");
    expect(markup).toContain("No opportunity record is created in this preview.");
    expect(markup).toContain("Approve stage definitions and transition evidence to unlock operational opportunity slices.");
    expect(markup).not.toContain("Move to proposal");
    expect(markup).not.toContain("Won");
  });

  it("renders a held board and list review experience", () => {
    const markup = renderToStaticMarkup(<UnifiedCrmOpportunityPipelinePreview model={previewFixture()} />);

    expect(markup).toContain("How the first opportunity board will feel");
    expect(markup).toContain("Intake review");
    expect(markup).toContain("Review create contract");
    expect(markup).toContain("Held review");
    expect(markup).toContain("What the first live list will surface");
    expect(markup).toContain("Same-scope persisted read-only opportunities");
    expect(markup).toContain("ACME refresh project");
    expect(markup).toContain("Live read-only");
    expect(markup).toContain("Move stage with command");
    expect(markup).toContain("Due soon");
    expect(markup).toContain("v2");
    expect(markup).toContain("These links open permitted persisted opportunity records in read-only mode.");
    expect(markup).toContain("Only same-scope persisted opportunities are listed here for organization review. Lifecycle movement opens through the governed transition command.");
    expect(markup).toContain("Newest visible persisted update observed at 2026-08-14T00:00:00.000Z.");
    expect(markup).toContain("/crm/opportunities/OPP-1001?crmReturnTo=%2Fcrm%3Fview%3Dpipeline");
    expect(markup).toContain("Customer and owner at a glance");
    expect(markup).toContain("/crm/opportunities/queue?crmReturnTo=%2Fcrm%3Fview%3Dpipeline");
    expect(markup).toContain("/crm/opportunities?crmReturnTo=%2Fcrm%3Fview%3Dpipeline");
    expect(markup).toContain("Open opportunity hub");
    expect(markup).toContain("Open guided journey");
    expect(markup).toContain("/crm/opportunities/guided?crmReturnTo=%2Fcrm%3Fview%3Dpipeline");
    expect(markup).toContain("/crm/opportunities/new?crmReturnTo=%2Fcrm%3Fview%3Dpipeline");
    expect(markup).toContain("Review the core opportunity flow");
    expect(markup).toContain("You are at the workspace entry point");
    expect(markup).toContain('aria-label="Opportunity workspace orientation"');
    expect(markup).toContain("You are at the workspace entry point");
    expect(markup).toContain("/crm/opportunities/review01/transition?crmReturnTo=%2Fcrm%3Fview%3Dpipeline");
    expect(markup).toContain("Read-only detail available; writes still off");
  });

  it("keeps the collection honest when no persisted read-only opportunity is visible", () => {
    const markup = renderToStaticMarkup(
      <UnifiedCrmOpportunityPipelinePreview
        model={{
          ...previewFixture(),
          listPreview: {
            ...previewFixture().listPreview,
            observation: {
              detail: "No same-scope persisted read-only opportunity is visible right now for organization review. Continue with held pipeline review until one is available.",
              freshnessLabel: "No visible persisted opportunity update is available yet.",
              newestVisibleRecordUpdatedAt: null,
              state: "EMPTY",
              visibleRecordCount: 0
            },
            items: [
              {
                id: "row01",
                title: "Customer and owner at a glance",
                ownerLabel: "Organization visibility",
                reason: "Every live record row will show the next action, owner, and due state before any deeper details.",
                state: "HELD_REVIEW"
              }
            ]
          }
        }}
      />
    );

    expect(markup).toContain("Read-only visibility pending");
    expect(markup).toContain("No same-scope persisted read-only opportunity is visible in this preview snapshot yet.");
    expect(markup).toContain("No same-scope persisted read-only opportunity is visible right now for organization review. Continue with held pipeline review until one is available.");
    expect(markup).toContain("No visible persisted opportunity update is available yet.");
    expect(markup).not.toContain("ACME refresh project");
    expect(markup).toContain("Held review");
  });
});
