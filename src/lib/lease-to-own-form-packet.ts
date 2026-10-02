export type LeaseToOwnFormCategory = "Required" | "Conditional";

export type LeaseToOwnFormItem = {
  basis: string;
  category: LeaseToOwnFormCategory;
  description: string;
  fieldMappings: string[];
  id: string;
  label: string;
  templatePath?: string;
  sourceFileName: string;
  trigger: string;
};

export type LeasePaymentFrequency = "Weekly" | "BiWeekly" | "Monthly";

export type LeaseToOwnCalculatorInput = {
  calculationMode?: "TERM" | "PAYMENT_AMOUNT";
  targetPaymentCents?: number;
  additionalItemsCents: number;
  capitalizedCostReductionCents: number;
  contractLength: number;
  documentPreparationFeeCents: number;
  downPaymentCents?: number;
  signingPaymentMode?: "DOWN_PAYMENT" | "CAPITALIZED_REDUCTION";
  gpsCostCents: number;
  multiplierBasisPoints: number;
  originationFeeCents: number;
  otherRoadWorthyCostCents: number;
  paymentFrequency: LeasePaymentFrequency;
  registrationFeeCents: number;
  salesTaxRateBasisPoints: number;
  titleFeeCents: number;
  warrantyCostCents: number;
  wholesaleCostCents: number;
};

export type LeaseToOwnCalculatorOutput = {
  contractLength: number;
  adjustedCapitalizedCostCents: number;
  amountDueAtSigningCents: number;
  applicableTaxesCents: number;
  basePeriodicPaymentCents: number;
  capitalizedCostReductionCents: number;
  costsTaxesFeesCents: number;
  dealerGrossProfitCents: number;
  depreciationAndAmortizedAmountCents: number;
  estimatedFeesAndTaxesOverTermCents: number;
  grossCapitalizedCostCents: number;
  grossCapitalizedCostTotalCents: number;
  residualValueCents: number;
  renewalRegistrationCount: number;
  subtotalCents: number;
  totalBasePeriodicPaymentsCents: number;
  totalOfAllPeriodicPaymentsCents: number;
  totalOfPaymentsCents: number;
  totalPeriodicPaymentCents: number;
  finalPeriodicPaymentCents: number;
  signingShortfallCents: number;
};

