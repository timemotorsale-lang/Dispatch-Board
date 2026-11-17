import { requireCurrentUser } from "@/server/auth/current-user";
import { ServiceBillingWorkspace } from "@/features/inventory/service-billing-workspace";

export default async function ServiceBillingPage({ searchParams }: { searchParams: Promise<{ repairOrderId?: string; mode?: string }> }) {
  await requireCurrentUser();
  const params = await searchParams;
  return <ServiceBillingWorkspace repairOrderId={params.repairOrderId ?? ""} paymentOnly={params.mode === "payment"} />;
}
