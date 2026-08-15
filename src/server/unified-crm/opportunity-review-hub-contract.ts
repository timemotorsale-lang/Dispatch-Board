export const UNIFIED_CRM_OPPORTUNITY_REVIEW_HUB_CONTRACT_VERSION = "ucrm.opportunity-review-hub/v1" as const;

export type UnifiedCrmOpportunityReviewHubVisibility = "organization" | "owned";

export type UnifiedCrmOpportunityReviewHubLink = {
  description: string;
  href: string;
  id: "pipeline" | "queue" | "create" | "detail" | "transition";
  label: string;
  state: "HELD_REVIEW";
};

export type UnifiedCrmOpportunityReviewHubSection = {
  detail: string;
  id: "overview" | "governance";
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
