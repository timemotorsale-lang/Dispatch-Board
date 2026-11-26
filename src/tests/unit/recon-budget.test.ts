import { describe, expect, it } from "vitest";

import { calculateReconCeiling, parseReconPlanningAmount, buildReconBudgetSummary, formatMoneyCents } from "@/lib/recon-budget";

describe("recon budget summary", () => {
  it("prefers TAI/appraisal data and calculates remaining recon spend", () => {
    const summary = buildReconBudgetSummary({
      acquisitionCase: {
        appraisalSnapshot: {
          estimatedReconCents: 300_000,
          expectedRetailCents: 2_100_000
        }
      },
      costEntries: [{ amountCents: 90_000, category: "RECON", status: "POSTED" }],
      estimateVersions: [{ totalCents: 120_000, authorizations: [{ authorizedAmountCents: 110_000, disposition: "ACCEPTED" }] }],
      vendorWorks: [{ approvedAmountCents: 40_000, supplementalAmountCents: 10_000 }]
    });

    expect(summary).toMatchObject({
      source: "TAI",
      estimatedReconBudgetCents: 300_000,
      expectedRetailCents: 2_100_000,
      committedSpendCents: 160_000,
      remainingBudgetCents: 140_000,
      status: "WITHIN_BUDGET"
    });
  });

  it("flags caution and over-budget states", () => {
    expect(buildReconBudgetSummary({
      acquisitionAppraisals: [{ estimatedReconCents: 100_000, estimatedRetailCents: 1_400_000 }],
      estimateVersions: [{ totalCents: 0, authorizations: [] }],
      vendorWorks: [{ approvedAmountCents: 90_000, supplementalAmountCents: 0 }]
    })?.status).toBe("CAUTION");

    expect(buildReconBudgetSummary({
      acquisitionAppraisals: [{ estimatedReconCents: 100_000, estimatedRetailCents: 1_400_000 }],
      estimateVersions: [{ totalCents: 0, authorizations: [] }],
      vendorWorks: [{ approvedAmountCents: 125_000, supplementalAmountCents: 0 }]
    })?.status).toBe("OVER_BUDGET");
  });

  it("formats money safely", () => {
    expect(formatMoneyCents(123_456)).toBe("$1,234.56");
    expect(formatMoneyCents(null)).toBe("Not set");
  });
});

it("uses market retail less landed cost, target gross, and a reserve", () => {
  expect(calculateReconCeiling({ retail: 1_800_000, landed: 1_350_000, gross: 250_000, reserve: 50_000 }))
    .toEqual({ ceilingCents: 150_000, shortfallCents: 0 });
  expect(calculateReconCeiling({ retail: 1_600_000, landed: 1_400_000, gross: 250_000, reserve: 0 }))
    .toEqual({ ceilingCents: 0, shortfallCents: 50_000 });
  expect(calculateReconCeiling({ retail: 1_600_000, landed: null, gross: 250_000, reserve: 0 })).toBeNull();
  expect(parseReconPlanningAmount("130.25")).toBe(13025);
  expect(parseReconPlanningAmount("")).toBeNull();
  expect(parseReconPlanningAmount("0")).toBe(0);
  expect(parseReconPlanningAmount("0.001")).toBeNull();
});
