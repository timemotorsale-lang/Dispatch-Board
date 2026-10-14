import { UnifiedCrmUnavailable } from "@/features/unified-crm/unified-crm-shell";
import { UnifiedCrmQuoteVersionReview } from "@/features/unified-crm/unified-crm-quote-version-review";
import { requireCurrentUser } from "@/server/auth/current-user";
import { getUnifiedCrmQuoteVersionReview } from "@/server/services/unified-crm-quote-draft-service";
import type { UnifiedCrmQuoteVersionReviewModel } from "@/server/unified-crm/quote-version-review-contract";
import { resolveUnifiedCrmShellAccess } from "@/server/unified-crm/shell-access";

type Props = {
  params: Promise<{ quoteId: string }>;
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

function safeReturn(value: string | string[] | undefined) {
  if (Array.isArray(value)) return "/crm/quotes";
  if (value === "/crm/quotes" || value?.startsWith("/crm/quotes?")) return value;
  return "/crm/quotes";
}

export default async function UnifiedCrmQuoteVersionReviewPage({ params, searchParams }: Props) {
  const user = await requireCurrentUser();
  const shellAccess = resolveUnifiedCrmShellAccess(user);
  if (!shellAccess.allowed || shellAccess.mode !== "REVIEW") {
    return <UnifiedCrmUnavailable fallbackHref={safeFallback(shellAccess.fallbackHref)} reason={unavailableMessage(shellAccess.reason)} />;
  }

  const route = await params;
  const query = await searchParams;
  const returnHref = safeReturn(query.crmReturnTo);
  let model: UnifiedCrmQuoteVersionReviewModel | undefined;
  let failure: { kind: "error" | "restricted" | "unavailable"; message?: string } | undefined;

  try {
    model = await getUnifiedCrmQuoteVersionReview(user, route.quoteId);
  } catch (error) {
    const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";
    if (["AUTHENTICATION_REQUIRED", "QUOTE_NOT_AUTHORIZED", "ORGANIZATION_SCOPE_UNAVAILABLE", "QUOTE_NOT_AVAILABLE"].includes(code)) {
      failure = { kind: "restricted", message: "Your current CRM access does not include this quote version review." };
    } else if (["QUOTE_OFF", "ORGANIZATION_SCOPE_AMBIGUOUS", "QUOTE_DRAFT_OFF"].includes(code)) {
      failure = { kind: "unavailable", message: "Quote version review is temporarily unavailable. No quote version data was displayed." };
    } else {
      failure = { kind: "error", message: "Quote version review could not be loaded safely. No quote version data was displayed." };
    }
  }

  return <UnifiedCrmQuoteVersionReview errorMessage={failure?.message} failureKind={failure?.kind} model={model} returnHref={returnHref} />;
}
