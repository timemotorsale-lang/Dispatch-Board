export const UNIFIED_CRM_OPPORTUNITY_REVIEW_HUB_CONTRACT_VERSION = "ucrm.opportunity-review-hub/v1" as const;

export type UnifiedCrmOpportunityReviewHubVisibility = "organization" | "owned";

export type UnifiedCrmOpportunityReviewHubLink = {
  description: string;
  href: string;
  id: string;
  label: string;
  state: "HELD_REVIEW" | "LIVE_READ_ONLY";
};

export type UnifiedCrmOpportunityReviewHubSection = {
  detail: string;
  id: "overview" | "governance" | "live-records";
  label: string;
  links: readonly UnifiedCrmOpportunityReviewHubLink[];
};

export type UnifiedCrmOpportunityReviewHubModel = {
  contractVersion: typeof UNIFIED_CRM_OPPORTUNITY_REVIEW_HUB_CONTRACT_VERSION;
  generatedAt: string;
  headline: {
    detail: string;
    title: string;
  };
  liveReadObservation: {
    detail: string;
    freshnessLabel: string;
    newestVisibleRecordUpdatedAt: string | null;
    state: "EMPTY" | "READY";
    visibleRecordCount: number;
  };
  nextUnlocks: readonly string[];
  sections: readonly UnifiedCrmOpportunityReviewHubSection[];
  source: {
    href: "/crm?view=pipeline";
    label: "Unified CRM opportunity review hub";
    observedAt: string;
  };
  state: "HELD_REVIEW";
  visibility: UnifiedCrmOpportunityReviewHubVisibility;
};
