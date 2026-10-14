import { describe, expect, it } from "vitest";

import { buildReconBudgetSummary, formatMoneyCents } from "@/lib/recon-budget";

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
