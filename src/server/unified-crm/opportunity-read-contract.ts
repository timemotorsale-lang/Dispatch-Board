export const UNIFIED_CRM_OPPORTUNITY_READ_CONTRACT_VERSION = "ucrm.opportunity-read/v1" as const;

export type UnifiedCrmOpportunityStageReference = {
  definitionId: string;
  label: string | null;
  order: number | null;
};

export type UnifiedCrmOpportunityDetailState =
  | "HELD"
  | "NOT_AVAILABLE"
  | "RESTRICTED"
  | "SOURCE_UNAVAILABLE";

export type UnifiedCrmOpportunityPreviewCard = {
  id: string;
  label: string;
  value: string;
  detail: string;
  tone: "neutral" | "ready" | "held";
};

export type UnifiedCrmOpportunityPipelinePreviewItem = {
  id: string;
  customerLabel: string;
  detailHref: string;
  nextActionLabel: string;
  ownerLabel: string;
  reason: string;
};

export type UnifiedCrmOpportunityPipelinePreviewColumn = {
  id: string;
  itemCountLabel: string;
  items: UnifiedCrmOpportunityPipelinePreviewItem[];
  label: string;
  valueLabel: string;
};

export type UnifiedCrmOpportunityPreviewModel = {
  contractVersion: typeof UNIFIED_CRM_OPPORTUNITY_READ_CONTRACT_VERSION;
  cards: UnifiedCrmOpportunityPreviewCard[];
  columns: UnifiedCrmOpportunityPipelinePreviewColumn[];
  constraints: string[];
  generatedAt: string;
  listPreview: {
    emptyMessage: string;
    heading: string;
    items: {
      id: string;
      ownerLabel: string;
      reason: string;
      title: string;
    }[];
  };
  state: "PREVIEW";
  visibility: "organization" | "owned";
};

export type UnifiedCrmOpportunityHeldReadModel = {
  contractVersion: typeof UNIFIED_CRM_OPPORTUNITY_READ_CONTRACT_VERSION;
  detail: string;
  generatedAt: string;
  nextStep: string;
  state: UnifiedCrmOpportunityDetailState;
};
