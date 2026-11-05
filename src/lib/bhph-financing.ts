import { cashCents, cashMoney } from "./cash-retail-sale";
import { localPipelineDate } from "./crm-pipeline";
import { EMPTY_BHPH_OPTIONS, selectedBhphProducts, withoutBhphOptions } from "./bhph-optional-products";

export const BHPH_FINANCING_VERSION = "mn-bhph/v1";
// Verified 2026-11-04: revenue.state.mn.us/guide/motor-vehicle-sales;
// revisor.mn.gov/statutes/cite/168.27 (subd. 31); DPS BuyingorSellingMotorVehicle_Just_the_Facts.pdf.
// These are standard transaction defaults. Registration, plates and wheelage use the actual DVS quote.
export const MN_BHPH_FEE_DEFAULTS = {
  ...EMPTY_BHPH_OPTIONS,
  saleDate: "", docFee: "300.00", titleFee: "8.25", transferFee: "10.00", filingFee: "12.00", technologyFee: "2.25", publicSafetyFee: "3.50", lienFee: "2.00",
  registrationFee: "", plateFee: "0.00", wheelageTax: "0.00", otherFee: "0.00", otherFeeLabel: "",
  accessories: "0.00", rebate: "0.00", tradeAllowance: "0.00", tradeVin: "", tradePayoff: "0.00",
  taxTreatment: "STANDARD", taxOverride: "", taxReason: "", exciseTreatment: "HENNEPIN", exciseReason: ""
};
export type BhphFinancingFacts = typeof MN_BHPH_FEE_DEFAULTS;
export const newBhphFinancingFacts = (): BhphFinancingFacts => ({ ...MN_BHPH_FEE_DEFAULTS, saleDate: localPipelineDate(new Date()) });
export const BHPH_FEE_LABELS = {
  docFee: "Documentation fee", titleFee: "Title fee", transferFee: "Vehicle transfer fee", filingFee: "Filing fee", technologyFee: "DVS technology surcharge", publicSafetyFee: "Public safety vehicle fee", lienFee: "Lien recording fee", registrationFee: "Registration fee / tax", plateFee: "Plate fee", wheelageTax: "Wheelage tax", otherFee: "Other non-taxable fee"
} as const;
export function bhphFeeInputError(key: keyof typeof BHPH_FEE_LABELS, value: string) {
  if (!value.trim()) return `Enter ${BHPH_FEE_LABELS[key].toLowerCase()}, including 0 if not due.`;
  try { cashCents(value); return null; } catch { return `${BHPH_FEE_LABELS[key]}: enter one amount such as 417.00 or $417.00. Do not add /0; enter 0 alone only when no fee is due.`; }
}

export function bhphFinancingFacts(raw: unknown): BhphFinancingFacts {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("Review the itemized Minnesota taxes and fees before generating the BHPH packet.");
  const source = raw as Record<string, unknown>;
  for (const key of ["optionalWarrantySelected", "optionalAccessorySelected", "optionalOtherSelected"]) if (source[key] !== undefined && typeof source[key] !== "string") throw new Error("Optional product selections must be explicitly selected or cleared.");
  // Missing monetary entries stay missing; server generation must not invent a fee quote.
  return Object.fromEntries(Object.keys(MN_BHPH_FEE_DEFAULTS).map(key => [key, typeof source[key] === "string" ? source[key].trim().slice(0, 500) : ""])) as BhphFinancingFacts;
}

export function calculateBhphFinancing(salePrice: string, downPayment: string, facts: BhphFinancingFacts) {
  const sale = cashCents(salePrice), down = cashCents(downPayment);
  const optionalProducts = selectedBhphProducts(facts);
  const accessories = cashCents(facts.accessories) + optionalProducts.mvstAccessoriesCents, rebate = cashCents(facts.rebate), trade = cashCents(facts.tradeAllowance), payoff = cashCents(facts.tradePayoff);
  if (!sale) throw new Error("Enter the vehicle sale price.");
  if (rebate + trade > sale + accessories) throw new Error("Trade allowance and rebate cannot exceed the vehicle price plus taxable accessories.");
  const taxable = sale + accessories - rebate - trade;
  const fees = Object.fromEntries(Object.keys(BHPH_FEE_LABELS).map(key => {
    const value = facts[key as keyof BhphFinancingFacts];
    if (value.trim()) { const error = bhphFeeInputError(key as keyof typeof BHPH_FEE_LABELS, value); if (error) throw new Error(error); }
    return [key, cashCents(value)];
  })) as Record<keyof typeof BHPH_FEE_LABELS, number>;
  const feeTotal = Object.values(fees).reduce((sum, cents) => sum + cents, 0);
  if (!["STANDARD", "EXEMPT_OR_SPECIAL"].includes(facts.taxTreatment)) throw new Error("Choose the Minnesota motor vehicle tax treatment.");
  if (!["HENNEPIN", "OTHER_APPLICABLE", "NONE"].includes(facts.exciseTreatment)) throw new Error("Choose the delivery location's vehicle excise tax treatment.");
  const salesTax = facts.taxTreatment === "STANDARD" ? Math.round(taxable * 6875 / 100000) : cashCents(facts.taxOverride);
  const exciseTax = facts.exciseTreatment === "NONE" ? 0 : 2000;
  const total = sale + accessories - rebate - trade + payoff + feeTotal + salesTax + exciseTax + optionalProducts.nonMvstPriceCents + optionalProducts.generalTaxCents;
  if (down > total) throw new Error("Down payment cannot exceed the total price including taxes and fees.");
  return { sale, down, accessories, rebate, trade, payoff, taxable, fees, feeTotal, salesTax, exciseTax, total, amountFinanced: total - down, optionalProducts };
}
export function bhphWithoutOptionalPrincipal(salePrice: string, downPayment: string, facts: BhphFinancingFacts) {
  const total = calculateBhphFinancing(salePrice, "0", withoutBhphOptions(facts)).total;
  return Math.max(0, total - cashCents(downPayment));
}

