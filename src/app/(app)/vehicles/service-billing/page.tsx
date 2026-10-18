import { requireCurrentUser } from "@/server/auth/current-user";
import { ServiceBillingWorkspace } from "@/features/inventory/service-billing-workspace";

export default async function ServiceBillingPage({ searchParams }: { searchParams: Promise<{ repairOrderId?: string }> }) {
  await requireCurrentUser();
  return <ServiceBillingWorkspace repairOrderId={(await searchParams).repairOrderId ?? ""} />;
}
