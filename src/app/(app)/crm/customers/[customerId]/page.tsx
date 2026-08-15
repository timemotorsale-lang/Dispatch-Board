import { UnifiedCrmCustomer360 } from "@/features/unified-crm/unified-crm-customer-360";
import { UnifiedCrmUnavailable } from "@/features/unified-crm/unified-crm-shell";
import { requireCurrentUser } from "@/server/auth/current-user";
import { getUnifiedCrmCustomer360 } from "@/server/services/unified-crm-customer-360-service";
import { getUnifiedCrmCustomerOpportunityDiscovery } from "@/server/services/unified-crm-customer-opportunity-discovery-service";
import type { UnifiedCrmCustomer360ReadModel } from "@/server/unified-crm/customer-360-contract";
import type { UnifiedCrmCustomerOpportunityDiscoveryModel } from "@/server/unified-crm/customer-opportunity-discovery-contract";
import { requireUnifiedCrmCustomer360Access } from "@/server/unified-crm/customer-360-access";
import { resolveUnifiedCrmShellAccess } from "@/server/unified-crm/shell-access";

type CustomerPageProps = {
  params: Promise<{ customerId: string }>;
  searchParams: Promise<{ crmReturnTo?: string | string[] }>;
};

const DEFAULT_RETURN = "/crm?view=customers";

function safeFallback(value: string | undefined) {
  return value?.startsWith("/") && !value.startsWith("//") ? value : "/my-tasks";
}

function unavailableMessage(reason: string) {
  if (reason === "SHELL_OFF") return "Unified CRM is turned off. Your existing workspace remains available.";
  if (reason === "WORKSPACE_NOT_ELIGIBLE" || reason === "CAPABILITY_NOT_GRANTED") return "This CRM experience is not enabled for your current workspace.";
  if (reason === "INACTIVE_USER" || reason === "AUTHENTICATION_REQUIRED") return "Your current session cannot open this CRM experience.";
  return "Unified CRM is temporarily unavailable. Your existing workspace remains available.";
}

export function safeCrmCustomerReturn(value: string | string[] | undefined) {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) return DEFAULT_RETURN;
  try {
    const url = new URL(value, "http://crm.local");
    if (url.pathname !== "/crm" || url.searchParams.get("view") !== "customers") return DEFAULT_RETURN;
    if ([...url.searchParams.keys()].some((key) => !["view", "q", "status", "owner", "cursor"].includes(key))) return DEFAULT_RETURN;
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
    return DEFAULT_RETURN;
  }
}

export default async function UnifiedCrmCustomerPage({ params, searchParams }: CustomerPageProps) {
  const user = await requireCurrentUser();
  const access = await resolveUnifiedCrmShellAccess(user);
  if (!access.allowed || access.mode !== "REVIEW") {
    return <UnifiedCrmUnavailable fallbackHref={safeFallback(access.fallbackHref)} reason={unavailableMessage(access.reason)} />;
  }

  const [route, query] = await Promise.all([params, searchParams]);
  const returnHref = safeCrmCustomerReturn(query.crmReturnTo);
  let model: UnifiedCrmCustomer360ReadModel | undefined;
  let opportunityDiscovery: UnifiedCrmCustomerOpportunityDiscoveryModel | undefined;
  let failure: { kind: "error" | "not-available" | "restricted" | "unavailable"; message?: string } | undefined;
  try {
    requireUnifiedCrmCustomer360Access(user);
    model = await getUnifiedCrmCustomer360(user, route.customerId);
    try {
      opportunityDiscovery = await getUnifiedCrmCustomerOpportunityDiscovery(user, route.customerId, {
        customer360: model,
        customerHref: `/crm/customers/${encodeURIComponent(model.identity.id)}?crmReturnTo=${encodeURIComponent(returnHref)}`,
        customerListHref: returnHref
      });
    } catch {
      opportunityDiscovery = undefined;
    }
  } catch (error) {
    const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";
    if (["CUSTOMER_NOT_AVAILABLE", "INVALID_CUSTOMER_ID"].includes(code)) {
      failure = { kind: "not-available" };
    } else if (["AUTHENTICATION_REQUIRED", "CUSTOMER_360_NOT_AUTHORIZED", "ORGANIZATION_SCOPE_UNAVAILABLE"].includes(code)) {
      failure = { kind: "restricted", message: "Your current CRM access does not include this customer record." };
    } else if (["CUSTOMER_360_OFF", "CUSTOMER_SOURCE_UNAVAILABLE", "ORGANIZATION_SCOPE_AMBIGUOUS"].includes(code)) {
      failure = { kind: "unavailable", message: "Customer details are temporarily unavailable. No customer details were displayed." };
    } else {
      failure = { kind: "error", message: "Customer details could not be loaded safely. No customer details were displayed." };
    }
  }
  return <UnifiedCrmCustomer360 errorMessage={failure?.message} failureKind={failure?.kind} model={model} opportunityDiscovery={opportunityDiscovery} returnHref={returnHref} />;
}
