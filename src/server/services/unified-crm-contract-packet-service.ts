import { readFileSync } from "node:fs";
import { join } from "node:path";
import { dealDeskLogoHtml, drawDealDeskPdfLogo } from "./deal-desk-document-brand";

import { BHPH_FORM_PACKET, requiredBhphFormIds, type BhphFormItem } from "@/lib/bhph-form-packet";
import { TEST_DRIVE_FORM_PACKET, testDriveFacts, testDriveAgreementError } from "@/lib/test-drive-form-packet";
import { testDriveAgreementHtml, testDriveAgreementPdfBase64 } from "./test-drive-agreement-document";
import { BHPH_WARRANTY_FORM_ID, LEASE_WARRANTY_FORM_ID, DEALER_WARRANTY_POSTURE, dealerWarrantyPosture, dealerWarrantyDetails, dealerWarrantyError } from "@/lib/dealer-warranty-policy";
import { dealerWarrantyHtml, dealerWarrantyPdfBase64 } from "./dealer-warranty-document";
import { COURTESY_LOANER_FORM_PACKET, DAILY_RENTAL_FORM_PACKET, requiredCourtesyLoanerFormIds, requiredDailyRentalFormIds, type DailyRentalFormItem } from "@/lib/daily-rental-form-packet";
import { allLeaseToOwnFormIds, calculateLeaseToOwn, leaseAgreementCalculationError, leaseNextPaymentDate, LEASE_TO_OWN_FORM_PACKET, type LeasePaymentFrequency, type LeaseToOwnCalculatorInput } from "@/lib/lease-to-own-form-packet";
import { MN_SALE_FORM_PACKET, requiredMinnesotaSaleFormIds, type MinnesotaSaleFormItem } from "@/lib/mn-vehicle-sale-form-packet";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import type { AuthenticatedUser } from "@/server/auth/store";
import { leaseSummaryHtml, leaseSummaryPdfBase64, type LeaseSummary } from "./lease-summary-document";
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

const REFERENCE_AUTHORIZATION = [
  "I confirm that all five references are accurate, current, personally known to me, and not fabricated.",
  "I authorize Time Motor Sales to contact these references for verification, underwriting, account servicing, payment follow-up, or locating me or the vehicle, where allowed by law.",
  "I will keep my contact, employment, insurance, and reference information current. False, incomplete, or unreachable references may delay approval, delivery, or account setup."
];

function text(value: unknown, fallback: string, max = 240) {
  const result = typeof value === "string" ? value.trim() : "";
  if (!result) return fallback;
  return result.slice(0, max);
}

type PacketFormItem = BhphFormItem | DailyRentalFormItem | MinnesotaSaleFormItem | typeof LEASE_TO_OWN_FORM_PACKET[number];

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
    bodyStyle: text(vehicle.bodyStyle, ""),
    license: text(vehicle.license, ""),
    mileage: text(vehicle.mileage, ""),
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

