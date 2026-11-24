import { record, type DealFinancialEntry } from "./deal-dashboard-enterprise";

export const RENTAL_PAYMENT_METHODS = {
  CASH: "Cash",
  CARD_TERMINAL: "Card terminal",
  CHECK: "Check",
  TRANSFER: "Bank transfer"
} as const;

export type RentalPaymentMethod = keyof typeof RENTAL_PAYMENT_METHODS;
export type RentalReceipt = {
  receiptNumber: string;
  receivedAt: string;
  businessDate: string;
  amountCents: number;
  method: RentalPaymentMethod;
  reference: string | null;
  customerName: string;
  dealNumber: string;
  vehicle: string | null;
  vin: string | null;
  receivedBy: string;
  purpose: "RENTAL_CHARGE";
  agreedCents: number | null;
  netPaidCents: number;
  balanceCents: number | null;
  creditCents: number;
  status?: "REVERSED" | "REFUNDED" | "PARTIALLY_REFUNDED";
  adjustedCents?: number;
};

export function rentalReceiptHref(draftId: string, paymentId: string) {
  return `/api/crm/v1/rental-receipt?${new URLSearchParams({ draftId, paymentId })}`;
}

export function validRentalPaymentReference(reference: string) {
  return /^[a-zA-Z0-9][a-zA-Z0-9 ./_#-]{0,63}$/.test(reference) && !/\d{13,}/.test(reference.replace(/[^a-zA-Z0-9]/g, ""));
}

export function getRentalReceipt(value: unknown): RentalReceipt | null {
  const receipt = record(record(value).rentalReceipt);
  return receipt.purpose === "RENTAL_CHARGE" && typeof receipt.receiptNumber === "string" ? receipt as RentalReceipt : null;
}

export function rentalReceiptAdjustment(receipt: RentalReceipt, paymentId: string, entries: DealFinancialEntry[]): RentalReceipt {
  const reversed = new Set(entries.filter(entry => entry.kind === "REVERSAL").map(entry => entry.originalId));
  if (reversed.has(paymentId)) return { ...receipt, status: "REVERSED", adjustedCents: receipt.amountCents };
  const refunded = entries.filter(entry => entry.kind === "REFUND" && entry.originalId === paymentId && !reversed.has(entry.id))
    .reduce((total, entry) => total + entry.amountCents, 0);
  if (!refunded) return receipt;
  return { ...receipt, status: refunded >= receipt.amountCents ? "REFUNDED" : "PARTIALLY_REFUNDED", adjustedCents: refunded };
}
