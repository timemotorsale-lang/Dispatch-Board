import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  submitSalesManagerReviewRequest: vi.fn()
}));

vi.mock("@/server/auth/current-user", () => ({
  getCurrentUser: mocks.getCurrentUser
}));

vi.mock("@/server/sales/manager-review-request-service", () => ({
  submitSalesManagerReviewRequest: mocks.submitSalesManagerReviewRequest
}));

import { POST } from "@/app/api/sales/manager-review-requests/route";
import { EnterpriseCommandConflictError } from "@/server/enterprise-command/domain";

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
    mocks.submitSalesManagerReviewRequest.mockResolvedValue({
      auditEventId: "audit-1",
      commandId: "command-1",
      correlationId: "corr-1",
      duplicate: false,
      guardrails: ["Only audited Manager Review task creation"],
      idempotencyKey: "review-request-1",
      status: "created",
      task: {
        id: "task-1",
        title: "Manager review requested for deal deal-1"
      },
      workflowLive: true
    });
  });

  it("returns created response for a new audited manager-review task", async () => {
    const response = await POST(buildRequest(validRequest));

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toMatchObject({
      status: "created",
      task: {
        id: "task-1"
      },
      workflowLive: true
    });
    expect(mocks.submitSalesManagerReviewRequest).toHaveBeenCalledWith(managerUser, validRequest);
  });

  it("returns 200 for an idempotent duplicate retry", async () => {
    mocks.submitSalesManagerReviewRequest.mockResolvedValue({
      auditEventId: "audit-1",
      commandId: "command-1",
      correlationId: "corr-1",
      duplicate: true,
      guardrails: ["Only audited Manager Review task creation"],
      idempotencyKey: "review-request-1",
      status: "duplicate",
      task: {
        id: "task-1",
        title: "Manager review requested for deal deal-1"
      },
      workflowLive: true
    });

    const response = await POST(buildRequest(validRequest));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      duplicate: true,
      status: "duplicate"
    });
  });

  it("maps missing auth to 401", async () => {
    mocks.submitSalesManagerReviewRequest.mockRejectedValue(new Error("Authentication required."));

    const response = await POST(buildRequest(validRequest));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: "Authentication required."
    });
  });

  it("maps invalid payloads to 400", async () => {
    mocks.submitSalesManagerReviewRequest.mockRejectedValue(new Error("Source snapshot must be an object."));

    const response = await POST(buildRequest({ ...validRequest, sourceSnapshot: undefined }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Source snapshot must be an object."
    });
  });

  it("maps idempotency conflicts to 409", async () => {
    mocks.submitSalesManagerReviewRequest.mockRejectedValue(
      new EnterpriseCommandConflictError(
        "Idempotency key was already used with a different request.",
        "IDEMPOTENCY_KEY_REUSED"
      )
    );

    const response = await POST(buildRequest(validRequest));

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      error: "Idempotency key was already used with a different request."
    });
  });
});
