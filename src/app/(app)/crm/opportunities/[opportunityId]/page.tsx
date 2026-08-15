import { UnifiedCrmOpportunityDetail } from "@/features/unified-crm/unified-crm-opportunity-detail";
import { UnifiedCrmUnavailable } from "@/features/unified-crm/unified-crm-shell";
import { requireCurrentUser } from "@/server/auth/current-user";
import { getUnifiedCrmOpportunityDetail } from "@/server/services/unified-crm-opportunity-detail-service";
import type { UnifiedCrmOpportunityDetailReadModel } from "@/server/unified-crm/opportunity-detail-contract";
import { requireUnifiedCrmOpportunityDetailAccess } from "@/server/unified-crm/opportunity-detail-access";
import { resolveUnifiedCrmShellAccess } from "@/server/unified-crm/shell-access";

type OpportunityPageProps = {
  params: Promise<{ opportunityId: string }>;
  searchParams: Promise<{ crmReturnTo?: string | string[] }>;
};

const DEFAULT_RETURN = "/crm?view=pipeline";

function safeFallback(value: string | undefined) {
  return value?.startsWith("/") && !value.startsWith("//") ? value : "/my-tasks";
}

function unavailableMessage(reason: string) {
  if (reason === "SHELL_OFF") return "Unified CRM is turned off. Your existing workspace remains available.";
  if (reason === "WORKSPACE_NOT_ELIGIBLE" || reason === "CAPABILITY_NOT_GRANTED") return "This CRM experience is not enabled for your current workspace.";
  if (reason === "INACTIVE_USER" || reason === "AUTHENTICATION_REQUIRED") return "Your current session cannot open this CRM experience.";
  return "Unified CRM is temporarily unavailable. Your existing workspace remains available.";
}

export function safeCrmOpportunityReturn(value: string | string[] | undefined) {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) return DEFAULT_RETURN;
  try {
    const url = new URL(value, "http://crm.local");
    if (url.pathname !== "/crm" || url.searchParams.get("view") !== "pipeline") return DEFAULT_RETURN;
    if ([...url.searchParams.keys()].some((key) => key !== "view")) return DEFAULT_RETURN;
    return "/crm?view=pipeline";
  } catch {
    return DEFAULT_RETURN;
  }
}

export default async function UnifiedCrmOpportunityPage({ params, searchParams }: OpportunityPageProps) {
  const user = await requireCurrentUser();
  const shellAccess = resolveUnifiedCrmShellAccess(user);
  if (!shellAccess.allowed || shellAccess.mode !== "REVIEW") {
    return <UnifiedCrmUnavailable fallbackHref={safeFallback(shellAccess.fallbackHref)} reason={unavailableMessage(shellAccess.reason)} />;
  }

  const [route, query] = await Promise.all([params, searchParams]);
  const returnHref = safeCrmOpportunityReturn(query.crmReturnTo);
  let model: UnifiedCrmOpportunityDetailReadModel | undefined;
  let failure: { kind: "error" | "not-available" | "restricted" | "unavailable"; message?: string } | undefined;

  try {
    const access = await requireUnifiedCrmOpportunityDetailAccess(user);
    model = await getUnifiedCrmOpportunityDetail(user, route.opportunityId, { accessContext: access });
  } catch (error) {
    const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";
    if (["INVALID_OPPORTUNITY_ID"].includes(code)) {
      failure = { kind: "not-available" };
    } else if (["AUTHENTICATION_REQUIRED", "OPPORTUNITY_NOT_AUTHORIZED", "ORGANIZATION_SCOPE_UNAVAILABLE"].includes(code)) {
      failure = { kind: "restricted", message: "Your current CRM access does not include this opportunity detail." };
    } else if (["OPPORTUNITY_OFF", "ORGANIZATION_SCOPE_AMBIGUOUS"].includes(code)) {
      failure = { kind: "unavailable", message: "Opportunity detail is temporarily unavailable. No opportunity detail was displayed." };
    } else {
      failure = { kind: "error", message: "Opportunity detail could not be loaded safely. No opportunity detail was displayed." };
    }
  }

  return <UnifiedCrmOpportunityDetail errorMessage={failure?.message} failureKind={failure?.kind} model={model} returnHref={returnHref} />;
}
