import type { UnifiedCrmOpportunityStage } from "@/server/unified-crm/opportunity-lifecycle";

export const UNIFIED_CRM_OPPORTUNITY_TRANSITION_CONTRACT_VERSION = "ucrm.opportunity-transition/v1" as const;

export type UnifiedCrmOpportunityTransitionReviewModel = {
  contractVersion: typeof UNIFIED_CRM_OPPORTUNITY_TRANSITION_CONTRACT_VERSION;
  state: "LIVE_TRANSITION";
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
    allowedNextStages: readonly UnifiedCrmOpportunityStage[];
    label: string;
    detail: string;
    nextActionDueAt: string | null;
    nextActionLabel: string | null;
    stage: UnifiedCrmOpportunityStage;
    status: "READY";
    version: number;
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
    state: "READY";
  };
};
