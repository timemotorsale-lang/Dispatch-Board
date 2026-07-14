import { describe, expect, it } from "vitest";

import {
  calculateReorderPolicy,
  classifyPartInventory,
  detectPartInventoryAnomalies,
  evaluateTransfer,
  rankPartAllocations,
  recommendOrderQuantity,
  scoreVendor
} from "@/server/inventory/parts-decisions";

describe("inventory repair-parts algorithms", () => {
  it("classifies financial importance and predictable demand", () => {
    const result = classifyPartInventory({
      annualConsumptionValue: 12_000,
      cumulativePortfolioValueShare: 0.7,
      demandHistory: [10, 11, 9, 10, 11, 10]
    });
    expect(result.classification).toBe("AX");
    expect(result.countFrequencyDays).toBe(30);
  });

  it("calculates safety stock and triggers reorder against available stock", () => {
    const result = calculateReorderPolicy({
      demandHistoryPerDay: [2, 3, 2, 4, 3, 2, 3],
      leadTimeDays: 5,
      leadTimeStandardDeviationDays: 1,
      onHand: 8,
      onOrder: 0,
      reserved: 3,
      serviceLevelFactor: 1.65
    });
    expect(result.safetyStock).toBeGreaterThan(0);
    expect(result.reorderPoint).toBeGreaterThan(10);
    expect(result.reorderNow).toBe(true);
  });

  it("constrains EOQ by pack size and available capacity", () => {
    const result = recommendOrderQuantity({
      annualDemand: 1_000,
      annualHoldingCostPerUnit: 4,
      availableCapacity: 40,
      currentAvailable: 4,
      minimumOrder: 6,
      orderCost: 25,
      packSize: 5,
      reorderPoint: 20
    });
    expect(result.recommendedQuantity).toBe(40);
    expect(result.constrained).toBe(true);
  });

  it("rejects non-approved vendors before scoring", () => {
    const result = scoreVendor({
      approved: false,
      availability: 1,
      correctPartAccuracy: 1,
      deliveryReliability: 1,
      fillRate: 1,
      historicalServiceQuality: 1,
      id: "vendor-1",
      paymentTerms: 1,
      returnConvenience: 1,
      totalLandedCostQuality: 1,
      warrantyPerformance: 1
    });
    expect(result.eligible).toBe(false);
    expect(result.score).toBe(0);
  });

  it("allocates scarce parts to the highest operational impact", () => {
    const ranked = rankPartAllocations([
      { approvedSubstitute: true, alternativesAvailable: 2, customerCommitment: 0.2, id: "routine", repairCriticalRatio: 1.5, reservationAgeHours: 2, revenueRelease: 0.3, safetyImpact: 0 },
      { approvedSubstitute: true, alternativesAvailable: 0, customerCommitment: 1, id: "delivery", repairCriticalRatio: 0.5, reservationAgeHours: 10, revenueRelease: 0.9, safetyImpact: 0.8 }
    ]);
    expect(ranked[0].id).toBe("delivery");
  });

  it("recommends beneficial transfers without exposing the source location", () => {
    expect(evaluateTransfer({ avoidedDelayCost: 500, avoidedPurchaseCost: 150, sourceLocationStockoutRisk: 50, transferCost: 40, transferTimeRisk: 30 }).recommendTransfer).toBe(true);
    expect(evaluateTransfer({ avoidedDelayCost: 50, avoidedPurchaseCost: 25, sourceLocationStockoutRisk: 200, transferCost: 40, transferTimeRisk: 30 }).recommendTransfer).toBe(false);
  });

  it("creates verification signals rather than misconduct conclusions", () => {
    const result = detectPartInventoryAnomalies({
      duplicateReceipt: false,
      invoiceQuantity: 3,
      issuedWithoutRepairOrder: true,
      manualAdjustmentsInPeriod: 4,
      onHand: -1,
      receivedQuantity: 2,
      reserved: 2
    });
    expect(result.requiresVerification).toBe(true);
    expect(result.reasonCodes).toContain("PART_NEGATIVE_ON_HAND");
    expect(result.reasonCodes).toContain("PART_ISSUE_WITHOUT_REPAIR_ORDER");
  });
});

