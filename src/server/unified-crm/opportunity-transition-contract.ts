export const UNIFIED_CRM_OPPORTUNITY_TRANSITION_CONTRACT_VERSION = "ucrm.opportunity-transition/v1" as const;

export type UnifiedCrmOpportunityTransitionReviewModel = {
  contractVersion: typeof UNIFIED_CRM_OPPORTUNITY_TRANSITION_CONTRACT_VERSION;
  state: "HELD_REVIEW";
  generatedAt: string;
  requestedOpportunityId: string;
  visibility: "organization" | "owned";
  source: {
    href: "/crm?view=pipeline";
    label: "Unified CRM opportunity transition review";
    observedAt: string;
  };
  headline: {
    title: string;
    detail: string;
  };
  currentState: {
    label: string;
    detail: string;
    status: "HELD";
  };
  transitionChecks: readonly {
    id: string;
    label: string;
    detail: string;
    state: "REQUIRED" | "HELD";
  }[];
  governance: readonly string[];
  nextUnlocks: readonly string[];
  transitionAction: {
    label: string;
    state: "HELD";
  };
};
