import { cashSigningTemplate, cashSigningTemplatePdf } from "./cash-signing-templates";

import fs from "node:fs";
import path from "node:path";
import { PDFDocument, PDFTextField, StandardFonts, rgb } from "pdf-lib";
import { CASH_SALE_LABELS, cashCents, cashMoney, cashSaleTotals, type CashSaleFacts } from "@/lib/cash-retail-sale";

export type Input = { customerName: string; dealNumber: string; salePrice: string; facts: CashSaleFacts; vehicle: { vin: string; stockNumber: string; year: string; make: string; model: string; color: string } };
type Section = { title: string; rows?: Array<[string, string]>; paragraphs?: string[] };
const DISCLOSURE = "IMPORTANT: THIS MAY BE A BINDING CONTRACT AND YOU MAY LOSE ANY DEPOSITS IF YOU DO NOT PERFORM ACCORDING TO ITS TERMS.";
const safe = (s: string) => s.replace(/[\u2013\u2014]/g, "-").replace(/[\u2018\u2019]/g, "'").replace(/[\u201c\u201d]/g, '"');
const esc = (s: string) => s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
function sections(id: string, input: Input): Section[] {
  const f = input.facts, t = cashSaleTotals(input.salePrice, f), money = cashMoney;
  const identity: Section = { title: "Buyer and vehicle", rows: [["Buyer", input.customerName], ["Co-buyer", f.coBuyer], ["Buyer address", f.buyerAddress], ["Phone / email", [f.buyerPhone, f.buyerEmail].filter(Boolean).join(" / ")], ["Vehicle", `${input.vehicle.year} ${input.vehicle.make} ${input.vehicle.model}`], ["VIN", input.vehicle.vin], ["Stock / plate", `${input.vehicle.stockNumber} / ${f.plate} ${f.plateState}`], ["Sale date", f.saleDate]] };
  const prices: Section = { title: "Cash sale amounts", rows: [["Agreed vehicle price", money(t.sale)], ["Taxable accessories / labor", money(t.accessories)], ["Rebate", money(t.rebate)], ["Motor vehicle trade allowance", money(t.trade)], ["Trade payoff added to balance", money(t.payoff)], ["Taxable vehicle amount", money(t.taxable)], ["Motor vehicle sales tax", money(t.tax)], ["Document fee (not a government fee)", money(cashCents(f.docFee))], ["Title fees", money(cashCents(f.titleFee))], ["Registration / plates", money(cashCents(f.registrationFee))], [f.otherFeeLabel || "Other separately stated fees", money(cashCents(f.otherFee))], ["Total cash sale obligation", money(t.total)], ["Payment recorded by staff", money(t.paid)], ["Remaining balance", money(t.balance)], ["Tax basis / override reason", f.taxOverride ? f.taxReason : "6.875% of taxable vehicle amount; government and document fees separately stated"]] };
  const warranty: Section = { title: "Warranty terms", rows: [["Warranty election", f.warrantyType], ["Covered systems", f.warrantyType === "Dealer limited warranty" ? f.warrantyCoverage : "No dealer warranty elected; see exemption basis"], ["Duration / mileage", f.warrantyType === "Dealer limited warranty" ? f.warrantyDuration : "Not applicable to no-dealer-warranty election"], ["Dealer pays labor / parts", f.warrantyType === "Dealer limited warranty" ? `${f.warrantyLabor}% / ${f.warrantyParts}%` : "Not applicable"], ["Exemption basis, if applicable", f.warrantyExemption]], paragraphs: ["Any warranty required by Minnesota law applies regardless of this document or any as-is election. The final Buyers Guide forms part of this sale. An optional agreement does not reduce required coverage. Provide the full applicable written warranty with the packet."] };
  const title: Section = { title: "Title and registration filing", rows: [["Insurance company", f.insuranceCompany], ["Policy number", f.insurancePolicy], ["Policy expiration", f.insuranceExpiration], ["Title brand", f.titleBrand]], paragraphs: ["Complete the current official Minnesota DVS PS2000 application or MNDRIVE/VTAP transaction. This dealership worksheet is not a DVS application, a certificate of title, or proof of filing. Attach the actual assigned title, lien releases, signed application and registrar receipt."] };
  const payment: Section = { title: "Payment declaration", rows: [["Amount recorded by staff", money(t.paid)], ["Method", f.paymentMethod], ["Reference", f.paymentReference], ["Payment date", f.paymentDate], ["Balance", money(t.balance)]], paragraphs: [t.paid > 0 ? "Staff-entered payment record. Match the reference to the payment ledger and supporting receipt. Generation of this form does not verify cleared or settled funds." : "NO PAYMENT RECORDED. This document is not proof of payment or a receipt for money received."] };
  if (id === "sales-agreement") return [identity, prices, warranty, { title: "Agreement and written promises", rows: [["Promised repairs / items", f.promises || "None recorded"], ["Target completion", f.promiseDue]], paragraphs: ["Buyer agrees to purchase the identified vehicle at the itemized cash price. This is a cash sale; no installment financing is created. Payment, title filing and actual delivery are recorded separately. All promises and agreed repairs must be in writing. Buyer and dealer receive a completed copy of this agreement and its attachments."] }];
  if (id === "binding-contract-disclosure") return [identity, { title: "Before signing", paragraphs: ["Review the completed purchase agreement, all charges, payment obligations, warranty terms and written promises. Do not sign incomplete documents. The deposit-forfeiture portion may be crossed out at signing when forfeiture is not possible."] }];
  if (id === "odometer-disclosure") return [identity, { title: "Odometer certification", rows: [["Mileage (no tenths)", f.mileage], ["Mileage status", f.odometerStatus], ["Exemption basis, if applicable", f.odometerExemption]], paragraphs: ["Federal and state law require that you state the mileage upon transfer of ownership. Failure to complete or providing a false statement may result in fines and/or imprisonment. The transferor certifies that the reading and selected mileage status above are true to the best of the transferor's knowledge. Complete the required title or secure odometer disclosure where applicable; this supplemental form does not replace a required secure document."] }, { title: "Damage and title disclosure", rows: [["Title brand", f.titleBrand], ["Known damage disclosure", f.damageDisclosure]] }];
  if (id === "power-of-attorney") return [identity, { title: "Limited appointment", rows: [["Principal / vehicle owner", input.customerName], ["Additional principal", f.coBuyer], ["Attorney-in-fact / named agent", f.authorizedAgent], ["Dealership", f.dealerName], ["Expires", f.poaExpiration]], paragraphs: ["For the identified vehicle and sale only, I appoint the named agent to complete, sign where legally permitted, and submit title/registration applications and administrative corrections consistent with the completed sale documents; pay the stated filing taxes and fees; and receive related correspondence. This authority ends when the identified transfer is completed or on the expiration date, whichever occurs first. I may revoke it by written notice to the agent, subject to applicable law and acts already lawfully completed.", "This is not a general financial power of attorney. It does not authorize a new sale, borrowing, a new lien, changed price or ownership, receipt of sale proceeds, or waiver of statutory rights. It does not authorize signing both sides of an odometer disclosure or substitute for a required secure power of attorney. Use the required original secure authority and title documents when applicable."] }, { title: "Execution / acknowledgment", paragraphs: ["The principal(s) must review and sign this limited appointment. Agent acceptance and any acknowledgment required by the filing office must be completed before use. Do not prefill signatures, notarization or verification."] }];
  if (id === "tax-fee-receipt") return [{ ...identity, rows: identity.rows?.filter(([label]) => ["Buyer", "Vehicle", "VIN", "Sale date"].includes(label)) }, { ...prices, rows: prices.rows?.filter(([label]) => !["Payment recorded by staff", "Remaining balance"].includes(label)) }, { title: "Collection and filing status", paragraphs: ["This itemization records the sale calculation. It does not certify that taxes were remitted or accepted. Attach the actual deputy registrar / DVS receipt after filing. A payment record is separate from this calculation."] }];
  if (id === "title-registration-application") return [identity, { ...prices, rows: prices.rows?.filter(([label]) => ["Agreed vehicle price", "Taxable vehicle amount", "Motor vehicle sales tax", "Motor vehicle trade allowance", "Title fees", "Registration / plates", "Tax basis / override reason"].includes(label)) }, title];
  if (id === "title-assignment") return [identity, { ...title, rows: [["Title brand", f.titleBrand]] }, { title: "Attach original supporting documents", paragraphs: ["[ ] Assigned title or MCO.  [ ] Required buyer/seller signatures.", "[ ] Lien releases, if any.  [ ] Required secure reassignment / odometer authority.", "[ ] Signed official application or VTAP.  [ ] Filing confirmation / registrar receipt.", "Blank boxes mean not verified. This control sheet does not transfer ownership."] }];
  if (id === "funding-proof") return [identity, payment];
  if (id === "insurance-proof") return [identity, title, { title: "Coverage verification", paragraphs: ["Insurance details are entered by staff. Attach current proof and verify effective coverage for the vehicle and driver before releasing the vehicle. This record is not an insurer-issued binder."] }];
  if (id === "warranty-disclosure") return [identity, warranty];
  if (id === "we-owe") return [identity, { title: "Written promises / service requested", rows: [["Agreed repairs, parts or accessories", f.promises || "None recorded"], ["Target completion date", f.promiseDue]], paragraphs: ["Only the written items above are recorded as promises. Record who will perform the work, any customer charge and scheduling details before signing. Completion of work must be documented separately; a generated promise is not proof the work is done."] }];
  if (id === "trade-documents") return [identity, { title: "Trade-in and payoff", rows: [["Trade vehicle", f.tradeVehicle], ["VIN", f.tradeVin], ["Allowance", money(t.trade)], ["Payoff", money(t.payoff)], ["Lienholder", f.tradeLienholder]], paragraphs: ["Attach the actual trade title, signed disclosures, valid payoff quote and lien release. A payoff entered here is not a payment to the lienholder."] }];
  return [identity, { title: "Delivery acknowledgment", rows: [["Actual delivery date (complete at handoff)", f.deliveryDate], ["Odometer", f.mileage], ["Keys", f.keys], ["Fuel", f.fuel], ["Delivery notes", f.deliveryNotes]], paragraphs: ["Customer and staff sign only at actual delivery after checking vehicle identity, condition, keys, insurance and the required delivery documents. Generating this page does not release the vehicle or mark delivery complete."] }];
}
export function cashSaleDocumentHtml(id: string, input: Input) {
  if(cashSigningTemplate(id)) return `<html><body><h1>${esc(CASH_SALE_LABELS[id] || id)}</h1><p>Customer signing form - complete all applicable fields before signing</p><p>The generated PDF preserves the committed TMS-MN-SIGNING-1.0 form and HDR-02 header. Read all pages of the PDF. ${esc(input.dealNumber)} | ${esc(input.customerName)} | ${esc(input.vehicle.vin)}</p></body></html>`;
  return `<html><body><h1>${esc(CASH_SALE_LABELS[id] || id)}</h1><p>${esc(input.facts.dealerName)} | ${esc(input.dealNumber)}</p>${sections(id, input).map(s => `<h2>${esc(s.title)}</h2>${(s.rows || []).map(([k, v]) => `<p><b>${esc(k)}:</b> ${esc(v || "Not recorded")}</p>`).join("")}${(s.paragraphs || []).map(p => `<p>${esc(p)}</p>`).join("")}`).join("")}<p>Unsigned document. Review before signing.</p></body></html>`;
}
export async function cashSalePdf(id: string, input: Input) {
  if (id === "buyers-guide") return officialBuyersGuide(input);
  if (cashSigningTemplate(id)) return cashSigningTemplatePdf(id,input);
  const pdf = await PDFDocument.create(), font = await pdf.embedFont(StandardFonts.Helvetica), bold = await pdf.embedFont(StandardFonts.HelveticaBold), form = pdf.getForm();
  const logo = await pdf.embedPng(fs.readFileSync(path.join(process.cwd(),"public/brand/time-motor-sales-horizontal.png")));
  let page = pdf.addPage([612, 792]), y = 680, count = 0;
  const ink = rgb(.06, .12, .23), muted = rgb(.32, .38, .47);
  function header() {
    page.drawImage(logo,{x:40,y:739,width:225,height:225*logo.height/logo.width});
    page.drawText("Automotive Group Since 1955",{x:40,y:725,size:10,font:bold,color:ink});
    page.drawText("1101 E. Lake Street",{x:370,y:763,size:9,font,color:ink});
    page.drawText("Minneapolis, MN 55407",{x:370,y:749,size:9,font,color:ink});
    page.drawText("timemotors.net | timemotorsale@gmail.com | 612-724-3631",{x:122,y:707,size:9,font,color:ink});
    page.drawLine({start:{x:40,y:695},end:{x:570,y:695},thickness:1,color:rgb(.2,.32,.6)});
    page.drawText(safe(CASH_SALE_LABELS[id]), { x:40,y:675,size:13,font:bold,color:ink });
    page.drawText(safe(`${input.dealNumber} | ${input.facts.saleDate} | VIN ${input.vehicle.vin}`), { x:40,y:659,size:8,font,color:muted });
    page.drawText("Unsigned dealership document - review, complete and sign before use.", { x:36,y:22,size:8,font,color:muted });
    y = 638;
  }
  function space(height: number) { if (y - height < 52) { page = pdf.addPage([612, 792]); header(); } }
  function text(value: string, strong = false, size = 10) {
    const f = strong ? bold : font; let line = "";
    for (const word of safe(value).split(/\s+/)) { if (line && f.widthOfTextAtSize(`${line} ${word}`, size) > 530) { space(15); page.drawText(line, { x: 40, y, size, font: f, color: ink }); y -= 15; line = word; } else line = line ? `${line} ${word}` : word; }
    if (line) { space(15); page.drawText(line, { x: 40, y, size, font: f, color: ink }); y -= 15; }
  }
  function field(label: string, value: string, name?: string, x = 40, width = 530) {
    const height = Math.max(23, Math.ceil(value.length / Math.max(1, Math.floor(width / 5))) * 11 + 5);
    space(height + 28);
    page.drawText(safe(label).slice(0, width > 300 ? 95 : 46), { x, y, size: 8, font: bold, color: ink }); y -= 14;
    const f = form.createTextField(name || `cash_${id}_${count++}`); f.enableMultiline(); f.setText(safe(value));
    f.addToPage(page, { x, y: y - height + 2, width, height, borderWidth: .5, borderColor: rgb(.65, .71, .8), textColor: ink });
    f.setFontSize(9); y -= height + 8;
  }
  header();
  text(input.facts.dealerAddress, false, 9); text([input.facts.dealerPhone, input.facts.dealerEmail].filter(Boolean).join(" | "), false, 9); y -= 8;
  for (const section of sections(id, input)) {
    space(80); text(section.title, true, 12); y -= 4;
    const rows = section.rows || [];
    for (let i = 0; i < rows.length; i++) {
      if (rows[i][1].length > 65 || rows[i][0].length > 46) { field(rows[i][0], rows[i][1]); continue; }
      space(58); const rowY = y;
      field(rows[i][0], rows[i][1], undefined, 40, 258);
      if (rows[i + 1] && rows[i + 1][1].length <= 65 && rows[i + 1][0].length <= 46) { y = rowY; i++; field(rows[i][0], rows[i][1], undefined, 312, 258); }
    }
    for (const paragraph of section.paragraphs || []) { text(paragraph); y -= 6; }
    y -= 8;
  }
  const needsSignatures = !["title-registration-application", "tax-fee-receipt"].includes(id);
  if (needsSignatures) {
  space(input.facts.coBuyer ? 160 : 110);
  if (["sales-agreement", "binding-contract-disclosure"].includes(id)) { space(210); text(DISCLOSURE, true, 10); }
  field(id === "odometer-disclosure" ? "Transferor / seller signature and date" : "Buyer / principal signature and date", "", "buyer_signature");
  if (input.facts.coBuyer) field("Co-buyer / additional principal signature and date", "", "co_buyer_signature");
  field(id === "odometer-disclosure" ? "Transferee / buyer signature and date" : "Dealer / agent signature and date", "", "dealer_signature");
  if (id === "power-of-attorney") { space(180); text("Acknowledgment - complete only when required by the filing office", true); field("State / county / date / personally appeared", "", "notary_appearance"); field("Notary signature / commission expiration / seal", "", "notary_signature"); }
  }
  form.updateFieldAppearances(font);
  pdf.getPages().forEach((p, i) => p.drawText(`Page ${i + 1} of ${pdf.getPageCount()}`, { x: 510, y: 22, font, size: 8, color: muted }));
  return Buffer.from(await pdf.save()).toString("base64");
}
async function officialBuyersGuide(input: Input) {
  const pdf = await PDFDocument.load(fs.readFileSync(path.join(process.cwd(), "public/forms/minnesota-retail-sale/ftc-buyers-guide-source.pdf"))), form = pdf.getForm();
  form.updateFieldAppearances(await pdf.embedFont(StandardFonts.Helvetica));
  // The FTC source contains alternative front pages. Keep the chosen front and required reverse only.
  for (const field of form.getFields().filter(f => f.getName().includes("BG-Implied"))) form.removeField(field);
  pdf.removePage(1);
  const front = "topmostSubform[0].BG-AsIs[0].", back = "topmostSubform[0].BG-Back[0].";
  const hasWarranty = input.facts.warrantyType === "Dealer limited warranty";
  const values = { [front + "VehicleMake[0]"]: input.vehicle.make, [front + "Model[0]"]: input.vehicle.model, [front + "Year[0]"]: input.vehicle.year, [front + "VIN[0]"]: input.vehicle.vin, [front + "Labor[0]"]: (hasWarranty ? input.facts.warrantyLabor : ""), [front + "Parts[0]"]: (hasWarranty ? input.facts.warrantyParts : ""), [front + "SystemsCovered1[0]"]: (hasWarranty ? input.facts.warrantyCoverage : ""), [front + "Duration1[0]"]: (hasWarranty ? input.facts.warrantyDuration : ""), [back + "DealerName[0]"]: input.facts.dealerName, [back + "DealerAddress[0]"]: input.facts.dealerAddress, [back + "DealerPhone[0]"]: input.facts.dealerPhone, [back + "DealerEmail[0]"]: input.facts.dealerEmail, [back + "ComplaintContact[0]"]: input.facts.authorizedAgent || input.facts.dealerName };
  for (const [key, value] of Object.entries(values)) { const field = form.getField(key); if (field instanceof PDFTextField) field.setText(safe(value)); }
  form.getRadioGroup(front + "Warranty[0]").select(hasWarranty ? "Dealer" : "As Is");
  if (hasWarranty) form.getRadioGroup(front + "DealerWarranty[0]").select("Limited");
  form.updateFieldAppearances(await pdf.embedFont(StandardFonts.Helvetica));
  return Buffer.from(await pdf.save()).toString("base64");
}
