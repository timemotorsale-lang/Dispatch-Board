import { readFile } from "node:fs/promises";
import path from "node:path";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { CLAIM_AUTHORIZATION_CLAUSES, CLAIM_AUTHORIZATION_HEADER, CLAIM_AUTHORIZATION_VERSION } from "@/lib/claim-customer-authorization";
import type { InsuranceClaimRecord } from "./service";

export async function createClaimCustomerAuthorizationPdf(claim: InsuranceClaimRecord) {
  const pdf = await PDFDocument.create(); const font = await pdf.embedFont(StandardFonts.Helvetica); const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const logo = await pdf.embedPng(await readFile(path.join(process.cwd(), "public/brand/time-motor-sales-horizontal.png")));
  let page = pdf.addPage([612, 792]); let y = 752;
  const ink = rgb(.08, .12, .18); const muted = rgb(.32, .37, .43);
  const line = (text: string, size = 9.5, heading = false) => { page.drawText(text, { x: 36, y, size, font: heading ? bold : font, color: heading ? ink : muted }); y -= size + 3; };
  const wrap = (text: string, size = 9.5) => {
    const words = text.replace(/\s+/g, " ").trim().split(" ").flatMap((word) => {
      const chunks: string[] = []; let chunk = "";
      for (const character of word) {
        if (chunk && font.widthOfTextAtSize(chunk + character, size) > 540) { chunks.push(chunk); chunk = ""; }
        chunk += character;
      }
      if (chunk) chunks.push(chunk);
      return chunks;
    }); let row = "";
    for (const word of words) {
      const candidate = row ? `${row} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, size) > 540 && row) { line(row, size); row = word; } else row = candidate;
    }
    if (row) line(row, size);
  };
  page.drawImage(logo, { x: 36, y: 740, ...logo.scaleToFit(125, 32) });
  page.drawText(CLAIM_AUTHORIZATION_HEADER.name, { x: 185, y: 760, font: bold, size: 12, color: ink });
  page.drawText(`${CLAIM_AUTHORIZATION_HEADER.address} | ${CLAIM_AUTHORIZATION_HEADER.phone}`, { x: 185, y: 746, font, size: 8, color: muted });
  page.drawText(`${CLAIM_AUTHORIZATION_HEADER.website} | ${CLAIM_AUTHORIZATION_HEADER.email}`, { x: 185, y: 733, font, size: 8, color: muted });
  y = 709; line("Claim Communication Authorization and Direction to Pay", 15, true); y -= 7;
  for (const fact of [
    `Customer: ${claim.customerName} | Phone: ${claim.customerPhone || "Not provided"}`,
    `Email: ${claim.customerEmail || "Not provided"}`,
    `Address: ${[claim.customerAddressLine1, claim.customerAddressLine2, claim.customerCity, claim.customerState, claim.customerPostalCode].filter(Boolean).join(", ") || "Not provided"}`,
    `Vehicle: ${[claim.vehicleYear, claim.vehicleMake, claim.vehicleModel].filter(Boolean).join(" ")} | VIN: ${claim.vehicleVin || "Not provided"}`,
    `Insurer: ${claim.carrierName || "Not provided"} | Claim: ${claim.claimNumber || "Pending"} | Loss date: ${claim.lossDate || "Not provided"}`,
    `Policy: ${claim.policyNumber || "Not provided"} | Lienholder (if applicable): ____________________`
  ]) wrap(fact, 9);
  y -= 8;
  for (const [title, content] of CLAIM_AUTHORIZATION_CLAUSES) {
    if (y < 140) { page = pdf.addPage([612, 792]); y = 752; }
    line(title, 9.5, true); wrap(content); y -= 6;
  }
  if (y < 130) { page = pdf.addPage([612, 792]); y = 752; }
  const check = pdf.getForm().createCheckBox("direction_to_pay");
  check.addToPage(page, { x: 36, y: y - 3, width: 11, height: 11, borderWidth: 1 });
  page.drawText("I also request direct payment as described in section 3 (optional).", { x: 55, y, font: bold, size: 9.5, color: ink }); y -= 27;
  line("Printed signer name: ________________________  Capacity: Owner / Authorized representative", 9);
  line("Representative's authority (if applicable): ______________________________________________", 9);
  y -= 6; line("Customer / authorized signer signature: __________________________  Date: ______________", 9);
  line("Dealership representative: __________________________  Copy provided on: ______________", 9);
  const pages = pdf.getPages(); pages.forEach((item, index) => item.drawText(`${CLAIM_AUTHORIZATION_VERSION} | Claim ${claim.id} | Signature required | ${index + 1}/${pages.length}`, { x: 36, y: 22, font, size: 6.5, color: muted }));
  pdf.setTitle("Claim Communication Authorization and Direction to Pay"); pdf.setAuthor(CLAIM_AUTHORIZATION_HEADER.name);
  return pdf.save();
}
