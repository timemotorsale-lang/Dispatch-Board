import { UnifiedCrmShell, UnifiedCrmUnavailable } from "@/features/unified-crm/unified-crm-shell";
import { parseUnifiedCrmView } from "@/features/unified-crm/unified-crm-shell-review-model";
import { requireCurrentUser } from "@/server/auth/current-user";
import { getUnifiedCrmCustomerList } from "@/server/services/unified-crm-customer-read-service";
import { resolveUnifiedCrmShellAccess } from "@/server/unified-crm/shell-access";

type CrmPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
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

  const activeView = parseUnifiedCrmView(parameters.view);
  let customerList;
  let customerListError: string | undefined;
  let customerListFailureKind: "error" | "restricted" | "unavailable" | undefined;

  if (activeView === "customers") {
    try {
      customerList = await getUnifiedCrmCustomerList(user, {
        cursor: parameters.cursor,
        owner: access.workspace === "SALES" ? "mine" : parameters.owner,
        q: parameters.q,
        status: parameters.status
      });
    } catch (error) {
      const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";
      if (["AUTHENTICATION_REQUIRED", "CUSTOMER_READ_NOT_AUTHORIZED", "ORGANIZATION_SCOPE_UNAVAILABLE"].includes(code)) {
        customerListFailureKind = "restricted";
        customerListError = "Your current access does not include CRM customer records.";
      } else if (["CUSTOMER_READ_OFF", "CUSTOMER_SOURCE_UNAVAILABLE", "ORGANIZATION_SCOPE_AMBIGUOUS"].includes(code)) {
        customerListFailureKind = "unavailable";
        customerListError = "The customer source is temporarily unavailable. No customer data was displayed.";
      } else {
        customerListFailureKind = "error";
        customerListError = "The customer list could not be loaded safely. No customer data was displayed.";
      }
    }
  }

  return (
    <UnifiedCrmShell
      activeView={activeView}
      capabilities={access.capabilities}
      customerList={customerList}
      customerListError={customerListError}
      customerListFailureKind={customerListFailureKind}
      initialSelectedId={Array.isArray(parameters.selected) ? parameters.selected[0] : parameters.selected}
      userName={user.name}
    />
  );
}
