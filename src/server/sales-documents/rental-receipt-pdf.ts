import { PDFDocument, StandardFonts, rgb, type PDFPage } from "pdf-lib";
import { CLAIM_AUTHORIZATION_HEADER } from "@/lib/claim-customer-authorization";
import { RENTAL_PAYMENT_METHODS, type RentalReceipt } from "@/lib/rental-payment";
import { dealDeskLogoHtml, drawDealDeskPdfLogo } from "@/server/services/deal-desk-document-brand";

const adjustments: Record<NonNullable<RentalReceipt["status"]>, string> = {
  REVERSED: "Reversed",
  REFUNDED: "Refunded",
  PARTIALLY_REFUNDED: "Partially refunded"
};

const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const chicagoTime = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Chicago", year: "numeric", month: "short", day: "numeric",
  hour: "numeric", minute: "2-digit", timeZoneName: "short"
});
const money = (value: number | null) => value === null ? "Not recorded" : currency.format(value / 100);
const brand = CLAIM_AUTHORIZATION_HEADER;

export class RentalReceiptUnsupportedTextError extends Error {
  constructor() {
    super("The rental receipt PDF cannot preserve characters in its saved text.");
    this.name = "RentalReceiptUnsupportedTextError";
  }
}

function customerReference(reference: string) {
  return reference.replace(/(?:\d[\s-]?){8,}\d/g, value => "Ending in " + value.replace(/\D/g, "").slice(-4));
}

function receiptDisplay(receipt: RentalReceipt) {
  const payment: Array<[string, string]> = [
    ["Receipt number", receipt.receiptNumber],
    ["Recorded (Central)", chicagoTime.format(new Date(receipt.receivedAt))],
    ["Business date (Central)", receipt.businessDate],
    ["Payment method", RENTAL_PAYMENT_METHODS[receipt.method]],
    ["Purpose", "Rental charge"]
  ];
  if (receipt.reference?.trim()) payment.push(["Payment reference", customerReference(receipt.reference)]);
  payment.push(["Received by", receipt.receivedBy]);
  if (receipt.adjustedCents !== undefined) payment.push(["Adjustment amount", money(receipt.adjustedCents)]);

  const rental: Array<[string, string]> = [["Customer", receipt.customerName], ["Deal number", receipt.dealNumber]];
  if (receipt.vehicle?.trim()) rental.push(["Vehicle", receipt.vehicle]);
  if (receipt.vin?.trim()) rental.push(["VIN", receipt.vin]);
  rental.push(
    ["Agreed rental amount", money(receipt.agreedCents)],
    ["Net payments recorded", money(receipt.netPaidCents)],
    ["Remaining balance", money(receipt.balanceCents)],
    ["Credit", money(receipt.creditCents)]
  );
  return {
    amountLabel: receipt.status || receipt.adjustedCents !== undefined ? "Original payment" : "Amount received",
    amount: money(receipt.amountCents),
    status: receipt.status ? adjustments[receipt.status] : null,
    sections: [
      { heading: "Payment details", fields: payment },
      { heading: "Rental and balance at payment", fields: rental }
    ]
  };
}

function escapeHtml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}

