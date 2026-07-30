import { describe, expect, it } from "vitest";

import {
  buildSourceReconciliationRecord,
  evaluateSalesSourceReconciliation,
  sourceReconciliationNeverWritesToSourceSystems
} from "@/features/sales/sales-console-m71-source-reconciliation-foundation";
import { salesConsoleSampleCompletedSaleRecord } from "@/features/sales/sales-console-m69-post-sale-execution-workflow";

describe("Sales Console M71 source reconciliation foundation", () => {
  it("marks clean source snapshots as verified", () => {
    const decision = evaluateSalesSourceReconciliation(salesConsoleSampleCompletedSaleRecord, {
      customerId: salesConsoleSampleCompletedSaleRecord.customerId,
      vehicleStockNumber: salesConsoleSampleCompletedSaleRecord.vehicleStockNumber,
      inventoryStatus: "sold",
      grossEstimateCents: salesConsoleSampleCompletedSaleRecord.grossEstimateCents,
      financeStatus: "not-needed",
      deliveryStatus: "complete"
    });

    expect(decision).toMatchObject({ status: "source-verified", mismatchCodes: [] });
  });

  it("routes source mismatches to source owners", () => {
    const decision = evaluateSalesSourceReconciliation(salesConsoleSampleCompletedSaleRecord, {
      customerId: "OTHER-CUSTOMER",
      vehicleStockNumber: "OTHER-STOCK",
      inventoryStatus: "available",
      grossEstimateCents: salesConsoleSampleCompletedSaleRecord.grossEstimateCents + 25000,
      deliveryStatus: "blocked"
    });

    expect(decision.status).toBe("needs-source-owner-correction");
    expect(decision.mismatchCodes).toEqual(
      expect.arrayContaining(["customer-mismatch", "vehicle-mismatch", "inventory-not-sold", "gross-mismatch", "delivery-incomplete"])
    );
    expect(decision.sourceOwners).toEqual(expect.arrayContaining(["CRM / Customers", "Inventory / Vehicles", "DMS"]));
    expect(decision.sourceCorrectionWriteEnabled).toBe(false);
  });

  it("routes duplicate sale records to manager review", () => {
    const decision = evaluateSalesSourceReconciliation(salesConsoleSampleCompletedSaleRecord, {
      customerId: salesConsoleSampleCompletedSaleRecord.customerId,
      vehicleStockNumber: salesConsoleSampleCompletedSaleRecord.vehicleStockNumber,
      inventoryStatus: "sold",
      grossEstimateCents: salesConsoleSampleCompletedSaleRecord.grossEstimateCents,
      deliveryStatus: "complete",
      duplicateSaleRecordIds: ["SALE-DUPE"]
    });

    expect(decision.status).toBe("needs-manager-review");
    expect(decision.mismatchCodes).toContain("duplicate-sale-record");
  });

  it("builds reconciliation records without enabling source corrections", () => {
    const record = buildSourceReconciliationRecord(salesConsoleSampleCompletedSaleRecord, {
      customerId: salesConsoleSampleCompletedSaleRecord.customerId,
      vehicleStockNumber: salesConsoleSampleCompletedSaleRecord.vehicleStockNumber,
      inventoryStatus: "sold",
      grossEstimateCents: salesConsoleSampleCompletedSaleRecord.grossEstimateCents,
      deliveryStatus: "complete"
    });

    expect(record.completedSaleRecordId).toBe(salesConsoleSampleCompletedSaleRecord.id);
    expect(record.sourceCorrectionWriteEnabled).toBe(false);
    expect(sourceReconciliationNeverWritesToSourceSystems()).toBe(true);
  });
});
