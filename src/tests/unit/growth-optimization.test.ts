import { describe, expect, it } from "vitest";

import {
  buildGrowthOptimizationRecommendations,
  buildGrowthOptimizationReviewModel,
  rankGrowthOptimizationSignals
} from "@/server/growth/optimization";

describe("growth optimization", () => {
  it("ranks opportunities by readiness, value, response, and risk", () => {
    const ranked = rankGrowthOptimizationSignals([
      {
        conversionRate: 0.04,
        costCents: 90000,
        name: "Paid aged inventory",
        opportunityValueCents: 7000000,
        readinessScore: 60,
        responses: 2,
        suppressedCount: 12
      },
      {
        conversionRate: 0.2,
        costCents: 0,
        name: "Unsold quote recovery",
        opportunityValueCents: 4200000,
        readinessScore: 90,
        responses: 7,
        suppressedCount: 2
      }
    ]);

    expect(ranked[0].name).toBe("Unsold quote recovery");
  });

  it("turns optimization into explainable recommendations", () => {
    const recommendations = buildGrowthOptimizationRecommendations([
      {
        conversionRate: 0.1,
        costCents: 50000,
        name: "Aged inventory boost",
        opportunityValueCents: 6800000,
        readinessScore: 74,
        responses: 3,
        suppressedCount: 12
      }
    ]);

    expect(recommendations).toHaveLength(3);
    expect(recommendations[0].recommendedAction).toContain("Aged inventory boost");
    expect(recommendations[1].title).toBe("Clean the audience before scaling");
    expect(recommendations.every((recommendation) => recommendation.guardrail.length > 0)).toBe(true);
  });

  it("keeps the review model advisory only", () => {
    const model = buildGrowthOptimizationReviewModel();

    expect(model.summary).toContain("does not change budget");
    expect(model.generatedFrom).toContain("CRM");
    expect(model.nextAction).toContain("Review");
  });
});
