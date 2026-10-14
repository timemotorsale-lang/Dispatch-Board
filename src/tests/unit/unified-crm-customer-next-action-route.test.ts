import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  updateUnifiedCrmCustomerNextAction: vi.fn()
}));

vi.mock("@/server/auth/current-user", () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock("@/server/services/unified-crm-customer-next-action-service", () => ({
  updateUnifiedCrmCustomerNextAction: mocks.updateUnifiedCrmCustomerNextAction
}));

import { POST } from "@/app/api/crm/v1/customers/[customerId]/next-action/route";

describe("Unified CRM customer next action route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue({ id: "manager-1" });
  });

  it("returns 201 for a new next action", async () => {
    mocks.updateUnifiedCrmCustomerNextAction.mockResolvedValue({
      contractVersion: "ucrm.customer-next-action/v1",
      customerId: "customer-1",
      duplicate: false,
      nextActionAt: "2026-08-15T15:00:00.000Z",
      operation: "SET",
      version: 1
    });

    const response = await POST(
      new Request("http://crm.local", { method: "POST", body: JSON.stringify({ operation: "SET" }) }),
      { params: Promise.resolve({ customerId: "customer-1" }) }
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toMatchObject({
      contractVersion: "ucrm.customer-next-action/v1"
    });
  });

  it("returns 200 for an idempotent duplicate", async () => {
    mocks.updateUnifiedCrmCustomerNextAction.mockResolvedValue({
      contractVersion: "ucrm.customer-next-action/v1",
      customerId: "customer-1",
      duplicate: true,
      nextActionAt: "2026-08-15T15:00:00.000Z",
      operation: "SET",
      version: 1
    });

    const response = await POST(
      new Request("http://crm.local", { method: "POST", body: JSON.stringify({ operation: "SET" }) }),
      { params: Promise.resolve({ customerId: "customer-1" }) }
    );

    expect(response.status).toBe(200);
  });

  it("maps stale and owner conflicts to 409", async () => {
    mocks.updateUnifiedCrmCustomerNextAction.mockRejectedValueOnce(
      Object.assign(new Error("The customer next action changed before your update could be applied."), { code: "STALE_NEXT_ACTION" })
    );
    const stale = await POST(
      new Request("http://crm.local", { method: "POST", body: JSON.stringify({ operation: "SET" }) }),
      { params: Promise.resolve({ customerId: "customer-1" }) }
    );
    expect(stale.status).toBe(409);
    await expect(stale.json()).resolves.toMatchObject({
      code: "STALE_NEXT_ACTION",
      contractVersion: "ucrm.customer-next-action-error/v1",
      retryable: false
    });

    mocks.updateUnifiedCrmCustomerNextAction.mockRejectedValueOnce(
      Object.assign(new Error("An assigned customer owner is required before setting a next action."), { code: "CUSTOMER_OWNER_REQUIRED" })
    );
    const owner = await POST(
      new Request("http://crm.local", { method: "POST", body: JSON.stringify({ operation: "SET" }) }),
      { params: Promise.resolve({ customerId: "customer-1" }) }
    );
    expect(owner.status).toBe(409);
    await expect(owner.json()).resolves.toMatchObject({
      code: "CUSTOMER_OWNER_REQUIRED",
      contractVersion: "ucrm.customer-next-action-error/v1",
      retryable: false
    });

    mocks.updateUnifiedCrmCustomerNextAction.mockRejectedValueOnce(
      Object.assign(new Error("There is no active next action to complete."), { code: "NO_ACTIVE_NEXT_ACTION" })
    );
    const none = await POST(
      new Request("http://crm.local", { method: "POST", body: JSON.stringify({ operation: "COMPLETE" }) }),
      { params: Promise.resolve({ customerId: "customer-1" }) }
    );
    expect(none.status).toBe(409);
    await expect(none.json()).resolves.toMatchObject({
      code: "NO_ACTIVE_NEXT_ACTION",
      contractVersion: "ucrm.customer-next-action-error/v1",
      retryable: false
    });
  });

  it("maps unavailable and invalid payloads to safe statuses", async () => {
    mocks.updateUnifiedCrmCustomerNextAction.mockRejectedValueOnce(
      Object.assign(new Error("Customer next action could not be updated safely."), {
        code: "CUSTOMER_SOURCE_UNAVAILABLE",
        retryable: true
      })
    );
    const unavailable = await POST(
      new Request("http://crm.local", { method: "POST", body: JSON.stringify({ operation: "SET" }) }),
      { params: Promise.resolve({ customerId: "customer-1" }) }
    );
    expect(unavailable.status).toBe(503);
    await expect(unavailable.json()).resolves.toMatchObject({
      code: "CUSTOMER_SOURCE_UNAVAILABLE",
      contractVersion: "ucrm.customer-next-action-error/v1",
      retryable: true
    });

    mocks.updateUnifiedCrmCustomerNextAction.mockRejectedValueOnce(
      Object.assign(new Error("Operation is invalid."), { code: "INVALID_NEXT_ACTION_COMMAND" })
    );
    const invalid = await POST(
      new Request("http://crm.local", { method: "POST", body: JSON.stringify({ operation: "nope" }) }),
      { params: Promise.resolve({ customerId: "customer-1" }) }
    );
    expect(invalid.status).toBe(400);
    await expect(invalid.json()).resolves.toMatchObject({
      code: "INVALID_NEXT_ACTION_COMMAND",
      contractVersion: "ucrm.customer-next-action-error/v1",
      retryable: false
    });

    mocks.updateUnifiedCrmCustomerNextAction.mockRejectedValueOnce(
      Object.assign(new Error("Customer next action is temporarily unavailable."), { code: "CUSTOMER_360_OFF" })
    );
    const off = await POST(
      new Request("http://crm.local", { method: "POST", body: JSON.stringify({ operation: "SET" }) }),
      { params: Promise.resolve({ customerId: "customer-1" }) }
    );
    expect(off.status).toBe(503);
    await expect(off.json()).resolves.toMatchObject({
      code: "CUSTOMER_360_OFF",
      contractVersion: "ucrm.customer-next-action-error/v1",
      retryable: false
    });
  });

  it("maps unauthenticated and not-available results without leaking route detail", async () => {
    mocks.updateUnifiedCrmCustomerNextAction.mockRejectedValueOnce(
      Object.assign(new Error("Authentication required."), { code: "AUTHENTICATION_REQUIRED" })
    );
    const unauthenticated = await POST(
      new Request("http://crm.local", { method: "POST", body: JSON.stringify({ operation: "SET" }) }),
      { params: Promise.resolve({ customerId: "customer-1" }) }
    );
    expect(unauthenticated.status).toBe(401);
    await expect(unauthenticated.json()).resolves.toMatchObject({
      code: "AUTHENTICATION_REQUIRED",
      contractVersion: "ucrm.customer-next-action-error/v1",
      retryable: false
    });

    mocks.updateUnifiedCrmCustomerNextAction.mockRejectedValueOnce(
      Object.assign(new Error("Customer details are not available."), { code: "CUSTOMER_NOT_AVAILABLE" })
    );
    const notAvailable = await POST(
      new Request("http://crm.local", { method: "POST", body: JSON.stringify({ operation: "SET" }) }),
      { params: Promise.resolve({ customerId: "customer-1" }) }
    );
    expect(notAvailable.status).toBe(404);
    await expect(notAvailable.json()).resolves.toMatchObject({
      code: "CUSTOMER_NOT_AVAILABLE",
      contractVersion: "ucrm.customer-next-action-error/v1",
      retryable: false
    });

    mocks.updateUnifiedCrmCustomerNextAction.mockRejectedValueOnce(
      Object.assign(new Error("Customer next action is temporarily unavailable."), { code: "CUSTOMER_360_NOT_AUTHORIZED" })
    );
    const denied = await POST(
      new Request("http://crm.local", { method: "POST", body: JSON.stringify({ operation: "SET" }) }),
      { params: Promise.resolve({ customerId: "customer-1" }) }
    );
    expect(denied.status).toBe(403);
    await expect(denied.json()).resolves.toMatchObject({
      code: "CUSTOMER_360_NOT_AUTHORIZED",
      contractVersion: "ucrm.customer-next-action-error/v1",
      retryable: false
    });

    mocks.updateUnifiedCrmCustomerNextAction.mockRejectedValueOnce(
      Object.assign(new Error("Idempotency key was already used with a different next action update."), { code: "IDEMPOTENCY_KEY_REUSED" })
    );
    const duplicateConflict = await POST(
      new Request("http://crm.local", { method: "POST", body: JSON.stringify({ operation: "SET" }) }),
      { params: Promise.resolve({ customerId: "customer-1" }) }
    );
    expect(duplicateConflict.status).toBe(409);
    await expect(duplicateConflict.json()).resolves.toMatchObject({
      code: "IDEMPOTENCY_KEY_REUSED",
      contractVersion: "ucrm.customer-next-action-error/v1",
      retryable: false
    });

    mocks.updateUnifiedCrmCustomerNextAction.mockRejectedValueOnce(
      new Error("unexpected route failure")
    );
    const fallback = await POST(
      new Request("http://crm.local", { method: "POST", body: JSON.stringify({ operation: "SET" }) }),
      { params: Promise.resolve({ customerId: "customer-1" }) }
    );
    expect(fallback.status).toBe(500);
    await expect(fallback.json()).resolves.toMatchObject({
      contractVersion: "ucrm.customer-next-action-error/v1",
      error: "Customer next action could not be updated right now.",
      retryable: false
    });
  });
});
