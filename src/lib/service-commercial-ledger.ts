export const SERVICE_MONEY_VERSION = "stored-estimate-allocation-v1";
export type CommercialLine = { key: string; type: string; description: string; quantity: number; unitPriceCents: number; taxable?: boolean; laborGuideMinutes?: number; laborLineKey?: string; partNumber?: string };
export type CommercialEstimate = { lineItems: unknown; laborSubtotalCents: number; partsSubtotalCents: number; feeSubtotalCents: number; discountCents: number; taxCents: number; totalCents: number };
function cents(value: number) {
  if (!Number.isSafeInteger(value) || value < 0) throw new Error("Commercial amounts must be nonnegative safe integer cents.");
  return value;
}
export function commercialLines(value: unknown): CommercialLine[] {
  if (!Array.isArray(value) || !value.length) throw new Error("Recorded estimate lines are required.");
  const keys = new Set<string>();
  return value.map(raw => {
    if (!raw || typeof raw !== "object" || typeof raw.key !== "string" || !raw.key || keys.has(raw.key) || !["LABOR", "PART", "FEE"].includes(raw.type) || !Number.isSafeInteger(raw.quantity) || raw.quantity < 1 || typeof raw.description !== "string") throw new Error("Recorded commercial line is invalid.");
    keys.add(raw.key);
    cents(raw.unitPriceCents); cents(raw.quantity * raw.unitPriceCents);
    return raw as CommercialLine;
  });
}
export function authorizedCommercialLedger(estimate: CommercialEstimate, authorizedKeys: string[]) {
  const lines = commercialLines(estimate.lineItems);
  if (new Set(authorizedKeys).size !== authorizedKeys.length || authorizedKeys.some(key => !lines.some(line => line.key === key))) throw new Error("Authorization must reference unique recorded estimate lines.");
  const sum = (items: CommercialLine[]) => cents(items.reduce((total, line) => total + line.quantity * line.unitPriceCents, 0));
  const allSubtotal = sum(lines), allTaxable = sum(lines.filter(line => line.taxable));
  for (const [type, stored] of [["LABOR", estimate.laborSubtotalCents], ["PART", estimate.partsSubtotalCents], ["FEE", estimate.feeSubtotalCents]] as const) if (sum(lines.filter(line => line.type === type)) !== cents(stored)) throw new Error("Recorded estimate subtotals do not reconcile.");
  cents(estimate.taxCents); cents(estimate.discountCents); cents(estimate.totalCents);
  if (estimate.discountCents > allSubtotal || allSubtotal - estimate.discountCents + estimate.taxCents !== estimate.totalCents) throw new Error("Recorded estimate total does not reconcile.");
  const selected = lines.filter(line => authorizedKeys.includes(line.key)), subtotalCents = sum(selected), taxableCents = sum(selected.filter(line => line.taxable));
  if (estimate.taxCents > 0 && !allTaxable && selected.length !== lines.length) throw new Error("Partial taxable scope requires a revised estimate with an explicit taxable basis.");
  const discountCents = selected.length === lines.length ? estimate.discountCents : allSubtotal ? Math.round(estimate.discountCents * subtotalCents / allSubtotal) : 0;
  const taxCents = selected.length === lines.length ? estimate.taxCents : allTaxable ? Math.round(estimate.taxCents * taxableCents / allTaxable) : 0;
  return { version: SERVICE_MONEY_VERSION, allocationBasis: "Recorded quote tax allocated by taxable line value; recorded discount allocated by gross line value. No jurisdiction or new rate inferred.", lines: selected.map(line => ({ ...line, totalCents: line.quantity * line.unitPriceCents })), subtotalCents, laborSubtotalCents: sum(selected.filter(line => line.type === "LABOR")), partsSubtotalCents: sum(selected.filter(line => line.type === "PART")), feeSubtotalCents: sum(selected.filter(line => line.type === "FEE")), discountCents, taxCents, totalCents: cents(subtotalCents - discountCents + taxCents), proposedMinutes: selected.filter(line => line.type === "LABOR").reduce((total, line) => total + (line.laborGuideMinutes ?? 0), 0) };
}
