import { describe, expect, it, vi } from "vitest";

const actor = {
  id: "manager-1",
  name: "Manager One",
  email: "manager@example.test",
  isActive: true,
  roles: ["General Manager"],
  duties: { all: [], direct: [], roleDefaults: [] }
};

const mocks = vi.hoisted(() => ({
  getUnifiedCrmCustomerDuplicateCandidates: vi.fn()
}));

vi.mock("@/server/auth/current-user", () => ({ getCurrentUser: vi.fn(async () => actor) }));
vi.mock("@/server/services/unified-crm-customer-duplicate-candidate-service", () => mocks);

import { GET } from "@/app/api/crm/v1/customers/[customerId]/duplicate-candidates/route";

describe("Unified CRM customer duplicate candidate route", () => {
  it("passes normalized query intent to the duplicate warning service", async () => {
    mocks.getUnifiedCrmCustomerDuplicateCandidates.mockResolvedValueOnce({
      contractVersion: "ucrm.customer-duplicate-candidates/v1",
      state: "WARNING",
      warningOnly: true
    });

    const response = await GET(new Request("http://localhost/api/crm/v1/customers/customer-1/duplicate-candidates?displayName=Maria&email=maria@example.test&phoneNumber=6125551234"), {
      params: Promise.resolve({ customerId: "customer-1" })
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ state: "WARNING", warningOnly: true });
    expect(mocks.getUnifiedCrmCustomerDuplicateCandidates).toHaveBeenCalledWith(actor, "customer-1", {
      displayName: "Maria",
      email: "maria@example.test",
      phoneNumber: "6125551234"
    });
  });

  it("maps typed authorization errors safely", async () => {
    mocks.getUnifiedCrmCustomerDuplicateCandidates.mockRejectedValueOnce(Object.assign(new Error("Customer duplicate warning is not available for this viewer."), {
      code: "CUSTOMER_DUPLICATE_WARNING_NOT_AUTHORIZED"
    }));

    const response = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ customerId: "customer-1" })
    });

    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({
      code: "CUSTOMER_DUPLICATE_WARNING_NOT_AUTHORIZED",
      contractVersion: "ucrm.customer-duplicate-candidates-error/v1"
    });
  });
});
