import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  submitCompletedSaleRecord: vi.fn()
}));

vi.mock("@/server/auth/current-user", () => ({
  getCurrentUser: mocks.getCurrentUser
}));

vi.mock("@/server/sales/completed-sale-record-service", () => ({
  submitCompletedSaleRecord: mocks.submitCompletedSaleRecord
}));

import { POST } from "@/app/api/sales/completed-sale-records/route";
import { EnterpriseCommandConflictError } from "@/server/enterprise-command/domain";

const managerUser = {
  duties: {
    all: ["Record completed sales"],
    direct: ["Record completed sales"],
    roleDefaults: ["Record completed sales"]
  },
  email: "manager@local.test",
  id: "manager-1",
  isActive: true,
  name: "Manager User",
  roles: ["Sales Manager"]
};

const validRequest = {
  customerId: "customer-1",
  customerName: "John Smith",
  evidenceIds: ["evidence-1"],
  grossEstimateCents: 285000,
  idempotencyKey: "completed-sale-1",
  paymentPath: "cash",
  productLabel: "2022 Toyota RAV4 XLE",
  reason: "Record completed sale packet after staff verified source evidence.",
  revenueLane: "Inventory Cash Sale",
  revenueOpportunityId: "revenue-1",
  saleDate: "2026-07-30",
  salesOpportunityId: "sales-1",
  salespersonId: "salesperson-1",
  satisfied: ["customer-linked", "evidence-attached"],
  sourceRecordLinks: ["/customers/customer-360?customerId=customer-1"]
};

function buildRequest(payload: unknown) {
  return new Request("http://localhost/api/sales/completed-sale-records", {
    body: JSON.stringify(payload),
    method: "POST"
  });
}

describe("completed sale record route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue(managerUser);
    mocks.submitCompletedSaleRecord.mockResolvedValue({
      auditEventId: "audit-1",
      commandId: "command-1",
      correlationId: "corr-1",
      duplicate: false,
      guardrails: ["Only Sales Console-owned completed-sale records"],
      idempotencyKey: "completed-sale-1",
      saleRecord: {
        id: "command-1",
        customerId: "customer-1",
        customerName: "John Smith",
        grossEstimateCents: 285000,
        productLabel: "2022 Toyota RAV4 XLE",
        reconciliationStatus: "pending",
        revenueLane: "Inventory Cash Sale",
        saleDate: "2026-07-30",
        sourceRecordLinks: ["/customers/customer-360?customerId=customer-1"]
      },
      status: "created",
      workflowLive: true
    });
  });

  it("returns created response for a new internal completed-sale record", async () => {
    const response = await POST(buildRequest(validRequest));

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toMatchObject({
      saleRecord: {
        id: "command-1"
      },
      status: "created",
      workflowLive: true
    });
    expect(mocks.submitCompletedSaleRecord).toHaveBeenCalledWith(managerUser, validRequest);
  });

  it("returns 200 for duplicate idempotent replay", async () => {
    mocks.submitCompletedSaleRecord.mockResolvedValue({
      duplicate: true,
      saleRecord: { id: "command-1" },
      status: "duplicate",
      workflowLive: true
    });

    const response = await POST(buildRequest(validRequest));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ duplicate: true, status: "duplicate" });
  });

  it("maps auth errors to 401", async () => {
    mocks.submitCompletedSaleRecord.mockRejectedValue(new Error("Authentication required."));

    const response = await POST(buildRequest(validRequest));

    expect(response.status).toBe(401);
  });

  it("maps validation errors to 400", async () => {
    mocks.submitCompletedSaleRecord.mockRejectedValue(new Error("Evidence IDs must be a list of strings."));

    const response = await POST(buildRequest({ ...validRequest, evidenceIds: undefined }));

    expect(response.status).toBe(400);
  });

  it("maps idempotency conflicts to 409", async () => {
    mocks.submitCompletedSaleRecord.mockRejectedValue(
      new EnterpriseCommandConflictError(
        "Idempotency key was already used with a different completed-sale request.",
        "IDEMPOTENCY_KEY_REUSED"
      )
    );

    const response = await POST(buildRequest(validRequest));

    expect(response.status).toBe(409);
  });
});
