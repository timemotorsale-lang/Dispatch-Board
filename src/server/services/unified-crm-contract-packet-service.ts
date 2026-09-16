import { readFileSync } from "node:fs";
import { join } from "node:path";

import { allLeaseToOwnFormIds, calculateLeaseToOwn, LEASE_TO_OWN_FORM_PACKET, type LeasePaymentFrequency, type LeaseToOwnCalculatorInput } from "@/lib/lease-to-own-form-packet";
import { MN_SALE_FORM_PACKET, requiredMinnesotaSaleFormIds, type MinnesotaSaleFormItem } from "@/lib/mn-vehicle-sale-form-packet";
import { PDFDocument, StandardFonts } from "pdf-lib";
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

type PacketFormItem = MinnesotaSaleFormItem | typeof LEASE_TO_OWN_FORM_PACKET[number];

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
  const safePath = templatePath.replace(/^\/+/, "").replaceAll("/", "\\");
  return readFileSync(join(process.cwd(), "public", safePath.replace(/^public\\/, "")));
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
  const packetType = input.packetType === "LEASE_TO_OWN" ? "LEASE_TO_OWN" : "MINNESOTA_RETAIL_SALE";
  const packetForms: PacketFormItem[] = packetType === "LEASE_TO_OWN" ? LEASE_TO_OWN_FORM_PACKET : MN_SALE_FORM_PACKET;
  const requiredIds = packetType === "LEASE_TO_OWN" ? allLeaseToOwnFormIds() : requiredMinnesotaSaleFormIds();
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
    const leaseFieldValues = "templatePath" in form && packetType === "LEASE_TO_OWN"
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
    return {
      ...("templatePath" in form && packetType === "LEASE_TO_OWN" ? {
        contentBase64: await filledPdfBase64(form.templatePath, leaseFieldValues),
        contentType: "application/pdf" as const,
        fieldValues: leaseFieldValues,
        templatePath: form.templatePath
      } : {
        contentType: "text/html" as const
      }),
      archiveStatus: "ARCHIVED" as const,
      category: form.category,
      downloadFileName: `${form.id}-${packet}.${packetType === "LEASE_TO_OWN" ? "pdf" : "html"}`,
      formId: form.id,
      html: buildDocumentHtml({
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
