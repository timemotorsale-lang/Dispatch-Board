import { describe, expect, it } from "vitest";
import { partsProcurementType, recordedPartsPurchaseTotal, recordedReconBudget } from "@/lib/parts-procurement";

describe("parts procurement accounts", () => {
  const unit = { acquisitionCase: { appraisalSnapshot: { estimatedReconCents: 10000 } } };
  it("uses the repair origin rather than the presence of a customer or inventory link", () => {
    expect(partsProcurementType({ origin: "CUSTOMER_REPAIR", inventoryUnit: unit })).toBe("CUSTOMER_REPAIR");
    expect(recordedReconBudget({ origin: "CUSTOMER_REPAIR", inventoryUnit: unit })).toBeNull();
    expect(partsProcurementType({ origin: "INVENTORY_RECON" })).toBe("INVENTORY_RECON");
  });
  it("distinguishes an unset allowance from a recorded zero allowance", () => {
    expect(recordedReconBudget({ origin: "INVENTORY_RECON" })).toBeNull();
    expect(recordedReconBudget({ origin: "INVENTORY_RECON", inventoryUnit: {
      acquisitionCase: { appraisalSnapshot: { estimatedReconCents: 0 } },
    } })?.estimatedReconBudgetCents).toBe(0);
  });
  it("keeps a later recon decision instead of reverting to the original appraisal", () => {
    expect(recordedReconBudget({ origin: "INVENTORY_RECON", inventoryUnit: {
      ...unit, acquisitionAppraisals: [{ decisionStatus: "APPROVED", estimatedReconCents: 15000 }],
    } })?.estimatedReconBudgetCents).toBe(15000);
  });
  it("counts each purchase once through receiving and closing", () => {
    expect(recordedPartsPurchaseTotal([
      { status: "DRAFT", orderedTotalCents: 3500 },
      { status: "PARTIALLY_RECEIVED", orderedTotalCents: 6500 },
      { status: "CLOSED", orderedTotalCents: 10000 },
      { status: "CANCELLED", orderedTotalCents: 99999 },
    ])).toBe(20000);
  });
});
