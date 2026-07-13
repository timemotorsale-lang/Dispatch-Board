import { describe, expect, it } from "vitest";

import {
  evaluateDataConfidence,
  evaluateSlaAlert,
  evaluateTaskGeneration,
  rankOwnershipCandidates,
  scoreNextBestAction
} from "@/server/inventory/command-decisions";

describe("inventory shared command algorithms", () => {
  it("reduces confidence when authoritative facts contradict", () => {
    const result = evaluateDataConfidence({
      contradictions: ["VIN mismatch"],
      evidenceCoverage: 1,
      freshness: 1,
      identityCertainty: 1,
      requiredFieldsPresent: 1,
      sourceAuthority: 1
    });
    expect(result.score).toBe(85);
    expect(result.confidence).toBe("MEDIUM");
  });

  it("filters ineligible owners before workload ranking", () => {
    const ranked = rankOwnershipCandidates([
      { active: true, authorityEligible: true, capabilityFit: 0.7, conflictOfInterest: false, continuity: 1, deadlineFit: 1, id: "eligible", locationFit: 1, workloadCapacity: 0.8 },
      { active: true, authorityEligible: false, capabilityFit: 1, conflictOfInterest: false, continuity: 1, deadlineFit: 1, id: "unauthorized", locationFit: 1, workloadCapacity: 1 }
    ]);
    expect(ranked.map((entry) => entry.id)).toEqual(["eligible"]);
  });

  it("does not recommend non-ready actions despite a high potential score", () => {
    const decision = scoreNextBestAction({
      actionCode: "START_REPAIR",
      confidenceOfBenefit: 1,
      customerDeliveryImpact: 1,
      downstreamUnblocking: 1,
      effortEfficiency: 1,
      eligible: true,
      evaluatedAt: new Date("2026-07-13T12:00:00.000Z"),
      revenueOrCostRelease: 1,
      subject: { id: "vehicle-1", type: "VEHICLE" },
      urgency: 1,
      workReadiness: 0
    });
    expect(decision.eligible).toBe(false);
    expect(decision.reasonCodes).toContain("NBA_WORK_NOT_READY");
  });

  it("generates idempotent tasks only when all creation gates pass", () => {
    const base = {
      actionCode: "CONFIRM_PART_ETA",
      activeEquivalentTaskExists: false,
      completionEvidenceDefined: true,
      decisionId: "decision-1",
      lifecycleState: "PARTS_ORDERING",
      ownerOrClaimRouteValid: true,
      policyVersion: "policy-1",
      responseTargetDefined: true,
      subjectId: "work-1",
      actionable: true
    };
    const first = evaluateTaskGeneration(base);
    const second = evaluateTaskGeneration({ ...base, decisionId: "decision-2" });
    expect(first.create).toBe(true);
    expect(second.idempotencyKey).toBe(first.idempotencyKey);
    expect(evaluateTaskGeneration({ ...base, activeEquivalentTaskExists: true }).create).toBe(false);
  });

  it("suppresses duplicate alerts while escalating hard-critical conditions", () => {
    const now = new Date("2026-07-13T12:00:00.000Z");
    expect(evaluateSlaAlert({ acknowledged: false, conditionActive: true, conditionKey: "parts", cooldownMinutes: 60, hardCritical: false, lastAlertAt: new Date("2026-07-13T11:30:00.000Z"), now, ownerId: "owner", thresholdAt: new Date("2026-07-13T10:00:00.000Z") }).action).toBe("SUPPRESS_DUPLICATE");
    expect(evaluateSlaAlert({ acknowledged: false, conditionActive: true, conditionKey: "safety", cooldownMinutes: 60, hardCritical: true, lastAlertAt: null, now, ownerId: "owner", thresholdAt: new Date("2026-07-13T13:00:00.000Z") }).action).toBe("ESCALATE_IMMEDIATELY");
  });
});

