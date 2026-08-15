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

  it("does not expose unexpected internal error details", async () => {
    mocks.logUnifiedCrmCustomerNote.mockRejectedValue(new Error("private database detail"));
    const response = await POST(new Request("http://crm.local", { method: "POST", body: JSON.stringify({ body: "Saved." }) }), { params: Promise.resolve({ customerId: "customer-1" }) });

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toMatchObject({
      error: "Customer note could not be recorded right now."
    });
  });
});
