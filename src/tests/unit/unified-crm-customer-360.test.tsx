import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { vi } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: () => "/crm/customers/customer-1",
  useRouter: () => ({ refresh() {} })
  ,
  useSearchParams: () => new URLSearchParams("crmReturnTo=%2Fcrm%3Fview%3Dcustomers")
}));

import CustomerLoading from "@/app/(app)/crm/customers/[customerId]/loading";
import { UnifiedCrmCustomer360 } from "@/features/unified-crm/unified-crm-customer-360";
import type { UnifiedCrmCustomerOpportunityDiscoveryModel } from "@/server/unified-crm/customer-opportunity-discovery-contract";
import { customer360Fixture } from "@/tests/unit/unified-crm-customer-360-fixture";

const opportunityDiscovery: UnifiedCrmCustomerOpportunityDiscoveryModel = {
  contractVersion: "ucrm.customer-opportunity-discovery/v1",
  customer: {
    displayName: "Alex Morgan",
    href: "/crm/customers/customer-1?crmReturnTo=%2Fcrm%3Fview%3Dcustomers",
    id: "customer-1",
    listHref: "/crm?view=customers"
  },
  generatedAt: "2026-08-15T03:00:00.000Z",
  opportunityDiscovery: {
    contractVersion: "ucrm.opportunity-discovery/v1",
    generatedAt: "2026-08-15T03:00:00.000Z",
    headline: {
      title: "Opportunity workspace is ready to review, not yet to operate",
      detail: "Home and Work can safely point here without fake counts or operational commands."
    },
    nextUnlocks: [],
    panels: [
      {
        id: "workspace-entry",
        label: "Start in the opportunity workspace",
        detail: "Use the pipeline workspace.",
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
        detail: "Use the guided review hub.",
        emphasis: "MAP",
        link: {
          id: "hub",
          label: "Open review hub",
          description: "Review guided surfaces.",
          href: "/crm/opportunities?crmReturnTo=%2Fcrm%3Fview%3Dpipeline",
          state: "HELD_REVIEW"
        }
      },
      {
        id: "guided-path",
        label: "Follow the intended path",
        detail: "Use the guided journey.",
        emphasis: "GUIDED",
        link: {
          id: "guided",
          label: "Open guided journey",
          description: "Review a read-only sequence.",
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
  },
  source: {
    authority: "CUSTOMERS",
    href: "/crm/customers/customer-1?crmReturnTo=%2Fcrm%3Fview%3Dcustomers",
    label: "Customer 360 opportunity discovery",
    observedAt: "2026-08-15T03:00:00.000Z"
  },
  state: "HELD_REVIEW"
};

describe("Unified CRM Customer 360", () => {
  it("prioritizes read-only identity, next action, masked contact, provenance, and source lenses", () => {
    const markup = renderToStaticMarkup(<UnifiedCrmCustomer360 model={customer360Fixture()} opportunityDiscovery={opportunityDiscovery} returnHref="/crm?view=customers&amp;q=Alex" />);
    expect(markup).toContain("Alex Morgan"); expect(markup).toContain("Taylor B."); expect(markup).toContain("Next relationship action");
    expect(markup).toContain("Do the next safe thing in one click");
    expect(markup).toContain("Live links only · governed actions stay labeled");
    expect(markup).toContain("Log manual outcome");
    expect(markup).toContain("Edit customer details");
    expect(markup).toContain("Add or correct source details here");
    expect(markup).toContain("Save missing details from a Quick Update without leaving Customer 360.");
    expect(markup).toContain("Update next action");
    expect(markup).toContain("Add internal note");
    expect(markup).toContain("Create governed task");
    expect(markup).toContain("Create a protected follow-up task");
    expect(markup).toContain("This creates a real task in the existing task workflow with CRM customer context.");
    expect(markup).toContain("task ownership stays with the task workspace after handoff");
    expect(markup).toContain('href="#task-bridge-heading"');
    expect(markup).toContain('href="#interaction-form-heading"');
    expect(markup).toContain('href="#next-action-form-heading"');
    expect(markup).toContain('href="#note-form-heading"');
    expect(markup).toContain('href="/customers/customer-1?returnTo=%2Fcrm%2Fcustomers%2Fcustomer-1%3FcrmReturnTo%3D%252Fcrm%253Fview%253Dcustomers%2526q%253DAlex"');
    expect(markup).toContain("Next relationship action · due today");
    expect(markup).toContain("This follow-up is due today. Keep the due time current if the customer plan changes.");
    expect(markup).toContain("Move today’s next action");
    expect(markup).toContain("••••1234"); expect(markup).toContain("a•••@e•••.com"); expect(markup).toContain("Current · observed");
    expect(markup).toContain("Review opportunity flow from this customer"); expect(markup).toContain("Open pipeline review");
    expect(markup).toContain('aria-labelledby="customer-opportunity-discovery-heading"'); expect(markup).toContain("Organization review"); expect(markup).toContain("workspace review");
    expect(markup).toContain("Start with the pipeline review if you want the quickest path.");
    expect(markup).toContain("Every opportunity review link keeps this customer as the safe return point");
    expect(markup).toContain('href="/crm?view=pipeline&amp;crmReturnTo=%2Fcrm%2Fcustomers%2Fcustomer-1%3FcrmReturnTo%3D%252Fcrm%253Fview%253Dcustomers"'); expect(markup).not.toMatch(/href="(?:https?:)?\/\//);
    expect(markup).toContain('href="/crm/opportunities?crmReturnTo=%2Fcrm%2Fcustomers%2Fcustomer-1%3FcrmReturnTo%3D%252Fcrm%253Fview%253Dcustomers"');
    expect(markup).toContain('href="/crm/opportunities/guided?crmReturnTo=%2Fcrm%2Fcustomers%2Fcustomer-1%3FcrmReturnTo%3D%252Fcrm%253Fview%253Dcustomers"');
    expect(markup).not.toMatch(/crmReturnTo=[^"&]+&amp;crmReturnTo=/);
    expect(markup).toContain("Follow-up journey"); expect(markup).toContain("Commercial next step"); expect(markup).toContain("From source context");
    expect(markup.match(/href="\/crm\?view=pipeline&amp;crmReturnTo=/g)).toHaveLength(3);
    expect(markup.match(/href="\/crm\/opportunities\?crmReturnTo=/g)).toHaveLength(2);
    expect(markup.match(/href="\/crm\/opportunities\/guided\?crmReturnTo=/g)).toHaveLength(2);
    expect(markup.indexOf("Follow-up journey")).toBeGreaterThan(markup.indexOf("Relationship timeline"));
    expect(markup.indexOf("Commercial next step")).toBeGreaterThan(markup.indexOf("Relationship context"));
    expect(markup.indexOf("From source context")).toBeGreaterThan(markup.indexOf("Lead and case context"));
    for (const title of ["Open pipeline review", "Open review hub", "Open guided journey"]) {
      const prompt = markup.match(new RegExp(`<a aria-label="${title}"[\\s\\S]*?<\\/a>`))?.[0];
      expect(prompt).toMatch(/guided|read.only/i);
    }
    expect(markup).not.toMatch(/Create opportunity|Move stage|Mark won|Save opportunity|live forecast/i);
    expect(markup).toContain("Team context"); expect(markup).toContain("Customer prefers texts after lunch.");
    expect(markup).toContain("Read-only opportunity summaries"); expect(markup).toContain("Alex Morgan renewal review");
    expect(markup).toContain("Only same-scope persisted opportunities linked to this customer are shown for organization review. 1 linked Dispatch record(s) are reconciled from opportunity bridge records. Lifecycle movement remains off.");
    expect(markup).toContain("1 dispatch link");
    expect(markup).toContain("opp_1001 · Qualified");
    expect(markup).toContain("RO-1001");
    expect(markup).toContain("Newest visible persisted opportunity update observed at 2026-08-15T13:00:00.000Z.");
    expect(markup).toContain('href="/crm/opportunities/opp_1001?crmReturnTo=%2Fcrm%2Fcustomers%2Fcustomer-1%3FcrmReturnTo%3D%252Fcrm%253Fview%253Dcustomers%2526q%253DAlex"');
    expect(markup).toContain("Relationship timeline"); expect(markup).toContain("Phone Outbound"); expect(markup).toContain("Appointment confirmation was recorded.");
    expect(markup).toContain("Safe touchpoint history");
    expect(markup).toContain("Raw phone numbers, raw email values, message bodies, and provider payloads are not exposed.");
    expect(markup).toContain("What can I safely do now?");
    expect(markup).toContain("Log call outcome");
    expect(markup).toContain("Draft only");
    expect(markup).toContain("Review text templates");
    expect(markup).toContain("No provider call, email, or text is sent from Customer 360.");
    expect(markup).toContain("Manual contact outcome"); expect(markup).toContain("Record a relationship touchpoint");
    expect(markup).toContain("This read-only timeline combines the latest permitted customer activity");
    expect(markup).toContain('aria-label="Permitted customer relationship activity"');
    expect(markup).toContain("Relationship touchpoint");
    expect(markup).toContain("Appointment event");
    expect(markup).toContain('dateTime="2026-08-14T14:30:00.000Z"');
    expect(markup).toContain('aria-label="Open Customer interactions source for Phone Outbound"');
    expect(markup).toContain("LEAD-101"); expect(markup).toContain("CASE-202"); expect(markup).toContain("changes stay in their source");
    expect(markup).toContain("manual contact outcomes are recorded here"); expect(markup).toContain("Create governed task"); expect(markup).not.toContain("New task");
  });

  it("surfaces overdue renewal language when the next action has passed", () => {
    const model = customer360Fixture();
    const markup = renderToStaticMarkup(
      <UnifiedCrmCustomer360
        model={{
          ...model,
          relationship: {
            ...model.relationship,
            nextActionAt: "2026-08-15T10:00:00.000Z",
            nextActionState: "OVERDUE"
          }
        }}
        returnHref="/crm?view=customers"
      />
    );

    expect(markup).toContain("This follow-up is overdue. Renew it with a new due time or complete it if the work is already done.");
    expect(markup).toContain("This follow-up is overdue. Renew it with a new due time or complete it from Customer 360.");
    expect(markup).toContain("Renew overdue next action");
  });

  it("renders overdue and renewal guidance from the server-authored relationship state", () => {
    const overdueMarkup = renderToStaticMarkup(
      <UnifiedCrmCustomer360
        model={{
          ...customer360Fixture(),
          relationship: {
            ...customer360Fixture().relationship,
            nextActionAt: "2026-08-14T16:00:00.000Z",
            nextActionState: "OVERDUE"
          }
        }}
        returnHref="/crm?view=customers"
      />
    );
    expect(overdueMarkup).toContain("Next relationship action · overdue");
    expect(overdueMarkup).toContain("Renew it with a new due time or complete it");

    const noneMarkup = renderToStaticMarkup(
      <UnifiedCrmCustomer360
        model={{
          ...customer360Fixture(),
          relationship: {
            ...customer360Fixture().relationship,
            nextActionAt: null,
            nextActionState: "NONE"
          }
        }}
        returnHref="/crm?view=customers"
      />
    );
    expect(noneMarkup).toContain("No next action is scheduled. Set a dated follow-up to renew customer continuity");
  });

  it("hides the next-action form when the server marks next-action updates unavailable", () => {
    const markup = renderToStaticMarkup(
      <UnifiedCrmCustomer360
        model={{
          ...customer360Fixture(),
          permissions: {
            ...customer360Fixture().permissions,
            canLogInteraction: false,
            canCreateNote: false,
            canCreateGovernedTask: false,
            canManageNextAction: false
          }
        }}
        returnHref="/crm?view=customers"
      />
    );

    expect(markup).toContain("CRM next-action updates are unavailable in this environment or for this customer record right now.");
    expect(markup).not.toContain("Move today’s next action");
    expect(markup).not.toContain("Renew overdue next action");
    expect(markup).toContain("Create governed task");
    expect(markup).not.toContain("Update next action");
    expect(markup).toContain("Manual outcome recording is review only from Customer 360 right now.");
    expect(markup).toContain("Customer note entry is review only from Customer 360 right now.");
    expect(markup).toContain("CRM task handoff is fail-closed for this customer or environment right now.");
    expect(markup).toContain("Open existing task intake");
    expect(markup).toContain("Customer 360 does not become the task source of truth.");
  });

  it("keeps the rest of Customer 360 usable when next-action updates are fail-closed", () => {
    const markup = renderToStaticMarkup(
      <UnifiedCrmCustomer360
        model={{
          ...customer360Fixture(),
          permissions: {
            ...customer360Fixture().permissions,
            canLogInteraction: false,
            canCreateNote: false,
            canCreateGovernedTask: false,
            canManageNextAction: false
          },
          relationship: {
            ...customer360Fixture().relationship,
            nextActionAt: "2026-08-15T10:00:00.000Z",
            nextActionState: "OVERDUE"
          }
        }}
        opportunityDiscovery={opportunityDiscovery}
        returnHref="/crm?view=work"
      />
    );

    expect(markup).toContain("CRM next-action updates are unavailable in this environment or for this customer record right now.");
    expect(markup).toContain("Relationship timeline");
    expect(markup).toContain("Create governed task");
    expect(markup).toContain("Back to CRM Work");
    expect(markup).not.toContain("Renew overdue next action");
    expect(markup).not.toContain("Move today’s next action");
    expect(markup).toContain("Keep the customer follow-up current");
    expect(markup).toContain("CRM handoff is unavailable here, so continue into the existing task intake workflow.");
    expect(markup).toContain("No customer message is sent here");
    expect(markup).toContain("Manual outcome recording is review only from Customer 360 right now.");
    expect(markup).toContain("Customer note entry is review only from Customer 360 right now.");
  });

  it("renders one non-enumerating not-available state and safe recovery", () => {
    const markup = renderToStaticMarkup(<UnifiedCrmCustomer360 failureKind="not-available" returnHref="/crm?view=customers" />);
    expect(markup).toContain("Customer isn’t available"); expect(markup).toContain("may not exist, may have changed, or may be outside");
    expect(markup).not.toContain("merged"); expect(markup).not.toContain("archived"); expect(markup).not.toContain("Alex Morgan");
    expect(markup).not.toContain("Manual contact outcome"); expect(markup).not.toContain("Log outcome");
    expect(markup).toContain('href="/crm?view=customers"'); expect(markup).toContain('href="/customers?returnTo=%2Fcrm%3Fview%3Dcustomers"');
  });

  it("preserves CRM Work continuity in the recovery exit when customer detail is unavailable", () => {
    const markup = renderToStaticMarkup(<UnifiedCrmCustomer360 failureKind="unavailable" returnHref="/crm?view=work" />);

    expect(markup).toContain("Back to CRM Work");
    expect(markup).toContain('href="/customers?returnTo=%2Fcrm%3Fview%3Dwork"');
  });

  it("provides an honest reachable loading state", () => {
    const markup = renderToStaticMarkup(<CustomerLoading />);
    expect(markup).toContain('aria-busy="true"'); expect(markup).toContain("Loading permitted customer context");
    expect(markup).toContain("No action has been completed"); expect(markup).not.toContain("Alex Morgan");
  });

  it("renders an honest empty timeline without implying missing hidden activity", () => {
    const model = customer360Fixture();
    const markup = renderToStaticMarkup(
      <UnifiedCrmCustomer360
        model={{
          ...model,
          timeline: {
            ...model.timeline,
            state: "EMPTY",
            itemCount: 0,
            items: [],
            freshness: { ...model.timeline.freshness, newestOccurredAt: null }
          }
        }}
        returnHref="/crm?view=customers"
      />
    );

    expect(markup).toContain("No permitted relationship history has been recorded yet.");
    expect(markup).toContain("New source-owned events will appear here when they enter your allowed customer scope.");
    expect(markup).not.toContain('aria-label="Permitted customer relationship activity"');
  });

  it("preserves customer continuity when a timeline event opens an existing task", () => {
    const fixture = customer360Fixture();
    const markup = renderToStaticMarkup(
      <UnifiedCrmCustomer360
        model={{
          ...fixture,
          timeline: {
            ...fixture.timeline,
            items: [
              {
                id: "task-evt-1",
                correlationKey: "task:task-1",
                sourceRecordId: "task-1",
                kind: "task-event",
                title: "Task follow-up prepared",
                detail: "Governed internal follow-up is now tracked in Tasks.",
                occurredAt: "2026-08-14T12:00:00.000Z",
                actorName: "Taylor B.",
                sourceLabel: "Tasks",
                sourceHref: "/tasks/task-1"
              }
            ],
            itemCount: 1
          }
        }}
        returnHref="/crm?view=work"
      />
    );

    expect(markup).toContain(
      'href="/tasks/task-1?returnTo=%2Fcrm%2Fcustomers%2Fcustomer-1%3FcrmReturnTo%3D%252Fcrm%253Fview%253Dwork"'
    );
    expect(markup).toContain('aria-label="Open Tasks source for Task follow-up prepared"');
  });

  it("keeps the opportunity lens honest when no persisted opportunity is visible", () => {
    const fixture = customer360Fixture();
    const markup = renderToStaticMarkup(
      <UnifiedCrmCustomer360
        model={{
          ...fixture,
          opportunityLensObservation: {
            detail: "No same-scope persisted read-only opportunity linked to this customer is visible right now for organization review. Use guided opportunity surfaces until one is available.",
            dispatchLinkCount: 0,
            freshnessLabel: "No visible persisted opportunity update is available yet.",
            newestVisibleRecordUpdatedAt: null,
            state: "EMPTY",
            visibleRecordCount: 0
          },
          opportunityLenses: []
        }}
        opportunityDiscovery={opportunityDiscovery}
        returnHref="/crm?view=customers"
      />
    );

    expect(markup).toContain("No persisted opportunity is linked yet");
    expect(markup).toContain("No same-scope persisted read-only opportunity linked to this customer is visible right now for organization review. Use guided opportunity surfaces until one is available.");
    expect(markup).toContain("No visible persisted opportunity update is available yet.");
  });

  it("keeps CRM Work continuity when customer detail started from Work", () => {
    const workOpportunityDiscovery: UnifiedCrmCustomerOpportunityDiscoveryModel = {
      ...opportunityDiscovery,
      customer: {
        ...opportunityDiscovery.customer,
        href: "/crm/customers/customer-1?crmReturnTo=%2Fcrm%3Fview%3Dwork"
      },
      source: {
        ...opportunityDiscovery.source,
        href: "/crm/customers/customer-1?crmReturnTo=%2Fcrm%3Fview%3Dwork"
      }
    };
    const markup = renderToStaticMarkup(<UnifiedCrmCustomer360 model={customer360Fixture()} opportunityDiscovery={workOpportunityDiscovery} returnHref="/crm?view=work" />);
    expect(markup).toContain("Back to CRM Work");
    expect(markup).toContain("CRM Work return preserved");
    expect(markup).toContain('href="/crm?view=pipeline&amp;crmReturnTo=%2Fcrm%2Fcustomers%2Fcustomer-1%3FcrmReturnTo%3D%252Fcrm%253Fview%253Dwork"');
    expect(markup).toContain('href="/crm/opportunities?crmReturnTo=%2Fcrm%2Fcustomers%2Fcustomer-1%3FcrmReturnTo%3D%252Fcrm%253Fview%253Dwork"');
    expect(markup).toContain('href="/crm/opportunities/guided?crmReturnTo=%2Fcrm%2Fcustomers%2Fcustomer-1%3FcrmReturnTo%3D%252Fcrm%253Fview%253Dwork"');
    expect(markup).not.toMatch(/href="(?:https?:)?\/\//);
    expect(markup).not.toMatch(/crmReturnTo=[^"&]+&amp;crmReturnTo=/);
  });

  it("preserves customer continuity for primary customer exits and source-owned appointments, vehicles, leads, and cases", () => {
    const markup = renderToStaticMarkup(
      <UnifiedCrmCustomer360
        model={customer360Fixture()}
        opportunityDiscovery={opportunityDiscovery}
        returnHref="/crm?view=work"
      />
    );

    expect(markup).toContain(
      'href="/customers/customer-1?returnTo=%2Fcrm%2Fcustomers%2Fcustomer-1%3FcrmReturnTo%3D%252Fcrm%253Fview%253Dwork"'
    );
    expect(markup).toContain(
      'href="/appointments?returnTo=%2Fcrm%2Fcustomers%2Fcustomer-1%3FcrmReturnTo%3D%252Fcrm%253Fview%253Dwork"'
    );
    expect(markup).toContain(
      'href="/vehicles/360/vehicle-1?returnTo=%2Fcrm%2Fcustomers%2Fcustomer-1%3FcrmReturnTo%3D%252Fcrm%253Fview%253Dwork"'
    );
    expect(markup).toContain(
      'href="/sales?returnTo=%2Fcrm%2Fcustomers%2Fcustomer-1%3FcrmReturnTo%3D%252Fcrm%253Fview%253Dwork"'
    );
    expect(markup).toContain(
      'href="/customers/resolutions?caseId=CASE-202&amp;returnTo=%2Fcrm%2Fcustomers%2Fcustomer-1%3FcrmReturnTo%3D%252Fcrm%253Fview%253Dwork"'
    );
  });
});
