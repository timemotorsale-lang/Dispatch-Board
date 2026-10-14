import { UnifiedCrmOpportunityReviewHub } from "@/features/unified-crm/unified-crm-opportunity-review-hub";
import { UnifiedCrmUnavailable } from "@/features/unified-crm/unified-crm-shell";
import { requireCurrentUser } from "@/server/auth/current-user";
import { getUnifiedCrmOpportunityReviewHub } from "@/server/services/unified-crm-opportunity-review-hub-service";
import type { UnifiedCrmOpportunityReviewHubModel } from "@/server/unified-crm/opportunity-review-hub-contract";
import { requireUnifiedCrmOpportunityDetailAccess } from "@/server/unified-crm/opportunity-detail-access";
import { safeUnifiedCrmOpportunityReturn } from "@/server/unified-crm/opportunity-review-return";
import { resolveUnifiedCrmShellAccess } from "@/server/unified-crm/shell-access";

type Props = {
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

export default async function UnifiedCrmOpportunityHubPage({ searchParams }: Props) {
  const user = await requireCurrentUser();
  const shellAccess = resolveUnifiedCrmShellAccess(user);
  if (!shellAccess.allowed || shellAccess.mode !== "REVIEW") {
    return <UnifiedCrmUnavailable fallbackHref={safeFallback(shellAccess.fallbackHref)} reason={unavailableMessage(shellAccess.reason)} />;
  }

  const query = await searchParams;
  const returnHref = safeUnifiedCrmOpportunityReturn(query.crmReturnTo);
  let model: UnifiedCrmOpportunityReviewHubModel | undefined;
  let failure: { kind: "error" | "restricted" | "unavailable"; message?: string } | undefined;

  try {
    const access = await requireUnifiedCrmOpportunityDetailAccess(user);
    model = await getUnifiedCrmOpportunityReviewHub(user, { accessContext: access });
  } catch (error) {
    const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";
    if (["AUTHENTICATION_REQUIRED", "OPPORTUNITY_NOT_AUTHORIZED", "ORGANIZATION_SCOPE_UNAVAILABLE"].includes(code)) {
      failure = { kind: "restricted", message: "Your current CRM access does not include the opportunity review hub." };
    } else if (["OPPORTUNITY_OFF", "ORGANIZATION_SCOPE_AMBIGUOUS"].includes(code)) {
      failure = { kind: "unavailable", message: "Opportunity review hub is temporarily unavailable. No opportunity review hub data was displayed." };
    } else {
      failure = { kind: "error", message: "Opportunity review hub could not be loaded safely. No opportunity review hub data was displayed." };
    }
  }

  return <UnifiedCrmOpportunityReviewHub errorMessage={failure?.message} failureKind={failure?.kind} model={model} returnHref={returnHref} />;
}
