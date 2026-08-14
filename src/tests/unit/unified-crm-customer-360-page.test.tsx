import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AuthenticatedUser } from "@/server/auth/store";
import { customer360Fixture } from "@/tests/unit/unified-crm-customer-360-fixture";

const mocks = vi.hoisted(() => ({ getUnifiedCrmCustomer360: vi.fn(), requireCurrentUser: vi.fn(), requireUnifiedCrmCustomer360Access: vi.fn(), resolveUnifiedCrmShellAccess: vi.fn() }));
vi.mock("@/server/auth/current-user", () => ({ requireCurrentUser: mocks.requireCurrentUser }));
vi.mock("@/server/services/unified-crm-customer-360-service", () => ({ getUnifiedCrmCustomer360: mocks.getUnifiedCrmCustomer360 }));
vi.mock("@/server/unified-crm/customer-360-access", () => ({ requireUnifiedCrmCustomer360Access: mocks.requireUnifiedCrmCustomer360Access }));
vi.mock("@/server/unified-crm/shell-access", () => ({ resolveUnifiedCrmShellAccess: mocks.resolveUnifiedCrmShellAccess }));

import CustomerPage, { safeCrmCustomerReturn } from "@/app/(app)/crm/customers/[customerId]/page";

const actor: AuthenticatedUser = { id: "manager-1", name: "Manager", email: "manager@example.test", isActive: true, roles: ["General Manager"], duties: { direct: [], roleDefaults: [], all: [] } };

describe("Unified CRM customer detail page", () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.requireCurrentUser.mockResolvedValue(actor); mocks.requireUnifiedCrmCustomer360Access.mockReturnValue({ recordScope: { kind: "ORGANIZATION" }, readMode: "REVIEW", shellMode: "REVIEW" }); mocks.resolveUnifiedCrmShellAccess.mockResolvedValue({ allowed: true, mode: "REVIEW", reason: "ALLOWED", fallbackHref: "/manager-workspace" }); mocks.getUnifiedCrmCustomer360.mockResolvedValue(customer360Fixture()); });

  it("loads an exact customer and preserves only a safe CRM Customers return", async () => {
    const markup = renderToStaticMarkup(await CustomerPage({ params: Promise.resolve({ customerId: "customer-1" }), searchParams: Promise.resolve({ crmReturnTo: "/crm?view=customers&q=Alex&status=active&owner=all&cursor=safe" }) }));
    expect(mocks.getUnifiedCrmCustomer360).toHaveBeenCalledWith(actor, "customer-1");
    expect(markup).toContain('href="/crm?view=customers&amp;q=Alex&amp;status=active&amp;owner=all&amp;cursor=safe"');
  });

  it("rejects external, protocol-relative, wrong-view, and unknown return parameters", () => {
    for (const value of ["https://evil.example", "//evil.example", "/crm?view=pipeline", "/crm?view=customers&redirect=https://evil.example"]) expect(safeCrmCustomerReturn(value)).toBe("/crm?view=customers");
  });

  it("maps missing, merged, archived, and out-of-scope records to one safe state without leaking the id", async () => {
    mocks.getUnifiedCrmCustomer360.mockRejectedValue(Object.assign(new Error("secret-customer merged"), { code: "CUSTOMER_NOT_AVAILABLE" }));
    const markup = renderToStaticMarkup(await CustomerPage({ params: Promise.resolve({ customerId: "secret-customer" }), searchParams: Promise.resolve({}) }));
    expect(markup).toContain("Customer isn’t available"); expect(markup).not.toContain("secret-customer"); expect(markup).not.toContain("merged");
  });

  it("does not read or serialize customer detail when the CRM shell is off", async () => {
    mocks.resolveUnifiedCrmShellAccess.mockResolvedValue({ allowed: false, mode: "OFF", reason: "SHELL_OFF", fallbackHref: "/manager-workspace" });
    const markup = renderToStaticMarkup(await CustomerPage({ params: Promise.resolve({ customerId: "secret-customer" }), searchParams: Promise.resolve({ crmReturnTo: "/crm?view=customers&q=secret" }) }));
    expect(markup).toContain("Unified CRM is turned off"); expect(markup).toContain('href="/manager-workspace"');
    expect(mocks.getUnifiedCrmCustomer360).not.toHaveBeenCalled(); expect(markup).not.toContain("secret-customer"); expect(markup).not.toContain("q=secret");
  });

  it("does not read customer detail when CRM access is denied", async () => {
    mocks.resolveUnifiedCrmShellAccess.mockResolvedValue({ allowed: false, mode: "REVIEW", reason: "CAPABILITY_NOT_GRANTED", fallbackHref: "/my-tasks" });
    const markup = renderToStaticMarkup(await CustomerPage({ params: Promise.resolve({ customerId: "denied-customer" }), searchParams: Promise.resolve({}) }));
    expect(markup).toContain("not enabled for your current workspace"); expect(markup).toContain('href="/my-tasks"');
    expect(mocks.getUnifiedCrmCustomer360).not.toHaveBeenCalled(); expect(markup).not.toContain("denied-customer");
  });

  it("does not invoke the detail service when the full customer guard rejects", async () => {
    mocks.requireUnifiedCrmCustomer360Access.mockImplementation(() => { throw Object.assign(new Error("private feature detail"), { code: "CUSTOMER_360_OFF" }); });
    const markup = renderToStaticMarkup(await CustomerPage({ params: Promise.resolve({ customerId: "held-customer" }), searchParams: Promise.resolve({}) }));
    expect(markup).toContain("Customer details are temporarily unavailable");
    expect(mocks.getUnifiedCrmCustomer360).not.toHaveBeenCalled(); expect(markup).not.toContain("held-customer"); expect(markup).not.toContain("private feature detail");
  });
});
