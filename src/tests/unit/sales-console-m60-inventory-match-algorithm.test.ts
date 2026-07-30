import { describe, expect, it } from "vitest";

import {
  recommendSalesInventoryMatches,
  scoreSalesInventoryMatch
} from "@/features/sales/sales-console-m60-inventory-match-algorithm";

describe("Sales Console M60 inventory match algorithm", () => {
  it("scores a strong available vehicle as a primary recommendation", () => {
    const result = scoreSalesInventoryMatch({
      stockNumber: "TMS22145",
      label: "2022 Toyota RAV4 XLE",
      price: 22900,
      customerBudget: 24000,
      bodyStyleFit: "strong",
      readiness: "ready",
      availability: "available",
      ageDays: 45,
      marketPressure: "high",
      grossPotential: "high",
      financeFit: "strong",
      customerPreference: "preferred",
      blockerCount: 0
    });

    expect(result.sellability).toBe("primary");
    expect(result.blockerExplanation).toContain("fits stated budget");
  });

  it("marks blocked or unavailable vehicles as blocked", () => {
    const result = scoreSalesInventoryMatch({
      stockNumber: "TMS20011",
      label: "2020 Chevy Malibu LT",
      price: 14900,
      customerBudget: 16000,
      bodyStyleFit: "okay",
      readiness: "blocked",
      availability: "unavailable",
      ageDays: 70,
      marketPressure: "low",
      grossPotential: "medium",
      financeFit: "okay",
      customerPreference: "acceptable",
      blockerCount: 2
    });

    expect(result.sellability).toBe("blocked");
    expect(result.blockerExplanation).toEqual(expect.arrayContaining(["2 blocker(s) require verification"]));
  });

  it("sorts recommendations by score", () => {
    const ranked = recommendSalesInventoryMatches([
      {
        stockNumber: "LOW",
        label: "Low fit",
        price: 30000,
        customerBudget: 18000,
        bodyStyleFit: "poor",
        readiness: "needs-work",
        availability: "verify-first",
        ageDays: 10,
        marketPressure: "low",
        grossPotential: "low",
        financeFit: "poor",
        customerPreference: "unknown",
        blockerCount: 1
      },
      {
        stockNumber: "HIGH",
        label: "High fit",
        price: 18000,
        customerBudget: 19000,
        bodyStyleFit: "strong",
        readiness: "ready",
        availability: "available",
        ageDays: 65,
        marketPressure: "high",
        grossPotential: "high",
        financeFit: "strong",
        customerPreference: "preferred",
        blockerCount: 0
      }
    ]);

    expect(ranked[0].stockNumber).toBe("HIGH");
  });
});
