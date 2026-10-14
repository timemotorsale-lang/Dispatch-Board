import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { dealDeskLogoHtml, drawDealDeskPdfLogo } from "./deal-desk-document-brand";
import type { DealerWarrantyDetails } from "@/lib/dealer-warranty-policy";

type WarrantyDocumentInput = {
  dealType: "BHPH" | "LEASE_TO_OWN";
  customerName: string; coBuyer: string; dealNumber: string; vehicle: string; vin: string;
  warranty: DealerWarrantyDetails;
};

function documentContent(input: WarrantyDocumentInput) {
  return {
    rows: [
      ["Customer / co-customer", `${input.customerName} / ${input.coBuyer}`],
      ["Deal / vehicle", `${input.dealNumber} / ${input.vehicle}`],
      ["VIN", input.vin],
      ["Delivery", input.warranty.delivery],
      ["Warranty ends at earlier of", `${input.warranty.expires} or odometer ${input.warranty.endingMileage.toLocaleString("en-US")} miles`],
      ["Delivery odometer", `${input.warranty.startingMileage.toLocaleString("en-US")} miles`],
      ["Optional return deadline", input.warranty.returnDeadline]
    ],
    sections: [
      ["1. Limited dealer warranty", `Time Motor Sales, Inc. provides the original ${input.dealType === "BHPH" ? "BHPH buyer" : "lease-to-own lessee"} a dealer warranty for 30 consecutive 24-hour days or 1,000 miles after delivery, whichever comes first. Covered repairs include 100% of covered parts and labor, with no deductible or separate warranty purchase charge.`],
      ["2. Covered components", "Engine: internally lubricated parts, engine block, cylinder heads, intake manifolds, and timing gears/chains. Transmission: case and internal parts, including the automatic-transmission torque converter. This voluntary warranty does not cover drive axles, accessories, brakes, steering, electrical systems, or other components, except where separate coverage or law requires."],
      ["3. Claims and exclusions", "Promptly report a covered failure to 612-724-3631 or timemotorsale@gmail.com within the warranty period. Stop driving if continued use may worsen damage; arrange inspection and repair with the dealership. Covered diagnosis is included. Exclusions apply to damage caused by collision, abuse, negligence, or inadequate maintenance, and to routine maintenance and normal wear. This voluntary coverage does not include towing, rental, or loss of use except as required by law. Timely claims and required coverage on repaired/replaced parts survive expiration; repair consent will not be unreasonably withheld where law requires."],
      ["4. Optional one-day return / $875 restocking fee", "For a voluntary change-of-mind return, notify the dealership and return the vehicle within 24 hours after delivery, by the printed deadline. Return all supplied keys and documents with the vehicle in its delivery condition except ordinary use, without new damage, alterations, or odometer tampering. If the dealership is closed at the deadline, send notice by email before the deadline, stop using the vehicle, and arrange return at the next opening. A $875 restocking fee applies only to this optional return, to the extent enforceable."],
      ["5. Return settlement", input.dealType === "BHPH"
        ? "The dealership will document an eligible return, provide an itemized settlement of customer funds less the $875 optional-return fee, and arrange cancellation/unwinding of the sale, financing, and lien with any holder. Trade-in return or credit must be documented in the settlement. This fee is not added to the original amount financed and does not apply to a legally required warranty refund or rescission."
        : "The dealership will document an eligible return, provide an itemized settlement of customer funds less the $875 optional-return fee, and arrange written cancellation of the lease with any holder. Trade-in return or credit must be documented in the settlement. The fee is not included in periodic payments or signing charges and does not apply to a legally required warranty refund or rescission. This addendum's optional return supplements the lease termination terms; a warranty claim alone does not cancel the lease."],
      ["6. Minnesota rights and disclosures", "This addendum supplements, and does not replace or reduce, warranties and remedies required by Minnesota Statutes section 325F.662 or other applicable law. Required coverage may include more components or a longer period. No signature waives those rights. The dealership must provide a consistent Buyers Guide and any required separate statutory warranty. A conflicting as-is statement does not cancel this written warranty. Warranty claims are separate from the optional one-day return."]
    ]
  };
}

function escapeHtml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

