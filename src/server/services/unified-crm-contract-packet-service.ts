import { readFileSync } from "node:fs";
import { join } from "node:path";

import { COURTESY_LOANER_FORM_PACKET, DAILY_RENTAL_FORM_PACKET, requiredCourtesyLoanerFormIds, requiredDailyRentalFormIds, type DailyRentalFormItem } from "@/lib/daily-rental-form-packet";
import { allLeaseToOwnFormIds, calculateLeaseToOwn, LEASE_TO_OWN_FORM_PACKET, type LeasePaymentFrequency, type LeaseToOwnCalculatorInput } from "@/lib/lease-to-own-form-packet";
import { MN_SALE_FORM_PACKET, requiredMinnesotaSaleFormIds, type MinnesotaSaleFormItem } from "@/lib/mn-vehicle-sale-form-packet";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import type { AuthenticatedUser } from "@/server/auth/store";
import {
  UNIFIED_CRM_CONTRACT_PACKET_CONTRACT_VERSION,
  UnifiedCrmContractPacketError,
  type UnifiedCrmContractPacketInput,
  type UnifiedCrmContractPacketResult
} from "@/server/unified-crm/contract-packet-contract";

type Dependencies = {
  now?: () => Date;
};

const ARCHIVE = new Map<string, UnifiedCrmContractPacketResult>();

function text(value: unknown, fallback: string, max = 240) {
  const result = typeof value === "string" ? value.trim() : "";
  if (!result) return fallback;
  return result.slice(0, max);
}

type PacketFormItem = DailyRentalFormItem | MinnesotaSaleFormItem | typeof LEASE_TO_OWN_FORM_PACKET[number];

function hasPdfTemplate(form: PacketFormItem): form is PacketFormItem & { templatePath: string } {
  return "templatePath" in form && typeof form.templatePath === "string" && form.templatePath.length > 0;
}

function formIds(value: unknown, forms: PacketFormItem[], requiredIds: string[]) {
  if (!Array.isArray(value)) return requiredIds;
  const knownIds = new Set(forms.map((form) => form.id));
  const requested = value.filter((item): item is string => typeof item === "string" && knownIds.has(item));
  return requested.length > 0 ? Array.from(new Set(requested)) : requiredIds;
}

function vehicleFacts(value: unknown) {
  const vehicle = value && typeof value === "object" ? value as Record<string, unknown> : {};
  return {
    color: text(vehicle.color, "Not captured"),
    make: text(vehicle.make, "Not captured"),
    model: text(vehicle.model, "Not captured"),
    stockNumber: text(vehicle.stockNumber, "Not captured"),
    trim: text(vehicle.trim, "Not captured"),
    vin: text(vehicle.vin, "Not captured"),
    year: text(vehicle.year, "Not captured")
  };
}

function dailyRentalFacts(value: unknown) {
  const rental = value && typeof value === "object" ? value as Record<string, unknown> : {};
  return {
    additionalDriverName: text(rental.additionalDriverName, "None"),
    additionalDriverStatus: text(rental.additionalDriverStatus, "None"),
    cardLast4: text(rental.cardLast4, "Not captured"),
    depositHold: text(rental.depositHold, "$0.00"),
    dropoffDate: text(rental.dropoffDate, "Not captured"),
    dropoffTime: text(rental.dropoffTime, "Not captured"),
    estimatedAuthorization: text(rental.estimatedAuthorization, "$0.00"),
    estimatedRentalCharges: text(rental.estimatedRentalCharges, "$0.00"),
    fuelOut: text(rental.fuelOut, "Not captured"),
    insuranceCarrier: text(rental.insuranceCarrier, "Not captured"),
    insurancePolicy: text(rental.insurancePolicy, "Not captured"),
    licenseNumber: text(rental.licenseNumber, "Not captured"),
    licenseState: text(rental.licenseState, "Not captured"),
    licenseStatus: text(rental.licenseStatus, "Not captured"),
    mileageOut: text(rental.mileageOut, "Not captured"),
    mileagePlan: text(rental.mileagePlan, "Not captured"),
    paymentMethod: text(rental.paymentMethod, "Not captured"),
    pickupDate: text(rental.pickupDate, "Not captured"),
    pickupTime: text(rental.pickupTime, "Not captured"),
    protectionPlan: text(rental.protectionPlan, "Not captured"),
    ratePerDay: text(rental.ratePerDay, "$0.00"),
    rentalDays: text(rental.rentalDays, "1"),
    returnFuel: text(rental.returnFuel, "Not captured"),
    secondaryId: text(rental.secondaryId, "Not captured"),
    useRestriction: text(rental.useRestriction, "Not captured")
  };
}

function moneyCents(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? Math.round(value) : 0;
}

function numberValue(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function paymentFrequency(value: unknown): LeasePaymentFrequency {
  if (value === "Weekly" || value === "BiWeekly" || value === "Monthly") return value;
  return "Monthly";
}

function leaseCalculatorInput(value: unknown): LeaseToOwnCalculatorInput {
  const input = value && typeof value === "object" ? value as Record<string, unknown> : {};
  return {
    additionalItemsCents: moneyCents(input.additionalItemsCents),
    capitalizedCostReductionCents: moneyCents(input.capitalizedCostReductionCents),
    contractLength: numberValue(input.contractLength),
    documentPreparationFeeCents: moneyCents(input.documentPreparationFeeCents),
    downPaymentCents: moneyCents(input.downPaymentCents),
    gpsCostCents: moneyCents(input.gpsCostCents),
    multiplierBasisPoints: numberValue(input.multiplierBasisPoints, 10000),
    originationFeeCents: moneyCents(input.originationFeeCents),
    otherRoadWorthyCostCents: moneyCents(input.otherRoadWorthyCostCents),
    paymentFrequency: paymentFrequency(input.paymentFrequency),
    registrationFeeCents: moneyCents(input.registrationFeeCents),
    salesTaxRateBasisPoints: numberValue(input.salesTaxRateBasisPoints),
    titleFeeCents: moneyCents(input.titleFeeCents),
    warrantyCostCents: moneyCents(input.warrantyCostCents),
    wholesaleCostCents: moneyCents(input.wholesaleCostCents)
  };
}

function formatCurrency(cents: number) {
  return new Intl.NumberFormat("en-US", { currency: "USD", style: "currency" }).format(cents / 100);
}

function formatFormMoney(cents: number) {
  return (cents / 100).toFixed(2);
}

function formDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "UTC",
    year: "numeric"
  }).format(new Date(value));
}

function formWeekday(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    weekday: "long"
  }).format(new Date(value));
}

