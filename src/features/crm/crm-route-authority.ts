export const CRM_NEXT_HOME_HREF = "/crm-next";
export const CRM_NEXT_CUSTOMERS_HREF = "/crm-next/customers";
export const CRM_NEXT_INTAKE_HREF = "/crm-next/new";
export const CRM_NEXT_SEARCH_HREF = "/crm-next/search";
export const CRM_NEXT_APPOINTMENTS_HREF = "/crm-next/appointments";
export const CRM_NEXT_DEALS_HREF = "/crm-next/deals";
export const CRM_NEXT_INTELLIGENCE_HREF = "/crm-next/intelligence-foundation";
export const CRM_NEXT_LEAD_SOURCE_REPORT_HREF = "/crm-next/reports/lead-sources";
export const CRM_NEXT_NEEDS_ATTENTION_HREF = "/crm-next/needs-attention";
export const CRM_NEXT_PIPELINE_HREF = "/crm-next/pipeline";
export const CRM_NEXT_TIMELINE_HREF = "/crm-next/timeline";

export const CRM_CUSTOMER_LANDING_HREF = "/customers";
export const CRM_VENDOR_REGISTRY_HREF = "/customers/vendors";
export const LEGACY_CUSTOMER_ARCHIVE_HREF = "/customers";
export const LEGACY_CUSTOMER_360_HREF = "/customers/customer-360";
export const LEGACY_CRM_FALLBACK_HREF = "/crm";

export function crmNextCustomer360Href(customerId: string) {
  return `${CRM_NEXT_CUSTOMERS_HREF}/${encodeURIComponent(customerId)}`;
}

export function crmNextCustomerSearchHref(query: string) {
  const trimmed = query.trim();
  return trimmed ? `${CRM_NEXT_SEARCH_HREF}?q=${encodeURIComponent(trimmed)}` : CRM_NEXT_SEARCH_HREF;
}

export function crmNextCustomerAppointmentHref(input: {
  customerId?: string;
  customerName: string;
  reason?: string;
  returnTo?: string;
}) {
  const query = new URLSearchParams();
  query.set("action", "new");
  query.set("customerReference", input.customerName.trim());
  query.set("title", `Appointment for ${input.customerName.trim()}`);
  query.set("reason", input.reason?.trim() || "Schedule customer appointment from CRM Next.");
  if (input.customerId) query.set("crmCustomerId", input.customerId);
  if (input.returnTo?.startsWith("/") && !input.returnTo.startsWith("//")) query.set("returnTo", input.returnTo);
  return `/appointments?${query.toString()}`;
}
