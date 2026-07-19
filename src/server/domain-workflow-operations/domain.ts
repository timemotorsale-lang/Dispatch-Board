export type DomainWorkflowArea = "ACQUISITION" | "FRONTLINE" | "RETAIL" | "SHOP_RECON" | "PARTS" | "WHOLESALE";
export type DomainWorkflowPriority = "CRITICAL" | "HIGH" | "NORMAL";

export type DomainWorkflowSource = {
  domain: DomainWorkflowArea;
  dueAt: Date;
  href: string;
  id: string;
  label: string;
  location: string;
  nextAction: string;
  operatingState: string;
  owner: string;
  reason: string | null;
  stage: string;
};

export type DomainWorkflowWorkItem = Omit<DomainWorkflowSource, "dueAt"> & {
  dueAt: string;
  overdue: boolean;
  priority: DomainWorkflowPriority;
  workItemId: string;
};

const DAY = 86_400_000;

export function buildDomainWorkflowQueue(sources: DomainWorkflowSource[], now: Date): DomainWorkflowWorkItem[] {
  return sources.map((source) => {
    const overdue = source.dueAt.getTime() <= now.getTime();
    const severelyOverdue = source.dueAt.getTime() <= now.getTime() - DAY;
    const exception = ["BLOCKED", "SUSPENDED", "RECONCILIATION_HOLD", "EXPIRED"].includes(source.operatingState) || Boolean(source.reason);
    const priority: DomainWorkflowPriority = exception && overdue ? "CRITICAL" : exception || severelyOverdue ? "HIGH" : "NORMAL";
    return {
      ...source,
      dueAt: source.dueAt.toISOString(),
      overdue,
      priority,
      workItemId: `${source.domain}:${source.id}:${source.stage}`,
    };
  }).sort((left, right) => {
    const rank = { CRITICAL: 0, HIGH: 1, NORMAL: 2 };
    return rank[left.priority] - rank[right.priority] || left.dueAt.localeCompare(right.dueAt) || left.workItemId.localeCompare(right.workItemId);
  });
}

export type WholesaleOutcome = {
  actualNetCents: number;
  caseId: string;
  expectedNetCents: number;
  toleranceCents: number;
};

export function buildWholesaleRecommendationCalibration(outcomes: WholesaleOutcome[]) {
  const observations = outcomes.map((item) => ({ ...item, varianceCents: item.actualNetCents - item.expectedNetCents }));
  const count = observations.length;
  const signedVarianceCents = count ? Math.round(observations.reduce((sum, item) => sum + item.varianceCents, 0) / count) : null;
  const meanAbsoluteVarianceCents = count ? Math.round(observations.reduce((sum, item) => sum + Math.abs(item.varianceCents), 0) / count) : null;
  const withinTolerance = observations.filter((item) => Math.abs(item.varianceCents) <= item.toleranceCents).length;
  return {
    evidenceState: count >= 5 ? "MEASURED" as const : "INSUFFICIENT_SAMPLE" as const,
    observationCount: count,
    signedVarianceCents,
    meanAbsoluteVarianceCents,
    withinToleranceRate: count ? Math.round((withinTolerance / count) * 1000) / 10 : null,
    execution: "ADVISORY_NON_EXECUTING" as const,
  };
}
