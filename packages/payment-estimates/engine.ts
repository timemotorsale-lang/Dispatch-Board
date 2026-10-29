import type { PaymentPolicy } from "./policy";

export type EstimateInputs = {
  priceCents: number;
  downPaymentCents: number;
  termMonths: number;
  additionalFeesCents: number | null;
  additionalFeesConfirmed: boolean;
  standardScenarioConfirmed: boolean;
};

export type CashEstimateInputs = Pick<EstimateInputs, "priceCents" | "additionalFeesCents" | "additionalFeesConfirmed" | "standardScenarioConfirmed">;

export type CashEstimate = {
  policyVersion: string;
  priceCents: number;
  salesTaxCents: number;
  documentationFeeCents: number;
  baseFeesCents: number;
  additionalFeesCents: number;
  totalDueCents: number;
};

export type PaymentEstimate = {
  policyVersion: string;
  priceCents: number;
  downPaymentCents: number;
  termMonths: number;
  annualInterestBasisPoints: number;
  salesTaxCents: number;
  documentationFeeCents: number;
  baseFeesCents: number;
  lienFeeCents: number;
  additionalFeesCents: number;
  purchaseTotalCents: number;
  amountFinancedCents: number;
  monthlyPaymentCents: number;
  finalPaymentCents: number;
  paymentCount: number;
  totalPaymentsCents: number;
  totalInterestCents: number;
  totalCostCents: number;
};

const maximumCents = 100_000_000;

function cents(value: number, label: string, minimum = 0) {
  if (!Number.isSafeInteger(value) || value < minimum || value > maximumCents) throw new Error(`${label} must be a valid amount between ${minimum / 100} and 1,000,000 dollars.`);
  return value;
}

export function parseMoney(value: string, label: string) {
  if (!/^\d+(?:\.\d{1,2})?$/.test(value.trim())) throw new Error(`Enter ${label} in dollars, with no more than two decimal places.`);
  const [whole, fraction = ""] = value.trim().split(".");
  return cents(Number(whole) * 100 + Number(fraction.padEnd(2, "0")), label);
}

function validateCharges(policy: PaymentPolicy, input: Omit<CashEstimateInputs, "priceCents">) {
  if (policy.status !== "DRAFT" || !policy.version || !Number.isInteger(policy.annualInterestBasisPoints) || policy.annualInterestBasisPoints < 0 || policy.annualInterestBasisPoints > 10000 || !Number.isInteger(policy.salesTaxPartsPerMillion) || policy.salesTaxPartsPerMillion < 0 || policy.salesTaxPartsPerMillion > 1000000) throw new Error("The estimate policy is invalid.");
  cents(policy.documentationFeeCents, "Documentation fee");
  cents(policy.lienFeeCents, "Lien fee");
  for (const fee of policy.baseFees) cents(fee.cents, "Transfer fee");
  if (input.additionalFeesCents === null || !input.additionalFeesConfirmed) throw new Error("Enter and confirm all additional registration, plate and local charges for this example. Unknown fees cannot be treated as zero.");
  cents(input.additionalFeesCents, "Additional fees");
  if (!input.standardScenarioConfirmed) throw new Error("Confirm the standard Minnesota retail transfer scenario. Exceptions require staff review.");
}

function validate(policy: PaymentPolicy, input: Omit<EstimateInputs, "priceCents">) {
  validateCharges(policy, input);
  if (!policy.terms.includes(input.termMonths) || !Number.isInteger(input.termMonths) || input.termMonths < 1 || input.termMonths > 120) throw new Error("Choose an available loan term.");
  cents(input.downPaymentCents, "Down payment");
}

