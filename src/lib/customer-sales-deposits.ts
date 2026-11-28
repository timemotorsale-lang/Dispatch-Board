export const depositMethods = {
  CASH: "Cash", ZELLE: "Zelle", CREDIT_CARD: "Credit card", DEBIT_CARD: "Debit card", OTHER_CARD: "Other card",
  CHECK: "Check", CASHIERS_CHECK: "Cashier's check", MONEY_ORDER: "Money order",
  ACH: "ACH transfer", WIRE: "Wire transfer", BANK_TRANSFER: "Other bank transfer",
  CASH_APP: "Cash App", VENMO: "Venmo", PAYPAL: "PayPal", MOBILE_WALLET: "Mobile wallet", OTHER_PAYMENT: "Other payment"
} as const;
export type DepositMethod = keyof typeof depositMethods;

export const depositKinds = { GENERAL: "General deposit", RESERVATION: "Reserve a vehicle", ORDER: "Order a vehicle" } as const;
export type DepositKind = keyof typeof depositKinds;
export function normalizeDepositVin(value: unknown) {
  const vin = typeof value === "string" ? value.trim().toUpperCase() : "";
  return /^[A-HJ-NPR-Z0-9]{17}$/.test(vin) ? vin : "";
}
export function readDepositAgreement(data: Record<string, unknown>) {
  const field = (key: string, max: number) => {
    const value = typeof data[key] === "string" ? data[key].trim() : "";
    return value && value.length <= max && !/[\x00-\x1f\x7f]/.test(value) ? value : "";
  };
  const deadline = field("agreementDeadline", 10);
  const date = new Date(deadline + "T12:00:00Z");
  const price = depositAmount(data.agreementPrice);
  return {
    deadline: /^\d{4}-\d{2}-\d{2}$/.test(deadline) && Number.isFinite(date.valueOf()) && date.toISOString().slice(0, 10) === deadline ? deadline : "",
    price, year: /^\d{4}$/.test(field("agreementYear", 4)) ? field("agreementYear", 4) : "",
    make: field("agreementMake", 40), model: field("agreementModel", 40),
    criteria: field("agreementCriteria", 200), signedReference: field("signedReference", 80),
  };
}
export function depositAgreementIssue(kind: "RESERVATION" | "ORDER", agreement: ReturnType<typeof readDepositAgreement>, amountCents: number) {
  const order = kind === "ORDER";
  if (!agreement.deadline) return { field: "agreementDeadline", message: `Enter a valid ${order ? "Source by" : "Purchase by"} date.` };
  const priceLabel = order ? "maximum total price" : "agreed total price";
  if (!agreement.price) return { field: "agreementPrice", message: `Enter a positive dollar amount for the ${priceLabel}.` };
  if (agreement.price < amountCents) return { field: "agreementPrice", message: `The ${priceLabel} cannot be less than the deposit amount.` };
  return null;
}
export function vehicleDepositTerms(kind: "RESERVATION" | "ORDER", agreement: ReturnType<typeof readDepositAgreement>, nonRefundable: boolean) {
  return [
    kind === "RESERVATION"
      ? `The dealership reserves the exact VIN shown for the purchaser. The purchaser agrees to complete the purchase for ${depositCurrency(agreement.price)} total by ${agreement.deadline}, subject to the written conditions below.`
      : `The dealership agrees to source the specified vehicle for no more than ${depositCurrency(agreement.price)} total by ${agreement.deadline}. The purchaser agrees to complete the purchase if the vehicle meets the signed specifications and conditions. This order does not reserve current inventory.`,
    agreement.criteria ? `Agreed requirements or contingencies: ${agreement.criteria}` : "No additional requirements or contingencies recorded.",
    "The deposit is credited toward the purchase. If the dealership cannot deliver as agreed or an agreed contingency is not met, the deposit is refundable in full.",
    nonRefundable ? "If the buyer backs out despite the dealership meeting the signed terms, a manager reviews whether any amount may lawfully be retained and refunds any balance due. There is no automatic forfeiture." : "The deposit is refundable if the buyer cancels.",
    ...(agreement.signedReference ? [`Signed agreement reference: ${agreement.signedReference}.`] : []),
    "This document records the deposit and agreement. It does not transfer ownership."
  ].join("\n");
}
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
