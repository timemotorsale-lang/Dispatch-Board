import { parseBusinessDate, parseMoneyToCents } from "@/features/collections/domain/money-dates";
import { parseInventoryCsv } from "@/lib/inventory-transfer";

export const dealerCenterKinds = ["INVENTORY", "SALES"] as const;
export type DealerCenterKind = (typeof dealerCenterKinds)[number];

type Field = { key: string; label: string; aliases: string[]; required?: boolean };
const identityFields: Field[] = [
  { key: "vin", label: "VIN", aliases: ["Vehicle VIN", "VIN Number"] },
  { key: "stock", label: "Stock number", aliases: ["Stock", "Stock #", "Stock No", "StockNum", "Vehicle Stock Number"] },
];
export const dealerCenterFields: Record<DealerCenterKind, Field[]> = {
  INVENTORY: [
    { ...identityFields[0], required: true }, identityFields[1],
    { key: "status", label: "Inventory status", aliases: ["Status", "Vehicle Status", "Stock Status"], required: true },
    { key: "cost", label: "Reported cost", aliases: ["Cost", "Total Cost", "Inventory Cost", "Total Vehicle Cost", "Vehicle Cost"] },
    { key: "price", label: "Asking price", aliases: ["Retail Price", "Selling Price", "Advertised Price", "List Price"] },
  ],
  SALES: [
    { key: "deal", label: "Deal number", aliases: ["Deal #", "Deal No", "Deal ID", "DealNumber"], required: true },
    { key: "date", label: "Sold date", aliases: ["Sale Date", "Deal Date", "Date Sold", "Transaction Date", "Delivery Date"], required: true },
    { key: "amount", label: "Sale price", aliases: ["Selling Price", "Vehicle Sale Price", "Sold Price", "Cash Price", "Vehicle Price"], required: true },
    { key: "status", label: "Deal status", aliases: ["Status", "Sales Status", "Sale Status"] },
    ...identityFields,
  ],
};

export type InventoryReportRow = { vin: string; stock: string; status: string; costCents: number | null; priceCents: number | null };
export type SaleReportRow = { deal: string; date: string; amountCents: number; vin: string; stock: string };
export type DealerCenterReportRow = InventoryReportRow | SaleReportRow;
export type DealerCenterMapping = Record<string, string>;
export type DealerCenterIssue = { row: number; message: string };

function headerKey(label: string) {
  return label.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function dealerCenterSalesStatusHeaders(headers: string[]) {
  const field = dealerCenterFields.SALES.find(item => item.key === "status")!;
  const aliases = [field.label, ...field.aliases].map(headerKey);
  return headers.filter(header => aliases.includes(headerKey(header)));
}

export function suggestDealerCenterMapping(kind: DealerCenterKind, headers: string[]) {
  const guessed: DealerCenterMapping = {};
  for (const field of dealerCenterFields[kind]) {
    const accepted = [field.label, ...field.aliases].map(headerKey);
    const matches = headers.filter(header => accepted.includes(headerKey(header)));
    if (matches.length === 1) guessed[field.key] = matches[0];
  }
  return guessed;
}

function money(value: string, label: string) {
  if (!value) return null;
  if (!/^\$?(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d{1,2})?$/.test(value)) throw new Error(label + " must be a nonnegative US dollar amount.");
  const cents = parseMoneyToCents(value);
  if (cents == null || !Number.isSafeInteger(cents) || cents > 2_147_483_647) throw new Error(label + " is too large.");
  return cents;
}

const completedStatuses = new Set(["SOLD", "COMPLETED", "CLOSED", "DELIVERED", "FUNDED"]);

export function parseDealerCenterReport(kind: DealerCenterKind, csv: string, mapping: DealerCenterMapping, completedOnly = false) {
  const { headers, rows } = parseInventoryCsv(csv);
  const fields = dealerCenterFields[kind];
  const selected = fields.flatMap(field => mapping[field.key] ? [mapping[field.key]] : []);
  if (new Set(selected).size !== selected.length || selected.some(header => !headers.includes(header))) {
    throw new Error("Map each field to a different column from this file.");
  }
  const missing = fields.filter(field => field.required && !mapping[field.key]).map(field => field.label);
  if (missing.length) throw new Error("Map these required fields: " + missing.join(", ") + ".");
  if (kind === "SALES") {
    const statusHeaders = dealerCenterSalesStatusHeaders(headers);
    if (statusHeaders.length && !statusHeaders.includes(mapping.status)) throw new Error("Map the deal status column to verify that each sale is complete.");
    if (!statusHeaders.length && !completedOnly) throw new Error("Confirm that the export contains only completed sales.");
  }
  const currencyColumns = headers.flatMap((header, index) => ["currency", "currencycode"].includes(headerKey(header)) ? [index] : []);
  const seen = new Set<string>();
  const records: DealerCenterReportRow[] = [];
  const issues: DealerCenterIssue[] = [];
  rows.forEach((row, index) => {
    const read = (key: string) => row[headers.indexOf(mapping[key])]?.trim() ?? "";
    try {
      if (currencyColumns.some(column => row[column]?.trim() && row[column].trim().toUpperCase() !== "USD")) throw new Error("Use a USD report.");
      const vin = read("vin").toUpperCase();
      const stock = read("stock");
      if ((kind === "INVENTORY" || vin) && !/^[A-HJ-NPR-Z0-9]{17}$/.test(vin)) throw new Error("Enter a valid 17-character VIN.");
      const key = kind === "INVENTORY" ? vin : read("deal").toUpperCase();
      if (!key || key.length > 100) throw new Error("Enter a deal number of 100 characters or fewer.");
      if (seen.has(key)) throw new Error("This " + (kind === "INVENTORY" ? "VIN" : "deal number") + " appears more than once in the file.");
      if (kind === "INVENTORY") {
        const status = read("status").replace(/\s+/g, " ").toUpperCase();
        if (!status || status.length > 64) throw new Error("Enter a reported inventory status of 64 characters or fewer.");
        records.push({ vin, stock, status, costCents: money(read("cost"), "Reported cost"), priceCents: money(read("price"), "Asking price") });
      } else {
        const status = read("status").toUpperCase();
        if (mapping.status && !completedStatuses.has(status)) throw new Error("Include only completed sales. Review the deal status.");
        const date = parseBusinessDate(read("date"));
        if (!date) throw new Error("Enter a valid sold date.");
        const amountCents = money(read("amount"), "Sale price");
        if (amountCents === null) throw new Error("Enter the sale price.");
        records.push({ deal: key, date, amountCents, vin, stock });
      }
      seen.add(key);
    } catch (error) {
      issues.push({ row: index + 2, message: error instanceof Error ? error.message : "Invalid report row." });
    }
  });
  return { records, issues, totalRows: rows.length };
}
