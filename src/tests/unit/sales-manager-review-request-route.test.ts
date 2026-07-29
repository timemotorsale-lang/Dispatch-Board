import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn()
}));

vi.mock("@/server/auth/current-user", () => ({
  getCurrentUser: mocks.getCurrentUser
}));

import { POST } from "@/app/api/sales/manager-review-requests/route";

const managerUser = {
  duties: {
    all: ["Review manager requests"],
    direct: ["Review manager requests"],
    roleDefaults: ["Review manager requests"]
  },
  email: "manager@local.test",
  id: "manager-1",
  isActive: true,
  name: "Manager User",
  roles: ["Sales Manager"]
};

const validRequest = {
  assignedManagerUserId: "manager-1",
  customerId: "customer-1",
  dealId: "deal-1",
  idempotencyKey: "review-request-1",
  reason: "Please review deal structure before staff follows up.",
  sourceSnapshot: {
    crmRecordId: "crm-1",
    dealRecordId: "deal-1",
    inventoryRecordId: "vehicle-1"
  },
  urgency: "urgent",
  vehicleId: "vehicle-1"
};

function buildRequest(payload: unknown) {
  return new Request("http://localhost/api/sales/manager-review-requests", {
    body: JSON.stringify(payload),
    method: "POST"
  });
}

describe("Sales manager review request route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue(managerUser);
  });

  it("returns guarded foundation-only response without creating live workflow", async () => {
    const response = await POST(buildRequest(validRequest));

    expect(response.status).toBe(501);
    await expect(response.json()).resolves.toMatchObject({
      blocked: true,
      status: "backend-foundation-only",
      workflowLive: false
    });
  });

  it("maps missing auth to 401", async () => {
    mocks.getCurrentUser.mockResolvedValue(null);

    const response = await POST(buildRequest(validRequest));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: "Authentication required."
    });
  });

  it("maps invalid payloads to 400", async () => {
    const response = await POST(buildRequest({ ...validRequest, sourceSnapshot: undefined }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Source snapshot must be an object."
    });
  });
});
