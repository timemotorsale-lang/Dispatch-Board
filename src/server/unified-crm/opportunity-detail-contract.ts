export const UNIFIED_CRM_OPPORTUNITY_DETAIL_CONTRACT_VERSION = "ucrm.opportunity-detail/v1" as const;

export type UnifiedCrmOpportunityDetailVisibility = "organization" | "owned";

export type UnifiedCrmOpportunityDetailReadModel = {
  contractVersion: typeof UNIFIED_CRM_OPPORTUNITY_DETAIL_CONTRACT_VERSION;
  state: "HELD";
  generatedAt: string;
  requestedOpportunityId: string;
  visibility: UnifiedCrmOpportunityDetailVisibility;
  source: {
    authority: "UNIFIED_CRM";
    href: "/crm?view=pipeline";
    label: "Unified CRM opportunity foundation";
    observedAt: string;
    readMode: "HELD_REVIEW";
  };
  freshness: {
    status: "CURRENT";
    observedAt: string;
    sourceRecordUpdatedAt: null;
  };
  identity: {
    lifecycleStatus: "HELD";
    ownerScopeLabel: string;
    title: "Opportunity detail review";
  };
  summary: {
    customer: string;
    dueState: string;
    nextAction: string;
    owner: string;
  };
  sourceBridge: {
    detail: string;
    label: "Lead bridge";
    state: "HELD";
  };
  workBridges: readonly {
    detail: string;
    domain: "TASKS" | "APPOINTMENTS" | "DISPATCH";
    label: string;
    state: "HELD";
  }[];
  nextUnlocks: readonly string[];
};
