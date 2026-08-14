import { UnifiedCrmShell, UnifiedCrmUnavailable } from "@/features/unified-crm/unified-crm-shell";
import { parseUnifiedCrmView } from "@/features/unified-crm/unified-crm-shell-review-model";
import { requireCurrentUser } from "@/server/auth/current-user";
import { resolveUnifiedCrmShellAccess } from "@/server/unified-crm/shell-access";

type CrmPageProps = {
  searchParams: Promise<{ selected?: string | string[]; view?: string | string[] }>;
};

function safeFallback(value: string | undefined) {
  return value?.startsWith("/") && !value.startsWith("//") ? value : "/my-tasks";
}

function unavailableMessage(reason: string) {
  if (reason === "SHELL_OFF") return "Unified CRM is turned off. Your existing workspace remains available.";
  if (reason === "WORKSPACE_NOT_ELIGIBLE" || reason === "CAPABILITY_NOT_GRANTED") {
    return "This CRM experience is not enabled for your current workspace.";
  }
  if (reason === "INACTIVE_USER" || reason === "AUTHENTICATION_REQUIRED") {
    return "Your current session cannot open this CRM experience.";
  }
  return "Unified CRM is temporarily unavailable. Your existing workspace remains available.";
}

export default async function CrmPage({ searchParams }: CrmPageProps) {
  const user = await requireCurrentUser();
  const [parameters, access] = await Promise.all([
    searchParams,
    resolveUnifiedCrmShellAccess(user)
  ]);

  if (!access.allowed || access.mode !== "REVIEW") {
    return (
      <UnifiedCrmUnavailable
        fallbackHref={safeFallback(access.fallbackHref)}
        reason={unavailableMessage(access.reason)}
      />
    );
  }

  return (
    <UnifiedCrmShell
      activeView={parseUnifiedCrmView(parameters.view)}
      capabilities={access.capabilities}
      initialSelectedId={Array.isArray(parameters.selected) ? parameters.selected[0] : parameters.selected}
      userName={user.name}
    />
  );
}
