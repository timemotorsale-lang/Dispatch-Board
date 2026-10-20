import { describe, expect, it } from "vitest";
import { calculateTax, summarizeTax, taxMonth } from "@/lib/compliance-tax";

export const leaseFixture = () => ({ kind: "LEASE", reference: "lease-1", date: "2026-09-15", customer: "Review customer", vehicle: "Review vehicle", vehicleValue: "25000", rebates: "1000", residual: "10000", trade: "5000", taxableAdditions: "400", rentCharge: "2116", contractTax: "791.73", garageAddress: "Verified Minnesota garaging address", localTaxes: [], localConfirmed: true, qualified: true });
describe("Minnesota upfront lease-tax worksheet", () => {
  it("matches Revenue's published example without deducting cash down payments", () => {
    const result = calculateTax({ ...leaseFixture(), downPayment: "4000" });
    expect(result.baseCents).toBe(1151600); expect(result.taxCents).toBe(79173); expect(result.flags).toEqual([]);
    expect(result.input.reference).toBe("LEASE-1");
  });
  it("rounds individual local reporting lines and keeps rates separate", () => {
    const result = calculateTax({ ...leaseFixture(), contractTax: "964.47", localTaxes: [{ code: "City", rate: "0.5" }, { code: "County", rate: "1" }] });
    expect(result.lines.map(line => line.taxCents)).toEqual([79173, 5758, 11516]); expect(result.taxCents).toBe(96447); expect(result.flags).toEqual([]);
  });
  it("preserves unresolved eligibility, local rates and signed-tax reconciliation as review flags", () => {
    const result = calculateTax({ ...leaseFixture(), qualified: false, localConfirmed: false, contractTax: "1240.17" });
    expect(result.flags).toHaveLength(3);
    expect(calculateTax({ ...leaseFixture(), contractTax: "" }).flags).toHaveLength(1);
  });
  it("counts original lease tax once, excluding vehicle sales and voids", () => {
    const lease = calculateTax(leaseFixture()), sale = calculateTax({ ...leaseFixture(), kind: "SALE" });
    const summary = summarizeTax([{ id: "1", status: "ACTIVE", snapshot: lease }, { id: "2", status: "ACTIVE", snapshot: sale }, { id: "3", status: "VOID", snapshot: lease }]);
    expect(summary.totalCents).toBe(79173); expect(summary.leaseCount).toBe(1); expect(summary.saleCount).toBe(1);
    expect(sale.taxCents).toBe(0);
  });
  it("rejects invalid amounts, dates, rates and duplicate reporting codes", () => {
    for (const patch of [{ vehicleValue: "-1" }, { residual: "999999" }, { vehicleValue: "1.001" }, { date: "2026-02-30" }, { kind: "RENTAL" }, { reference: "" }, { localTaxes: [{ code: "City", rate: "NaN" }] }, { localTaxes: [{ code: "City", rate: "1" }, { code: "city", rate: "2" }] }]) expect(() => calculateTax({ ...leaseFixture(), ...patch })).toThrow();
    expect(() => taxMonth("2026-13")).toThrow(); expect(() => taxMonth("2026-01-01")).toThrow(); expect(taxMonth("2026-10")).toBe("2026-10");
  });
});
