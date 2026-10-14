import { UnifiedCrmOpportunityTransitionReview } from "@/features/unified-crm/unified-crm-opportunity-transition-review";
import { UnifiedCrmUnavailable } from "@/features/unified-crm/unified-crm-shell";
import { requireCurrentUser } from "@/server/auth/current-user";
import { getUnifiedCrmOpportunityTransitionReview } from "@/server/services/unified-crm-opportunity-transition-service";
import type { UnifiedCrmOpportunityTransitionReviewModel } from "@/server/unified-crm/opportunity-transition-contract";
import { requireUnifiedCrmOpportunityDetailAccess } from "@/server/unified-crm/opportunity-detail-access";
import { safeUnifiedCrmOpportunityReturn } from "@/server/unified-crm/opportunity-review-return";
import { resolveUnifiedCrmShellAccess } from "@/server/unified-crm/shell-access";

type Props = {
  params: Promise<{ opportunityId: string }>;
  searchParams: Promise<{ crmReturnTo?: string | string[] }>;
};

function safeFallback(value: string | undefined) {
  return value?.startsWith("/") && !value.startsWith("//") ? value : "/my-tasks";
}

function unavailableMessage(reason: string) {
  if (reason === "SHELL_OFF") return "Unified CRM is turned off. Your existing workspace remains available.";
  if (reason === "WORKSPACE_NOT_ELIGIBLE" || reason === "CAPABILITY_NOT_GRANTED") return "This CRM experience is not enabled for your current workspace.";
  if (reason === "INACTIVE_USER" || reason === "AUTHENTICATION_REQUIRED") return "Your current session cannot open this CRM experience.";
  return "Unified CRM is temporarily unavailable. Your existing workspace remains available.";
}

export default async function UnifiedCrmOpportunityTransitionPage({ params, searchParams }: Props) {
  const user = await requireCurrentUser();
  const shellAccess = resolveUnifiedCrmShellAccess(user);
  if (!shellAccess.allowed || shellAccess.mode !== "REVIEW") {
    return <UnifiedCrmUnavailable fallbackHref={safeFallback(shellAccess.fallbackHref)} reason={unavailableMessage(shellAccess.reason)} />;
  }

  const [route, query] = await Promise.all([params, searchParams]);
  const returnHref = safeUnifiedCrmOpportunityReturn(query.crmReturnTo);
  let model: UnifiedCrmOpportunityTransitionReviewModel | undefined;
  let failure: { kind: "error" | "restricted" | "unavailable"; message?: string } | undefined;

  try {
    const access = await requireUnifiedCrmOpportunityDetailAccess(user);
    model = await getUnifiedCrmOpportunityTransitionReview(user, route.opportunityId, { accessContext: access });
  } catch (error) {
    const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";
    if (["AUTHENTICATION_REQUIRED", "OPPORTUNITY_NOT_AUTHORIZED", "ORGANIZATION_SCOPE_UNAVAILABLE"].includes(code)) {
      failure = { kind: "restricted", message: "Your current CRM access does not include opportunity transition review." };
    } else if (["OPPORTUNITY_OFF", "ORGANIZATION_SCOPE_AMBIGUOUS", "INVALID_OPPORTUNITY_ID"].includes(code)) {
      failure = { kind: "unavailable", message: "Opportunity transition review is temporarily unavailable. No transition review data was displayed." };
    } else {
      failure = { kind: "error", message: "Opportunity transition review could not be loaded safely. No transition review data was displayed." };
    }
  }

  return <UnifiedCrmOpportunityTransitionReview errorMessage={failure?.message} failureKind={failure?.kind} model={model} returnHref={returnHref} />;
}
