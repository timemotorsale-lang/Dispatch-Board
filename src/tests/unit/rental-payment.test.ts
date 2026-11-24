import { describe, expect, it } from "vitest";
import { rentalReceiptAdjustment, validRentalPaymentReference, type RentalReceipt } from "@/lib/rental-payment";
import type { DealFinancialEntry } from "@/lib/deal-dashboard-enterprise";

const receipt: RentalReceipt = {
  receiptNumber: "RR-TEST", receivedAt: "2026-11-24T03:00:00Z", businessDate: "2026-11-23", amountCents: 12_500,
  method: "CASH", reference: null, customerName: "Test Customer", dealNumber: "1050", vehicle: null, vin: null,
  receivedBy: "Test Manager", purpose: "RENTAL_CHARGE", agreedCents: 20_000, netPaidCents: 12_500, balanceCents: 7_500, creditCents: 0
};

const entry = (id: string, kind: "REFUND" | "REVERSAL", originalId: string, amountCents: number): DealFinancialEntry => ({
  id, kind, originalId, amountCents, businessDate: "2026-11-23", recordedAt: "2026-11-24T03:01:00Z",
  reference: id, evidence: "Synthetic receipt test", reason: "Test adjustment", actorName: "Test Manager"
});

describe("rental receipt adjustments", () => {
  it("shows partial and full refunds while preserving the balance snapshot", () => {
    const first = entry("first", "REFUND", "payment", 2500), rest = entry("rest", "REFUND", "payment", 10_000);
    expect(rentalReceiptAdjustment(receipt, "payment", [first])).toEqual({ ...receipt, status: "PARTIALLY_REFUNDED", adjustedCents: 2500 });
    expect(rentalReceiptAdjustment(receipt, "payment", [first, rest])).toEqual({ ...receipt, status: "REFUNDED", adjustedCents: 12_500 });
  });

  it("shows a payment reversal and excludes reversed refunds and unrelated transactions", () => {
    const refund = entry("refund", "REFUND", "payment", 2500);
    const reversal = entry("reversal", "REVERSAL", refund.id, 2500);
    const unrelated = entry("unrelated", "REFUND", "another-payment", 900);
    expect(rentalReceiptAdjustment(receipt, "payment", [unrelated, refund, reversal])).toEqual(receipt);
    expect(rentalReceiptAdjustment(receipt, "payment", [entry("original-reversal", "REVERSAL", "payment", 12_500)])).toEqual({ ...receipt, status: "REVERSED", adjustedCents: 12_500 });
  });

  it("accepts tender references and rejects full card-like numbers", () => {
    expect(validRentalPaymentReference("APP-ABC1234")).toBe(true);
    expect(validRentalPaymentReference("4111/1111 1111-1111")).toBe(false);
  });
});