export function dealerWarrantyHtml(input: WarrantyDocumentInput) {
  const content = documentContent(input);
  return `<!doctype html><html><head><meta charset="utf-8"><title>Engine &amp; Transmission Warranty / Optional Return</title><style>
    @page { size: letter; margin: .45in; }
    .bhph-warranty { color: #20252b; font: 10.5px Arial, sans-serif; max-width: 740px; margin: 24px auto; padding: 0 12px; }
    .bhph-warranty * { box-sizing: border-box; }
    .bhph-warranty header { border-bottom: 1px solid #bac3cc; padding-bottom: 8px; }
    .bhph-warranty header strong { font-size: 16px; }
    .bhph-warranty h1 { font-size: 20px; margin: 12px 0; }
    .bhph-warranty h2 { border: 0; padding: 0; font-size: 11px; margin: 10px 0 4px; }
    .bhph-warranty p { margin: 4px 0; line-height: 1.35; overflow-wrap: anywhere; }
    .bhph-warranty table { width: 100%; border-collapse: collapse; font-size: 10px; margin: 0; }
    .bhph-warranty th, .bhph-warranty td { border: 0; border-bottom: 1px solid #e0e4e8; padding: 4px 0; text-align: left; vertical-align: top; overflow-wrap: anywhere; }
    .bhph-warranty th { width: 30%; font-weight: normal; background: none; }
    .bhph-warranty section { break-inside: avoid; }
    .bhph-warranty .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 22px; margin-top: 22px; }
    .bhph-warranty .signatures div { border-top: 1px solid #20252b; padding-top: 5px; }
    @media print { .bhph-warranty { margin: 0; padding: 0; break-before: page; break-after: page; } }
  </style></head><body><article class="bhph-warranty">
    <header>${dealDeskLogoHtml(true)}<strong>Time Motor Sales, Inc.</strong><p>1101 E. Lake Street, Minneapolis, MN 55407 | 612-724-3631</p><p>timemotors.net | timemotorsale@gmail.com</p></header>
    <h1>Engine &amp; Transmission Warranty / Optional Return</h1>
    <table>${content.rows.map(([label, value]) => `<tr><th>${escapeHtml(label)}</th><td>${escapeHtml(value)}</td></tr>`).join("")}</table>
    ${content.sections.map(([heading, paragraph]) => `<section><h2>${escapeHtml(heading)}</h2><p>${escapeHtml(paragraph)}</p></section>`).join("")}
    <p>I received this addendum and understand the warranty limits, optional return deadline, and $875 optional-return fee.</p>
    <div class="signatures"><div>Customer / co-customer signature(s) and date</div><div>Authorized dealership representative and date</div></div>
  </article></body></html>`;
}

export async function dealerWarrantyPdfBase64(input: WarrantyDocumentInput) {
  const content = documentContent(input);
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([612, 792]);
  await drawDealDeskPdfLogo(pdf, page);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const color = rgb(.12, .15, .18);
  let y = 756;
  function line(value: string, size: number, isBold = false) {
    const font = isBold ? bold : regular;
    let current = "";
    for (const character of value) {
      if (font.widthOfTextAtSize(current + character, size) > 540) {
        const boundary = current.lastIndexOf(" ");
        page.drawText(boundary > 0 ? current.slice(0, boundary) : current, { x: 36, y, size, font, color });
        y -= size + 2.5;
        current = boundary > 0 ? current.slice(boundary + 1) : "";
      }
      current += character;
    }
    if (current) { page.drawText(current, { x: 36, y, size, font, color }); y -= size + 2.5; }
  }
  line("Time Motor Sales, Inc.", 13, true);
  line("1101 E. Lake Street, Minneapolis, MN 55407 | 612-724-3631", 8);
  line("timemotors.net | timemotorsale@gmail.com", 8);
  y -= 9;
  line("Engine & Transmission Warranty / Optional Return", 16, true);
  y -= 5;
  for (const [label, value] of content.rows) line(`${label}: ${value}`, 8.5);
  y -= 7;
  for (const [heading, paragraph] of content.sections) {
    line(heading, 10, true);
    line(paragraph, 9);
    y -= 6;
  }
  line("I received this addendum and understand the warranty limits, optional return deadline, and $875 optional-return fee.", 8);
  y -= 24;
  if (y < 45) throw new Error("Dealer warranty content exceeds the one-page layout.");
  for (const [name, label, x] of [["buyer_warranty_signature", "Customer / co-customer signature(s) and date", 36], ["dealer_warranty_signature", "Authorized dealership representative and date", 315]] as const) {
    const field = pdf.getForm().createTextField(name);
    field.addToPage(page, { x, y, width: 261, height: 20, borderWidth: .5 });
    field.setFontSize(9);
    page.drawText(label, { x, y: y - 12, size: 7, font: regular, color });
  }
  pdf.getForm().updateFieldAppearances(regular);
  return Buffer.from(await pdf.save()).toString("base64");
}
