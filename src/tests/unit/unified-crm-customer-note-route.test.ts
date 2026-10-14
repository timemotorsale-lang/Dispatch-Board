import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  logUnifiedCrmCustomerNote: vi.fn()
}));

vi.mock("@/server/auth/current-user", () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock("@/server/services/unified-crm-customer-note-service", () => ({
  logUnifiedCrmCustomerNote: mocks.logUnifiedCrmCustomerNote
}));

import { POST } from "@/app/api/crm/v1/customers/[customerId]/notes/route";

describe("Unified CRM customer note route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue({ id: "manager-1" });
  });

  it("returns 201 for a new customer note", async () => {
    mocks.logUnifiedCrmCustomerNote.mockResolvedValue({
      contractVersion: "ucrm.customer-note/v1",
      customerId: "customer-1",
      duplicate: false,
      noteId: "note-1",
      version: 1,
      visibility: "INTERNAL"
    });
    const response = await POST(new Request("http://crm.local", { method: "POST", body: JSON.stringify({ body: "Saved." }) }), { params: Promise.resolve({ customerId: "customer-1" }) });
    expect(response.status).toBe(201);
  });

  it("maps restricted note authorization to 403", async () => {
    mocks.logUnifiedCrmCustomerNote.mockRejectedValue(Object.assign(new Error("Restricted notes are not available for this viewer."), { code: "RESTRICTED_NOTE_NOT_AUTHORIZED" }));
    const response = await POST(new Request("http://crm.local", { method: "POST", body: JSON.stringify({ body: "Saved." }) }), { params: Promise.resolve({ customerId: "customer-1" }) });
    expect(response.status).toBe(403);
  });

  it("maps invalid note commands to 400", async () => {
    mocks.logUnifiedCrmCustomerNote.mockRejectedValue(Object.assign(new Error("Customer identifier is invalid."), { code: "INVALID_NOTE_COMMAND" }));
    const response = await POST(new Request("http://crm.local", { method: "POST", body: JSON.stringify({ body: "Saved." }) }), { params: Promise.resolve({ customerId: "customer-1" }) });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: "Customer identifier is invalid.",
      code: "INVALID_NOTE_COMMAND"
    });
  });

  it("returns 200 for an idempotent note replay", async () => {
    mocks.logUnifiedCrmCustomerNote.mockResolvedValue({
      contractVersion: "ucrm.customer-note/v1",
      customerId: "customer-1",
      duplicate: true,
      noteId: "note-1",
      version: 1,
      visibility: "INTERNAL"
    });
    const response = await POST(
      new Request("http://crm.local", { method: "POST", body: JSON.stringify({ body: "Saved." }) }),
      { params: Promise.resolve({ customerId: "customer-1" }) }
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ duplicate: true, noteId: "note-1" });
  });

  it("maps authentication, customer hiding, idempotency conflict, and feature-off states safely", async () => {
    mocks.logUnifiedCrmCustomerNote.mockRejectedValueOnce(
      Object.assign(new Error("Authentication required."), { code: "AUTHENTICATION_REQUIRED" })
    );
    const unauthenticated = await POST(
      new Request("http://crm.local", { method: "POST", body: JSON.stringify({ body: "Saved." }) }),
      { params: Promise.resolve({ customerId: "customer-1" }) }
    );
    expect(unauthenticated.status).toBe(401);

    mocks.logUnifiedCrmCustomerNote.mockRejectedValueOnce(
      Object.assign(new Error("Customer is not available."), { code: "CUSTOMER_NOT_AVAILABLE" })
    );
    const hidden = await POST(
      new Request("http://crm.local", { method: "POST", body: JSON.stringify({ body: "Saved." }) }),
      { params: Promise.resolve({ customerId: "customer-1" }) }
    );
    expect(hidden.status).toBe(404);

    mocks.logUnifiedCrmCustomerNote.mockRejectedValueOnce(
      Object.assign(new Error("Idempotency key was already used."), { code: "IDEMPOTENCY_KEY_REUSED" })
    );
    const conflict = await POST(
      new Request("http://crm.local", { method: "POST", body: JSON.stringify({ body: "Saved." }) }),
      { params: Promise.resolve({ customerId: "customer-1" }) }
    );
    expect(conflict.status).toBe(409);

    mocks.logUnifiedCrmCustomerNote.mockRejectedValueOnce(
      Object.assign(new Error("CRM customer note capture is unavailable right now."), { code: "CUSTOMER_SOURCE_UNAVAILABLE" })
    );
    const unavailable = await POST(
      new Request("http://crm.local", { method: "POST", body: JSON.stringify({ body: "Saved." }) }),
      { params: Promise.resolve({ customerId: "customer-1" }) }
    );
    expect(unavailable.status).toBe(503);
  });

  it("does not expose unexpected internal error details", async () => {
    mocks.logUnifiedCrmCustomerNote.mockRejectedValue(new Error("private database detail"));
    const response = await POST(new Request("http://crm.local", { method: "POST", body: JSON.stringify({ body: "Saved." }) }), { params: Promise.resolve({ customerId: "customer-1" }) });

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toMatchObject({
      error: "Customer note could not be recorded right now."
    });
  });
});
