import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AuthenticatedUser } from "@/server/auth/store";
import { customer360Fixture } from "@/tests/unit/unified-crm-customer-360-fixture";

const mocks = vi.hoisted(() => ({ getUnifiedCrmCustomer360: vi.fn(), getUnifiedCrmCustomerOpportunityDiscovery: vi.fn(), requireCurrentUser: vi.fn(), requireUnifiedCrmCustomer360Access: vi.fn(), resolveUnifiedCrmShellAccess: vi.fn() }));
vi.mock("@/server/auth/current-user", () => ({ requireCurrentUser: mocks.requireCurrentUser }));
vi.mock("@/server/services/unified-crm-customer-360-service", () => ({ getUnifiedCrmCustomer360: mocks.getUnifiedCrmCustomer360 }));
vi.mock("@/server/services/unified-crm-customer-opportunity-discovery-service", () => ({ getUnifiedCrmCustomerOpportunityDiscovery: mocks.getUnifiedCrmCustomerOpportunityDiscovery }));
vi.mock("@/server/unified-crm/customer-360-access", () => ({ requireUnifiedCrmCustomer360Access: mocks.requireUnifiedCrmCustomer360Access }));
vi.mock("@/server/unified-crm/shell-access", () => ({ resolveUnifiedCrmShellAccess: mocks.resolveUnifiedCrmShellAccess }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh() {} })
}));

import CustomerPage from "@/app/(app)/crm/customers/[customerId]/page";
import { safeCrmCustomerReturn } from "@/features/unified-crm/unified-crm-customer-return";

const actor: AuthenticatedUser = { id: "manager-1", name: "Manager", email: "manager@example.test", isActive: true, roles: ["General Manager"], duties: { direct: [], roleDefaults: [], all: [] } };

