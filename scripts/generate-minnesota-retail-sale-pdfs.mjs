import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

const outputDir = path.join(process.cwd(), "public", "forms", "minnesota-retail-sale");
fs.mkdirSync(outputDir, { recursive: true });

const ink = rgb(0.04, 0.09, 0.2);
const muted = rgb(0.31, 0.38, 0.49);
const light = rgb(0.95, 0.97, 1);
const rule = rgb(0.80, 0.86, 0.94);
const border = rgb(0.57, 0.66, 0.80);
const blue = rgb(0.11, 0.25, 0.66);

const forms = [
  {
    id: "sales-agreement",
    title: "Retail Purchase Agreement and Buyer Order",
    subtitle: "Minnesota retail cash / one-pay closing contract packet",
    pages: [
      {
        title: "Deal Parties and Vehicle",
        note: "Sales agreement record designed around Minnesota Rule 7400.5200 sale-file requirements.",
        sections: [
          { heading: "Dealer and Buyer", fields: [["Dealer name", "dealer_name"], ["Dealer license #", "dealer_number"], ["Customer / buyer", "customer_name"], ["Buyer address", "buyer_address"], ["Buyer phone / email", "buyer_contact"], ["Salesperson", "salesperson"]] },
          { heading: "Vehicle Sold", fields: [["Vehicle", "vehicle"], ["VIN", "vin"], ["Stock #", "stock_number"], ["Body style", "body_style"], ["Plate / state", "plate_state"], ["Odometer", "odometer"]] },
          { heading: "Contract Identity", fields: [["Deal / packet #", "deal_number"], ["Deal type", "deal_type"], ["Date of sale", "generated_at"], ["Delivery date", "delivery_date"]] }
        ]
      },
      {
        title: "Price, Taxes, Fees, and Trade",
        note: "Itemize all customer charges and any trade allowance before signatures.",
        sections: [
          { heading: "Cash Sale Terms", fields: [["Sale price", "sale_price"], ["Document/admin fee", "doc_fee"], ["Title fee", "title_fee"], ["Registration / plate fees", "registration_fees"], ["Sales tax", "sales_tax"], ["Other taxable products", "products_total"], ["Total cash price", "total_cash_price"], ["Payment / funding", "payment_funding"]] },
          { heading: "Trade-In", fields: [["Trade vehicle", "trade_vehicle"], ["Trade VIN", "trade_vin"], ["Trade allowance", "trade_allowance"], ["Trade payoff", "trade_payoff"], ["Lienholder", "trade_lienholder"], ["Net trade credit", "net_trade_credit"]] },
          { heading: "Amount Due", fields: [["Deposit / down payment", "deposit"], ["Cash due at delivery", "cash_due"], ["Receipt / reference #", "receipt_number"]] }
        ]
      },
      {
        title: "Agreement Terms and Required Disclosure",
        note: "Use counsel-approved store language for final enforceable terms.",
        paragraphs: [
          "Buyer agrees to purchase the vehicle described in this agreement for the price, taxes, fees, products, and payment method shown in this packet.",
          "All promises, repairs, accessories, delivery conditions, and manager-approved exceptions must be written in this agreement or attached to the deal jacket before signature.",
          "IMPORTANT: THIS MAY BE A BINDING CONTRACT AND YOU MAY LOSE ANY DEPOSITS IF YOU DO NOT PERFORM ACCORDING TO ITS TERMS."
        ],
        sections: [
          { heading: "Written Promises / We-Owe", fields: [["Dealer promises", "dealer_promises", 500, 54], ["Buyer conditions", "buyer_conditions", 500, 54]] },
          { heading: "Acknowledgement", fields: [["Buyer initials", "binding_initials"], ["Manager initials", "manager_initials"]] }
        ]
      },
      {
        title: "Final Signatures",
        note: "Do not sign until the agreement and attachments are completed in full.",
        sections: [
          { heading: "Closing Checklist", fields: [["Buyer order complete", "check_buyer_order"], ["Odometer/damage complete", "check_odometer"], ["Title application complete", "check_title"], ["Fees/taxes collected", "check_fees"], ["Insurance/delivery complete", "check_delivery"], ["Funding verified", "check_funding"]] }
        ],
        signatures: ["Buyer signature / date", "Co-buyer signature / date", "Dealer authorized signature / date"]
      }
    ]
  },
  {
    id: "binding-contract-disclosure",
    title: "Minnesota Binding Contract Disclosure",
    subtitle: "Buyer signature notice required for retail motor vehicle contracts",
    pages: [{
      title: "Binding Contract Acknowledgement",
      note: "Minnesota Statute 168.277 requires this disclosure in bold capital type near the purchaser signature.",
      paragraphs: [
        "IMPORTANT: THIS MAY BE A BINDING CONTRACT AND YOU MAY LOSE ANY DEPOSITS IF YOU DO NOT PERFORM ACCORDING TO ITS TERMS.",
        "Buyer should not sign until the purchase agreement, payment terms, delivery conditions, written promises, and attached documents are complete."
      ],
      sections: [
        { heading: "Deal Reference", fields: [["Customer / buyer", "customer_name"], ["Deal / packet #", "deal_number"], ["Vehicle", "vehicle"], ["VIN", "vin"], ["Sale price", "sale_price"], ["Generated date", "generated_at"]] },
        { heading: "Buyer Acknowledgement", fields: [["Buyer initials", "buyer_initials"], ["Deposit amount", "deposit"], ["Forfeiture crossed out?", "forfeiture_crossed_out"]] }
      ],
      signatures: ["Buyer signature / date", "Dealer representative / date"]
    }]
  },
  {
    id: "odometer-disclosure",
    title: "Odometer and Damage Disclosure Statement",
    subtitle: "Mileage, damage, title, and disclosure control",
    pages: [
      { title: "Odometer Disclosure", note: "Complete mileage and odometer status before delivery.", sections: [{ heading: "Vehicle", fields: [["Vehicle", "vehicle"], ["VIN", "vin"], ["Stock #", "stock_number"], ["Odometer reading", "odometer"], ["Odometer status", "odometer_status"], ["Exemption reason", "exempt_reason"]] }, { heading: "Certification", fields: [["Actual mileage", "actual_mileage"], ["Not actual", "not_actual"], ["Exceeds limits", "exceeds_limits"], ["Staff verified by", "odometer_verified_by"]] }], signatures: ["Buyer signature / date", "Dealer representative / date"] },
      { title: "Damage and Title Disclosure", note: "Record title brand, known damage disclosure, and supporting evidence.", sections: [{ heading: "Damage / Brand", fields: [["Title brand", "title_brand"], ["Damage exceeds threshold?", "damage_disclosure"], ["Prior salvage / rebuilt?", "salvage_status"], ["Disclosure notes", "damage_notes", 500, 56]] }, { heading: "Evidence", fields: [["Title copy stored", "title_copy"], ["Photos stored", "photos_stored"], ["Manager review", "manager_review"]] }], signatures: ["Buyer acknowledgement / date"] }
    ]
  },
  {
    id: "title-registration-application",
    title: "Title and Registration Application Support",
    subtitle: "Dealer VTAP / Minnesota title application intake worksheet",
    pages: [
      { title: "Vehicle and Insurance", note: "Use to support MNDRIVE / eServices title and registration entry.", sections: [{ heading: "Vehicle", fields: [["Vehicle", "vehicle"], ["VIN", "vin"], ["Stock #", "stock_number"], ["Body style", "body_style"], ["Color", "vehicle_color"], ["Use type", "use_type"], ["New / used", "new_used"]] }, { heading: "Insurance", fields: [["Insurance company", "insurance_company"], ["Policy #", "insurance_policy"], ["Expiration", "insurance_expiration"]] }] },
      { title: "Owner and Registration", note: "Capture owner names exactly as they should appear on title/registration.", sections: [{ heading: "Owner(s)", fields: [["Primary owner", "customer_name"], ["Driver license / dealer #", "owner_credential"], ["Date of birth", "owner_dob"], ["Additional owner", "additional_owner"], ["Rights of survivorship", "survivorship"]] }, { heading: "Address", fields: [["Residence address", "registration_address"], ["Mailing address", "mailing_address"], ["County kept", "county_kept"], ["Email", "owner_email"]] }] },
      { title: "Tax Declaration and Filing", note: "Final tax and fees must match the receipt and submitted title application.", sections: [{ heading: "Tax", fields: [["Full purchase price", "sale_price"], ["Trade allowance", "trade_allowance"], ["Net purchase price", "net_purchase_price"], ["Sales tax", "sales_tax"], ["Tax exemption code", "tax_exemption"]] }, { heading: "Submission", fields: [["VTAP / permit #", "vtap_number"], ["Submitted by", "submitted_by"], ["Submission date", "generated_at"], ["Receipt stored", "receipt_stored"]] }], signatures: ["Purchaser signature / date", "Dealer title clerk / date"] }
    ]
  },
  {
    id: "tax-fee-receipt",
    title: "Itemized Taxes and Fees Receipt",
    subtitle: "Retail sale tax, fee, and document/admin fee record",
    pages: [
      { title: "Customer Charges", note: "Itemize every tax and fee collected in connection with the sale.", sections: [{ heading: "Vehicle and Deal", fields: [["Customer / buyer", "customer_name"], ["Deal / packet #", "deal_number"], ["Vehicle", "vehicle"], ["VIN", "vin"], ["Sale price", "sale_price"], ["Payment / funding", "payment_funding"]] }, { heading: "Fees", fields: [["Document/admin fee", "doc_fee"], ["Title fee", "title_fee"], ["Registration tax", "registration_tax"], ["Plate fee", "plate_fee"], ["Transfer tax", "transfer_tax"], ["Lien fee", "lien_fee"], ["Deputy filing fee", "filing_fee"], ["Technology surcharge", "tech_surcharge"]] }] },
      { title: "Tax and Receipt", note: "Attach deputy registrar or electronic submission receipt when completed.", sections: [{ heading: "Tax", fields: [["Taxable amount", "taxable_amount"], ["Sales tax", "sales_tax"], ["Tax paid to another state", "tax_paid_other_state"], ["Net tax due", "net_tax_due"]] }, { heading: "Receipt", fields: [["Total collected", "total_collected"], ["Receipt #", "receipt_number"], ["Paid date", "generated_at"], ["Received by", "received_by"]] }], signatures: ["Customer acknowledgement / date", "Dealer representative / date"] }
    ]
  },
  {
    id: "title-assignment",
    title: "Title Assignment / MCO Control Sheet",
    subtitle: "Title, MCO, lien release, and ownership transfer control",
    pages: [{
      title: "Title Control",
      note: "Do not deliver until title assignment, lien release, and required signatures are controlled.",
      sections: [
        { heading: "Vehicle", fields: [["Vehicle", "vehicle"], ["VIN", "vin"], ["Stock #", "stock_number"], ["Title # / MCO", "title_number"], ["Title state", "title_state"], ["Title brand", "title_brand"]] },
        { heading: "Assignment", fields: [["Assigned to", "customer_name"], ["Assignment date", "generated_at"], ["Seller/dealer signature complete", "dealer_signature_complete"], ["Buyer signature complete", "buyer_signature_complete"], ["Lien release attached", "lien_release"], ["Title exception", "title_exception"]] },
        { heading: "Notes", fields: [["Title clerk notes", "title_notes", 500, 58]] }
      ],
      signatures: ["Title clerk / date", "Manager review / date"]
    }]
  },
  {
    id: "power-of-attorney",
    title: "Limited Power of Attorney / Title Authority",
    subtitle: "Authority for title, registration, correction, and DVS paperwork",
    pages: [{
      title: "Title Authority",
      note: "Use only when dealership staff must complete or correct title/registration documents for the customer.",
      paragraphs: [
        "Buyer authorizes dealership representatives to complete vehicle title, registration, correction, lienholder, odometer, plate, and related DVS documents necessary to process this transaction.",
        "This authority is limited to the vehicle and transaction identified below."
      ],
      sections: [
        { heading: "Transaction", fields: [["Customer / buyer", "customer_name"], ["Vehicle", "vehicle"], ["VIN", "vin"], ["Stock #", "stock_number"], ["Deal / packet #", "deal_number"]] },
        { heading: "Authority", fields: [["Authorized dealership representative", "authorized_person"], ["Authority scope", "authority_scope", 500, 48], ["Expiration / limitation", "authority_limit"]] }
      ],
      signatures: ["Buyer signature / date", "Dealer representative / date", "Notary / witness if required"]
    }]
  },
  {
    id: "buyers-guide",
    title: "Used Vehicle Buyers Guide Acknowledgement",
    subtitle: "FTC Buyers Guide delivery and warranty posture record",
    pages: [{
      title: "Buyers Guide Delivery",
      note: "Attach the actual FTC Buyers Guide. This form records delivery and buyer acknowledgement.",
      sections: [
        { heading: "Vehicle", fields: [["Vehicle", "vehicle"], ["VIN", "vin"], ["Stock #", "stock_number"], ["Mileage", "odometer"]] },
        { heading: "Warranty Posture", fields: [["As-is / warranty", "warranty_posture"], ["Service contract offered", "service_contract_offered"], ["Buyer guide delivered by", "guide_delivered_by"], ["Delivery date", "generated_at"]] },
        { heading: "Acknowledgement", fields: [["Buyer initials", "buyer_initials"], ["Notes / promises", "guide_notes", 500, 52]] }
      ],
      signatures: ["Buyer signature / date", "Dealer representative / date"]
    }]
  },
  {
    id: "retail-installment-contract",
    title: "Retail Installment Contract Worksheet",
    subtitle: "Finance terms worksheet for lender-approved installment contract",
    pages: [
      { title: "Finance Structure", note: "Use the final lender contract as the controlling document. This worksheet supports deal jacket review.", sections: [{ heading: "Deal", fields: [["Customer / buyer", "customer_name"], ["Vehicle", "vehicle"], ["VIN", "vin"], ["Sale price", "sale_price"], ["Amount financed", "amount_financed"], ["Payment / funding", "payment_funding"]] }, { heading: "Terms", fields: [["APR", "apr"], ["Term", "term"], ["Payment amount", "payment_amount"], ["First payment date", "first_payment_date"], ["Contract date", "generated_at"], ["Lender", "lender_name"]] }] },
      { title: "Finance Disclosures and Products", note: "Attach the actual retail installment contract and product disclosures.", sections: [{ heading: "Products", fields: [["VSC", "vsc"], ["GAP", "gap"], ["VSI", "vsi"], ["Other products", "other_products"]] }, { heading: "Funding Conditions", fields: [["Approval #", "approval_number"], ["Stipulations", "stipulations", 500, 52], ["Callback complete", "callback_complete"], ["Funding verified", "funding_verified"]] }], signatures: ["Buyer signature / date", "Dealer finance manager / date"] }
    ]
  },
  {
    id: "personal-references",
    title: "Personal References and Verification Form",
    subtitle: "Credit purchase reference and contact authorization",
    pages: []
  },
  {
    id: "product-gps-disclosure",
    title: "Products, Insurance, GPS, and Starter Interrupt Disclosure",
    subtitle: "Optional product and payment assurance equipment disclosure",
    pages: [{
      title: "Product Disclosure",
      note: "Use for add-on products, service contracts, debt cancellation, insurance products, GPS, or starter interrupt.",
      sections: [
        { heading: "Deal", fields: [["Customer / buyer", "customer_name"], ["Vehicle", "vehicle"], ["VIN", "vin"], ["Deal / packet #", "deal_number"]] },
        { heading: "Products", fields: [["Products selected", "products_selected", 500, 42], ["Total product price", "products_total"], ["Included in cash price?", "included_in_cash_price"], ["Optional declined products", "declined_products", 500, 36]] },
        { heading: "GPS / Starter Interrupt", fields: [["GPS installed?", "gps_installed"], ["Starter interrupt?", "starter_interrupt"], ["Equipment disclosure notes", "gps_notes", 500, 48]] }
      ],
      signatures: ["Buyer signature / date", "Finance manager / date"]
    }]
  },
  {
    id: "funding-proof",
    title: "Funding and Payment Proof Record",
    subtitle: "Cash, certified funds, one-pay, wire, or outside finance evidence",
    pages: [{
      title: "Funding Verification",
      note: "Do not deliver until payment method and proof are accepted by dealership policy.",
      sections: [
        { heading: "Deal", fields: [["Customer / buyer", "customer_name"], ["Deal / packet #", "deal_number"], ["Vehicle", "vehicle"], ["VIN", "vin"], ["Sale price", "sale_price"], ["Cash due", "cash_due"]] },
        { heading: "Payment Proof", fields: [["Funding method", "funding_method"], ["Proof reference", "proof_reference"], ["Amount received", "amount_received"], ["Received date", "generated_at"], ["Received by", "received_by"], ["Deposit / hold", "deposit"]] },
        { heading: "Release Decision", fields: [["Funds verified", "funds_verified"], ["Manager exception", "manager_exception"], ["Exception notes", "exception_notes", 500, 48]] }
      ],
      signatures: ["Cashier / finance signature", "Manager release approval"]
    }]
  },
  {
    id: "trade-documents",
    title: "Trade-In Documents and Payoff Control",
    subtitle: "Trade identity, allowance, lien payoff, title, and condition record",
    pages: [
      { title: "Trade Vehicle", note: "Capture exact trade identity before finalizing the buyer order.", sections: [{ heading: "Trade", fields: [["Trade vehicle", "trade_vehicle"], ["Trade VIN", "trade_vin"], ["Year / make / model", "trade_year_make_model"], ["Mileage", "trade_mileage"], ["Title status", "trade_title_status"], ["Keys / manuals", "trade_keys"]] }, { heading: "Value", fields: [["Trade allowance", "trade_allowance"], ["Trade ACV", "trade_acv"], ["Recon estimate", "trade_recon"], ["Net trade credit", "net_trade_credit"]] }] },
      { title: "Lien and Payoff", note: "Attach payoff quote and title/lien evidence to the deal jacket.", sections: [{ heading: "Payoff", fields: [["Lienholder", "trade_lienholder"], ["Account #", "trade_account"], ["Payoff amount", "trade_payoff"], ["Good through", "payoff_good_through"], ["Per diem", "payoff_per_diem"], ["Verified by", "payoff_verified_by"]] }, { heading: "Authorization", fields: [["Customer payoff authorization", "payoff_authorization"], ["Lien release expected", "lien_release_expected"], ["Notes", "trade_notes", 500, 38]] }], signatures: ["Buyer trade authorization / date", "Dealer representative / date"] }
    ]
  },
  {
    id: "delivery-documents",
    title: "Delivery and Registration Support Checklist",
    subtitle: "Delivery, insurance, temp permit, plate, keys, and final release evidence",
    pages: [
      { title: "Delivery Readiness", note: "Vehicle should not leave custody until delivery gates are clear.", sections: [{ heading: "Deal", fields: [["Customer / buyer", "customer_name"], ["Vehicle", "vehicle"], ["VIN", "vin"], ["Stock #", "stock_number"], ["Delivery date", "delivery_date"]] }, { heading: "Release Gates", fields: [["Insurance verified", "delivery_insurance"], ["Temp permit / plate", "delivery_plate"], ["Registration path", "registration_path"], ["Funding verified", "funding_verified"], ["Title application complete", "title_application_complete"], ["Manager release", "manager_release"]] }] },
      { title: "Custody Handoff", note: "Record what was delivered to the customer and attach photos/evidence.", sections: [{ heading: "Vehicle Handoff", fields: [["Odometer", "odometer"], ["Fuel level", "fuel_level"], ["Keys", "delivery_keys"], ["Manuals", "manuals"], ["Accessories", "accessories"], ["Condition photos stored", "condition_photos"]] }, { heading: "Customer Delivery Notes", fields: [["Delivery notes", "delivery_notes", 500, 56]] }], signatures: ["Customer received vehicle / date", "Delivery staff / date"] }
    ]
  }
];

