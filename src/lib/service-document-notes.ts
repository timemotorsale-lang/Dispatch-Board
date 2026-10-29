import type { ServiceDocumentContent } from "@/server/repair-order/service-documents";

export const CUSTOMER_ESTIMATE_APPROVAL_NOTE = "Work begins after your approval. Any additional work or charges require your approval before proceeding.";

const LEGACY_ESTIMATE_NOTES = new Set([
  "Labor hours are provisional planning allowances, not validated vehicle-specific standards.",
  "Only separately recorded exact-version customer authorization permits repair execution.",
]);

// Preserve saved document records while simplifying their customer-facing copy.
export function customerDocumentNotes(notes: string[], timezone = "America/Chicago"): string[] {
  let approvalIncluded = notes.includes(CUSTOMER_ESTIMATE_APPROVAL_NOTE);
  return notes.flatMap(note => {
    if (note.startsWith("Native posted invoice.") || note.startsWith("Authorized planning time ") || note.startsWith("Source estimate ") || note.startsWith("Recorded by ") || note === "This is a record of verified financial activity, not a card-processing instruction.") return [];
    const expiration = /^Valid until (.+)\.$/.exec(note);
    if (expiration && Number.isFinite(Date.parse(expiration[1]))) return [`Estimate valid through ${new Date(expiration[1]).toLocaleDateString("en-US", { timeZone: timezone, month: "long", day: "numeric", year: "numeric" })}.`];
    const legacyBalance = /^Original invoice (.+); remaining balance (-?\d+) cents\.$/.exec(note);
    if (legacyBalance) return [`Invoice ${legacyBalance[1]} · Remaining balance: ${new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(legacyBalance[2]) / 100)}.`];
    if (!LEGACY_ESTIMATE_NOTES.has(note)) return [note];
    if (approvalIncluded) return [];
    approvalIncluded = true;
    return [CUSTOMER_ESTIMATE_APPROVAL_NOTE];
  });
}
export function legacyReceiptDetails(content: ServiceDocumentContent): ServiceDocumentContent["receipt"] {
  const balance = content.notes.map(note => /^Original invoice (.+); remaining balance (-?\d+) cents\.$/.exec(note)).find(Boolean);
  const activity = /^(PAYMENT|REFUND|CREDIT|VOID): (.+); reference (.*)$/.exec(content.lines[0]?.description ?? "");
  if (!balance || !activity || !Number.isSafeInteger(content.lines[0]?.totalCents)) return undefined;
  return { invoiceNumber: balance[1], kind: activity[1], amountCents: content.lines[0].totalCents, method: activity[2] === "Adjustment" ? null : activity[2], reference: activity[3], balanceCents: Number(balance[2]) };
}
