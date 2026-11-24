import { writeFile } from "node:fs/promises";
import { decodePDFRawStream, PDFArray, PDFDocument, PDFName, PDFRawStream } from "pdf-lib";
import { describe, expect, it } from "vitest";
import type { RentalReceipt } from "@/lib/rental-payment";
import { RentalReceiptUnsupportedTextError, renderRentalReceiptHtml, renderRentalReceiptPdf } from "@/server/sales-documents/rental-receipt-pdf";

const receipt: RentalReceipt = {
  receiptNumber: "RNT-1049-01",
  receivedAt: "2026-11-24T01:05:00.000Z",
  businessDate: "2026-11-23",
  amountCents: 12345,
  method: "CARD_TERMINAL",
  reference: "Terminal A8K321",
  customerName: "José Rivera",
  dealNumber: "1049",
  vehicle: "2019 Honda Accord",
  vin: "1HGCV2F31KA026441",
  receivedBy: "Morgan Lee",
  purpose: "RENTAL_CHARGE",
  agreedCents: 20000,
  netPaidCents: 12345,
  balanceCents: 7655,
  creditCents: 0
};

function receiptText(pdf: PDFDocument) {
  return pdf.getPages().flatMap(page => {
    const contents = page.node.Contents();
    const streams = contents instanceof PDFArray ? contents.asArray().map(ref => pdf.context.lookup(ref)) : [contents];
    return streams.flatMap(stream => {
      if (!(stream instanceof PDFRawStream)) return [];
      const operators = Buffer.from(decodePDFRawStream(stream).decode()).toString("ascii");
      return [...operators.matchAll(/<([0-9a-f]+)> Tj/gi)].map(match => Buffer.from(match[1], "hex").toString("latin1"));
    });
  });
}

