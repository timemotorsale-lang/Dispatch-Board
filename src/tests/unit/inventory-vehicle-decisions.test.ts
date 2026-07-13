import { describe, expect, it } from "vitest";

import {
  calculateCarryingCost,
  calculateMaximumBid,
  evaluateAppraisalConfidence,
  evaluatePurchaseAuthorization,
  recommendAgingAction,
  scoreAcquisitionOpportunity,
  scoreDisposition,
  scoreMarketFit
} from "@/server/inventory/vehicle-decisions";

describe("inventory vehicle financial and market algorithms", () => {
  it("scores store and market fit while penalizing concentration", () => {
    expect(scoreMarketFit({ competitiveScarcity: 0.8, currentCategoryConcentration: 0.2, customerIntentEvidence: 0.9, historicalStorePerformance: 0.9, localDemand: 1, priceBandFit: 0.8 })).toBeGreaterThanOrEqual(85);
  });

  it("penalizes acquisition opportunities with recon and title risk", () => {
    const strong = scoreAcquisitionOpportunity({ appraisalConfidence: 1, capitalConcentrationRisk: 0, evaluatedAt: new Date(), expectedGrossQuality: 1, expectedTurnSpeed: 1, historicalStoreFit: 1, marketDemandFit: 1, merchandisingAppeal: 1, reconRisk: 0, strategicNeed: 1, titleHistoryRisk: 0, vehicleId: "v-1" });
    const risky = scoreAcquisitionOpportunity({ appraisalConfidence: 1, capitalConcentrationRisk: 1, evaluatedAt: new Date(), expectedGrossQuality: 1, expectedTurnSpeed: 1, historicalStoreFit: 1, marketDemandFit: 1, merchandisingAppeal: 1, reconRisk: 1, strategicNeed: 1, titleHistoryRisk: 1, vehicleId: "v-1" });
    expect(strong.score).toBe(100);
    expect(risky.score).toBeLessThan(strong.score ?? 0);
  });

  it("blocks max-bid output when appraisal evidence is insufficient", () => {
    const confidence = evaluateAppraisalConfidence({ comparableCount: 0, comparableRecency: 0, conditionEvidence: 0, historyTitleEvidence: 0, mileageVerified: false, reconEstimateQuality: 0, trimCertainty: 0.2, vinDecodeQuality: 0.5 });
    const bid = calculateMaximumBid({ acquisitionFees: 500, appraisalConfidence: confidence.confidence, expectedHoldingCost: 700, expectedReconCost: 1_500, expectedRetailProceeds: 15_000, otherAcquisitionCosts: 100, riskReserve: 1_000, sellingCosts: 600, targetGross: 3_000, titleAndMerchandisingCosts: 400, transportCost: 300 });
    expect(bid.eligible).toBe(false);
    expect(bid.recommendedMaximumBid).toBeNull();
  });

  it("calculates authorized maximum bid from retail proceeds backward", () => {
    const result = calculateMaximumBid({ acquisitionFees: 500, appraisalConfidence: "HIGH", expectedHoldingCost: 700, expectedReconCost: 1_500, expectedRetailProceeds: 15_000, otherAcquisitionCosts: 100, riskReserve: 1_000, sellingCosts: 600, targetGross: 3_000, titleAndMerchandisingCosts: 400, transportCost: 300 });
    expect(result.maximumAllInCost).toBe(7_800);
    expect(result.recommendedMaximumBid).toBe(6_900);
  });

  it("keeps purchase authorization as a hard boundary", () => {
    expect(evaluatePurchaseAuthorization({ authorized: false }).hardRuleCode).toBe("FINANCIAL_AUTHORIZATION_REQUIRED");
  });

  it("makes carrying cost and disposition pressure visible", () => {
    expect(calculateCarryingCost({ annualCapitalRate: 0.12, dailyInsuranceAndStorage: 5, daysHeld: 60, inventoryCapital: 10_000, opportunityCostPerDay: 3 }).total).toBeGreaterThan(650);
    expect(scoreDisposition({ carryingCostTrajectory: 1, customerIntentStrength: 0, expectedRetailGrossQuality: 0.2, expectedTimeToRetailSale: 1, locationFit: 0.2, reconOrTitleExposure: 0.8, wholesaleRecoveryQuality: 1 }).recommendation).toBe("DISPOSITION_REVIEW");
  });

  it("repairs merchandising before recommending a price response", () => {
    expect(recommendAgingAction({ carryingCostPressure: 1, comparableMovement: 0, frontlineAgeDays: 90, grossFloorProtected: true, leadAndVdpActivity: 0, marketPricePosition: 1, merchandisingComplete: false }).action).toBe("IMPROVE_MERCHANDISING");
  });
});

