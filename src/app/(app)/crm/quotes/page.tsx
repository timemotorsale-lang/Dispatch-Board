import { UnifiedCrmQuoteFoundation } from "@/features/unified-crm/unified-crm-quote-foundation";
import { UnifiedCrmUnavailable } from "@/features/unified-crm/unified-crm-shell";
import { requireCurrentUser } from "@/server/auth/current-user";
import { getUnifiedCrmQuoteFoundation } from "@/server/services/unified-crm-quote-foundation-service";
import type { UnifiedCrmQuoteFoundationModel } from "@/server/unified-crm/quote-foundation-contract";
import { requireUnifiedCrmQuoteAccess } from "@/server/unified-crm/quote-access";
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

export function safeCrmQuoteReturn(value: string | string[] | undefined) {
  if (Array.isArray(value)) return "/crm?view=more";
  if (value === "/crm?view=more" || value === "/crm?view=pipeline") return value;
  return "/crm?view=more";
}

export default async function UnifiedCrmQuotePage({ searchParams }: Props) {
  const user = await requireCurrentUser();
  const shellAccess = resolveUnifiedCrmShellAccess(user);
  if (!shellAccess.allowed || shellAccess.mode !== "REVIEW") {
    return <UnifiedCrmUnavailable fallbackHref={safeFallback(shellAccess.fallbackHref)} reason={unavailableMessage(shellAccess.reason)} />;
  }

  const query = await searchParams;
  const returnHref = safeCrmQuoteReturn(query.crmReturnTo);
  let model: UnifiedCrmQuoteFoundationModel | undefined;
  let failure: { kind: "error" | "restricted" | "unavailable"; message?: string } | undefined;

  try {
    const access = await requireUnifiedCrmQuoteAccess(user);
    model = await getUnifiedCrmQuoteFoundation(user, { accessContext: access });
  } catch (error) {
    const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";
    if (["AUTHENTICATION_REQUIRED", "QUOTE_NOT_AUTHORIZED", "ORGANIZATION_SCOPE_UNAVAILABLE"].includes(code)) {
      failure = { kind: "restricted", message: "Your current CRM access does not include quote foundation review." };
    } else if (["QUOTE_OFF", "ORGANIZATION_SCOPE_AMBIGUOUS"].includes(code)) {
      failure = { kind: "unavailable", message: "Quote foundation review is temporarily unavailable. No quote foundation data was displayed." };
    } else {
      failure = { kind: "error", message: "Quote foundation review could not be loaded safely. No quote foundation data was displayed." };
    }
  }

  return <UnifiedCrmQuoteFoundation errorMessage={failure?.message} failureKind={failure?.kind} model={model} returnHref={returnHref} />;
}
