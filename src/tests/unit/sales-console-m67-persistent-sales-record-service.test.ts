import { describe, expect, it } from "vitest";

import {
  createInMemorySalesConsoleRecordRepository,
  persistSalesConsoleRecord,
  salesConsolePersistentServiceStoresCompletedSales
} from "@/features/sales/sales-console-m67-persistent-sales-record-service";
import type {
  RecordCompletedSale,
  SalesConsoleAuditMetadata
} from "@/features/sales/sales-console-m50-record-command-contract";

const audit: SalesConsoleAuditMetadata = {
  actorId: "USER-1",
  actorRole: "Sales Manager",
  storeId: "TMS-001",
  occurredAt: "2026-07-30T15:00:00.000Z",
  commandId: "CMD-M67",
  correlationId: "CORR-M67",
  idempotencyKey: "IDEMP-M67",
  sourceLink: "/sales"
};

function completedSaleCommand(overrides: Partial<RecordCompletedSale> = {}): RecordCompletedSale {
  return {
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
    },
    ...overrides
  };
}

describe("Sales Console M67 persistent sales record service", () => {
  it("stores completed sales as Sales Console-owned records", () => {
    expect(salesConsolePersistentServiceStoresCompletedSales()).toBe(true);

    const repository = createInMemorySalesConsoleRecordRepository();
    const result = persistSalesConsoleRecord(completedSaleCommand(), repository);

    expect(result).toMatchObject({ ok: true, status: "created", recordId: "CMD-M67" });
    expect(repository.read().completedSales).toHaveLength(1);
    expect(repository.read().completedSales[0]?.customerName).toBe("John Smith");
  });

  it("returns duplicate safely for replayed idempotency keys", () => {
    const repository = createInMemorySalesConsoleRecordRepository();
    const first = persistSalesConsoleRecord(completedSaleCommand(), repository);
    const second = persistSalesConsoleRecord(completedSaleCommand(), repository);

    expect(first.status).toBe("created");
    expect(second).toMatchObject({ ok: true, status: "duplicate", recordId: "CMD-M67" });
    expect(repository.read().completedSales).toHaveLength(1);
  });

  it("requires audit metadata", () => {
    const repository = createInMemorySalesConsoleRecordRepository();
    const result = persistSalesConsoleRecord(
      completedSaleCommand({ audit: { ...audit, idempotencyKey: "" } }),
      repository
    );

    expect(result).toMatchObject({ ok: false, status: "rejected", reason: "audit and idempotency metadata required" });
  });

  it("rejects source-system mutations", () => {
    const repository = createInMemorySalesConsoleRecordRepository();
    const result = persistSalesConsoleRecord(
      completedSaleCommand({
        writesTo: "Sales Console Internal",
        mutatesSourceSystem: true as false
      }),
      repository
    );

    expect(result).toMatchObject({ ok: false, status: "rejected", reason: "source-system mutation rejected" });
  });

  it("creates source reconciliation records without correcting source systems", () => {
    const repository = createInMemorySalesConsoleRecordRepository();
    const result = persistSalesConsoleRecord({
      name: "CreateSourceReconciliationRecord",
      writesTo: "Sales Console Internal",
      mutatesSourceSystem: false,
      audit: { ...audit, commandId: "CMD-REC", idempotencyKey: "IDEMP-REC" },
      payload: {
        completedSaleRecordId: "CMD-M67",
        status: "pending",
        sourceOwners: ["CRM / Customers", "Inventory / Vehicles", "DMS"],
        sourceRecordLinks: ["/customers/customer-360?customerId=CUST-1", "/vehicles/360/TMS22145"],
        mismatchCodes: [],
        routingLabel: "Pending source verification",
        sourceCorrectionWriteEnabled: false
      }
    }, repository);

    expect(result).toMatchObject({ ok: true, status: "created" });
    expect(repository.read().sourceReconciliations[0]?.sourceCorrectionWriteEnabled).toBe(false);
  });
});
