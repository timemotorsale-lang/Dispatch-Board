import { describe, expect, it } from "vitest";
import { calculateLeaseToOwn, leaseAgreementCalculationError, type LeaseToOwnCalculatorInput } from "@/lib/lease-to-own-form-packet";
const input: LeaseToOwnCalculatorInput = { agreedPriceCents: 2000000, additionalItemsCents: 0, capitalizedCostReductionCents: 300000, contractLength: 36, documentPreparationFeeCents: 30000, gpsCostCents: 0, multiplierBasisPoints: 20000, originationFeeCents: 0, otherRoadWorthyCostCents: 0, paymentFrequency: "Monthly", registrationFeeCents: 51600, salesTaxRateBasisPoints: 687.5, titleFeeCents: 10280, warrantyCostCents: 0, wholesaleCostCents: 1000000 };
describe("compact lease price and exact payments", () => {
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
});
