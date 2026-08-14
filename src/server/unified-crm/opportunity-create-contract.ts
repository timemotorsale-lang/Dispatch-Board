export const UNIFIED_CRM_OPPORTUNITY_CREATE_CONTRACT_VERSION = "ucrm.opportunity-create/v1" as const;

export type UnifiedCrmOpportunityCreateReviewModel = {
  contractVersion: typeof UNIFIED_CRM_OPPORTUNITY_CREATE_CONTRACT_VERSION;
  state: "HELD_REVIEW";
  generatedAt: string;
  visibility: "organization" | "owned";
  source: {
    href: "/crm?view=pipeline";
    label: "Unified CRM opportunity create review";
    observedAt: string;
  };
  headline: {
    title: string;
    detail: string;
  };
  requiredInputs: readonly {
    id: string;
    label: string;
    detail: string;
    state: "REQUIRED" | "HELD";
  }[];
  governance: readonly string[];
  nextUnlocks: readonly string[];
  createAction: {
    label: string;
    state: "HELD";
  };
};
