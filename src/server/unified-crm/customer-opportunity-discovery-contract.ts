import type { UnifiedCrmOpportunityDiscoveryModel } from "@/server/unified-crm/opportunity-discovery-contract";

export const UNIFIED_CRM_CUSTOMER_OPPORTUNITY_DISCOVERY_CONTRACT_VERSION = "ucrm.customer-opportunity-discovery/v1" as const;

export type UnifiedCrmCustomerOpportunityDiscoveryContextPrompt = {
  detail: string;
  href: string;
  id: "timeline-follow-up" | "connected-work" | "source-lenses";
  label: string;
  state: "HELD_REVIEW";
  title: string;
};

export type UnifiedCrmCustomerOpportunityDiscoveryModel = {
  contractVersion: typeof UNIFIED_CRM_CUSTOMER_OPPORTUNITY_DISCOVERY_CONTRACT_VERSION;
  contextPrompts: readonly UnifiedCrmCustomerOpportunityDiscoveryContextPrompt[];
  customer: {
    displayName: string;
    href: string;
    id: string;
    listHref: string;
  };
  generatedAt: string;
  opportunityDiscovery: UnifiedCrmOpportunityDiscoveryModel;
  source: {
    authority: "CUSTOMERS";
    href: string;
    label: "Customer 360 opportunity discovery";
    observedAt: string;
  };
  state: "HELD_REVIEW";
};
