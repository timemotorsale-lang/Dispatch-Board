import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import CrmLoading from "@/app/(app)/crm/loading";
import { UnifiedCrmCustomerList, UnifiedCrmRouteLoading } from "@/features/unified-crm/unified-crm-customer-list";
import type { UnifiedCrmCustomerListReadModel } from "@/server/unified-crm/customer-read-contract";
import type { UnifiedCrmCustomerListOpportunityDiscoveryCollectionModel } from "@/server/unified-crm/customer-list-opportunity-discovery-contract";

function model(overrides: Partial<UnifiedCrmCustomerListReadModel> = {}): UnifiedCrmCustomerListReadModel {
  return {
    contractVersion: "ucrm.customer-list/v1",
    state: "READY",
    visibility: "organization",
    generatedAt: "2026-08-14T15:00:00.000Z",
    source: { authority: "CUSTOMERS", label: "Customers", href: "/customers", readMode: "LIVE_CANONICAL", observedAt: "2026-08-14T15:00:00.000Z" },
    freshness: { status: "CURRENT", observedAt: "2026-08-14T15:00:00.000Z", newestRecordUpdatedAt: "2026-08-14T14:45:00.000Z" },
    query: { owner: "all", q: "", status: "active" },
    items: [{ id: "customer-1", displayName: "Alex Morgan", customerNumber: "CUS-1001", maskedPhone: "••••1234", maskedEmail: "a•••@e•••.com", ownerName: "Taylor B.", status: "active", lastInteractionAt: "2026-08-14T14:00:00.000Z", nextActionAt: "2026-08-15T15:30:00.000Z", updatedAt: "2026-08-14T14:45:00.000Z", sourceHref: "/customers/customer-1" }],
    page: { hasMore: true, limit: 25, nextCursor: "next-safe-cursor" },
    ...overrides
  };
}

function opportunityDiscovery(): UnifiedCrmCustomerListOpportunityDiscoveryCollectionModel {
  const entry = {
    actions: [
      {
        id: "pipeline",
        label: "Open pipeline review",
        detail: "Held pipeline detail",
        href: "/crm?view=pipeline&crmReturnTo=%2Fcrm%3Fview%3Dcustomers",
        state: "HELD_REVIEW"
      },
      {
        id: "hub",
        label: "Open workspace map",
        detail: "Held hub detail",
        href: "/crm/opportunities?crmReturnTo=%2Fcrm%3Fview%3Dcustomers",
        state: "HELD_REVIEW"
      },
      {
        id: "guided",
        label: "Open guided journey",
        detail: "Held guided detail",
        href: "/crm/opportunities/guided?crmReturnTo=%2Fcrm%3Fview%3Dcustomers",
        state: "HELD_REVIEW"
      }
    ],
    contractVersion: "ucrm.customer-list-opportunity-discovery/v1",
    customer: {
      displayName: "Alex Morgan",
      href: "/crm/customers/customer-1?crmReturnTo=%2Fcrm%3Fview%3Dcustomers",
      id: "customer-1",
      listHref: "/crm?view=customers"
    },
    generatedAt: "2026-08-15T04:00:00.000Z",
    opportunityDiscovery: {
      contractVersion: "ucrm.opportunity-discovery/v1",
      generatedAt: "2026-08-15T04:00:00.000Z",
      headline: {
        title: "Opportunity workspace is ready to review, not yet to operate",
        detail: "Held only."
      },
      nextUnlocks: [],
      panels: [],
      source: {
        href: "/crm?view=pipeline",
        label: "Unified CRM opportunity workspace discovery",
        observedAt: "2026-08-15T04:00:00.000Z"
      },
      state: "HELD_REVIEW",
      visibility: "organization"
    },
    source: {
      authority: "CUSTOMERS",
      href: "/crm/customers/customer-1?crmReturnTo=%2Fcrm%3Fview%3Dcustomers",
      label: "Customer list opportunity discovery",
      observedAt: "2026-08-15T04:00:00.000Z"
    },
    state: "HELD_REVIEW"
  } as const;
  return {
    byCustomerId: { "customer-1": entry },
    contractVersion: "ucrm.customer-list-opportunity-discovery/v1",
    generatedAt: "2026-08-15T04:00:00.000Z",
    listHref: "/crm?view=customers",
    source: { authority: "CUSTOMERS", href: "/crm?view=customers", label: "Customer list opportunity discovery", observedAt: "2026-08-15T04:00:00.000Z" },
    state: "HELD_REVIEW"
  };
}

