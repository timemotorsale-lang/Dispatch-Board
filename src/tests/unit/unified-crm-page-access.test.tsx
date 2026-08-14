import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { AuthenticatedUser } from "@/server/auth/store";

const mocks = vi.hoisted(() => ({
  getUnifiedCrmCustomerList: vi.fn(),
  requireCurrentUser: vi.fn()
}));

vi.mock("@/server/auth/current-user", () => ({
  requireCurrentUser: mocks.requireCurrentUser
}));

vi.mock("@/server/services/unified-crm-customer-read-service", () => ({
  getUnifiedCrmCustomerList: mocks.getUnifiedCrmCustomerList
}));

import CrmPage from "@/app/(app)/crm/page";
import { isRoutePermittedForUser } from "@/server/auth/navigation";

const originalShellMode = process.env.UNIFIED_CRM_SHELL_MODE;

function user(roles: string[]): AuthenticatedUser {
  return {
    id: `user-${roles.join("-").toLowerCase()}`,
    name: "CRM Page User",
    email: "crm-page@example.test",
    isActive: true,
    roles,
    duties: { direct: [], roleDefaults: [], all: [] }
  };
}

async function renderPage(view?: string) {
  return renderToStaticMarkup(
    await CrmPage({ searchParams: Promise.resolve(view ? { view } : {}) })
  );
}

