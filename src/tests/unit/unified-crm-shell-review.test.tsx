import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { describeLiveWorkPresentation, UnifiedCrmShell, UnifiedCrmUnavailable } from "@/features/unified-crm/unified-crm-shell";
import { parseUnifiedCrmView, UNIFIED_CRM_REVIEW_NOTICE } from "@/features/unified-crm/unified-crm-shell-review-model";
import type { UnifiedCrmOpportunityDiscoveryModel } from "@/server/unified-crm/opportunity-discovery-contract";
import type { UnifiedCrmWorkQueueReadModel } from "@/server/unified-crm/work-queue-contract";

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
        label: "Open review hub with live detail",
        description: "Review the safe workspace map and one persisted read-only detail.",
        href: "/crm/opportunities?crmReturnTo=%2Fcrm%3Fview%3Dpipeline",
        state: "LIVE_READ_ONLY"
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

const liveWorkQueue: UnifiedCrmWorkQueueReadModel = {
  contractVersion: "ucrm.work-queue/v1",
  state: "READY",
  visibility: "organization",
  generatedAt: "2026-08-15T03:00:00.000Z",
  explanation: {
    ordering: "Items are ordered overdue first, then due today, upcoming, and waiting. Ties break by due time, source class, latest update, and record id.",
    freshness: "Freshness observed 2026-08-15T03:00:00.000Z from live read-only source records. Latest visible source update: 2026-08-15T02:45:00.000Z.",
    drillThrough: "Open the governed source record first. Open Customer 360 only when a safe linked customer route exists."
  },
  source: {
    authority: "AGGREGATED_CRM_WORK",
    label: "CRM Work projection",
    href: "/crm?view=work",
    readMode: "LIVE_AGGREGATED",
    observedAt: "2026-08-15T03:00:00.000Z"
  },
  freshness: {
    status: "CURRENT",
    observedAt: "2026-08-15T03:00:00.000Z",
    newestRecordUpdatedAt: "2026-08-15T02:45:00.000Z"
  },
  summary: {
    totalCount: 1,
    overdueCount: 1,
    todayCount: 1,
    waitingCount: 0,
    appointmentCount: 1
  },
  coverage: {
    isPartial: false,
    cappedSources: [],
    unavailableSources: [],
    sourceLimit: 8,
    sourceStates: [
      { source: "appointments", status: "available", visibleCount: 1, capped: false, newestRecordUpdatedAt: "2026-08-15T02:45:00.000Z" },
      { source: "leads", status: "available", visibleCount: 0, capped: false, newestRecordUpdatedAt: null },
      { source: "cases", status: "available", visibleCount: 0, capped: false, newestRecordUpdatedAt: null },
      { source: "customers", status: "available", visibleCount: 0, capped: false, newestRecordUpdatedAt: null }
    ]
  },
  items: [{
    id: "appt-priority-1",
    kind: "appointment",
    title: "Delivery follow-up",
    customerLabel: "Alex Morgan · CUS-18",
    customerHref: "/crm/customers/customer-1?crmReturnTo=%2Fcrm%3Fview%3Dwork",
    ownerName: "Alex Operator",
    sourceLabel: "Appointments",
    sourceHref: "/appointments?view=board&appointment=APT-1",
    primaryActionLabel: "Open appointment",
    dueAt: "2026-08-15T02:00:00.000Z",
    dueLabel: "Overdue",
    dueState: "overdue",
    stageLabel: "Scheduled",
    reason: "This appointment start time has already passed.",
    history: ["Confirmation: Pending"],
    updatedAt: "2026-08-15T02:45:00.000Z"
  }],
  today: [{
    id: "appt-1",
    title: "Delivery follow-up",
    customerLabel: "Alex Morgan · CUS-18",
    customerHref: "/crm/customers/customer-1?crmReturnTo=%2Fcrm%3Fview%3Dwork",
    detail: "Confirmed appointment",
    startsAt: "2026-08-15T16:00:00.000Z",
    sourceHref: "/appointments?view=board&appointment=APT-1"
  }]
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

  it.each([
    ["home", "/crm"],
    ["work", "/crm?view=work"]
  ] as const)("discovers the same held opportunity workspace from %s", (activeView, expectedReturnHref) => {
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
    expect(markup).toContain("held workspace with live read-only detail");
    expect(markup).toContain("Live read-only");
    expect(markup).toContain(`crmReturnTo=${encodeURIComponent(expectedReturnHref)}`);
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

  it("shows a secondary Customer 360 entry only when live work includes a safe customer link", () => {
    const markup = renderToStaticMarkup(
      <UnifiedCrmShell
        activeView="work"
        opportunityDiscovery={opportunityDiscovery}
        userName="Alex Operator"
        workQueue={liveWorkQueue}
      />
    );

    expect(markup).toContain("Open Customer 360");
    expect(markup).toContain('href="/crm/customers/customer-1?crmReturnTo=%2Fcrm%3Fview%3Dwork"');
    expect(markup).toContain("Open appointment");
    expect(markup).toContain("Items are ordered overdue first, then due today, upcoming, and waiting.");
    expect(markup).toContain("Ties break by due time, source class, latest update, and record id.");
    expect(markup).toContain("Freshness observed 2026-08-15T03:00:00.000Z from live read-only source records. Latest visible source update: 2026-08-15T02:45:00.000Z.");
    expect(markup.indexOf('href="/appointments?view=board&amp;appointment=APT-1"')).toBeLessThan(
      markup.indexOf('href="/crm/customers/customer-1?crmReturnTo=%2Fcrm%3Fview%3Dwork"')
    );
    expect(markup.match(/crmReturnTo=/g)).toHaveLength(4);
  });

  it("does not invent a Customer 360 entry when live work lacks a safe customer link", () => {
    const markup = renderToStaticMarkup(
      <UnifiedCrmShell
        activeView="work"
        opportunityDiscovery={opportunityDiscovery}
        userName="Alex Operator"
        workQueue={{ ...liveWorkQueue, items: [{ ...liveWorkQueue.items[0], customerHref: undefined }] }}
      />
    );

    expect(markup).not.toContain("Open Customer 360");
    expect(markup).toContain('href="/appointments?view=board&amp;appointment=APT-1"');
    expect(markup).toContain("Open appointment");
  });

  it("shows a Today rail Customer 360 link only when the appointment includes a safe customer route", () => {
    const markup = renderToStaticMarkup(
      <UnifiedCrmShell
        activeView="home"
        opportunityDiscovery={opportunityDiscovery}
        userName="Alex Operator"
        workQueue={liveWorkQueue}
      />
    );

    expect(markup).toContain("Confirmed appointment");
    expect(markup).toContain('href="/crm/customers/customer-1?crmReturnTo=%2Fcrm%3Fview%3Dwork"');
    expect(markup).toContain("Open Customer 360");
    expect(markup).toContain('href="/appointments"');
  });

  it("does not render a Today rail Customer 360 link when the appointment lacks a safe customer route", () => {
    const markup = renderToStaticMarkup(
      <UnifiedCrmShell
        activeView="home"
        opportunityDiscovery={opportunityDiscovery}
        userName="Alex Operator"
        workQueue={{ ...liveWorkQueue, today: [{ ...liveWorkQueue.today[0], customerHref: undefined }] }}
      />
    );

    expect(markup.match(/href="\/crm\/customers\/customer-1\?crmReturnTo=%2Fcrm%3Fview%3Dwork"/g)?.length ?? 0).toBe(1);
  });

  it("keeps live work filtering honest when no item matches the query", () => {
    const presentation = describeLiveWorkPresentation({ ...liveWorkQueue, items: [] }, "no-match");

    expect(presentation.emptyTitle).toBe("No work matches this filter");
    expect(presentation.emptyDetail).toContain("No live CRM work matches “no-match”.");
    expect(presentation.explanation).toContain("Showing 0 matching items for “no-match”.");
    expect(presentation.countLabel).toBe("0 of 1 items");
  });

  it("explains when the live work queue is capped and may not be complete", () => {
    const presentation = describeLiveWorkPresentation({
      ...liveWorkQueue,
      summary: { ...liveWorkQueue.summary, totalCount: 8 },
      coverage: {
        ...liveWorkQueue.coverage,
        isPartial: true,
        cappedSources: ["appointments"],
        unavailableSources: [],
        sourceLimit: 8,
        sourceStates: [
          { source: "appointments", status: "available", visibleCount: 8, capped: true, newestRecordUpdatedAt: "2026-08-15T02:45:00.000Z" },
          { source: "leads", status: "available", visibleCount: 0, capped: false, newestRecordUpdatedAt: null },
          { source: "cases", status: "available", visibleCount: 0, capped: false, newestRecordUpdatedAt: null },
          { source: "customers", status: "available", visibleCount: 0, capped: false, newestRecordUpdatedAt: null }
        ]
      }
    }, "");

    expect(presentation.countLabel).toBe("8+ items shown");
    expect(presentation.explanation).toContain("appointments is capped at 8 visible records");
    expect(presentation.explanation).toContain("more permitted work may exist");
  });

  it("explains when source-owned work is omitted in the current workspace", () => {
    const presentation = describeLiveWorkPresentation({
      ...liveWorkQueue,
      coverage: {
        ...liveWorkQueue.coverage,
        isPartial: false,
        cappedSources: [],
        unavailableSources: ["leads", "cases"],
        sourceLimit: 8,
        sourceStates: [
          { source: "appointments", status: "available", visibleCount: 1, capped: false, newestRecordUpdatedAt: "2026-08-15T02:45:00.000Z" },
          { source: "leads", status: "unavailable", visibleCount: 0, capped: false, newestRecordUpdatedAt: null },
          { source: "cases", status: "unavailable", visibleCount: 0, capped: false, newestRecordUpdatedAt: null },
          { source: "customers", status: "available", visibleCount: 0, capped: false, newestRecordUpdatedAt: null }
        ]
      }
    }, "");

    expect(presentation.explanation).toContain("Some source work is omitted");
    expect(presentation.explanation).toContain("leads and cases are not available in this workspace");
  });

  it("renders live lane coverage with ready, capped, and unavailable states", () => {
    const markup = renderToStaticMarkup(
      <UnifiedCrmShell
        activeView="work"
        opportunityDiscovery={opportunityDiscovery}
        userName="Alex Operator"
        workQueue={{
          ...liveWorkQueue,
          coverage: {
            isPartial: true,
            cappedSources: ["appointments"],
            unavailableSources: ["leads"],
            sourceLimit: 8,
            sourceStates: [
              { source: "appointments", status: "available", visibleCount: 8, capped: true, newestRecordUpdatedAt: "2026-08-15T02:45:00.000Z" },
              { source: "leads", status: "unavailable", visibleCount: 0, capped: false, newestRecordUpdatedAt: null },
              { source: "cases", status: "available", visibleCount: 0, capped: false, newestRecordUpdatedAt: null },
              { source: "customers", status: "available", visibleCount: 0, capped: false, newestRecordUpdatedAt: null }
            ]
          }
        }}
      />
    );

    expect(markup).toContain("Live lane coverage");
    expect(markup).toContain("Appointments");
    expect(markup).toContain("Capped");
    expect(markup).toContain("Leads");
    expect(markup).toContain("Unavailable");
    expect(markup).toContain("Cases");
    expect(markup).toContain("Ready");
    expect(markup).toContain("No visible records in this lane.");
  });
});
