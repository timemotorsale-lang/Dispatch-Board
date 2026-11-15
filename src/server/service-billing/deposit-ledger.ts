export type RepairDepositEntry = {
  id: string; organizationId: string; repairOrderId: string;
  kind: "COLLECTION" | "REFUND" | "APPLY" | "UNAPPLY";
  amountCents: number; method: string; reference: string; relatedEntryId: string | null;
  invoiceId: string | null; invoiceEntryId: string | null; evidence: unknown;
  occurredAt: Date; createdByUserId: string; reason: string; createdAt: Date;
};

export function repairDepositBalance(entries: RepairDepositEntry[]) {
  const sources = new Map<string, { collected: number; refunded: number; applied: number }>();
  const applications = new Map<string, { sourceId: string; amount: number; reversed: number; invoiceId: string | null }>();
  for (const entry of entries) {
    if (!Number.isSafeInteger(entry.amountCents) || entry.amountCents <= 0 || entry.amountCents > 2147483647) throw new Error("Deposit amount must be positive whole cents.");
    if (entry.kind === "COLLECTION") {
      if (sources.has(entry.id) || entry.relatedEntryId || entry.invoiceId || entry.invoiceEntryId) throw new Error("Invalid deposit collection identity.");
      sources.set(entry.id, { collected: entry.amountCents, refunded: 0, applied: 0 });
    }
  }
  for (const entry of entries.filter(item => item.kind === "APPLY")) {
    const source = sources.get(entry.relatedEntryId ?? "");
    if (!source || !entry.invoiceId || !entry.invoiceEntryId || applications.has(entry.id)) throw new Error("Deposit application requires its original collection and invoice entry.");
    source.applied += entry.amountCents;
    applications.set(entry.id, { sourceId: entry.relatedEntryId!, amount: entry.amountCents, reversed: 0, invoiceId: entry.invoiceId });
  }
  for (const entry of entries) {
    if (entry.kind === "REFUND") {
      const source = sources.get(entry.relatedEntryId ?? "");
      if (!source || entry.invoiceId || entry.invoiceEntryId) throw new Error("Deposit refund requires its original collection.");
      source.refunded += entry.amountCents;
    } else if (entry.kind === "UNAPPLY") {
      const application = applications.get(entry.relatedEntryId ?? "");
      if (!application || entry.invoiceId !== application.invoiceId || !entry.invoiceEntryId) throw new Error("Deposit reversal requires its original application.");
      application.reversed += entry.amountCents;
      if (application.reversed > application.amount) throw new Error("Deposit reversal exceeds its original application.");
      sources.get(application.sourceId)!.applied -= entry.amountCents;
    } else if (!["COLLECTION", "APPLY"].includes(entry.kind)) throw new Error("Unknown deposit ledger event.");
  }
  let collectedCents = 0, refundedCents = 0, appliedCents = 0;
  for (const source of sources.values()) {
    if (source.refunded + source.applied > source.collected || source.applied < 0) throw new Error("Deposit ledger exceeds collected funds.");
    collectedCents += source.collected; refundedCents += source.refunded; appliedCents += source.applied;
  }
  const availableCents = collectedCents - refundedCents - appliedCents;
  if (![collectedCents, refundedCents, appliedCents, availableCents].every(Number.isSafeInteger)) throw new Error("Deposit ledger exceeds supported amounts.");
  return { collectedCents, refundedCents, appliedCents, availableCents };
}

export function depositSourceAvailable(entries: RepairDepositEntry[], sourceId: string) {
  const applicationIds = new Set(entries.filter(entry => entry.kind === "APPLY" && entry.relatedEntryId === sourceId).map(entry => entry.id));
  return repairDepositBalance(entries.filter(entry => entry.id === sourceId || entry.relatedEntryId === sourceId || applicationIds.has(entry.relatedEntryId ?? ""))).availableCents;
}
