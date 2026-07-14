import type { DecisionConfidence, InventoryDecision, InventoryRiskFlags, InventorySubjectType } from "./domain";
import { evaluateHardRule } from "./domain";
import { normalize, score100, stableFingerprint, weightedScore } from "./math";

export function evaluateDataConfidence(input: {
  contradictions: string[];
  evidenceCoverage: number;
  freshness: number;
  identityCertainty: number;
  requiredFieldsPresent: number;
  sourceAuthority: number;
}) {
  const score = weightedScore([
    { value: input.requiredFieldsPresent, weight: 25 },
    { value: input.sourceAuthority, weight: 20 },
    { value: input.freshness, weight: 15 },
    { value: input.identityCertainty, weight: 20 },
    { value: input.evidenceCoverage, weight: 20 }
  ]) - Math.min(40, input.contradictions.length * 15);
  const boundedScore = score100(score);
  const confidence: DecisionConfidence = boundedScore >= 85 && input.contradictions.length === 0
    ? "HIGH"
    : boundedScore >= 65
      ? "MEDIUM"
      : boundedScore >= 40
        ? "LOW"
        : "INSUFFICIENT";
  return { confidence, contradictions: input.contradictions, score: boundedScore };
}

export function scoreBlockerSeverity(input: {
  ageHours: number;
  customerCommitment: number;
  downstreamImpact: number;
  financialExposure: number;
  interventionThresholdHours: number;
  nextActionClear: boolean;
  ownerAssigned: boolean;
  workaroundAvailable: boolean;
  riskFlags?: InventoryRiskFlags;
}) {
  const hardRuleCode = evaluateHardRule(input.riskFlags ?? {});
  const score = weightedScore([
    { value: normalize(input.ageHours, 0, Math.max(1, input.interventionThresholdHours * 2)), weight: 20 },
    { value: input.downstreamImpact, weight: 20 },
    { value: input.financialExposure, weight: 15 },
    { value: input.customerCommitment, weight: 20 },
    { value: input.workaroundAvailable ? 0 : 1, weight: 10 },
    { value: input.nextActionClear ? 0 : 1, weight: 10 },
    { value: input.ownerAssigned ? 0 : 1, weight: 5 }
  ]);
  return {
    band: hardRuleCode || score >= 75 ? "CRITICAL" : score >= 50 ? "HIGH" : score >= 25 ? "WATCH" : "NORMAL",
    hardRuleCode,
    score: hardRuleCode ? Math.max(75, score) : score
  } as const;
}

export type OwnershipCandidate = {
  active: boolean;
  authorityEligible: boolean;
  capabilityFit: number;
  conflictOfInterest: boolean;
  continuity: number;
  deadlineFit: number;
  id: string;
  locationFit: number;
  workloadCapacity: number;
};

export function rankOwnershipCandidates(candidates: OwnershipCandidate[]) {
  return candidates
    .filter((candidate) => candidate.active && candidate.authorityEligible && !candidate.conflictOfInterest)
    .map((candidate) => ({
      ...candidate,
      score: weightedScore([
        { value: candidate.capabilityFit, weight: 30 },
        { value: candidate.workloadCapacity, weight: 25 },
        { value: candidate.continuity, weight: 15 },
        { value: candidate.deadlineFit, weight: 20 },
        { value: candidate.locationFit, weight: 10 }
      ])
    }))
    .sort((left, right) => right.score - left.score || left.id.localeCompare(right.id));
}

export function scoreNextBestAction(input: {
  actionCode: string;
  confidenceOfBenefit: number;
  customerDeliveryImpact: number;
  downstreamUnblocking: number;
  effortEfficiency: number;
  eligible: boolean;
  evaluatedAt: Date;
  revenueOrCostRelease: number;
  riskFlags?: InventoryRiskFlags;
  subject: { id: string; type: InventorySubjectType };
  urgency: number;
  workReadiness: number;
}): InventoryDecision<{ actionCode: string }> {
  const hardRuleCode = evaluateHardRule(input.riskFlags ?? {});
  const score = weightedScore([
    { value: input.urgency, weight: 25 },
    { value: input.revenueOrCostRelease, weight: 20 },
    { value: input.downstreamUnblocking, weight: 15 },
    { value: input.customerDeliveryImpact, weight: 15 },
    { value: input.confidenceOfBenefit, weight: 10 },
    { value: input.workReadiness, weight: 10 },
    { value: input.effortEfficiency, weight: 5 }
  ]);
  const eligible = input.eligible && input.workReadiness > 0 && !hardRuleCode;
  const reasonCodes = [
    ...(input.urgency >= 0.75 ? ["NBA_URGENCY_HIGH"] : []),
    ...(input.downstreamUnblocking >= 0.75 ? ["NBA_DOWNSTREAM_RELEASE_HIGH"] : []),
    ...(input.workReadiness <= 0 ? ["NBA_WORK_NOT_READY"] : []),
    ...(hardRuleCode ? [`HARD_${hardRuleCode}`] : [])
  ];
  return {
    algorithmVersion: "inventory-next-best-action/1.0.0",
    confidence: input.confidenceOfBenefit >= 0.75 ? "HIGH" : input.confidenceOfBenefit >= 0.5 ? "MEDIUM" : "LOW",
    decisionType: "INVENTORY_NEXT_BEST_ACTION",
    eligible,
    evaluatedAt: input.evaluatedAt,
    explanation: eligible ? `${input.actionCode} is the highest-value ready action at ${score}/100.` : `${input.actionCode} is not currently executable.`,
    hardRuleCode,
    inputFingerprint: stableFingerprint(input),
    managerReviewRequired: Boolean(hardRuleCode),
    missingInputs: [],
    priority: hardRuleCode || score >= 75 ? "CRITICAL" : score >= 50 ? "HIGH" : "NORMAL",
    reasonCodes,
    result: { actionCode: input.actionCode },
    score,
    subject: input.subject
  };
}

