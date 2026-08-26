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

const ALLOWED_UNIFIED_CRM_OPPORTUNITY_TRANSITIONS: Record<UnifiedCrmOpportunityStage, readonly UnifiedCrmOpportunityStage[]> = {
  NEW_INQUIRY: ["QUALIFIED", "LOST"],
  QUALIFIED: ["APPOINTMENT_SET", "WORKING_DEAL", "LOST"],
  APPOINTMENT_SET: ["WORKING_DEAL", "CUSTOMER_DECIDING", "LOST"],
  WORKING_DEAL: ["QUOTE_PRESENTED", "CUSTOMER_DECIDING", "LOST"],
  QUOTE_PRESENTED: ["CUSTOMER_DECIDING", "WON", "LOST"],
  CUSTOMER_DECIDING: ["QUOTE_PRESENTED", "WON", "LOST"],
  WON: [],
  LOST: []
};

export function listAllowedUnifiedCrmOpportunityTransitions(stage: UnifiedCrmOpportunityStage) {
  return ALLOWED_UNIFIED_CRM_OPPORTUNITY_TRANSITIONS[stage];
}

export function isAllowedUnifiedCrmOpportunityTransition(
  fromStage: UnifiedCrmOpportunityStage,
  toStage: UnifiedCrmOpportunityStage
) {
  return ALLOWED_UNIFIED_CRM_OPPORTUNITY_TRANSITIONS[fromStage].includes(toStage);
}
