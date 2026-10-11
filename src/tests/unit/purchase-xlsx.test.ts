import { describe, expect, it } from "vitest";
import ExcelJS from "exceljs";
import { purchaseXlsxCsv } from "@/server/inventory-transfer/purchase-xlsx";
async function workbook(setup: (workbook: ExcelJS.Workbook) => void) { const book = new ExcelJS.Workbook(); setup(book); return Buffer.from(await book.xlsx.writeBuffer()); }
describe("bounded purchase XLSX reading", () => {
  it("reads dates and preserves zero-formatted stock numbers", async () => {
    const bytes = await workbook(book => { const sheet = book.addWorksheet("Purchases"); sheet.addRow(["VIN", "Stock", "Purchase date"]); sheet.addRow(["1HGCM82633A004352", 123, new Date("2026-10-01T00:00:00Z")]); sheet.getCell("B2").numFmt = "000000"; });
    expect(await purchaseXlsxCsv(bytes)).toContain("00123");
    expect(await purchaseXlsxCsv(bytes)).toContain("2026-10-01");
  });
  it("rejects formulas, multiple populated sheets and excessive dimensions", async () => {
    await expect(purchaseXlsxCsv(await workbook(book => { const sheet = book.addWorksheet("Purchases"); sheet.getCell("A1").value = { formula: "1+1", result: 2 }; }))).rejects.toThrow("formulas");
    await expect(purchaseXlsxCsv(await workbook(book => { book.addWorksheet("One").getCell("A1").value = "VIN"; book.addWorksheet("Two").getCell("A1").value = "VIN"; }))).rejects.toThrow("one populated");
    await expect(purchaseXlsxCsv(await workbook(book => { book.addWorksheet("One").getCell("A502").value = "VIN"; }))).rejects.toThrow("500");
  });
  it("rejects corrupt or unsupported workbook content", async () => { await expect(purchaseXlsxCsv(Buffer.from("not a workbook"))).rejects.toThrow("Invalid XLSX"); });
});