export function evaluateTaskGeneration(input: {
  actionCode: string;
  activeEquivalentTaskExists: boolean;
  completionEvidenceDefined: boolean;
  decisionId: string;
  lifecycleState: string;
  ownerOrClaimRouteValid: boolean;
  policyVersion: string;
  subjectId: string;
  actionable: boolean;
  responseTargetDefined: boolean;
}) {
  const idempotencyKey = stableFingerprint({
    actionCode: input.actionCode,
    lifecycleState: input.lifecycleState,
    policyVersion: input.policyVersion,
    subjectId: input.subjectId
  });
  const reasonCodes: string[] = [];
  if (!input.actionable) reasonCodes.push("TASK_CONDITION_NOT_ACTIONABLE");
  if (input.activeEquivalentTaskExists) reasonCodes.push("TASK_EQUIVALENT_ACTIVE");
  if (!input.ownerOrClaimRouteValid) reasonCodes.push("TASK_OWNER_ROUTE_INVALID");
  if (!input.responseTargetDefined) reasonCodes.push("TASK_RESPONSE_TARGET_MISSING");
  if (!input.completionEvidenceDefined) reasonCodes.push("TASK_COMPLETION_EVIDENCE_MISSING");
  return { create: reasonCodes.length === 0, idempotencyKey, reasonCodes };
}

export function evaluateSlaAlert(input: {
  acknowledged: boolean;
  conditionActive: boolean;
  conditionKey: string;
  cooldownMinutes: number;
  hardCritical: boolean;
  lastAlertAt: Date | null;
  now: Date;
  ownerId: string | null;
  thresholdAt: Date;
}) {
  if (!input.conditionActive) return { action: "RESOLVE" as const, reasonCodes: ["SLA_CONDITION_CLEARED"] };
  const minutesSinceLastAlert = input.lastAlertAt ? (input.now.getTime() - input.lastAlertAt.getTime()) / 60_000 : Number.POSITIVE_INFINITY;
  const breached = input.now >= input.thresholdAt;
  if (input.hardCritical) return { action: "ESCALATE_IMMEDIATELY" as const, reasonCodes: ["SLA_HARD_CRITICAL"] };
  if (!breached) return { action: "MONITOR" as const, reasonCodes: ["SLA_WITHIN_TARGET"] };
  if (input.acknowledged && minutesSinceLastAlert < input.cooldownMinutes) return { action: "SUPPRESS_DUPLICATE" as const, reasonCodes: ["SLA_ACKNOWLEDGED_COOLDOWN"] };
  if (minutesSinceLastAlert < input.cooldownMinutes) return { action: "SUPPRESS_DUPLICATE" as const, reasonCodes: ["SLA_ALERT_COOLDOWN"] };
  return input.ownerId
    ? { action: "ALERT_OWNER" as const, reasonCodes: ["SLA_THRESHOLD_BREACHED"] }
    : { action: "ESCALATE_MANAGER" as const, reasonCodes: ["SLA_BREACH_NO_OWNER"] };
}

export function estimateCompletionRange(input: {
  approvalEtaHours: number;
  businessCapacityFactor: number;
  dependencyHours: number;
  historicalStandardDeviationHours: number;
  now: Date;
  partsEtaHours: number;
  remainingWorkHours: number;
}) {
  const capacity = Math.max(0.1, input.businessCapacityFactor);
  const baseHours = input.remainingWorkHours / capacity + input.partsEtaHours + input.approvalEtaHours + input.dependencyHours;
  const spread = Math.max(1, input.historicalStandardDeviationHours);
  return {
    confidence: input.historicalStandardDeviationHours <= baseHours * 0.25 ? "HIGH" : input.historicalStandardDeviationHours <= baseHours * 0.5 ? "MEDIUM" : "LOW",
    expectedAt: new Date(input.now.getTime() + baseHours * 3_600_000),
    highAt: new Date(input.now.getTime() + (baseHours + spread) * 3_600_000),
    lowAt: new Date(input.now.getTime() + Math.max(0, baseHours - spread) * 3_600_000)
  } as const;
}
