export const UNIFIED_CRM_OPPORTUNITY_GUIDED_JOURNEY_CONTRACT_VERSION = "ucrm.opportunity-guided-journey/v1" as const;

export type UnifiedCrmOpportunityGuidedJourneyVisibility = "organization" | "owned";

export type UnifiedCrmOpportunityGuidedJourneyStep = {
  description: string;
  href: string;
  id: "entry" | "queue" | "detail" | "transition" | "return";
  label: string;
  state: "HELD_REVIEW";
};

export type UnifiedCrmOpportunityGuidedJourneyPhase = {
  detail: string;
  id: "intake" | "follow-through" | "governance";
  label: string;
  steps: readonly UnifiedCrmOpportunityGuidedJourneyStep[];
};

export type UnifiedCrmOpportunityGuidedJourneyModel = {
  contractVersion: typeof UNIFIED_CRM_OPPORTUNITY_GUIDED_JOURNEY_CONTRACT_VERSION;
  generatedAt: string;
  headline: {
    detail: string;
    title: string;
  };
  nextUnlocks: readonly string[];
  phases: readonly UnifiedCrmOpportunityGuidedJourneyPhase[];
  source: {
    href: "/crm?view=pipeline";
    label: "Unified CRM guided opportunity journey";
    observedAt: string;
  };
  state: "HELD_REVIEW";
  visibility: UnifiedCrmOpportunityGuidedJourneyVisibility;
};
