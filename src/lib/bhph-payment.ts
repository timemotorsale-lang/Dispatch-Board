import { cashCents } from "./cash-retail-sale";
import { validPipelineDate } from "./crm-pipeline";

export const BHPH_PAYMENT_VERSION = "bhph-payment/v1";
export type BhphPaymentInput = { calculationMode: string; apr: string; paymentFrequency: string; termMonths: string; paymentAmount: string; firstPaymentDate: string };
export type BhphPaymentSchedule = { calculationMode: string; paymentFrequency: string; annualRate: number; regularPaymentCents: number; finalPaymentCents: number; numberOfPayments: number; fullPaymentCount: number; totalInterestCents: number; totalPaymentsCents: number; estimatedTermMonths: number; firstPaymentDate: string; lastPaymentDate: string; payments: Array<{ number: number; dueDate: string; amountCents: number; interestCents: number; principalCents: number; balanceCents: number }> };
export type BhphPaymentSummary = { amountFinancedCents: number; regularPaymentCents: number; finalPaymentCents: number; numberOfPayments: number; totalPaymentsCents: number; lastPaymentDate: string };
export function bhphPaymentSummary(principal: number, terms: BhphPaymentInput, saleDate: string): BhphPaymentSummary {
  if (!principal) return { amountFinancedCents: 0, regularPaymentCents: 0, finalPaymentCents: 0, numberOfPayments: 0, totalPaymentsCents: 0, lastPaymentDate: "No financed balance" };
  const schedule = calculateBhphPayment(principal, terms, saleDate);
  return { amountFinancedCents: principal, regularPaymentCents: schedule.numberOfPayments === 1 ? schedule.finalPaymentCents : schedule.regularPaymentCents, finalPaymentCents: schedule.finalPaymentCents, numberOfPayments: schedule.numberOfPayments, totalPaymentsCents: schedule.totalPaymentsCents, lastPaymentDate: schedule.lastPaymentDate };
}
const frequencies: Record<string, number> = { Weekly: 52, Biweekly: 26, Semimonthly: 24, Monthly: 12 };

function dueDate(first: string, index: number, frequency: string) {
  const [year, month, day] = first.split("-").map(Number);
  if (frequency === "Weekly" || frequency === "Biweekly") return new Date(Date.UTC(year, month - 1, day + index * (frequency === "Weekly" ? 7 : 14))).toISOString().slice(0, 10);
  let monthOffset = index, targetDay = day;
  if (frequency === "Semimonthly") {
    monthOffset = Math.floor(index / 2);
    if (index % 2) { targetDay = day <= 15 ? day + 15 : day - 15; if (day > 15) monthOffset++; }
  }
  const lastDay = new Date(Date.UTC(year, month - 1 + monthOffset + 1, 0)).getUTCDate();
  return new Date(Date.UTC(year, month - 1 + monthOffset, Math.min(targetDay, lastDay))).toISOString().slice(0, 10);
}

/** Periodic amortization estimate; final credit disclosures remain part of the approved installment contract. */
export function calculateBhphPayment(principalCents: number, input: BhphPaymentInput, saleDate?: string): BhphPaymentSchedule {
  if (!Number.isSafeInteger(principalCents) || principalCents <= 0) throw new Error("Amount financed must be greater than zero to calculate payments.");
  if (!["TERM", "PAYMENT_AMOUNT"].includes(input.calculationMode)) throw new Error("Choose Calculate payment from term or Calculate term from fixed payment.");
  const periodsPerYear = frequencies[input.paymentFrequency];
  if (!periodsPerYear) throw new Error("Choose a supported payment frequency.");
  const rateText = input.apr.trim().replace(/%$/, "").trim();
  if (!/^\d+(\.\d{1,4})?$/.test(rateText) || Number(rateText) > 100) throw new Error("Enter the annual rate between 0 and 100 with up to four decimal places.");
  if (!validPipelineDate(input.firstPaymentDate)) throw new Error("Enter a valid first payment date.");
  if (saleDate && input.firstPaymentDate <= saleDate) throw new Error("The first payment date must follow the sale date.");
  const periodicRate = Number(rateText) / 100 / periodsPerYear;
  let regularPaymentCents: number, requestedPayments: number | null = null;
  if (input.calculationMode === "TERM") {
    if (!/^\d+$/.test(input.termMonths) || Number(input.termMonths) < 1 || Number(input.termMonths) > 120) throw new Error("Enter a term from 1 to 120 whole months.");
    requestedPayments = Math.max(1, Math.round(Number(input.termMonths) * periodsPerYear / 12));
    regularPaymentCents = Math.ceil((periodicRate === 0 ? principalCents / requestedPayments : principalCents * periodicRate / -Math.expm1(-requestedPayments * Math.log1p(periodicRate))) - 1e-9);
  } else {
    try { regularPaymentCents = cashCents(input.paymentAmount); } catch { throw new Error("Enter one fixed payment amount, such as 500.00."); }
    if (!regularPaymentCents) throw new Error("Enter a fixed payment greater than zero.");
  }
  let balance = principalCents, totalInterestCents = 0;
  const payments: Array<{ number: number; dueDate: string; amountCents: number; interestCents: number; principalCents: number; balanceCents: number }> = [];
  for (let index = 0; balance > 0 && index < 1200; index++) {
    const interestCents = Math.round(balance * periodicRate);
    if (regularPaymentCents <= interestCents) throw new Error("The fixed payment does not cover periodic interest. Increase the payment or reduce the annual rate.");
    const amountCents = Math.min(regularPaymentCents, balance + interestCents), paidPrincipal = amountCents - interestCents;
    balance -= paidPrincipal; totalInterestCents += interestCents;
    payments.push({ number: index + 1, dueDate: dueDate(input.firstPaymentDate, index, input.paymentFrequency), amountCents, interestCents, principalCents: paidPrincipal, balanceCents: balance });
  }
  if (balance > 0) throw new Error("This payment would require more than 1,200 payments. Increase the fixed payment.");
  // Rounding periodic interest can leave a penny beyond the target term. Recalculate with one cent more instead of hiding a balloon.
  if (requestedPayments && payments.length > requestedPayments) return { ...calculateBhphPayment(principalCents, { ...input, calculationMode: "PAYMENT_AMOUNT", paymentAmount: ((regularPaymentCents + 1) / 100).toFixed(2) }, saleDate), calculationMode: "TERM" };
  const finalPayment = payments[payments.length - 1];
  return { calculationMode: input.calculationMode, paymentFrequency: input.paymentFrequency, annualRate: Number(rateText), regularPaymentCents, finalPaymentCents: finalPayment.amountCents, numberOfPayments: payments.length, fullPaymentCount: payments.filter(payment => payment.amountCents === regularPaymentCents).length, totalInterestCents, totalPaymentsCents: principalCents + totalInterestCents, estimatedTermMonths: payments.length * 12 / periodsPerYear, firstPaymentDate: input.firstPaymentDate, lastPaymentDate: finalPayment.dueDate, payments };
}