export function renderRentalReceiptHtml(receipt: RentalReceipt): string {
  const display = receiptDisplay(receipt);
  const details = display.sections.map(({ heading, fields }) => `<section><h2>${escapeHtml(heading)}</h2><dl>${fields.map(([label, value]) =>
    `<div class="row"><dt>${escapeHtml(label)}</dt><dd dir="auto">${escapeHtml(value.trim() || "Not recorded")}</dd></div>`
  ).join("")}</dl></section>`).join("");
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Rental payment receipt - ${escapeHtml(receipt.receiptNumber)}</title>
<style>
  @page { size: letter; margin: .6in; }
  * { box-sizing: border-box; }
  body { max-width: 700px; margin: 32px auto; padding: 0 20px; color: #142940; font: 14px/1.45 system-ui, sans-serif; }
  header { display: flex; align-items: center; flex-wrap: wrap; gap: 16px 28px; border-bottom: 2px solid #1f4f85; padding-bottom: 18px; }
  header img { width: 226px !important; max-width: 100% !important; margin: 0 !important; }
  header strong { font-size: 16px; }
  header p, footer { color: #526174; margin: 0; }
  h1 { font-size: 30px; margin: 20px 0 12px; }
  h2 { font-size: 16px; margin: 20px 0 8px; padding-bottom: 5px; border-bottom: 1px solid #d1dce6; break-after: avoid; }
  .amount { display: flex; align-items: center; flex-wrap: wrap; justify-content: space-between; gap: 8px; background: #f0f7fc; border: 1px solid #d1dce6; padding: 12px 16px; break-inside: avoid; }
  .amount strong { display: block; font-size: 26px; }
  .amount .status { color: #1f4f85; font-weight: 700; }
  dl, dd { margin: 0; }
  .row { display: grid; grid-template-columns: minmax(0, 30%) minmax(0, 1fr); gap: 12px; margin: 7px 0; break-inside: avoid; }
  dt { color: #526174; }
  dd { overflow-wrap: anywhere; text-align: start; }
  footer { border-top: 1px solid #d1dce6; margin-top: 24px; padding-top: 8px; font-size: 12px; }
  @media print { body { margin: 0; padding: 0; } }
</style></head><body>
<header>${dealDeskLogoHtml()}<div><strong>${escapeHtml(brand.name)}</strong><p>${escapeHtml(brand.address)}</p><p>${escapeHtml(brand.phone)}</p></div></header>
<main><h1>Rental payment receipt</h1><div class="amount"><div>${escapeHtml(display.amountLabel)}<strong>${escapeHtml(display.amount)}</strong></div>
${display.status ? `<div class="status">${escapeHtml(display.status)}</div>` : ""}</div>${details}</main>
<footer>Keep this receipt for your records.</footer></body></html>`;
}

export async function renderRentalReceiptPdf(receipt: RentalReceipt): Promise<Uint8Array> {
  const display = receiptDisplay(receipt);
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica), bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const ink = rgb(.08, .16, .25), muted = rgb(.32, .38, .46), rule = rgb(.82, .86, .9);
  const accent = rgb(.12, .31, .52), tint = rgb(.94, .97, .99);
  const left = 44, right = 568, valueX = 203, bottom = 62;
  let page: PDFPage = pdf.addPage([612, 792]);
  let cursor = 0;

  function draw(value: string, x: number, y: number, size = 11, emphasis = false, color = ink) {
    page.drawText(value, { x, y, size, font: emphasis ? bold : font, color });
  }

  function horizontalRule(y: number, color = rule, thickness = .7) {
    page.drawLine({ start: { x: left, y }, end: { x: right, y }, color, thickness });
  }

  function wrap(value: string) {
    const text = value.replace(/\s+/g, " ").trim().normalize("NFC") || "Not recorded";
    try { font.encodeText(text); } catch (error) {
      if (error instanceof Error && error.message.startsWith("WinAnsi cannot encode ")) throw new RentalReceiptUnsupportedTextError();
      throw error;
    }
    const lines: string[] = [];
    const width = right - valueX;
    let line = "";
    for (const word of text.split(" ")) {
      if (line && font.widthOfTextAtSize(line + " " + word, 11) > width) {
        lines.push(line);
        line = "";
      }
      if (line) line += " ";
      for (const character of word) {
        if (line && font.widthOfTextAtSize(line + character, 11) > width) {
          lines.push(line);
          line = "";
        }
        line += character;
      }
    }
    if (line) lines.push(line);
    return lines;
  }

  function reserve(height: number) {
    if (cursor - height >= bottom) return false;
    page = pdf.addPage([612, 792]);
    draw(brand.name, left, 746, 12, true);
    draw("Rental payment receipt (continued)", left, 727, 11);
    horizontalRule(713, accent);
    cursor = 691;
    return true;
  }

  function section(label: string) {
    reserve(50);
    draw(label, left, cursor, 12, true);
    horizontalRule(cursor - 8);
    cursor -= 30;
  }

  function field(label: string, value: string) {
    const lines = wrap(value);
    for (const [index, line] of lines.entries()) {
      const continued = reserve(15);
      if (index === 0 || continued) draw(continued && index > 0 ? label + " (continued)" : label, left, cursor, 10, false, muted);
      draw(line, valueX, cursor);
      cursor -= 15;
    }
    cursor -= 7;
  }

  await drawDealDeskPdfLogo(pdf, page, { x: left, y: 712, width: 226 });
  draw(brand.name, 304, 741, 13, true);
  draw(brand.address, 304, 723, 10, false, muted);
  draw(brand.phone, 304, 708, 10, false, muted);
  horizontalRule(690, accent, 2);
  draw("Rental payment receipt", left, 652, 26, true);

  page.drawRectangle({ x: left, y: 562, width: right - left, height: 68, color: tint, borderColor: rule, borderWidth: .7 });
  draw(display.amountLabel, left + 15, 611, 10, true, muted);
  draw(display.amount, left + 15, 577, 24, true);
  if (display.status) draw(display.status, 356, 591, 13, true, accent);

  cursor = 531;
  for (const { heading, fields } of display.sections) {
    section(heading);
    for (const [label, value] of fields) field(label, value);
    cursor -= 12;
  }

  const pages = pdf.getPages();
  pages.forEach((sheet, index) => {
    sheet.drawLine({ start: { x: left, y: 47 }, end: { x: right, y: 47 }, color: rule, thickness: .7 });
    sheet.drawText("Keep this receipt for your records.", { x: left, y: 31, size: 8, font, color: muted });
    const number = (index + 1) + " / " + pages.length;
    sheet.drawText(number, { x: right - font.widthOfTextAtSize(number, 8), y: 31, size: 8, font, color: muted });
  });
  pdf.setTitle("Rental payment receipt - " + receipt.receiptNumber);
  pdf.setAuthor(brand.name);
  return pdf.save();
}
