import Papa from "papaparse";

export const IMPORT_FIELDS = [
  ["vin", "VIN"], ["stockNumber", "Stock number"], ["vehicleNumber", "Vehicle number"],
  ["year", "Year"], ["make", "Make"], ["model", "Model"], ["color", "Color"],
  ["nonVinReason", "Non-VIN exception reason"],
] as const;
export const EXPORT_FIELDS = [...IMPORT_FIELDS.filter(([key]) => key !== "nonVinReason"),
  ["inventoryNumber", "Inventory number"], ["lifecycleStage", "Stage"],
  ["operatingState", "State"], ["location", "Location"], ["financialAcquiredAt", "Acquired at"],
] as const;
export type ImportField = typeof IMPORT_FIELDS[number][0];
export type Mapping = Partial<Record<ImportField, string>>;
export type TransferRow = { row: number; status: "READY" | "INVALID" | "DUPLICATE" | "CREATED" | "REVIEW" | "FAILED"; vehicle: string; message: string; values?: Record<string, string>; vehicleId?: string };
export type ImportPreview = { batchId: string; expiresAt: string; rows: TransferRow[] };
export const MAX_IMPORT_ROWS = 500;
export const MAX_CSV_BYTES = 2 * 1024 * 1024;

export function parseInventoryCsv(csv: string) {
  if (new TextEncoder().encode(csv).length > MAX_CSV_BYTES) throw new Error("CSV must be 2 MB or smaller.");
  const result = Papa.parse<string[]>(csv.replace(/^\uFEFF/, ""), { skipEmptyLines: "greedy" });
  if (result.errors.length) throw new Error(`Invalid CSV: ${result.errors[0].message}`);
  const [rawHeaders, ...rows] = result.data;
  const headers = rawHeaders?.map(header => header.trim()) ?? [];
  if (!headers.length || headers.some(header => !header) || new Set(headers).size !== headers.length) throw new Error("CSV needs unique, non-empty column headers.");
  if (headers.length > 60) throw new Error("CSV supports at most 60 columns.");
  if (!rows.length || rows.length > MAX_IMPORT_ROWS) throw new Error(`CSV must contain 1 to ${MAX_IMPORT_ROWS} vehicle rows.`);
  if (rows.some(row => row.length !== headers.length)) throw new Error("Every CSV row must have the same number of columns as the header.");
  if (rows.some(row => row.some(cell => cell.length > 500))) throw new Error("CSV values must be 500 characters or fewer.");
  return { headers, rows };
}

export function suggestMapping(headers: string[]): Mapping {
  const compact = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");
  return Object.fromEntries(IMPORT_FIELDS.flatMap(([key, label]) => {
    const header = headers.find(value => [compact(key), compact(label)].includes(compact(value)));
    return header ? [[key, header]] : [];
  }));
}

export function mapInventoryCsv(csv: string, mapping: Mapping) {
  const { headers, rows } = parseInventoryCsv(csv);
  const selected = IMPORT_FIELDS.map(([key]) => mapping[key]).filter(Boolean);
  if (new Set(selected).size !== selected.length) throw new Error("Each source column can only be mapped once.");
  if (selected.some(header => !headers.includes(header!))) throw new Error("Mapped column was not found in the CSV.");
  if (!mapping.vin && !mapping.nonVinReason) throw new Error("Map VIN or a documented non-VIN exception reason.");
  return rows.map(row => Object.fromEntries(IMPORT_FIELDS.flatMap(([key]) => mapping[key] ? [[key, row[headers.indexOf(mapping[key]!)].trim()]] : [])));
}

export function inventoryCsv(headers: string[], rows: (string | number | null)[][]) {
  return "\uFEFF" + Papa.unparse({ fields: headers, data: rows }, { escapeFormulae: true, newline: "\r\n" });
}
