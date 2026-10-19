export const PURCHASE_FIELDS = [
  ["vin", "VIN"], ["stockNumber", "Stock number"], ["year", "Year"], ["make", "Make"], ["model", "Model"],
  ["seller", "Seller / auction"], ["boughtFrom", "Purchase location"], ["buyer", "Buyer"],
  ["source", "Acquisition source"],
  ["acquiredOn", "Purchase date"], ["reference", "Invoice / sale reference"],
  ["purchasePrice", "Vehicle purchase price (USD)"], ["buyerFee", "Buyer fee (USD)"],
  ["transportFee", "Transport fee (USD)"], ["otherFees", "Other fees (USD)"], ["taxes", "Taxes (USD)"], ["credits", "Credits (USD)"], ["invoiceTotal", "Invoice total (USD)"],
  ["odometer", "Odometer"], ["condition", "Condition"],
] as const;
export type PurchaseField = typeof PURCHASE_FIELDS[number][0];
export type PurchaseValues = Partial<Record<PurchaseField, string>>;
export const PURCHASE_HEADER_ALIASES: Partial<Record<PurchaseField, string[]>> = {
  vin: ["vehicle identification number"], stockNumber: ["stock", "stock no"], seller: ["auction", "vendor", "purchased from"],
  acquiredOn: ["purchase date", "sale date", "date purchased"], reference: ["invoice number", "invoice no", "transaction id"],
  purchasePrice: ["purchase cost", "vehicle cost", "hammer price", "sale price"], invoiceTotal: ["total due", "total amount"], odometer: ["mileage", "acquired mileage"], source: ["purchase source"],
};
export type PurchaseReading = { values: PurchaseValues; evidence: Partial<Record<PurchaseField, string>>; warnings: string[]; category: "AUCTION_INVOICE" | "BILL_OF_SALE" | "VEHICLE_RECORD" | "UNKNOWN" };
export type PurchaseRead = PurchaseReading & { readId: string; fileName: string; method: string; text: string };
export type PurchaseReview = { previewId: string; vehicleId: string | null; vehicleLabel: string; existing: boolean; allocations: { field: string; current: string; proposed: string; conflict: boolean }[]; warnings: string[] };
export type PurchaseImportJob = {
  readId: string; fileName: string; vin: string; createdAt: string;
  status: "NEEDS_REVIEW" | "READY" | "FAILED" | "IMPORTED" | "UNDONE" | "SCANNING" | "PROCESSING" | "APPLYING" | "QUARANTINED" | "RETRIED";
  expired: boolean; message: string; vehicleId: string | null;
  version?: number; assignedToUserId?: string;
};
export type PurchaseImportHistory = { jobs: PurchaseImportJob[]; nextCursor: string | null; metrics?: { failed: number; stalled: number }; canManage?: boolean };

export function moneyCents(value: string) {
  const clean = value.trim().replace(/^\$\s*/, "");
  if (!/^(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d{1,2})?$/.test(clean)) throw new Error("Enter a non-negative USD amount with at most two decimal places.");
  const [whole, fraction = ""] = clean.replaceAll(",", "").split(".");
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  if (!Number.isSafeInteger(cents) || cents > 2_000_000_000) throw new Error("Purchase amount is outside the supported range.");
  return cents;
}
export function purchaseAmount(values: PurchaseValues) {
  return reconcilePurchase(values).totalCents;
}
export function reconcilePurchase(values: PurchaseValues) {
  const has = (key: PurchaseField) => !!values[key]?.trim();
  const base = has("purchasePrice") ? moneyCents(values.purchasePrice!) : null;
  const total = has("invoiceTotal") ? moneyCents(values.invoiceTotal!) : null;
  const components = Object.fromEntries((["buyerFee", "transportFee", "otherFees", "taxes", "credits"] as const).map(key => [key, has(key) ? moneyCents(values[key]!) : 0])) as Record<"buyerFee" | "transportFee" | "otherFees" | "taxes" | "credits", number>;
  const fees = components.buyerFee + components.transportFee + components.otherFees + components.taxes;
  const computed = base === null ? null : base + fees - components.credits;
  if (base !== null && total !== null && computed !== total) throw new Error("Invoice total does not match vehicle price plus entered fees and taxes minus credits. Reconcile the amounts before saving.");
  if (base === null && (fees || components.credits) && total === null) throw new Error("Enter vehicle price or invoice total before allocating fees or credits.");
  const amount = total ?? computed;
  if (amount === 0) throw new Error("Purchase amount must be positive or left pending.");
  if (amount !== null && (!Number.isSafeInteger(amount) || amount < 0 || amount > 2_000_000_000)) throw new Error("Reconciled purchase amount is outside the supported range.");
  if (base === null && total !== null && fees - components.credits > total) throw new Error("Purchase components exceed the invoice total.");
  return { currency: "USD" as const, vehicleCents: base, ...components, invoiceTotalCents: total, totalCents: amount, basis: base === null ? "INVOICE_TOTAL_ONLY" : "RECONCILED_COMPONENTS" };
}

