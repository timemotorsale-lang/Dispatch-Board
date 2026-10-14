export const UNIFIED_CRM_OPPORTUNITY_QUEUE_CONTRACT_VERSION = "ucrm.opportunity-queue/v1" as const;

export type UnifiedCrmOpportunityQueueReviewSegment = {
  countLabel: string;
  detail: string;
  id: "owned" | "unassigned" | "overdue" | "stalled" | "waiting" | "at-risk";
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
  segmentIds: readonly UnifiedCrmOpportunityQueueReviewSegment["id"][];
  state: "HELD_REVIEW" | "LIVE_READ_ONLY";
  title: string;
  transitionHref?: string;
};

export type UnifiedCrmOpportunityQueueReviewModel = {
  contractVersion: typeof UNIFIED_CRM_OPPORTUNITY_QUEUE_CONTRACT_VERSION;
  generatedAt: string;
  governance: readonly string[];
  headline: {
    detail: string;
    title: string;
  };
  liveReadObservation?: {
    detail: string;
    freshnessLabel: string;
    newestVisibleRecordUpdatedAt: string | null;
    state: "EMPTY" | "READY";
    visibleRecordCount: number;
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