export const LEASE_TO_OWN_FORM_PACKET: LeaseToOwnFormItem[] = [
  {
    basis: "Calculator-driven customer lease summary",
    category: "Required",
    description: "Customer overview of signing costs, payment schedule, purchase option, and responsibilities.",
    fieldMappings: ["Lessee", "Vehicle", "Signing breakdown", "Payment schedule", "Purchase option"],
    id: "lease-summary",
    label: "Lease Summary",
    sourceFileName: "Lease Summary.pdf",
    trigger: "Every lease-to-own packet"
  },
  {
    basis: "Dealership lease-to-own master lease template",
    category: "Required",
    description: "Primary lease agreement with lessor, lessee, vehicle, payment schedule, lease signing amount, and disclosures.",
    fieldMappings: ["Lessee", "Co-lessee", "Vehicle", "VIN", "Color", "Odometer", "Payment schedule", "Amount due at signing"],
    id: "w2-lease",
    label: "W2 lease agreement",
    sourceFileName: "W2 Lease (3) 07-24-2013-S.pdf",
    templatePath: "/forms/lease-to-own/w2-lease.pdf",
    trigger: "Every lease-to-own vehicle"
  },
  {
    basis: "Dealer insurance binder request",
    category: "Required",
    description: "Insurance binder request for the leased vehicle before delivery.",
    fieldMappings: ["Lessee", "Vehicle", "VIN", "Insurance company", "Agent", "Effective date"],
    id: "insurance-binder",
    label: "Insurance binder request",
    sourceFileName: "Time Motor Sales, Inc Insurance Binder.pdf",
    templatePath: "/forms/lease-to-own/insurance-binder.pdf",
    trigger: "Before delivery"
  },
  {
    basis: "Lease addenda control sheet",
    category: "Required",
    description: "Exhibit A list of required and optional lease addenda selected for the deal.",
    fieldMappings: ["Lessee", "Co-lessee", "Owner/lessor", "Selected addenda", "Date"],
    id: "exhibit-a-addenda",
    label: "Exhibit A - list of addenda",
    sourceFileName: "Copy of 03-Exhibit A List Of ADDENDA 04-12-2013-S.pdf",
    templatePath: "/forms/lease-to-own/exhibit-a-addenda.pdf",
    trigger: "Every lease-to-own packet"
  },
  {
    basis: "Binding arbitration agreement template",
    category: "Required",
    description: "Arbitration agreement tied to the leased motor vehicle and lease execution date.",
    fieldMappings: ["Owner/lessor", "Lessee", "Co-lessee", "Vehicle", "VIN", "Execution date"],
    id: "binding-arbitration",
    label: "Binding arbitration agreement",
    sourceFileName: "04-Binding Arbitration Agreement 01-13-2012-S.pdf",
    templatePath: "/forms/lease-to-own/binding-arbitration.pdf",
    trigger: "Every lease-to-own packet"
  },
  {
    basis: "Excluded driver addendum template",
    category: "Required",
    description: "Driver exclusion acknowledgement for the lease packet.",
    fieldMappings: ["Owner/lessor", "Lessee", "Co-lessee", "Date"],
    id: "excluded-driver",
    label: "Excluded driver addendum",
    sourceFileName: "05-Excluded Driver Addendum 03-01-2013-S.pdf",
    templatePath: "/forms/lease-to-own/excluded-driver.pdf",
    trigger: "Every lease-to-own packet"
  },
  {
    basis: "Vehicle inspection form template",
    category: "Required",
    description: "Inspection record for initial condition, mileage, color, VIN, and return condition.",
    fieldMappings: ["Vehicle", "Color", "VIN", "Initial mileage", "Inspection date"],
    id: "vehicle-inspection",
    label: "Vehicle inspection form",
    sourceFileName: "02-Vehicle Inspection Form 09-2013.pdf",
    templatePath: "/forms/lease-to-own/vehicle-inspection.pdf",
    trigger: "Before delivery"
  },
  {
    basis: "Minnesota DVS title and registration support",
    category: "Required",
    description: "Authorization for the dealership to complete title, registration, correction, lien, or related vehicle paperwork for the lessee/customer when needed.",
    fieldMappings: ["Lessee", "Co-lessee", "Vehicle", "VIN", "Title/registration authority", "Date"],
    id: "power-of-attorney",
    label: "Power of attorney / title authority",
    sourceFileName: "Generated power of attorney / title authority form",
    trigger: "Dealer handles title, registration, correction, lien, or DVS paperwork"
  },
  {
    basis: "Dealership credit underwriting and account servicing control",
    category: "Required",
    description: "Customer-provided personal references for buyers or lessees purchasing on payments, including contact details, relationship, contact consent, and verification notes.",
    fieldMappings: ["Lessee", "Co-lessee", "Reference names", "Reference phone numbers", "Relationship", "Permission to contact", "Verification notes"],
    id: "personal-references",
    label: "Personal references and verification form",
    sourceFileName: "Generated personal references and verification form",
    trigger: "Every lease-to-own or vehicle payment purchase"
  },
  {
    basis: "GPS disclosure addendum template",
    category: "Conditional",
    description: "GPS disclosure addendum when GPS tracking or related device disclosure applies.",
    fieldMappings: ["Owner/lessor", "Lessee", "Vehicle", "VIN", "Lease date"],
    id: "gps-disclosure",
    label: "GPS disclosure addendum",
    sourceFileName: "06-GPS Disclosure Addendum 01-06-2012-S.pdf",
    templatePath: "/forms/lease-to-own/gps-disclosure.pdf",
    trigger: "GPS installed or disclosed"
  },
  {
    basis: "KAP fleet warranty engine/transmission addendum",
    category: "Conditional",
    description: "Warranty addendum with vehicle, mileage, and approved service facility details.",
    fieldMappings: ["Vehicle", "VIN", "Mileage", "Service facility", "Lessee", "Owner/lessor"],
    id: "kap-warranty",
    label: "KAP fleet warranty addendum",
    sourceFileName: "07-KAP-Fleet Warranty Engine-Trans Addendum 06-23-2016-S.pdf",
    templatePath: "/forms/lease-to-own/kap-warranty.pdf",
    trigger: "KAP warranty included"
  }
];

export function requiredLeaseToOwnFormIds() {
  return LEASE_TO_OWN_FORM_PACKET.filter((form) => form.category === "Required").map((form) => form.id);
}