function wrapText(text, font, size, maxWidth) {
  const words = String(text).split(/\s+/);
  const lines = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(next, size) > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

async function createPdf(definition) {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const form = pdf.getForm();
  let fieldCount = 0;

  function drawText(page, text, x, y, size = 9, selectedFont = font, color = ink, maxWidth = 510) {
    for (const line of wrapText(text, selectedFont, size, maxWidth)) {
      page.drawText(line, { x, y, size, font: selectedFont, color });
      y -= size + 4;
    }
    return y;
  }

  function drawHeader(page, title, subtitle, pageNumber, pageCount) {
    page.drawRectangle({ x: 0, y: 742, width: 612, height: 50, color: light });
    page.drawText("Time Motor Sales", { x: 36, y: 766, size: 9, font: bold, color: muted });
    page.drawText("Minnesota Retail Sale Packet", { x: 410, y: 766, size: 9, font: bold, color: muted });
    page.drawText(title, { x: 36, y: 728, size: 17, font: bold, color: ink });
    page.drawText(subtitle, { x: 36, y: 710, size: 9.5, font, color: muted });
    page.drawText(`Page ${pageNumber} of ${pageCount}`, { x: 526, y: 710, size: 8, font: bold, color: muted });
    page.drawLine({ start: { x: 36, y: 698 }, end: { x: 576, y: 698 }, thickness: 1, color: rule });
  }

  function field(page, label, name, x, y, width, height = 17) {
    page.drawText(label, { x, y: y + height + 5, size: 7.5, font: bold, color: muted });
    const textField = form.createTextField(name);
    textField.addToPage(page, { x, y, width, height, borderColor: border, borderWidth: 0.7, textColor: ink });
    textField.setFontSize(8);
    fieldCount += 1;
  }

  function section(page, heading, y) {
    page.drawText(heading, { x: 36, y, size: 10, font: bold, color: blue });
    page.drawLine({ start: { x: 36, y: y - 6 }, end: { x: 576, y: y - 6 }, thickness: 0.8, color: rule });
    return y - 36;
  }

  function drawFields(page, fields, y) {
    const columns = 2;
    const gap = 24;
    const colWidth = (540 - gap) / columns;
    let rowY = y;
    let col = 0;
    for (let i = 0; i < fields.length; i += 1) {
      const item = fields[i];
      const [label, name, requestedWidth, requestedHeight] = item;
      const wide = requestedWidth && requestedWidth > colWidth;
      const x = wide ? 36 : 36 + col * (colWidth + gap);
      const width = Math.min(requestedWidth ?? colWidth, 540);
      const height = requestedHeight ?? 17;
      field(page, label, name, x, rowY, width, height);
      if (wide || col === columns - 1) {
        const nextField = fields[i + 1];
        const nextIsTallWide = nextField?.[2] > colWidth && nextField?.[3] > 30;
        rowY -= height + (nextIsTallWide ? 48 : 30);
        col = 0;
      } else {
        col += 1;
      }
    }
    return col === 0 ? rowY : rowY - 47;
  }

  definition.pages.forEach((pageDef, index) => {
    const page = pdf.addPage([612, 792]);
    drawHeader(page, definition.title, definition.subtitle, index + 1, definition.pages.length);
    let y = 672;
    page.drawText(pageDef.title, { x: 36, y, size: 13, font: bold, color: ink });
    y -= 18;
    if (pageDef.note) y = drawText(page, pageDef.note, 36, y, 8.5, font, muted, 520) - 8;
    if (pageDef.paragraphs) {
      for (const paragraph of pageDef.paragraphs) {
        const important = paragraph.startsWith("IMPORTANT:");
        if (important) {
          page.drawRectangle({ x: 36, y: y - 38, width: 540, height: 48, color: rgb(1, 0.97, 0.86), borderColor: rgb(0.93, 0.67, 0.18), borderWidth: 0.8 });
          drawText(page, paragraph, 48, y - 8, 10, bold, ink, 516);
          y -= 74;
        } else {
          y = drawText(page, paragraph, 36, y, 9, font, ink, 520) - 8;
        }
      }
    }
    for (const sec of pageDef.sections ?? []) {
      if (y < 180) y = 180;
      y = section(page, sec.heading, y);
      y = drawFields(page, sec.fields, y);
    }
    if (pageDef.signatures) {
      let x = 36;
      const width = 160;
      pageDef.signatures.forEach((signature) => {
        page.drawText(signature, { x, y: 96, size: 7.5, font: bold, color: muted });
        page.drawLine({ start: { x, y: 82 }, end: { x: x + width, y: 82 }, thickness: 0.8, color: border });
        x += width + 28;
      });
    }
    page.drawText("Operational template. Confirm final language and official DVS filing requirements with dealership policy and counsel.", { x: 36, y: 26, size: 7, font, color: muted });
  });

  form.updateFieldAppearances(font);
  const bytes = await pdf.save();
  fs.writeFileSync(path.join(outputDir, `${definition.id}.pdf`), bytes);
  return { bytes: bytes.length, fields: fieldCount, id: definition.id, pages: definition.pages.length };
}

const results = [];
const requestedFormId = process.argv.find((argument) => argument.startsWith("--form="))?.slice("--form=".length);
if (requestedFormId && !forms.some((definition) => definition.id === requestedFormId)) throw new Error(`Unknown form: ${requestedFormId}`);
for (const definition of forms) {
  if (requestedFormId && definition.id !== requestedFormId) continue;
  if (definition.id === "personal-references") {
    const generated = spawnSync(process.execPath, [path.join(process.cwd(), "node_modules/tsx/dist/cli.mjs"), "scripts/generate-personal-references-pdf.ts"], { stdio: "inherit" });
    if (generated.error) throw generated.error;
    if (generated.status !== 0) throw new Error("Personal reference PDF generation failed.");
    results.push({ id: definition.id, pages: 1 });
    continue;
  }
  results.push(await createPdf(definition));
}

console.table(results);
