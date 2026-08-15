import { describe, expect, it } from "vitest";

import {
  normalizeUnifiedCrmOpportunityBridgeRequest,
  normalizeUnifiedCrmOpportunityId,
  normalizeUnifiedCrmOpportunitySourceReference
} from "@/server/validation/unified-crm-opportunity";

describe("Unified CRM opportunity validation", () => {
  it("normalizes a safe opportunity id and source reference", () => {
    expect(normalizeUnifiedCrmOpportunityId("opp_123456")).toBe("opp_123456");
    expect(normalizeUnifiedCrmOpportunitySourceReference({
      sourceType: "CUSTOMER_LEAD",
      sourceRecordId: "lead-1",
      customerId: "customer-1",
      organizationId: "org-a",
      ownerUserId: "seller-1"
    })).toEqual({
      sourceType: "CUSTOMER_LEAD",
      sourceRecordId: "lead-1",
      customerId: "customer-1",
      organizationId: "org-a",
      ownerUserId: "seller-1"
    });
  });

  it("builds a normalized bridge envelope and rejects invalid input", () => {
    expect(normalizeUnifiedCrmOpportunityBridgeRequest({
      correlationId: "corr-1",
      expectedVersion: 0,
      idempotencyKey: "idem-1",
      opportunityId: "opp_123456",
      organizationId: "org-a",
      purpose: "Create a governed appointment draft.",
      source: null
    })).toMatchObject({
      contractVersion: "ucrm.opportunity/v1",
      opportunityId: "opp_123456",
      organizationId: "org-a"
    });

    expect(() => normalizeUnifiedCrmOpportunityId("bad id")).toThrow("Opportunity identifier is invalid.");
    expect(() => normalizeUnifiedCrmOpportunitySourceReference({ sourceType: "LEAD" })).toThrow("Source reference type is invalid.");
    expect(() => normalizeUnifiedCrmOpportunityBridgeRequest({ opportunityId: "opp_123456" })).toThrow("Correlation id is required.");
  });
});
