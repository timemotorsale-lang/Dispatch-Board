import type {
  InventoryDecision,
  InventoryLifecycleStage,
  InventoryRiskFlags,
  InventorySubjectType
} from "./domain";
import { evaluateHardRule } from "./domain";
import { clamp, hoursBetween, normalize, score100, stableFingerprint, weightedScore } from "./math";

export type LifecycleInterval = {
  category: "ACTIVE" | "WAITING" | "IDLE";
  endAt: Date;
  reasonCode?: string;
  stage: InventoryLifecycleStage;
  startAt: Date;
};

export type LifecycleAgeInput = {
  carryingCostExposure: number;
  currentStage: InventoryLifecycleStage;
  evaluatedAt: Date;
  intervals: LifecycleInterval[];
  lifecycleStartedAt: Date;
  ownerId: string | null;
  riskFlags?: InventoryRiskFlags;
  stageStartedAt: Date;
  stageTargetHours: number;
  subject: { id: string; type: InventorySubjectType };
  blockerSeverity: number;
  downstreamRevenueImpact: number;
};

export type LifecycleDelayBand = "HEALTHY" | "WATCH" | "AT_RISK" | "CRITICAL" | "DISPOSITION_REVIEW";

function delayBand(score: number): LifecycleDelayBand {
  if (score >= 85) return "DISPOSITION_REVIEW";
  if (score >= 65) return "CRITICAL";
  if (score >= 45) return "AT_RISK";
  if (score >= 25) return "WATCH";
  return "HEALTHY";
}

export function evaluateLifecycleAge(input: LifecycleAgeInput): InventoryDecision<{
  activeHours: number;
  band: LifecycleDelayBand;
  idleHours: number;
  longestDelayStage: InventoryLifecycleStage;
  stageAgeHours: number;
  stageDelayRatio: number;
  totalAgeHours: number;
  waitingHours: number;
}> {
  const totalAgeHours = hoursBetween(input.lifecycleStartedAt, input.evaluatedAt);
  const stageAgeHours = hoursBetween(input.stageStartedAt, input.evaluatedAt);
  const activeHours = input.intervals.filter((entry) => entry.category === "ACTIVE").reduce((sum, entry) => sum + hoursBetween(entry.startAt, entry.endAt), 0);
  const waitingHours = input.intervals.filter((entry) => entry.category === "WAITING").reduce((sum, entry) => sum + hoursBetween(entry.startAt, entry.endAt), 0);
  const recordedIdleHours = input.intervals.filter((entry) => entry.category === "IDLE").reduce((sum, entry) => sum + hoursBetween(entry.startAt, entry.endAt), 0);
  const idleHours = Math.max(recordedIdleHours, totalAgeHours - activeHours - waitingHours);
  const stageDelayRatio = input.stageTargetHours > 0 ? stageAgeHours / input.stageTargetHours : stageAgeHours > 0 ? Number.POSITIVE_INFINITY : 0;
  const ownershipOrUpdateRisk = input.ownerId ? normalize(idleHours, 0, Math.max(8, input.stageTargetHours)) : 1;
  const rawScore = weightedScore([
    { value: normalize(stageDelayRatio, 0.75, 2.5), weight: 30 },
    { value: clamp(input.carryingCostExposure, 0, 1), weight: 25 },
    { value: clamp(input.downstreamRevenueImpact, 0, 1), weight: 20 },
    { value: clamp(input.blockerSeverity, 0, 1), weight: 15 },
    { value: ownershipOrUpdateRisk, weight: 10 }
  ]);
  const hardRuleCode = evaluateHardRule({ ...input.riskFlags, criticalWorkHasNoOwner: input.riskFlags?.criticalWorkHasNoOwner || (!input.ownerId && rawScore >= 65) });
  const score = hardRuleCode ? Math.max(rawScore, 65) : rawScore;
  const reasonCodes: string[] = [];
  if (stageDelayRatio > 1) reasonCodes.push("AGE_STAGE_TARGET_BREACHED");
  if (idleHours > Math.max(4, input.stageTargetHours * 0.25)) reasonCodes.push("AGE_UNEXPLAINED_IDLE_TIME");
  if (waitingHours > input.stageTargetHours) reasonCodes.push("AGE_WAIT_TIME_EXCESSIVE");
  if (!input.ownerId) reasonCodes.push("OWNER_MISSING");
  if (hardRuleCode) reasonCodes.unshift(`HARD_${hardRuleCode}`);
  if (reasonCodes.length === 0) reasonCodes.push("AGE_WITHIN_TARGET");

  const stageDurations = new Map<InventoryLifecycleStage, number>();
  for (const interval of input.intervals) {
    stageDurations.set(interval.stage, (stageDurations.get(interval.stage) ?? 0) + hoursBetween(interval.startAt, interval.endAt));
  }
  const longestDelayStage = [...stageDurations.entries()].sort((left, right) => right[1] - left[1])[0]?.[0] ?? input.currentStage;
  const band = hardRuleCode ? "CRITICAL" : delayBand(score);

  return {
    algorithmVersion: "inventory-lifecycle-age/1.0.0",
    confidence: input.stageTargetHours > 0 && input.intervals.length > 0 ? "HIGH" : "LOW",
    decisionType: "INVENTORY_LIFECYCLE_AGE",
    eligible: true,
    evaluatedAt: input.evaluatedAt,
    explanation: `${input.currentStage} has been active for ${stageAgeHours.toFixed(1)} hours against a ${input.stageTargetHours.toFixed(1)} hour target. ${idleHours.toFixed(1)} hours are idle.`,
    hardRuleCode,
    inputFingerprint: stableFingerprint(input),
    managerReviewRequired: Boolean(hardRuleCode) || score >= 65,
    missingInputs: input.stageTargetHours > 0 ? [] : ["stageTargetHours"],
    priority: hardRuleCode || score >= 65 ? "CRITICAL" : score >= 45 ? "HIGH" : "NORMAL",
    reasonCodes,
    result: { activeHours, band, idleHours, longestDelayStage, stageAgeHours, stageDelayRatio, totalAgeHours, waitingHours },
    score: score100(score),
    subject: input.subject
  };
}

export function calculateCriticalRatio(timeRemainingHours: number, estimatedWorkRemainingHours: number) {
  if (estimatedWorkRemainingHours <= 0) return Number.POSITIVE_INFINITY;
  return timeRemainingHours / estimatedWorkRemainingHours;
}

export function criticalRatioBand(ratio: number) {
  if (ratio < 0) return "OVERDUE" as const;
  if (ratio < 1) return "AT_RISK" as const;
  if (ratio <= 1.25) return "NO_BUFFER" as const;
  return "BUFFER_AVAILABLE" as const;
}