export function bhphFinancingIssue(salePrice: string, downPayment: string, facts: BhphFinancingFacts): string | null {
  try {
    const result = calculateBhphFinancing(salePrice, downPayment, facts);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(facts.saleDate) || !Number.isFinite(Date.parse(facts.saleDate)) || new Date(facts.saleDate).toISOString().slice(0, 10) !== facts.saleDate || facts.saleDate < "2023-07-01") return "Enter the Minnesota sale date (July 1, 2023 or later for this fee schedule).";
    const cap = facts.saleDate >= "2025-07-01" ? 35000 : facts.saleDate >= "2024-07-01" ? 27500 : 20000;
    const limit = Math.min(cap, Math.floor((result.sale + result.accessories - result.rebate) / 10));
    if (result.fees.docFee > limit) return `Documentation fee exceeds the Minnesota limit for this sale: ${cashMoney(limit)}.`;
    for (const [key, label] of Object.entries(BHPH_FEE_LABELS)) if (!facts[key as keyof BhphFinancingFacts].trim()) return `Enter ${label.toLowerCase()}, including 0 if not due.`;
    if (result.trade && !/^[A-HJ-NPR-Z0-9]{17}$/i.test(facts.tradeVin)) return "Enter the motor vehicle trade-in VIN before taking its tax allowance.";
    if (result.payoff && !result.trade) return "Record the trade-in allowance before adding its payoff.";
    if (result.fees.otherFee && !facts.otherFeeLabel.trim()) return "Describe the other non-taxable fee. Put taxable accessories or dealer preparation in the taxable items line.";
    if (facts.taxTreatment === "EXEMPT_OR_SPECIAL" && (!facts.taxOverride.trim() || !facts.taxReason.trim())) return "Enter the verified special/exempt tax amount and its basis.";
    if (facts.exciseTreatment === "NONE" && !facts.exciseReason.trim()) return "Record why local vehicle excise tax is not due for this delivery.";
    return null;
  } catch (error) { return error instanceof Error ? error.message : "Review the Minnesota taxes and fees."; }
}

export function bhphFinancingRows(result: ReturnType<typeof calculateBhphFinancing>, facts: BhphFinancingFacts): Array<[string, string]> {
  return [["Sale date", facts.saleDate], ["Vehicle sale price", cashMoney(result.sale)], ["Taxable accessories / dealer preparation", cashMoney(result.accessories)], ["Rebate", cashMoney(result.rebate)], ["Motor vehicle trade allowance", cashMoney(result.trade)], ["Trade payoff", cashMoney(result.payoff)], ["MVST taxable price", cashMoney(result.taxable)], ["MN motor vehicle sales tax", cashMoney(result.salesTax)], ["Local vehicle excise tax", cashMoney(result.exciseTax)], ...Object.entries(BHPH_FEE_LABELS).map(([key, label]): [string, string] => [label, cashMoney(result.fees[key as keyof typeof BHPH_FEE_LABELS])]), ["Other fee description", facts.otherFeeLabel || "None"], ["Tax treatment / basis", facts.taxTreatment === "STANDARD" ? "MN MVST 6.875%; ordinary local sales tax not applied" : facts.taxReason], ["Local excise treatment / basis", facts.exciseTreatment === "NONE" ? facts.exciseReason : facts.exciseTreatment === "HENNEPIN" ? "Hennepin County delivery" : "Other applicable local vehicle excise jurisdiction"], ["Total before down payment", cashMoney(result.total)], ["Down payment", cashMoney(result.down)], ["Amount financed", cashMoney(result.amountFinanced)]];
}
