import { describe, expect, it } from "vitest";

import {
  commandMutatesOnlySalesConsoleInternal,
  hasRequiredAuditMetadata,
  isApprovedSalesConsoleCommand,
  prohibitedSalesConsoleCommandNames,
  salesConsoleLifecycleCoversRecordExecution,
  salesConsoleLifecycleStates,
  salesConsoleRecordDomainCoversEnterpriseRecords,
  salesConsoleRecordOwners,
  salesConsoleRecordTypes,
  salesConsoleSourceSystemsRemainOwners,
  type RecordCompletedSale,
  type SalesConsoleAuditMetadata
} from "@/features/sales/sales-console-m50-record-command-contract";

const audit: SalesConsoleAuditMetadata = {
  actorId: "USER-1",
  actorRole: "Sales Manager",
  storeId: "TMS-001",
  occurredAt: "2026-07-30T15:00:00.000Z",
  commandId: "CMD-M65",
  correlationId: "CORR-M65",
  idempotencyKey: "IDEMP-M65",
  sourceLink: "/sales"
};

describe("Sales Console M65 sales record domain", () => {
  it("covers enterprise record types and lifecycle states", () => {
    expect(salesConsoleRecordDomainCoversEnterpriseRecords()).toBe(true);
    expect(salesConsoleLifecycleCoversRecordExecution()).toBe(true);
    expect(salesConsoleRecordTypes).toEqual(expect.arrayContaining(["CompletedSaleRecord", "SourceReconciliationRecord"]));
    expect(salesConsoleLifecycleStates).toEqual(expect.arrayContaining(["sale-recorded", "source-reconciliation-pending", "completed"]));
  });

  it("keeps source systems as owners without allowing risky command names", () => {
    expect(salesConsoleSourceSystemsRemainOwners()).toBe(true);
    expect(salesConsoleRecordOwners).toEqual(expect.arrayContaining(["CRM / Customers", "Inventory / Vehicles", "DMS", "Finance"]));
    expect(prohibitedSalesConsoleCommandNames).toEqual(expect.arrayContaining(["SubmitQuote", "ApproveDiscount", "HoldVehicle", "DecideFinance"]));
    expect(isApprovedSalesConsoleCommand("RecordCompletedSale")).toBe(true);
    expect(isApprovedSalesConsoleCommand("SubmitQuote")).toBe(false);
  });

  it("requires audit and idempotency for completed sale commands", () => {
    const command: RecordCompletedSale = {
      name: "RecordCompletedSale",
      writesTo: "Sales Console Internal",
      mutatesSourceSystem: false,
      audit,
      payload: {
        salesOpportunityId: "SO-1",
        revenueOpportunityId: "REV-1",
        customerId: "CUST-1",
        customerName: "John Smith",
        revenueLane: "Inventory Cash Sale",
        saleDate: "2026-07-30",
        salespersonId: "USER-1",
        managerId: "MGR-1",
        productLabel: "2022 Toyota RAV4 XLE",
        vehicleStockNumber: "TMS22145",
        grossEstimateCents: 285000,
        paymentPath: "cash",
        lifecycleState: "sale-recorded",
        sourceRecordLinks: ["/customers/customer-360?customerId=CUST-1", "/vehicles/360/TMS22145"],
        evidenceIds: ["EVD-1"],
        reconciliationStatus: "pending"
      }
    };

    expect(hasRequiredAuditMetadata(command.audit)).toBe(true);
    expect(commandMutatesOnlySalesConsoleInternal(command)).toBe(true);
  });
});
