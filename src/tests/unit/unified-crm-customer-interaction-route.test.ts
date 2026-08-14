import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  logUnifiedCrmCustomerInteraction: vi.fn()
}));

vi.mock("@/server/auth/current-user", () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock("@/server/services/unified-crm-customer-interaction-service", () => ({
  logUnifiedCrmCustomerInteraction: mocks.logUnifiedCrmCustomerInteraction
}));

import { POST } from "@/app/api/crm/v1/customers/[customerId]/interactions/route";

describe("Unified CRM customer interaction route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue({ id: "manager-1" });
  });

  it("returns 201 for a new customer interaction", async () => {
    mocks.logUnifiedCrmCustomerInteraction.mockResolvedValue({
      contractVersion: "ucrm.customer-interaction/v1",
      customerId: "customer-1",
      duplicate: false,
      interactionId: "interaction-1",
      occurredAt: "2026-08-14T15:00:00.000Z",
      nextActionAt: null,
      version: 1
    });
    const response = await POST(new Request("http://crm.local", { method: "POST", body: JSON.stringify({ summary: "Confirmed." }) }), { params: Promise.resolve({ customerId: "customer-1" }) });
    expect(response.status).toBe(201);
  });

  it("maps consent and idempotency conflicts to 409", async () => {
    mocks.logUnifiedCrmCustomerInteraction.mockRejectedValue(Object.assign(new Error("Outbound contact requires a confirmed consent state."), { code: "OUTBOUND_CONSENT_REQUIRED" }));
    const response = await POST(new Request("http://crm.local", { method: "POST", body: JSON.stringify({ summary: "Confirmed." }) }), { params: Promise.resolve({ customerId: "customer-1" }) });
    expect(response.status).toBe(409);
  });
});