// Only labeled, unambiguous values are suggested. Never infer purchase price from an asking price.
export function readPurchaseText(text: string): PurchaseReading {
  const values: PurchaseValues = {}, evidence: PurchaseReading["evidence"] = {}, warnings: string[] = [];
  const lines = text.replace(/\r/g, "").split("\n").map(line => line.trim()).filter(Boolean);
  const vins = [...new Set((text.toUpperCase().match(/\b[A-HJ-NPR-Z0-9]{17}\b/g) ?? []).filter(vin => /[A-HJ-NPR-Z]/.test(vin) && /\d/.test(vin)))];
  if (vins.length === 1) { values.vin = vins[0]; evidence.vin = lines.find(line => line.toUpperCase().includes(vins[0])) ?? vins[0]; }
  if (vins.length > 1) warnings.push("Multiple VINs found. Split the document by vehicle before importing.");
  const labels: Partial<Record<PurchaseField, string>> = {
    stockNumber: "stock(?: number| no\\.?| #)?", year: "(?:model )?year", make: "make", model: "model",
    seller: "seller|auction(?: name)?", boughtFrom: "purchase location|auction location", buyer: "buyer|purchaser",
    source: "acquisition source|purchase source",
    acquiredOn: "purchase date|sale date|invoice date", reference: "invoice(?: number| no\\.?| #)|sale reference|transaction(?: number| id)",
    purchasePrice: "purchase price|vehicle price|hammer price|sale price", buyerFee: "buyer(?:'s)? fee|auction fee",
    transportFee: "transport(?:ation)? fee|shipping fee", otherFees: "other fees", taxes: "tax|taxes|sales tax", credits: "credit|credits|discount|rebate", invoiceTotal: "invoice total|total due|total amount",
    odometer: "odometer|mileage", condition: "condition",
  };
  for (const [key, label] of Object.entries(labels) as [PurchaseField, string][]) {
    const pattern = new RegExp(`^(?:${label})\\s*[:#=]\\s*(.+)$`, "i");
    const labelOnly = new RegExp(`^(?:${label})\\s*[:#=]?\\s*$`, "i");
    const found = lines.flatMap((line, index) => {
      const match = line.match(pattern);
      if (match) return [{ value: match[1].trim(), line }];
      const next = lines[index + 1];
      if (labelOnly.test(line) && next && !/^[A-Za-z][^:]*:/.test(next)) return [{ value: next, line: `${line} ${next}` }];
      if (["purchasePrice", "buyerFee", "transportFee", "otherFees", "taxes", "credits", "invoiceTotal", "odometer", "year"].includes(key)) {
        const numeric = line.match(new RegExp(`^(?:${label})\\s+(\\$?\\s*[\\d,]+(?:\\.\\d{1,2})?(?:\\s+miles)?)$`, "i"));
        if (numeric) return [{ value: numeric[1], line }];
      }
      return [];
    });
    const distinct = [...new Set(found.map(item => item.value))];
    if (distinct.length === 1) { values[key] = distinct[0]; evidence[key] = found[0].line; }
    else if (distinct.length > 1) warnings.push(`Conflicting ${PURCHASE_FIELDS.find(([field]) => field === key)![1]} values; review manually.`);
  }
  if (values.acquiredOn) {
    const date = values.acquiredOn.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (date) values.acquiredOn = `${date[3]}-${date[1].padStart(2, "0")}-${date[2].padStart(2, "0")}`;
  }
  if (values.odometer) values.odometer = values.odometer.replaceAll(",", "").replace(/\s*(?:mi|miles)\.?$/i, "");
  const category = /auction|hammer price/i.test(text) ? "AUCTION_INVOICE" : /bill of sale/i.test(text) ? "BILL_OF_SALE" : /vin|vehicle/i.test(text) ? "VEHICLE_RECORD" : "UNKNOWN";
  if (!values.source && category === "AUCTION_INVOICE") values.source = "AUCTION";
  if (!values.source && category === "BILL_OF_SALE") values.source = "DIRECT_PURCHASE";
  if (values.source) values.source = values.source.toUpperCase().replace(/[ -]+/g, "_");
  warnings.push("Suggested values require review against the original document. Missing fields remain pending.");
  return { values, evidence, warnings, category };
}
