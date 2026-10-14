import type { AuthenticatedUser } from "@/server/auth/store";
import { getUnifiedCrmOpportunityDiscovery } from "@/server/services/unified-crm-opportunity-discovery-service";
import type { UnifiedCrmCustomerListItem, UnifiedCrmCustomerReadMode } from "@/server/unified-crm/customer-read-contract";
import {
  UNIFIED_CRM_CUSTOMER_LIST_OPPORTUNITY_DISCOVERY_CONTRACT_VERSION,
  type UnifiedCrmCustomerListOpportunityDiscoveryAction,
  type UnifiedCrmCustomerListOpportunityDiscoveryCollectionModel,
  type UnifiedCrmCustomerListOpportunityDiscoveryModel
} from "@/server/unified-crm/customer-list-opportunity-discovery-contract";
import type { UnifiedCrmOpportunityAccessContext } from "@/server/unified-crm/opportunity-contract";
import type { UnifiedCrmOpportunityDiscoveryModel } from "@/server/unified-crm/opportunity-discovery-contract";
import { requireUnifiedCrmOpportunityDetailAccess } from "@/server/unified-crm/opportunity-detail-access";

type Dependencies = {
  customer: Pick<UnifiedCrmCustomerListItem, "displayName" | "id">;
  customers?: readonly Pick<UnifiedCrmCustomerListItem, "displayName" | "id">[];
  listHref?: string;
  mode?: UnifiedCrmCustomerReadMode | unknown;
  nodeEnv?: string;
  now?: () => Date;
  opportunityAccessContext?: UnifiedCrmOpportunityAccessContext;
  scopeRepository?: {
    listActiveOrganizationIds(userId: string, now: Date): Promise<string[]>;
  };
  shellMode?: unknown;
};

const DEFAULT_LIST_HREF = "/crm?view=customers" as const;

function sanitizeListHref(value: string | undefined) {
  if (!value?.startsWith("/") || value.startsWith("//")) return DEFAULT_LIST_HREF;
  try {
    const url = new URL(value, "http://crm.local");
    if (url.pathname !== "/crm" || url.searchParams.get("view") !== "customers") return DEFAULT_LIST_HREF;
    if ([...url.searchParams.keys()].some((key) => !["view", "q", "status", "owner", "cursor"].includes(key))) {
      return DEFAULT_LIST_HREF;
    }
    const next = new URLSearchParams({ view: "customers" });
    const q = url.searchParams.get("q")?.trim();
    const status = url.searchParams.get("status");
    const owner = url.searchParams.get("owner");
    const cursor = url.searchParams.get("cursor");
    if (q && q.length <= 100) next.set("q", q);
    if (status && ["active", "inactive", "all"].includes(status)) next.set("status", status);
    if (owner && ["all", "mine", "unassigned"].includes(owner)) next.set("owner", owner);
    if (cursor && cursor.length <= 1024) next.set("cursor", cursor);
    return `/crm?${next.toString()}`;
  } catch {
    return DEFAULT_LIST_HREF;
  }
}

function withListReturn(href: string, listHref: string) {
  try {
    const url = new URL(href, "http://crm.local");
    url.searchParams.set("crmReturnTo", listHref);
    return `${url.pathname}${url.search}`;
  } catch {
    return href;
  }
}

function createActions(
  discovery: UnifiedCrmOpportunityDiscoveryModel,
  listHref: string
): readonly UnifiedCrmCustomerListOpportunityDiscoveryAction[] {
  const pipelineHref = withListReturn(
    discovery.panels.find((panel) => panel.link.id === "pipeline")?.link.href ?? "/crm?view=pipeline",
    listHref
  );
  const hubHref = withListReturn(
    discovery.panels.find((panel) => panel.link.id === "hub")?.link.href ?? "/crm/opportunities?crmReturnTo=%2Fcrm%3Fview%3Dpipeline",
    listHref
  );
  const guidedHref = withListReturn(
    discovery.panels.find((panel) => panel.link.id === "guided")?.link.href ?? "/crm/opportunities/guided?crmReturnTo=%2Fcrm%3Fview%3Dpipeline",
    listHref
  );

  return [
    {
      id: "pipeline",
      label: "Open pipeline review",
      detail: "Use the held opportunity workspace entry when you want the fastest commercial review from the customer list.",
      href: pipelineHref,
      state: "HELD_REVIEW"
    },
    {
      id: "hub",
      label: "Open workspace map",
      detail: "Use the held review hub when you want to compare the safe opportunity surfaces before choosing one.",
      href: hubHref,
      state: "HELD_REVIEW"
    },
    {
      id: "guided",
      label: "Open guided journey",
      detail: "Use the guided journey when you want the simplest end-to-end held review path from the customer list.",
      href: guidedHref,
      state: "HELD_REVIEW"
    }
  ];
}

