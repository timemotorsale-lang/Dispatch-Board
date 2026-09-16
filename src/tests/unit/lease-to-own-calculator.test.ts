import { describe, expect, it } from "vitest";

import { calculateLeaseToOwn, leaseRenewalRegistrationCount } from "@/lib/lease-to-own-form-packet";

describe("lease-to-own calculator", () => {
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

  it("derives capitalized cost reduction from down payment minus costs, taxes, and fees", () => {
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
    expect(output.capitalizedCostReductionCents).toBe(1644193);
    expect(output.amountDueAtSigningCents).toBe(1968064);
  });
});
