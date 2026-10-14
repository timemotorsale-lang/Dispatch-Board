import { describe, expect, it } from "vitest";
import { readPurchaseText, reconcilePurchase } from "@/lib/inventory-purchase-import";
describe("purchase reconciliation", () => {
  it("adds taxes and fees, subtracts credits and retains separate components", () => {
    expect(reconcilePurchase({ purchasePrice: "6000", buyerFee: "100", taxes: "400", credits: "200", invoiceTotal: "6300" })).toMatchObject({ vehicleCents: 600000, buyerFee: 10000, taxes: 40000, credits: 20000, totalCents: 630000, basis: "RECONCILED_COMPONENTS" });
  });
  it("rejects mismatches, negative net purchases and aggregate overflow", () => {
    expect(() => reconcilePurchase({ purchasePrice: "100", taxes: "10", invoiceTotal: "100" })).toThrow("does not match");
    expect(() => reconcilePurchase({ purchasePrice: "100", credits: "101" })).toThrow("range");
    expect(() => reconcilePurchase({ purchasePrice: "20000000", taxes: "1" })).toThrow("range");
  });
  it("does not silently treat fees as a vehicle price", () => {
    expect(() => reconcilePurchase({ taxes: "100" })).toThrow("Enter vehicle price");
    expect(() => reconcilePurchase({ taxes: "110", invoiceTotal: "100" })).toThrow("exceed");
    expect(reconcilePurchase({ invoiceTotal: "100" }).basis).toBe("INVOICE_TOTAL_ONLY");
  });
  it("extracts only explicit tax and credit labels", () => {
    expect(readPurchaseText("Taxes: $400\nCredit: $200").values).toMatchObject({ taxes: "$400", credits: "$200" });
  });
});