export function estimateCashPurchase(policy: PaymentPolicy, input: CashEstimateInputs): CashEstimate {
  validateCharges(policy, input);
  cents(input.priceCents, "Vehicle price", 1);
  const documentationFeeCents = Math.min(policy.documentationFeeCents, Math.floor(input.priceCents / 10), 35000);
  const salesTaxCents = Math.round(input.priceCents * policy.salesTaxPartsPerMillion / 1000000);
  const baseFeesCents = policy.baseFees.reduce((total, fee) => total + fee.cents, 0);
  return {
    policyVersion: policy.version, priceCents: input.priceCents, salesTaxCents, documentationFeeCents, baseFeesCents,
    additionalFeesCents: input.additionalFeesCents!,
    totalDueCents: input.priceCents + salesTaxCents + documentationFeeCents + baseFeesCents + input.additionalFeesCents!
  };
}

export function estimatePayment(policy: PaymentPolicy, input: EstimateInputs): PaymentEstimate {
  validate(policy, input);
  const { salesTaxCents, documentationFeeCents, baseFeesCents, totalDueCents: beforeLien } = estimateCashPurchase(policy, input);
  if (input.downPaymentCents > beforeLien) throw new Error("Down payment exceeds the estimated purchase total before a loan lien. Reduce it or choose another vehicle price.");
  const lienFeeCents = input.downPaymentCents < beforeLien ? policy.lienFeeCents : 0;
  const purchaseTotalCents = beforeLien + lienFeeCents;
  const amountFinancedCents = purchaseTotalCents - input.downPaymentCents;
  const monthlyRate = policy.annualInterestBasisPoints / 10000 / 12;
  const regular = amountFinancedCents === 0 ? 0 : monthlyRate === 0 ? amountFinancedCents / input.termMonths : amountFinancedCents * monthlyRate / (1 - Math.pow(1 + monthlyRate, -input.termMonths));
  const monthlyPaymentCents = Math.max(0, Math.ceil(regular - 1e-8));
  let balance = amountFinancedCents;
  let totalPaymentsCents = 0;
  let finalPaymentCents = 0;
  let paymentCount = 0;
  for (let month = 0; month < input.termMonths && balance > 1e-7; month += 1) {
    const due = balance * (1 + monthlyRate);
    const settles = month === input.termMonths - 1 || due <= monthlyPaymentCents;
    const payment = settles ? Math.round(due) : monthlyPaymentCents;
    totalPaymentsCents += payment;
    finalPaymentCents = payment;
    paymentCount += 1;
    balance = settles ? 0 : Math.max(0, due - payment);
  }
  return {
    policyVersion: policy.version, priceCents: input.priceCents, downPaymentCents: input.downPaymentCents, termMonths: input.termMonths,
    annualInterestBasisPoints: policy.annualInterestBasisPoints, salesTaxCents, documentationFeeCents, baseFeesCents, lienFeeCents,
    additionalFeesCents: input.additionalFeesCents!, purchaseTotalCents, amountFinancedCents, monthlyPaymentCents, finalPaymentCents,
    paymentCount, totalPaymentsCents, totalInterestCents: totalPaymentsCents - amountFinancedCents, totalCostCents: input.downPaymentCents + totalPaymentsCents
  };
}

export function affordablePrice(policy: PaymentPolicy, input: Omit<EstimateInputs, "priceCents"> & { budgetCents: number }) {
  validate(policy, input);
  cents(input.budgetCents, "Monthly budget", 1);
  let lower = 1;
  let upper = maximumCents;
  let match: PaymentEstimate | null = null;
  while (lower <= upper) {
    const priceCents = Math.floor((lower + upper) / 2);
    let estimate: PaymentEstimate;
    try { estimate = estimatePayment(policy, { ...input, priceCents }); }
    catch (error) {
      if (error instanceof Error && error.message.startsWith("Down payment exceeds")) { lower = priceCents + 1; continue; }
      throw error;
    }
    if (Math.max(estimate.monthlyPaymentCents, estimate.finalPaymentCents) <= input.budgetCents) { match = estimate; lower = priceCents + 1; }
    else upper = priceCents - 1;
  }
  return match;
}
