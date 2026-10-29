export const SERVICE_CHARGES_POLICY = "shop-supplies-5-percent-cap-50-v1";
export const SHOP_SUPPLIES_KEY = "fee-shop-supplies";
export type ServiceCharge = { id: string; description: string; amountCents: number; taxable: boolean };
export function serviceQuoteTax(subtotalCents: number, taxableCents: number, taxRatePercent: number, discountCents = 0) {
  for (const amount of [subtotalCents, taxableCents, discountCents]) if (!Number.isSafeInteger(amount) || amount < 0) throw new Error("Quote amounts must be nonnegative whole cents.");
  if (discountCents > subtotalCents || taxableCents > subtotalCents) throw new Error("Discount cannot exceed the subtotal.");
  if (!Number.isFinite(taxRatePercent) || taxRatePercent < 0 || taxRatePercent > 30) throw new Error("Enter a valid tax rate.");
  const taxableDiscount = subtotalCents ? Math.round(discountCents * taxableCents / subtotalCents) : 0;
  return Math.round((taxableCents - taxableDiscount) * taxRatePercent / 100);
}
export function shopSuppliesCents(laborCents: number) {
  if (!Number.isSafeInteger(laborCents) || laborCents < 0) throw new Error("Labor total must be nonnegative whole cents.");
  return Math.min(5000, Math.round(laborCents / 20));
}
export function normalizeServiceCharges(value: unknown): ServiceCharge[] {
  if (!Array.isArray(value) || value.length > 50) throw new Error("Use no more than 50 additional charges.");
  const keys = new Set<string>();
  return value.map(item => {
    if (!item || typeof item !== "object" || Array.isArray(item)) throw new Error("Invalid additional charge.");
    const raw = item as Record<string, unknown>;
    const id = typeof raw.id === "string" ? raw.id.trim() : "";
    const description = typeof raw.description === "string" ? raw.description.trim() : "";
    if (!/^[a-zA-Z0-9-]{1,70}$/.test(id) || keys.has(id) || !description || description.length > 200 || !Number.isSafeInteger(raw.amountCents) || Number(raw.amountCents) < 0 || Number(raw.amountCents) > 10000000 || typeof raw.taxable !== "boolean") throw new Error("Enter a description and valid amount for every additional charge.");
    keys.add(id);
    return { id, description, amountCents: Number(raw.amountCents), taxable: raw.taxable };
  });
}
export function serviceChargeLines(laborCents: number, charges: ServiceCharge[], suppliesTaxable = false) {
  return [{ key: SHOP_SUPPLIES_KEY, type: "FEE" as const, description: "Shop supplies", quantity: 1, unitPriceCents: shopSuppliesCents(laborCents), taxable: suppliesTaxable, workTypeCode: "SHOP_SUPPLIES", laborGuideMinutes: 0, plannedCorrection: "Shop supplies" }, ...charges.map(charge => ({ key: `fee-other-${charge.id}`, type: "FEE" as const, description: charge.description, quantity: 1, unitPriceCents: charge.amountCents, taxable: charge.taxable, workTypeCode: "OTHER_CHARGE", laborGuideMinutes: 0, plannedCorrection: charge.description }))];
}
export function validateShopSupplies(lines: { key: string; type: string; quantity: number; unitPriceCents: number }[]) {
  const labor = lines.filter(line => line.type === "LABOR").reduce((sum, line) => sum + line.quantity * line.unitPriceCents, 0);
  const supplies = lines.filter(line => line.key === SHOP_SUPPLIES_KEY);
  if (supplies.length !== 1 || supplies[0].type !== "FEE" || supplies[0].quantity !== 1 || supplies[0].unitPriceCents !== shopSuppliesCents(labor)) throw new Error("Shop supplies must be 5% of labor, capped at $50.");
}