function publicPdfBytes(templatePath: string) {
  const safePath = templatePath.replace(/^\/+/, "").replace(/^public\//, "");
  return readFileSync(join(process.cwd(), "public", safePath));
}

async function filledPdfBase64(templatePath: string, fieldValues: Record<string, string>) {
  const templateBytes = publicPdfBytes(templatePath);
  if (Object.keys(fieldValues).length === 0) return templateBytes.toString("base64");
  const pdf = await PDFDocument.load(templateBytes);
  const form = pdf.getForm();
  const fieldsByName = new Set(form.getFields().map((field) => field.getName()));
  for (const [fieldName, value] of Object.entries(fieldValues)) {
    if (!fieldsByName.has(fieldName)) continue;
    try {
      form.getTextField(fieldName).setText(value);
    } catch {
      // Non-text fields stay unchanged; we preserve the legal template instead of forcing an unsafe write.
    }
  }
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  form.updateFieldAppearances(font);
  return Buffer.from(await pdf.save()).toString("base64");
}

async function personalReferencesPdfBase64(input: {
  customerName: string;
  dealNumber: string;
  dealType: string;
  generatedAt: string;
  paymentFunding: string;
  salePrice: string;
  vehicle: ReturnType<typeof vehicleFacts>;
}) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([612, 792]);
  const form = pdf.getForm();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdf.embedFont(StandardFonts.HelveticaBold);
  const ink = rgb(0.04, 0.09, 0.2);
  const muted = rgb(0.32, 0.39, 0.49);
  const rule = rgb(0.82, 0.87, 0.94);
  const fieldBorder = rgb(0.63, 0.7, 0.8);
  const vehicleLine = `${input.vehicle.year} ${input.vehicle.make} ${input.vehicle.model} ${input.vehicle.trim}`.replace(/\s+/g, " ").trim();

  function draw(value: string, x: number, y: number, size = 9, bold = false, color = ink) {
    page.drawText(value, { color, font: bold ? boldFont : font, size, x, y });
  }

  function field(label: string, name: string, x: number, y: number, width: number, height = 16, value = "") {
    draw(label, x, y + height + 4, 7.5, true, muted);
    const textField = form.createTextField(name);
    textField.addToPage(page, { borderColor: fieldBorder, borderWidth: 0.8, height, textColor: ink, width, x, y });
    textField.setFontSize(8);
    if (value) textField.setText(value);
  }

  draw("Personal References and Verification Form", 36, 746, 18, true);
  draw("Required for customers purchasing a vehicle on credit or payments.", 36, 728, 9, false, muted);
  page.drawLine({ color: rule, end: { x: 576, y: 716 }, start: { x: 36, y: 716 }, thickness: 1 });

  field("Customer / buyer", "customer_name", 36, 686, 185, 16, input.customerName);
  field("Deal", "deal_number", 235, 686, 110, 16, input.dealNumber);
  field("Deal type", "deal_type", 359, 686, 95, 16, input.dealType);
  field("Generated", "generated_at", 468, 686, 108, 16, input.generatedAt.slice(0, 10));
  field("Vehicle", "vehicle", 36, 651, 220, 16, vehicleLine || "Not captured");
  field("VIN", "vin", 270, 651, 150, 16, input.vehicle.vin);
  field("Stock #", "stock_number", 434, 651, 68, 16, input.vehicle.stockNumber);
  field("Sale price / value", "sale_price", 516, 651, 60, 16, input.salePrice);
  field("Payment / funding", "payment_funding", 36, 616, 240, 16, input.paymentFunding);
  field("Customer phone", "customer_phone", 290, 616, 125);
  field("Customer address", "customer_address", 429, 616, 147);

  draw("References", 36, 587, 13, true);
  draw("Collect at least three reachable personal references unless a manager approves an exception.", 36, 573, 8.5, false, muted);

  [
    { label: "Reference 1", prefix: "ref_1", y: 500 },
    { label: "Reference 2", prefix: "ref_2", y: 389 },
    { label: "Reference 3", prefix: "ref_3", y: 278 }
  ].forEach((block) => {
    draw(block.label, 36, block.y + 62, 10.5, true);
    field("Full name", `${block.prefix}_name`, 36, block.y + 34, 160);
    field("Relationship", `${block.prefix}_relationship`, 210, block.y + 34, 110);
    field("Phone", `${block.prefix}_phone`, 334, block.y + 34, 105);
    field("Alternate phone / email", `${block.prefix}_alternate`, 453, block.y + 34, 123);
    field("Address", `${block.prefix}_address`, 36, block.y, 235);
    field("Best time to contact", `${block.prefix}_best_time`, 285, block.y, 135);
    field("Staff verification notes", `${block.prefix}_notes`, 434, block.y, 142);
  });

  draw("Customer authorization", 36, 228, 13, true);
  [
    "Customer confirms these references are accurate and may be contacted by Time Motor Sales for underwriting, account servicing, payment follow-up, title, insurance, or vehicle recovery purposes where allowed by law.",
    "Customer agrees to update Time Motor Sales if phone number, address, residence, employment, or reference information changes during the payment term.",
    "False, incomplete, or unreachable reference information may delay approval, delivery, or account setup."
  ].forEach((item, index) => draw(`- ${item}`, 42, 212 - index * 18, 7.5, false, muted));

  field("Customer signature", "customer_signature", 36, 96, 230, 20);
  field("Date", "customer_signature_date", 280, 96, 90, 20);
  field("Dealer representative", "dealer_representative", 384, 96, 192, 20);
  field("Manager exception / notes", "manager_exception_notes", 36, 44, 540, 24);

  form.updateFieldAppearances(font);
  return Buffer.from(await pdf.save()).toString("base64");
}

function leaseTemplateFieldValues(input: {
  calculator: ReturnType<typeof calculateLeaseToOwn>;
  customerName: string;
  dealNumber: string;
  feeTotal: string;
  formId: string;
  generatedAt: string;
  leaseInput: LeaseToOwnCalculatorInput;
  paymentFunding: string;
  salePrice: string;
  vehicle: ReturnType<typeof vehicleFacts>;
}) {
  const leaseDate = formDate(input.generatedAt);
  const leaseWeekday = formWeekday(input.generatedAt);
  const vehicleDescription = `${input.vehicle.year} ${input.vehicle.make} ${input.vehicle.model}`.trim();
  const common = {
    "CO-LESSEE": "",
    "COLESSEE": "",
    "Color": input.vehicle.color,
    "DATE": leaseDate,
    "Date of Lease Agreement": leaseDate,
    "DESCRIPTION OF LEASED MOTOR VEHICLE Year": input.vehicle.year,
    "Driver’s Lic": "",
    "Execution Date": leaseDate,
    "LESSEE": input.customerName,
    "LESSEE Name": input.customerName,
    "LESSEE PRINT NAME": input.customerName,
    "Make": input.vehicle.make,
    "Model": input.vehicle.model,
    "Name-Address Lessee": input.customerName,
    "Name-Address Lessor": "Time Motor Sales, Inc.",
    "OWNER/LESSOR": "Time Motor Sales, Inc.",
    "OWNERLESSOR": "Time Motor Sales, Inc.",
    "OWNERLESSOR Name": "Time Motor Sales, Inc.",
    "PRINT NAME LESSEE": input.customerName,
    "PRINT NAME_1": input.customerName,
    "VIN": input.vehicle.vin,
    "Year": input.vehicle.year
  };

  if (input.formId === "w2-lease") {
    const paymentCount = Math.round(input.leaseInput.contractLength);
    return {
      ...common,
      "Amount to be paid in cash 1": "Cash received",
      "Amount to be paid in cash 2": "Title fee",
      "Amount to be paid in cash 3": "Registration fee",
      "Amount to be paid in cash 4": "Taxes",
      "DELIVERY, followed by 1": String(paymentCount),
      "DELIVERY, followed by 2": "N/A",
      "DELIVERY, followed by 3": String(paymentCount),
      "Document preparation fee not gov fee": formatFormMoney(input.leaseInput.documentPreparationFeeCents),
      "Gross capitalized cost The agreed upon value of the vehicle of": formatFormMoney(input.calculator.grossCapitalizedCostCents),
      "Odometer Reading": "",
      "Pay1": formatFormMoney(input.calculator.amountDueAtSigningCents),
      "Rate": "0.000%",
      "Text2": "Amount at delivery",
      "The total of all your periodic payments is": formatFormMoney(input.calculator.totalOfAllPeriodicPaymentsCents),
      "Total": formatFormMoney(input.calculator.totalBasePeriodicPaymentsCents),
      "Total Amount Due at Lease Signing or Delivery": formatFormMoney(input.calculator.amountDueAtSigningCents),
      "Total_2": formatFormMoney(input.calculator.amountDueAtSigningCents),
      "and any outstanding prior credit or lease balance": "0.00",
      "due on the": leaseWeekday,
      "of each": "each",
      "payments of": formatFormMoney(input.calculator.totalPeriodicPaymentCents),
      "starting": leaseDate,
      "undefined": formatFormMoney(input.calculator.totalPeriodicPaymentCents),
      "undefined_2": "0.00",
      "undefined_3": "0.00",
      "undefined_4": "0.00",
      "undefined_5": formatFormMoney(input.calculator.totalOfAllPeriodicPaymentsCents),
      "undefined_6": "0.00",
      "undefined_7": formatFormMoney(input.calculator.capitalizedCostReductionCents),
      "undefined_8": formatFormMoney(input.leaseInput.titleFeeCents),
      "undefined_9": formatFormMoney(input.leaseInput.registrationFeeCents),
      "undefined_10": formatFormMoney(input.calculator.applicableTaxesCents),
      "undefined_11": "0.00",
      "undefined_12": formatFormMoney(input.leaseInput.originationFeeCents),
      "undefined_13": "0.00",
      "undefined_14": "0.00",
      "undefined_15": "0.00",
      "undefined_16": "0.00",
      "undefined_17": "0.00",
      "undefined_18": formatFormMoney(input.calculator.amountDueAtSigningCents),
      "undefined_19": formatFormMoney(input.calculator.totalPeriodicPaymentCents),
      "undefined_20": formatFormMoney(input.calculator.capitalizedCostReductionCents),
      "undefined_21": formatFormMoney(input.leaseInput.documentPreparationFeeCents),
      "undefined_22": formatFormMoney(input.leaseInput.titleFeeCents),
      "undefined_23": formatFormMoney(input.leaseInput.registrationFeeCents),
      "undefined_24": formatFormMoney(input.calculator.applicableTaxesCents),
      "undefined_25": formatFormMoney(input.calculator.amountDueAtSigningCents),
      "undefined_26": formatFormMoney(input.calculator.grossCapitalizedCostCents),
      "undefined_27": formatFormMoney(input.calculator.grossCapitalizedCostTotalCents),
      "undefined_28": formatFormMoney(input.calculator.capitalizedCostReductionCents),
      "undefined_29": formatFormMoney(input.calculator.adjustedCapitalizedCostCents),
      "undefined_30": formatFormMoney(input.calculator.residualValueCents),
      "undefined_31": formatFormMoney(input.calculator.depreciationAndAmortizedAmountCents),
      "undefined_32": "0.00",
      "undefined_33": formatFormMoney(input.calculator.totalBasePeriodicPaymentsCents),
      "undefined_34": formatFormMoney(input.calculator.totalOfAllPeriodicPaymentsCents),
      "undefined_35": formatFormMoney(input.calculator.estimatedFeesAndTaxesOverTermCents),
      "undefined_36": formatFormMoney(input.calculator.totalOfPaymentsCents),
      "undefined_38": "0.00",
      "undefined_39": formatFormMoney(input.calculator.dealerGrossProfitCents),
      "Year": input.vehicle.year,
      "Make": input.vehicle.make,
      "Model": input.vehicle.model,
      "VIN": input.vehicle.vin,
      "Color": input.vehicle.color,
      "Veh Lic": input.dealNumber
    };
  }

  if (input.formId === "insurance-binder") {
    return {
      ...common,
      "Vehicle": vehicleDescription,
      "VIN": input.vehicle.vin
    };
  }

  if (input.formId === "binding-arbitration") {
    return {
      ...common,
      "DESCRIPTION OF LEASED MOTOR VEHICLE Make": input.vehicle.make,
      "DESCRIPTION OF LEASED MOTOR VEHICLE Model": input.vehicle.model,
      "DESCRIPTION OF LEASED MOTOR VEHICLE VIN": input.vehicle.vin,
      "DESCRIPTION OF LEASED MOTOR VEHICLE Year": input.vehicle.year
    };
  }

  if (input.formId === "kap-warranty") {
    return {
      ...common,
      "Current Mileage": "",
      "Service Facility": "",
      "Service Facility Telephone Number": ""
    };
  }

  return common;
}

