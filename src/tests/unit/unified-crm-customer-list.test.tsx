import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import CrmLoading from "@/app/(app)/crm/loading";
import { UnifiedCrmCustomerList, UnifiedCrmRouteLoading } from "@/features/unified-crm/unified-crm-customer-list";
import type { UnifiedCrmCustomerListReadModel } from "@/server/unified-crm/customer-read-contract";

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

describe("Unified CRM real customer list", () => {
  it("renders masked real read data, source provenance, and governed same-tab links", () => {
    const markup = renderToStaticMarkup(<UnifiedCrmCustomerList model={model()} />);

    expect(markup).toContain("Alex Morgan");
    expect(markup).toContain("••••1234");
    expect(markup).toContain("a•••@e•••.com");
    expect(markup).toContain('href="/crm/customers/customer-1?crmReturnTo=%2Fcrm%3Fview%3Dcustomers"');
    expect(markup).not.toContain("?returnTo=");
    expect(markup).toContain("Canonical customer identity · read only");
    expect(markup).toContain("Next page");
    expect(markup).not.toContain("target=");
  });

  it("distinguishes filtered empty and owner-only visibility without misleading team filters", () => {
    const emptyMarkup = renderToStaticMarkup(<UnifiedCrmCustomerList model={model({ state: "EMPTY", query: { owner: "mine", q: "nobody", status: "active" }, items: [], page: { hasMore: false, limit: 25, nextCursor: null } })} />);
    const ownedMarkup = renderToStaticMarkup(<UnifiedCrmCustomerList model={model({ visibility: "owned", query: { owner: "mine", q: "", status: "active" } })} />);

    expect(emptyMarkup).toContain("No customers match these filters");
    expect(emptyMarkup).toContain('href="/crm?view=customers"');
    expect(ownedMarkup).toContain('type="hidden" name="owner" value="mine"');
    expect(ownedMarkup).not.toContain("All owners");
    expect(ownedMarkup).not.toContain("Unassigned</option>");
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
    for (const markup of [empty, unavailable, error]) {
      expect(markup).toContain('href="/customers"');
      expect(markup).not.toContain("Alex Morgan");
      expect(markup).not.toContain("••••1234");
    }
  });

  it("provides semantic search, table, status, and paging landmarks", () => {
    const markup = renderToStaticMarkup(<UnifiedCrmCustomerList model={model()} />);

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
