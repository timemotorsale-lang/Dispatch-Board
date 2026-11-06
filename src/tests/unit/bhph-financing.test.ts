import { describe, expect, it } from "vitest";
import { MN_BHPH_FEE_DEFAULTS, calculateBhphFinancing, bhphFinancingIssue, bhphFinancingFacts } from "@/lib/bhph-financing";
const facts = { ...MN_BHPH_FEE_DEFAULTS, saleDate: "2026-11-04", registrationFee: "100.00" };
describe("Minnesota BHPH itemized financing", () => {
  it("names malformed registration values and accepts a normal currency entry after correction", () => {
    expect(bhphFinancingIssue("28895", "15000", { ...facts, registrationFee: "$417.00/0" })).toContain("Registration fee / tax: enter one amount");
    expect(bhphFinancingIssue("28895", "15000", { ...facts, registrationFee: "$417.00" })).toBeNull();
    expect(calculateBhphFinancing("28895", "15000", { ...facts, registrationFee: "$417.00" }).amountFinanced).toBe(1665653);
  });
  it("includes MVST, the $300 document fee, statutory transfer items and editable registration", () => {
    expect(bhphFinancingIssue("13895", "0", facts)).toBeNull();
    expect(calculateBhphFinancing("13895", "0", facts)).toMatchObject({ taxable: 1389500, salesTax: 95528, exciseTax: 2000, feeTotal: 43800, amountFinanced: 1530828, fees: { docFee: 30000, registrationFee: 10000, titleFee: 825, transferFee: 1000, filingFee: 1200, technologyFee: 225, publicSafetyFee: 350, lienFee: 200 } });
    expect(calculateBhphFinancing("13895", "0", { ...facts, registrationFee: "225" }).amountFinanced).toBe(1543328);
  });
  it("does not tax document/registration fees or reduce taxable price by down payment", () => {
    const first = calculateBhphFinancing("10000", "0", facts), second = calculateBhphFinancing("10000", "2000", { ...facts, registrationFee: "500" });
    expect(first.salesTax).toBe(68750); expect(second.salesTax).toBe(first.salesTax);
    expect(second.amountFinanced).toBe(first.amountFinanced + 40000 - 200000);
  });
  it("taxes accessories, deducts eligible rebate and trade, and adds payoff once", () => {
    const adjusted = { ...facts, rebate: "500", tradeAllowance: "2000", tradeVin: "1NXBR32E85Z123456", tradePayoff: "1000" };
    expect(bhphFinancingIssue("10000", "2000", adjusted)).toBeNull();
    expect(calculateBhphFinancing("10000", "2000", adjusted)).toMatchObject({ taxable: 750000, salesTax: 51563, amountFinanced: 747363 });
    expect(calculateBhphFinancing("10000", "0", { ...facts, accessories: "100" }).salesTax).toBe(69438);
  });
  it.each([["2026-11-04", "350", null], ["2026-11-04", "350.01", "limit"], ["2024-11-04", "300", "limit"], ["2023-11-04", "201", "limit"]])("enforces the documentary fee schedule on %s", (saleDate, docFee, error) => {
    const issue = bhphFinancingIssue("10000", "0", { ...facts, saleDate, docFee });
    if (error) expect(issue).toContain(error); else expect(issue).toBeNull();
  });
  it("enforces the 10% sale-value cap rather than silently reducing the entered fee", () => {
    expect(bhphFinancingIssue("2000", "0", facts)).toContain("$200.00");
    expect(bhphFinancingIssue("2000", "0", { ...facts, docFee: "200" })).toBeNull();
  });
  it("requires actual registration input and retains explicit zero", () => {
    expect(bhphFinancingIssue("10000", "0", { ...facts, registrationFee: "" })).toContain("registration");
    expect(bhphFinancingIssue("10000", "0", { ...facts, registrationFee: "0" })).toBeNull();
  });
  it("does not invent missing server-side fee values", () => {
    const normalized = bhphFinancingFacts({ ...facts, docFee: undefined });
    expect(normalized.docFee).toBe(""); expect(bhphFinancingIssue("10000", "0", normalized)).toContain("documentation fee");
    expect(() => bhphFinancingFacts(null)).toThrow("itemized Minnesota");
  });
  it.each(["-1", "12.345", "NaN", "Infinity", "1000000000000000000000"])("rejects invalid monetary input %s", registrationFee => {
    expect(bhphFinancingIssue("10000", "0", { ...facts, registrationFee })).not.toBeNull();
  });
  it("requires a verified amount and basis for special tax treatment", () => {
    expect(bhphFinancingIssue("10000", "0", { ...facts, taxTreatment: "EXEMPT_OR_SPECIAL" })).toContain("verified");
    expect(bhphFinancingIssue("10000", "0", { ...facts, taxTreatment: "EXEMPT_OR_SPECIAL", taxOverride: "0", taxReason: "Recorded verified exemption" })).toBeNull();
    expect(calculateBhphFinancing("10000", "0", { ...facts, taxOverride: "9999" }).salesTax).toBe(68750);
  });
  it("does not add ordinary local sales tax and records why excise is not due", () => {
    expect(calculateBhphFinancing("10000", "0", facts).exciseTax).toBe(2000);
    expect(bhphFinancingIssue("10000", "0", { ...facts, exciseTreatment: "NONE" })).toContain("local vehicle excise");
    expect(bhphFinancingIssue("10000", "0", { ...facts, exciseTreatment: "NONE", exciseReason: "Delivered in a non-applicable jurisdiction" })).toBeNull();
  });
  it("rejects overpayment, unsupported trade allowance, missing other-fee descriptions and bad dates", () => {
    expect(bhphFinancingIssue("10000", "20000", facts)).toContain("Down payment");
    expect(bhphFinancingIssue("10000", "0", { ...facts, tradeAllowance: "1000" })).toContain("trade-in VIN");
    expect(bhphFinancingIssue("10000", "0", { ...facts, otherFee: "100" })).toContain("Describe");
    expect(bhphFinancingIssue("10000", "0", { ...facts, saleDate: "2026-02-30" })).toContain("sale date");
  });
});
