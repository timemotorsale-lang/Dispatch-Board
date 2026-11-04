export const CASH_SALE_FORM_IDS = ["sales-agreement", "binding-contract-disclosure", "odometer-disclosure", "title-registration-application", "tax-fee-receipt", "title-assignment", "power-of-attorney", "buyers-guide", "funding-proof", "insurance-proof", "warranty-disclosure", "we-owe", "delivery-documents", "title-damage-disclosure", "arbitration-agreement", "as-is-acknowledgment"];
export const CASH_SALE_REQUIRED_IDS = ["sales-agreement", "binding-contract-disclosure", "odometer-disclosure", "tax-fee-receipt"];
export const CASH_SALE_LABELS: Record<string, string> = {
  "sales-agreement": "Motor vehicle purchase agreement (front and reverse)", "binding-contract-disclosure": "Binding contract disclosure",
  "odometer-disclosure": "Odometer and damage disclosure", "title-registration-application": "Title / registration worksheet",
  "tax-fee-receipt": "Itemized price, taxes and fees", "title-assignment": "Original title / lien release checklist",
  "power-of-attorney": "Limited motor vehicle power of attorney", "buyers-guide": "Official FTC Buyers Guide",
  "funding-proof": "Payment record", "insurance-proof": "Insurance record", "warranty-disclosure": "Warranty disclosure",
  "title-damage-disclosure": "Vehicle title and damage disclosure", "arbitration-agreement": "Separate arbitration agreement (optional)", "as-is-acknowledgment": "Conditional As Is acknowledgment",
  "we-owe": "Promised repairs / we owe", "delivery-documents": "Delivery acknowledgment", "trade-documents": "Trade-in record"
};
export const EMPTY_CASH_SALE = {
  coBuyerAddress: "", asIsExclusion: "", eligibilityReviewedBy: "",
  buyerAddress: "", buyerPhone: "", buyerEmail: "", coBuyer: "", saleDate: "", deliveryDate: "",
  dealerName: "Time Motor Sales", dealerAddress: "1101 E. Lake Street, Minneapolis, MN 55407", dealerLicense: "", dealerPhone: "", dealerEmail: "timemotorsale@gmail.com",
  mileage: "", odometerStatus: "", odometerExemption: "", titleBrand: "", damageDisclosure: "", plate: "", plateState: "MN",
  docFee: "300.00", titleFee: "", registrationFee: "", otherFee: "", otherFeeLabel: "", accessories: "0", rebate: "0",
  tradeVehicle: "", tradeVin: "", tradeAllowance: "0", tradePayoff: "0", tradeLienholder: "",
  taxOverride: "", taxReason: "", paymentReceived: "0", paymentMethod: "", paymentReference: "", paymentDate: "",
  insuranceCompany: "", insurancePolicy: "", insuranceExpiration: "",
  warrantyType: "", warrantyCoverage: "", warrantyDuration: "", warrantyLabor: "100", warrantyParts: "100", warrantyExemption: "",
  promises: "", promiseDue: "", authorizedAgent: "", poaExpiration: "", deliveryNotes: "", keys: "", fuel: ""
};
export type CashSaleFacts = typeof EMPTY_CASH_SALE;
export function cashSaleFacts(value: unknown): CashSaleFacts {
  const raw = value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
  return Object.fromEntries(Object.entries(EMPTY_CASH_SALE).map(([key, fallback]) => [key, typeof raw[key] === "string" ? raw[key].trim().slice(0, 1200) : fallback])) as CashSaleFacts;
}
export function cashCents(value: string): number {
  const normalized = value.replace(/[$,\s]/g, "");
  if (!normalized) return 0;
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) throw new Error("Enter a non-negative amount with no more than two decimal places.");
  const [whole, fraction = ""] = normalized.split(".");
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  if (!Number.isSafeInteger(cents) || cents > 10000000000) throw new Error("Enter an amount within the supported range.");
  return cents;
}
export function cashSaleTotals(price: string, facts: CashSaleFacts) {
  const sale = cashCents(price), accessories = cashCents(facts.accessories), rebate = cashCents(facts.rebate), trade = cashCents(facts.tradeAllowance), payoff = cashCents(facts.tradePayoff);
  const fees = cashCents(facts.docFee) + cashCents(facts.titleFee) + cashCents(facts.registrationFee) + cashCents(facts.otherFee);
  const taxable = Math.max(0, sale + accessories - rebate - trade);
  const tax = facts.taxOverride !== "" ? cashCents(facts.taxOverride) : Math.round(taxable * 6875 / 100000);
  const total = sale + accessories - rebate - trade + payoff + fees + tax, paid = cashCents(facts.paymentReceived);
  return { sale, accessories, rebate, trade, payoff, fees, taxable, tax, total, paid, balance: total - paid };
}
export function cashSaleError(customer: string, vin: string, price: string, facts: CashSaleFacts, ids: string[]): string | null {
  if (!customer.trim() || /^(Customer not selected|Customer not captured)$/i.test(customer)) return "Select the buyer for this existing deal.";
  if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(vin)) return "Select the inventory vehicle with a valid 17-character VIN.";
  if (!facts.buyerAddress) return "Enter the buyer's address for the sales packet.";
  if (!facts.dealerLicense) return "Enter the selling dealer's license number.";
  const date = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v) && Number.isFinite(Date.parse(v)) && new Date(v).toISOString().slice(0, 10) === v;
  if (!date(facts.saleDate)) return "Enter a valid sale date.";
  for (const [label, value] of [["delivery", facts.deliveryDate], ["payment", facts.paymentDate], ["insurance expiration", facts.insuranceExpiration], ["power-of-attorney expiration", facts.poaExpiration], ["promised repair", facts.promiseDue]]) if (value && !date(value)) return `Enter a valid ${label} date.`;
  try {
    const total = cashSaleTotals(price, facts);
    if (total.sale <= 0) return "Enter the agreed vehicle sale price.";
    if (total.total < 0 || total.balance < 0) return "Review the allowances and payment: the cash sale cannot have a negative price or an overpayment in this packet.";
    if (total.rebate + total.trade > total.sale + total.accessories) return "Review the trade allowance and rebate; they exceed the sale price.";
    if (total.trade && !/^[A-HJ-NPR-Z0-9]{17}$/.test(facts.tradeVin)) return "Enter the trade-in vehicle's VIN before using a motor-vehicle trade allowance.";
    if (total.payoff && !total.trade) return "Record the trade-in allowance before adding its payoff.";
    if (facts.taxOverride !== "" && !facts.taxReason) return "Explain the tax override or exemption before generating.";
    if (cashCents(facts.otherFee) && !facts.otherFeeLabel) return "Describe the additional fee.";
    if (total.paid && (!facts.paymentMethod || !facts.paymentReference || !date(facts.paymentDate))) return "Enter the payment method, reference and date for the recorded payment.";
  } catch (e) { return e instanceof Error ? e.message : "Check the sale amounts."; }
  if (ids.includes("odometer-disclosure") && (!/^\d+$/.test(facts.mileage) || !["Actual", "Not actual - odometer discrepancy", "Exceeds mechanical limits", "Exempt"].includes(facts.odometerStatus))) return "Enter the odometer reading and mileage status.";
  if (ids.includes("odometer-disclosure") && facts.odometerStatus === "Exempt" && !facts.odometerExemption) return "Record the odometer exemption basis.";
  if (ids.includes("odometer-disclosure") && (!facts.titleBrand || !facts.damageDisclosure)) return "Record the title brand and known damage disclosure.";
  if (ids.includes("power-of-attorney") && (!facts.authorizedAgent || !date(facts.poaExpiration) || facts.poaExpiration < facts.saleDate)) return "Name the authorized agent and enter a power-of-attorney expiration on or after the sale date.";
  if (ids.includes("warranty-disclosure") && (facts.warrantyLabor !== "100" || facts.warrantyParts !== "100")) return "The committed warranty form states 100% covered parts and labor. Match the entered coverage before including it.";
  if (ids.includes("as-is-acknowledgment") && facts.warrantyType !== "No dealer warranty - eligibility reviewed") return "Use the As Is acknowledgment only for an explicitly reviewed no-dealer-warranty election.";
  if (ids.includes("as-is-acknowledgment") && (!facts.asIsExclusion || !facts.eligibilityReviewedBy)) return "Record the exact As Is exclusion and staff eligibility review before including this conditional form.";
  if (ids.includes("as-is-acknowledgment") && ids.includes("warranty-disclosure")) return "Choose either the applicable warranty or conditional As Is acknowledgment, not both.";
  if (ids.includes("buyers-guide") || ids.includes("warranty-disclosure") || ids.includes("as-is-acknowledgment")) {
    if (!["Dealer limited warranty", "No dealer warranty - eligibility reviewed"].includes(facts.warrantyType)) return "Choose the warranty terms before generating the Buyers Guide.";
    if (facts.warrantyType === "Dealer limited warranty" && (!facts.warrantyCoverage || !facts.warrantyDuration)) return "Describe the covered systems and warranty duration, including any required Minnesota coverage.";
    if (facts.warrantyType === "No dealer warranty - eligibility reviewed" && !facts.warrantyExemption) return "Record why the vehicle is exempt from the Minnesota used-vehicle warranty requirement before choosing no dealer warranty.";
    if (![facts.warrantyLabor, facts.warrantyParts].every(v => /^\d{1,3}$/.test(v) && Number(v) <= 100)) return "Enter warranty labor and parts coverage between 0 and 100 percent.";
  }
  return null;
}
export const cashMoney = (cents: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
