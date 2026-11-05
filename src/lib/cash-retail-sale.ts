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
  docFee: "300.00", titleFee: "", titleFeeItems: "", registrationFee: "", otherFee: "", otherFeeLabel: "", accessories: "0", rebate: "0",
  tradeVehicle: "", tradeVin: "", tradeAllowance: "0", tradePayoff: "0", tradeLienholder: "",
  taxOverride: "", taxReason: "", paymentReceived: "0", paymentMethod: "", paymentReference: "", paymentDate: "",
  insuranceCompany: "", insurancePolicy: "", insuranceExpiration: "",
  warrantyType: "", warrantyCoverage: "", warrantyDuration: "", warrantyLabor: "100", warrantyParts: "100", warrantyExemption: "",
  promises: "", promiseDue: "", authorizedAgent: "", poaExpiration: "", deliveryNotes: "", keys: "", fuel: ""
};
export type CashSaleFacts = typeof EMPTY_CASH_SALE;
export function cashSaleWarrantySelection(facts: CashSaleFacts, warrantyType: string): CashSaleFacts {
  if (warrantyType !== "Dealer limited warranty") return { ...facts, warrantyType };
  // Defaults are added only on an explicit staff selection, never when opening historical records.
  // Preserve staff-entered terms. Use the longer MN mileage-tier term for known low-mileage vehicles.
  const lowMileage = facts.odometerStatus === "Actual" && /^\d+$/.test(facts.mileage.trim()) && Number(facts.mileage) < 36000;
  return {
    ...facts, warrantyType,
    warrantyCoverage: facts.warrantyCoverage.trim() ? facts.warrantyCoverage : "Powertrain (engine, transmission and drive axle); additional Minnesota-required coverage applies.",
    warrantyDuration: facts.warrantyDuration.trim() ? facts.warrantyDuration : lowMileage ? "60 days or 2,500 miles, whichever occurs first" : "30 days or 1,000 miles, whichever occurs first"
  };
}
// Published DVS typical titled-vehicle transfer fees, verified 2026-11-05.
// https://assets.dps.mn.gov/files/dvs/BuyingorSellingMotorVehicle_Just_the_Facts.pdf
export const MN_TITLE_FEE_SCHEDULE = [
  { id: "title", label: "Minnesota title fee", amount: "8.25" },
  { id: "transfer", label: "Minnesota transfer tax", amount: "10.00" },
  { id: "filing", label: "Title transaction filing fee", amount: "12.00" },
  { id: "technology", label: "Title technology surcharge", amount: "2.25" },
  { id: "public-safety", label: "Public safety vehicle fee", amount: "3.50" },
  { id: "lien", label: "Lien recording fee (per lien)", amount: "2.00" }
] as const;
// Minnesota Statutes 168.12, subd. 5: regular/disability plate manufacturing fees.
export const MN_PLATE_FEE_SCHEDULE = [
  { id: "plate-double", label: "Regular / disability plates (double)", amount: "15.50" },
  { id: "plate-single", label: "Regular / disability plate (single)", amount: "13.50" }
] as const;
export type CashTitleFeeItem = { id: string; label: string; amount: string };
export function cashTitleFeeItems(facts: Pick<CashSaleFacts, "titleFee" | "titleFeeItems">): CashTitleFeeItem[] {
  if (!facts.titleFeeItems?.trim()) return facts.titleFee.trim() ? [{ id: "existing", label: "Previously entered title fees", amount: facts.titleFee }] : [];
  let raw: unknown;
  try { raw = JSON.parse(facts.titleFeeItems); } catch { throw new Error("Review the title fee breakdown; its saved details are invalid."); }
  if (!Array.isArray(raw) || raw.length > 20) throw new Error("Use no more than 20 title fee items.");
  if (raw.some(item => item?.id === "plate-double") && raw.some(item => item?.id === "plate-single")) throw new Error("Choose either a single plate or double plates for this vehicle, not both.");
  const ids = new Set<string>();
  return raw.map(item => {
    if (!item || typeof item.id !== "string" || !item.id.trim() || item.id.length > 80 || ids.has(item.id) || typeof item.label !== "string" || item.label.length > 80 || typeof item.amount !== "string" || item.amount.length > 40) throw new Error("Give each title fee a name, amount and unique selection.");
    ids.add(item.id);
    return { id: item.id, label: item.label.trim(), amount: item.amount.trim() };
  });
}
export function cashTitleFeeTotal(facts: Pick<CashSaleFacts, "titleFee" | "titleFeeItems">): number {
  return cashTitleFeeItems(facts).reduce((total, item) => {
    if (!item.label) throw new Error("Enter a name for each additional title fee.");
    if (!item.amount.trim()) throw new Error(`Enter an amount for ${item.label}, including 0 if not due.`);
    const sum = total + cashCents(item.amount);
    if (!Number.isSafeInteger(sum) || sum > 10000000000) throw new Error("Title fees exceed the supported amount.");
    return sum;
  }, 0);
}
export const CASH_SALE_DATE_FIELDS = ["saleDate", "deliveryDate", "paymentDate", "insuranceExpiration", "promiseDue"] as const;
// Calendar dates stay calendar dates: never convert them through the user's timezone.
export function cashSaleDate(value: string): string {
  const raw = value.trim();
  const us = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(raw);
  const iso = us ? `${us[3]}-${us[1].padStart(2, "0")}-${us[2].padStart(2, "0")}` : raw;
  return /^\d{4}-\d{2}-\d{2}$/.test(iso) && Number.isFinite(Date.parse(iso)) && new Date(iso).toISOString().slice(0, 10) === iso ? iso : "";
}
export function normalizeCashSaleDates(facts: CashSaleFacts): CashSaleFacts {
  return { ...facts, ...Object.fromEntries(CASH_SALE_DATE_FIELDS.map(key => [key, cashSaleDate(facts[key]) || facts[key]])) };
}
export function cashSaleFacts(value: unknown): CashSaleFacts {
  const raw = value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
  const facts = normalizeCashSaleDates(Object.fromEntries(Object.entries(EMPTY_CASH_SALE).map(([key, fallback]) => [key, typeof raw[key] === "string" ? raw[key].trim().slice(0, key === "titleFeeItems" ? 12000 : 1200) : fallback])) as CashSaleFacts);
  // The server derives the aggregate from the breakdown, rather than trusting a posted total.
  if (facts.titleFeeItems) { try { facts.titleFee = (cashTitleFeeTotal(facts) / 100).toFixed(2); } catch { /* cashSaleError reports invalid itemization before generation. */ } }
  return facts;
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
  const fees = cashCents(facts.docFee) + cashTitleFeeTotal(facts) + cashCents(facts.registrationFee) + cashCents(facts.otherFee);
  const taxable = Math.max(0, sale + accessories - rebate - trade);
  const tax = facts.taxOverride !== "" ? cashCents(facts.taxOverride) : Math.round(taxable * 6875 / 100000);
  const total = sale + accessories - rebate - trade + payoff + fees + tax, paid = cashCents(facts.paymentReceived);
  return { sale, accessories, rebate, trade, payoff, fees, taxable, tax, total, paid, balance: total - paid };
}
export function cashSaleError(customer: string, vin: string, price: string, facts: CashSaleFacts, ids: string[]): string | null {
  if (!customer.trim() || /^(Customer not selected|Customer not captured)$/i.test(customer)) return "Select the buyer for this existing deal.";
  if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(vin)) return "Select the inventory vehicle with a valid 17-character VIN.";
  if (!facts.buyerAddress) return "Enter the buyer's address for the sales packet.";
  const date = (v: string) => Boolean(cashSaleDate(v));
  if (!date(facts.saleDate)) return "Enter a valid sale date.";
  for (const [label, value] of [["delivery", facts.deliveryDate], ["payment", facts.paymentDate], ["insurance expiration", facts.insuranceExpiration], ["promised repair", facts.promiseDue]]) if (value && !date(value)) return `Enter a valid ${label} date.`;
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
  if (ids.includes("power-of-attorney") && !facts.authorizedAgent) return "Name the authorized power-of-attorney agent.";
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
