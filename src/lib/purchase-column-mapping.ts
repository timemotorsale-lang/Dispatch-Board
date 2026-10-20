import { PURCHASE_FIELDS, type PurchaseField } from "./inventory-purchase-import";
export type PurchaseColumnMapping = Partial<Record<PurchaseField, string>>;
export function validatePurchaseColumnMapping(value: unknown, headers: string[]): PurchaseColumnMapping {
  if (!value || typeof value !== "object" || Array.isArray(value) || headers.length > 60 || headers.some(header => typeof header !== "string" || header.length > 200)) throw new Error("Invalid purchase column mapping.");
  const mapping: PurchaseColumnMapping = {};
  for (const [key, header] of Object.entries(value)) {
    if (!PURCHASE_FIELDS.some(([field]) => field === key) || typeof header !== "string" || header.length > 200) throw new Error("Choose supported purchase fields and columns.");
    if (header && !headers.includes(header)) throw new Error(`Mapped column is missing: ${header}`);
    if (header) mapping[key as PurchaseField] = header;
  }
  if (!mapping.vin) throw new Error("Map a VIN column before importing.");
  if (new Set(Object.values(mapping)).size !== Object.values(mapping).length) throw new Error("Map each source column to one purchase field.");
  return mapping;
}
