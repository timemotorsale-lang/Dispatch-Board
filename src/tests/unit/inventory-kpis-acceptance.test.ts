import { describe, expect, it } from "vitest";

import {
  calculateCommandKpis,
  calculatePartKpis,
  calculateVehicleKpis,
  evaluateCalibrationGate,
  evaluateInventoryFoundationAcceptance,
  rankReconAssignments,
  scoreReceivingPriority
} from "@/server/inventory";

describe("inventory KPI and rollout acceptance foundation", () => {
  it("calculates vehicle lifecycle productivity KPIs", () => {
    const kpis = calculateVehicleKpis([
      { activeHours: 20, daysHeld: 10, daysToFrontline: 3, delivered: true, gross: 2_000, idleHours: 4, reconActualCost: 1_100, reconEstimatedCost: 1_000, sold: true, waitingHours: 6 },
      { activeHours: 16, daysHeld: 20, daysToFrontline: 5, delivered: false, gross: 3_000, idleHours: 8, reconActualCost: 900, reconEstimatedCost: 1_000, sold: true, waitingHours: 8 }
    ]);
    expect(kpis.averageDaysToFrontline).toBe(4);
    expect(kpis.deliveryCompletionRate).toBe(0.5);
    expect(kpis.averageGrossPerDay).toBe(175);
  });

  it("calculates parts control KPIs without dividing by zero", () => {
    const empty = calculatePartKpis([]);
    expect(empty.fillRate).toBe(0);
    const kpis = calculatePartKpis([{ demandQuantity: 10, emergencyOrder: false, filledQuantity: 9, inventoryAccurate: true, obsoleteValue: 50, orderedOnTime: true, partCorrectFirstTime: true, recoverableCredit: 100, recoveredCredit: 80, stockout: false }]);
    expect(kpis.fillRate).toBe(0.9);
    expect(kpis.creditRecoveryRate).toBe(0.8);
  });

  it("measures command quality and calibration readiness", () => {
    const kpis = calculateCommandKpis([{ accepted: true, alertUseful: true, blockerResolutionHours: 3, duplicateTask: false, expectedCompletionErrorHours: -2, missingData: false, overridden: false, unownedException: false }]);
    expect(kpis.acceptanceRate).toBe(1);
    expect(kpis.averageCompletionErrorHours).toBe(2);
    expect(evaluateCalibrationGate({ minimumOutcomeCount: 100, observedOutcomeCount: 20, overrideRate: 0.1, recommendationErrorRate: 0.1, safetyViolationCount: 0 }).eligibleForWeightReview).toBe(false);
  });

  it("requires every registered algorithm to meet the acceptance contract", () => {
    const result = evaluateInventoryFoundationAcceptance();
    expect(result.ready).toBe(true);
    expect(result.results.every((entry) => entry.failures.length === 0)).toBe(true);
  });

  it("filters bay and authority incompatibility before recon assignment", () => {
    const ranked = rankReconAssignments([
      { active: true, authorityEligible: false, bayCompatible: true, continuity: 1, id: "unauthorized", locationFit: 1, skillFit: 1, workloadCapacity: 1 },
      { active: true, authorityEligible: true, bayCompatible: true, continuity: 0.8, id: "eligible", locationFit: 1, skillFit: 1, workloadCapacity: 0.8 }
    ]);
    expect(ranked.map((entry) => entry.id)).toEqual(["eligible"]);
  });

  it("prioritizes receiving that releases safety and customer work", () => {
    expect(scoreReceivingPriority({ activeReservation: true, customerDeliveryImpact: 1, overdueRepairImpact: 1, safetyImpact: 1 })).toBe(100);
  });
});