export function allLeaseToOwnFormIds() {
  return LEASE_TO_OWN_FORM_PACKET.map((form) => form.id);
}

export function leaseRenewalRegistrationCount(frequency: LeasePaymentFrequency, contractLength: number) {
  const thresholds: Record<LeasePaymentFrequency, number[]> = {
    BiWeekly: [27, 53, 79, 105, 131],
    Monthly: [13, 25, 37, 49, 61],
    Weekly: [53, 105, 157, 209, 261]
  };
  return thresholds[frequency].filter((threshold) => contractLength >= threshold).length;
}

function roundCents(value: number) {
  return Math.round(Number.isFinite(value) ? value : 0);
}

export function calculateLeaseToOwn(input: LeaseToOwnCalculatorInput): LeaseToOwnCalculatorOutput {
  if (input.calculationMode === "PAYMENT_AMOUNT") input = resolveLeasePaymentTerm(input);
  const subtotalCents = input.wholesaleCostCents + input.gpsCostCents + input.warrantyCostCents + input.otherRoadWorthyCostCents;
  const grossCapitalizedCostCents = roundCents((subtotalCents * input.multiplierBasisPoints) / 10000);
  const grossCapitalizedCostTotalCents = grossCapitalizedCostCents + input.additionalItemsCents;
  const residualValueCents = roundCents(grossCapitalizedCostCents * 0.101);
  const taxBaseBeforeReductionCents = input.documentPreparationFeeCents + input.originationFeeCents + grossCapitalizedCostTotalCents - residualValueCents;
  const applicableTaxesCents = roundCents((taxBaseBeforeReductionCents * input.salesTaxRateBasisPoints) / 10000);
  const costsTaxesFeesCents = input.titleFeeCents + input.registrationFeeCents + input.documentPreparationFeeCents + input.originationFeeCents + applicableTaxesCents;
  const hasDownPayment = input.signingPaymentMode === "DOWN_PAYMENT" || (input.signingPaymentMode !== "CAPITALIZED_REDUCTION" && typeof input.downPaymentCents === "number" && Number.isFinite(input.downPaymentCents) && input.downPaymentCents > 0);
  // Signing cash includes the first payment. Solve cash = fees + reduction + (depreciation - reduction) / term.
  const capitalizedCostReductionCents = hasDownPayment
    ? Math.max(0, roundCents(input.contractLength > 1
      ? (((input.downPaymentCents ?? 0) - costsTaxesFeesCents) * input.contractLength - (grossCapitalizedCostTotalCents - residualValueCents)) / (input.contractLength - 1)
      : 0))
    : input.capitalizedCostReductionCents;
  const adjustedCapitalizedCostCents = grossCapitalizedCostTotalCents - capitalizedCostReductionCents;
  const depreciationAndAmortizedAmountCents = adjustedCapitalizedCostCents - residualValueCents;
  const totalBasePeriodicPaymentsCents = depreciationAndAmortizedAmountCents;
  const basePeriodicPaymentCents = roundCents(input.contractLength > 0 ? totalBasePeriodicPaymentsCents / input.contractLength : 0);
  const totalPeriodicPaymentCents = basePeriodicPaymentCents;
  const totalOfAllPeriodicPaymentsCents = totalBasePeriodicPaymentsCents;
  const finalPeriodicPaymentCents = Number.isInteger(input.contractLength) && input.contractLength > 0
    ? totalBasePeriodicPaymentsCents - totalPeriodicPaymentCents * (input.contractLength - 1)
    : totalPeriodicPaymentCents;
  const renewalRegistrationCount = leaseRenewalRegistrationCount(input.paymentFrequency, input.contractLength);
  const additionalRegistrationFeesCents = input.registrationFeeCents * renewalRegistrationCount;
  const estimatedFeesAndTaxesOverTermCents = input.titleFeeCents + input.registrationFeeCents + applicableTaxesCents + additionalRegistrationFeesCents;
  const amountDueAtSigningCents = capitalizedCostReductionCents + costsTaxesFeesCents + totalPeriodicPaymentCents;
  const signingShortfallCents = hasDownPayment ? Math.max(0, amountDueAtSigningCents - roundCents(input.downPaymentCents ?? 0)) : 0;
  const totalOfPaymentsCents = estimatedFeesAndTaxesOverTermCents + totalBasePeriodicPaymentsCents + capitalizedCostReductionCents + input.documentPreparationFeeCents + input.originationFeeCents;
  const dealerGrossProfitCents = totalBasePeriodicPaymentsCents + residualValueCents + capitalizedCostReductionCents + input.documentPreparationFeeCents + input.originationFeeCents - subtotalCents;

  return {
    contractLength: input.contractLength,
    adjustedCapitalizedCostCents,
    amountDueAtSigningCents,
    applicableTaxesCents,
    basePeriodicPaymentCents,
    capitalizedCostReductionCents,
    costsTaxesFeesCents,
    dealerGrossProfitCents,
    depreciationAndAmortizedAmountCents,
    estimatedFeesAndTaxesOverTermCents,
    grossCapitalizedCostCents,
    grossCapitalizedCostTotalCents,
    residualValueCents,
    renewalRegistrationCount,
    subtotalCents,
    totalBasePeriodicPaymentsCents,
    totalOfAllPeriodicPaymentsCents,
    totalOfPaymentsCents,
    totalPeriodicPaymentCents,
    finalPeriodicPaymentCents,
    signingShortfallCents
  };
}

