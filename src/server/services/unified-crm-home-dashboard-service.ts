import type { AuthenticatedUser } from "@/server/auth/store";
import { requireUnifiedCrmCustomerReadPolicy } from "@/server/policies/unified-crm-customer-read";
import {
  createUnifiedCrmHomeDashboardRepository,
  type UnifiedCrmHomeDashboardRepository
} from "@/server/repositories/unified-crm-home-dashboard-repository";
import {
  UNIFIED_CRM_HOME_DASHBOARD_CONTRACT_VERSION,
  type UnifiedCrmHomeDashboardMetric,
  type UnifiedCrmHomeDashboardReadModel
} from "@/server/unified-crm/home-dashboard-contract";
import { UnifiedCrmWorkReadError } from "@/server/unified-crm/work-queue-contract";

type UnifiedCrmHomeDashboardDependencies = {
  now?: () => Date;
  repository?: UnifiedCrmHomeDashboardRepository;
};

function metric(
  id: UnifiedCrmHomeDashboardMetric["id"],
  label: string,
  value: number,
  detail: string,
  href: string
): UnifiedCrmHomeDashboardMetric {
  return {
    detail,
    href,
    id,
    label,
    state: value > 0 ? "READY" : "EMPTY",
    value
  };
}

export async function getUnifiedCrmHomeDashboard(
  actor: AuthenticatedUser | null,
  dependencies: UnifiedCrmHomeDashboardDependencies = {}
): Promise<UnifiedCrmHomeDashboardReadModel> {
  const recordScope = requireUnifiedCrmCustomerReadPolicy(actor);
  const repository = dependencies.repository ?? createUnifiedCrmHomeDashboardRepository();
  const now = dependencies.now?.() ?? new Date();
  const organizationIds = await repository.listActiveOrganizationIds(actor!.id, now);
  if (organizationIds.length === 0) {
    throw new UnifiedCrmWorkReadError("ORGANIZATION_SCOPE_UNAVAILABLE", "CRM home is not available for this viewer.");
  }
  if (organizationIds.length > 1) {
    throw new UnifiedCrmWorkReadError("ORGANIZATION_SCOPE_AMBIGUOUS", "Select one authorized organization before opening CRM home.");
  }

  const counts = await repository.loadCounts({
    now,
    organizationId: organizationIds[0],
    recordScope,
    viewerUserId: actor!.id
  });
  const observedAt = now.toISOString();
  const metrics = [
    metric("ownedWork", recordScope.kind === "ORGANIZATION" ? "Team work" : "Owned work", counts.openOpportunityCount, "Open CRM opportunities that need sales follow-through.", "/crm?view=work"),
    metric("overdueFollowUp", "Overdue follow-up", counts.overdueFollowUpCount, "Open opportunities with a next action already past due.", "/crm/opportunities/queue?crmReturnTo=%2Fcrm"),
    metric("pipeline", "Pipeline", counts.openOpportunityCount, "Active opportunities before won/lost closure.", "/crm?view=pipeline"),
    metric("quotes", "Quotes", counts.quoteCount, "Draft or presented quotes visible in this CRM scope.", "/crm/quotes?crmReturnTo=%2Fcrm"),
    metric("dispatchHandoffs", "Dispatch handoffs", counts.dispatchHandoffCount, "CRM opportunities linked to operational dispatch work.", "/crm/opportunities?crmReturnTo=%2Fcrm")
  ];

  return {
    contractVersion: UNIFIED_CRM_HOME_DASHBOARD_CONTRACT_VERSION,
    freshness: {
      newestRecordUpdatedAt: counts.newestRecordUpdatedAt?.toISOString() ?? null,
      observedAt,
      status: "CURRENT"
    },
    generatedAt: observedAt,
    metrics,
    state: metrics.some((item) => item.value > 0) ? "READY" : "EMPTY",
    visibility: recordScope.kind === "ORGANIZATION" ? "organization" : "owned"
  };
}
