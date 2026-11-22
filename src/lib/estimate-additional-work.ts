import { serviceChargeLines, serviceQuoteTax, SHOP_SUPPLIES_KEY } from "./service-charges";
import type { CommercialLine } from "./service-commercial-ledger";

export const emptyAdditionalWork = { laborDescription: "", laborMinutes: "", laborLineKey: "", parts: [] as { description: string; partNumber: string; quantity: string; unitPrice: string }[], reason: "" };

export function additionalWorkLines(value: typeof emptyAdditionalWork, source: CommercialLine[], laborRate: number) {
  const description = typeof value.laborDescription === "string" ? value.laborDescription.trim() : "";
  const minutes = Number(value.laborMinutes);
  if (typeof value.reason !== "string" || !value.reason.trim() || value.reason.length > 350) throw new Error("Enter a reason for the additional work.");
  if (!Array.isArray(value.parts) || value.parts.length > 20) throw new Error("Add up to 20 parts per revision.");
  if (!description && !value.parts.length) throw new Error("Enter labor or add a part.");
  if ((description || value.laborMinutes) && (!description || description.length > 500 || !Number.isInteger(minutes) || minutes < 1 || minutes > 6000)) throw new Error("Enter the labor description and 1 to 6000 planned minutes.");

  const used = new Set(source.map(line => line.key));
  let sequence = 0;
  const nextKey = () => {
    let key: string;
    do { key = `additional-work-${++sequence}`; } while (used.has(key));
    used.add(key);
    return key;
  };
  const laborKey = description ? nextKey() : undefined;
  const labor = laborKey ? [{
    key: laborKey, type: "LABOR", description, quantity: 1,
    unitPriceCents: Math.round(minutes / 60 * laborRate * 100), taxable: false,
    laborGuideMinutes: minutes, workTypeCode: "LABOR", plannedCorrection: description,
  }] : [];
  const existingLabor = source.filter(line => line.type === "LABOR");
  const partLaborKey = laborKey ?? (existingLabor.length === 1 ? existingLabor[0].key : existingLabor.find(line => line.key === value.laborLineKey)?.key);
  if (value.parts.length && existingLabor.length && !partLaborKey) throw new Error("Choose the labor line for the added parts.");
  const parts = value.parts.map(part => {
    if (!part || typeof part.description !== "string" || typeof part.partNumber !== "string" || typeof part.unitPrice !== "string") throw new Error("Enter details for each part.");
    const description = part.description.trim(), partNumber = part.partNumber.trim();
    const quantity = Number(part.quantity), unitPriceCents = Math.round(Number(part.unitPrice) * 100);
    if (!description || description.length > 500 || !partNumber || partNumber.length > 100 || !Number.isInteger(quantity) || quantity < 1 || quantity > 1000 || !/^\d{1,5}(\.\d{1,2})?$/.test(part.unitPrice?.trim())) throw new Error("Enter a description, part number, whole quantity, and dollar price for each part.");
    return {
      key: nextKey(), type: "PART", description, partNumber, quantity, unitPriceCents,
      taxable: true, laborGuideMinutes: 0, workTypeCode: "PART", plannedCorrection: description,
      ...(partLaborKey ? { laborLineKey: partLaborKey } : {}),
    };
  });
  return [...labor, ...parts];
}

export function revisedWorkLines(source: CommercialLine[], additions: CommercialLine[]) {
  const lines = [...source.filter(line => line.key !== SHOP_SUPPLIES_KEY), ...additions];
  const laborCents = lines.filter(line => line.type === "LABOR").reduce((sum, line) => sum + line.quantity * line.unitPriceCents, 0);
  return [...lines, ...serviceChargeLines(laborCents, [], source.some(line => line.key === SHOP_SUPPLIES_KEY && line.taxable === true))];
}

export function revisedWorkTotals(lines: CommercialLine[], taxRatePercent: number, discountCents: number) {
  const subtotal = (items: CommercialLine[]) => items.reduce((sum, line) => sum + line.quantity * line.unitPriceCents, 0);
  const subtotalCents = subtotal(lines);
  const taxCents = serviceQuoteTax(subtotalCents, subtotal(lines.filter(line => line.type === "PART" ? line.taxable !== false : line.type === "FEE" && line.taxable === true)), taxRatePercent, discountCents);
  return { subtotalCents, taxCents, discountCents, totalCents: subtotalCents - discountCents + taxCents };
}
