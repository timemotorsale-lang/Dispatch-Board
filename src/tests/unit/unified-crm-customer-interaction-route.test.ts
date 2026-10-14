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

  it("maps a typed invalid command to a safe 400 response", async () => {
    mocks.logUnifiedCrmCustomerInteraction.mockRejectedValue(Object.assign(new Error("Summary is required."), { code: "INVALID_INTERACTION_COMMAND" }));
    const response = await POST(new Request("http://crm.local", { method: "POST", body: JSON.stringify({}) }), { params: Promise.resolve({ customerId: "customer-1" }) });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      code: "INVALID_INTERACTION_COMMAND",
      contractVersion: "ucrm.customer-interaction-error/v1",
      error: "Summary is required.",
      retryable: false
    });
  });

  it("maps authentication, authorization, hidden-subject, and feature-off states fail-closed", async () => {
    mocks.logUnifiedCrmCustomerInteraction.mockRejectedValueOnce(
      Object.assign(new Error("Authentication required."), { code: "AUTHENTICATION_REQUIRED" })
    );
    const unauthenticated = await POST(
      new Request("http://crm.local", { method: "POST", body: JSON.stringify({ summary: "Confirmed." }) }),
      { params: Promise.resolve({ customerId: "customer-1" }) }
    );
    expect(unauthenticated.status).toBe(401);

    mocks.logUnifiedCrmCustomerInteraction.mockRejectedValueOnce(
      Object.assign(new Error("Customer 360 is not authorized for this viewer."), { code: "CUSTOMER_360_NOT_AUTHORIZED" })
    );
    const forbidden = await POST(
      new Request("http://crm.local", { method: "POST", body: JSON.stringify({ summary: "Confirmed." }) }),
      { params: Promise.resolve({ customerId: "customer-1" }) }
    );
    expect(forbidden.status).toBe(403);

    mocks.logUnifiedCrmCustomerInteraction.mockRejectedValueOnce(
      Object.assign(new Error("Customer is not available."), { code: "CUSTOMER_NOT_AVAILABLE" })
    );
    const hidden = await POST(
      new Request("http://crm.local", { method: "POST", body: JSON.stringify({ summary: "Confirmed." }) }),
      { params: Promise.resolve({ customerId: "customer-1" }) }
    );
    expect(hidden.status).toBe(404);

    mocks.logUnifiedCrmCustomerInteraction.mockRejectedValueOnce(
      Object.assign(new Error("CRM customer interaction is unavailable right now."), { code: "CUSTOMER_SOURCE_UNAVAILABLE" })
    );
    const unavailable = await POST(
      new Request("http://crm.local", { method: "POST", body: JSON.stringify({ summary: "Confirmed." }) }),
      { params: Promise.resolve({ customerId: "customer-1" }) }
    );
    expect(unavailable.status).toBe(503);
  });

  it("returns 200 for an idempotent replay", async () => {
    mocks.logUnifiedCrmCustomerInteraction.mockResolvedValue({
      contractVersion: "ucrm.customer-interaction/v1",
      customerId: "customer-1",
      duplicate: true,
      interactionId: "interaction-1",
      occurredAt: "2026-08-14T15:00:00.000Z",
      nextActionAt: null,
      version: 1
    });
    const response = await POST(new Request("http://crm.local", { method: "POST", body: JSON.stringify({ summary: "Confirmed." }) }), { params: Promise.resolve({ customerId: "customer-1" }) });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ duplicate: true, interactionId: "interaction-1" });
  });

  it("does not serialize unexpected backend error text", async () => {
    mocks.logUnifiedCrmCustomerInteraction.mockRejectedValue(new Error("private database connection detail"));
    const response = await POST(new Request("http://crm.local", { method: "POST", body: JSON.stringify({ summary: "Confirmed." }) }), { params: Promise.resolve({ customerId: "customer-1" }) });
    const payload = await response.json();

    expect(response.status).toBe(500);
    expect(JSON.stringify(payload)).not.toContain("private database connection detail");
    expect(payload).toMatchObject({
      contractVersion: "ucrm.customer-interaction-error/v1",
      error: "Unable to record the customer interaction right now.",
      retryable: false
    });
    expect(payload.code).toBeUndefined();
  });
});
