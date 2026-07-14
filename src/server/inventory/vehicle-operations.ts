import type { InventoryDecision, InventoryRiskFlags } from "./domain";
import { evaluateHardRule } from "./domain";
import { calculateCriticalRatio, criticalRatioBand } from "./lifecycle";
import { clamp, score100, stableFingerprint, weightedScore } from "./math";

export type ReadinessDimension = {
  code: string;
  complete: boolean;
  critical: boolean;
  evidencePresent: boolean;
};

export function evaluateFrontlineReadiness(input: {
  dimensions: ReadinessDimension[];
  evaluatedAt: Date;
  riskFlags?: InventoryRiskFlags;
  vehicleId: string;
}): InventoryDecision<{
  completeCount: number;
  missingCritical: string[];
  missingNonCritical: string[];
  ready: boolean;
  readinessPercent: number;
}> {
  const missingCritical = input.dimensions.filter((entry) => entry.critical && (!entry.complete || !entry.evidencePresent)).map((entry) => entry.code);
  const missingNonCritical = input.dimensions.filter((entry) => !entry.critical && (!entry.complete || !entry.evidencePresent)).map((entry) => entry.code);
  const completeCount = input.dimensions.filter((entry) => entry.complete && entry.evidencePresent).length;
  const readinessPercent = input.dimensions.length > 0 ? score100((completeCount / input.dimensions.length) * 100) : 0;
  const hardRuleCode = evaluateHardRule(input.riskFlags ?? {});
  const ready = input.dimensions.length > 0 && missingCritical.length === 0 && missingNonCritical.length === 0 && !hardRuleCode;
  const missingInputs = input.dimensions.length > 0 ? [] : ["readinessDimensions"];
  const reasonCodes = [
    ...missingCritical.map((code) => `READINESS_CRITICAL_MISSING_${code}`),
    ...missingNonCritical.map((code) => `READINESS_MISSING_${code}`)
  ];
  if (hardRuleCode) reasonCodes.unshift(`HARD_${hardRuleCode}`);
  if (ready) reasonCodes.push("READINESS_ALL_GATES_PASSED");

  return {
    algorithmVersion: "frontline-readiness/1.0.0",
    confidence: missingInputs.length ? "INSUFFICIENT" : input.dimensions.every((entry) => entry.evidencePresent) ? "HIGH" : "LOW",
    decisionType: "VEHICLE_FRONTLINE_READINESS",
    eligible: missingInputs.length === 0,
    evaluatedAt: input.evaluatedAt,
    explanation: ready
      ? "All required frontline readiness gates have accepted evidence."
      : `${missingCritical.length} critical and ${missingNonCritical.length} non-critical readiness gates remain incomplete.`,
    hardRuleCode,
    inputFingerprint: stableFingerprint(input),
    managerReviewRequired: Boolean(hardRuleCode) || missingCritical.length > 0,
    missingInputs,
    priority: hardRuleCode || missingCritical.length ? "CRITICAL" : missingNonCritical.length ? "HIGH" : "NORMAL",
    reasonCodes,
    result: { completeCount, missingCritical, missingNonCritical, ready, readinessPercent },
    score: readinessPercent,
    subject: { id: input.vehicleId, type: "VEHICLE" }
  };
}

