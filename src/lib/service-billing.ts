export type BillingEntry = { id: string; kind: string; amountCents: number; relatedEntryId: string | null };
export function serviceInvoiceBalance(invoice: { totalCents: number; status: string }, entries: BillingEntry[]) {
  if (!Number.isSafeInteger(invoice.totalCents) || invoice.totalCents < 0 || !["POSTED", "VOID"].includes(invoice.status) || entries.some(entry => !["PAYMENT", "REFUND", "CREDIT", "VOID"].includes(entry.kind) || !Number.isSafeInteger(entry.amountCents) || entry.amountCents < 0 || (entry.kind === "VOID" ? entry.amountCents !== 0 : entry.amountCents === 0))) throw new Error("Invoice ledger contains invalid financial values.");
  const total = (kind: string) => entries.filter(entry => entry.kind === kind).reduce((sum, entry) => sum + entry.amountCents, 0);
  const paidCents = total("PAYMENT"), refundedCents = total("REFUND"), creditedCents = total("CREDIT");
  const netPaidCents = paidCents - refundedCents;
  const balanceCents = invoice.status === "VOID" ? 0 : invoice.totalCents - creditedCents - netPaidCents;
  if ([paidCents, refundedCents, creditedCents, balanceCents].some(value => !Number.isSafeInteger(value) || value < 0) || refundedCents > paidCents || creditedCents > invoice.totalCents) throw new Error("Invoice payment and adjustment ledger does not reconcile.");
  return { paidCents, refundedCents, creditedCents, netPaidCents, balanceCents, settlement: invoice.status === "VOID" ? "VOID" : balanceCents === 0 ? "SETTLED" : netPaidCents > 0 ? "PARTIALLY_PAID" : "UNPAID" };
}
export function validateBillingEntry(invoice: { totalCents: number; status: string; issuedAt: Date }, entries: BillingEntry[], input: { kind: string; amountCents: number; relatedEntryId?: string | null; occurredAt: Date }, now = new Date()) {
  if (invoice.status !== "POSTED") throw new Error("Only posted nonvoid invoices accept ledger entries.");
  if (!Number.isFinite(input.occurredAt.getTime()) || input.occurredAt < invoice.issuedAt || input.occurredAt.getTime() > now.getTime() + 60_000) throw new Error("Payment/adjustment time must follow invoice issue and not be in the future.");
  const balance = serviceInvoiceBalance(invoice, entries);
  if (!Number.isSafeInteger(input.amountCents) || input.amountCents < 0 || (input.kind !== "VOID" && input.amountCents === 0)) throw new Error("Ledger amount must be positive whole cents.");
  if (["PAYMENT", "CREDIT"].includes(input.kind) && input.amountCents > balance.balanceCents) throw new Error("Payment or credit exceeds the open balance. Refund settled funds before crediting paid work.");
  if (input.kind === "REFUND") {
    const original = entries.find(entry => entry.id === input.relatedEntryId && entry.kind === "PAYMENT");
    const alreadyRefunded = entries.filter(entry => entry.kind === "REFUND" && entry.relatedEntryId === original?.id).reduce((sum, entry) => sum + entry.amountCents, 0);
    if (!original || input.amountCents > original.amountCents - alreadyRefunded) throw new Error("Refund requires the original payment and cannot exceed its unrefunded amount.");
  }
  if (input.kind === "VOID" && (input.amountCents !== 0 || balance.netPaidCents !== 0)) throw new Error("Void requires a zero adjustment and fully refunded payments.");
  if (!["PAYMENT", "REFUND", "CREDIT", "VOID"].includes(input.kind)) throw new Error("Unsupported billing entry.");
  return balance;
}
