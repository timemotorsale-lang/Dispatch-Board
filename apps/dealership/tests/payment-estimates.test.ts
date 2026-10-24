import { describe, expect, it } from "vitest";
import { affordablePrice, estimatePayment, parseMoney } from "../../../packages/payment-estimates/engine";
import { paymentActivationStatus, proposedPaymentPolicy } from "../../../packages/payment-estimates/policy";

const example = { priceCents: 2_000_000, downPaymentCents: 250_000, termMonths: 36, additionalFeesCents: 20_000, additionalFeesConfirmed: true, standardScenarioConfirmed: true };

describe("private estimate-only payment engine", () => {
  it("preserves the exact business choices without inventing an APR or public approval", () => {
    expect(proposedPaymentPolicy.terms).toEqual([24, 36, 48, 66, 72]);
    expect(proposedPaymentPolicy.annualInterestBasisPoints).toBe(800);
    expect(proposedPaymentPolicy.documentationFeeCents).toBe(35000);
    expect(paymentActivationStatus()).toMatchObject({ enabled: false });
    expect(paymentActivationStatus().reasons.join(" ")).toMatch(/Owner approval/);
    expect(paymentActivationStatus().reasons.join(" ")).toMatch(/finance manager approval/);
  });
  it("taxes vehicle price only and finances charges after the upfront down payment", () => {
    const result = estimatePayment(proposedPaymentPolicy, example);
    expect(result.salesTaxCents).toBe(137500);
    expect(result.documentationFeeCents).toBe(35000);
    expect(result.baseFeesCents).toBe(3600);
    expect(result.lienFeeCents).toBe(200);
    expect(result.purchaseTotalCents).toBe(2196300);
    expect(result.amountFinancedCents).toBe(1946300);
    expect(result.totalPaymentsCents).toBe(result.amountFinancedCents + result.totalInterestCents);
    expect(result.totalCostCents).toBe(example.downPaymentCents + result.totalPaymentsCents);
    expect(result.finalPaymentCents).toBeLessThanOrEqual(result.monthlyPaymentCents);
  });
  it("matches a fixed-rate reference calculation and handles zero interest", () => {
    const bare = { ...proposedPaymentPolicy, salesTaxPartsPerMillion: 0, documentationFeeCents: 0, baseFees: [], lienFeeCents: 0 };
    expect(estimatePayment(bare, { ...example, priceCents: 1_000_000, downPaymentCents: 0, additionalFeesCents: 0 }).monthlyPaymentCents).toBe(31337);
    const zero = estimatePayment({ ...bare, annualInterestBasisPoints: 0 }, { ...example, priceCents: 1_000_000, downPaymentCents: 0, additionalFeesCents: 0 });
    expect(zero.monthlyPaymentCents).toBe(27778);
    expect(zero.totalPaymentsCents).toBe(1_000_000);
    expect(zero.totalInterestCents).toBe(0);
  });
  it("enforces the documentation fee cap, including sub-cent percentage boundaries", () => {
    expect(estimatePayment(proposedPaymentPolicy, { ...example, priceCents: 100001, downPaymentCents: 0 }).documentationFeeCents).toBe(10000);
    expect(estimatePayment({ ...proposedPaymentPolicy, documentationFeeCents: 50000 }, example).documentationFeeCents).toBe(35000);
  });
  it("requires explicit knowledge of variable fees and scenario applicability", () => {
    expect(() => estimatePayment(proposedPaymentPolicy, { ...example, additionalFeesCents: null })).toThrow("Unknown fees");
    expect(() => estimatePayment(proposedPaymentPolicy, { ...example, additionalFeesConfirmed: false })).toThrow("Unknown fees");
    expect(() => estimatePayment(proposedPaymentPolicy, { ...example, standardScenarioConfirmed: false })).toThrow("standard Minnesota");
    expect(estimatePayment(proposedPaymentPolicy, { ...example, additionalFeesCents: 0 }).additionalFeesCents).toBe(0);
  });
  it.each([NaN, Infinity, -1, 1.5, 100_000_001])("rejects malformed monetary input %s", priceCents => {
    expect(() => estimatePayment(proposedPaymentPolicy, { ...example, priceCents })).toThrow();
  });
  it("rejects unavailable terms, invalid policies and overpayments", () => {
    expect(() => estimatePayment(proposedPaymentPolicy, { ...example, termMonths: 60 })).toThrow("loan term");
    expect(() => estimatePayment({ ...proposedPaymentPolicy, annualInterestBasisPoints: -1 }, example)).toThrow("policy");
    expect(() => estimatePayment(proposedPaymentPolicy, { ...example, downPaymentCents: 9_000_000 })).toThrow("Down payment exceeds");
  });
  it("handles full payment without adding a loan lien or interest", () => {
    const base = estimatePayment(proposedPaymentPolicy, example);
    const paid = estimatePayment(proposedPaymentPolicy, { ...example, downPaymentCents: base.purchaseTotalCents - base.lienFeeCents });
    expect(paid.amountFinancedCents).toBe(0);
    expect(paid.monthlyPaymentCents).toBe(0);
    expect(paid.lienFeeCents).toBe(0);
    expect(paid.paymentCount).toBe(0);
  });
  it.each([24, 36, 48, 66, 72])("finds the maximum affordable price at %s months", termMonths => {
    const result = affordablePrice(proposedPaymentPolicy, { ...example, termMonths, budgetCents: 40_000 });
    expect(result).not.toBeNull();
    expect(result!.monthlyPaymentCents).toBeLessThanOrEqual(40_000);
    expect(result!.finalPaymentCents).toBeLessThanOrEqual(40_000);
    const next = estimatePayment(proposedPaymentPolicy, { ...example, termMonths, priceCents: result!.priceCents + 1 });
    expect(Math.max(next.monthlyPaymentCents, next.finalPaymentCents)).toBeGreaterThan(40_000);
  });
  it("has monotonic budget choices and keeps charges out of the taxable base", () => {
    const first = affordablePrice(proposedPaymentPolicy, { ...example, budgetCents: 40000 })!;
    const higher = affordablePrice(proposedPaymentPolicy, { ...example, budgetCents: 50000 })!;
    const fees = affordablePrice(proposedPaymentPolicy, { ...example, budgetCents: 40000, additionalFeesCents: 100000 })!;
    expect(higher.priceCents).toBeGreaterThan(first.priceCents);
    expect(fees.priceCents).toBeLessThan(first.priceCents);
  });
  it("parses dollars exactly and never treats blanks as zero", () => {
    expect(parseMoney("0", "down payment")).toBe(0);
    expect(parseMoney("123.45", "price")).toBe(12345);
    for (const input of ["", "-1", "1e4", "1.234", "NaN", "1,000"]) expect(() => parseMoney(input, "price")).toThrow();
  });
});
