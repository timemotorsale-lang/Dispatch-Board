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
    expect(markup).toContain("No persisted source record is visible yet.");
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
    const missing = renderToStaticMarkup(<UnifiedCrmOpportunityDetail failureKind="not-available" returnHref="/crm?view=pipeline" />);
    const loading = renderToStaticMarkup(<UnifiedCrmOpportunityDetailLoading />);
    expect(unavailable).toContain("Opportunity detail is temporarily unavailable");
    expect(unavailable).toContain('role="alert"');
    expect(missing).toContain("Opportunity detail isn’t available");
    expect(missing).toContain("may not exist, may be held, or may be outside your permitted opportunity scope.");
    expect(missing).not.toContain("review01");
    expect(loading).toContain("Loading permitted opportunity detail");
    expect(loading).toContain('aria-busy="true"');
  });

  it("keeps customer return continuity in detail review", () => {
    const markup = renderToStaticMarkup(
      <UnifiedCrmOpportunityDetail
        model={fixture()}
        returnHref="/crm/customers/customer-1?crmReturnTo=%2Fcrm%3Fview%3Dcustomers"
      />
    );

    expect(markup).toContain("Back to Customer 360");
    expect(markup).toContain("Customer 360 return preserved");
    expect(markup).toContain("Return to customer");
  });

  it("shows the newest visible source update for a persisted read-only record", () => {
    const markup = renderToStaticMarkup(
      <UnifiedCrmOpportunityDetail
        model={{
          ...fixture(),
          state: "READY",
          source: {
            ...fixture().source,
            label: "Unified CRM opportunity record",
            readMode: "LIVE_READ_ONLY"
          },
          freshness: {
            ...fixture().freshness,
            sourceRecordUpdatedAt: "2026-08-14T17:30:00.000Z"
          },
          identity: {
            ...fixture().identity,
            lifecycleStatus: "READ_ONLY",
            title: "Alex Morgan renewal review"
          }
        }}
        returnHref="/crm?view=pipeline"
      />
    );

    expect(markup).toContain("Latest visible source update");
    expect(markup).toContain("Aug");
  });

  it("keeps owned live-read-only detail honest without introducing write language", () => {
    const markup = renderToStaticMarkup(
      <UnifiedCrmOpportunityDetail
        model={{
          ...fixture(),
          state: "READY",
          visibility: "owned",
          source: {
            ...fixture().source,
            label: "Unified CRM opportunity record",
            readMode: "LIVE_READ_ONLY"
          },
          identity: {
            lifecycleStatus: "READ_ONLY",
            ownerScopeLabel: "Owned review scope",
            title: "Alex Morgan renewal review"
          },
          summary: {
            customer: "Alex Morgan · CUS-18",
            dueState: "Due today",
            nextAction: "Confirm Saturday appointment",
            owner: "Taylor B."
          },
          sourceBridge: {
            label: "Source bridge",
            state: "CONNECTED",
            detail: "Customer and lead context are correlated here while the source workflow stays authoritative."
          },
          workBridges: [
            { domain: "TASKS", label: "Governed tasks", state: "HELD", detail: "Task linkage remains review only from this surface." },
            { domain: "APPOINTMENTS", label: "Appointments", state: "HELD", detail: "Appointment linkage remains read-only." },
            { domain: "DISPATCH", label: "Dispatch and jobs", state: "HELD", detail: "Dispatch authority remains outside CRM." }
          ],
          nextUnlocks: ["Verify read-only detail before any operational command is enabled."]
        }}
        returnHref="/crm?view=pipeline"
      />
    );

    expect(markup).toContain("Owned only");
    expect(markup).toContain("Unified CRM opportunity record");
    expect(markup).toContain("read only");
    expect(markup).toContain("Alex Morgan · CUS-18");
    expect(markup).toContain("Source bridge");
    expect(markup).not.toContain("Move to proposal");
    expect(markup).not.toContain("Save opportunity");
    expect(markup).not.toContain("<form");
  });
});
