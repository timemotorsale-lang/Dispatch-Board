import { describe, expect, it } from "vitest";

import type { AuthenticatedUser } from "@/server/auth/store";
import {
  salesManagerReviewRequestServiceBlocksWrites,
  salesManagerReviewRequestServiceReturnsFoundationOnlyStatus,
  submitSalesManagerReviewRequest
} from "@/server/sales/manager-review-request-service";

const managerUser: AuthenticatedUser = {
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
  urgency: "normal",
  vehicleId: "vehicle-1"
};

describe("Sales manager review request service", () => {
  it("requires an authenticated user", () => {
    expect(() => submitSalesManagerReviewRequest(null, validRequest)).toThrow("Authentication required.");
  });

  it("returns a blocked backend-foundation-only result for valid requests", () => {
    const result = submitSalesManagerReviewRequest(managerUser, validRequest);

    expect(result).toMatchObject({
      blocked: true,
      reason: "Dedicated audited manager-review persistence is not enabled yet.",
      status: "backend-foundation-only",
      workflowLive: false
    });
    expect(result.guardrails).toContain("No task creation");
  });

  it("keeps writes blocked even when validation succeeds", () => {
    expect(salesManagerReviewRequestServiceBlocksWrites()).toBe(true);
    expect(salesManagerReviewRequestServiceReturnsFoundationOnlyStatus(managerUser, validRequest)).toBe(true);
  });
});
