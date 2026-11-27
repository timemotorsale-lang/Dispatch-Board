export const depositMethods = {
  CASH: "Cash", ZELLE: "Zelle", CREDIT_CARD: "Credit card", DEBIT_CARD: "Debit card", OTHER_CARD: "Other card",
  CHECK: "Check", CASHIERS_CHECK: "Cashier's check", MONEY_ORDER: "Money order",
  ACH: "ACH transfer", WIRE: "Wire transfer", BANK_TRANSFER: "Other bank transfer",
  CASH_APP: "Cash App", VENMO: "Venmo", PAYPAL: "PayPal", MOBILE_WALLET: "Mobile wallet", OTHER_PAYMENT: "Other payment"
} as const;
export type DepositMethod = keyof typeof depositMethods;
export const depositHoldBlocker = "Vehicle is held by a customer deposit. Use the deposit customer on the sale or record a verified full refund in Customer 360.";
export const depositDisclosure = "IMPORTANT: THIS MAY BE A BINDING CONTRACT AND YOU MAY LOSE ANY DEPOSITS IF YOU DO NOT PERFORM ACCORDING TO ITS TERMS.";
export function depositTerms(vehicle: boolean, nonRefundable: boolean) {
  return [
    vehicle ? "The dealership takes the vehicle identified on this receipt off the market while the deposit hold is active. The hold is for this customer only." : "This deposit does not reserve a vehicle.",
    nonRefundable ? "This deposit is designated non-refundable, subject to applicable law. This designation does not waive any rights or refunds required by law." : "This deposit is designated refundable.",
    "This receipt records the deposit only. It does not transfer ownership or replace a vehicle purchase agreement."
  ].join("\n");
}
export const depositCurrency = (cents: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
export const depositDate = (value: string | Date) => new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Chicago" }).format(new Date(value));
export const depositNumber = (id: string) => `DEP-${id.toUpperCase()}`;

export function depositAmount(raw: unknown) {
  const value = typeof raw === "string" ? raw.trim() : "";
  const match = /^(\d{1,7})(?:\.(\d{1,2}))?$/.exec(value);
  if (!match) return 0;
  return Number(match[1]) * 100 + Number((match[2] ?? "").padEnd(2, "0"));
}
export function safeDepositReference(raw: unknown) {
  const reference = typeof raw === "string" ? raw.trim() : "";
  if (!/^[a-z0-9][a-z0-9 ._/#-]{0,63}$/i.test(reference) || /(?:\d[ -]?){12,}/.test(reference)) return "";
  return reference.toUpperCase();
}
