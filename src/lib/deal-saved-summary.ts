import { cashCents, cashMoney, cashSaleFacts, cashSaleTotals } from "./cash-retail-sale";
import { calculateLeaseToOwn, leaseAgreementCalculationError, leaseCalculatorInputFromFields } from "./lease-to-own-form-packet";
import type { SavedDealStatus } from "./saved-deal-status";

export type SavedDealReviewRecord = {
  id: string; dealNumber?: number; revision: number; updatedAt: string; customerName: string; vehicleReference: string;
  pathway: string; status?: SavedDealStatus; snapshot: Record<string, unknown>;
};
export type DealSummaryLine = { label: string; value: string; emphasis?: boolean };
const object = (value: unknown): Record<string, unknown> => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
const fields = (value: unknown): Record<string, string> => Object.fromEntries(Object.entries(object(value)).filter((entry): entry is [string, string] => typeof entry[1] === "string"));
const money = (value: string) => value.trim() ? cashMoney(cashCents(value)) : "Not entered";

// Read only the last successfully persisted snapshot. Never infer receipt of funds or signed documents.
export function savedDealSummary(record: SavedDealReviewRecord) {
  const snapshot = record.snapshot, form = fields(snapshot["desk:form"]), scope = record.pathway;
  const vehicle = fields(snapshot[`${scope}:vehicleFacts`]), identity = object(snapshot["desk:identity"]);
  const canonicalVehicle = fields(identity.vehicle);
  const leaseFacts = fields(snapshot[`${scope}:leaseFacts`]);
  const cash = cashSaleFacts(snapshot[`${scope}:cashSaleFacts`]);
  const rental = fields(snapshot[`${scope}:rentalFacts`]);
  const highlights: DealSummaryLine[] = [], structure: DealSummaryLine[] = [];
  let error = "";
  try {
    if (scope === "retail-sale" && form.amount?.trim()) {
      const totals = cashSaleTotals(form.amount, cash);
      structure.push({label:"Agreed vehicle price",value:cashMoney(totals.sale)}, {label:"Accessories",value:cashMoney(totals.accessories)},
        {label:"Rebate",value:cashMoney(totals.rebate)}, {label:"Trade allowance",value:cashMoney(totals.trade)},
        {label:"Trade payoff",value:cashMoney(totals.payoff)}, {label:"Taxes",value:cashMoney(totals.tax)}, {label:"Fees",value:cashMoney(totals.fees)});
      highlights.push({label:"Cash sale total",value:cashMoney(totals.total),emphasis:true},
        {label:"Payment entered on worksheet",value:cashMoney(totals.paid)}, {label:"Worksheet balance",value:cashMoney(totals.balance),emphasis:true});
    } else if (scope === "lease-to-own" && snapshot[`${scope}:leaseInputs`]) {
      const input = leaseCalculatorInputFromFields(fields(snapshot[`${scope}:leaseInputs`])), result = calculateLeaseToOwn(input);
      const invalid = leaseAgreementCalculationError(input, result);
      if (invalid) throw new Error(invalid);
      structure.push({label:"Agreed vehicle price",value:cashMoney(result.grossCapitalizedCostTotalCents)},
        {label:"Capitalized cost reduction",value:cashMoney(result.capitalizedCostReductionCents)},
        {label:"Up-front tax",value:cashMoney(result.applicableTaxesCents)},
        {label:"Costs, taxes & fees",value:cashMoney(result.costsTaxesFeesCents)},
        {label:"Residual / purchase option",value:cashMoney(result.residualValueCents)});
      highlights.push({label:"Due at signing",value:cashMoney(result.amountDueAtSigningCents),emphasis:true},
        {label:"Base payment",value:cashMoney(result.basePeriodicPaymentCents),emphasis:true},
        {label:"Payment schedule",value:`${result.contractLength} payments · ${input.paymentFrequency === "BiWeekly" ? "Every two weeks" : input.paymentFrequency}`},
        {label:"Final payment",value:cashMoney(result.finalPeriodicPaymentCents)},
        {label:"Total payments",value:cashMoney(result.totalOfPaymentsCents)});
    } else if (scope === "bhph") {
      const terms = fields(snapshot[`${scope}:terms`]);
      structure.push({label:"Agreed vehicle price",value:money(terms.salePrice || "")}, {label:"Down payment",value:money(terms.downPayment || "")});
      highlights.push({label:"Payment entered",value:money(terms.paymentAmount || ""),emphasis:true},
        {label:"Payment frequency",value:terms.paymentFrequency || "Not entered"}, {label:"Term",value:terms.termMonths ? `${terms.termMonths} months` : "Not entered"},
        {label:"APR entered",value:terms.apr || "Not entered"}, {label:"First payment date",value:terms.firstPaymentDate || "Not entered"});
    } else {
      if (form.amount?.trim()) highlights.push({label:scope === "daily-rental" ? "Saved checkout amount" : "Saved deal amount",value:money(form.amount),emphasis:true});
      if (["daily-rental","vehicle-loaner"].includes(scope)) {
        structure.push({label:"Scheduled pickup",value:[rental.pickupDate,rental.pickupTime].filter(Boolean).join(" · ") || "Not entered"},
          {label:"Scheduled return",value:[rental.dropoffDate,rental.dropoffTime].filter(Boolean).join(" · ") || "Not entered"});
      }
      if (!highlights.length) highlights.push({label:"Terms",value:"Review the saved terms in Terms & Payments"});
    }
  } catch (caught) {
    structure.length = 0; highlights.length = 0;
    error = caught instanceof Error ? caught.message : "Review the saved amounts in Terms & Payments.";
  }
  const jackets = fields(snapshot.jackets);
  return {
    pathway:scope, customer:record.customerName, vehicle:record.vehicleReference,
    vin:canonicalVehicle.vin || vehicle.vin || "", stock:canonicalVehicle.stockNumber || vehicle.stockNumber || "",
    phone:cash.buyerPhone || leaseFacts.lesseePhone || rental.cellPhone || "",
    email:cash.buyerEmail || leaseFacts.lesseeEmail || rental.email || "",
    address:cash.buyerAddress || [leaseFacts.streetAddress,leaseFacts.city,leaseFacts.state,leaseFacts.zip].filter(Boolean).join(", "),
    customerLinked:Boolean(identity.customerId || form.customerId && form.customerId !== "__manual_customer__"), vehicleLinked:Boolean(identity.vehicleId),
    ownerId:form.ownerUserId || "", note:form.note || "", jacketId:jackets[scope] || "",
    structure, highlights, error
  };
}
