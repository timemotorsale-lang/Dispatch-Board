import { describe, expect, it, vi } from "vitest";

const actor = {
  id: "manager-1",
  name: "Manager One",
  email: "manager@example.test",
  isActive: true,
  roles: ["General Manager"],
  duties: { direct: [], roleDefaults: [], all: [] }
};

const mocks = vi.hoisted(() => ({
  decideUnifiedCrmCommercialApproval: vi.fn(),
  requestUnifiedCrmCommercialApproval: vi.fn()
}));

vi.mock("@/server/auth/current-user", () => ({ requireCurrentUser: vi.fn(async () => actor) }));
vi.mock("@/server/services/unified-crm-commercial-approval-service", () => ({
  decideUnifiedCrmCommercialApproval: mocks.decideUnifiedCrmCommercialApproval,
  requestUnifiedCrmCommercialApproval: mocks.requestUnifiedCrmCommercialApproval
}));

import { POST as decideApproval } from "@/app/api/crm/v1/commercial-approvals/[requestId]/decision/route";
import { POST as requestApproval } from "@/app/api/crm/v1/quotes/[quoteId]/commercial-approvals/route";

describe("Unified CRM commercial approval routes", () => {
  it("returns 201 for request and decision commands", async () => {
    mocks.requestUnifiedCrmCommercialApproval.mockResolvedValueOnce({
      amountCents: 52500,
      contractVersion: "ucrm.commercial-approval/v1",
      decision: null,
      discountCents: 2500,
      duplicate: false,
      purpose: "Manager approval",
      quoteId: "quote-1",
      quoteNumber: "Q-1",
      quoteVersionNumber: 1,
      requestId: "approval-1",
      requestedByUserId: "seller-1",
      status: "PENDING",
      version: 1
    });
    mocks.decideUnifiedCrmCommercialApproval.mockResolvedValueOnce({
      amountCents: 52500,
      contractVersion: "ucrm.commercial-approval/v1",
      decision: "APPROVED",
      discountCents: 2500,
      duplicate: false,
      purpose: "Manager approval",
      quoteId: "quote-1",
      quoteNumber: "Q-1",
      quoteVersionNumber: 1,
      requestId: "approval-1",
      requestedByUserId: "seller-1",
      status: "APPROVED",
      version: 2
    });

    const requestResponse = await requestApproval(new Request("http://crm.local", {
      body: JSON.stringify({}),
      method: "POST"
    }), { params: Promise.resolve({ quoteId: "quote-1" }) });
    const decisionResponse = await decideApproval(new Request("http://crm.local", {
      body: JSON.stringify({}),
      method: "POST"
    }), { params: Promise.resolve({ requestId: "approval-1" }) });

    expect(requestResponse.status).toBe(201);
    expect(decisionResponse.status).toBe(201);
    expect(mocks.requestUnifiedCrmCommercialApproval).toHaveBeenCalledWith(actor, "quote-1", {});
    expect(mocks.decideUnifiedCrmCommercialApproval).toHaveBeenCalledWith(actor, "approval-1", {});
  });

  it("maps typed commercial approval errors safely", async () => {
    mocks.requestUnifiedCrmCommercialApproval.mockRejectedValueOnce(Object.assign(new Error("No self approval"), {
      code: "SELF_APPROVAL_NOT_ALLOWED",
      retryable: false
    }));

    const response = await requestApproval(new Request("http://crm.local", {
      body: JSON.stringify({}),
      method: "POST"
    }), { params: Promise.resolve({ quoteId: "quote-1" }) });
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body).toMatchObject({
      code: "SELF_APPROVAL_NOT_ALLOWED",
      contractVersion: "ucrm.commercial-approval-error/v1",
      error: "No self approval",
      retryable: false
    });
  });
});
