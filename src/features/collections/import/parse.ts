/**
 * Reads a DealerCenter export (.csv or .xlsx) into typed rows.
 * - Column names are trimmed and matched case-insensitively (DealerCenter adds leading spaces).
 * - Unknown extra columns are reported, never fatal.
 * - Every problem is collected with its row number so the preview can show it.
 */
import ExcelJS from "exceljs";
import Papa from "papaparse";

import { parseBusinessDate, parseMoneyToCents, parseWholeNumber } from "../domain/money-dates";
import type { ImportProfile } from "./profiles";

export type RawTable = { headers: string[]; rows: unknown[][] };
export type ParsedRow = { rowNumber: number; values: Record<string, string | number | null> };
export type ParseIssue = { rowNumber: number | null; column?: string; message: string };
export type ParseResult = {
  rows: ParsedRow[];
  errors: ParseIssue[];
  unknownColumns: string[];
  missingColumns: string[];
};

export const MAX_IMPORT_BYTES = 10 * 1024 * 1024;
export const MAX_IMPORT_ROWS = 20_000;

export function normalizeHeader(value: unknown) {
  return String(value ?? "").replace(/﻿/g, "").trim().toLowerCase();
}

function cellValue(value: unknown): unknown {
  if (value === null || value === undefined) return null;
  if (value instanceof Date || typeof value !== "object") return value;
  const v = value as Record<string, unknown>;
  if ("result" in v) return cellValue(v.result);
  if (Array.isArray(v.richText)) return v.richText.map(part => (part as { text?: string }).text ?? "").join("");
  if ("text" in v) return String(v.text);
  return null;
}

export async function readTable(bytes: Uint8Array, fileName: string): Promise<RawTable> {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".csv")) {
    const text = new TextDecoder("utf-8").decode(bytes);
    const parsed = Papa.parse<string[]>(text, { skipEmptyLines: "greedy" });
    const [headers = [], ...rows] = parsed.data;
    return { headers: headers.map(String), rows };
  }
  if (lower.endsWith(".xlsx")) {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(Buffer.from(bytes) as unknown as ArrayBuffer);
    const sheet = workbook.worksheets[0];
    if (!sheet) return { headers: [], rows: [] };
    const all: unknown[][] = [];
    sheet.eachRow({ includeEmpty: false }, row => {
      const values = Array.isArray(row.values) ? row.values.slice(1) : [];
      all.push(values.map(cellValue));
    });
    const [headers = [], ...rows] = all;
    return { headers: headers.map(value => String(value ?? "")), rows };
  }
  throw new Error("Upload a .xlsx or .csv file exported from DealerCenter.");
}

export function parseTable(table: RawTable, profile: ImportProfile): ParseResult {
  const errors: ParseIssue[] = [];
  const index = new Map<string, number>();
  table.headers.forEach((header, position) => {
    const key = normalizeHeader(header);
    if (key && !index.has(key)) index.set(key, position);
  });
  const known = new Set(profile.fields.flatMap(field => field.columns.map(normalizeHeader)));
  const unknownColumns = table.headers.map(h => String(h).trim()).filter(h => h && !known.has(normalizeHeader(h)));
  const positions = new Map<string, number>();
  const missingColumns: string[] = [];
  for (const field of profile.fields) {
    const position = field.columns.map(normalizeHeader).map(column => index.get(column)).find(value => value !== undefined);
    if (position === undefined) {
      if (field.required) missingColumns.push(field.columns[0]);
      continue;
    }
    positions.set(field.field, position);
  }
  if (missingColumns.length) {
    errors.push({ rowNumber: null, message: `The file is missing required column(s): ${missingColumns.join(", ")}. Check that this is the ${profile.label.startsWith("DealerCenter") ? profile.label : `DealerCenter "${profile.label}"`} export.` });
    return { rows: [], errors, unknownColumns, missingColumns };
  }
  if (table.rows.length > MAX_IMPORT_ROWS) {
    errors.push({ rowNumber: null, message: `The file has ${table.rows.length} rows. The limit is ${MAX_IMPORT_ROWS}.` });
    return { rows: [], errors, unknownColumns, missingColumns };
  }

  const rows: ParsedRow[] = [];
  const seen = new Map<string, number>();
  table.rows.forEach((raw, offset) => {
    const rowNumber = offset + 2; // header is row 1
    if (raw.every(cell => cell === null || cell === undefined || String(cell).trim() === "")) return;
    const values: Record<string, string | number | null> = {};
    let rowOk = true;
    for (const field of profile.fields) {
      const position = positions.get(field.field);
      const cell = position === undefined ? null : raw[position];
      const column = field.columns[0];
      let parsed: string | number | null | undefined;
      if (field.kind === "money") parsed = parseMoneyToCents(cell);
      else if (field.kind === "int") parsed = parseWholeNumber(cell);
      else if (field.kind === "date") parsed = parseBusinessDate(cell);
      else parsed = cell === null || cell === undefined ? null : String(cell instanceof Date ? cell.toISOString().slice(0, 10) : cell).trim() || null;
      if (parsed === undefined) {
        errors.push({ rowNumber, column, message: `Row ${rowNumber}: "${column}" isn't a valid ${field.kind === "money" ? "dollar amount" : field.kind === "int" ? "whole number" : "date"}.` });
        rowOk = false;
        values[field.field] = null;
        continue;
      }
      if (field.required && (parsed === null || parsed === "")) {
        errors.push({ rowNumber, column, message: `Row ${rowNumber}: "${column}" is empty but required.` });
        rowOk = false;
      }
      values[field.field] = parsed;
    }
    const key = profile.matchFields.map(field => values[field]).find(value => value !== null && value !== "");
    if (key !== undefined && !profile.allowRepeatedMatch) {
      const firstRow = seen.get(String(key));
      if (firstRow !== undefined) {
        errors.push({ rowNumber, column: profile.fields[0].columns[0], message: `Row ${rowNumber}: AccountId ${key} also appears on row ${firstRow}. Each account may appear only once.` });
        rowOk = false;
      } else {
        seen.set(String(key), rowNumber);
      }
    }
    if (rowOk) rows.push({ rowNumber, values });
  });
  return { rows, errors, unknownColumns, missingColumns };
}
