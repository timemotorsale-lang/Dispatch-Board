import { describe, expect, it } from "vitest";
import { depositAmount, depositTerms, safeDepositReference } from "@/lib/customer-sales-deposits";
import { renderCustomerDepositReceipt } from "@/server/crm-next/customer-deposit-receipt";
import type { DepositReceipt } from "@/server/crm-next/customer-sales-deposits";

describe("customer sales deposits", () => {
  it("keeps exact cents and rejects invalid amounts and card-number-shaped references", () => {
    expect(depositAmount("500.05")).toBe(50005);
    for (const value of ["0", "-5", "3.000", "1e3", "10000000"]) expect(depositAmount(value)).toBe(0);
    expect(safeDepositReference(" trm-558/a ")).toBe("TRM-558/A");
    expect(safeDepositReference("4111 1111 1111 1111")).toBe("");
  });

  it("renders the saved original terms, escape-safe text, company logo, print layout and later refund status", () => {
    const html = renderCustomerDepositReceipt({
      id: "78a91433-f920-424e-928a-d2c06b2c11cc",
      companyName: "Time Motor Sales",
      customerName: "<b>Deposit customer</b>",
      amountCents: 50005, method: "OTHER_CARD", vehicleLabel: "Sedan / W114", vin: "VIN",
      receivedAt: new Date("2026-11-26T16:15:00Z"), receivedByName: "Manager",
      terms: depositTerms(true, true), refundedAt: new Date("2026-11-26T17:15:00Z")
    } as DepositReceipt);
    expect(html).toContain("data:image/png;base64,");
    expect(html).toContain("&lt;b&gt;Deposit customer&lt;/b&gt;");
    expect(html).toContain("$500.05");
    expect(html).toContain("Other card");
    expect(html).toContain("non-refundable, subject to applicable law");
    expect(html).toContain("Full refund recorded");
    expect(html).toContain("Purchaser signature");
    expect(html).toContain("@media print");
    expect(depositTerms(false, false)).toContain("does not reserve a vehicle");
  });
});
