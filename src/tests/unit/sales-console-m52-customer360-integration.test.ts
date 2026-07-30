import { describe, expect, it } from "vitest";

import {
  mapSalesCustomer360,
  salesCustomer360Integration,
  salesCustomer360PreservesCrmAuthority
} from "@/features/sales/sales-console-m52-customer360-integration";

describe("Sales Console M52 customer 360 integration", () => {
  it("maps Customer 360 records into sales context", () => {
    const customer = mapSalesCustomer360(
      {
        customerId: "CUST-1",
        displayName: "Samantha Lee",
        preferredContact: "phone",
        consentStatus: "verified",
        activeOpportunityIds: ["SO-1", "SO-2"],
        activeRevenueLanes: ["Inventory BHPH Sale"],
        openCases: [{ caseId: "CASE-1", label: "Proof needed", ownerSystem: "Finance" }],
        timelineSummary: ["Lead created", "Appointment set", "Pay stub requested", "Manager review requested"],
        documentSummary: [{ label: "Pay stub", status: "missing" }],
        promiseSummary: [{ label: "Bring proof of income", dueAt: "2026-07-30T15:00:00.000Z", status: "open" }],
        sourceRoute: "/customers/customer-360?customerId=CUST-1",
        updatedAt: "2026-07-30T12:00:00.000Z"
      },
      new Date("2026-07-30T15:00:00.000Z")
    );

    expect(customer.identityLabel).toBe("Samantha Lee");
    expect(customer.activeOpportunityCount).toBe(2);
    expect(customer.timelinePreview).toHaveLength(3);
    expect(customer.documentsAndPromises).toContain("Pay stub: missing");
  });

  it("keeps CRM/customer writes source-system controlled", () => {
    const customer = mapSalesCustomer360(
      {
        customerId: "CUST-2",
        displayName: "Alex Johnson",
        preferredContact: "unknown",
        consentStatus: "unknown",
        activeOpportunityIds: [],
        activeRevenueLanes: [],
        openCases: [],
        timelineSummary: [],
        documentSummary: [],
        promiseSummary: [],
        sourceRoute: "/customers/customer-360?customerId=CUST-2",
        updatedAt: "2026-07-29T12:00:00.000Z"
      },
      new Date("2026-07-30T15:00:00.000Z")
    );

    expect(salesCustomer360PreservesCrmAuthority(customer)).toBe(true);
    expect(salesCustomer360Integration.governedWrites).toContain("send customer message");
  });
});
