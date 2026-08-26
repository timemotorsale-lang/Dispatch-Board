export const UNIFIED_CRM_OPPORTUNITY_STAGES = [
  "NEW_INQUIRY",
  "QUALIFIED",
  "APPOINTMENT_SET",
  "WORKING_DEAL",
  "QUOTE_PRESENTED",
  "CUSTOMER_DECIDING",
  "WON",
  "LOST"
] as const;

export type UnifiedCrmOpportunityStage = (typeof UNIFIED_CRM_OPPORTUNITY_STAGES)[number];

export const ACTIVE_UNIFIED_CRM_OPPORTUNITY_STAGES = UNIFIED_CRM_OPPORTUNITY_STAGES.filter((stage) =>
  stage !== "WON" && stage !== "LOST"
);

export function isUnifiedCrmOpportunityStage(value: unknown): value is UnifiedCrmOpportunityStage {
  return typeof value === "string" && UNIFIED_CRM_OPPORTUNITY_STAGES.includes(value as UnifiedCrmOpportunityStage);
}

export function isTerminalUnifiedCrmOpportunityStage(stage: UnifiedCrmOpportunityStage) {
  return stage === "WON" || stage === "LOST";
}

