import type { UnifiedCrmOpportunityAccessContext } from "@/server/unified-crm/opportunity-contract";

export const UNIFIED_CRM_OPPORTUNITY_PIPELINE_RETURN_HREF = "/crm?view=pipeline" as const;
export const UNIFIED_CRM_OPPORTUNITY_PIPELINE_RETURN_QUERY = "%2Fcrm%3Fview%3Dpipeline" as const;

export type UnifiedCrmOpportunityWorkspaceVisibility = "organization" | "owned";

export type UnifiedCrmOpportunityWorkspaceOrientation = {
  source: {
    href: typeof UNIFIED_CRM_OPPORTUNITY_PIPELINE_RETURN_HREF;
    label: string;
    observedAt: string;
  };
  visibility: UnifiedCrmOpportunityWorkspaceVisibility;
  visibilityLabel: "organization review" | "owned review";
};

export function getUnifiedCrmOpportunityWorkspaceVisibility(
  access: UnifiedCrmOpportunityAccessContext
): UnifiedCrmOpportunityWorkspaceVisibility {
  return access.recordScope.kind === "ORGANIZATION" ? "organization" : "owned";
}

export function getUnifiedCrmOpportunityWorkspaceVisibilityLabel(
  visibility: UnifiedCrmOpportunityWorkspaceVisibility
): UnifiedCrmOpportunityWorkspaceOrientation["visibilityLabel"] {
  return visibility === "organization" ? "organization review" : "owned review";
}

export function createUnifiedCrmOpportunityWorkspaceOrientation(
  access: UnifiedCrmOpportunityAccessContext,
  options: {
    generatedAt: string;
    sourceLabel: string;
  }
): UnifiedCrmOpportunityWorkspaceOrientation {
  const visibility = getUnifiedCrmOpportunityWorkspaceVisibility(access);
  return {
    source: {
      href: UNIFIED_CRM_OPPORTUNITY_PIPELINE_RETURN_HREF,
      label: options.sourceLabel,
      observedAt: options.generatedAt
    },
    visibility,
    visibilityLabel: getUnifiedCrmOpportunityWorkspaceVisibilityLabel(visibility)
  };
}

export function buildUnifiedCrmOpportunityReviewHref(
  target: "pipeline" | "queue" | "create" | "detail" | "transition",
  opportunityId = "review01"
) {
  if (target === "pipeline") return UNIFIED_CRM_OPPORTUNITY_PIPELINE_RETURN_HREF;
  if (target === "queue") {
    return `/crm/opportunities/queue?crmReturnTo=${UNIFIED_CRM_OPPORTUNITY_PIPELINE_RETURN_QUERY}`;
  }
  if (target === "create") {
    return `/crm/opportunities/new?crmReturnTo=${UNIFIED_CRM_OPPORTUNITY_PIPELINE_RETURN_QUERY}`;
  }
  if (target === "detail") {
    return `/crm/opportunities/${encodeURIComponent(opportunityId)}?crmReturnTo=${UNIFIED_CRM_OPPORTUNITY_PIPELINE_RETURN_QUERY}`;
  }
  return `/crm/opportunities/${encodeURIComponent(opportunityId)}/transition?crmReturnTo=${UNIFIED_CRM_OPPORTUNITY_PIPELINE_RETURN_QUERY}`;
}
