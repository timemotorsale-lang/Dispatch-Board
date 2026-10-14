export const DEFAULT_UNIFIED_CRM_OPPORTUNITY_RETURN = "/crm?view=pipeline" as const;
export const DEFAULT_UNIFIED_CRM_CUSTOMER_LIST_RETURN = "/crm?view=customers" as const;
export const DEFAULT_UNIFIED_CRM_WORK_RETURN = "/crm?view=work" as const;

export function safeUnifiedCrmCustomerListReturn(value: string | null | undefined) {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) return DEFAULT_UNIFIED_CRM_CUSTOMER_LIST_RETURN;
  try {
    const url = new URL(value, "http://crm.local");
    if (url.pathname !== "/crm" || url.searchParams.get("view") !== "customers") return DEFAULT_UNIFIED_CRM_CUSTOMER_LIST_RETURN;
    if ([...url.searchParams.keys()].some((key) => !["view", "q", "status", "owner", "cursor"].includes(key))) return DEFAULT_UNIFIED_CRM_CUSTOMER_LIST_RETURN;
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
    return DEFAULT_UNIFIED_CRM_CUSTOMER_LIST_RETURN;
  }
}

export function safeUnifiedCrmCustomerContextReturn(value: string | null | undefined) {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) {
    return DEFAULT_UNIFIED_CRM_CUSTOMER_LIST_RETURN;
  }
  try {
    const url = new URL(value, "http://crm.local");
    if (url.pathname === "/crm" && url.searchParams.get("view") === "work") {
      if ([...url.searchParams.keys()].some((key) => key !== "view")) return DEFAULT_UNIFIED_CRM_CUSTOMER_LIST_RETURN;
      return DEFAULT_UNIFIED_CRM_WORK_RETURN;
    }
  } catch {
    return DEFAULT_UNIFIED_CRM_CUSTOMER_LIST_RETURN;
  }
  return safeUnifiedCrmCustomerListReturn(value);
}

export function buildUnifiedCrmCustomerReturn(
  customerId: string,
  customerContextReturn: string | null | undefined = DEFAULT_UNIFIED_CRM_CUSTOMER_LIST_RETURN
) {
  const normalizedCustomerId = customerId.trim();
  if (!normalizedCustomerId || normalizedCustomerId.length > 128) {
    return DEFAULT_UNIFIED_CRM_OPPORTUNITY_RETURN;
  }
  const nestedReturn = safeUnifiedCrmCustomerContextReturn(customerContextReturn);
  return `/crm/customers/${encodeURIComponent(normalizedCustomerId)}?crmReturnTo=${encodeURIComponent(nestedReturn)}`;
}

export function withUnifiedCrmOpportunityReturn(href: string, crmReturnTo: string) {
  try {
    const url = new URL(href, "http://crm.local");
    url.searchParams.set("crmReturnTo", crmReturnTo);
    return `${url.pathname}${url.search}`;
  } catch {
    return href;
  }
}

export function safeUnifiedCrmOpportunityReturn(value: string | string[] | undefined) {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) return DEFAULT_UNIFIED_CRM_OPPORTUNITY_RETURN;
  try {
    const url = new URL(value, "http://crm.local");
    if (url.pathname === "/crm") {
      if (url.searchParams.get("view") !== "pipeline") return DEFAULT_UNIFIED_CRM_OPPORTUNITY_RETURN;
      if ([...url.searchParams.keys()].some((key) => key !== "view")) return DEFAULT_UNIFIED_CRM_OPPORTUNITY_RETURN;
      return DEFAULT_UNIFIED_CRM_OPPORTUNITY_RETURN;
    }

    const customerMatch = url.pathname.match(/^\/crm\/customers\/([^/]+)$/);
    if (!customerMatch) return DEFAULT_UNIFIED_CRM_OPPORTUNITY_RETURN;
    if ([...url.searchParams.keys()].some((key) => key !== "crmReturnTo")) return DEFAULT_UNIFIED_CRM_OPPORTUNITY_RETURN;
    const customerId = decodeURIComponent(customerMatch[1] ?? "").trim();
    return buildUnifiedCrmCustomerReturn(customerId, url.searchParams.get("crmReturnTo"));
  } catch {
    return DEFAULT_UNIFIED_CRM_OPPORTUNITY_RETURN;
  }
}
