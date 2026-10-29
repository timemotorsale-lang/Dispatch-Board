import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { drawDealDeskPdfLogo } from "@/server/services/deal-desk-document-brand";
import { customerDocumentNotes, legacyReceiptDetails } from "@/lib/service-document-notes";
import type { ServiceDocumentContent } from "./service-documents";

const money = (cents: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
export function serviceDocumentFilename(number: string) {
  return `${number.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 100) || "service-document"}.pdf`;
}
export async function createServiceDocumentPdf(content: ServiceDocumentContent) {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica), bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const ink = rgb(.09, .16, .25), muted = rgb(.32, .39, .47), rule = rgb(.79, .83, .88);
  const left = 40, right = 572, bottom = 62;
  let page!: PDFPage;
  let y = 0;
  const clean = (value: string) => {
    const text = value.replace(/[\r\n\t]+/g, " ").replace(/\s+/g, " ").trim();
    try { font.encodeText(text); } catch { throw new Error("This document needs browser printing to preserve its text. Use Print instead of Save PDF."); }
    return text;
  };
  const lines = (value: string, width: number, size = 9, face: PDFFont = font) => {
    const result: string[] = [];
    let row = "";
    for (const word of clean(value).split(" ")) {
      if (row && face.widthOfTextAtSize(`${row} ${word}`, size) > width) { result.push(row); row = ""; }
      for (const character of word) {
        if (row && face.widthOfTextAtSize(row + character, size) > width) { result.push(row); row = ""; }
        row += character;
      }
      row += " ";
    }
    if (row.trim()) result.push(row.trim());
    return result.length ? result : [""];
  };
  const draw = (text: string, x: number, at: number, size = 9, face: PDFFont = font) => page.drawText(clean(text), { x, y: at, size, font: face, color: ink });
  const addPage = () => {
    page = pdf.addPage([612, 792]); y = 746;
    draw("TIME MOTOR SALES  |  SERVICE DEPARTMENT", left, y, 9, bold);
    const reference = clean(content.number);
    const referenceLines = lines(reference, 240, 8);
    referenceLines.forEach((line, index) => draw(line, right - font.widthOfTextAtSize(line, 8), y - index * 11, 8));
    y -= Math.max(26, referenceLines.length * 11 + 12);
    page.drawLine({ start: { x: left, y: y + 7 }, end: { x: right, y: y + 7 }, thickness: .7, color: rule });
  };
  const space = (height: number) => { if (y - height < bottom) addPage(); };
  const paragraph = (text: string, size = 9, face: PDFFont = font, width = right - left, x = left) => {
    for (const line of lines(text, width, size, face)) { space(size + 5); draw(line, x, y, size, face); y -= size + 5; }
  };
  addPage();
  await drawDealDeskPdfLogo(pdf, page!, { x: left, y: y - 36, width: 212 });
  const title = /^(Official repair estimate|Repair Estimate)/i.test(content.title) ? "Repair Estimate" : content.title;
  const titleLines = lines(title, 270, 20, bold);
  titleLines.forEach((line, index) => draw(line, 300, y - 12 - index * 25, 20, bold));
  y -= Math.max(54, titleLines.length * 25 + 10);
  paragraph(content.identity.store, 9, bold);
  paragraph(content.identity.address, 8);
  paragraph("timemotorsale@gmail.com  |  timemotors.net", 8);
  const issued = new Date(content.issuedAt).toLocaleString("en-US", { timeZone: content.identity.timezone, year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  paragraph(`Issued: ${issued}  |  Repair order: ${content.identity.repairOrderNumber}`, 8);
  y -= 10;
  paragraph(content.identity.customer, 11, bold);
  const contact = content.identity.customerContact;
  if (contact) paragraph([contact.phone, contact.email, contact.address].filter(Boolean).join("  |  "), 8);
  const identity = content.identity;
  paragraph([identity.vehicle, `VIN: ${identity.vin}`, `Mileage: ${identity.odometer ? `${identity.odometer.reading.toLocaleString("en-US")} ${identity.odometer.unit === "KILOMETERS" ? "km" : "mi"}` : "Not recorded"}`, identity.licensePlate ? `Plate: ${[identity.licensePlate, identity.licensePlateState].filter(Boolean).join(" ")}` : "", identity.color ? `Color: ${identity.color}` : "", identity.stockNumber ? `Stock #: ${identity.stockNumber}` : `Vehicle ID: ${identity.vehicleNumber}`].filter(Boolean).join("  |  "), 8);
  y -= 5; paragraph(`Service requested: ${identity.concern}`, 9); y -= 14;
  const receipt = content.receipt ?? legacyReceiptDetails(content);
  if (receipt) {
    space(135); paragraph(receipt.kind === "PAYMENT" ? "Payment received" : receipt.kind === "REFUND" ? "Refund recorded" : "Invoice adjustment", 13, bold);
    for (const [label, value] of [["Invoice", receipt.invoiceNumber], [receipt.kind === "PAYMENT" ? "Amount paid" : "Amount", money(receipt.amountCents)], ["Payment method", receipt.method?.replaceAll("_", " ") ?? "Adjustment"], ["Reference", receipt.reference], ["Remaining balance", money(receipt.balanceCents)]]) paragraph(`${label}: ${value}`, 10);
  } else {
    const heading = () => {
      space(30);
      page.drawRectangle({ x: left, y: y - 6, width: right - left, height: 22, color: rgb(.94, .96, .98) });
      draw("Work / item", left + 6, y, 9, bold); draw("Qty", 370, y, 9, bold); draw("Rate / price", 412, y, 9, bold); draw("Amount", 520, y, 9, bold); y -= 27;
    };
    heading();
    for (const line of content.lines.filter(item => item.type !== "FEE")) {
      const detail = line.hours == null ? "" : `${line.hours.toFixed(2)} labor hours${line.planningHourlyRateCents == null ? "" : ` x ${money(line.planningHourlyRateCents)}/hr`}`;
      const description = [...lines(line.description.replace(/\s*\(\s*\)$/, ""), 304), ...(detail ? lines(detail, 304, 8) : [])];
      let index = 0;
      while (index < description.length) {
        if (y - 28 < bottom) { addPage(); heading(); }
        const room = Math.max(1, Math.floor((y - bottom - 10) / 13));
        const segment = description.slice(index, index + room);
        segment.forEach((text, offset) => draw(text, left + 6, y - offset * 13, 9));
        if (!index) for (const [value, edge] of [[String(line.quantity), 390], [money(line.unitPriceCents), 489], [money(line.totalCents), right - 6]] as const) draw(value, edge - font.widthOfTextAtSize(value, 9), y, 9);
        y -= segment.length * 13 + 13; index += segment.length;
        page.drawLine({ start: { x: left, y: y + 12 }, end: { x: right, y: y + 12 }, thickness: .5, color: rule });
        if (index < description.length) { addPage(); heading(); }
      }
    }
    const fees = content.lines.filter(line => line.type === "FEE");
    if (fees.length) { space(45); paragraph("Other charges", 10, bold); for (const fee of fees) { const label = lines(fee.description, 410); space(label.length * 14 + 8); const at = y; paragraph(fee.description, 9, font, 410); draw(money(fee.totalCents), right - font.widthOfTextAtSize(money(fee.totalCents), 9), at); y -= 4; } }
  }
  if (content.totals) {
    space(115); y -= 10;
    for (const [label, value] of [["Subtotal", content.totals.subtotalCents], ["Discount", content.totals.discountCents], ["Tax", content.totals.taxCents], ["Total", content.totals.totalCents]] as const) {
      const size = label === "Total" ? 13 : 10, face = label === "Total" ? bold : font;
      draw(label, 365, y, size, face); const amount = money(value); draw(amount, right - face.widthOfTextAtSize(amount, size), y, size, face); y -= label === "Total" ? 28 : 20;
    }
  }
  if (content.decision) {
    y -= 8; paragraph(`Approval: ${content.decision.disposition}`, 10, bold);
    paragraph(`Recorded by ${content.decision.actor} via ${content.decision.channel}. Reference: ${content.decision.reference ?? "Not supplied"}.`, 9);
    for (const [label, keys] of [["Approved", content.decision.approvedLineKeys], ["Declined", content.decision.declinedLineKeys], ["Undecided", content.decision.undecidedLineKeys]] as const) paragraph(`${label}: ${keys.map(key => content.lines.find(line => line.key === key)?.description ?? key).join("; ") || "None"}`, 8);
  }
  y -= 8;
  for (const note of customerDocumentNotes(content.notes.filter(note => !receipt || !note.startsWith("Original invoice ")), content.identity.timezone)) { paragraph(note, 8); y -= 4; }
  pdf.getPages().forEach((sheet, index) => {
    sheet.drawLine({ start: { x: left, y: 44 }, end: { x: right, y: 44 }, thickness: .6, color: rule });
    sheet.drawText("Thank you for choosing Time Motor Sales.", { x: left, y: 30, size: 8, font, color: muted });
    const label = `Page ${index + 1} of ${pdf.getPageCount()}`; sheet.drawText(label, { x: right - font.widthOfTextAtSize(label, 8), y: 30, size: 8, font, color: muted });
  });
  pdf.setTitle(`${title} - ${content.number}`); pdf.setAuthor("Time Motor Sales"); pdf.setCreator("Time Motor Sales Service Documents");
  return pdf.save();
}
