import { describe, expect, it } from "vitest";
import { writeFile } from "node:fs/promises";
import { PDFDocument, PDFName } from "pdf-lib";
import { createServiceDocumentPdf, serviceDocumentFilename } from "@/server/repair-order/service-document-pdf";
import type { ServiceDocumentContent } from "@/server/repair-order/service-documents";
import { CUSTOMER_ESTIMATE_APPROVAL_NOTE } from "@/lib/service-document-notes";
export const pdfFixture: ServiceDocumentContent = {
  title: "Repair Estimate", number: "RO-SAMPLE / v2", issuedAt: "2026-10-29T16:00:00Z",
  identity: { customer: "Sample Customer", customerContact: { phone: "612-555-0100", email: "customer@example.test", address: "123 Example St, Minneapolis, MN" }, vehicle: "2018 Honda CR-V", vin: "SAMPLE-VIN-1234567", vehicleNumber: "VEH-SAMPLE", odometer: { reading: 125430, unit: "MILES", observedAt: "2026-10-29T15:00:00Z" }, color: "Gray", stockNumber: "TMS-204", concern: "Inspect and replace front brake pads and rotors.", repairOrderNumber: "RO-SAMPLE", store: "Time Motor Sales - Minneapolis", address: "1101 E. Lake Street, Minneapolis, MN 55407", timezone: "America/Chicago" },
  lines: [
    { key: "labor", type: "LABOR", description: "Replace front brake pads and rotors", quantity: 1, hours: 2, planningHourlyRateCents: 12500, unitPriceCents: 25000, totalCents: 25000 },
    { key: "pads", type: "PART", description: "Front brake pad set (PAD-123)", quantity: 1, unitPriceCents: 5000, totalCents: 5000 },
    { key: "rotors", type: "PART", description: "Front brake rotor (ROT-456)", quantity: 2, unitPriceCents: 6000, totalCents: 12000 },
    { key: "supplies", type: "FEE", description: "Shop supplies", quantity: 1, unitPriceCents: 1250, totalCents: 1250 },
  ], totals: { subtotalCents: 43250, discountCents: 2500, taxCents: 1121, totalCents: 41871 },
  notes: ["Valid until 2026-11-05T16:00:00Z.", CUSTOMER_ESTIMATE_APPROVAL_NOTE],
};
describe("direct saved-document PDFs", () => {
  it("generates a branded Letter PDF without changing saved amounts or identity", async () => {
    const original = JSON.stringify(pdfFixture);
    const bytes = await createServiceDocumentPdf(pdfFixture), pdf = await PDFDocument.load(bytes);
    expect(pdf.getPageCount()).toBe(1);
    expect(pdf.getPages()[0].getSize()).toEqual({ width: 612, height: 792 });
    expect(pdf.getPages()[0].node.Resources()?.get(PDFName.of("XObject"))).toBeTruthy();
    expect(pdf.getTitle()).toBe("Repair Estimate - RO-SAMPLE / v2");
    expect(JSON.stringify(pdfFixture)).toBe(original);
  });
  it("paginates long work lists and descriptions with repeated headers and page numbers", async () => {
    const lines = Array.from({ length: 65 }, (_, index) => ({ ...pdfFixture.lines[1], key: `part-${index}`, description: `Service item ${index + 1}: Inspect and replace the listed vehicle component, verify the installation and retain the approved repair details.` }));
    const bytes = await createServiceDocumentPdf({ ...pdfFixture, lines, totals: { subtotalCents: 325000, discountCents: 2500, taxCents: 22575, totalCents: 345075 } });
    const pdf = await PDFDocument.load(bytes);
    expect(pdf.getPageCount()).toBeGreaterThan(2);
    for (const page of pdf.getPages()) expect(page.getSize()).toEqual({ width: 612, height: 792 });
    if (process.env.SERVICE_PDF_SAMPLE_OUTPUT) await writeFile(process.env.SERVICE_PDF_SAMPLE_OUTPUT, bytes);
  });
  it("exports receipt payment details and refuses to silently replace unsupported customer text", async () => {
    const receipt = { ...pdfFixture, title: "Payment Receipt", receipt: { invoiceNumber: "INV-SAMPLE", kind: "PAYMENT", amountCents: 20000, method: "CARD", reference: "Sample verified payment", balanceCents: 21871 }, lines: [], totals: undefined, notes: ["Please retain this receipt for your records."] };
    expect((await PDFDocument.load(await createServiceDocumentPdf(receipt))).getPageCount()).toBe(1);
    await expect(createServiceDocumentPdf({ ...pdfFixture, identity: { ...pdfFixture.identity, customer: "Customer 🚙" } })).rejects.toThrow("browser printing to preserve its text");
  });
  it("sanitizes download names without allowing response header injection", () => {
    expect(serviceDocumentFilename("RO-123 / v2")).toBe("RO-123-v2.pdf");
    expect(serviceDocumentFilename('RO\r\nInjected: yes')).not.toMatch(/[\r\n:]/);
  });
});