describe("Unified CRM customer detail page", () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.requireCurrentUser.mockResolvedValue(actor); mocks.requireUnifiedCrmCustomer360Access.mockReturnValue({ recordScope: { kind: "ORGANIZATION" }, readMode: "REVIEW", shellMode: "REVIEW" }); mocks.resolveUnifiedCrmShellAccess.mockResolvedValue({ allowed: true, mode: "REVIEW", reason: "ALLOWED", fallbackHref: "/manager-workspace" }); mocks.getUnifiedCrmCustomer360.mockResolvedValue(customer360Fixture()); mocks.getUnifiedCrmCustomerOpportunityDiscovery.mockResolvedValue({ contractVersion: "ucrm.customer-opportunity-discovery/v1", customer: { displayName: "Alex Morgan", href: "/crm/customers/customer-1?crmReturnTo=%2Fcrm%3Fview%3Dcustomers", id: "customer-1", listHref: "/crm?view=customers" }, generatedAt: "2026-08-15T03:00:00.000Z", opportunityDiscovery: { contractVersion: "ucrm.opportunity-discovery/v1", generatedAt: "2026-08-15T03:00:00.000Z", headline: { title: "Opportunity workspace is ready to review, not yet to operate", detail: "Held review only." }, nextUnlocks: [], panels: [{ id: "workspace-entry", label: "Start in the opportunity workspace", detail: "Use the held pipeline review.", emphasis: "ENTRY", link: { id: "pipeline", label: "Open pipeline review", description: "Held only.", href: "/crm?view=pipeline", state: "HELD_REVIEW" } }], source: { href: "/crm?view=pipeline", label: "Unified CRM opportunity workspace discovery", observedAt: "2026-08-15T03:00:00.000Z" }, state: "HELD_REVIEW", visibility: "organization" }, source: { authority: "CUSTOMERS", href: "/crm/customers/customer-1?crmReturnTo=%2Fcrm%3Fview%3Dcustomers", label: "Customer 360 opportunity discovery", observedAt: "2026-08-15T03:00:00.000Z" }, state: "HELD_REVIEW" }); });

  it("loads an exact customer and preserves only a safe CRM Customers return", async () => {
    const markup = renderToStaticMarkup(await CustomerPage({ params: Promise.resolve({ customerId: "customer-1" }), searchParams: Promise.resolve({ crmReturnTo: "/crm?view=customers&q=Alex&status=active&owner=all&cursor=safe" }) }));
    expect(mocks.getUnifiedCrmCustomer360).toHaveBeenCalledWith(actor, "customer-1");
    expect(mocks.getUnifiedCrmCustomerOpportunityDiscovery).toHaveBeenCalledWith(actor, "customer-1", {
      customer360: expect.objectContaining({ identity: expect.objectContaining({ id: "customer-1" }) }),
      customerHref: "/crm/customers/customer-1?crmReturnTo=%2Fcrm%3Fview%3Dcustomers%26q%3DAlex%26status%3Dactive%26owner%3Dall%26cursor%3Dsafe",
      customerListHref: "/crm?view=customers&q=Alex&status=active&owner=all&cursor=safe"
    });
    expect(markup).toContain('href="/crm?view=customers&amp;q=Alex&amp;status=active&amp;owner=all&amp;cursor=safe"');
    expect(markup).toContain("Review opportunity flow from this customer");
  });

  it("preserves a safe CRM Work return across customer detail and opportunity discovery links", async () => {
    const markup = renderToStaticMarkup(await CustomerPage({ params: Promise.resolve({ customerId: "customer-1" }), searchParams: Promise.resolve({ crmReturnTo: "/crm?view=work" }) }));
    expect(mocks.getUnifiedCrmCustomerOpportunityDiscovery).toHaveBeenCalledWith(actor, "customer-1", {
      customer360: expect.objectContaining({ identity: expect.objectContaining({ id: "customer-1" }) }),
      customerHref: "/crm/customers/customer-1?crmReturnTo=%2Fcrm%3Fview%3Dwork",
      customerListHref: "/crm?view=work"
    });
    expect(markup).toContain('href="/crm?view=work"');
  });

  it("rejects external, protocol-relative, wrong-view, and unknown return parameters", () => {
    for (const value of ["https://evil.example", "//evil.example", "/crm?view=pipeline", "/crm?view=customers&redirect=https://evil.example"]) expect(safeCrmCustomerReturn(value)).toBe("/crm?view=customers");
  });

  it("accepts CRM Work as a safe customer return", () => {
    expect(safeCrmCustomerReturn("/crm?view=work")).toBe("/crm?view=work");
  });

  it("preserves CRM Work when customer detail is opened from Work", async () => {
    const markup = renderToStaticMarkup(await CustomerPage({ params: Promise.resolve({ customerId: "customer-1" }), searchParams: Promise.resolve({ crmReturnTo: "/crm?view=work" }) }));
    expect(mocks.getUnifiedCrmCustomerOpportunityDiscovery).toHaveBeenCalledWith(actor, "customer-1", expect.objectContaining({
      customerHref: "/crm/customers/customer-1?crmReturnTo=%2Fcrm%3Fview%3Dwork",
      customerListHref: "/crm?view=work"
    }));
    expect(markup).toContain('href="/crm?view=work"');
    expect(markup).toContain("Back to CRM Work");
  });

  it("accepts the safe CRM Work return and rejects extra parameters on it", () => {
    expect(safeCrmCustomerReturn("/crm?view=work")).toBe("/crm?view=work");
    expect(safeCrmCustomerReturn("/crm?view=work&cursor=unsafe")).toBe("/crm?view=customers");
  });

  it("maps missing, merged, archived, and out-of-scope records to one safe state without leaking the id", async () => {
    mocks.getUnifiedCrmCustomer360.mockRejectedValue(Object.assign(new Error("secret-customer merged"), { code: "CUSTOMER_NOT_AVAILABLE" }));
    const markup = renderToStaticMarkup(await CustomerPage({ params: Promise.resolve({ customerId: "secret-customer" }), searchParams: Promise.resolve({}) }));
    expect(markup).toContain("Customer isn’t available"); expect(mocks.getUnifiedCrmCustomerOpportunityDiscovery).not.toHaveBeenCalled(); expect(markup).not.toContain("secret-customer"); expect(markup).not.toContain("merged");
  });

  it("does not read or serialize customer detail when the CRM shell is off", async () => {
    mocks.resolveUnifiedCrmShellAccess.mockResolvedValue({ allowed: false, mode: "OFF", reason: "SHELL_OFF", fallbackHref: "/manager-workspace" });
    const markup = renderToStaticMarkup(await CustomerPage({ params: Promise.resolve({ customerId: "secret-customer" }), searchParams: Promise.resolve({ crmReturnTo: "/crm?view=customers&q=secret" }) }));
    expect(markup).toContain("Unified CRM is turned off"); expect(markup).toContain('href="/manager-workspace"');
    expect(mocks.getUnifiedCrmCustomer360).not.toHaveBeenCalled(); expect(mocks.getUnifiedCrmCustomerOpportunityDiscovery).not.toHaveBeenCalled(); expect(markup).not.toContain("secret-customer"); expect(markup).not.toContain("q=secret");
  });

  it("does not read customer detail when CRM access is denied", async () => {
    mocks.resolveUnifiedCrmShellAccess.mockResolvedValue({ allowed: false, mode: "REVIEW", reason: "CAPABILITY_NOT_GRANTED", fallbackHref: "/my-tasks" });
    const markup = renderToStaticMarkup(await CustomerPage({ params: Promise.resolve({ customerId: "denied-customer" }), searchParams: Promise.resolve({}) }));
    expect(markup).toContain("not enabled for your current workspace"); expect(markup).toContain('href="/my-tasks"');
    expect(mocks.getUnifiedCrmCustomer360).not.toHaveBeenCalled(); expect(mocks.getUnifiedCrmCustomerOpportunityDiscovery).not.toHaveBeenCalled(); expect(markup).not.toContain("denied-customer");
  });

  it("does not invoke the detail service when the full customer guard rejects", async () => {
    mocks.requireUnifiedCrmCustomer360Access.mockImplementation(() => { throw Object.assign(new Error("private feature detail"), { code: "CUSTOMER_360_OFF" }); });
    const markup = renderToStaticMarkup(await CustomerPage({ params: Promise.resolve({ customerId: "held-customer" }), searchParams: Promise.resolve({}) }));
    expect(markup).toContain("Customer details are temporarily unavailable");
    expect(mocks.getUnifiedCrmCustomer360).not.toHaveBeenCalled(); expect(mocks.getUnifiedCrmCustomerOpportunityDiscovery).not.toHaveBeenCalled(); expect(markup).not.toContain("held-customer"); expect(markup).not.toContain("private feature detail");
  });

  it("keeps the customer page available when opportunity discovery is unavailable", async () => {
    mocks.getUnifiedCrmCustomerOpportunityDiscovery.mockRejectedValueOnce(Object.assign(new Error("private opportunity detail"), { code: "OPPORTUNITY_OFF" }));
    const markup = renderToStaticMarkup(await CustomerPage({ params: Promise.resolve({ customerId: "customer-1" }), searchParams: Promise.resolve({}) }));
    expect(markup).toContain("Alex Morgan");
    expect(markup).not.toContain("Review opportunity flow from this customer");
    expect(markup).not.toContain("private opportunity detail");
  });
});
