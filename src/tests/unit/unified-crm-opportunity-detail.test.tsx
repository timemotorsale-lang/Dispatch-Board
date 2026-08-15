import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { UnifiedCrmOpportunityDetail, UnifiedCrmOpportunityDetailLoading } from "@/features/unified-crm/unified-crm-opportunity-detail";
import type { UnifiedCrmOpportunityDetailReadModel } from "@/server/unified-crm/opportunity-detail-contract";

function fixture(): UnifiedCrmOpportunityDetailReadModel {
  return {
    contractVersion: "ucrm.opportunity-detail/v1",
    state: "HELD",
    generatedAt: "2026-08-14T18:00:00.000Z",
    requestedOpportunityId: "review01",
    visibility: "organization",
    source: {
      authority: "UNIFIED_CRM",
      href: "/crm?view=pipeline",
      label: "Unified CRM opportunity foundation",
      observedAt: "2026-08-14T18:00:00.000Z",
      readMode: "HELD_REVIEW"
    },
    freshness: {
      status: "CURRENT",
      observedAt: "2026-08-14T18:00:00.000Z",
      sourceRecordUpdatedAt: null
    },
    identity: {
      lifecycleStatus: "HELD",
      ownerScopeLabel: "Organization review scope",
      title: "Opportunity detail review"
    },
    summary: {
      customer: "Will appear after the first governed opportunity create path is approved.",
      dueState: "No committed due state is active while lifecycle rules are held.",
      nextAction: "Next actions stay source-owned until operational opportunity commands are approved.",
      owner: "Assigned by CRM policy when operational create is enabled."
    },
    sourceBridge: {
      label: "Lead bridge",
      state: "HELD",
      detail: "Customer leads remain source-owned. CRM will correlate them without rewriting source stages or scores."
    },
    workBridges: [
      { domain: "TASKS", label: "Governed tasks", state: "HELD", detail: "Task linkage is held until the first durable opportunity record exists and tenant-safe correlation is proven." },
      { domain: "APPOINTMENTS", label: "Appointments", state: "HELD", detail: "Appointment handoff contracts are ready, but no appointment draft or existing-link action is enabled from this detail yet." },
      { domain: "DISPATCH", label: "Dispatch and jobs", state: "HELD", detail: "Dispatch remains the owning system. CRM will link or hand off work only after an approved opportunity lifecycle exists." }
    ],
    nextUnlocks: [
      "Approve stage definitions, transition evidence, and close or loss rules before enabling create or movement.",
      "Verify the first governed opportunity detail against permissions, audit history, and rollback before turning on live writes."
    ]
  };
}

describe("Unified CRM opportunity detail", () => {
  it("renders an honest held detail view", () => {
    const markup = renderToStaticMarkup(<UnifiedCrmOpportunityDetail model={fixture()} returnHref="/crm?view=pipeline" />);
    expect(markup).toContain("Opportunity detail review");
    expect(markup).toContain("Requested review id review01");
    expect(markup).toContain("Lead bridge");
    expect(markup).toContain("Appointments");
    expect(markup).toContain("Dispatch and jobs");
    expect(markup).toContain("Approve stage definitions, transition evidence, and close or loss rules before enabling create or movement.");
    expect(markup).toContain("Review create flow");
    expect(markup).toContain("Review queue flow");
    expect(markup).toContain("Review transition flow");
    expect(markup).toContain("Keep the opportunity flow one click away");
    expect(markup).toContain("Return to pipeline");
    expect(markup).not.toContain("Move to proposal");
    expect(markup).toContain("<main");
    expect(markup).toContain('aria-label="Opportunity summary"');
    expect(markup).not.toContain("<form");
    expect(markup).not.toContain("<button");
  });

  it("renders safe failure and loading states", () => {
    const unavailable = renderToStaticMarkup(<UnifiedCrmOpportunityDetail failureKind="unavailable" returnHref="/crm?view=pipeline" />);
    const loading = renderToStaticMarkup(<UnifiedCrmOpportunityDetailLoading />);
    expect(unavailable).toContain("Opportunity detail is temporarily unavailable");
    expect(unavailable).toContain('role="alert"');
    expect(loading).toContain("Loading permitted opportunity detail");
    expect(loading).toContain('aria-busy="true"');
  });
});
