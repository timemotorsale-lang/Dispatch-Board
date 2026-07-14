import { describe, expect, it } from "vitest";

import {
  evaluateHardRule,
  isPartTransitionAllowed,
  isVehicleTransitionAllowed
} from "@/server/inventory/domain";
import { calculateCriticalRatio, criticalRatioBand, evaluateLifecycleAge } from "@/server/inventory/lifecycle";

describe("inventory domain foundation", () => {
  it("enforces vehicle and parts lifecycle transitions", () => {
    expect(isVehicleTransitionAllowed("RECEIVED", "INSPECTION")).toBe(true);
    expect(isVehicleTransitionAllowed("RECEIVED", "SOLD")).toBe(false);
    expect(isPartTransitionAllowed("BINNED", "RESERVED_FOR_REPAIR_ORDER")).toBe(true);
    expect(isPartTransitionAllowed("BINNED", "INSTALLED")).toBe(false);
  });

  it("gives safety the highest hard-rule precedence", () => {
    expect(evaluateHardRule({ safetyStop: true, titleComplianceStop: true })).toBe("SAFETY_STOP");
  });

  it("measures lifecycle age, stage delay, and unexplained idle time", () => {
    const decision = evaluateLifecycleAge({
      blockerSeverity: 0.5,
      carryingCostExposure: 0.4,
      currentStage: "RECONDITIONING",
      downstreamRevenueImpact: 0.8,
      evaluatedAt: new Date("2026-07-13T20:00:00.000Z"),
      intervals: [
        { category: "ACTIVE", endAt: new Date("2026-07-13T10:00:00.000Z"), stage: "RECONDITIONING", startAt: new Date("2026-07-13T08:00:00.000Z") },
        { category: "WAITING", endAt: new Date("2026-07-13T14:00:00.000Z"), stage: "RECONDITIONING", startAt: new Date("2026-07-13T10:00:00.000Z") }
      ],
      lifecycleStartedAt: new Date("2026-07-12T08:00:00.000Z"),
      ownerId: "user-inventory",
      stageStartedAt: new Date("2026-07-13T08:00:00.000Z"),
      stageTargetHours: 8,
      subject: { id: "vehicle-1", type: "VEHICLE" }
    });

    expect(decision.result.totalAgeHours).toBe(36);
    expect(decision.result.stageDelayRatio).toBe(1.5);
    expect(decision.result.idleHours).toBe(30);
    expect(decision.reasonCodes).toContain("AGE_STAGE_TARGET_BREACHED");
    expect(decision.reasonCodes).toContain("AGE_UNEXPLAINED_IDLE_TIME");
  });

  it("classifies schedule risk using critical ratio", () => {
    expect(calculateCriticalRatio(4, 8)).toBe(0.5);
    expect(criticalRatioBand(0.5)).toBe("AT_RISK");
    expect(criticalRatioBand(1.1)).toBe("NO_BUFFER");
  });
});

