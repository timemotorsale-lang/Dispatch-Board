import type { UnifiedCrmOpportunityDiscoveryModel } from "@/server/unified-crm/opportunity-discovery-contract";

export const UNIFIED_CRM_CUSTOMER_LIST_OPPORTUNITY_DISCOVERY_CONTRACT_VERSION = "ucrm.customer-list-opportunity-discovery/v1" as const;

export type UnifiedCrmCustomerListOpportunityDiscoveryAction = {
  detail: string;
  href: string;
  id: "pipeline" | "hub" | "guided";
  label: string;
  state: "HELD_REVIEW";
};

export type UnifiedCrmCustomerListOpportunityDiscoveryModel = {
  actions: readonly UnifiedCrmCustomerListOpportunityDiscoveryAction[];
  contractVersion: typeof UNIFIED_CRM_CUSTOMER_LIST_OPPORTUNITY_DISCOVERY_CONTRACT_VERSION;
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
    label: "Customer list opportunity discovery";
    observedAt: string;
  };
  state: "HELD_REVIEW";
};

export type UnifiedCrmCustomerListOpportunityDiscoveryCollectionModel = {
  byCustomerId: Readonly<Record<string, UnifiedCrmCustomerListOpportunityDiscoveryModel>>;
  contractVersion: typeof UNIFIED_CRM_CUSTOMER_LIST_OPPORTUNITY_DISCOVERY_CONTRACT_VERSION;
  generatedAt: string;
  listHref: string;
  source: {
    authority: "CUSTOMERS";
    href: string;
    label: "Customer list opportunity discovery";
    observedAt: string;
  };
  state: "HELD_REVIEW";
};
