import { describe, expect, it } from "vitest";

import {
  buildSalesBookLedger,
  salesBookLedgerPreservesRoleVisibility,
  salesConsoleSampleSalesBookRecords
} from "@/features/sales/sales-console-m70-sales-book-ledger-view";

describe("Sales Console M70 sales book ledger view", () => {
  it("summarizes completed sale records by lane and gross", () => {
    const ledger = buildSalesBookLedger(salesConsoleSampleSalesBookRecords, "Sales Manager", "MGR-1");

    expect(ledger.units).toBe(3);
    expect(ledger.grossEstimateCents).toBe(558000);
    expect(ledger.revenueByLane["Inventory Cash Sale"]).toMatchObject({ units: 1, grossEstimateCents: 285000 });
    expect(ledger.revenueByLane["Warranty Product"]).toMatchObject({ units: 1, grossEstimateCents: 78000 });
  });

  it("tracks reconciliation and evidence warnings", () => {
    const ledger = buildSalesBookLedger(salesConsoleSampleSalesBookRecords, "Admin / Owner", "OWNER-1");

    expect(ledger.pendingReconciliation).toBe(1);
    expect(ledger.sourceMismatch).toBe(1);
    expect(ledger.missingEvidence).toBe(1);
    expect(ledger.deploymentWarnings).toEqual(
      expect.arrayContaining(["1 sale record pending source reconciliation", "1 sale record missing evidence"])
    );
  });

  it("preserves role-scoped visibility", () => {
    expect(salesBookLedgerPreservesRoleVisibility()).toBe(true);

    const salespersonLedger = buildSalesBookLedger(salesConsoleSampleSalesBookRecords, "Salesperson", "USER-1");
    expect(salespersonLedger.visibleRecords.every((record) => record.salespersonId === "USER-1")).toBe(true);
  });

  it("keeps BDC visibility away from sensitive BHPH sale records", () => {
    const ledger = buildSalesBookLedger(salesConsoleSampleSalesBookRecords, "BDC / Lead Coordinator", "BDC-1");

    expect(ledger.visibleRecords.some((record) => record.revenueLane === "Inventory BHPH Sale")).toBe(false);
  });
});
