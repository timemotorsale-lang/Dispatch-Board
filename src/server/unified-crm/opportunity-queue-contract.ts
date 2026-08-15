export const UNIFIED_CRM_OPPORTUNITY_QUEUE_CONTRACT_VERSION = "ucrm.opportunity-queue/v1" as const;

export type UnifiedCrmOpportunityQueueReviewSegment = {
  countLabel: string;
  detail: string;
  id: "owned" | "overdue" | "waiting" | "at-risk";
  label: string;
  state: "HELD" | "REVIEW";
};

export type UnifiedCrmOpportunityQueueReviewItem = {
  detailHref: string;
  dueLabel: string;
  id: string;
  ownerLabel: string;
  reason: string;
  riskLabel: string;
  state: "HELD_REVIEW" | "LIVE_READ_ONLY";
  title: string;
};

export type UnifiedCrmOpportunityQueueReviewModel = {
  contractVersion: typeof UNIFIED_CRM_OPPORTUNITY_QUEUE_CONTRACT_VERSION;
  generatedAt: string;
  governance: readonly string[];
  headline: {
    detail: string;
    title: string;
  };
  items: readonly UnifiedCrmOpportunityQueueReviewItem[];
  nextUnlocks: readonly string[];
  segments: readonly UnifiedCrmOpportunityQueueReviewSegment[];
  source: {
    href: "/crm?view=pipeline";
    label: "Unified CRM opportunity queue review";
    observedAt: string;
  };
  state: "HELD_REVIEW";
  visibility: "organization" | "owned";
};
