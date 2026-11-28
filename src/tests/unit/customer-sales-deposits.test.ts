import { describe, expect, it } from "vitest";
import { depositAgreementIssue, depositAmount, depositTerms, readDepositAgreement, safeDepositReference, vehicleDepositTerms } from "@/lib/customer-sales-deposits";
import { renderCustomerDepositReceipt } from "@/server/crm-next/customer-deposit-receipt";
import type { DepositReceipt } from "@/server/crm-next/customer-sales-deposits";

describe("customer sales deposits", () => {
  it("keeps exact cents and rejects invalid amounts and card-number-shaped references", () => {
    expect(depositAmount("500.05")).toBe(50005);
    for (const value of ["0", "-5", "3.000", "1e3", "10000000"]) expect(depositAmount(value)).toBe(0);
    expect(safeDepositReference(" trm-558/a ")).toBe("TRM-558/A");
    expect(safeDepositReference("4111 1111 1111 1111")).toBe("");
  });

  it("keeps showroom and order commitments distinct and never auto-forfeits either deposit", () => {
    const agreement = readDepositAgreement({
      agreementDeadline: "2027-01-15", agreementPrice: "22500", signedReference: "Signed copy 81", agreementCriteria: "Subject to inspection"
    });
    expect(agreement.deadline).toBe("2027-01-15");
    expect(readDepositAgreement({ agreementDeadline: "2027-02-30" }).deadline).toBe("");
    const reservation = vehicleDepositTerms("RESERVATION", agreement, true);
    const order = vehicleDepositTerms("ORDER", agreement, true);
    expect(reservation).toContain("reserves the exact VIN");
    expect(order).toContain("This order does not reserve current inventory.");
    for (const terms of [order, reservation]) {
      expect(terms).toContain("$22,500.00");
      expect(terms).toContain("Subject to inspection");
      expect(terms).toContain("refundable in full");
      expect(terms).toContain("There is no automatic forfeiture.");
      expect(terms).toContain("Signed copy 81");
    }
  });

  it("accepts a vehicle agreement without a manual reference and flags the actual invalid field", () => {
    const order = readDepositAgreement({ agreementDeadline: "2026-12-01", agreementPrice: "23000" });
    expect(depositAgreementIssue("ORDER", order, 300000)).toBeNull();
    expect(vehicleDepositTerms("ORDER", order, false)).not.toContain("Signed agreement reference");
    expect(depositAgreementIssue("ORDER", { ...order, deadline: "" }, 300000)).toMatchObject({ field: "agreementDeadline" });
    expect(depositAgreementIssue("RESERVATION", { ...order, price: 250000 }, 300000)).toMatchObject({ field: "agreementPrice" });
  });

  it("renders the saved original terms, escape-safe text, company logo, print layout and later refund status", () => {
    const html = renderCustomerDepositReceipt({
      id: "78a91433-f920-424e-928a-d2c06b2c11cc", customerId: "synthetic-customer", organizationId: "org-time-motor-sales",
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
    expect(html).toContain("Deposit agreement and receipt");
    expect(html).toContain("1101 E. Lake Street, Minneapolis, MN 55407");
    expect(html).toContain("timemotors.net");
    expect(html).toContain("timemotorsale@gmail.com");
    expect(html).toContain("612-724-3631");
    expect(html).not.toContain("<dt>Customer phone</dt>");
    expect(depositTerms(false, false)).toContain("does not reserve a vehicle");
  });
});
