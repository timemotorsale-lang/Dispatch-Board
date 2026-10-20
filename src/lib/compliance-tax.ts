import { businessDate, cents, MoneyError, text } from "@/lib/money-resources";

export const LEASE_TAX_SOURCE = "https://www.revenue.state.mn.us/guide/motor-vehicle-leases";
export const UPFRONT_POLICY = "MN-UPFRONT-2026-10-20-v1";
export type LocalTax = { code: string; rate: string };
export type TaxInput = {
  kind: "LEASE" | "SALE"; reference: string; date: string; customer: string; vehicle: string;
  customerId: string; vehicleId: string; vehicleValue: string; rebates: string; residual: string;
  trade: string; taxableAdditions: string; rentCharge: string; contractTax: string;
  garageAddress: string; localTaxes: LocalTax[]; localConfirmed: boolean; qualified: boolean; notes: string;
};
export type TaxLine = { code: string; rate: string; baseCents: number; taxCents: number };
export type TaxCalculation = { policy: string; input: TaxInput; baseCents: number; taxCents: number; lines: TaxLine[]; flags: string[] };
export function taxMonth(value: unknown) {
  const month = text(value, 7);
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month) || month < "2000-01") throw new MoneyError("Choose a valid reporting month.");
  return month;
}
function rateUnits(value: unknown) {
  const rate = text(value, 8);
  if (!/^\d{1,2}(\.\d{1,5})?$/.test(rate)) throw new MoneyError("Enter a local percentage with up to five decimal places.");
  const [whole, fraction = ""] = rate.split(".");
  const units = Number(whole) * 100000 + Number(fraction.padEnd(5, "0"));
  if (units > 1000000) throw new MoneyError("Review local rates above 10% outside this tool.");
  return units;
}
export function calculateTax(raw: unknown): TaxCalculation {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new MoneyError("Enter a lease or sale record.");
  const value = raw as Record<string, unknown>;
  if (value.kind !== "LEASE" && value.kind !== "SALE") throw new MoneyError("Choose lease or vehicle sale.");
  const input: TaxInput = {
    kind: value.kind, reference: text(value.reference, 100).toUpperCase(), date: businessDate(value.date),
    customer: text(value.customer, 160), vehicle: text(value.vehicle, 160), customerId: text(value.customerId), vehicleId: text(value.vehicleId),
    vehicleValue: text(value.vehicleValue || "0", 14), rebates: text(value.rebates || "0", 14), residual: text(value.residual || "0", 14),
    trade: text(value.trade || "0", 14), taxableAdditions: text(value.taxableAdditions || "0", 14), rentCharge: text(value.rentCharge || "0", 14),
    contractTax: text(value.contractTax, 14), garageAddress: text(value.garageAddress, 240), localTaxes: [],
    localConfirmed: value.localConfirmed === true, qualified: value.qualified === true, notes: text(value.notes, 2000)
  };
  if (!input.reference || !input.customer || !input.vehicle) throw new MoneyError("Enter a unique contract reference, customer and vehicle.");
  const amount = (key: "vehicleValue" | "rebates" | "residual" | "trade" | "taxableAdditions" | "rentCharge") => cents(input[key], true);
  const baseCents = amount("vehicleValue") - amount("rebates") - amount("residual") - amount("trade") + amount("taxableAdditions") + amount("rentCharge");
  if (baseCents < 0 || baseCents > 1_000_000_000) throw new MoneyError("The taxable lease price must be between $0 and $10,000,000.");
  const lines: TaxLine[] = [], flags: string[] = [];
  if (input.kind === "LEASE") {
    if (!Array.isArray(value.localTaxes) || value.localTaxes.length > 8) throw new MoneyError("Enter up to eight applicable local tax lines.");
    const codes = new Set<string>();
    input.localTaxes = value.localTaxes.map(rawLine => {
      if (!rawLine || typeof rawLine !== "object") throw new MoneyError("Review the local tax lines.");
      const line = rawLine as Record<string, unknown>, code = text(line.code, 80).toUpperCase(), rate = text(line.rate, 8);
      const units = rateUnits(rate);
      if (!code || code === "MN STATE" || codes.has(code)) throw new MoneyError("Use a distinct jurisdiction/reporting code for every local tax.");
      codes.add(code);
      lines.push({ code, rate, baseCents, taxCents: Math.round(baseCents * units / 10000000) });
      return { code, rate };
    });
    lines.unshift({ code: "MN STATE", rate: "6.875", baseCents, taxCents: Math.round(baseCents * 687500 / 10000000) });
    if (!input.qualified) flags.push("Confirm eligibility for the upfront-tax model; renewals, short-term rentals and exceptions require separate review.");
    if (!input.garageAddress || !input.localConfirmed) flags.push("Verify garaging address and all applicable local tax codes/rates, including when none apply.");
  }
  const taxCents = lines.reduce((total, line) => total + line.taxCents, 0);
  if (input.contractTax) {
    const declared = cents(input.contractTax, true);
    if (input.kind === "LEASE" && declared !== taxCents) flags.push("Calculated tax differs from the signed contract. Reconcile before recording this period as filed.");
  }
  if (input.kind === "LEASE" && !input.contractTax) flags.push("Enter the signed contract tax amount for reconciliation.");
  return { policy: UPFRONT_POLICY, input, baseCents, taxCents, lines, flags };
}
export function summarizeTax(records: Array<{ id: string; snapshot: TaxCalculation; status: string }>) {
  const leases = records.filter(row => row.status === "ACTIVE" && row.snapshot.input.kind === "LEASE");
  const sales = records.filter(row => row.status === "ACTIVE" && row.snapshot.input.kind === "SALE");
  const grouped = new Map<string, TaxLine>();
  for (const row of leases) for (const line of row.snapshot.lines) {
    const key = `${line.code}:${line.rate}`, existing = grouped.get(key);
    grouped.set(key, { ...line, baseCents: (existing?.baseCents ?? 0) + line.baseCents, taxCents: (existing?.taxCents ?? 0) + line.taxCents });
  }
  const lines = [...grouped.values()];
  return { leaseCount: leases.length, saleCount: sales.length, lines, totalCents: lines.reduce((total, line) => total + line.taxCents, 0), needsReview: leases.filter(row => row.snapshot.flags.length).length };
}
