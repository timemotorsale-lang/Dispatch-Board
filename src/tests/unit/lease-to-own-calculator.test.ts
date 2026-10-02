import { describe, expect, it } from "vitest";

import { calculateLeaseToOwn, leaseAgreementCalculationError, leaseNextPaymentDate, leaseRenewalRegistrationCount } from "@/lib/lease-to-own-form-packet";

describe("lease-to-own calculator", () => {
  const paymentInput = {
    calculationMode: "PAYMENT_AMOUNT" as const, targetPaymentCents: 25000,
    additionalItemsCents: 0, capitalizedCostReductionCents: 1619193,
    contractLength: 36, documentPreparationFeeCents: 37500, gpsCostCents: 0,
    multiplierBasisPoints: 20000, originationFeeCents: 0, otherRoadWorthyCostCents: 0,
    paymentFrequency: "Monthly" as const, registrationFeeCents: 51600,
    salesTaxRateBasisPoints: 650, titleFeeCents: 10280, warrantyCostCents: 0,
    wholesaleCostCents: 1900000
  };

  it.each(["Monthly", "Weekly", "BiWeekly"] as const)("solves a whole term from the target for %s payments without changing the formula", (paymentFrequency) => {
    const input = { ...paymentInput, paymentFrequency };
    const output = calculateLeaseToOwn(input);
    expect(output.contractLength).toBe(72);
    expect(output.totalPeriodicPaymentCents).toBe(24958);
    expect(output.finalPeriodicPaymentCents).toBe(24989);
    expect(output.totalPeriodicPaymentCents).toBeLessThanOrEqual(input.targetPaymentCents);
    expect(output).toEqual(calculateLeaseToOwn({ ...input, calculationMode: "TERM", contractLength: 72 }));
    expect(leaseAgreementCalculationError(input, output)).toBeNull();
  });

  it("solves the term with total signing cash including the first payment", () => {
    const input = { ...paymentInput, signingPaymentMode: "DOWN_PAYMENT" as const, downPaymentCents: 1968064 };
    const output = calculateLeaseToOwn(input);
    expect(output.contractLength).toBe(72);
    expect(output.capitalizedCostReductionCents).toBe(1619235);
    expect(output.amountDueAtSigningCents).toBe(1968064);
    expect(output).toEqual(calculateLeaseToOwn({ ...input, calculationMode: "TERM", contractLength: 72 }));
    expect(leaseAgreementCalculationError(input, output)).toBeNull();
  });

  it("lengthens the term when signing cash cannot cover the target first payment", () => {
    const input = { ...paymentInput, targetPaymentCents: 50000, signingPaymentMode: "DOWN_PAYMENT" as const, downPaymentCents: 343871 };
    const output = calculateLeaseToOwn(input);
    expect(output.totalPeriodicPaymentCents).toBeLessThanOrEqual(20000);
    expect(output.signingShortfallCents).toBeLessThanOrEqual(1);
    expect(leaseAgreementCalculationError(input, output)).toBeNull();
  });

  it.each([0, -100, NaN, Infinity, 0.5])("rejects invalid target payment %s", (targetPaymentCents) => {
    expect(leaseAgreementCalculationError({ ...paymentInput, targetPaymentCents })).toContain("positive target");
  });

  it("rejects insufficient signing cash and allows a single-payment term when affordable", () => {
    expect(leaseAgreementCalculationError({ ...paymentInput, signingPaymentMode: "DOWN_PAYMENT", downPaymentCents: 100 })).toContain("signing cash");
    const input = { ...paymentInput, targetPaymentCents: 2000000 };
    expect(calculateLeaseToOwn(input).contractLength).toBe(1);
    expect(leaseAgreementCalculationError(input)).toBeNull();
  });

  it("ignores inactive mode inputs when validating the active calculation", () => {
    expect(leaseAgreementCalculationError({ ...paymentInput, contractLength: -1 })).toBeNull();
    expect(leaseAgreementCalculationError({ ...paymentInput, calculationMode: "TERM", targetPaymentCents: -1 })).toBeNull();
  });

  it("recreates the dealership calculator totals from the uploaded W2 workbook structure", () => {
    const output = calculateLeaseToOwn({
      additionalItemsCents: 0,
      capitalizedCostReductionCents: 1619193,
      contractLength: 71.88,
      documentPreparationFeeCents: 37500,
      gpsCostCents: 0,
      multiplierBasisPoints: 20000,
      originationFeeCents: 0,
      otherRoadWorthyCostCents: 0,
      paymentFrequency: "Monthly",
      registrationFeeCents: 51600,
      salesTaxRateBasisPoints: 650,
      titleFeeCents: 10280,
      warrantyCostCents: 0,
      wholesaleCostCents: 1900000
    });

    expect(output.grossCapitalizedCostCents).toBe(3800000);
    expect(output.residualValueCents).toBe(383800);
    expect(output.totalBasePeriodicPaymentsCents).toBe(1797007);
    expect(output.totalPeriodicPaymentCents).toBe(25000);
    expect(output.applicableTaxesCents).toBe(224491);
    expect(output.amountDueAtSigningCents).toBe(1968064);
    expect(output.estimatedFeesAndTaxesOverTermCents).toBe(544371);
    expect(output.totalOfPaymentsCents).toBe(3998071);
    expect(output.dealerGrossProfitCents).toBe(1937500);
  });

  it("counts registration renewals by payment frequency thresholds", () => {
    expect(leaseRenewalRegistrationCount("Weekly", 157)).toBe(3);
    expect(leaseRenewalRegistrationCount("BiWeekly", 52)).toBe(1);
    expect(leaseRenewalRegistrationCount("Monthly", 72)).toBe(5);
  });

  it("deducts fees, taxes, and the first periodic payment from signing cash", () => {
    const output = calculateLeaseToOwn({
      additionalItemsCents: 0,
      capitalizedCostReductionCents: 0,
      contractLength: 71.88,
      documentPreparationFeeCents: 37500,
      downPaymentCents: 1968064,
      gpsCostCents: 0,
      multiplierBasisPoints: 20000,
      originationFeeCents: 0,
      otherRoadWorthyCostCents: 0,
      paymentFrequency: "Monthly",
      registrationFeeCents: 51600,
      salesTaxRateBasisPoints: 650,
      titleFeeCents: 10280,
      warrantyCostCents: 0,
      wholesaleCostCents: 1900000
    });

    expect(output.costsTaxesFeesCents).toBe(323871);
    expect(output.capitalizedCostReductionCents).toBe(1619193);
    expect(output.amountDueAtSigningCents).toBe(1968064);
    expect(output.signingShortfallCents).toBe(0);
  });

  it("reconciles rounded payments, added items, and signing cash without double counting", () => {
    const input = {
      additionalItemsCents: 125000, capitalizedCostReductionCents: 100000,
      contractLength: 36, documentPreparationFeeCents: 37500, gpsCostCents: 10000,
      multiplierBasisPoints: 20000, originationFeeCents: 50000, otherRoadWorthyCostCents: 20000,
      paymentFrequency: "Monthly" as const, registrationFeeCents: 51600,
      salesTaxRateBasisPoints: 687.5, titleFeeCents: 10280, warrantyCostCents: 30000,
      wholesaleCostCents: 1200000
    };
    const output = calculateLeaseToOwn(input);
    expect(output.totalPeriodicPaymentCents * 35 + output.finalPeriodicPaymentCents).toBe(output.totalBasePeriodicPaymentsCents);
    expect(output.amountDueAtSigningCents + output.totalOfAllPeriodicPaymentsCents - output.totalPeriodicPaymentCents + output.renewalRegistrationCount * input.registrationFeeCents).toBe(output.totalOfPaymentsCents);
    expect(output.dealerGrossProfitCents).toBe(output.grossCapitalizedCostTotalCents + input.documentPreparationFeeCents + input.originationFeeCents - output.subtotalCents);
    expect(output.applicableTaxesCents).toBe(Math.round((37500 + 50000 + output.grossCapitalizedCostTotalCents - output.residualValueCents) * 0.06875));
    expect(leaseAgreementCalculationError(input, output)).toBeNull();
    expect(leaseAgreementCalculationError({ ...input, contractLength: 71.88 })).toContain("whole number");
    expect(leaseAgreementCalculationError({ ...input, signingPaymentMode: "DOWN_PAYMENT", downPaymentCents: 0 })).toContain("cover fees");
    expect(leaseNextPaymentDate("2026-01-31", "Monthly")).toBe("2026-02-28");
    expect(leaseNextPaymentDate("2026-01-31", "BiWeekly")).toBe("2026-02-14");
  });
});
