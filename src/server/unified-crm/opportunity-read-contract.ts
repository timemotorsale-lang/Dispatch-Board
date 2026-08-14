export const UNIFIED_CRM_OPPORTUNITY_READ_CONTRACT_VERSION = "ucrm.opportunity-read/v1" as const;

export type UnifiedCrmOpportunityStageReference = {
  definitionId: string | null;
  label: string;
  orderHint: number | null;
  lifecycleHeld: true;
};

export type UnifiedCrmOpportunityDetailState =
  | "HELD"
  | "NOT_AVAILABLE"
  | "RESTRICTED"
  | "SOURCE_UNAVAILABLE";

export type UnifiedCrmOpportunityPreviewCard = {
  title: string;
  detail: string;
  tone: "positive" | "warning" | "neutral";
};

export type UnifiedCrmOpportunityPreviewModel = {
  contractVersion: typeof UNIFIED_CRM_OPPORTUNITY_READ_CONTRACT_VERSION;
  state: "HELD";
  stagePolicy: UnifiedCrmOpportunityStageReference;
  cards: readonly UnifiedCrmOpportunityPreviewCard[];
  nextSteps: readonly string[];
};

export type UnifiedCrmOpportunityHeldReadModel = UnifiedCrmOpportunityPreviewModel;
