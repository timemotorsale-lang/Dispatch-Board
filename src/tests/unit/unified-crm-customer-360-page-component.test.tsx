import { renderToStaticMarkup } from "@/tests/helpers/render-with-app-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getUnifiedCrmCustomer360: vi.fn(),
  requireCurrentUser: vi.fn(),
  requireUnifiedCrmCustomer360Access: vi.fn(),
  resolveUnifiedCrmShellAccess: vi.fn()
}));

vi.mock("@/server/auth/current-user", () => ({ requireCurrentUser: mocks.requireCurrentUser }));
vi.mock("@/server/services/unified-crm-customer-360-service", () => ({
  getUnifiedCrmCustomer360: mocks.getUnifiedCrmCustomer360
}));
vi.mock("@/server/unified-crm/shell-access", () => ({ resolveUnifiedCrmShellAccess: mocks.resolveUnifiedCrmShellAccess }));
vi.mock("@/server/unified-crm/customer-360-access", () => ({ requireUnifiedCrmCustomer360Access: mocks.requireUnifiedCrmCustomer360Access }));

import UnifiedCrmCustomerPage from "@/app/(app)/crm/customers/[customerId]/page";

async function renderPage(customerId: string) {
  return renderToStaticMarkup(await UnifiedCrmCustomerPage({
    params: Promise.resolve({ customerId }),
    searchParams: Promise.resolve({})
  }));
}

describe("Unified CRM Customer 360 adversarial page mapping", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireCurrentUser.mockResolvedValue({ id: "seller-a", name: "Seller A" });
    mocks.requireUnifiedCrmCustomer360Access.mockReturnValue({ recordScope: { kind: "OWNER", ownerUserId: "seller-a" }, readMode: "REVIEW", shellMode: "REVIEW" });
    mocks.resolveUnifiedCrmShellAccess.mockResolvedValue({ allowed: true, mode: "REVIEW", reason: "ALLOWED", fallbackHref: "/tasks?department=SALES" });
  });

  it.each([
    [{ allowed: false, fallbackHref: "/manager-workspace", mode: "OFF", reason: "SHELL_OFF" }, "Unified CRM is turned off"],
    [{ allowed: false, fallbackHref: "/my-tasks", mode: "REVIEW", reason: "WORKSPACE_NOT_ELIGIBLE" }, "not enabled for your current workspace"]
  ])("does not call or serialize detail data when deep-route access is denied: %j", async (access, message) => {
    mocks.resolveUnifiedCrmShellAccess.mockResolvedValue(access);
    mocks.getUnifiedCrmCustomer360.mockResolvedValue({ identity: { displayName: "MUST NOT BE SERIALIZED" } });

    const markup = await renderPage("customer-a");

    expect(mocks.getUnifiedCrmCustomer360).not.toHaveBeenCalled();
    expect(markup).toContain(message);
    expect(markup).not.toContain("MUST NOT BE SERIALIZED");
    expect(markup).not.toContain("customer-a");
  });

  it("renders missing, other-organization, and out-of-owner results byte-equivalently without identifiers", async () => {
    const identifiers = ["missing-customer", "other-org-customer", "other-owner-customer"];
    const rendered: string[] = [];

    for (const customerId of identifiers) {
      mocks.getUnifiedCrmCustomer360.mockRejectedValueOnce(Object.assign(
        new Error(`secret backend reason for ${customerId}`),
        { code: "CUSTOMER_NOT_AVAILABLE" }
      ));
      rendered.push(await renderPage(customerId));
    }

    expect(new Set(rendered).size).toBe(1);
    expect(rendered[0]).toContain("Customer isn’t available");
    for (const customerId of identifiers) expect(rendered[0]).not.toContain(customerId);
  });

  it("maps restricted, read-off/unavailable, and unknown errors to distinct safe no-data states", async () => {
    mocks.getUnifiedCrmCustomer360.mockRejectedValueOnce(Object.assign(new Error("private policy detail"), { code: "CUSTOMER_360_NOT_AUTHORIZED" }));
    const restricted = await renderPage("customer-a");
    mocks.getUnifiedCrmCustomer360.mockRejectedValueOnce(Object.assign(new Error("private flag detail"), { code: "CUSTOMER_360_OFF", leakedCustomer: "Permitted Customer" }));
    const unavailable = await renderPage("customer-a");
    mocks.getUnifiedCrmCustomer360.mockRejectedValueOnce(new Error("private database stack"));
    const error = await renderPage("customer-a");

    expect(restricted).toContain("Customer details aren’t available to you");
    expect(restricted).toContain('role="status"');
    expect(unavailable).toContain("Customer details are temporarily unavailable");
    expect(unavailable).toContain('role="alert"');
    expect(unavailable).toContain("Retry");
    expect(error).toContain("Customer details couldn’t be loaded");
    expect(error).toContain('role="alert"');
    for (const markup of [restricted, unavailable, error]) {
      expect(markup).not.toContain("Permitted Customer");
      expect(markup).not.toContain("private");
    }
  });
});
