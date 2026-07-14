import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("service close and enterprise parts persistence", () => {
  it("defines the aggregates, ledger movements, constraints, and immutable evidence", async () => {
    const schema = await readFile(path.join(process.cwd(), "prisma/schema.prisma"), "utf8"), sql = await readFile(path.join(process.cwd(), "prisma/migrations/20260714100000_add_service_close_parts_operations/migration.sql"), "utf8");
    for (const model of ["ServiceInvoicePackage", "RepairOrderClosureEvent", "PartVendor", "PartVendorOffer", "PartRequisition", "PartPurchaseOrder", "PartReceipt", "PartReceivingDiscrepancy", "PartCustodyEvent", "PartTransfer", "PartRecoveryCase"]) expect(schema).toContain(`model ${model}`);
    for (const movement of ["TRANSFER_OUT", "TRANSFER_IN", "CORE_RETURN", "WARRANTY_RETURN", "VENDOR_RETURN"]) expect(schema).toContain(movement);
    expect(sql).toMatch(/RepairOrderClosureEvent_close_evidence_check/);
    expect(sql).toMatch(/PartReceivingDiscrepancy_resolution_check/);
    expect(sql).toMatch(/PartRecoveryCase_credit_check/);
    expect(sql).toMatch(/prevent_service_parts_evidence_mutation/);
  });
});