describe("rental receipt PDF", () => {
  it("renders the branded Letter receipt with Central time and unchanged payment snapshots", async () => {
    const before = structuredClone(receipt);
    const bytes = await renderRentalReceiptPdf(receipt);
    expect(bytes).toBeInstanceOf(Uint8Array);
    const pdf = await PDFDocument.load(bytes);
    expect(pdf.getPageCount()).toBe(1);
    expect(pdf.getPage(0).getSize()).toEqual({ width: 612, height: 792 });
    expect(pdf.getPage(0).node.Resources()?.get(PDFName.of("XObject"))).toBeDefined();
    expect(pdf.getTitle()).toBe("Rental payment receipt - RNT-1049-01");
    expect(pdf.getAuthor()).toBe("Time Motor Sales, Inc.");
    const text = receiptText(pdf);
    expect(text).toEqual(expect.arrayContaining([
      "Time Motor Sales, Inc.", "1101 E. Lake Street, Minneapolis, MN 55407", "612-724-3631",
      "Amount received", "$123.45", "RNT-1049-01", "Recorded (Central)", "2026-11-23", "Rental charge", "Card terminal",
      "Terminal A8K321", "José Rivera", "Morgan Lee", "1049", "2019 Honda Accord", receipt.vin,
      "$200.00", "$76.55", "$0.00"
    ]));
    expect(text.find(line => line.includes("7:05 PM CST"))).toContain("Nov 23, 2026");
    expect(receipt).toEqual(before);
    if (process.env.RENTAL_RECEIPT_PDF_SAMPLE) await writeFile(process.env.RENTAL_RECEIPT_PDF_SAMPLE, bytes);
  });

  it("shows an adjustment and current totals without exposing a long payment number", async () => {
    const bytes = await renderRentalReceiptPdf({
      ...receipt, reference: "Terminal 4111-1111-1111-4242", status: "PARTIALLY_REFUNDED", adjustedCents: 2300,
      agreedCents: null, netPaidCents: 10045, balanceCents: null, creditCents: 10045
    });
    const pdf = await PDFDocument.load(bytes);
    const text = receiptText(pdf);
    expect(text).toEqual(expect.arrayContaining([
      "Original payment", "$123.45", "Partially refunded", "Adjustment amount", "$23.00",
      "Terminal Ending in 4242", "Not recorded", "$100.45"
    ]));
    expect(text.join(" ")).not.toContain("4111");
    expect(text).not.toContain("Amount received");
    if (process.env.RENTAL_RECEIPT_ADJUSTMENT_PDF_SAMPLE) await writeFile(process.env.RENTAL_RECEIPT_ADJUSTMENT_PDF_SAMPLE, bytes);
  });

  it.each([["REVERSED", "Reversed"], ["REFUNDED", "Refunded"]] as const)(
    "labels %s without guessing an adjustment amount",
    async (status, label) => {
      const text = receiptText(await PDFDocument.load(await renderRentalReceiptPdf({ ...receipt, status })));
      expect(text).toEqual(expect.arrayContaining(["Original payment", label]));
      expect(text).not.toContain("Adjustment amount");
    }
  );

  it.each([["CASH", "Cash"], ["CHECK", "Check"], ["TRANSFER", "Bank transfer"]] as const)(
    "labels %s and omits absent reference and vehicle details",
    async (method, label) => {
      const pdf = await PDFDocument.load(await renderRentalReceiptPdf({ ...receipt, method, reference: null, vehicle: null, vin: null }));
      const text = receiptText(pdf);
      expect(text).toContain(label);
      for (const absent of ["Payment reference", "Vehicle", "VIN"]) expect(text).not.toContain(absent);
    }
  );

  it("wraps long saved text and keeps amount rows on the document", async () => {
    const pdf = await PDFDocument.load(await renderRentalReceiptPdf({ ...receipt, customerName: "LongCustomerName".repeat(100) }));
    expect(pdf.getPageCount()).toBeGreaterThan(1);
    expect(receiptText(pdf)).toEqual(expect.arrayContaining(["Rental payment receipt (continued)", "Remaining balance", "$76.55"]));
  });

  it("signals unsupported PDF text and preserves Unicode in the branded printable fallback", async () => {
    const unicodeReceipt: RentalReceipt = {
      ...receipt, receiptNumber: 'RNT-<&"\'',
      customerName: '李美 & <script>alert("receipt")</script>', receivedBy: "أمينة", method: "TRANSFER",
      businessDate: "2026-11-20", reference: "Terminal 4111-1111-1111-4242", status: "REFUNDED", adjustedCents: 12345
    };
    await expect(renderRentalReceiptPdf(unicodeReceipt)).rejects.toBeInstanceOf(RentalReceiptUnsupportedTextError);
    const fallback = renderRentalReceiptHtml(unicodeReceipt);
    expect(fallback).toContain('<meta charset="utf-8">');
    expect(fallback).toContain('src="data:image/png;base64,');
    expect(fallback).toContain("@page { size: letter;");
    expect(fallback).toContain("<title>Rental payment receipt - RNT-&lt;&amp;&quot;&#39;</title>");
    expect(fallback).toContain("李美 &amp; &lt;script&gt;alert(&quot;receipt&quot;)&lt;/script&gt;");
    expect(fallback).toContain('dir="auto">أمينة');
    expect(fallback).toContain("<dt>Recorded (Central)</dt>");
    expect(fallback).toContain("7:05 PM CST");
    expect(fallback).toContain('Business date (Central)</dt><dd dir="auto">2026-11-20');
    expect(fallback).toContain("Bank transfer");
    expect(fallback).toContain("Refunded");
    expect(fallback).toContain('Adjustment amount</dt><dd dir="auto">$123.45');
    expect(fallback).toContain("Ending in 4242");
    expect(fallback).not.toContain("<script");
    expect(fallback).not.toContain("4111");
  });

  it("keeps invalid timestamps separate from unsupported PDF text", async () => {
    await expect(renderRentalReceiptPdf({ ...receipt, receivedAt: "invalid" })).rejects.toBeInstanceOf(RangeError);
  });
});
