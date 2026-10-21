export type CreditComponents = { subtotalCents: number; discountCents: number; taxCents: number; lineKeys: string[] };
export function validateCreditComponents(invoice: { subtotalCents: number; discountCents: number; taxCents: number }, previous: CreditComponents[], value: unknown, amountCents: number, allowedLines: { key: string; totalCents: number; taxable?: boolean }[]): CreditComponents {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("A reviewed line and tax allocation is required for credit notes.");
  const raw = value as Record<string, unknown>;
  const components = { subtotalCents: Number(raw.subtotalCents), discountCents: Number(raw.discountCents), taxCents: Number(raw.taxCents), lineKeys: raw.lineKeys as string[] };
  for (const key of ["subtotalCents", "discountCents", "taxCents"] as const) {
    if (!Number.isSafeInteger(components[key]) || components[key] < 0 || components[key] + previous.reduce((sum, credit) => sum + credit[key], 0) > invoice[key]) throw new Error("Credit components exceed the uncredited original invoice basis.");
  }
  if (components.discountCents > components.subtotalCents || components.subtotalCents - components.discountCents + components.taxCents !== amountCents) throw new Error("Credit subtotal, discount and tax must reconcile to the credit amount.");
  if (!Array.isArray(components.lineKeys) || !components.lineKeys.length || new Set(components.lineKeys).size !== components.lineKeys.length || components.lineKeys.some(key => typeof key !== "string" || !allowedLines.some(line => line.key === key))) throw new Error("Credit must reference original invoice lines.");
  const selected = allowedLines.filter(line => components.lineKeys.includes(line.key));
  const priorScopeSubtotal = previous.filter(credit => credit.lineKeys.some(key => components.lineKeys.includes(key))).reduce((sum, credit) => sum + credit.subtotalCents, 0);
  if (components.subtotalCents + priorScopeSubtotal > selected.reduce((sum, line) => sum + line.totalCents, 0) || (components.taxCents > 0 && !selected.some(line => line.taxable))) throw new Error("Credit exceeds its original line scope or credits tax without a taxable source line.");
  return components;
}