export function scoreReconPriority(input: {
  bayAndSkillFit: number;
  customerDeliveryCommitment: number;
  downstreamBlockage: number;
  evaluatedAt: Date;
  lifecycleDelayPressure: number;
  partsAvailability: number;
  revenueReleasePotential: number;
  riskFlags?: InventoryRiskFlags;
  vehicleId: string;
  workReadiness: number;
}): InventoryDecision<{
  factors: Record<string, number>;
  recommendedAction: "HOLD_FOR_PREREQUISITE" | "PRIORITIZE_NOW" | "QUEUE_NEXT" | "STANDARD_QUEUE";
}> {
  const factors = {
    revenueReleasePotential: clamp(input.revenueReleasePotential, 0, 1),
    lifecycleDelayPressure: clamp(input.lifecycleDelayPressure, 0, 1),
    customerDeliveryCommitment: clamp(input.customerDeliveryCommitment, 0, 1),
    workReadiness: clamp(input.workReadiness, 0, 1),
    partsAvailability: clamp(input.partsAvailability, 0, 1),
    downstreamBlockage: clamp(input.downstreamBlockage, 0, 1),
    bayAndSkillFit: clamp(input.bayAndSkillFit, 0, 1)
  };
  const score = weightedScore([
    { value: factors.revenueReleasePotential, weight: 25 },
    { value: factors.lifecycleDelayPressure, weight: 20 },
    { value: factors.customerDeliveryCommitment, weight: 15 },
    { value: factors.workReadiness, weight: 15 },
    { value: factors.partsAvailability, weight: 10 },
    { value: factors.downstreamBlockage, weight: 10 },
    { value: factors.bayAndSkillFit, weight: 5 }
  ]);
  const hardRuleCode = evaluateHardRule(input.riskFlags ?? {});
  const eligible = factors.workReadiness > 0 && factors.bayAndSkillFit > 0;
  const recommendedAction = !eligible
    ? "HOLD_FOR_PREREQUISITE"
    : hardRuleCode || score >= 75
      ? "PRIORITIZE_NOW"
      : score >= 55
        ? "QUEUE_NEXT"
        : "STANDARD_QUEUE";
  const reasonCodes: string[] = [];
  if (!eligible) reasonCodes.push("RECON_PREREQUISITE_MISSING");
  if (factors.partsAvailability < 0.5) reasonCodes.push("RECON_PARTS_NOT_READY");
  if (factors.lifecycleDelayPressure >= 0.75) reasonCodes.push("RECON_LIFECYCLE_DELAY_HIGH");
  if (factors.customerDeliveryCommitment >= 0.75) reasonCodes.push("RECON_CUSTOMER_COMMITMENT_HIGH");
  if (hardRuleCode) reasonCodes.unshift(`HARD_${hardRuleCode}`);
  if (reasonCodes.length === 0) reasonCodes.push("RECON_STANDARD_PRIORITY");

  return {
    algorithmVersion: "recon-priority/1.0.0",
    confidence: "HIGH",
    decisionType: "VEHICLE_RECON_PRIORITY",
    eligible,
    evaluatedAt: input.evaluatedAt,
    explanation: eligible
      ? `Recon priority is ${score}/100 based on revenue release, delay, readiness, parts, and operational fit.`
      : "Recon cannot be scheduled until work readiness and bay or skill eligibility are satisfied.",
    hardRuleCode,
    inputFingerprint: stableFingerprint(input),
    managerReviewRequired: Boolean(hardRuleCode),
    missingInputs: [],
    priority: hardRuleCode || score >= 75 ? "CRITICAL" : score >= 55 ? "HIGH" : "NORMAL",
    reasonCodes,
    result: { factors, recommendedAction },
    score,
    subject: { id: input.vehicleId, type: "VEHICLE" }
  };
}

export function evaluateReconSchedule(input: {
  estimatedWorkRemainingHours: number;
  requiredCompletionAt: Date;
  now: Date;
}) {
  const timeRemainingHours = (input.requiredCompletionAt.getTime() - input.now.getTime()) / 3_600_000;
  const ratio = calculateCriticalRatio(timeRemainingHours, input.estimatedWorkRemainingHours);
  return {
    band: criticalRatioBand(ratio),
    ratio,
    timeRemainingHours
  };
}

export function rankReconAssignments(candidates: Array<{
  active: boolean;
  authorityEligible: boolean;
  bayCompatible: boolean;
  continuity: number;
  id: string;
  locationFit: number;
  skillFit: number;
  workloadCapacity: number;
}>) {
  return candidates
    .filter((candidate) => candidate.active && candidate.authorityEligible && candidate.bayCompatible && candidate.skillFit > 0)
    .map((candidate) => ({
      ...candidate,
      score: weightedScore([
        { value: candidate.skillFit, weight: 35 },
        { value: candidate.workloadCapacity, weight: 30 },
        { value: candidate.continuity, weight: 20 },
        { value: candidate.locationFit, weight: 15 }
      ])
    }))
    .sort((left, right) => right.score - left.score || left.id.localeCompare(right.id));
}
