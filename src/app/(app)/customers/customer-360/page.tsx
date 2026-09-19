import { redirect } from "next/navigation";

import { CRM_NEXT_CUSTOMERS_HREF, crmNextCustomer360Href, crmNextCustomerSearchHref } from "@/features/crm/crm-route-authority";

export default async function Customer360Page({
  searchParams
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const customerId = Array.isArray(params?.customerId) ? params?.customerId[0] : params?.customerId;
  const customerQuery = Array.isArray(params?.customer) ? params?.customer[0] : params?.customer;

  if (customerId) redirect(crmNextCustomer360Href(customerId));
  if (customerQuery) redirect(crmNextCustomerSearchHref(customerQuery));
  redirect(CRM_NEXT_CUSTOMERS_HREF);
}
