import { PDFDocument, StandardFonts, rgb, type PDFFont } from "pdf-lib";
import { depositCurrency, depositDate, depositDisclosure } from "@/lib/customer-sales-deposits";
import { drawDealDeskPdfLogo } from "@/server/services/deal-desk-document-brand";
import { depositReceiptCustomerDetails, depositReceiptDealer, depositReceiptFields, depositReceiptSummary } from "./customer-deposit-receipt";
import type { DepositReceipt } from "./customer-sales-deposits";

function wrap(value: string, font: PDFFont, size: number, width: number) {
  const lines: string[] = [];
  for (const paragraph of value.normalize("NFC").split(/\r?\n/)) {
    let current = "";
    for (const word of paragraph.trim().split(/\s+/)) {
      if (current && font.widthOfTextAtSize(`${current} ${word}`, size) > width) {
        lines.push(current); current = "";
      }
      if (current) current += " ";
      for (const character of word) {
        if (current && font.widthOfTextAtSize(current + character, size) > width) {
          lines.push(current); current = "";
        }
        current += character;
      }
    }
    if (current) lines.push(current);
  }
  return lines;
}

export async function renderDepositReceiptPdf(receipt: DepositReceipt) {
  const pdf = await PDFDocument.create();
  const normal = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const ink = rgb(.08, .14, .24), muted = rgb(.30, .35, .45);
  let page = pdf.addPage([612, 792]);
  let y = 750;
  const left = 42, right = 570;
  function reserve(height: number) {
    if (y - height >= 40) return;
    page = pdf.addPage([612, 792]);
    y = 750;
  }
  function line(value: string, size = 11, emphasis = false) {
    const font = emphasis ? bold : normal;
    for (const text of wrap(value, font, size, right - left)) {
      reserve(size + 4);
      page.drawText(text, { x: left, y, font, size, color: ink });
      y -= size + 4;
    }
  }

  const dealer = depositReceiptDealer(receipt);
  const split = 306;
  const rightColumn = 322;
  const headerTop = y;
  let logoSpace = 0;
  if (dealer.branded) {
    await drawDealDeskPdfLogo(pdf, page, { x: left, y: 724, width: 150 });
    logoSpace = 38;
  }
  type HeaderLine = { text: string; size: number; font: PDFFont; color: typeof ink };
  function headerLines(name: string, details: string[], width: number): HeaderLine[] {
    return [
      ...wrap(name, bold, 12, width).map(text => ({ text, size: 12, font: bold, color: ink })),
      ...details.flatMap(detail => wrap(detail, normal, 9.5, width)).map(text => ({ text, size: 9.5, font: normal, color: ink }))
    ];
  }
  const dealerLines = headerLines(dealer.name, dealer.details, split - left - 15);
  const customerLines = [
    { text: "CUSTOMER", size: 8, font: bold, color: muted },
    ...headerLines(receipt.customerName, depositReceiptCustomerDetails(receipt), right - rightColumn)
  ];
  // Both columns flow together so long contact details cannot overlap the receipt body.
  let dealerIndex = 0, customerIndex = 0;
  let leftY = headerTop - logoSpace, rightY = headerTop;
  let top = headerTop;
  do {
    while (dealerIndex < dealerLines.length && leftY >= 62) {
      const item = dealerLines[dealerIndex++];
      page.drawText(item.text, { x: left, y: leftY, font: item.font, size: item.size, color: item.color });
      leftY -= item.size + 3;
    }
    while (customerIndex < customerLines.length && rightY >= 62) {
      const item = customerLines[customerIndex++];
      page.drawText(item.text, { x: rightColumn, y: rightY, font: item.font, size: item.size, color: item.color });
      rightY -= item.size + 3;
    }
    y = Math.min(leftY, rightY) - 2;
    page.drawLine({ start: { x: split, y: top + 9 }, end: { x: split, y: y + 5 }, thickness: .8, color: rgb(.55, .60, .68) });
    page.drawLine({ start: { x: left, y }, end: { x: right, y }, thickness: 2.5, color: ink });
    if (dealerIndex >= dealerLines.length && customerIndex >= customerLines.length) break;
    page = pdf.addPage([612, 792]);
    top = leftY = rightY = 750;
  } while (true);

  y -= 26;
  reserve(83);
  line("Deposit agreement and receipt", 20, true);
  const summaryX = [left, 293, 463];
  const summaryWidths = [238, 155, 107];
  let summaryBottom = y;
  depositReceiptSummary(receipt).forEach(([label, value], index) => {
    const x = summaryX[index];
    page.drawText(label, { x, y, size: 8.5, font: bold, color: muted });
    let valueY = y - 14;
    for (const text of wrap(value, bold, 10, summaryWidths[index])) {
      page.drawText(text, { x, y: valueY, size: 10, font: bold, color: ink });
      valueY -= 13;
    }
    summaryBottom = Math.min(summaryBottom, valueY);
  });
  page.drawLine({ start: { x: left, y: summaryBottom + 4 }, end: { x: right, y: summaryBottom + 4 }, thickness: .7, color: rgb(.55, .60, .68) });
  y = summaryBottom - 10;
  for (const [label, value] of depositReceiptFields(receipt)) line(`${label}: ${value}`);
  if (receipt.refundedAt) {
    y -= 6;
    line(`Full refund recorded: ${depositCurrency(receipt.amountCents)} · ${depositDate(receipt.refundedAt)} Central${receipt.vehicleId || receipt.kind === "RESERVATION" ? " · Deposit hold released" : ""}`, 11, true);
  }
  y -= 12;
  line("Deposit agreement", 13, true);
  for (const term of receipt.terms.split("\n")) { line(term); y -= 4; }
  reserve(100);
  line(depositDisclosure, 10, true);
  y -= 10;
  line("Purchaser signature _________________________  Date ___________");
  y -= 9;
  line("Dealership representative ____________________  Date ___________");
  pdf.setTitle("Deposit agreement and receipt");
  return pdf.save();
}
