export type SalesManagerCommandInput = {
  recordId: string;
  customerName: string;
  revenueAmount: number;
  stageAgeHours: number;
  slaRiskMinutes: number;
  managerReviewOpen: boolean;
  governedApprovalNeeded: boolean;
  salespersonId: string;
  showRatePercent: number;
  grossPerUnit: number;
  overdueFollowUps: number;
  sourceVerified: boolean;
  closeProbabilityPercent: number;
};

export type SalesManagerCommandQueues = {
  stalledRevenue: SalesManagerCommandInput[];
  slaBreachQueue: SalesManagerCommandInput[];
  managerReviewQueue: SalesManagerCommandInput[];
  approvalBacklogVisibility: SalesManagerCommandInput[];
  coachingOpportunityFlags: Array<{ salespersonId: string; reasons: string[] }>;
  forecastConfidencePercent: number;
  drilldownRecordIds: string[];
  governedActionsRemainBlocked: true;
};

export function buildSalesManagerCommandQueues(records: SalesManagerCommandInput[]): SalesManagerCommandQueues {
  const stalledRevenue = records.filter((record) => record.stageAgeHours > 24 || !record.sourceVerified);
  const slaBreachQueue = records.filter((record) => record.slaRiskMinutes > 30);
  const managerReviewQueue = records.filter((record) => record.managerReviewOpen);
  const approvalBacklogVisibility = records.filter((record) => record.governedApprovalNeeded);
  const coachingBySalesperson = new Map<string, string[]>();

  for (const record of records) {
    const reasons: string[] = [];
    if (record.showRatePercent < 50) reasons.push("low show rate");
    if (record.grossPerUnit < 900) reasons.push("low gross per unit");
    if (record.overdueFollowUps > 0) reasons.push("overdue follow-ups");
    if (reasons.length) coachingBySalesperson.set(record.salespersonId, [...(coachingBySalesperson.get(record.salespersonId) ?? []), ...reasons]);
  }

  const totalWeightedConfidence = records.reduce((sum, record) => sum + record.closeProbabilityPercent * record.revenueAmount, 0);
  const totalRevenue = records.reduce((sum, record) => sum + record.revenueAmount, 0);
  const forecastConfidencePercent = totalRevenue ? Math.round(totalWeightedConfidence / totalRevenue) : 0;

  return {
    stalledRevenue,
    slaBreachQueue,
    managerReviewQueue,
    approvalBacklogVisibility,
    coachingOpportunityFlags: [...coachingBySalesperson.entries()].map(([salespersonId, reasons]) => ({
      salespersonId,
      reasons: [...new Set(reasons)]
    })),
    forecastConfidencePercent,
    drilldownRecordIds: records.map((record) => record.recordId),
    governedActionsRemainBlocked: true
  };
}