function bhphFacts(value: unknown) {
  const bhph = value && typeof value === "object" ? value as Record<string, unknown> : {};
  return {
    amountFinanced: text(bhph.amountFinanced, "$0.00"),
    apr: text(bhph.apr, "Not captured"),
    approvalTriggers: text(bhph.approvalTriggers, "0"),
    coBuyer: text(bhph.coBuyer, "None"),
    downPayment: text(bhph.downPayment, "$0.00"),
    deliveryAt: text(bhph.deliveryAt, ""),
    deliveryMileage: text(bhph.deliveryMileage, ""),
    employer: text(bhph.employer, "Not captured"),
    evidenceCount: text(bhph.evidenceCount, "0"),
    firstPaymentDate: text(bhph.firstPaymentDate, "Not captured"),
    handoffCount: text(bhph.handoffCount, "0"),
    income: text(bhph.income, "Not captured"),
    insuranceStatus: text(bhph.insuranceStatus, "Not captured"),
    lateFee: text(bhph.lateFee, "Not captured"),
    paperworkCount: text(bhph.paperworkCount, "0"),
    paymentAmount: text(bhph.paymentAmount, "$0.00"),
    paymentFrequency: text(bhph.paymentFrequency, "Not captured"),
    references: text(bhph.references, "Not captured"),
    residence: text(bhph.residence, "Not captured"),
    salePrice: text(bhph.salePrice, "$0.00"),
    stipulations: text(bhph.stipulations, "None"),
    termMonths: text(bhph.termMonths, "Not captured"),
    titleStatus: text(bhph.titleStatus, "Not captured"),
    warrantyPosture: DEALER_WARRANTY_POSTURE
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
    calculationMode: input.calculationMode === "PAYMENT_AMOUNT" ? "PAYMENT_AMOUNT" : "TERM",
    targetPaymentCents: moneyCents(input.targetPaymentCents),
    contractLength: numberValue(input.contractLength),
    documentPreparationFeeCents: moneyCents(input.documentPreparationFeeCents),
    downPaymentCents: moneyCents(input.downPaymentCents),
    signingPaymentMode: input.signingPaymentMode === "CAPITALIZED_REDUCTION" ? "CAPITALIZED_REDUCTION" : input.signingPaymentMode === "DOWN_PAYMENT" ? "DOWN_PAYMENT" : undefined,
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

export async function personalReferencesPdfBase64(input: {
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

  await drawDealDeskPdfLogo(pdf, page, { x: 36, y: 758, width: 144 });
  draw("1101 E. Lake Street, Minneapolis, MN 55407 | 612-724-3631", 190, 763, 7, false, muted);
  draw("timemotors.net | timemotorsale@gmail.com", 355, 776, 8, false, muted);
  draw(input.dealType === "BHPH" ? "References and Contact Authorization" : "Personal References and Verification", 36, 742, 16, true);
  draw("Customer must provide at least five reachable personal references.", 36, 726, 9, false, muted);
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
  draw("All five entries are required. Provide current phone numbers for people who know you.", 36, 573, 8.5, false, muted);

  [1, 2, 3, 4, 5].forEach((index) => {
    const y = 503 - (index - 1) * 68;
    const prefix = `ref_${index}`;
    draw(`Reference ${index}`, 36, y + 47, 9, true);
    field("Full name", `${prefix}_name`, 36, y + 18, 150);
    field("Relationship", `${prefix}_relationship`, 196, y + 18, 100);
    field("Phone", `${prefix}_phone`, 306, y + 18, 110);
    for (const suffix of ["name", "relationship", "phone"]) form.getTextField(`${prefix}_${suffix}`).enableRequired();
    field("Alternate phone / email", `${prefix}_alternate`, 426, y + 18, 150);
    field("Best time to contact", `${prefix}_best_time`, 36, y - 10, 130);
    field("Years known", `${prefix}_years_known`, 176, y - 10, 64);
    field("Staff verification notes", `${prefix}_notes`, 250, y - 10, 326);
  });

  draw("Customer authorization", 36, 205, 11, true);
  let authorizationY = 190;
  for (const paragraph of REFERENCE_AUTHORIZATION) {
    let line = "";
    for (const word of paragraph.split(" ")) {
      const next = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(next, 8) > 540) {
        draw(line, 36, authorizationY, 8, false, muted);
        authorizationY -= 11;
        line = word;
      } else line = next;
    }
    draw(line, 36, authorizationY, 8, false, muted);
    authorizationY -= 15;
  }

  field("Customer signature", "customer_signature", 36, 96, 230, 20);
  field("Date", "customer_signature_date", 280, 96, 90, 20);
  field("Dealer representative", "dealer_representative", 384, 96, 192, 20);
  field("Staff review / notes", "staff_review_notes", 36, 44, 540, 24);

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
  leaseFacts: Record<string, unknown>;
  paymentFunding: string;
  salePrice: string;
  vehicle: ReturnType<typeof vehicleFacts>;
}) {
  const leaseDate = formDate(text(input.leaseFacts.agreementDate, input.generatedAt));
  const firstPaymentDate = text(input.leaseFacts.firstPaymentDate, leaseNextPaymentDate(text(input.leaseFacts.agreementDate, input.generatedAt), input.leaseInput.paymentFrequency));
  const dueDate = firstPaymentDate || text(input.leaseFacts.agreementDate, input.generatedAt);
  const dueDay = input.leaseInput.paymentFrequency === "Monthly" ? String(new Date(dueDate).getUTCDate()) : formWeekday(dueDate);
  const vehicleDescription = `${input.vehicle.year} ${input.vehicle.make} ${input.vehicle.model}`.trim();
  const common = {
    "CO-LESSEE": text(input.leaseFacts.coLesseeName, "N/A"),
    "COLESSEE": text(input.leaseFacts.coLesseeName, "N/A"),
    "Color": input.vehicle.color,
    "DATE": leaseDate,
    "Date of Lease Agreement": leaseDate,
    "DESCRIPTION OF LEASED MOTOR VEHICLE Year": input.vehicle.year,
    "Driver’s Lic": text(input.leaseFacts.idNumber, ""),
    "Execution Date": leaseDate,
    "LESSEE": input.customerName,
    "LESSEE Name": input.customerName,
    "LESSEE PRINT NAME": input.customerName,
    "Make": input.vehicle.make,
    "Model": input.vehicle.model,
    "Name-Address Lessee": [input.customerName, text(input.leaseFacts.lesseeAddress, "")].filter(Boolean).join(", "),
    "Name-Address Lessor": "Time Motor Sales, Inc., 1101 E. Lake Street, Minneapolis, MN 55407",
    "Bus Ph": "612-724-3631",
    "Name-Address Co-Lessee": text(input.leaseFacts.coLesseeName, "N/A"),
    "County": text(input.leaseFacts.lesseeCounty, ""),
    "State": text(input.leaseFacts.lesseeState, ""),
    "Res Ph": "",
    "County_2": text(input.leaseFacts.coLesseeName, "") ? "" : "N/A",
    "Driver’s Lic_2": text(input.leaseFacts.coLesseeName, "") ? "" : "N/A",
    "State_2": text(input.leaseFacts.coLesseeName, "") ? "" : "N/A",
    "Res Ph_2": text(input.leaseFacts.coLesseeName, "") ? "" : "N/A",
    "Cell Ph_2": text(input.leaseFacts.coLesseeName, "") ? "" : "N/A",
    "PRINT NAME": input.customerName,
    "PRINT NAME_2": "",
    "PRINT NAME_3": text(input.leaseFacts.coLesseeName, "N/A"),
    "TITLE": "",
    "Cell Ph": text(input.leaseFacts.lesseePhone, ""),
    "Ins Co": text(input.leaseFacts.insuranceCompany, ""),
    "Insurance Agent": text(input.leaseFacts.agentName, ""),
    "Ph": text(input.leaseFacts.insurancePhone, ""),
    "LEASE DISCLOSURES  Lessee’s E-Mail": text(input.leaseFacts.lesseeEmail, ""),
    "Body Style": input.vehicle.bodyStyle,
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
    const hasFinalAdjustment = input.calculator.finalPeriodicPaymentCents !== input.calculator.totalPeriodicPaymentCents;
    return {
      ...common,
      "Amount to be paid in cash 1": "N/A",
      "CO-LESSEE": "",
      "Amount to be paid in cash 2": "N/A",
      "Amount to be paid in cash 3": "N/A",
      "Amount to be paid in cash 4": "N/A",
      "DELIVERY, followed by 1": String(Math.max(0, paymentCount - (hasFinalAdjustment ? 2 : 1))),
      "DELIVERY, followed by 2": "",
      "DELIVERY, followed by 3": hasFinalAdjustment ? `Final: $${formatFormMoney(input.calculator.finalPeriodicPaymentCents)}` : "",
      "Document preparation fee not gov fee": formatFormMoney(input.leaseInput.documentPreparationFeeCents),
      "Gross capitalized cost The agreed upon value of the vehicle of": formatFormMoney(input.calculator.grossCapitalizedCostCents),
      "Odometer Reading": input.vehicle.mileage,
      "Pay1": formatFormMoney(input.calculator.totalPeriodicPaymentCents),
      "Rate": "0.000",
      "Text2": input.leaseInput.paymentFrequency === "BiWeekly" ? "biweekly" : input.leaseInput.paymentFrequency.toLowerCase(),
      "The total of all your periodic payments is": formatFormMoney(input.calculator.totalOfAllPeriodicPaymentsCents),
      "Total": "0.00",
      "Total Amount Due at Lease Signing or Delivery": formatFormMoney(input.calculator.amountDueAtSigningCents),
      "Total_2": formatFormMoney(input.calculator.amountDueAtSigningCents),
      "and any outstanding prior credit or lease balance": "0.00",
      "due on the": dueDay,
      "of each": input.leaseInput.paymentFrequency === "Monthly" ? "month" : input.leaseInput.paymentFrequency === "Weekly" ? "week" : "other week",
      "payments of": formatFormMoney(input.calculator.totalPeriodicPaymentCents),
      "starting": firstPaymentDate ? formDate(firstPaymentDate) : leaseDate,
      "undefined": formatFormMoney(input.calculator.amountDueAtSigningCents),
      "undefined_2": "0.00",
      "undefined_3": "0.00",
      "undefined_4": "0.00",
      "undefined_5": formatFormMoney(input.calculator.totalOfPaymentsCents),
      "undefined_6": "0.00",
      "undefined_7": formatFormMoney(input.calculator.capitalizedCostReductionCents),
      "undefined_8": formatFormMoney(input.leaseInput.registrationFeeCents),
      "undefined_9": formatFormMoney(input.calculator.totalPeriodicPaymentCents),
      "undefined_10": formatFormMoney(input.leaseInput.originationFeeCents),
      "undefined_11": "0.00",
      "undefined_12": formatFormMoney(input.leaseInput.titleFeeCents),
      "undefined_13": "0.00",
      "undefined_14": "0.00",
      "undefined_15": "0.00",
      "undefined_16": "0.00",
      "undefined_17": "0.00",
      "undefined_18": formatFormMoney(input.calculator.applicableTaxesCents),
      "undefined_19": "0.00",
      "undefined_20": "0.00",
      "undefined_21": formatFormMoney(input.calculator.amountDueAtSigningCents),
      "undefined_22": "0.00",
      "undefined_23": "0.00",
      "undefined_24": "0.00",
      "undefined_25": "0.00",
      "undefined_26": formatFormMoney(input.leaseInput.additionalItemsCents),
      "undefined_27": formatFormMoney(input.calculator.grossCapitalizedCostTotalCents),
      "undefined_28": formatFormMoney(input.calculator.capitalizedCostReductionCents),
      "undefined_29": formatFormMoney(input.calculator.adjustedCapitalizedCostCents),
      "undefined_30": formatFormMoney(input.calculator.residualValueCents),
      "undefined_31": formatFormMoney(input.calculator.depreciationAndAmortizedAmountCents),
      "undefined_32": "0.00",
      "undefined_33": formatFormMoney(input.calculator.totalBasePeriodicPaymentsCents),
      "undefined_34": String(paymentCount),
      "undefined_35": formatFormMoney(input.calculator.basePeriodicPaymentCents),
      "undefined_36": "0.00",
      "undefined-43": formatFormMoney(input.calculator.estimatedFeesAndTaxesOverTermCents),
      "undefined_38": "0.00",
      "undefined_39": formatFormMoney(input.calculator.totalPeriodicPaymentCents),
      "Year": input.vehicle.year,
      "Make": input.vehicle.make,
      "Model": input.vehicle.model,
      "VIN": input.vehicle.vin,
      "Color": input.vehicle.color,
      "Veh Lic": input.vehicle.license
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
      "Current Mileage": input.vehicle.mileage,
      "Service Facility": text(input.leaseFacts.serviceFacility, ""),
      "Service Facility Telephone Number": text(input.leaseFacts.serviceFacilityPhone, "")
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
  ${dealDeskLogoHtml()}
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
  const references = [1, 2, 3, 4, 5].map((index) => `
    <section class="reference">
      <h2>Reference ${index}</h2>
      <div class="contact-row"><label>Full name<span></span></label><label>Relationship<span></span></label><label>Phone<span></span></label><label>Alternate phone / email<span></span></label></div>
      <div class="verification-row"><label>Best time to contact<span></span></label><label>Years known<span></span></label><label>Staff verification notes<span></span></label></div>
    </section>
  `).join("");

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(input.label)}</title>
  <style>
    * { box-sizing: border-box; }
    @page { size: letter; margin: 0.45in; }
    body { color: #20252b; font: 11px Arial, sans-serif; margin: 24px auto; max-width: 720px; }
    .letterhead { border-bottom: 1px solid #bfc7ce; margin-bottom: 12px; padding-bottom: 8px; }
    .letterhead strong { font-size: 15px; }
    .letterhead p { margin: 3px 0; }
    h1 { font-size: 18px; margin: 0 0 6px; }
    h2 { font-size: 12px; margin: 6px 0; }
    p, li { line-height: 1.35; }
    .notice { margin: 0 0 10px; }
    .details { display: grid; gap: 6px 16px; grid-template-columns: 1fr 1fr; border-block: 1px solid #bfc7ce; padding: 8px 0; margin-bottom: 8px; }
    .reference { break-inside: avoid; border-bottom: 1px solid #d1d6db; padding: 4px 0; }
    .contact-row { display: grid; gap: 8px; grid-template-columns: 1.4fr 1fr 1fr 1.4fr; }
    .verification-row { display: grid; gap: 8px; grid-template-columns: 1.2fr 0.6fr 3fr; margin-top: 5px; }
    label { display: block; font-size: 9px; }
    label span { display: block; height: 18px; border: 1px solid #bfc7ce; margin-top: 3px; }
    .authorization { margin-top: 12px; }
    .authorization p { margin: 5px 0; }
    .signature { display: grid; gap: 16px; grid-template-columns: 1fr 1fr; margin-top: 26px; }
    .line { border-top: 1px solid #20252b; padding-top: 5px; }
    @media print { body { margin: 0; max-width: none; } }
    @media screen and (max-width: 500px) { body { padding: 0 12px; } .contact-row, .details { grid-template-columns: 1fr 1fr; } }
  </style>
</head>
<body>
  <header class="letterhead">${dealDeskLogoHtml(true)}<strong>Time Motor Sales, Inc.</strong><p>1101 E. Lake Street, Minneapolis, MN 55407 | 612-724-3631</p><p>timemotors.net | timemotorsale@gmail.com</p></header>
  <h1>${escapeHtml(input.label)}</h1>
  <p class="notice">Customer must provide at least five reachable personal references. All five entries are required.</p>
  <div class="details"><div><strong>Customer:</strong> ${escapeHtml(input.customerName)}</div><div><strong>Deal / type:</strong> ${escapeHtml(input.dealNumber)} / ${escapeHtml(input.dealType)}</div><div><strong>Vehicle:</strong> ${escapeHtml(vehicleLine)}</div><div><strong>VIN:</strong> ${escapeHtml(input.vehicle.vin)}</div><div><strong>Customer phone:</strong> ____________________</div><div><strong>Date:</strong> ${escapeHtml(input.generatedAt.slice(0, 10))}</div></div>
  ${references}
  <section class="authorization">
    <h2>Customer authorization</h2>
    ${REFERENCE_AUTHORIZATION.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("")}
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
        heading: "Parties, rental purpose, and vehicle",
        rows: [
          ["Owner / rental company", "Time Motor Sales, Inc."],
          ["Rental company address", "1101 E. Lake Street, Minneapolis, MN 55407"],
          ["Rental company phone", "612-724-3631"],
          ["Rental company email", "timemotorsale@gmail.com"],
          ["Rental company website", "timemotors.net"],
          ["Renter", input.customerName],
          ["Agreement date", input.generatedAt],
          ["Rental agreement #", input.dealNumber],
          ["Purpose", "Short-term daily vehicle rental. This agreement does not transfer ownership, title, leasehold interest, agency authority, employment status, or any right to use the vehicle except as expressly permitted below."],
          ["Governing law", "Minnesota law applies unless a nonwaivable law requires otherwise."]
        ]
      },
      { heading: "Rental facts", rows: commonRows },
      {
        heading: "Minnesota rental vehicle insurance notice",
        bullets: [
          MINNESOTA_RENTAL_COVERAGE_NOTICE,
          "Renter acknowledges that this notice must be read and understood before any collision damage waiver, added liability product, personal accident product, personal effects product, or similar rental coverage is accepted.",
          "This rental packet does not offer or sell a collision damage waiver unless a separate compliant waiver program and written election are provided.",
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
        heading: "Authorized drivers and renter promises",
        bullets: [
          "Only drivers specifically listed in the rental record and approved by Time Motor Sales may operate the vehicle.",
          "Renter represents that every authorized driver is properly licensed, legally eligible to drive, not impaired, not excluded by insurance, and listed as an authorized driver before operating the vehicle.",
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
          "A deposit or authorization hold is not a limit of Renter's responsibility.",
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
        heading: "Default and vehicle recovery",
        bullets: [
          "Renter is in default if the vehicle is not returned when due, payment fails, the vehicle is used by an unauthorized driver, renter breaches a prohibited-use term, renter provides false information, the vehicle is abandoned or concealed, or Time Motor Sales reasonably believes the vehicle or public is at risk.",
          "Upon default, Time Motor Sales may terminate the rental, demand immediate return, remotely disable or locate the vehicle where lawful and disclosed, recover the vehicle peacefully, notify law enforcement, and charge lawful recovery costs.",
          "Renter releases Time Motor Sales from claims arising from lawful recovery of the vehicle from public property, dealership property, or any place where recovery may legally occur, except to the extent caused by Time Motor Sales' own nonwaivable legal fault."
        ]
      },
      {
        heading: "Indemnity, no agency, and liability allocation",
        bullets: [
          "To the fullest extent permitted by Minnesota law, renter agrees to indemnify and hold Time Motor Sales harmless from claims, losses, damages, fines, penalties, citations, tolls, injuries, property damage, expenses, and attorney fees arising from renter's breach, prohibited use, unauthorized driver, false information, negligence, intentional misconduct, illegal use, or failure to cooperate.",
          "This indemnity does not waive any duty, coverage, or liability that Minnesota law does not permit Time Motor Sales to waive or shift.",
          "Renter and authorized drivers are not agents, employees, partners, representatives, or contractors of Time Motor Sales.",
          "Renter has no authority to bind Time Motor Sales, admit liability on its behalf, authorize repairs, settle claims, or represent dealership consent beyond this agreement.",
          "Nothing in this agreement limits liability for Time Motor Sales' own nonwaivable negligence, statutory duties, or obligations under Minnesota compulsory insurance law.",
          "If any term is unenforceable, the remaining terms remain effective and the unenforceable term will be limited to the maximum lawful scope."
        ]
      },
      {
        heading: "Privacy and records",
        bullets: [
          "Time Motor Sales may collect and retain driver license information, insurance information, contact information, payment authorization records, inspection photos, communications, GPS or telematics records if applicable, incident records, citation and toll records, and claim documents for legitimate business, safety, legal, regulatory, payment, claim, and recovery purposes.",
          "Renter authorizes Time Motor Sales to use and share records reasonably necessary for vehicle custody, safety, insurance verification, payment processing, claim handling, recovery, legal compliance, and dispute resolution.",
          "Customer information should be handled under dealership privacy and safeguards obligations, including applicable customer-information safeguards for dealership records."
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
        heading: "Rental framework",
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
          "Renter remains responsible for chargeable items received or discovered after return, including tolls, citations, camera tickets, impound notices, tow invoices, damage estimates, insurance deductibles, and claim expenses.",
          "No delay by Time Motor Sales in enforcing a right is a waiver of that right."
        ]
      }
    ],
    "damage-loss-responsibility": [
      {
        heading: "Damage and loss responsibility",
        bullets: [
          "Unless a valid protection option applies and is not voided, renter is responsible for loss of or damage to the vehicle during the rental period to the extent allowed by law and except to the extent paid by applicable insurance.",
          "Responsibility may include repair or replacement cost, theft or conversion, loss of use, towing, storage, impound, administrative costs, diminished value, missing equipment, keys, fobs, plates, documents, and recovery costs where allowed by law.",
          "Renter must immediately report damage, theft, accident, impound, or police contact and cooperate with the dealership, insurers, and law enforcement.",
          "Protection options do not apply to prohibited use, unauthorized drivers, intentional damage, intoxicated driving, illegal use, misrepresentation, or failure to report an incident unless the applicable written program and law require otherwise.",
          "Time Motor Sales will credit insurance or third-party recoveries against the same loss and will not obtain double recovery."
        ]
      }
    ],
    "protection-election": [
      {
        heading: "Minnesota insurance notice and protection election",
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
          ["Rental agreement #", input.dealNumber],
          ["Renter", input.customerName],
          ["Vehicle", vehicleLine || "Not captured"],
          ["VIN", input.vehicle.vin],
          ["Mileage out", input.rental.mileageOut],
          ["Fuel out", input.rental.fuelOut],
          ["Return fuel rule", input.rental.returnFuel],
          ["Key / fob count", "Record keys and fobs before release"],
          ["Equipment present", "Record plates, registration, insurance card, charger, tools, mats, accessories, and dealership property"],
          ["Existing damage", "Document photos and notes before release"],
          ["Required checkout photos", "Front, rear, driver side, passenger side, interior, odometer/fuel, existing damage"],
          ["Customer checkout acknowledgement", "Renter had an opportunity to inspect the vehicle and identify visible pre-existing damage before departure."]
        ]
      },
      {
        heading: "Return inspection",
        bullets: [
          "Staff should compare return condition to checkout photos and notes.",
          "New damage, missing equipment, fuel shortage, cleaning issue, odor, late return, or mileage overage should be recorded before closing the rental.",
          "Required return photos should include return front, return rear, return sides, return interior, return odometer/fuel, and return damage review.",
          "The return record documents physical custody and observed condition only. It is not a release, settlement, waiver, admission of liability, final invoice, or final insurance determination.",
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
        heading: "Accident, theft, impound, citation, tow, or police contact",
        bullets: [
          "Stop safely, call emergency services when needed, and contact law enforcement when required by law.",
          "Notify the dealership as soon as safely possible and provide a written incident report.",
          "Collect other driver, witness, insurance, police report, and location information.",
          "Preserve photos, notices, citations, tow invoices, claim documents, and all evidence related to the incident.",
          "Do not admit fault for Time Motor Sales, abandon the vehicle, authorize repairs, dispose of evidence, or continue driving an unsafe vehicle without dealership instruction.",
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
  const vehicleLine = `${input.vehicle.year} ${input.vehicle.make} ${input.vehicle.model} ${input.vehicle.color}`.replace(/\s+/g, " ").trim();
  const dealerName = "Time Motor Sales, Inc.";
  const dealerAddress = "1101 E. Lake Street, Minneapolis, MN 55407";
  const dealerPhone = "612-724-3631";
  const dealerWebsite = "timemotors.net";
  const dealerEmail = "timemotorsale@gmail.com";
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
    .letterhead { align-items: start; border-bottom: 3px solid #061735; display: grid; gap: 18px; grid-template-columns: 1.2fr 1fr; margin-bottom: 24px; padding-bottom: 16px; }
    .brand { letter-spacing: 0.08em; text-transform: uppercase; }
    .brand strong { display: block; font-size: 24px; letter-spacing: 0; text-transform: none; }
    .brand span { color: #2f49c6; font-size: 13px; font-weight: 800; }
    .contact { color: #34445d; font-size: 13px; line-height: 1.45; text-align: right; }
    .contact strong { color: #061735; display: block; font-size: 14px; }
    .document-id { background: #f6f9ff; border: 1px solid #dbe6f8; border-radius: 10px; display: grid; gap: 8px; grid-template-columns: repeat(3, 1fr); margin: 16px 0 22px; padding: 12px; }
    .document-id span { color: #52647d; display: block; font-size: 11px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; }
    .document-id strong { color: #061735; display: block; font-size: 13px; margin-top: 3px; }
    table { border-collapse: collapse; margin-top: 12px; width: 100%; }
    th, td { border: 1px solid #dbe6f8; padding: 10px; text-align: left; vertical-align: top; }
    th { background: #f6f9ff; color: #34445d; width: 34%; }
    .notice { background: #fff7ed; border: 1px solid #fed7aa; border-radius: 10px; color: #7c2d12; margin: 18px 0; padding: 12px; }
    .signature { display: grid; gap: 24px; grid-template-columns: 1fr 1fr; margin-top: 42px; }
    .line { border-top: 1px solid #061735; padding-top: 8px; }
  </style>
</head>
<body>
  <header class="letterhead">
    <div class="brand">
      ${dealDeskLogoHtml()}
      <strong>${escapeHtml(dealerName)}</strong>
      <p>Daily Vehicle Rental Packet</p>
    </div>
    <div class="contact">
      <strong>${escapeHtml(dealerAddress)}</strong>
      Phone: ${escapeHtml(dealerPhone)}<br />
      Website: ${escapeHtml(dealerWebsite)}<br />
      ${escapeHtml(dealerEmail)}
    </div>
  </header>
  <h1>${escapeHtml(input.form.label)}</h1>
  <p class="meta">Generated ${escapeHtml(input.generatedAt)} · ${escapeHtml(input.form.basis)} · ${escapeHtml(input.form.trigger)}</p>
  <div class="document-id">
    <div><span>Rental agreement</span><strong>${escapeHtml(input.dealNumber)}</strong></div>
    <div><span>Renter</span><strong>${escapeHtml(input.customerName)}</strong></div>
    <div><span>Vehicle</span><strong>${escapeHtml(vehicleLine || input.vehicle.vin || "Not captured")}</strong></div>
  </div>
  <p class="notice">Renter must read and sign the applicable rental packet documents before taking possession of the rental vehicle. This packet governs temporary rental custody only and does not transfer ownership, title, leasehold interest, agency authority, or employment status.</p>
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
  const dealerName = "Time Motor Sales, Inc.";
  const dealerAddress = "1101 E. Lake Street, Minneapolis, MN 55407";
  const dealerPhone = "612-724-3631";
  const dealerWebsite = "timemotors.net";
  const dealerEmail = "timemotorsale@gmail.com";
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
        heading: "Parties, purpose, and courtesy vehicle",
        rows: [
          ["Owner / dealer", dealerName],
          ["Dealer address", dealerAddress],
          ["Dealer phone", dealerPhone],
          ["Dealer website", dealerWebsite],
          ["Dealer email", dealerEmail],
          ["Purpose", "Temporary customer mobility for the limited service, sales, or dealership reason recorded in this agreement. This agreement does not transfer title, ownership, leasehold interest, employment status, agency authority, or any right to use the vehicle except as expressly permitted below."],
          ...commonRows
        ]
      },
      {
        heading: "Loaner period and return duty",
        bullets: [
          "Customer must return the courtesy vehicle by the stated return date and time, or earlier upon request by Time Motor Sales.",
          "Any extension must be approved in writing by Time Motor Sales before the return deadline.",
          "Keeping the vehicle after the return deadline or after a return demand is a material breach.",
          "Customer must return the vehicle to the dealership location or other return location approved by Time Motor Sales."
        ]
      },
      {
        heading: "Authorized drivers only",
        bullets: [
          "Only drivers specifically listed in this agreement and approved by Time Motor Sales may operate the courtesy vehicle.",
          "Customer may not allow any other person to drive, possess, park, move, service, repair, tow, store, or control the vehicle.",
          "Possession of keys, family relationship, employment relationship, insurance coverage, or verbal permission from Customer does not create authorization by Time Motor Sales.",
          "Additional drivers require prior written approval by Time Motor Sales.",
          "Customer must safeguard all keys and take reasonable steps to prevent unauthorized operation. If the vehicle or keys are taken without permission, Customer must immediately notify Time Motor Sales and law enforcement."
        ]
      },
      {
        heading: "Driver eligibility",
        bullets: [
          "Each authorized driver must have a valid, unrestricted driver license and must be legally permitted to operate the vehicle.",
          "Customer represents that no authorized driver is suspended, revoked, impaired, excluded by insurance, medically unfit, or otherwise legally prohibited from driving.",
          "Customer must immediately notify Time Motor Sales if any driver license, insurance status, residence, eligibility, or legal ability to operate changes.",
          "Customer must not permit operation by any driver who is impaired by alcohol, drugs, medication, fatigue, or any condition affecting safe operation."
        ]
      },
      {
        heading: "Insurance representation",
        bullets: [
          "Customer represents that Customer has provided current and truthful insurance information before taking possession.",
          "Time Motor Sales' review, recording, or verification of insurance information does not guarantee coverage, does not make Time Motor Sales responsible for coverage decisions, and does not waive Customer's obligations.",
          "Customer represents that all insurance information supplied is truthful, current, and not cancelled, suspended, excluded, or otherwise inapplicable as of vehicle release.",
          "Customer authorizes Time Motor Sales, its insurers, and claim representatives to verify coverage and exchange information reasonably needed for a claim, loss, recovery, or legal process.",
          "Customer must immediately report cancellation, lapse, suspension, exclusion, or material policy change. If coverage ceases, Customer must stop using and promptly return the vehicle.",
          "Misrepresentation or concealment concerning insurance, driver identity, residency, permission, or use is a material breach."
        ]
      },
      {
        heading: "Minnesota insurance notice",
        bullets: [
          "Customer acknowledges receipt of the separate Minnesota Rental Vehicle Insurance Notice included with this packet.",
          "That separate notice is incorporated into this agreement.",
          "Nothing in this agreement expands, guarantees, or replaces any insurance coverage. Coverage remains subject to applicable law and actual policy terms.",
          "If damage to the courtesy vehicle is covered by a Minnesota plan of reparation security, payment by the reparation obligor within the time allowed by Minnesota law is acceptable and prior payment by Customer is not required.",
          "Loss-of-use, rental-vehicle coverage, and any optional protection or waiver language remain subject to applicable Minnesota law, including Minn. Stat. 65B.49 and 72A.125."
        ]
      },
      {
        heading: "Prohibited uses",
        bullets: [
          "No operation by any unauthorized driver.",
          "No operation while impaired by alcohol, drugs, medication, fatigue, or any condition affecting safe operation.",
          "No rideshare, taxi, courier, delivery, livery, towing, pushing, racing, speed testing, driver training, off-road use, or commercial use unless Time Motor Sales expressly approves in writing.",
          "No travel outside the approved geographic area without prior written approval by Time Motor Sales.",
          "No illegal activity, transport of unlawful goods, overloading, intentional damage, abandonment, concealment, or materially risk-increasing use.",
          "No modification, dismantling, unauthorized repair, or tampering with plates, keys, GPS, telematics, safety equipment, dealer equipment, or identifying devices.",
          "No continued operation after warning lights, tire failure, overheating, collision damage, mechanical concern, or any unsafe condition appears.",
          "A prohibited use is a material breach. A breach does not itself determine insurance coverage or third-party rights, which remain governed by applicable law and policy terms."
        ]
      },
      {
        heading: "Vehicle care and condition",
        bullets: [
          "Customer accepts the vehicle in the condition recorded on the Vehicle Condition, Custody, and Return Record.",
          "Customer acknowledges an opportunity to inspect the vehicle before departure and agrees to identify visible pre-existing damage on the condition record.",
          "Customer must use reasonable care, lock the vehicle, safeguard keys, preserve evidence of any incident, and promptly report warning lights, mechanical concerns, damage, theft, vandalism, impound, or police contact.",
          "Customer must not modify, repair, abandon, sell, pledge, sublease, transfer, conceal, or dispose of the vehicle or any part of the vehicle."
        ]
      },
      {
        heading: "Accidents, theft, damage, and incident duties",
        bullets: [
          "After any accident, theft, vandalism, impound, citation, tow, police contact, injury, property damage, or suspected claim, Customer must stop safely and contact emergency services when appropriate.",
          "Customer must notify law enforcement when required and notify Time Motor Sales as soon as reasonably possible.",
          "Customer must identify the actual driver and occupants, gather other party, witness, police, tow, and insurance information, and preserve photos, notices, citations, and claim documents.",
          "Customer must cooperate with Time Motor Sales, insurers, claim administrators, and law enforcement through final resolution.",
          "Customer must not admit liability for Time Motor Sales, settle a claim, authorize repairs, abandon the vehicle, transfer any interest, or dispose of evidence."
        ]
      },
      {
        heading: "Customer financial responsibility",
        bullets: [
          "To the fullest extent permitted by law, and except to the extent paid by applicable insurance or prohibited by law, Customer is responsible for losses, charges, and expenses arising during Customer's possession, control, use, breach, or permitted or unauthorized entrustment of the courtesy vehicle.",
          "Responsibility may include physical damage, theft or conversion, vandalism, missing keys, fobs, plates, equipment, or documents, towing, impound, recovery, storage, and administrative expenses.",
          "Responsibility may also include fuel shortage, excessive cleaning, smoke, odor, biohazard, pet-related cleanup, parking tickets, traffic citations, tolls, camera tickets, towing violations, government fees, late return charges, repair costs, legally recoverable loss of use, legally recoverable diminished value, and claim handling costs caused by false information, prohibited use, late reporting, or failure to cooperate.",
          "Dealer will credit insurance or third-party recoveries against the same loss and will not obtain double recovery.",
          "A deposit, hold, or courtesy fee waiver is not a limit of Customer's responsibility."
        ]
      },
      {
        heading: "Indemnity and reimbursement",
        bullets: [
          "To the fullest extent permitted by Minnesota law, Customer agrees to indemnify, reimburse, and hold harmless Time Motor Sales, its owners, officers, employees, insurers, and agents from losses, claims, damages, fees, costs, and expenses arising from Customer's breach, negligence, intentional misconduct, false statements, unauthorized driver access, prohibited use, failure to report, failure to cooperate, or failure to return the vehicle.",
          "This indemnity does not require Customer to indemnify Time Motor Sales for matters that applicable law does not permit to be indemnified."
        ]
      },
      {
        heading: "Payment authorization",
        bullets: [
          "Customer authorizes Time Motor Sales to charge amounts lawfully due under this agreement, supported by reasonable documentation, and subject to applicable payment-network and consumer-protection rules.",
          "A deposit or payment hold is not a limit of Customer's responsibility.",
          "Customer remains responsible for chargeable items that are discovered after vehicle return, including citations, tolls, camera tickets, tow notices, impound charges, damage, or claim expenses."
        ]
      },
      {
        heading: "Courtesy fee waiver",
        bullets: [
          "If Time Motor Sales waives a daily use fee as a courtesy, that waiver applies only to the stated daily use fee and only for the approved period.",
          "A daily use fee waiver does not waive responsibility for damage, loss, theft, fuel, cleaning, tickets, tolls, citations, late return, unauthorized use, prohibited use, recovery costs, or other chargeable items.",
          "If the courtesy vehicle is connected to a possible purchase, sale, service, repair, or maintenance transaction, that connection does not alter any separate payment obligation, warranty, repair authorization, financing term, sales term, or right concerning Customer's own vehicle unless separately agreed in writing."
        ]
      },
      {
        heading: "Default and vehicle recovery",
        bullets: [
          "Customer is in default if Customer breaches this agreement, provides false information, allows unauthorized use, fails to maintain required insurance, fails to return the vehicle on time, refuses a return demand, conceals the vehicle, or uses the vehicle unlawfully or unsafely.",
          "Upon default, Time Motor Sales may terminate permission, demand immediate return, use lawful location information for dealership property, and recover the vehicle by lawful means without breach of the peace.",
          "Customer must cooperate with lawful recovery, claim, insurance, and law enforcement processes."
        ]
      },
      {
        heading: "No agency or employment",
        bullets: [
          "Customer and authorized drivers are not agents, employees, partners, representatives, or contractors of Time Motor Sales.",
          "Customer has no authority to bind Time Motor Sales, admit liability on its behalf, authorize repairs, settle claims, or represent dealership consent beyond this agreement.",
          "This agreement does not create ownership, title, leasehold, financing, employment, agency, partnership, or contractor rights."
        ]
      },
      {
        heading: "Privacy and records",
        bullets: [
          "Time Motor Sales may collect and retain driver license information, insurance information, contact information, payment authorization records, inspection photos, communications, GPS or telematics records if applicable, incident records, and claim documents for legitimate business, safety, legal, regulatory, claim, and recovery purposes.",
          "Customer information should be handled under dealership privacy and safeguards obligations, including applicable customer-information safeguards for dealership records.",
          "Customer authorizes Time Motor Sales to use and share records reasonably necessary for vehicle custody, safety, insurance verification, claim handling, recovery, legal compliance, and dispute resolution."
        ]
      },
      {
        heading: "No waiver, severability, and Minnesota law",
        bullets: [
          "No waiver is effective unless written and signed by Time Motor Sales.",
          "If any provision is unenforceable, the remaining provisions remain effective to the fullest extent allowed by law.",
          "Minnesota law governs this agreement, except where federal law applies."
        ]
      },
      {
        heading: "Customer acknowledgements",
        bullets: [
          "Customer received and reviewed this agreement before taking possession.",
          "Only listed authorized drivers may operate the courtesy vehicle.",
          "Customer provided truthful license and insurance information.",
          "Customer received the Minnesota Rental Vehicle Insurance Notice.",
          "Customer understands accident, theft, damage, impound, citation, tow, and incident reporting duties.",
          "Customer understands Customer may be responsible for chargeable losses and expenses.",
          "Customer understands a daily courtesy fee waiver does not waive damage, misuse, late return, or other chargeable responsibility.",
          "Customer received a copy of this packet."
        ]
      }
    ],
    "courtesy-loaner-condition-return-record": [
      {
        heading: "Vehicle condition, custody, and return record",
        rows: [
          ["Agreement #", input.dealNumber],
          ["Customer", input.customerName],
          ["Courtesy vehicle VIN", input.vehicle.vin],
          ["Courtesy vehicle", vehicleLine || "Not captured"],
          ["Mileage out", input.rental.mileageOut],
          ["Fuel out", input.rental.fuelOut],
          ["Key / fob count", "Record keys and fobs before release"],
          ["Equipment present", "Record plates, registration, insurance card, charger, tools, mats, accessories, and dealership property"],
          ["Fuel return", input.rental.returnFuel],
          ["Pre-existing damage / checkout notes", "Document photos and notes before release"],
          ["Required checkout photos", "Front, rear, driver side, passenger side, interior, odometer/fuel, existing damage"],
          ["Customer checkout acknowledgement", "Customer had an opportunity to inspect the vehicle and identify visible pre-existing damage before departure."],
          ["Return / incident notes", "Document return condition, incidents, tow/impound, or exceptions"],
          ["Required return photos", "Return front, return rear, return sides, return interior, return odometer/fuel, return damage review"],
          ["Return acknowledgement", "Documents physical custody and observed condition only. This record is not a release, settlement, waiver, admission of liability, final invoice, or final insurance determination."]
        ]
      }
    ],
    "courtesy-loaner-minnesota-insurance-notice": [
      {
        heading: "Minnesota rental vehicle insurance notice",
        bullets: [
          MINNESOTA_RENTAL_COVERAGE_NOTICE,
          "This notice concerns Minnesota rental-vehicle insurance law. It does not represent that Customer has an active policy, that any particular person is an insured, or that a carrier will accept a particular claim.",
          "Coverage remains subject to applicable law and the actual policy.",
          "This packet does not offer or sell a collision damage waiver unless a separate compliant waiver program and written election are provided.",
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
    .letterhead { align-items: start; border-bottom: 3px solid #061735; display: grid; gap: 18px; grid-template-columns: 1.2fr 1fr; margin-bottom: 24px; padding-bottom: 16px; }
    .brand { letter-spacing: 0.08em; text-transform: uppercase; }
    .brand strong { display: block; font-size: 24px; letter-spacing: 0; text-transform: none; }
    .brand span { color: #2f49c6; font-size: 13px; font-weight: 800; }
    .contact { color: #34445d; font-size: 13px; line-height: 1.45; text-align: right; }
    .contact strong { color: #061735; display: block; font-size: 14px; }
    .document-id { background: #f6f9ff; border: 1px solid #dbe6f8; border-radius: 10px; display: grid; gap: 8px; grid-template-columns: repeat(3, 1fr); margin: 16px 0 22px; padding: 12px; }
    .document-id span { color: #52647d; display: block; font-size: 11px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; }
    .document-id strong { color: #061735; display: block; font-size: 13px; margin-top: 3px; }
    table { border-collapse: collapse; margin-top: 12px; width: 100%; }
    th, td { border: 1px solid #dbe6f8; padding: 10px; text-align: left; vertical-align: top; }
    th { background: #f6f9ff; color: #34445d; width: 34%; }
    .notice { background: #eefbf3; border: 1px solid #bbf7d0; border-radius: 10px; color: #14532d; margin: 18px 0; padding: 12px; }
    .signature { display: grid; gap: 24px; grid-template-columns: 1fr 1fr; margin-top: 42px; }
    .line { border-top: 1px solid #061735; padding-top: 8px; }
  </style>
</head>
<body>
  <header class="letterhead">
    <div class="brand">
      ${dealDeskLogoHtml()}
      <strong>${escapeHtml(dealerName)}</strong>
      <p>Courtesy Vehicle Loaner Packet</p>
    </div>
    <div class="contact">
      <strong>${escapeHtml(dealerAddress)}</strong>
      Phone: ${escapeHtml(dealerPhone)}<br />
      Website: ${escapeHtml(dealerWebsite)}<br />
      ${escapeHtml(dealerEmail)}
    </div>
  </header>
  <h1>${escapeHtml(input.form.label)}</h1>
  <p class="meta">Generated ${escapeHtml(input.generatedAt)} · ${escapeHtml(input.form.basis)} · ${escapeHtml(input.form.trigger)}</p>
  <div class="document-id">
    <div><span>Agreement</span><strong>${escapeHtml(input.dealNumber)}</strong></div>
    <div><span>Customer</span><strong>${escapeHtml(input.customerName)}</strong></div>
    <div><span>Vehicle</span><strong>${escapeHtml(vehicleLine || input.vehicle.vin || "Not captured")}</strong></div>
  </div>
  <p class="notice">Customer must read and sign the applicable packet documents before taking possession of the courtesy vehicle. This packet governs temporary custody only and does not transfer ownership, title, leasehold interest, agency authority, or employment status.</p>
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

function buildBhphDocumentHtml(input: {
  bhph: ReturnType<typeof bhphFacts>;
  customerName: string;
  dealNumber: string;
  form: BhphFormItem;
  generatedAt: string;
  vehicle: ReturnType<typeof vehicleFacts>;
}) {
  if (input.form.id === "bhph-references-contact-authorization") {
    return buildPersonalReferencesDocumentHtml({
      ...input,
      dealType: "BHPH",
      label: input.form.label,
      paymentFunding: input.bhph.paymentFrequency,
      salePrice: input.bhph.salePrice,
      sourceBasis: input.form.basis,
      trigger: input.form.trigger
    });
  }
  if (input.form.id === BHPH_WARRANTY_FORM_ID) {
    return dealerWarrantyHtml({
      dealType: "BHPH",
      customerName: input.customerName, coBuyer: input.bhph.coBuyer, dealNumber: input.dealNumber,
      vehicle: `${input.vehicle.year} ${input.vehicle.make} ${input.vehicle.model}`,
      vin: input.vehicle.vin, warranty: dealerWarrantyDetails(input.bhph)!
    });
  }
  const vehicleLine = `${input.vehicle.year} ${input.vehicle.make} ${input.vehicle.model} ${input.vehicle.trim}`.replace(/\s+/g, " ").trim();
  const dealerName = "Time Motor Sales, Inc.";
  const dealerAddress = "1101 E. Lake Street, Minneapolis, MN 55407";
  const dealerPhone = "612-724-3631";
  const dealerWebsite = "timemotors.net";
  const dealerEmail = "timemotorsale@gmail.com";
  const commonRows: Array<[string, string]> = [
    ["Buyer", input.customerName],
    ["Co-buyer", input.bhph.coBuyer],
    ["Account / deal #", input.dealNumber],
    ["Vehicle", vehicleLine || "Not captured"],
    ["VIN", input.vehicle.vin],
    ["Stock #", input.vehicle.stockNumber],
    ["Sale price", input.bhph.salePrice],
    ["Down payment", input.bhph.downPayment],
    ["Amount financed", input.bhph.amountFinanced],
    ["APR", input.bhph.apr],
    ["Payment amount", input.bhph.paymentAmount],
    ["Payment frequency", input.bhph.paymentFrequency],
    ["Term", `${input.bhph.termMonths} month(s)`],
    ["First payment date", input.bhph.firstPaymentDate],
    ["Late fee", input.bhph.lateFee],
    ["Title status", input.bhph.titleStatus],
    ["Insurance status", input.bhph.insuranceStatus],
    ["Warranty / as-is posture", input.bhph.warrantyPosture]
  ];
  const sectionsByForm: Record<string, Array<{ heading: string; rows?: Array<[string, string]>; bullets?: string[] }>> = {
    "bhph-installment-contract": [
      {
        heading: "Retail installment contract support",
        rows: [
          ["Seller-creditor", dealerName],
          ["Seller address", dealerAddress],
          ["Seller phone", dealerPhone],
          ["Seller website", dealerWebsite],
          ["Seller email", dealerEmail],
          ...commonRows
        ]
      },
      {
        heading: "Controlling contract and finance disclosures",
        bullets: [
          "The final signed retail installment sale contract and required finance disclosures control the credit sale. If this support packet conflicts with the final signed retail installment contract, the final signed contract controls.",
          "The buyer agrees that payment amount, payment frequency, term, APR, finance charge, amount financed, total of payments, late charges, returned-payment charges, and any other credit terms must match the final signed retail installment sale contract before delivery.",
          "No employee may change credit terms, waive default, release collateral, modify due dates, or approve deferred down payment unless the change is in a written dealership-approved document signed by an authorized manager.",
          "Buyer grants and acknowledges the dealership or assigned holder's security interest in the vehicle and agrees to cooperate with lien perfection, title, registration, correction, insurance, and account-servicing paperwork."
        ]
      },
      {
        heading: "Buyer representations",
        bullets: [
          "Buyer represents that all identity, residence, income, employer, reference, insurance, title, and down-payment information provided to the dealership is truthful and complete.",
          "Buyer agrees to immediately notify the dealership of changes to address, phone, email, employment, insurance, vehicle location, vehicle condition, or ability to make scheduled payments.",
          "False, incomplete, or misleading information may be treated as a material account risk and may affect delivery, servicing, default review, or lawful recovery rights."
        ]
      }
    ],
    "bhph-payment-schedule-servicing": [
      {
        heading: "Payment schedule",
        rows: commonRows
      },
      {
        heading: "Servicing rules",
        bullets: [
          "Payments must be received by the dealership or authorized payment processor by the due date and in the approved form of payment.",
          "Buyer should keep receipts and confirmation numbers for every payment.",
          "Payments may be applied to amounts due under the account according to the final contract, applicable law, and dealership servicing policy.",
          "Late fees, returned-payment charges, collection costs, deferral fees, or other charges apply only when permitted by the signed contract and applicable law.",
          "Promises to pay, partial payments, text messages, or phone conversations do not change the payment schedule unless confirmed in a written authorized account modification."
        ]
      }
    ],
    "bhph-insurance-maintenance": [
      {
        heading: "Insurance and care duties",
        rows: [
          ["Insurance status", input.bhph.insuranceStatus],
          ["Vehicle", vehicleLine || input.vehicle.vin || "Not captured"],
          ["VIN", input.vehicle.vin],
          ["Warranty / as-is posture", input.bhph.warrantyPosture]
        ]
      },
      {
        heading: "Coverage, maintenance, and loss reporting",
        bullets: [
          "Buyer must maintain legally required insurance and any contract-required physical-damage coverage for the vehicle until the account is paid or otherwise released in writing.",
          "Buyer must list the lienholder or secured party when required by the final contract, title documents, or insurance documents.",
          "Buyer must preserve the vehicle, perform ordinary maintenance, avoid waste, and promptly address warning lights, unsafe conditions, damage, theft, vandalism, tow, impound, or police contact.",
          "Buyer may not conceal, sell, transfer, abandon, dismantle, materially modify, relocate out of the approved area, pledge, sublease, or surrender possession of the vehicle without written dealership approval.",
          "Insurance review by the dealership does not guarantee coverage, approve a claim, or waive buyer responsibility under the contract."
        ]
      }
    ],
    "bhph-default-cure-recovery": [
      {
        heading: "Default events",
        bullets: [
          "Default may include missed or late payments, returned payments, deferred down-payment failure, insurance lapse, false information, unauthorized transfer, concealment, damage, abandonment, failure to cooperate with title or insurance, or other breach stated in the final contract.",
          "The dealership or holder will provide any notice and opportunity to cure required by the final contract and applicable law.",
          "If the account is not cured when required, the dealership or holder may use lawful remedies, including recovery of the vehicle by lawful means without breach of the peace.",
          "Buyer must remove personal property before surrender or recovery when possible. Personal property handling after recovery remains subject to applicable law and dealership recovery policy.",
          "Buyer may remain responsible for any deficiency, costs, or charges permitted by the final contract and applicable law, and will receive any surplus required by law."
        ]
      }
    ],
    "bhph-gps-starter-disclosure": [
      {
        heading: "Device disclosure",
        rows: [
          ["Device status", "Confirm installed / not installed before delivery"],
          ["Vehicle", vehicleLine || input.vehicle.vin || "Not captured"],
          ["VIN", input.vehicle.vin]
        ]
      },
      {
        heading: "GPS, telematics, and starter-interrupt controls",
        bullets: [
          "If a GPS, telematics, locator, or starter-interrupt device is installed or activated, buyer must receive the applicable separate disclosure and consent before delivery.",
          "Device information may be used for collateral protection, account servicing, recovery, safety, theft response, legal process, and other lawful dealership purposes stated in the device disclosure.",
          "A starter-interrupt device must not be used in a way prohibited by law or in a manner that knowingly creates an immediate safety hazard.",
          "Buyer may not remove, disable, tamper with, shield, damage, relocate, or interfere with an installed device.",
          "If no device is installed or activated, this document records that the disclosure was reviewed as a BHPH account-control item and does not itself authorize a device."
        ]
      }
    ],
    "bhph-delivery-condition": [
      {
        heading: "Delivery condition acknowledgement",
        rows: commonRows
      },
      {
        heading: "Vehicle, equipment, and disclosures",
        bullets: [
          "Buyer acknowledges an opportunity to inspect the vehicle before delivery and to identify visible condition concerns before signing.",
          "Delivery photos, odometer records, key/fob count, plates, title/registration documents, buyer's guide, warranty or as-is disclosures, and product disclosures should be attached to the deal jacket when applicable.",
          "The condition record is not a promise that future repairs are included unless a separate written due bill, warranty, service contract, or manager-approved repair order states otherwise.",
          "Buyer must not take delivery until required proof, insurance, title, payment, and signature controls are complete or expressly manager-approved."
        ]
      }
    ],
    "bhph-privacy-communications": [
      {
        heading: "Privacy and communications acknowledgement",
        bullets: [
          "Buyer acknowledges that dealership records may include identity, credit, income, residence, references, insurance, payment, vehicle, GPS/telematics if applicable, communication, and servicing information.",
          "The dealership must protect customer information under applicable privacy and customer-information-safeguards obligations.",
          "Buyer authorizes communications related to the transaction and account servicing by phone, text, email, mail, and other contact methods provided by buyer, subject to applicable law and any required separate consent.",
          "Credit reports, consumer reports, or account furnishing may occur only as authorized by buyer, the final documents, and applicable law.",
          "Buyer should promptly update contact information to avoid missed notices, payment reminders, insurance requests, title requests, or default notices."
        ]
      }
    ],
    "bhph-deal-jacket-checklist": [
      {
        heading: "Internal delivery checklist",
        rows: [
          ["Signed paperwork count", input.bhph.paperworkCount],
          ["Evidence count", input.bhph.evidenceCount],
          ["Servicing handoff count", input.bhph.handoffCount],
          ["Manager review triggers", input.bhph.approvalTriggers],
          ["Open stipulations", input.bhph.stipulations]
        ]
      },
      {
        heading: "Manager release controls",
        bullets: [
          "Confirm final retail installment contract and payment schedule match the system terms.",
          "Confirm down payment, deferred down payment, insurance, title, buyer's guide, warranty/as-is posture, references, income proof, residence proof, and delivery photos are stored.",
          "Confirm GPS/starter disclosure status and privacy/communications acknowledgement before delivery.",
          "Confirm account setup, first payment date, receipt process, contact information, and servicing handoff are complete.",
          "Do not release the vehicle with unresolved exceptions unless an authorized manager documents the exception."
        ]
      }
    ]
  };
  const sections = sectionsByForm[input.form.id] ?? [{ heading: "BHPH document", rows: commonRows }];
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
    .letterhead { align-items: start; border-bottom: 3px solid #061735; display: grid; gap: 18px; grid-template-columns: 1.2fr 1fr; margin-bottom: 24px; padding-bottom: 16px; }
    .brand { letter-spacing: 0.08em; text-transform: uppercase; }
    .brand strong { display: block; font-size: 24px; letter-spacing: 0; text-transform: none; }
    .brand span { color: #2f49c6; font-size: 13px; font-weight: 800; }
    .contact { color: #34445d; font-size: 13px; line-height: 1.45; text-align: right; }
    .contact strong { color: #061735; display: block; font-size: 14px; }
    .document-id { background: #f6f9ff; border: 1px solid #dbe6f8; border-radius: 10px; display: grid; gap: 8px; grid-template-columns: repeat(3, 1fr); margin: 16px 0 22px; padding: 12px; }
    .document-id span { color: #52647d; display: block; font-size: 11px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; }
    .document-id strong { color: #061735; display: block; font-size: 13px; margin-top: 3px; }
    table { border-collapse: collapse; margin-top: 12px; width: 100%; }
    th, td { border: 1px solid #dbe6f8; padding: 10px; text-align: left; vertical-align: top; }
    th { background: #f6f9ff; color: #34445d; width: 34%; }
    .notice { background: #eefbf3; border: 1px solid #bbf7d0; border-radius: 10px; color: #14532d; margin: 18px 0; padding: 12px; }
    .signature { display: grid; gap: 24px; grid-template-columns: 1fr 1fr; margin-top: 42px; }
    .line { border-top: 1px solid #061735; padding-top: 8px; }
  </style>
</head>
<body>
  <header class="letterhead">
    <div class="brand">
      ${dealDeskLogoHtml()}
      <strong>${escapeHtml(dealerName)}</strong>
      <p>BHPH Account Packet</p>
    </div>
    <div class="contact">
      <strong>${escapeHtml(dealerAddress)}</strong>
      Phone: ${escapeHtml(dealerPhone)}<br />
      Website: ${escapeHtml(dealerWebsite)}<br />
      ${escapeHtml(dealerEmail)}
    </div>
  </header>
  <h1>${escapeHtml(input.form.label)}</h1>
  <p class="meta">Generated ${escapeHtml(input.generatedAt)} · ${escapeHtml(input.form.basis)} · ${escapeHtml(input.form.trigger)}</p>
  <div class="document-id">
    <div><span>Account / deal</span><strong>${escapeHtml(input.dealNumber)}</strong></div>
    <div><span>Buyer</span><strong>${escapeHtml(input.customerName)}</strong></div>
    <div><span>Vehicle</span><strong>${escapeHtml(vehicleLine || input.vehicle.vin || "Not captured")}</strong></div>
  </div>
  <p class="notice">This BHPH packet supports account setup, delivery, servicing, and risk controls. The final approved retail installment sale contract and required finance disclosures control if any term is inconsistent.</p>
  ${sections.map((section) => `
    <h2>${escapeHtml(section.heading)}</h2>
    ${section.rows ? `<table><tbody>${section.rows.map(([label, value]) => `<tr><th>${escapeHtml(label)}</th><td>${escapeHtml(value)}</td></tr>`).join("")}</tbody></table>` : ""}
    ${section.bullets ? `<ul>${section.bullets.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>` : ""}
  `).join("")}
  <div class="signature">
    <div class="line">Buyer signature / date</div>
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
  const packetType = input.packetType === "TEST_DRIVE" ? "TEST_DRIVE" : input.packetType === "LEASE_TO_OWN" ? "LEASE_TO_OWN" : input.packetType === "VEHICLE_LOANER" ? "VEHICLE_LOANER" : input.packetType === "DAILY_RENTAL" ? "DAILY_RENTAL" : input.packetType === "BHPH" ? "BHPH" : "MINNESOTA_RETAIL_SALE";
  const packetForms: PacketFormItem[] = packetType === "TEST_DRIVE" ? TEST_DRIVE_FORM_PACKET : packetType === "LEASE_TO_OWN"
    ? LEASE_TO_OWN_FORM_PACKET
    : packetType === "VEHICLE_LOANER"
      ? COURTESY_LOANER_FORM_PACKET
    : packetType === "DAILY_RENTAL"
      ? DAILY_RENTAL_FORM_PACKET
    : packetType === "BHPH"
      ? BHPH_FORM_PACKET
      : MN_SALE_FORM_PACKET;
  const requiredIds = packetType === "TEST_DRIVE" ? TEST_DRIVE_FORM_PACKET.map((form) => form.id) : packetType === "LEASE_TO_OWN"
    ? allLeaseToOwnFormIds()
    : packetType === "VEHICLE_LOANER"
      ? requiredCourtesyLoanerFormIds()
    : packetType === "DAILY_RENTAL"
      ? requiredDailyRentalFormIds()
    : packetType === "BHPH"
      ? requiredBhphFormIds()
      : requiredMinnesotaSaleFormIds();
  const selectedIds = formIds(input.preparedFormIds, packetForms, requiredIds);
  if (input.dealerWarrantyOffered !== undefined && typeof input.dealerWarrantyOffered !== "boolean") throw new UnifiedCrmContractPacketError("CONTRACT_PACKET_INVALID", "Choose whether the voluntary dealer warranty is offered.");
  const warrantyOffered = input.dealerWarrantyOffered !== false;
  if (packetType === "LEASE_TO_OWN" && !selectedIds.includes("lease-summary")) selectedIds.push("lease-summary");
  if (warrantyOffered && packetType === "BHPH" && !selectedIds.includes(BHPH_WARRANTY_FORM_ID)) selectedIds.push(BHPH_WARRANTY_FORM_ID);
  if (warrantyOffered && packetType === "LEASE_TO_OWN" && !selectedIds.includes(LEASE_WARRANTY_FORM_ID)) selectedIds.push(LEASE_WARRANTY_FORM_ID);
  const selectedForms = packetForms.filter((form) => selectedIds.includes(form.id) && (warrantyOffered || ![BHPH_WARRANTY_FORM_ID, LEASE_WARRANTY_FORM_ID].includes(form.id)));
  if (selectedForms.length === 0) {
    throw new UnifiedCrmContractPacketError("CONTRACT_PACKET_INVALID", "Select at least one form before generating a packet.");
  }

  const packet = packetNumber(now);
  const vehicle = vehicleFacts(input.vehicle);
  const customerName = text(input.customerName, "Customer not captured");
  const dealNumber = text(input.dealNumber, packet);
  const driveFacts = testDriveFacts(input.testDrive);
  if (packetType === "TEST_DRIVE") {
    const error = testDriveAgreementError(driveFacts);
    if (error) throw new UnifiedCrmContractPacketError("CONTRACT_PACKET_INVALID", error);
    if (!text(input.customerName, "") || ["Customer not selected", "Customer not captured"].includes(customerName)) {
      throw new UnifiedCrmContractPacketError("CONTRACT_PACKET_INVALID", "Select the driver before generating the agreement.");
    }
    if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(vehicle.vin)) {
      throw new UnifiedCrmContractPacketError("CONTRACT_PACKET_INVALID", "Capture a valid 17-character vehicle VIN before generating the agreement.");
    }
  }
  const driveDocumentInput = packetType === "TEST_DRIVE" ? {
    customerName, dealNumber, vin: vehicle.vin, stockNumber: vehicle.stockNumber,
    vehicle: [vehicle.year, vehicle.make, vehicle.model, vehicle.trim].filter((value) => value !== "Not captured").join(" ") || "Vehicle identified by VIN",
    facts: driveFacts
  } : null;
  const dealType = text(input.dealType, "Retail Sale");
  const salePrice = text(input.salePrice, "$0.00");
  const feeTotal = text(input.feeTotal, "$0.00");
  const paymentFunding = text(input.paymentFunding, "To be confirmed");
  const packetId = `contract-packet-${crypto.randomUUID()}`;
  const bhphInput = { ...bhphFacts(input.bhph), warrantyPosture: dealerWarrantyPosture(warrantyOffered) };
  if (packetType === "BHPH" && warrantyOffered) {
    const error = dealerWarrantyError(bhphInput);
    if (error) throw new UnifiedCrmContractPacketError("CONTRACT_PACKET_INVALID", error);
  }
  const rentalInput = dailyRentalFacts(input.dailyRental);
  const requestedLeaseInput = leaseCalculatorInput(input.leaseCalculator);
  const leaseOutput = calculateLeaseToOwn(requestedLeaseInput);
  const leaseInput = { ...requestedLeaseInput, contractLength: leaseOutput.contractLength };
  const leaseFacts = input.leaseFacts && typeof input.leaseFacts === "object" ? input.leaseFacts as Record<string, unknown> : {};
  const leaseWarrantyInput = { deliveryAt: text(leaseFacts.deliveryAt, ""), deliveryMileage: vehicle.mileage };
  if (packetType === "LEASE_TO_OWN") {
    const error = leaseAgreementCalculationError(leaseInput, leaseOutput);
    if (error) throw new UnifiedCrmContractPacketError("CONTRACT_PACKET_INVALID", error);
    for (const key of ["agreementDate", "firstPaymentDate"]) {
      const value = text(leaseFacts[key], "");
      if (value && (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString().slice(0, 10) !== value)) {
        throw new UnifiedCrmContractPacketError("CONTRACT_PACKET_INVALID", "Enter valid lease and payment dates.");
      }
    }
    if (text(leaseFacts.firstPaymentDate, "") && text(leaseFacts.firstPaymentDate, "") <= text(leaseFacts.agreementDate, generatedAt.slice(0, 10))) {
      throw new UnifiedCrmContractPacketError("CONTRACT_PACKET_INVALID", "The next payment date must follow the lease date.");
    }
    const warrantyError = warrantyOffered ? dealerWarrantyError(leaseWarrantyInput) : null;
    if (warrantyError) throw new UnifiedCrmContractPacketError("CONTRACT_PACKET_INVALID", warrantyError);
  }
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

  let summary: LeaseSummary | undefined;
  if (packetType === "LEASE_TO_OWN") {
    const agreementDate = text(leaseFacts.agreementDate, generatedAt.slice(0, 10));
    const nextDate = text(leaseFacts.firstPaymentDate, leaseNextPaymentDate(agreementDate, leaseInput.paymentFrequency));
    const frequency = leaseInput.paymentFrequency === "BiWeekly" ? "Every two weeks" : leaseInput.paymentFrequency;
    const template = await PDFDocument.load(publicPdfBytes("/forms/lease-to-own/w2-lease.pdf"));
    const policy = (name: string) => template.getForm().getTextField(name).getText() || "See signed lease";
    summary = {
      identity: [
        ["Lessee / co-lessee", `${customerName} / ${text(leaseFacts.coLesseeName, "None")}`],
        ["Vehicle", `${vehicle.year} ${vehicle.make} ${vehicle.model}${vehicle.trim === "Not captured" ? "" : ` ${vehicle.trim}`} | VIN: ${vehicle.vin}`],
        ["Deal / lease date / mileage", `${dealNumber} / ${formDate(agreementDate)} / ${vehicle.mileage || "Not captured"}`]
      ],
      highlights: [["Due at signing", formatCurrency(leaseOutput.amountDueAtSigningCents)], ["Regular payment", formatCurrency(leaseOutput.totalPeriodicPaymentCents)], ["Next payment", leaseInput.contractLength > 1 ? formDate(nextDate) : "None"], ["End purchase price", formatCurrency(leaseOutput.residualValueCents)]],
      signing: { heading: "Signing breakdown", rows: [
        ["Capitalized cost reduction", formatCurrency(leaseOutput.capitalizedCostReductionCents)],
        ["First payment (included)", formatCurrency(leaseOutput.totalPeriodicPaymentCents)],
        ["Upfront sales tax", formatCurrency(leaseOutput.applicableTaxesCents)],
        ["Title / registration", `${formatCurrency(leaseInput.titleFeeCents)} / ${formatCurrency(leaseInput.registrationFeeCents)}`],
        ["Document preparation", formatCurrency(leaseInput.documentPreparationFeeCents)],
        ["Origination", formatCurrency(leaseInput.originationFeeCents)],
        ["Total due at signing", formatCurrency(leaseOutput.amountDueAtSigningCents)]
      ] },
      payments: { heading: "Payment schedule & lease cost", rows: [
        ["Frequency", frequency],
        ["Payments (includes first)", String(leaseInput.contractLength)],
        ["Final payment", formatCurrency(leaseOutput.finalPeriodicPaymentCents)],
        ["All periodic payments", formatCurrency(leaseOutput.totalOfAllPeriodicPaymentsCents)],
        [`Est. renewals (${leaseOutput.renewalRegistrationCount})`, formatCurrency(leaseInput.registrationFeeCents * leaseOutput.renewalRegistrationCount)],
        ["Official fees/taxes (incl. above)", formatCurrency(leaseOutput.estimatedFeesAndTaxesOverTermCents)],
        ["Estimated total lease payments", formatCurrency(leaseOutput.totalOfPaymentsCents)]
      ] },
      sections: [
        { heading: "Purchase option", paragraphs: [`Ownership does not transfer automatically. End-of-lease purchase: ${formatCurrency(leaseOutput.residualValueCents)} plus applicable taxes and official fees, separate from the lease total. Early purchase follows the lease formula: remaining base payments plus residual, less applicable discounts, plus other amounts due and purchase taxes/fees.`] },
        { heading: "Insurance, warranty & use", paragraphs: ["Maintain liability, collision and comprehensive insurance with a deductible no greater than $500; name the lessor as loss payee/additional insured as required.", warrantyOffered ? "Dealer engine/transmission coverage: 30 days or 1,000 miles, whichever comes first; 100% covered parts/labor, no deductible. Statutory and separate warranty coverage remain unaffected. See the warranty addendum for the 24-hour optional return and $875 fee." : dealerWarrantyPosture(false), "Other maintenance/repairs are your responsibility subject to legally required and separately agreed coverage. Observe driver restrictions; no commercial use."] },
        { heading: "Mileage, late payments & return", paragraphs: [`Allowance: ${policy("cents for each excess mile over")} miles per month; excess mileage: ${policy("rate")} cents per mile. Late charge: $${policy("undefined_40")} after ${policy("Days")} business days, as stated in the lease. Return the vehicle in the required condition and pay amounts due through termination; damage, loss, default or early termination may cause additional charges under the lease.`] }
      ]
    };
  }

  const documents = await Promise.all(selectedForms.map(async (form) => {
    const isDealerWarranty = (packetType === "BHPH" && form.id === BHPH_WARRANTY_FORM_ID) || (packetType === "LEASE_TO_OWN" && form.id === LEASE_WARRANTY_FORM_ID);
    const warrantyDocumentInput = isDealerWarranty ? {
      dealType: packetType as "BHPH" | "LEASE_TO_OWN", customerName,
      coBuyer: packetType === "BHPH" ? bhphInput.coBuyer : text(leaseFacts.coLesseeName, "None"),
      dealNumber, vehicle: `${vehicle.year} ${vehicle.make} ${vehicle.model}`, vin: vehicle.vin,
      warranty: dealerWarrantyDetails(packetType === "BHPH" ? bhphInput : leaseWarrantyInput)!
    } : null;
    const isLeaseSummary = form.id === "lease-summary" && summary !== undefined;
    const isPersonalReferencesForm = form.id === "personal-references" || form.id === "bhph-references-contact-authorization";
    const pdfTemplate = hasPdfTemplate(form);
    const isPdfDocument = driveDocumentInput !== null || isDealerWarranty || isLeaseSummary || isPersonalReferencesForm || pdfTemplate;
    const leaseFieldValues = hasPdfTemplate(form) && packetType === "LEASE_TO_OWN"
      ? leaseTemplateFieldValues({
          calculator: leaseOutput,
          customerName,
          dealNumber,
          feeTotal,
          formId: form.id,
          generatedAt,
          leaseInput,
          leaseFacts,
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
      ...(driveDocumentInput ? {
        contentBase64: await testDriveAgreementPdfBase64(driveDocumentInput),
        contentType: "application/pdf" as const
      } : warrantyDocumentInput ? {
        contentBase64: await dealerWarrantyPdfBase64(warrantyDocumentInput),
        contentType: "application/pdf" as const
      } : isLeaseSummary ? {
        contentBase64: await leaseSummaryPdfBase64(summary!),
        contentType: "application/pdf" as const
      } : isPersonalReferencesForm ? {
        contentBase64: await personalReferencesPdfBase64({
          customerName,
          dealNumber,
          dealType: packetType === "BHPH" ? "BHPH" : dealType,
          generatedAt,
          paymentFunding: packetType === "BHPH" ? bhphInput.paymentFrequency : paymentFunding,
          salePrice: packetType === "BHPH" ? bhphInput.salePrice : salePrice,
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
      html: driveDocumentInput ? testDriveAgreementHtml(driveDocumentInput) : warrantyDocumentInput ? dealerWarrantyHtml(warrantyDocumentInput) : isLeaseSummary ? leaseSummaryHtml(summary!) : packetType === "DAILY_RENTAL"
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
        : packetType === "BHPH"
          ? buildBhphDocumentHtml({
              bhph: bhphInput,
              customerName,
              dealNumber,
              form: form as BhphFormItem,
              generatedAt,
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
        detail: packetType === "TEST_DRIVE"
          ? "One test-drive agreement generated and archived."
          : packetType === "LEASE_TO_OWN"
          ? `${documents.length} lease-to-own form(s) generated and archived.`
          : packetType === "VEHICLE_LOANER"
            ? `${documents.length} vehicle loaner form(s) generated and archived.`
          : packetType === "DAILY_RENTAL"
            ? `${documents.length} daily rental form(s) generated and archived.`
          : packetType === "BHPH"
            ? `${documents.length} BHPH form(s) generated and archived.`
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
