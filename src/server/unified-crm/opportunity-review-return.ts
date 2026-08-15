const DEFAULT_PIPELINE_RETURN = "/crm?view=pipeline" as const;
const DEFAULT_CUSTOMER_LIST_RETURN = "/crm?view=customers" as const;

function safeCustomerListReturn(value: string | null) {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) return DEFAULT_CUSTOMER_LIST_RETURN;
  try {
    const url = new URL(value, "http://crm.local");
    if (url.pathname !== "/crm" || url.searchParams.get("view") !== "customers") return DEFAULT_CUSTOMER_LIST_RETURN;
    if ([...url.searchParams.keys()].some((key) => !["view", "q", "status", "owner", "cursor"].includes(key))) return DEFAULT_CUSTOMER_LIST_RETURN;
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
    return DEFAULT_CUSTOMER_LIST_RETURN;
  }
}

export function safeUnifiedCrmOpportunityReturn(value: string | string[] | undefined) {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) return DEFAULT_PIPELINE_RETURN;
  try {
    const url = new URL(value, "http://crm.local");
    if (url.pathname === "/crm") {
      if (url.searchParams.get("view") !== "pipeline") return DEFAULT_PIPELINE_RETURN;
      if ([...url.searchParams.keys()].some((key) => key !== "view")) return DEFAULT_PIPELINE_RETURN;
      return DEFAULT_PIPELINE_RETURN;
    }

    const customerMatch = url.pathname.match(/^\/crm\/customers\/([^/]+)$/);
    if (!customerMatch) return DEFAULT_PIPELINE_RETURN;
    if ([...url.searchParams.keys()].some((key) => key !== "crmReturnTo")) return DEFAULT_PIPELINE_RETURN;
    const customerId = decodeURIComponent(customerMatch[1] ?? "").trim();
    if (!customerId || customerId.length > 128) return DEFAULT_PIPELINE_RETURN;
    const nestedReturn = safeCustomerListReturn(url.searchParams.get("crmReturnTo"));
    return `/crm/customers/${encodeURIComponent(customerId)}?crmReturnTo=${encodeURIComponent(nestedReturn)}`;
  } catch {
    return DEFAULT_PIPELINE_RETURN;
  }
}
