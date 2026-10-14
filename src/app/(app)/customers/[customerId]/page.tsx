import { redirect } from "next/navigation";

import { crmNextCustomer360Href } from "@/features/crm/crm-route-authority";

export default async function CustomerDetailPage({ params }: { params: Promise<{ customerId: string }> }) {
  const { customerId } = await params;
  redirect(crmNextCustomer360Href(customerId));
}
