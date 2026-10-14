import { describe, expect, it } from "vitest";

import {
  normalizeSalesManagerReviewRequest,
  salesManagerReviewRequestValidationBlocksMissingBackendFields,
  salesManagerReviewRequestValidationRequiresSourceSnapshot
} from "@/server/sales/manager-review-request-validation";

const validRequest = {
  assignedManagerUserId: " manager-1 ",
  customerId: " customer-1 ",
  dealId: " deal-1 ",
  idempotencyKey: " request-123 ",
  reason: " Needs manager review before customer follow-up. ",
  sourceSnapshot: {
    crmRecordId: "crm-1",
    inventoryStockNumber: "A123"
  },
  urgency: " HIGH ",
  vehicleId: " vehicle-1 "
};

describe("Sales manager review request validation", () => {
  it("normalizes the required backend payload without creating a workflow", () => {
    const normalized = normalizeSalesManagerReviewRequest(validRequest);

    expect(normalized).toMatchObject({
      assignedManagerUserId: "manager-1",
      customerId: "customer-1",
      dealId: "deal-1",
      idempotencyKey: "request-123",
      reason: "Needs manager review before customer follow-up.",
      urgency: "high",
      vehicleId: "vehicle-1"
    });
    expect(normalized.sourceSnapshot).toEqual(validRequest.sourceSnapshot);
  });

  it("blocks invalid urgency values", () => {
    expect(() => normalizeSalesManagerReviewRequest({ ...validRequest, urgency: "soon" })).toThrow(
      "Urgency must be normal, high, or urgent."
    );
  });

  it("requires source snapshot context", () => {
    expect(salesManagerReviewRequestValidationRequiresSourceSnapshot(validRequest)).toBe(true);
    expect(
      salesManagerReviewRequestValidationRequiresSourceSnapshot({
        ...validRequest,
        sourceSnapshot: undefined
      })
    ).toBe(false);
  });

  it("blocks missing backend fields", () => {
    expect(salesManagerReviewRequestValidationBlocksMissingBackendFields()).toBe(true);
  });
});
