import { describe, expect, it } from "vitest";

import {
  evaluateFrontlineReadiness,
  evaluateReconSchedule,
  scoreReconPriority
} from "@/server/inventory/vehicle-operations";

const evaluatedAt = new Date("2026-07-13T16:00:00.000Z");

describe("inventory vehicle operations algorithms", () => {
  it("does not average away a missing critical readiness gate", () => {
    const decision = evaluateFrontlineReadiness({
      dimensions: [
        { code: "MECHANICAL", complete: true, critical: true, evidencePresent: true },
        { code: "TITLE", complete: false, critical: true, evidencePresent: false },
        { code: "PHOTOS", complete: true, critical: false, evidencePresent: true }
      ],
      evaluatedAt,
      vehicleId: "vehicle-1"
    });

    expect(decision.result.readinessPercent).toBe(67);
    expect(decision.result.ready).toBe(false);
    expect(decision.result.missingCritical).toEqual(["TITLE"]);
    expect(decision.managerReviewRequired).toBe(true);
  });

  it("prioritizes ready recon work with high revenue and delay pressure", () => {
    const decision = scoreReconPriority({
      bayAndSkillFit: 1,
      customerDeliveryCommitment: 0.8,
      downstreamBlockage: 0.9,
      evaluatedAt,
      lifecycleDelayPressure: 1,
      partsAvailability: 1,
      revenueReleasePotential: 0.9,
      vehicleId: "vehicle-2",
      workReadiness: 1
    });

    expect(decision.score).toBeGreaterThanOrEqual(85);
    expect(decision.result.recommendedAction).toBe("PRIORITIZE_NOW");
  });

  it("holds recon work that lacks an eligible bay or skill", () => {
    const decision = scoreReconPriority({
      bayAndSkillFit: 0,
      customerDeliveryCommitment: 1,
      downstreamBlockage: 1,
      evaluatedAt,
      lifecycleDelayPressure: 1,
      partsAvailability: 1,
      revenueReleasePotential: 1,
      vehicleId: "vehicle-3",
      workReadiness: 1
    });

    expect(decision.eligible).toBe(false);
    expect(decision.result.recommendedAction).toBe("HOLD_FOR_PREREQUISITE");
  });

  it("reports an at-risk recon schedule when work exceeds available time", () => {
    const result = evaluateReconSchedule({
      estimatedWorkRemainingHours: 8,
      now: evaluatedAt,
      requiredCompletionAt: new Date("2026-07-13T20:00:00.000Z")
    });
    expect(result.ratio).toBe(0.5);
    expect(result.band).toBe("AT_RISK");
  });
});

