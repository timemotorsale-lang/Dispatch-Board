import { describe, expect, it } from "vitest";
import { calculateLeaseToOwn, isLegacyLeasePoa, leaseAgreementCalculationError, leaseCalculatorInputFromFields, type LeaseToOwnCalculatorInput } from "@/lib/lease-to-own-form-packet";
const input: LeaseToOwnCalculatorInput = { agreedPriceCents: 2000000, additionalItemsCents: 0, capitalizedCostReductionCents: 300000, contractLength: 36, documentPreparationFeeCents: 30000, gpsCostCents: 0, multiplierBasisPoints: 20000, originationFeeCents: 0, otherRoadWorthyCostCents: 0, paymentFrequency: "Monthly", registrationFeeCents: 51600, salesTaxRateBasisPoints: 687.5, titleFeeCents: 10280, warrantyCostCents: 0, wholesaleCostCents: 1000000 };
describe("compact lease price and exact payments", () => {
  it("distinguishes archived HTML title authority from the revised Limited POA PDF", () => {
    expect(isLegacyLeasePoa({ formId: "power-of-attorney", contentType: "text/html" })).toBe(true);
    expect(isLegacyLeasePoa({ formId: "power-of-attorney", contentType: "application/pdf" })).toBe(true);
    expect(isLegacyLeasePoa({ formId: "power-of-attorney", contentType: "application/pdf", contentBase64: "JVBERi0=" })).toBe(false);
    expect(isLegacyLeasePoa({ formId: "lease-summary", contentType: "text/html" })).toBe(false);
  });
  it("matches the existing half-price times two calculator without mutating the saved costs", () => {
    const before = structuredClone(input);
    expect(calculateLeaseToOwn(input)).toEqual(calculateLeaseToOwn({ ...input, agreedPriceCents: undefined }));
    expect(input).toEqual(before);
  });
  it("uses the full agreed price once, with a derived half-price base and no duplicated vehicle extras", () => {
    const output = calculateLeaseToOwn({ ...input, agreedPriceCents: 2999999, wholesaleCostCents: 500000, gpsCostCents: 20000, additionalItemsCents: 100000 });
    expect(output.subtotalCents).toBe(1500000); expect(output.grossCapitalizedCostCents).toBe(2999999); expect(output.grossCapitalizedCostTotalCents).toBe(2999999);
  });
  it.each([30000, 50000])("preserves the selected %s-cent payment under both signing modes", targetPaymentCents => {
    for (const signingPaymentMode of ["CAPITALIZED_REDUCTION", "DOWN_PAYMENT"] as const) {
      for (const paymentFrequency of ["Monthly", "Weekly", "BiWeekly"] as const) {
        const values = { ...input, calculationMode: "PAYMENT_AMOUNT" as const, targetPaymentCents, signingPaymentMode, downPaymentCents: 500000, paymentFrequency };
        const result = calculateLeaseToOwn(values);
        expect(result.basePeriodicPaymentCents).toBe(targetPaymentCents); expect(result.totalPeriodicPaymentCents).toBe(targetPaymentCents);
        expect(result.finalPeriodicPaymentCents).toBeGreaterThan(0); expect(result.finalPeriodicPaymentCents).toBeLessThanOrEqual(targetPaymentCents);
        expect((result.contractLength - 1) * targetPaymentCents + result.finalPeriodicPaymentCents).toBe(result.totalBasePeriodicPaymentsCents);
        expect(result.amountDueAtSigningCents + result.totalBasePeriodicPaymentsCents - result.firstPeriodicPaymentCents + result.renewalRegistrationCount * values.registrationFeeCents).toBe(result.totalOfPaymentsCents);
        if (signingPaymentMode === "DOWN_PAYMENT") expect(result.amountDueAtSigningCents).toBe(500000);
        expect(leaseAgreementCalculationError(values, result)).toBeNull();
      }
    }
  });
  it("does not overcollect when the only payment is a smaller final balance", () => {
    const result = calculateLeaseToOwn({ ...input, calculationMode: "PAYMENT_AMOUNT", targetPaymentCents: 5000000 });
    expect(result.contractLength).toBe(1); expect(result.firstPeriodicPaymentCents).toBe(result.finalPeriodicPaymentCents);
    expect(result.amountDueAtSigningCents).toBe(result.capitalizedCostReductionCents + result.costsTaxesFeesCents + result.totalBasePeriodicPaymentsCents);
  });
  it("adds upfront charges and a refundable deposit without changing monthly payments or cap cost", () => {
    const baseline = calculateLeaseToOwn(input);
    const result = calculateLeaseToOwn({ ...input, securityDepositCents: 25000, otherUpfrontChargesCents: 1500 });
    expect(result.amountDueAtSigningCents).toBe(baseline.amountDueAtSigningCents + 26500);
    expect(result.adjustedCapitalizedCostCents).toBe(baseline.adjustedCapitalizedCostCents);
    expect(result.totalPeriodicPaymentCents).toBe(baseline.totalPeriodicPaymentCents);
    expect(result.totalOfPaymentsCents).toBe(baseline.totalOfPaymentsCents + 1500);
  });
  it("retains the signing cash and monthly payment on a saved legacy cash-target deal", () => {
    const legacy = calculateLeaseToOwn(leaseCalculatorInputFromFields({ agreedPrice: "20000", signingPaymentMode: "DOWN_PAYMENT", downPayment: "5000", registrationFee: "516" }));
    expect(legacy.amountDueAtSigningCents).toBe(500000);
    expect(legacy.totalPeriodicPaymentCents).toBe(43302);
  });
});
