import type { AuthenticatedUser } from "@/server/auth/store";
import { getUnifiedCrmCustomer360 } from "@/server/services/unified-crm-customer-360-service";
import { getUnifiedCrmOpportunityDiscovery } from "@/server/services/unified-crm-opportunity-discovery-service";
import type { UnifiedCrmCustomer360ReadModel } from "@/server/unified-crm/customer-360-contract";
import type { UnifiedCrmCustomer360AccessOptions } from "@/server/unified-crm/customer-360-access";
import {
  UNIFIED_CRM_CUSTOMER_OPPORTUNITY_DISCOVERY_CONTRACT_VERSION,
  type UnifiedCrmCustomerOpportunityDiscoveryContextPrompt,
  type UnifiedCrmCustomerOpportunityDiscoveryModel
} from "@/server/unified-crm/customer-opportunity-discovery-contract";
import type { UnifiedCrmOpportunityAccessContext } from "@/server/unified-crm/opportunity-contract";
import type { UnifiedCrmOpportunityDiscoveryModel } from "@/server/unified-crm/opportunity-discovery-contract";
import { requireUnifiedCrmOpportunityDetailAccess } from "@/server/unified-crm/opportunity-detail-access";
import {
  buildUnifiedCrmCustomerReturn,
  withUnifiedCrmOpportunityReturn
} from "@/server/unified-crm/opportunity-review-return";

type Dependencies = UnifiedCrmCustomer360AccessOptions & {
  customer360?: UnifiedCrmCustomer360ReadModel;
  customerHref?: string;
  customerListHref?: string;
  now?: () => Date;
  opportunityAccessContext?: UnifiedCrmOpportunityAccessContext;
  scopeRepository?: {
    listActiveOrganizationIds(userId: string, now: Date): Promise<string[]>;
  };
};

const CUSTOMER_LIST_HREF = "/crm?view=customers" as const;

function withCustomerReturn(href: string, customerHref: string) {
  return withUnifiedCrmOpportunityReturn(href, customerHref);
}

function createContextPrompts(
  customer360: UnifiedCrmCustomer360ReadModel,
  opportunityDiscovery: UnifiedCrmOpportunityDiscoveryModel,
  customerHref: string
): UnifiedCrmCustomerOpportunityDiscoveryContextPrompt[] {
  const pipelineHref = withCustomerReturn(
    opportunityDiscovery.panels.find((panel) => panel.link.id === "pipeline")?.link.href ?? "/crm?view=pipeline",
    customerHref
  );
  const hubHref = withCustomerReturn(
    opportunityDiscovery.panels.find((panel) => panel.link.id === "hub")?.link.href ?? "/crm/opportunities?crmReturnTo=%2Fcrm%3Fview%3Dpipeline",
    customerHref
  );
  const guidedHref = withCustomerReturn(
    opportunityDiscovery.panels.find((panel) => panel.link.id === "guided")?.link.href ?? "/crm/opportunities/guided?crmReturnTo=%2Fcrm%3Fview%3Dpipeline",
    customerHref
  );

  return [
    {
      id: "timeline-follow-up",
      label: "Timeline follow-up",
      title: "Review the commercial follow-up path",
      detail: customer360.timeline.itemCount
        ? "Use the guided journey when the relationship history suggests it is time to inspect how commercial follow-up should feel next."
        : "Use the guided journey to review the intended commercial follow-up path before live opportunity actions exist.",
      href: guidedHref,
      state: "HELD_REVIEW"
    },
    {
      id: "connected-work",
      label: "Connected work",
      title: "Review queue and pipeline from active relationship work",
      detail: customer360.appointments.length || customer360.vehicles.length
        ? "Use the queue or pipeline review when appointments, vehicles, or other connected work make you want to inspect the commercial work shape."
        : "Use the queue or pipeline review to see how connected work will later align with opportunity review.",
      href: pipelineHref,
      state: "HELD_REVIEW"
    },
    {
      id: "source-lenses",
      label: "Lead and case context",
      title: "Open the opportunity review map from source-owned context",
      detail: customer360.sourceLenses.leads.length || customer360.sourceLenses.cases.length
        ? "Use the review hub when source-owned leads or cases make you want to compare the safe opportunity review surfaces side by side."
        : "Use the review hub to compare the opportunity review surfaces without changing any source-owned lead or case workflow.",
      href: hubHref,
      state: "HELD_REVIEW"
    }
  ];
}

export async function getUnifiedCrmCustomerOpportunityDiscovery(
  actor: AuthenticatedUser | null,
  customerId: string,
  dependencies: Dependencies = {}
): Promise<UnifiedCrmCustomerOpportunityDiscoveryModel> {
  const generatedAt = (dependencies.now?.() ?? new Date()).toISOString();
  const customer360 = dependencies.customer360 ?? await getUnifiedCrmCustomer360(actor, customerId, dependencies);
  const opportunityAccess = dependencies.opportunityAccessContext ?? await requireUnifiedCrmOpportunityDetailAccess(actor, dependencies);
  const opportunityDiscovery: UnifiedCrmOpportunityDiscoveryModel = await getUnifiedCrmOpportunityDiscovery(actor, {
    accessContext: opportunityAccess,
    mode: dependencies.readMode,
    nodeEnv: dependencies.nodeEnv,
    now: dependencies.now,
    scopeRepository: dependencies.scopeRepository,
    shellMode: dependencies.shellMode
  });

  const customerListHref = dependencies.customerListHref ?? CUSTOMER_LIST_HREF;
  const customerHref = dependencies.customerHref
    ?? buildUnifiedCrmCustomerReturn(customer360.identity.id, customerListHref);

  return {
    contractVersion: UNIFIED_CRM_CUSTOMER_OPPORTUNITY_DISCOVERY_CONTRACT_VERSION,
    contextPrompts: createContextPrompts(customer360, opportunityDiscovery, customerHref),
    customer: {
      displayName: customer360.identity.displayName,
      href: customerHref,
      id: customer360.identity.id,
      listHref: customerListHref
    },
    generatedAt,
    opportunityDiscovery,
    source: {
      authority: "CUSTOMERS",
      href: customerHref,
      label: "Customer 360 opportunity discovery",
      observedAt: generatedAt
    },
    state: "HELD_REVIEW"
  };
}
