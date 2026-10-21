import { describe, expect, it } from "vitest";
import { authorizedCommercialLedger } from "@/lib/service-commercial-ledger";
import { serviceInvoiceBalance, validateBillingEntry, type BillingEntry } from "@/lib/service-billing";
import { validateCreditComponents } from "@/lib/service-credit";
import { estimateReviewScope } from "@/lib/estimate-review";
import { reportPeriod, serviceReportCsv } from "@/server/service-billing/reporting";

const quote = { lineItems: [{ key: "labor", type: "LABOR", description: "Repair", quantity: 1, unitPriceCents: 10000, laborGuideMinutes: 90, taxable: false }, { key: "part", type: "PART", description: "Part", quantity: 2, unitPriceCents: 2500, taxable: true }, { key: "fee", type: "FEE", description: "Fee", quantity: 1, unitPriceCents: 500, taxable: false }], laborSubtotalCents: 10000, partsSubtotalCents: 5000, feeSubtotalCents: 500, taxCents: 400, discountCents: 1550, totalCents: 14350 };
const invoice = { totalCents: 14350, status: "POSTED", issuedAt: new Date("2026-10-01T00:00:00Z") };
const payment: BillingEntry = { id: "payment", kind: "PAYMENT", amountCents: 10000, relatedEntryId: null };
describe("native service commercial ledger", () => {
  it("includes parts, fees, recorded tax and discount exactly once", () => {
    expect(authorizedCommercialLedger(quote, ["labor", "part", "fee"])).toMatchObject({ subtotalCents: 15500, taxCents: 400, discountCents: 1550, totalCents: 14350, proposedMinutes: 90 });
  });
  it("prices partial approvals from stored canonical quantity and price", () => {
    expect(authorizedCommercialLedger(quote, ["part"])).toMatchObject({ subtotalCents: 5000, discountCents: 500, taxCents: 400, totalCents: 4900 });
    expect(authorizedCommercialLedger(quote, [])).toMatchObject({ totalCents: 0 });
  });
  it("rejects unknown keys, duplicate keys, tampered totals and unknown partial tax bases", () => {
    expect(() => authorizedCommercialLedger(quote, ["missing"])).toThrow();
    expect(() => authorizedCommercialLedger(quote, ["labor", "labor"])).toThrow();
    expect(() => authorizedCommercialLedger({ ...quote, totalCents: 1 }, ["labor"])).toThrow("total");
    expect(() => authorizedCommercialLedger({ ...quote, lineItems: quote.lineItems.map(line => ({ ...line, taxable: false })) }, ["labor"])).toThrow("taxable basis");
  });
  it("separates payment, refunds, credits and current balances", () => {
    expect(serviceInvoiceBalance(invoice, [payment])).toMatchObject({ paidCents: 10000, balanceCents: 4350, settlement: "PARTIALLY_PAID" });
    const refund = { id: "refund", kind: "REFUND", amountCents: 2000, relatedEntryId: payment.id };
    expect(serviceInvoiceBalance(invoice, [payment, refund])).toMatchObject({ netPaidCents: 8000, balanceCents: 6350 });
  });
  it("refuses overpayments, unsupported receipts, excess refunds and settled voids", () => {
    const time = new Date("2026-10-02T00:00:00Z");
    expect(() => validateBillingEntry(invoice, [payment], { kind: "PAYMENT", amountCents: 5000, occurredAt: time })).toThrow("exceeds");
    expect(() => validateBillingEntry(invoice, [payment], { kind: "REFUND", amountCents: 10001, relatedEntryId: payment.id, occurredAt: time })).toThrow("unrefunded");
    expect(() => validateBillingEntry(invoice, [payment], { kind: "VOID", amountCents: 0, occurredAt: time })).toThrow("refunded");
    expect(() => validateBillingEntry(invoice, [], { kind: "PAYMENT", amountCents: 1, occurredAt: new Date("invalid") })).toThrow("time");
    expect(() => serviceInvoiceBalance(invoice, [{ ...payment, amountCents: -1 }])).toThrow("invalid");
  });
  it("requires source-line and component reconciliation for credit notes", () => {
    const basis = { subtotalCents: 15500, discountCents: 1550, taxCents: 400 };
    const credit = { subtotalCents: 1000, discountCents: 100, taxCents: 0, lineKeys: ["labor"] };
    expect(validateCreditComponents(basis, [], credit, 900, [{ key: "labor", totalCents: 10000 }])).toEqual(credit);
    expect(() => validateCreditComponents(basis, [], credit, 1000, [{ key: "labor", totalCents: 10000 }])).toThrow("reconcile");
    expect(() => validateCreditComponents(basis, [], credit, 900, [{ key: "other", totalCents: 10000 }])).toThrow("original");
    expect(() => validateCreditComponents(basis, [{ ...credit, taxCents: 400 }], { ...credit, taxCents: 1 }, 901, [{ key: "labor", totalCents: 10000 }])).toThrow("uncredited");
  });
  it("invalidates exact-scope review when a part identity changes", () => {
    const line = { key: "part", type: "PART", description: "Part", quantity: 1, unitPriceCents: 100, laborGuideMinutes: 0, partNumber: "A" };
    expect(estimateReviewScope("vehicle", [line])).not.toEqual(estimateReviewScope("vehicle", [{ ...line, partNumber: "B" }]));
  });
  it("rejects rolled-over dates and neutralizes spreadsheet formulas", () => {
    expect(() => reportPeriod("2026-02-30", "2026-03-01")).toThrow("valid");
    expect(serviceReportCsv([{ customer: "=HYPERLINK(\"bad\")", amount: 1 }])).toContain("'=HYPERLINK");
  });
});
