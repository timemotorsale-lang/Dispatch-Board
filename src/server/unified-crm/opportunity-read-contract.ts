import type { UnifiedCrmOpportunityStage } from "@/server/unified-crm/opportunity-lifecycle";

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
  dueLabel?: string;
  moveHref?: string;
  nextActionLabel: string;
  ownerLabel: string;
  reason: string;
  stage?: UnifiedCrmOpportunityStage;
  state?: "HELD_REVIEW" | "LIVE_READ_ONLY";
  version?: number;
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
    observation?: {
      detail: string;
      freshnessLabel: string;
      newestVisibleRecordUpdatedAt: string | null;
      state: "EMPTY" | "READY";
      visibleRecordCount: number;
    };
    emptyMessage: string;
    heading: string;
    items: {
      id: string;
      customerLabel?: string;
      href?: string;
      ownerLabel: string;
      reason: string;
      state?: "HELD_REVIEW" | "LIVE_READ_ONLY";
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
