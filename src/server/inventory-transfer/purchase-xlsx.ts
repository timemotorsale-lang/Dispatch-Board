import { Unzip, UnzipInflate } from "fflate";
import ExcelJS from "exceljs";
import Papa from "papaparse";
export const XLSX_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
export async function purchaseXlsxCsv(bytes: Buffer) {
  if (bytes.length > 10 * 1024 * 1024 || bytes.subarray(0, 4).toString("hex") !== "504b0304") throw new Error("Invalid XLSX workbook.");
  let total = 0, entries = 0;
  const names = new Set<string>();
  const unzip = new Unzip(file => {
    if (++entries > 200 || names.has(file.name) || /(?:^|\/)\.\.(?:\/|$)|^\/|\\|vbaProject|externalLinks/i.test(file.name) || (file.originalSize ?? 0) > 25 * 1024 * 1024) throw new Error("Workbook contains unsafe or oversized content.");
    names.add(file.name);
    file.ondata = (error, chunk) => {
      if (error) throw new Error("Invalid or encrypted workbook.");
      total += chunk.length;
      if (total > 25 * 1024 * 1024) { file.terminate(); throw new Error("Workbook expanded size exceeds 25 MB."); }
    };
    file.start();
  });
  unzip.register(UnzipInflate);
  for (let offset = 0; offset < bytes.length; offset += 1024) unzip.push(bytes.subarray(offset, offset + 1024), offset + 1024 >= bytes.length);
  if (!names.has("xl/workbook.xml")) throw new Error("Choose an XLSX workbook.");
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(bytes as unknown as Parameters<typeof workbook.xlsx.load>[0]);
  const sheets = workbook.worksheets.filter(sheet => sheet.actualRowCount > 0);
  if (sheets.length !== 1) throw new Error("Workbook must contain exactly one populated sheet. Export each sheet separately.");
  const sheet = sheets[0];
  if (sheet.rowCount > 501 || sheet.columnCount > 60) throw new Error("Workbook exceeds 500 data rows or 60 columns.");
  const rows: string[][] = [];
  for (let number = 1; number <= sheet.rowCount; number++) {
    const row = sheet.getRow(number), values: string[] = [];
    for (let column = 1; column <= sheet.columnCount; column++) {
      const cell = row.getCell(column);
      if (cell.type === ExcelJS.ValueType.Formula || cell.type === ExcelJS.ValueType.Error) throw new Error("Workbook formulas and error cells must be replaced with reviewed values.");
      if (cell.value instanceof Date) values.push(cell.value.toISOString().slice(0, 10));
      else if (typeof cell.value === "number" && /^0+$/.test(cell.numFmt)) values.push(String(cell.value).padStart(cell.numFmt.length, "0"));
      else values.push(cell.text);
    }
    rows.push(values);
  }
  return Papa.unparse(rows);
}
