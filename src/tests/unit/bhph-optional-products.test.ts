import { describe, expect, it } from "vitest";
import { MN_BHPH_FEE_DEFAULTS, calculateBhphFinancing, bhphFinancingIssue, bhphWithoutOptionalPrincipal } from "@/lib/bhph-financing";
import { bhphPaymentSummary } from "@/lib/bhph-payment";
const facts = { ...MN_BHPH_FEE_DEFAULTS, saleDate: "2026-11-05", registrationFee: "100" };
const warranty = { ...facts, optionalWarrantySelected: "true", optionalWarrantyName: "Example extended repair coverage", optionalWarrantyPrice: "1500" };
describe("optional BHPH products", () => {
  it("does not charge unselected quote prices or infer customer selection", () => {
    expect(calculateBhphFinancing("10000", "1500", { ...facts, optionalWarrantyPrice: "invalid unused quote" }).amountFinanced).toBe(964550);
    expect(calculateBhphFinancing("10000", "1500", facts).optionalProducts.items).toEqual([]);
  });
  it("adds an optional extended warranty price without taxing it as a vehicle accessory", () => {
    const result = calculateBhphFinancing("10000", "1500", warranty);
    expect(result).toMatchObject({ amountFinanced: 1114550, taxable: 1000000, salesTax: 68750 });
    expect(bhphWithoutOptionalPrincipal("10000", "1500", warranty)).toBe(964550);
  });
  it("includes optional accessories in MVST exactly once", () => {
    const result = calculateBhphFinancing("10000", "1500", { ...warranty, optionalAccessorySelected: "true", optionalAccessoryName: "Equipment package", optionalAccessoryPrice: "100" });
    expect(result).toMatchObject({ taxable: 1010000, salesTax: 69438, amountFinanced: 1125238 });
  });
  it("uses a verified general/local tax rate for optional maintenance, separately from MVST", () => {
    const result = calculateBhphFinancing("10000", "1500", { ...facts, optionalOtherSelected: "true", optionalOtherName: "Scheduled maintenance", optionalOtherPrice: "250", optionalOtherTaxTreatment: "MAINTENANCE", optionalOtherTaxRate: "8.025", optionalOtherTaxReason: "Verified delivery-location rate" });
    expect(result).toMatchObject({ salesTax: 68750, amountFinanced: 991556, optionalProducts: { generalTaxCents: 2006 } });
  });
  it("requires product descriptions, prices and an explicit tax basis for other products", () => {
    expect(bhphFinancingIssue("10000", "1500", { ...warranty, optionalWarrantyName: "" })).toContain("Describe");
    expect(bhphFinancingIssue("10000", "1500", { ...warranty, optionalWarrantyPrice: "" })).toContain("price");
    expect(bhphFinancingIssue("10000", "1500", { ...facts, optionalOtherSelected: "true", optionalOtherName: "Other package", optionalOtherPrice: "100" })).toContain("tax treatment");
  });
  it("shows term and final-payment differences with and without options at a fixed payment", () => {
    const terms = { calculationMode: "PAYMENT_AMOUNT", apr: "0", paymentFrequency: "Monthly", termMonths: "24", paymentAmount: "500", firstPaymentDate: "2026-12-05" };
    const without = bhphPaymentSummary(1665653, terms, facts.saleDate), withProducts = bhphPaymentSummary(1815653, terms, facts.saleDate);
    expect(without.numberOfPayments).toBe(34); expect(withProducts.numberOfPayments).toBe(37);
    expect(without.regularPaymentCents).toBe(withProducts.regularPaymentCents);
    expect(without.totalPaymentsCents).toBe(1665653); expect(withProducts.totalPaymentsCents).toBe(1815653);
  });
});
