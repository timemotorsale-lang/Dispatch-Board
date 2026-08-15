import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createUnifiedCrmCustomerTaskBridge: vi.fn(),
  getCurrentUser: vi.fn()
}));

vi.mock("@/server/auth/current-user", () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock("@/server/services/unified-crm-customer-task-bridge-service", () => ({
  createUnifiedCrmCustomerTaskBridge: mocks.createUnifiedCrmCustomerTaskBridge
}));

import { POST } from "@/app/api/crm/v1/customers/[customerId]/tasks/route";

describe("Unified CRM customer task bridge route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue({ id: "manager-1" });
  });

  it("returns 201 for a new governed task", async () => {
    mocks.createUnifiedCrmCustomerTaskBridge.mockResolvedValue({
      contractVersion: "ucrm.customer-task-bridge/v1",
      customerId: "customer-1",
      duplicate: false,
      task: {
        dueAt: "2026-08-15T15:00:00.000Z",
        href: "/tasks/task-1",
        id: "task-1",
        title: "Follow up with Alex Morgan"
      }
    });

    const response = await POST(
      new Request("http://crm.local", { method: "POST", body: JSON.stringify({ title: "Follow up with Alex Morgan" }) }),
      { params: Promise.resolve({ customerId: "customer-1" }) }
    );

    expect(response.status).toBe(201);
  });

  it("returns 200 for an idempotent duplicate", async () => {
    mocks.createUnifiedCrmCustomerTaskBridge.mockResolvedValue({
      contractVersion: "ucrm.customer-task-bridge/v1",
      customerId: "customer-1",
      duplicate: true,
      task: {
        dueAt: "2026-08-15T15:00:00.000Z",
        href: "/tasks/task-1",
        id: "task-1",
        title: "Follow up with Alex Morgan"
      }
    });

    const response = await POST(
      new Request("http://crm.local", { method: "POST", body: JSON.stringify({ title: "Follow up with Alex Morgan" }) }),
      { params: Promise.resolve({ customerId: "customer-1" }) }
    );

    expect(response.status).toBe(200);
  });

  it("maps validation, conflict, and unavailable statuses safely", async () => {
    mocks.createUnifiedCrmCustomerTaskBridge.mockRejectedValueOnce(
      Object.assign(new Error("Brief is required."), { code: "INVALID_TASK_BRIDGE_COMMAND" })
    );
    const invalid = await POST(
      new Request("http://crm.local", { method: "POST", body: JSON.stringify({ title: "x" }) }),
      { params: Promise.resolve({ customerId: "customer-1" }) }
    );
    expect(invalid.status).toBe(400);

    mocks.createUnifiedCrmCustomerTaskBridge.mockRejectedValueOnce(
      Object.assign(new Error("Idempotency key was already used with a different CRM task handoff."), { code: "IDEMPOTENCY_KEY_REUSED" })
    );
    const conflict = await POST(
      new Request("http://crm.local", { method: "POST", body: JSON.stringify({ title: "x" }) }),
      { params: Promise.resolve({ customerId: "customer-1" }) }
    );
    expect(conflict.status).toBe(409);

    mocks.createUnifiedCrmCustomerTaskBridge.mockRejectedValueOnce(
      Object.assign(new Error("CRM task handoff could not be completed safely."), { code: "TASK_SOURCE_UNAVAILABLE" })
    );
    const unavailable = await POST(
      new Request("http://crm.local", { method: "POST", body: JSON.stringify({ title: "x" }) }),
      { params: Promise.resolve({ customerId: "customer-1" }) }
    );
    expect(unavailable.status).toBe(503);
  });

  it("maps authentication, subject hiding, organization ambiguity, and unknown failures fail-closed", async () => {
    mocks.createUnifiedCrmCustomerTaskBridge.mockRejectedValueOnce(
      Object.assign(new Error("Authentication required."), { code: "AUTHENTICATION_REQUIRED" })
    );
    const unauthenticated = await POST(
      new Request("http://crm.local", { method: "POST", body: JSON.stringify({ title: "x" }) }),
      { params: Promise.resolve({ customerId: "customer-1" }) }
    );
    expect(unauthenticated.status).toBe(401);

    mocks.createUnifiedCrmCustomerTaskBridge.mockRejectedValueOnce(
      Object.assign(new Error("Customer is not available."), { code: "CUSTOMER_NOT_AVAILABLE" })
    );
    const notAvailable = await POST(
      new Request("http://crm.local", { method: "POST", body: JSON.stringify({ title: "x" }) }),
      { params: Promise.resolve({ customerId: "customer-1" }) }
    );
    expect(notAvailable.status).toBe(404);

    mocks.createUnifiedCrmCustomerTaskBridge.mockRejectedValueOnce(
      Object.assign(new Error("Select one authorized organization before creating a CRM task."), { code: "ORGANIZATION_SCOPE_AMBIGUOUS" })
    );
    const ambiguous = await POST(
      new Request("http://crm.local", { method: "POST", body: JSON.stringify({ title: "x" }) }),
      { params: Promise.resolve({ customerId: "customer-1" }) }
    );
    expect(ambiguous.status).toBe(409);

    mocks.createUnifiedCrmCustomerTaskBridge.mockRejectedValueOnce(
      new Error("unexpected route failure")
    );
    const fallback = await POST(
      new Request("http://crm.local", { method: "POST", body: JSON.stringify({ title: "x" }) }),
      { params: Promise.resolve({ customerId: "customer-1" }) }
    );
    expect(fallback.status).toBe(500);
  });
});