describe("Unified CRM page access and fallback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.UNIFIED_CRM_SHELL_MODE = "REVIEW";
    mocks.getUnifiedCrmCustomerList.mockResolvedValue({
      contractVersion: "ucrm.customer-list/v1",
      state: "READY",
      visibility: "organization",
      generatedAt: "2026-08-14T15:00:00.000Z",
      source: { authority: "CUSTOMERS", label: "Customers", href: "/customers", readMode: "LIVE_CANONICAL", observedAt: "2026-08-14T15:00:00.000Z" },
      freshness: { status: "CURRENT", observedAt: "2026-08-14T15:00:00.000Z", newestRecordUpdatedAt: "2026-08-14T14:45:00.000Z" },
      query: { owner: "all", q: "", status: "active" },
      items: [{ id: "customer-1", displayName: "Real Customer", customerNumber: "CUS-1", maskedPhone: "••••1234", maskedEmail: "r•••@e•••.com", ownerName: "CRM Page User", status: "active", lastInteractionAt: null, nextActionAt: null, updatedAt: "2026-08-14T14:45:00.000Z", sourceHref: "/customers/customer-1" }],
      page: { hasMore: false, limit: 25, nextCursor: null }
    });
  });

  afterEach(() => {
    if (originalShellMode === undefined) delete process.env.UNIFIED_CRM_SHELL_MODE;
    else process.env.UNIFIED_CRM_SHELL_MODE = originalShellMode;
  });

  it("renders only the safe role fallback for an ineligible authenticated user", async () => {
    mocks.requireCurrentUser.mockResolvedValue(user(["Mechanic"]));

    const markup = await renderPage();

    expect(markup).toContain("Experience review is not available");
    expect(markup).toContain("not enabled for your current workspace");
    expect(markup).toContain('href="/my-tasks"');
    expect(markup).not.toContain("Do this next");
    expect(markup).not.toContain("synthetic scenarios");
  });

  it("fails explicit feature-off closed with the existing manager workspace fallback", async () => {
    process.env.UNIFIED_CRM_SHELL_MODE = "OFF";
    mocks.requireCurrentUser.mockResolvedValue(user(["General Manager"]));

    const markup = await renderPage("pipeline");

    expect(markup).toContain("Unified CRM is turned off");
    expect(markup).toContain('href="/manager-workspace"');
    expect(markup).not.toContain("Synthetic pipeline review");
    expect(markup).not.toContain("Do this next");
  });

  it("uses the unchanged Sales landing when a seller is outside the active shell", async () => {
    process.env.UNIFIED_CRM_SHELL_MODE = "OFF";
    const salesperson = user(["Salesperson"]);
    mocks.requireCurrentUser.mockResolvedValue(salesperson);

    const markup = await renderPage();

    expect(markup).toContain('href="/tasks?department=SALES"');
    expect(isRoutePermittedForUser(salesperson, "/customers")).toBe(true);
    expect(isRoutePermittedForUser(salesperson, "/sales")).toBe(true);
  });

  it("simulates rollback from REVIEW to OFF without removing existing console routes", async () => {
    const manager = user(["General Manager"]);
    mocks.requireCurrentUser.mockResolvedValue(manager);

    const reviewMarkup = await renderPage();
    expect(reviewMarkup).toContain("Do this next");

    process.env.UNIFIED_CRM_SHELL_MODE = "OFF";
    const rolledBackMarkup = await renderPage();

    expect(rolledBackMarkup).toContain("Experience review is not available");
    expect(rolledBackMarkup).toContain('href="/manager-workspace"');
    expect(rolledBackMarkup).not.toContain("Do this next");
    expect(isRoutePermittedForUser(manager, "/customers")).toBe(true);
    expect(isRoutePermittedForUser(manager, "/sales")).toBe(true);
  });

  it("does not read or serialize customer data when the shell is OFF on the Customers URL", async () => {
    process.env.UNIFIED_CRM_SHELL_MODE = "OFF";
    mocks.requireCurrentUser.mockResolvedValue(user(["General Manager"]));
    mocks.getUnifiedCrmCustomerList.mockResolvedValue({
      items: [{ displayName: "MUST NOT BE SERIALIZED", maskedPhone: "••••9999" }]
    });

    const markup = await renderPage("customers");

    expect(mocks.getUnifiedCrmCustomerList).not.toHaveBeenCalled();
    expect(markup).toContain("Unified CRM is turned off");
    expect(markup).not.toContain("MUST NOT BE SERIALIZED");
    expect(markup).not.toContain("••••9999");
    expect(markup).not.toContain("Search customers");
  });

  it("loads the real customer list only for the Customers view and forwards safe list query fields", async () => {
    mocks.requireCurrentUser.mockResolvedValue(user(["General Manager"]));

    const markup = renderToStaticMarkup(await CrmPage({ searchParams: Promise.resolve({ view: "customers", q: "Morgan", status: "active", owner: "mine" }) }));

    expect(mocks.getUnifiedCrmCustomerList).toHaveBeenCalledWith(expect.anything(), { cursor: undefined, owner: "mine", q: "Morgan", status: "active" });
    expect(markup).toContain("Live read-only customer list");
    expect(markup).toContain("Real Customer");
    expect(markup).not.toContain("Search review scenarios");
    expect(markup).not.toContain(">New<");
  });

  it("renders an honest no-data error without echoing an invalid customer query", async () => {
    mocks.requireCurrentUser.mockResolvedValue(user(["General Manager"]));
    mocks.getUnifiedCrmCustomerList.mockRejectedValue(Object.assign(new Error("secret-query must be 100 characters or fewer"), { code: "INVALID_CUSTOMER_QUERY" }));

    const markup = renderToStaticMarkup(await CrmPage({ searchParams: Promise.resolve({ view: "customers", q: "secret-query" }) }));

    expect(markup).toContain("customer list could not be loaded safely");
    expect(markup).toContain("No customer data was displayed");
    expect(markup).not.toContain("secret-query");
    expect(markup).not.toContain("Real Customer");
  });

  it("keeps owner-only actors on their meaningful customer scope", async () => {
    mocks.requireCurrentUser.mockResolvedValue(user(["Salesperson"]));
    mocks.getUnifiedCrmCustomerList.mockResolvedValueOnce({
      visibility: "owned",
      query: { owner: "mine", q: "", status: "active" }
    });

    await CrmPage({ searchParams: Promise.resolve({ view: "customers", owner: "unassigned" }) });

    expect(mocks.getUnifiedCrmCustomerList).toHaveBeenLastCalledWith(expect.anything(), { cursor: undefined, owner: "mine", q: undefined, status: undefined });
  });
});