function retailSaleTemplateFieldValues(input: {
  customerName: string;
  dealNumber: string;
  dealType: string;
  feeTotal: string;
  generatedAt: string;
  paymentFunding: string;
  salePrice: string;
  vehicle: ReturnType<typeof vehicleFacts>;
}) {
  const vehicleDescription = `${input.vehicle.year} ${input.vehicle.make} ${input.vehicle.model} ${input.vehicle.trim}`.replace(/\s+/g, " ").trim();
  return {
    customer_name: input.customerName,
    deal_number: input.dealNumber,
    deal_type: input.dealType,
    fee_total: input.feeTotal,
    generated_at: input.generatedAt.slice(0, 10),
    payment_funding: input.paymentFunding,
    sale_price: input.salePrice,
    stock_number: input.vehicle.stockNumber,
    vehicle: vehicleDescription || "Not captured",
    vin: input.vehicle.vin
  };
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function packetNumber(now: Date) {
  return `PKT-${now.toISOString().replace(/[-:.TZ]/g, "").slice(0, 14)}`;
}

function buildDocumentHtml(input: {
  customerName: string;
  dealNumber: string;
  dealType: string;
  feeTotal: string;
  generatedAt: string;
  label: string;
  paymentFunding: string;
  salePrice: string;
  sourceBasis: string;
  trigger: string;
  vehicle: ReturnType<typeof vehicleFacts>;
  extraRows?: Array<[string, string]>;
  packetIntro?: string;
}) {
  const rows = [
    ["Buyer", input.customerName],
    ["Deal", input.dealNumber],
    ["Deal type", input.dealType],
    ["Vehicle", `${input.vehicle.year} ${input.vehicle.make} ${input.vehicle.model} ${input.vehicle.trim}`],
    ["Color", input.vehicle.color],
    ["VIN", input.vehicle.vin],
    ["Stock #", input.vehicle.stockNumber],
    ["Sale price", input.salePrice],
    ["Fees", input.feeTotal],
    ["Payment / funding", input.paymentFunding],
    ["Generated", input.generatedAt],
    ["Source basis", input.sourceBasis],
    ["Use when", input.trigger],
    ...(input.extraRows ?? [])
  ];
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(input.label)}</title>
  <style>
    body { color: #061735; font-family: Arial, sans-serif; margin: 32px; }
    h1 { font-size: 24px; margin: 0 0 6px; }
    p { color: #52647d; line-height: 1.45; margin: 0 0 20px; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #d8e4ff; padding: 10px; text-align: left; vertical-align: top; }
    th { background: #f6f9ff; width: 30%; }
    .signature { display: grid; gap: 28px; grid-template-columns: 1fr 1fr; margin-top: 44px; }
    .line { border-top: 1px solid #061735; padding-top: 8px; }
  </style>
</head>
<body>
  <h1>${escapeHtml(input.label)}</h1>
  <p>${escapeHtml(input.packetIntro ?? "Generated packet form for Minnesota vehicle sale processing. Confirm current legal/compliance language before customer signature.")}</p>
  <table>
    <tbody>
      ${rows.map(([label, value]) => `<tr><th>${escapeHtml(label)}</th><td>${escapeHtml(value)}</td></tr>`).join("")}
    </tbody>
  </table>
  <div class="signature">
    <div class="line">Buyer signature / date</div>
    <div class="line">Dealer representative / date</div>
  </div>
</body>
</html>`;
}

function buildPersonalReferencesDocumentHtml(input: {
  customerName: string;
  dealNumber: string;
  dealType: string;
  generatedAt: string;
  label: string;
  paymentFunding: string;
  salePrice: string;
  sourceBasis: string;
  trigger: string;
  vehicle: ReturnType<typeof vehicleFacts>;
}) {
  const vehicleLine = `${input.vehicle.year} ${input.vehicle.make} ${input.vehicle.model} ${input.vehicle.trim}`.replace(/\s+/g, " ").trim();
  const references = [1, 2, 3].map((index) => `
    <section>
      <h2>Reference ${index}</h2>
      <table>
        <tbody>
          <tr><th>Full name</th><td></td></tr>
          <tr><th>Relationship to customer</th><td></td></tr>
          <tr><th>Phone number</th><td></td></tr>
          <tr><th>Alternate phone / email</th><td></td></tr>
          <tr><th>Address</th><td></td></tr>
          <tr><th>Best time to contact</th><td></td></tr>
          <tr><th>Staff verification notes</th><td></td></tr>
        </tbody>
      </table>
    </section>
  `).join("");

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(input.label)}</title>
  <style>
    body { color: #061735; font-family: Arial, sans-serif; margin: 32px; }
    h1 { font-size: 26px; margin: 0 0 6px; }
    h2 { border-bottom: 1px solid #dbe6f8; font-size: 18px; margin: 26px 0 10px; padding-bottom: 8px; }
    p, li { color: #34445d; line-height: 1.45; }
    .meta, .notice { color: #52647d; margin: 0 0 18px; }
    .notice { background: #f6f9ff; border: 1px solid #dbe6f8; border-radius: 10px; padding: 12px; }
    table { border-collapse: collapse; margin-top: 12px; width: 100%; }
    th, td { border: 1px solid #dbe6f8; min-height: 28px; padding: 10px; text-align: left; vertical-align: top; }
    th { background: #f6f9ff; color: #34445d; width: 34%; }
    .signature { display: grid; gap: 24px; grid-template-columns: 1fr 1fr; margin-top: 42px; }
    .line { border-top: 1px solid #061735; padding-top: 8px; }
  </style>
</head>
<body>
  <h1>${escapeHtml(input.label)}</h1>
  <p class="meta">Generated ${escapeHtml(input.generatedAt)} · ${escapeHtml(input.sourceBasis)} · ${escapeHtml(input.trigger)}</p>
  <p class="notice">Use this form when a customer is purchasing a vehicle on credit or payments. References are collected for underwriting, account servicing, locating the customer, and verifying contact information. Staff should follow dealership policy and applicable law before contacting any reference.</p>
  <section>
    <h2>Deal and customer</h2>
    <table>
      <tbody>
        <tr><th>Customer / buyer</th><td>${escapeHtml(input.customerName)}</td></tr>
        <tr><th>Deal</th><td>${escapeHtml(input.dealNumber)}</td></tr>
        <tr><th>Deal type</th><td>${escapeHtml(input.dealType)}</td></tr>
        <tr><th>Vehicle</th><td>${escapeHtml(vehicleLine || "Not captured")}</td></tr>
        <tr><th>VIN</th><td>${escapeHtml(input.vehicle.vin)}</td></tr>
        <tr><th>Stock #</th><td>${escapeHtml(input.vehicle.stockNumber)}</td></tr>
        <tr><th>Sale price / value</th><td>${escapeHtml(input.salePrice)}</td></tr>
        <tr><th>Payment / funding</th><td>${escapeHtml(input.paymentFunding)}</td></tr>
      </tbody>
    </table>
  </section>
  ${references}
  <section>
    <h2>Customer authorization</h2>
    <ul>
      <li>Customer confirms the references listed are accurate and may be contacted by Time Motor Sales for verification, underwriting, account servicing, payment follow-up, skipped-account location, insurance, title, or vehicle recovery purposes where allowed by law.</li>
      <li>Customer agrees to update Time Motor Sales if any phone number, address, employment, residence, or reference information changes during the payment term.</li>
      <li>Customer understands that false, incomplete, or unreachable reference information may delay approval, delivery, or account setup.</li>
    </ul>
  </section>
  <div class="signature">
    <div class="line">Customer signature / date</div>
    <div class="line">Dealer representative / date</div>
  </div>
</body>
</html>`;
}

const MINNESOTA_RENTAL_COVERAGE_NOTICE = "Under Minnesota law, a personal automobile insurance policy must: (1) cover the rental of this motor vehicle against damage to the vehicle and against loss of use of the vehicle; and (2) extend the policy's basic economic loss benefits, residual liability insurance, and uninsured and underinsured motorist coverages to the operation or use of a rented motor vehicle. Therefore, purchase of any collision damage waiver or similar insurance affected in this rental contract is not necessary. In addition, purchase of any additional liability insurance is not necessary if your policy was issued in Minnesota unless you wish to have coverage for liability that exceeds the amount specified in your personal automobile insurance policy.";

function rentalDocumentSections(formId: string, input: {
  customerName: string;
  dealNumber: string;
  generatedAt: string;
  rental: ReturnType<typeof dailyRentalFacts>;
  vehicle: ReturnType<typeof vehicleFacts>;
}) {
  const vehicleLine = `${input.vehicle.year} ${input.vehicle.make} ${input.vehicle.model} ${input.vehicle.color}`.replace(/\s+/g, " ").trim();
  const commonRows: Array<[string, string]> = [
    ["Renter", input.customerName],
    ["Rental agreement #", input.dealNumber],
    ["Vehicle", vehicleLine || "Not captured"],
    ["VIN", input.vehicle.vin],
    ["Stock #", input.vehicle.stockNumber],
    ["Pickup", `${input.rental.pickupDate} ${input.rental.pickupTime}`],
    ["Return due", `${input.rental.dropoffDate} ${input.rental.dropoffTime}`],
    ["Daily rate", input.rental.ratePerDay],
    ["Estimated rental charges", input.rental.estimatedRentalCharges],
    ["Deposit / hold", input.rental.depositHold],
    ["Estimated authorization", input.rental.estimatedAuthorization]
  ];

  const sectionsByForm: Record<string, Array<{ heading: string; rows?: Array<[string, string]>; bullets?: string[] }>> = {
    "daily-rental-agreement": [
      {
        heading: "Minnesota daily rental agreement",
        rows: [
          ["Owner / rental company", "Time Motor Sales, Inc."],
          ["Renter", input.customerName],
          ["Agreement date", input.generatedAt],
          ["Rental agreement #", input.dealNumber],
          ["Governing law", "Minnesota law applies unless a nonwaivable law requires otherwise."]
        ]
      },
      { heading: "Rental facts", rows: commonRows },
      {
        heading: "Minnesota insurance and coverage notice",
        bullets: [
          MINNESOTA_RENTAL_COVERAGE_NOTICE,
          "Renter acknowledges that this notice must be read and understood before any collision damage waiver, additional liability product, or similar rental coverage is accepted.",
          "If damage to the rented vehicle is covered by a Minnesota plan of reparation security, payment by the reparation obligor within the time allowed by Minnesota law is acceptable, and prior payment by the renter is not required.",
          "Loss-of-use compensation for a damaged rented motor vehicle is limited by Minnesota law to a period no longer than 14 days."
        ]
      },
      {
        heading: "Eligibility, identity, and authorized drivers",
        rows: [
          ["License status", input.rental.licenseStatus],
          ["License state", input.rental.licenseState],
          ["License number", input.rental.licenseNumber],
          ["Secondary ID", input.rental.secondaryId],
          ["Additional driver status", input.rental.additionalDriverStatus],
          ["Additional driver name", input.rental.additionalDriverName]
        ]
      },
      {
        heading: "Core promises by renter",
        bullets: [
          "Renter represents that every driver is properly licensed, legally eligible to drive, not impaired, and listed as an authorized driver before operating the vehicle.",
          "Renter accepts possession only for the rental period, vehicle, rate, return duties, geographic limits, and use restrictions shown in this agreement.",
          "Renter will return the vehicle on time, to the agreed location, with all keys, fobs, plates, registration items, equipment, accessories, and the required fuel level.",
          "Renter will keep the vehicle locked, safeguarded, and used only in a careful, lawful, and reasonable manner.",
          "Renter will immediately stop using the vehicle and notify Time Motor Sales if a warning light, mechanical concern, unsafe condition, accident, theft, impound, citation, insurance issue, or loss event occurs.",
          "Renter will not transfer, subrent, pledge, conceal, abandon, sell, or claim ownership of the vehicle.",
          "Renter authorizes Time Motor Sales to contact law enforcement, insurers, lienholders, card issuers, employers, additional drivers, emergency contacts, and claim administrators as reasonably necessary to protect the vehicle, collect amounts owed, recover the vehicle, or process claims."
        ]
      },
      {
        heading: "Charges, payment, hold, and collection",
        bullets: [
          "Renter is responsible for all rental charges, deposits, extensions, late return charges, mileage charges, fuel, cleaning, smoking/odor treatment, tolls, parking, traffic or camera citations, impound, towing, recovery, missing keys, missing equipment, damage, theft, loss, administrative costs, and other amounts allowed by this agreement and Minnesota law.",
          "Renter authorizes Time Motor Sales to place and maintain the payment hold shown in the agreement and to charge the authorized payment method for amounts owed under the rental agreement, including post-return charges supported by the rental record.",
          "Renter remains responsible for amounts not paid by personal insurance, employer insurance, card benefits, a third-party payer, or another responsible party.",
          "Returned payments, chargebacks, payment reversals, false payment information, or failure to maintain an available payment method are material defaults.",
          "Amounts not paid when due may be sent to collection, reported as permitted by law, and recovered with lawful collection costs, court costs, and attorney fees where allowed."
        ]
      },
      {
        heading: "Condition, damage, loss, and claims cooperation",
        bullets: [
          "The checkout condition report, return report, photos, videos, odometer, fuel reading, keys, equipment checklist, and staff notes are part of this agreement.",
          "Renter must inspect the vehicle before leaving and request written notation of any visible pre-existing damage.",
          "Renter is responsible for new loss or damage occurring during the rental period to the extent allowed by Minnesota law and subject to any valid, non-voided waiver or insurance payment.",
          "Renter must preserve evidence, identify drivers and witnesses, obtain police or incident reports when required, and cooperate with Time Motor Sales and insurers.",
          "Renter may not authorize repairs, dispose of parts, continue driving an unsafe vehicle, leave the scene unlawfully, or settle claims involving the vehicle without Time Motor Sales approval.",
          "If the vehicle is damaged and a Minnesota reparation obligor covers the damage, payment by that obligor within the statutory timing is accepted; Time Motor Sales will not require prior renter payment in that covered circumstance."
        ]
      },
      {
        heading: "Default, recovery, and repossession right",
        bullets: [
          "Renter is in default if the vehicle is not returned when due, payment fails, the vehicle is used by an unauthorized driver, renter breaches a prohibited-use term, renter provides false information, the vehicle is abandoned or concealed, or Time Motor Sales reasonably believes the vehicle or public is at risk.",
          "Upon default, Time Motor Sales may terminate the rental, demand immediate return, remotely disable or locate the vehicle where lawful and disclosed, recover the vehicle peacefully, notify law enforcement, and charge lawful recovery costs.",
          "Renter releases Time Motor Sales from claims arising from lawful recovery of the vehicle from public property, dealership property, or any place where recovery may legally occur, except to the extent caused by Time Motor Sales' own nonwaivable legal fault."
        ]
      },
      {
        heading: "Indemnity and liability allocation",
        bullets: [
          "To the fullest extent permitted by Minnesota law, renter agrees to indemnify and hold Time Motor Sales harmless from claims, losses, damages, fines, penalties, citations, tolls, injuries, property damage, expenses, and attorney fees arising from renter's breach, prohibited use, unauthorized driver, false information, negligence, intentional misconduct, illegal use, or failure to cooperate.",
          "This indemnity does not waive any duty, coverage, or liability that Minnesota law does not permit Time Motor Sales to waive or shift.",
          "Nothing in this agreement limits liability for Time Motor Sales' own nonwaivable negligence, statutory duties, or obligations under Minnesota compulsory insurance law.",
          "If any term is unenforceable, the remaining terms remain effective and the unenforceable term will be limited to the maximum lawful scope."
        ]
      },
      {
        heading: "Signature acknowledgement",
        bullets: [
          "Renter has read this agreement, received an opportunity to inspect the vehicle, understands optional coverage choices, and accepts the listed charges and obligations.",
          "Renter acknowledges that the agreement is a rental only, with no purchase option and no ownership interest transferred.",
          "Electronic signature, scanned signature, text/email delivery acknowledgement, or wet signature may be used as permitted by applicable law and dealership policy."
        ]
      }
    ],
    "rental-terms-conditions": [
      {
        heading: "Minnesota legal framework",
        bullets: [
          "This rental is intended to be a short-term Minnesota motor vehicle rental and not a lease-to-own, purchase, installment sale, bailment for repair, or transfer of title.",
          "The agreement must be read together with the Minnesota insurance and optional-coverage notice supplied in the Daily Rental Agreement.",
          "Any optional coverage, waiver, or insurance product must be accepted in writing and may not be treated as mandatory unless Minnesota law and an approved program allow it."
        ]
      },
      {
        heading: "Authorized and prohibited use",
        bullets: [
          "No unauthorized driver may operate the vehicle.",
          "No rideshare, delivery, racing, towing, pushing, off-road use, illegal activity, impaired driving, or use outside the approved geographic restriction unless approved in writing.",
          "The dealership may demand immediate return or recover the vehicle when the agreement is violated, the vehicle appears abandoned, payment fails, or the vehicle is not returned as agreed.",
          "Renter must not repair, alter, disable, remove GPS/telematics, remove plates, modify equipment, or abandon the vehicle without dealership approval.",
          "Renter may not use the vehicle while impaired, to commit a crime, to carry hazardous materials, to transport persons or property for hire, to tow or push anything, in a speed contest, in driver training, outside the approved territory, or on roads unsuitable for ordinary passenger vehicles.",
          "Renter may not permit smoking, vaping, pets, commercial signage, weapons transport except as legally permitted, or any use that creates an unusual cleaning, odor, safety, impound, or forfeiture risk unless expressly approved in writing."
        ]
      },
      {
        heading: "Return duties",
        rows: [
          ["Use restriction", input.rental.useRestriction],
          ["Mileage plan", input.rental.mileagePlan],
          ["Fuel return rule", input.rental.returnFuel]
        ]
      },
      {
        heading: "Fees and enforcement",
        bullets: [
          "Time Motor Sales may assess lawful charges for late return, unauthorized extension, excess mileage, fuel shortage, cleaning, smoke/odor treatment, tolls, tickets, parking, storage, towing, impound, recovery, lost keys, missing equipment, and administrative handling.",
          "Renter must promptly provide updated contact, location, payment, insurance, and claim information upon request.",
          "No delay by Time Motor Sales in enforcing a right is a waiver of that right."
        ]
      }
    ],
    "damage-loss-responsibility": [
      {
        heading: "Damage and loss responsibility",
        bullets: [
          "Unless a valid protection option applies and is not voided, renter is responsible for loss of or damage to the vehicle during the rental period to the extent allowed by law.",
          "Responsibility may include repair or replacement cost, theft, loss of use, towing, storage, impound, administrative costs, diminished value, missing equipment, keys, and recovery costs where allowed by law.",
          "Renter must immediately report damage, theft, accident, impound, or police contact and cooperate with the dealership, insurers, and law enforcement.",
          "Protection options do not apply to prohibited use, unauthorized drivers, intentional damage, intoxicated driving, illegal use, misrepresentation, or failure to report an incident."
        ]
      }
    ],
    "protection-election": [
      {
        heading: "Minnesota optional coverage notice",
        bullets: [
          MINNESOTA_RENTAL_COVERAGE_NOTICE,
          "Renter must initial or otherwise acknowledge this notice before any collision damage waiver, added liability product, personal accident product, personal effects product, or similar rental coverage is sold."
        ]
      },
      {
        heading: "Protection election",
        rows: [
          ["Selected option", input.rental.protectionPlan],
          ["Customer insurance carrier", input.rental.insuranceCarrier],
          ["Policy number", input.rental.insurancePolicy]
        ]
      },
      {
        heading: "Disclosure",
        bullets: [
          "Loss damage waiver or similar protection is optional unless a separate written program requirement approved for this transaction applies.",
          "A collision damage waiver is not insurance and may duplicate protection available through Minnesota personal automobile insurance or a payment card benefit.",
          "The renter should verify coverage, deductibles, exclusions, and claim requirements before declining any optional protection.",
          "Accepted protection can be voided by prohibited use, unauthorized driver, misrepresentation, late return without approval, failure to report an incident, intentional damage, illegal use, intoxicated driving, or other exclusions approved for the applicable product.",
          "Renter acknowledges the selected option above and confirms that no employee represented optional coverage as mandatory unless expressly required by a written, lawful, and applicable program rule."
        ]
      }
    ],
    "insurance-payment-authorization": [
      {
        heading: "Insurance and payment authorization",
        rows: [
          ["Payment method", input.rental.paymentMethod],
          ["Card last 4", input.rental.cardLast4],
          ["Deposit / hold", input.rental.depositHold],
          ["Estimated authorization", input.rental.estimatedAuthorization],
          ["Insurance carrier", input.rental.insuranceCarrier],
          ["Policy number", input.rental.insurancePolicy]
        ]
      },
      {
        heading: "Charge authorization",
        bullets: [
          "Renter authorizes the dealership to place the stated authorization hold and charge amounts owed under the rental agreement.",
          "Authorized charges may include rental charges, extensions, late return, fuel, mileage, tolls, tickets, citations, cleaning, smoking, lost keys, damage, recovery, towing, storage, and administrative fees where allowed by law.",
          "Renter remains responsible for charges not paid by an insurer, payment card benefit, or other third party.",
          "If an insurer or reparation obligor covers vehicle damage under Minnesota law, Time Motor Sales will accept payment by that obligor within the statutory claims timing and will not require prior renter payment for that covered damage.",
          "Payment authorization survives return of the vehicle for charges discovered, received, or documented after return, including tolls, citations, damage estimates, insurance deductibles, and claim expenses."
        ]
      }
    ],
    "vehicle-condition-report": [
      {
        heading: "Checkout condition",
        rows: [
          ["Mileage out", input.rental.mileageOut],
          ["Fuel out", input.rental.fuelOut],
          ["Return fuel rule", input.rental.returnFuel],
          ["Existing damage", "Document photos and notes before release"],
          ["Keys / equipment", "Confirm with renter at checkout and return"]
        ]
      },
      {
        heading: "Return inspection",
        bullets: [
          "Staff should compare return condition to checkout photos and notes.",
          "New damage, missing equipment, fuel shortage, cleaning issue, odor, late return, or mileage overage should be recorded before closing the rental.",
          "Renter may request a copy of damage estimates, photos, and charge support where required by law."
        ]
      }
    ],
    "additional-driver-addendum": [
      {
        heading: "Additional driver",
        rows: [
          ["Driver status", input.rental.additionalDriverStatus],
          ["Driver name", input.rental.additionalDriverName],
          ["Required control", "Additional driver must meet license, age, eligibility, and signature requirements before operating the vehicle."]
        ]
      }
    ],
    "incident-reporting-instructions": [
      {
        heading: "Accident, theft, impound, or police contact",
        bullets: [
          "Stop safely, call emergency services when needed, and contact law enforcement when required by law.",
          "Notify the dealership as soon as safely possible and provide a written incident report.",
          "Collect other driver, witness, insurance, police report, and location information.",
          "Do not admit fault, abandon the vehicle, authorize repairs, or continue driving an unsafe vehicle without dealership instruction.",
          "Cooperate with the dealership, insurers, claims administrators, and law enforcement until the claim is closed."
        ]
      }
    ]
  };

  return sectionsByForm[formId] ?? [{ heading: "Rental document", rows: commonRows }];
}

function buildRentalDocumentHtml(input: {
  customerName: string;
  dealNumber: string;
  form: DailyRentalFormItem;
  generatedAt: string;
  rental: ReturnType<typeof dailyRentalFacts>;
  vehicle: ReturnType<typeof vehicleFacts>;
}) {
  const sections = rentalDocumentSections(input.form.id, input);
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(input.form.label)}</title>
  <style>
    body { color: #061735; font-family: Arial, sans-serif; margin: 32px; }
    h1 { font-size: 28px; margin: 0 0 6px; }
    h2 { border-bottom: 1px solid #dbe6f8; font-size: 18px; margin: 26px 0 10px; padding-bottom: 8px; }
    p, li { color: #34445d; line-height: 1.45; }
    .meta { color: #52647d; margin: 0 0 20px; }
    table { border-collapse: collapse; margin-top: 12px; width: 100%; }
    th, td { border: 1px solid #dbe6f8; padding: 10px; text-align: left; vertical-align: top; }
    th { background: #f6f9ff; color: #34445d; width: 34%; }
    .notice { background: #fff7ed; border: 1px solid #fed7aa; border-radius: 10px; color: #7c2d12; margin: 18px 0; padding: 12px; }
    .signature { display: grid; gap: 24px; grid-template-columns: 1fr 1fr; margin-top: 42px; }
    .line { border-top: 1px solid #061735; padding-top: 8px; }
  </style>
</head>
<body>
  <h1>${escapeHtml(input.form.label)}</h1>
  <p class="meta">Generated ${escapeHtml(input.generatedAt)} · ${escapeHtml(input.form.basis)} · ${escapeHtml(input.form.trigger)}</p>
  <p class="notice">Operational template for Time Motor Sales review. Final customer-facing language should be reviewed by dealership counsel for Minnesota rental law, insurance, waiver, and consumer disclosure requirements.</p>
  ${sections.map((section) => `
    <h2>${escapeHtml(section.heading)}</h2>
    ${section.rows ? `<table><tbody>${section.rows.map(([label, value]) => `<tr><th>${escapeHtml(label)}</th><td>${escapeHtml(value)}</td></tr>`).join("")}</tbody></table>` : ""}
    ${section.bullets ? `<ul>${section.bullets.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>` : ""}
  `).join("")}
  <div class="signature">
    <div class="line">Renter signature / date</div>
    <div class="line">Dealer representative / date</div>
  </div>
</body>
</html>`;
}

function buildCourtesyLoanerDocumentHtml(input: {
  customerName: string;
  dealNumber: string;
  form: DailyRentalFormItem;
  generatedAt: string;
  rental: ReturnType<typeof dailyRentalFacts>;
  vehicle: ReturnType<typeof vehicleFacts>;
}) {
  const vehicleLine = `${input.vehicle.year} ${input.vehicle.make} ${input.vehicle.model} ${input.vehicle.color}`.replace(/\s+/g, " ").trim();
  const commonRows: Array<[string, string]> = [
    ["Customer", input.customerName],
    ["Agreement #", input.dealNumber],
    ["Courtesy vehicle", vehicleLine || "Not captured"],
    ["VIN", input.vehicle.vin],
    ["Stock / plate", input.vehicle.stockNumber],
    ["Odometer out", input.rental.mileageOut],
    ["Pickup", `${input.rental.pickupDate} ${input.rental.pickupTime}`],
    ["Return due", `${input.rental.dropoffDate} ${input.rental.dropoffTime}`],
    ["Courtesy use fee", input.rental.ratePerDay],
    ["Deposit / hold", input.rental.depositHold],
    ["Fuel out", input.rental.fuelOut],
    ["Fuel return", input.rental.returnFuel],
    ["Insurance carrier", input.rental.insuranceCarrier],
    ["Policy number", input.rental.insurancePolicy],
    ["License state", input.rental.licenseState],
    ["License number", input.rental.licenseNumber],
    ["Additional driver status", input.rental.additionalDriverStatus],
    ["Additional driver name", input.rental.additionalDriverName]
  ];
  const sectionsByForm: Record<string, Array<{ heading: string; rows?: Array<[string, string]>; bullets?: string[] }>> = {
    "courtesy-loaner-agreement": [
      {
        heading: "Customer, service transaction, and courtesy vehicle",
        rows: [
          ["Owner / dealer", "Time Motor Sales, Inc."],
          ["Dealer address", "1101 E. Lake Street, Minneapolis, MN 55407"],
          ["Dealer contact", "612-724-3631 | timemotors.net"],
          ["Purpose", "Temporary customer mobility while the customer's vehicle is being serviced, repaired, or maintained. This agreement conveys no title or ownership interest."],
          ...commonRows
        ]
      },
      {
        heading: "Authorized drivers - strict requirement",
        bullets: [
          "Only persons specifically listed are authorized by Time Motor Sales, Inc. to operate the courtesy vehicle.",
          "Household membership, possession of keys, permission from the customer, or insurance coverage does not create dealer authorization.",
          "Customer may not lend, transfer, sublease, re-rent, entrust, or permit operation by any unlisted person.",
          "Additional drivers require the dealer's prior written approval.",
          "Customer must safeguard all keys and take reasonable steps to prevent unauthorized operation. If the vehicle or keys are taken without permission, customer must immediately notify the dealer and law enforcement."
        ]
      },
      {
        heading: "Insurance verification and customer representations",
        bullets: [
          "Before release, customer must provide current proof of automobile insurance applicable to the customer and, where required, each authorized driver.",
          "Dealer collection or verification of insurance information is not a warranty or guarantee that an insurer will provide coverage.",
          "Customer represents that all insurance information supplied is truthful, current, and not cancelled, suspended, excluded, or otherwise inapplicable as of vehicle release.",
          "Customer authorizes dealer and its insurers or claims administrators to verify coverage and exchange claim-related information reasonably necessary to investigate a loss.",
          "Customer must immediately report cancellation, lapse, suspension, exclusion, or material policy change. If coverage ceases, customer must stop using and promptly return the vehicle.",
          "Misrepresentation or concealment concerning insurance, driver identity, residency, permission, or use is a material breach."
        ]
      },
      {
        heading: "Minnesota insurance / rental-vehicle notice",
        bullets: [
          "The separate Minnesota Statutory Rental Vehicle Insurance Notice attached as Exhibit A is incorporated into this agreement.",
          "Customer acknowledges receipt of that separate notice.",
          "Nothing in this agreement expands or guarantees coverage beyond the applicable policy and Minnesota law.",
          "If damage to the courtesy vehicle is covered by a Minnesota plan of reparation security, payment by the reparation obligor within the time allowed by Minnesota law is acceptable and prior payment by the customer is not required.",
          "Loss-of-use is subject to applicable Minnesota law."
        ]
      },
      {
        heading: "Prohibited uses",
        bullets: [
          "No operation by any unauthorized, unlicensed, suspended, revoked, impaired, intoxicated, or otherwise legally prohibited driver.",
          "No rideshare, taxi, delivery, courier, livery, towing, pushing, racing, speed testing, off-road use, driver training, criminal activity, or other commercial use unless dealer expressly approves in writing.",
          "No travel outside Minnesota without dealer's prior written approval.",
          "No overloading, intentional damage, abandonment, concealment, or materially risk-increasing use.",
          "No modification, dismantling, unauthorized repair, or tampering with GPS, telematics, dealer equipment, plates, or identifying devices.",
          "No continued operation after a warning light, collision damage, overheating, tire failure, or other condition makes driving unreasonable or unsafe.",
          "A prohibited use is a material breach. A breach does not itself determine insurance coverage or third-party rights, which remain governed by applicable law and policy terms."
        ]
      },
      {
        heading: "Vehicle condition, care, incidents, and cooperation",
        bullets: [
          "Customer acknowledges an opportunity to inspect the vehicle before departure and agrees to identify visible pre-existing damage on the vehicle condition report.",
          "Customer will use reasonable care, lock the vehicle, safeguard keys, and promptly report warning lights, mechanical problems, theft, vandalism, or damage.",
          "After any accident, theft, impound, or police contact, customer must stop safely, contact emergency services or law enforcement when required, notify dealer as soon as reasonably practicable, identify the actual driver and occupants, collect incident information, and cooperate through final resolution.",
          "Customer must not admit liability on dealer's behalf, settle a claim, authorize repairs, abandon the vehicle, transfer any interest, or dispose of evidence."
        ]
      },
      {
        heading: "Financial responsibility, indemnity, return, and recovery",
        bullets: [
          "To the extent permitted by Minnesota law and except to the extent paid by applicable insurance or otherwise prohibited by law, customer is responsible for losses arising during customer's possession or control of the courtesy vehicle.",
          "Responsibility may include physical damage, theft, vandalism, missing keys, reasonable towing, recovery, impound, storage, administrative or recovery expenses, repair costs, legally recoverable diminution in value, legally recoverable loss of use, citations, parking charges, tolls, towing violations, and costs caused by late return, abandonment, prohibited use, false information, or failure to cooperate.",
          "Dealer will credit insurance or third-party recoveries against the same loss and will not obtain double recovery.",
          "To the fullest extent permitted by Minnesota law, customer agrees to indemnify, reimburse, and hold harmless dealer and its owners, officers, employees, and agents from covered losses arising from customer's breach, negligence or intentional misconduct, false insurance or driver representations, or operation by a person whom customer allowed or enabled to operate without dealer's written authorization.",
          "Customer must return the vehicle by the return due date/time, or earlier upon dealer's reasonable demand, in substantially the same condition except ordinary wear and covered loss.",
          "Upon default, and only as permitted by law, dealer may terminate permission to possess the vehicle, demand immediate return, use lawful GPS/telematics to locate dealer property, and peacefully recover the vehicle without breach of the peace."
        ]
      },
      {
        heading: "Payment authorization, service connection, privacy, and acknowledgements",
        bullets: [
          "Customer authorizes charges only for amounts lawfully due under this agreement, supported by reasonable documentation, and subject to applicable payment-network and consumer-protection rules.",
          "This courtesy vehicle is provided in connection with the service, repair, or maintenance transaction identified by the dealership. Use does not alter payment obligations, warranties, repair authorizations, financing terms, or other rights concerning customer's own vehicle unless separately agreed in writing.",
          "Dealer may maintain copies of driver's licenses, insurance verification, inspection photographs, payment authorizations, GPS/telematics records, communications, and incident documentation for legitimate business, safety, claims, legal, and regulatory purposes.",
          "Customer acknowledges reading this agreement before taking possession, receiving a complete copy of this agreement and Exhibit A, understanding only listed drivers are authorized, providing truthful insurance and driver information, understanding accident-reporting duties, and understanding that extensions require dealer approval."
        ]
      }
    ],
    "courtesy-loaner-condition-return-record": [
      {
        heading: "Vehicle condition and return record",
        rows: [
          ["Agreement #", input.dealNumber],
          ["Customer", input.customerName],
          ["Courtesy vehicle VIN", input.vehicle.vin],
          ["Courtesy vehicle", vehicleLine || "Not captured"],
          ["Mileage out", input.rental.mileageOut],
          ["Fuel out", input.rental.fuelOut],
          ["Fuel return", input.rental.returnFuel],
          ["Pre-existing damage / checkout notes", "Document photos and notes before release"],
          ["Return / incident notes", "Document return condition, incidents, tow/impound, or exceptions"],
          ["Return acknowledgement", "Documents physical custody/condition only and does not constitute a release, settlement, admission of liability, or final determination of charges or insurance coverage."]
        ]
      }
    ],
    "courtesy-loaner-minnesota-insurance-notice": [
      {
        heading: "Exhibit A - Minnesota statutory rental vehicle insurance notice",
        bullets: [
          MINNESOTA_RENTAL_COVERAGE_NOTICE,
          "This statutory notice concerns Minnesota rental-vehicle insurance law. It does not represent that the customer has an active policy, that any particular person is an insured, or that a carrier will accept a particular claim. Coverage remains subject to applicable law and the actual policy.",
          "Customer acknowledges receiving and reading this separate Minnesota notice before taking possession of the courtesy vehicle."
        ]
      },
      {
        heading: "Acknowledgement",
        rows: [
          ["Customer printed name", input.customerName],
          ["Agreement #", input.dealNumber],
          ["Dealer representative", "Time Motor Sales representative"]
        ]
      }
    ]
  };
  const sections = sectionsByForm[input.form.id] ?? [{ heading: "Courtesy loaner document", rows: commonRows }];
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(input.form.label)}</title>
  <style>
    body { color: #061735; font-family: Arial, sans-serif; margin: 32px; }
    h1 { font-size: 28px; margin: 0 0 6px; }
    h2 { border-bottom: 1px solid #dbe6f8; font-size: 18px; margin: 26px 0 10px; padding-bottom: 8px; }
    p, li { color: #34445d; line-height: 1.45; }
    .meta { color: #52647d; margin: 0 0 20px; }
    table { border-collapse: collapse; margin-top: 12px; width: 100%; }
    th, td { border: 1px solid #dbe6f8; padding: 10px; text-align: left; vertical-align: top; }
    th { background: #f6f9ff; color: #34445d; width: 34%; }
    .notice { background: #eefbf3; border: 1px solid #bbf7d0; border-radius: 10px; color: #14532d; margin: 18px 0; padding: 12px; }
    .signature { display: grid; gap: 24px; grid-template-columns: 1fr 1fr; margin-top: 42px; }
    .line { border-top: 1px solid #061735; padding-top: 8px; }
  </style>
</head>
<body>
  <h1>${escapeHtml(input.form.label)}</h1>
  <p class="meta">Generated ${escapeHtml(input.generatedAt)} · ${escapeHtml(input.form.basis)} · ${escapeHtml(input.form.trigger)}</p>
  <p class="notice">Official Time Motor Sales courtesy/service loaner pathway based on the dealership's counsel-approved draft.</p>
  ${sections.map((section) => `
    <h2>${escapeHtml(section.heading)}</h2>
    ${section.rows ? `<table><tbody>${section.rows.map(([label, value]) => `<tr><th>${escapeHtml(label)}</th><td>${escapeHtml(value)}</td></tr>`).join("")}</tbody></table>` : ""}
    ${section.bullets ? `<ul>${section.bullets.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>` : ""}
  `).join("")}
  <div class="signature">
    <div class="line">Customer signature / date</div>
    <div class="line">Dealer representative / date</div>
  </div>
</body>
</html>`;
}

export async function generateUnifiedCrmContractPacket(
  actor: AuthenticatedUser | null,
  input: UnifiedCrmContractPacketInput,
  dependencies: Dependencies = {}
): Promise<UnifiedCrmContractPacketResult> {
  if (!actor) {
    throw new UnifiedCrmContractPacketError("AUTHENTICATION_REQUIRED", "Sign in before generating a contract packet.");
  }

  const now = dependencies.now?.() ?? new Date();
  const generatedAt = now.toISOString();
  const packetType = input.packetType === "LEASE_TO_OWN" ? "LEASE_TO_OWN" : input.packetType === "VEHICLE_LOANER" ? "VEHICLE_LOANER" : input.packetType === "DAILY_RENTAL" ? "DAILY_RENTAL" : "MINNESOTA_RETAIL_SALE";
  const packetForms: PacketFormItem[] = packetType === "LEASE_TO_OWN"
    ? LEASE_TO_OWN_FORM_PACKET
    : packetType === "VEHICLE_LOANER"
      ? COURTESY_LOANER_FORM_PACKET
    : packetType === "DAILY_RENTAL"
      ? DAILY_RENTAL_FORM_PACKET
      : MN_SALE_FORM_PACKET;
  const requiredIds = packetType === "LEASE_TO_OWN"
    ? allLeaseToOwnFormIds()
    : packetType === "VEHICLE_LOANER"
      ? requiredCourtesyLoanerFormIds()
    : packetType === "DAILY_RENTAL"
      ? requiredDailyRentalFormIds()
      : requiredMinnesotaSaleFormIds();
  const selectedIds = formIds(input.preparedFormIds, packetForms, requiredIds);
  const selectedForms = packetForms.filter((form) => selectedIds.includes(form.id));
  if (selectedForms.length === 0) {
    throw new UnifiedCrmContractPacketError("CONTRACT_PACKET_INVALID", "Select at least one form before generating a packet.");
  }

  const packet = packetNumber(now);
  const vehicle = vehicleFacts(input.vehicle);
  const customerName = text(input.customerName, "Customer not captured");
  const dealNumber = text(input.dealNumber, packet);
  const dealType = text(input.dealType, "Retail Sale");
  const salePrice = text(input.salePrice, "$0.00");
  const feeTotal = text(input.feeTotal, "$0.00");
  const paymentFunding = text(input.paymentFunding, "To be confirmed");
  const packetId = `contract-packet-${crypto.randomUUID()}`;
  const rentalInput = dailyRentalFacts(input.dailyRental);
  const leaseInput = leaseCalculatorInput(input.leaseCalculator);
  const leaseOutput = calculateLeaseToOwn(leaseInput);
  const leaseRows: Array<[string, string]> = packetType === "LEASE_TO_OWN" ? [
    ["Payment frequency", leaseInput.paymentFrequency],
    ["Contract length", `${leaseInput.contractLength} payment(s)`],
    ["Gross capitalized cost", formatCurrency(leaseOutput.grossCapitalizedCostCents)],
    ["Adjusted capitalized cost", formatCurrency(leaseOutput.adjustedCapitalizedCostCents)],
    ["Residual value", formatCurrency(leaseOutput.residualValueCents)],
    ["Base periodic payment", formatCurrency(leaseOutput.basePeriodicPaymentCents)],
    ["Applicable taxes", formatCurrency(leaseOutput.applicableTaxesCents)],
    ["Amount due at signing", formatCurrency(leaseOutput.amountDueAtSigningCents)],
    ["Total of payments", formatCurrency(leaseOutput.totalOfPaymentsCents)]
  ] : [];

  const documents = await Promise.all(selectedForms.map(async (form) => {
    const isPersonalReferencesForm = form.id === "personal-references";
    const pdfTemplate = hasPdfTemplate(form);
    const isPdfDocument = isPersonalReferencesForm || pdfTemplate;
    const leaseFieldValues = hasPdfTemplate(form) && packetType === "LEASE_TO_OWN"
      ? leaseTemplateFieldValues({
          calculator: leaseOutput,
          customerName,
          dealNumber,
          feeTotal,
          formId: form.id,
          generatedAt,
          leaseInput,
          paymentFunding,
          salePrice,
          vehicle
        })
      : {};
    const retailFieldValues = hasPdfTemplate(form) && packetType === "MINNESOTA_RETAIL_SALE"
      ? retailSaleTemplateFieldValues({
          customerName,
          dealNumber,
          dealType,
          feeTotal,
          generatedAt,
          paymentFunding,
          salePrice,
          vehicle
        })
      : {};
    return {
      ...(isPersonalReferencesForm ? {
        contentBase64: await personalReferencesPdfBase64({
          customerName,
          dealNumber,
          dealType,
          generatedAt,
          paymentFunding,
          salePrice,
          vehicle
        }),
        contentType: "application/pdf" as const
      } : hasPdfTemplate(form) && packetType === "LEASE_TO_OWN" ? {
        contentBase64: await filledPdfBase64(form.templatePath, leaseFieldValues),
        contentType: "application/pdf" as const,
        fieldValues: leaseFieldValues,
        templatePath: form.templatePath
      } : hasPdfTemplate(form) && packetType === "MINNESOTA_RETAIL_SALE" ? {
        contentBase64: await filledPdfBase64(form.templatePath, retailFieldValues),
        contentType: "application/pdf" as const,
        fieldValues: retailFieldValues,
        templatePath: form.templatePath
      } : {
        contentType: "text/html" as const
      }),
      archiveStatus: "ARCHIVED" as const,
      category: form.category,
      downloadFileName: `${form.id}-${packet}.${isPdfDocument ? "pdf" : "html"}`,
      formId: form.id,
      html: packetType === "DAILY_RENTAL"
        ? buildRentalDocumentHtml({
            customerName,
            dealNumber,
            form: form as DailyRentalFormItem,
            generatedAt,
            rental: rentalInput,
            vehicle
          })
        : packetType === "VEHICLE_LOANER"
          ? buildCourtesyLoanerDocumentHtml({
              customerName,
              dealNumber,
              form: form as DailyRentalFormItem,
              generatedAt,
              rental: rentalInput,
              vehicle
            })
        : form.id === "personal-references"
          ? buildPersonalReferencesDocumentHtml({
              customerName,
              dealNumber,
              dealType,
              generatedAt,
              label: form.label,
              paymentFunding,
              salePrice,
              sourceBasis: form.basis,
              trigger: form.trigger,
              vehicle
            })
        : buildDocumentHtml({
            customerName,
            dealNumber,
            dealType,
            feeTotal,
            generatedAt,
            label: form.label,
            paymentFunding,
            salePrice,
            sourceBasis: form.basis,
            trigger: form.trigger,
            vehicle,
            extraRows: leaseRows,
            packetIntro: packetType === "LEASE_TO_OWN"
              ? "Generated lease-to-own packet preview from dealership source templates and calculator inputs. Confirm current legal/compliance language before customer signature."
              : undefined
          }),
      label: form.label,
      signatureStatus: "UNSIGNED" as const,
      sourceBasis: form.basis,
      trigger: form.trigger,
      version: 1
    };
  }));

  const result: UnifiedCrmContractPacketResult = {
    auditTrail: [
      {
        action: "CONTRACT_PACKET_GENERATED",
        actorUserId: actor.id,
        at: generatedAt,
        detail: packetType === "LEASE_TO_OWN"
          ? `${documents.length} lease-to-own form(s) generated and archived.`
          : packetType === "VEHICLE_LOANER"
            ? `${documents.length} vehicle loaner form(s) generated and archived.`
          : packetType === "DAILY_RENTAL"
            ? `${documents.length} daily rental form(s) generated and archived.`
            : `${documents.length} Minnesota sale form(s) generated and archived.`
      }
    ],
    contractVersion: UNIFIED_CRM_CONTRACT_PACKET_CONTRACT_VERSION,
    delivery: {
      downloadReady: true,
      emailReady: true,
      eSignatureReady: false,
      printReady: true,
      providerHoldReason: "E-signature provider activation is not enabled; use manual print/download or approved CRM email/text link delivery.",
      textReady: true
    },
    documents,
    generatedAt,
    generatedByUserId: actor.id,
    packetId,
    packetNumber: packet,
    status: "ARCHIVED"
  };
  ARCHIVE.set(packetId, result);
  return result;
}

export async function getUnifiedCrmContractPacket(packetId: string) {
  const result = ARCHIVE.get(packetId);
  if (!result) {
    throw new UnifiedCrmContractPacketError("CONTRACT_PACKET_NOT_FOUND", "Contract packet is not archived in this session.");
  }
  return result;
}