function buildCustomerDiscoveryModel(input: {
  customer: Pick<UnifiedCrmCustomerListItem, "displayName" | "id">;
  generatedAt: string;
  listHref: string;
  opportunityDiscovery: UnifiedCrmOpportunityDiscoveryModel;
}): UnifiedCrmCustomerListOpportunityDiscoveryModel {
  const customerHref = `/crm/customers/${encodeURIComponent(input.customer.id)}?crmReturnTo=${encodeURIComponent(input.listHref)}`;
  return {
    actions: createActions(input.opportunityDiscovery, input.listHref),
    contractVersion: UNIFIED_CRM_CUSTOMER_LIST_OPPORTUNITY_DISCOVERY_CONTRACT_VERSION,
    customer: {
      displayName: input.customer.displayName,
      href: customerHref,
      id: input.customer.id,
      listHref: input.listHref
    },
    generatedAt: input.generatedAt,
    opportunityDiscovery: input.opportunityDiscovery,
    source: {
      authority: "CUSTOMERS",
      href: customerHref,
      label: "Customer list opportunity discovery",
      observedAt: input.generatedAt
    },
    state: "HELD_REVIEW"
  };
}

export async function getUnifiedCrmCustomerListOpportunityDiscoveries(
  actor: AuthenticatedUser | null,
  dependencies: Omit<Dependencies, "customer"> & {
    customers: readonly Pick<UnifiedCrmCustomerListItem, "displayName" | "id">[];
  }
): Promise<UnifiedCrmCustomerListOpportunityDiscoveryCollectionModel> {
  const generatedAt = (dependencies.now?.() ?? new Date()).toISOString();
  const listHref = sanitizeListHref(dependencies.listHref);
  const opportunityAccess = dependencies.opportunityAccessContext ?? await requireUnifiedCrmOpportunityDetailAccess(actor, dependencies);
  const opportunityDiscovery: UnifiedCrmOpportunityDiscoveryModel = await getUnifiedCrmOpportunityDiscovery(actor, {
    accessContext: opportunityAccess,
    mode: dependencies.mode,
    nodeEnv: dependencies.nodeEnv,
    now: dependencies.now,
    scopeRepository: dependencies.scopeRepository,
    shellMode: dependencies.shellMode
  });

  const byCustomerId = Object.freeze(Object.fromEntries(
    dependencies.customers.map((customer) => [
      customer.id,
      buildCustomerDiscoveryModel({
        customer,
        generatedAt,
        listHref,
        opportunityDiscovery
      })
    ])
  ));

  return {
    byCustomerId,
    contractVersion: UNIFIED_CRM_CUSTOMER_LIST_OPPORTUNITY_DISCOVERY_CONTRACT_VERSION,
    generatedAt,
    listHref,
    source: {
      authority: "CUSTOMERS",
      href: listHref,
      label: "Customer list opportunity discovery",
      observedAt: generatedAt
    },
    state: "HELD_REVIEW"
  };
}

export async function getUnifiedCrmCustomerListOpportunityDiscovery(
  actor: AuthenticatedUser | null,
  dependencies: Dependencies
): Promise<UnifiedCrmCustomerListOpportunityDiscoveryModel> {
  const collection = await getUnifiedCrmCustomerListOpportunityDiscoveries(actor, {
    ...dependencies,
    customers: [dependencies.customer]
  });
  return collection.byCustomerId[dependencies.customer.id]!;
}
