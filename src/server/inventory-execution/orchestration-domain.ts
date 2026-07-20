export const INVENTORY_ORCHESTRATION_RULE_VERSION = "inventory-eos-next-work/v1";

export type OrchestrationCandidate = { id: string; vehicleId: string; taskId: string; title: string; state: string; urgency: "P0" | "P1" | "P2" | "P3" | "P4"; readiness: string; readinessItems: Array<{ code: string; required: boolean; satisfied: boolean }>; dependencyItems: Array<{ code: string; required: boolean; satisfied: boolean }>; targetAt: Date; createdAt: Date; dataState: "FRESH" | "STALE" | "UNAVAILABLE"; assignedUserId: string; actorHasAuthority: boolean; hasCompetingCurrentWork: boolean };

export function evaluateWorkEligibility(candidate: OrchestrationCandidate, now: Date) {
  const blockers: string[] = [];
  if (!candidate.actorHasAuthority) blockers.push("ACTOR_NOT_ASSIGNED_OR_AUTHORIZED");
  if (!['PLANNED', 'STAGED'].includes(candidate.state)) blockers.push("STATE_NOT_STARTABLE");
  if (candidate.readiness !== "READY") blockers.push(`READINESS_${candidate.readiness}`);
  for (const item of candidate.readinessItems.filter(item => item.required && !item.satisfied)) blockers.push(`READINESS_CHECK_${item.code}`);
  for (const item of candidate.dependencyItems.filter(item => item.required && !item.satisfied)) blockers.push(`DEPENDENCY_${item.code}`);
  if (candidate.dataState !== "FRESH") blockers.push(`DATA_${candidate.dataState}`);
  if (candidate.hasCompetingCurrentWork) blockers.push("EXECUTOR_ALREADY_HAS_CURRENT_WORK");
  return { eligible: blockers.length === 0, blockers, evaluatedAt: now.toISOString(), ruleVersion: INVENTORY_ORCHESTRATION_RULE_VERSION };
}

export function rankNextBestWork(candidates: OrchestrationCandidate[], now: Date) {
  const urgencyPoints = { P0: 5000, P1: 4000, P2: 3000, P3: 2000, P4: 1000 } as const;
  return candidates.map(candidate => {
    const eligibility = evaluateWorkEligibility(candidate, now), minutesToTarget = Math.floor((candidate.targetAt.getTime() - now.getTime()) / 60_000), overduePoints = minutesToTarget < 0 ? Math.min(900, Math.abs(minutesToTarget)) : Math.max(0, 600 - Math.min(600, minutesToTarget)), agePoints = Math.min(300, Math.floor((now.getTime() - candidate.createdAt.getTime()) / 3_600_000)), score = eligibility.eligible ? urgencyPoints[candidate.urgency] + overduePoints + agePoints : -1;
    return { ...candidate, eligibility, score, confidence: candidate.dataState === "FRESH" ? "HIGH" as const : "LOW" as const, reasons: [`MANAGER_URGENCY_${candidate.urgency}`, minutesToTarget < 0 ? "TARGET_OVERDUE" : "TARGET_PROXIMITY", "STABLE_CREATED_AT_TIE_BREAK"], recommendationType: "ADVISORY" as const };
  }).sort((left, right) => Number(right.eligibility.eligible) - Number(left.eligibility.eligible) || right.score - left.score || left.targetAt.getTime() - right.targetAt.getTime() || left.createdAt.getTime() - right.createdAt.getTime() || left.id.localeCompare(right.id));
}