describe("Unified CRM real customer list", () => {
  it("renders masked real read data, source provenance, and governed same-tab links", () => {
    const markup = renderToStaticMarkup(<UnifiedCrmCustomerList model={model()} opportunityDiscovery={opportunityDiscovery()} />);

    expect(markup).toContain("Alex Morgan");
    expect(markup).toContain("••••1234");
    expect(markup).toContain("a•••@e•••.com");
    expect(markup).toContain('href="/customers?returnTo=%2Fcrm%3Fview%3Dcustomers"');
    expect(markup).toContain('href="/crm/customers/customer-1?crmReturnTo=%2Fcrm%3Fview%3Dcustomers"');
    expect(markup).toContain('href="/crm/opportunities?crmReturnTo=%2Fcrm%3Fview%3Dcustomers"');
    expect(markup).toContain('href="/crm/customers/customer-1?crmReturnTo=%2Fcrm%3Fview%3Dcustomers#customer-opportunity-discovery-heading"');
    expect(markup).toContain("Open opportunity review");
    expect(markup).toContain("Opportunity review");
    expect(markup).not.toMatch(/returnTo=[^"&]+&amp;returnTo=/);
    expect(markup).toContain("Canonical customer identity · read only");
    expect(markup).toContain("Next page");
    expect(markup).not.toContain("target=");
    expect(markup).not.toMatch(/Create opportunity|Move stage|Mark won|Save opportunity/i);
  });

  it("shows customer-specific opportunity review anchors for every visible customer with authorized discovery", () => {
    const baseDiscovery = opportunityDiscovery();
    const markup = renderToStaticMarkup(
      <UnifiedCrmCustomerList
        model={model({
          items: [
            model().items[0],
            {
              id: "customer-2",
              displayName: "Jordan Lee",
              customerNumber: "CUS-1002",
              maskedPhone: "••••5678",
              maskedEmail: "j•••@e•••.com",
              ownerName: "Taylor B.",
              status: "active",
              lastInteractionAt: "2026-08-14T13:00:00.000Z",
              nextActionAt: "2026-08-15T16:00:00.000Z",
              updatedAt: "2026-08-14T14:30:00.000Z",
              sourceHref: "/customers/customer-2"
            }
          ]
        })}
        opportunityDiscovery={{
          ...baseDiscovery,
          byCustomerId: {
            ...baseDiscovery.byCustomerId,
            "customer-2": {
              ...baseDiscovery.byCustomerId["customer-1"],
              customer: {
                displayName: "Jordan Lee",
                href: "/crm/customers/customer-2?crmReturnTo=%2Fcrm%3Fview%3Dcustomers",
                id: "customer-2",
                listHref: "/crm?view=customers"
              },
              source: {
                ...baseDiscovery.byCustomerId["customer-1"].source,
                href: "/crm/customers/customer-2?crmReturnTo=%2Fcrm%3Fview%3Dcustomers"
              }
            }
          }
        }}
      />
    );

    expect(markup.match(/href="\/crm\/customers\/customer-1\?crmReturnTo=%2Fcrm%3Fview%3Dcustomers#customer-opportunity-discovery-heading"/g)).toHaveLength(2);
    expect(markup.match(/href="\/crm\/customers\/customer-2\?crmReturnTo=%2Fcrm%3Fview%3Dcustomers#customer-opportunity-discovery-heading"/g)).toHaveLength(2);
    expect(markup.match(/aria-label="Review opportunity workspace from /g)).toHaveLength(4);
    expect(markup).not.toMatch(/href="(?:https?:)?\/\//);
  });

  it("does not advertise Opportunity review without the independently authorized discovery model", () => {
    const markup = renderToStaticMarkup(<UnifiedCrmCustomerList model={model()} />);

    expect(markup).toContain("Alex Morgan");
    expect(markup).not.toContain("Opportunity review discovery");
    expect(markup).not.toContain("Open opportunity review");
    expect(markup).not.toContain("#customer-opportunity-discovery-heading");
  });

  it("distinguishes filtered empty and owner-only visibility without misleading team filters", () => {
    const emptyMarkup = renderToStaticMarkup(<UnifiedCrmCustomerList model={model({ state: "EMPTY", query: { owner: "mine", q: "nobody", status: "active" }, items: [], page: { hasMore: false, limit: 25, nextCursor: null } })} />);
    const ownedMarkup = renderToStaticMarkup(<UnifiedCrmCustomerList model={model({ visibility: "owned", query: { owner: "mine", q: "", status: "active" } })} />);

    expect(emptyMarkup).toContain("No customers match these filters");
    expect(emptyMarkup).toContain('href="/crm?view=customers"');
    expect(emptyMarkup).toContain('href="/customers?returnTo=%2Fcrm%3Fview%3Dcustomers%26q%3Dnobody%26owner%3Dmine"');
    expect(ownedMarkup).toContain('type="hidden" name="owner" value="mine"');
    expect(ownedMarkup).not.toContain("All owners");
    expect(ownedMarkup).not.toContain("Unassigned</option>");
  });

  it("hides opportunity review entry points when discovery is not supplied", () => {
    const markup = renderToStaticMarkup(<UnifiedCrmCustomerList model={model()} />);
    expect(markup).not.toContain("Open opportunity review");
    expect(markup).not.toContain('href="/crm/opportunities?crmReturnTo=%2Fcrm%3Fview%3Dcustomers"');
  });

  it("does not echo restricted query or customer content when the backend denies the read", () => {
    const markup = renderToStaticMarkup(<UnifiedCrmCustomerList errorMessage="Your current access does not include CRM customer records." failureKind="restricted" />);

    expect(markup).toContain("Customer records aren’t available to you");
    expect(markup).toContain("Open existing Customers");
    expect(markup).not.toContain("Alex Morgan");
    expect(markup).not.toContain("Search customers");
  });

  it("renders a labelled busy state without customer controls or stale data", () => {
    const markup = renderToStaticMarkup(<UnifiedCrmCustomerList />);

    expect(markup).toContain('aria-busy="true"');
    expect(markup).toContain('aria-label="Loading customers"');
    expect(markup).not.toContain("Search customers");
    expect(markup).not.toContain("Alex Morgan");
  });

  it("distinguishes unfiltered empty, unavailable, and error states with safe recovery", () => {
    const empty = renderToStaticMarkup(<UnifiedCrmCustomerList model={model({ state: "EMPTY", items: [], page: { hasMore: false, limit: 25, nextCursor: null } })} />);
    const unavailable = renderToStaticMarkup(<UnifiedCrmCustomerList errorMessage="The customer source is temporarily unavailable." failureKind="unavailable" />);
    const error = renderToStaticMarkup(<UnifiedCrmCustomerList errorMessage="The customer list could not be loaded safely." failureKind="error" />);

    expect(empty).toContain("No active customers yet");
    expect(empty).toContain('role="status"');
    expect(unavailable).toContain("Customers are temporarily unavailable");
    expect(unavailable).toContain('role="alert"');
    expect(unavailable).toContain("Retry");
    expect(error).toContain("Customers couldn’t be loaded");
    expect(error).toContain('role="alert"');
    expect(empty).toContain('href="/customers?returnTo=%2Fcrm%3Fview%3Dcustomers"');
    expect(unavailable).toContain('href="/customers"');
    expect(error).toContain('href="/customers"');
    for (const markup of [empty, unavailable, error]) {
      expect(markup).not.toContain("Alex Morgan");
      expect(markup).not.toContain("••••1234");
    }
  });

  it("provides semantic search, table, status, and paging landmarks", () => {
    const markup = renderToStaticMarkup(<UnifiedCrmCustomerList model={model()} opportunityDiscovery={opportunityDiscovery()} />);

    expect(markup).toContain('role="search"');
    expect(markup).toContain("Search customers");
    expect(markup).toContain("<table");
    expect(markup).toContain("<caption>1+ customer. Contact details are masked in this list.</caption>");
    expect(markup).toContain('scope="col"');
    expect(markup).toContain('aria-live="polite"');
    expect(markup).toContain('aria-label="Customer result pages"');
    expect(markup).toContain('aria-label="Open Alex Morgan in CRM"');
    expect(markup).toContain("Current · observed");
    expect(markup).toContain("Newest record update in this page");
  });

  it("provides a reachable generic route loading state without claiming success", () => {
    const markup = renderToStaticMarkup(<CrmLoading />);

    expect(markup).toContain('aria-busy="true"');
    expect(markup).toContain("Loading your CRM workspace");
    expect(markup).toContain("Checking access and loading the permitted workspace");
    expect(markup).toContain("No action has been completed yet");
    expect(markup).not.toContain("Alex Morgan");
    expect(renderToStaticMarkup(<UnifiedCrmRouteLoading />)).toBe(markup);
  });
});
