import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { UnifiedCrmShell, UnifiedCrmUnavailable } from "@/features/unified-crm/unified-crm-shell";
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

const liveWorkQueue: UnifiedCrmWorkQueueReadModel = {
  contractVersion: "ucrm.work-queue/v1",
  state: "READY",
  visibility: "organization",
  generatedAt: "2026-08-15T03:00:00.000Z",
  source: {
    authority: "UNIFIED_CRM",
    label: "CRM Work",
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
  items: [{
    id: "task-1",
    kind: "task",
    title: "Call promised buyer",
    customerLabel: "Alex Morgan · CUS-18",
    customerHref: "/crm/customers/customer-1?crmReturnTo=%2Fcrm%3Fview%3Dwork",
    ownerName: "Alex Operator",
    sourceLabel: "Tasks",
    sourceHref: "/tasks/task-1",
    primaryActionLabel: "Open task",
    dueAt: "2026-08-15T02:00:00.000Z",
    dueLabel: "Overdue",
    dueState: "overdue",
    stageLabel: "In Progress",
    reason: "This assigned task is past due.",
    history: ["Status: In Progress"],
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
    expect(markup).toContain("held only");
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
    expect(markup).toContain("Open task");
    expect(markup.indexOf('href="/tasks/task-1"')).toBeLessThan(
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
    expect(markup).toContain('href="/tasks/task-1"');
    expect(markup).toContain("Open task");
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
});
