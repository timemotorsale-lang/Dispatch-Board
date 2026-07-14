import type { InventoryLifecycleStage } from "./domain";

export type InventoryCostCategory = "ACQUISITION" | "RECONDITIONING" | "TITLE" | "MERCHANDISING" | "CARRYING" | "COMMITTED" | "RECOVERED";
export type InventoryCostStatus = "ESTIMATED" | "INCURRED" | "RECOVERED" | "VOID";
export type CostConfidence = "HIGH" | "MEDIUM" | "LOW" | "INSUFFICIENT";

export type InventoryCostEntry = {
  category: InventoryCostCategory;
  amountCents: number;
  status?: InventoryCostStatus;
  confidence?: CostConfidence;
  observedAt?: Date;
  incurredAt?: Date;
  recoveredAt?: Date;
};

export function summarizeInventoryExposure(entries: readonly InventoryCostEntry[]) {
  const active = entries.filter((entry) => entry.status !== "VOID");
  const byCategory = Object.fromEntries(([
    "ACQUISITION", "RECONDITIONING", "TITLE", "MERCHANDISING", "CARRYING", "COMMITTED", "RECOVERED"
  ] as const).map((category) => [category, active.filter((entry) => entry.category === category).reduce((sum, entry) => sum + entry.amountCents, 0)]));
  const incurredCents = active.filter((entry) => entry.status === "INCURRED" || entry.status === "RECOVERED").reduce((sum, entry) => sum + entry.amountCents, 0);
  const recoveredCents = active.filter((entry) => entry.status === "RECOVERED" || entry.category === "RECOVERED").reduce((sum, entry) => sum + entry.amountCents, 0);
  const estimatedCents = active.filter((entry) => entry.status === "ESTIMATED" || !entry.status).reduce((sum, entry) => sum + entry.amountCents, 0);
  return { byCategory, estimatedCents, incurredCents, recoveredCents, grossExposureCents: incurredCents - recoveredCents, totalProjectedCents: estimatedCents + incurredCents - recoveredCents };
}

export type LifecycleVelocityPolicy = {
  policyCode: string;
  version: number;
  effectiveFrom: Date;
  effectiveTo?: Date;
  stageTargetsDays: Partial<Record<InventoryLifecycleStage, number>>;
  defaultTargetDays?: number;
  reviewAfterDays?: number;
  grossPerDayFloorCents?: number;
};

export function validateVelocityPolicy(policy: LifecycleVelocityPolicy) {
  const failures: string[] = [];
  if (!policy.policyCode.trim()) failures.push("policyCode");
  if (!Number.isInteger(policy.version) || policy.version < 1) failures.push("version");
  if (!(policy.effectiveFrom instanceof Date) || Number.isNaN(policy.effectiveFrom.getTime())) failures.push("effectiveFrom");
  if (policy.effectiveTo && policy.effectiveTo <= policy.effectiveFrom) failures.push("effectiveTo");
  for (const [stage, days] of Object.entries(policy.stageTargetsDays)) if (!Number.isFinite(days) || (days as number) < 0) failures.push(`stageTargetsDays.${stage}`);
  if (policy.defaultTargetDays !== undefined && (!Number.isFinite(policy.defaultTargetDays) || policy.defaultTargetDays < 0)) failures.push("defaultTargetDays");
  if (policy.reviewAfterDays !== undefined && (!Number.isFinite(policy.reviewAfterDays) || policy.reviewAfterDays < 0)) failures.push("reviewAfterDays");
  return { ready: failures.length === 0, failures };
}

export function evaluateLifecycleVelocity(input: { stage: InventoryLifecycleStage; stageStartedAt: Date; now?: Date; policy: LifecycleVelocityPolicy; managerOverrideDays?: number | null }) {
  const now = input.now ?? new Date();
  const elapsedDays = Math.max(0, (now.getTime() - input.stageStartedAt.getTime()) / 86_400_000);
  const targetDays = input.managerOverrideDays ?? input.policy.stageTargetsDays[input.stage] ?? input.policy.defaultTargetDays ?? 0;
  const reviewAfterDays = input.policy.reviewAfterDays ?? targetDays;
  const breached = targetDays > 0 && elapsedDays > targetDays;
  return { stage: input.stage, elapsedDays, targetDays, reviewAfterDays, breached, reviewRequired: elapsedDays >= reviewAfterDays, daysOverTarget: Math.max(0, elapsedDays - targetDays), reasonCode: breached ? "VELOCITY_SLA_BREACHED" : "VELOCITY_SLA_WITHIN_TARGET" };
}

