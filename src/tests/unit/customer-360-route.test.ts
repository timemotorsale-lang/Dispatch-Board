import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  getCustomer360ReadModel: vi.fn()
}));

vi.mock("@/server/auth/current-user", () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock("@/server/services/customer-console-read-service", () => ({
  getCustomer360ReadModel: mocks.getCustomer360ReadModel
}));

import { GET } from "@/app/api/customers/customer-360/route";

describe("Customers Customer 360 route", () => {
  beforeEach(() => vi.clearAllMocks());

  it("loads the Customers source read model without requiring the Unified CRM master flag", async () => {
    mocks.getCurrentUser.mockResolvedValue({ id: "manager-1", name: "Manager" });
    mocks.getCustomer360ReadModel.mockResolvedValue({
      customer: { id: "customer-1", name: "Ahmed H." },
      panel: { title: "Communications", items: [] }
    });

    const response = await GET(new Request("http://localhost/api/customers/customer-360?tab=communications&customerId=customer-1"));

    expect(response.status).toBe(200);
    expect(mocks.getCustomer360ReadModel).toHaveBeenCalledWith(
      { id: "manager-1", name: "Manager" },
      { tab: "communications", customerId: "customer-1" }
    );
    await expect(response.json()).resolves.toMatchObject({
      customer: { id: "customer-1", name: "Ahmed H." },
      panel: { title: "Communications" }
    });
  });

  it("maps authentication and missing customer failures without leaking backend detail", async () => {
    mocks.getCurrentUser.mockResolvedValue(null);
    mocks.getCustomer360ReadModel.mockRejectedValueOnce(new Error("Authentication required."));
    const unauthorized = await GET(new Request("http://localhost/api/customers/customer-360?tab=overview"));
    expect(unauthorized.status).toBe(401);

    mocks.getCustomer360ReadModel.mockRejectedValueOnce(new Error("Customer not found."));
    const missing = await GET(new Request("http://localhost/api/customers/customer-360?tab=overview&customerId=missing"));
    expect(missing.status).toBe(404);
  });
});
