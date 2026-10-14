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
  updateUnifiedCrmCustomerControlledEdit: vi.fn()
}));

vi.mock("@/server/auth/current-user", () => ({ getCurrentUser: vi.fn(async () => actor) }));
vi.mock("@/server/services/unified-crm-customer-controlled-edit-service", () => mocks);

import { PATCH } from "@/app/api/crm/v1/customers/[customerId]/edit/route";

describe("Unified CRM customer controlled edit route", () => {
  it("returns 201 for a new controlled edit and 200 for idempotent replay", async () => {
    mocks.updateUnifiedCrmCustomerControlledEdit
      .mockResolvedValueOnce({ contractVersion: "ucrm.customer-controlled-edit/v1", customerId: "customer-1", duplicate: false })
      .mockResolvedValueOnce({ contractVersion: "ucrm.customer-controlled-edit/v1", customerId: "customer-1", duplicate: true });

    const request = new Request("http://localhost/api/crm/v1/customers/customer-1/edit", {
      body: JSON.stringify({ displayName: "Maria Lane", expectedVersion: 1, idempotencyKey: "edit-1", reason: "Correct spelling" }),
      method: "PATCH"
    });

    const first = await PATCH(request, { params: Promise.resolve({ customerId: "customer-1" }) });
    const second = await PATCH(request, { params: Promise.resolve({ customerId: "customer-1" }) });

    expect(first.status).toBe(201);
    expect(second.status).toBe(200);
    expect(mocks.updateUnifiedCrmCustomerControlledEdit).toHaveBeenCalledWith(actor, "customer-1", expect.objectContaining({ displayName: "Maria Lane" }));
  });

  it("maps stale version errors to conflict", async () => {
    mocks.updateUnifiedCrmCustomerControlledEdit.mockRejectedValueOnce(Object.assign(new Error("Customer record changed before this edit could be saved."), {
      code: "STALE_CUSTOMER_VERSION"
    }));

    const response = await PATCH(new Request("http://localhost", { body: "{}", method: "PATCH" }), {
      params: Promise.resolve({ customerId: "customer-1" })
    });

    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({
      code: "STALE_CUSTOMER_VERSION",
      contractVersion: "ucrm.customer-controlled-edit-error/v1"
    });
  });
});
