export const UNIFIED_CRM_OPPORTUNITY_DISCOVERY_CONTRACT_VERSION = "ucrm.opportunity-discovery/v1" as const;

export type UnifiedCrmOpportunityDiscoveryVisibility = "organization" | "owned";

export type UnifiedCrmOpportunityDiscoveryLink = {
  description: string;
  href: string;
  id: "pipeline" | "hub" | "guided";
  label: string;
  state: "HELD_REVIEW" | "LIVE_READ_ONLY";
};

export type UnifiedCrmOpportunityDiscoveryPanel = {
  detail: string;
  emphasis: "ENTRY" | "MAP" | "GUIDED";
  id: "workspace-entry" | "workspace-map" | "guided-path";
  label: string;
  link: UnifiedCrmOpportunityDiscoveryLink;
};

export type UnifiedCrmOpportunityDiscoveryModel = {
  collectionObservation?: {
    detail: string;
    freshnessLabel: string;
    newestVisibleRecordUpdatedAt: string | null;
    state: "EMPTY" | "READY";
    visibleRecordCount: number;
  };
  contractVersion: typeof UNIFIED_CRM_OPPORTUNITY_DISCOVERY_CONTRACT_VERSION;
  generatedAt: string;
  headline: {
    detail: string;
    title: string;
  };
  nextUnlocks: readonly string[];
  panels: readonly UnifiedCrmOpportunityDiscoveryPanel[];
  source: {
    href: "/crm?view=pipeline";
    label: "Unified CRM opportunity workspace discovery";
    observedAt: string;
  };
  state: "HELD_REVIEW";
  visibility: UnifiedCrmOpportunityDiscoveryVisibility;
};