export function resolveLeasePaymentTerm(input: LeaseToOwnCalculatorInput): LeaseToOwnCalculatorInput {
  if (input.calculationMode !== "PAYMENT_AMOUNT") return input;
  const target = input.targetPaymentCents ?? 0;
  const seed = calculateLeaseToOwn({ ...input, calculationMode: "TERM", contractLength: 2 });
  const balance = seed.grossCapitalizedCostTotalCents - seed.residualValueCents;
  const signingCashMode = input.signingPaymentMode === "DOWN_PAYMENT" ||
    (input.signingPaymentMode !== "CAPITALIZED_REDUCTION" && (input.downPaymentCents ?? 0) > 0);
  const availableCash = (input.downPaymentCents ?? 0) - seed.costsTaxesFeesCents;
  // Cash includes the first payment: remaining balance / (term - 1) determines the payment.
  const term = !Number.isFinite(target) || target < 1 ? 0 : signingCashMode
    ? availableCash > 0 && availableCash < balance
      ? Math.max(2, Math.ceil(1 + (balance - availableCash) / target), Math.ceil(balance / availableCash))
      : 0
    : Math.max(1, Math.ceil((balance - input.capitalizedCostReductionCents) / target));
  return { ...input, contractLength: term };
}

export function leaseNextPaymentDate(agreementDate: string, frequency: LeasePaymentFrequency) {
  const date = new Date(agreementDate);
  if (frequency === "Monthly") {
    const day = date.getUTCDate();
    date.setUTCDate(1);
    date.setUTCMonth(date.getUTCMonth() + 1);
    const lastDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
    date.setUTCDate(Math.min(day, lastDay));
  } else date.setUTCDate(date.getUTCDate() + (frequency === "Weekly" ? 7 : 14));
  return date.toISOString().slice(0, 10);
}

export function leaseAgreementCalculationError(input: LeaseToOwnCalculatorInput, output = calculateLeaseToOwn(input)): string | null {
  if (input.calculationMode === "PAYMENT_AMOUNT") {
    if (!Number.isSafeInteger(input.targetPaymentCents) || (input.targetPaymentCents ?? 0) < 1) return "Enter a positive target payment amount.";
    if (output.contractLength === 0) return "The signing cash must cover fees and leave a positive lease payment balance.";
  }
  if (!Number.isSafeInteger(output.contractLength) || output.contractLength < 1) return "Enter a whole number of lease payments before generating the agreement.";
  if (Object.entries(input).some(([key, value]) =>
    !(key === "targetPaymentCents" && input.calculationMode !== "PAYMENT_AMOUNT") &&
    !(key === "contractLength" && input.calculationMode === "PAYMENT_AMOUNT") &&
    typeof value === "number" && (!Number.isFinite(value) || value < 0)
  )) return "Lease amounts and rates must be valid, nonnegative numbers.";
  if (output.grossCapitalizedCostCents <= 0 || output.totalBasePeriodicPaymentsCents <= 0 || output.finalPeriodicPaymentCents <= 0) return "Enter a vehicle value and signing amount that leave a positive lease payment balance.";
  if (output.signingShortfallCents > 1) return "The signing cash must cover fees, taxes, and the first lease payment.";
  return null;
}
