import { performance } from "node:perf_hooks";
import ExcelJS from "exceljs";
import Papa from "papaparse";
import { describe, expect, it } from "vitest";
import { purchaseXlsxCsv } from "@/server/inventory-transfer/purchase-xlsx";
import { readPurchaseText, reconcilePurchase } from "@/lib/inventory-purchase-import";

describe("synthetic purchase capacity and extraction checks", () => {
  it("reads twenty maximum-row workbooks in bounded concurrent groups", async () => {
    const workbook = new ExcelJS.Workbook(), sheet = workbook.addWorksheet("Purchases");
    sheet.addRow(["VIN", "Stock", "Purchase Cost"]);
    for (let row = 0; row < 500; row++) sheet.addRow(["1HGCM82633A004352", `S${row}`, "6000"]);
    const bytes = Buffer.from(await workbook.xlsx.writeBuffer()), started = performance.now();
    const initialMemory = process.memoryUsage().rss;
    let rows = 0;
    for (let group = 0; group < 5; group++) {
      const results = await Promise.all(Array.from({ length: 4 }, () => purchaseXlsxCsv(bytes)));
      for (const csv of results) { const result = Papa.parse(csv, { header: true }); expect(result.errors).toHaveLength(0); expect(result.data).toHaveLength(500); rows += result.data.length; }
    }
    expect(rows).toBe(10000);
    console.info(JSON.stringify({ proof: "synthetic-parser-only", files: 20, rows, concurrency: 4, milliseconds: Math.round(performance.now() - started), rssChangeBytes: process.memoryUsage().rss - initialMemory }));
  }, 30_000);
  it("allocates labeled financial components without using advertised prices", () => {
    const result = readPurchaseText("Auction: Synthetic Auction\nVIN: 1HGCM82633A004352\nHammer Price: $6000\nBuyer Fee: $300\nSales Tax: $100\nCredit: $50\nInvoice Total: $6350\nAsking Price: $15000");
    expect(result.values).toMatchObject({ purchasePrice: "$6000", buyerFee: "$300", taxes: "$100", credits: "$50", invoiceTotal: "$6350" });
    expect(reconcilePurchase(result.values).totalCents).toBe(635000);
    const conflict = readPurchaseText("Purchase Price: $6000\nPurchase Price: $7000");
    expect(conflict.values.purchasePrice).toBeUndefined(); expect(conflict.warnings.some(warning => warning.includes("Conflicting"))).toBe(true);
  });
});
