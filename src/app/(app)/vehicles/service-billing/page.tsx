import { safeLaborGuideReturnTo } from "@/lib/repair-explorer-context";
import { requireCurrentUser } from "@/server/auth/current-user";
import { ServiceBillingWorkspace } from "@/features/inventory/service-billing-workspace";

export default async function ServiceBillingPage({ searchParams }: { searchParams: Promise<{ repairOrderId?: string; mode?: string; returnTo?: string; estimateId?: string; invoiceId?: string }> }) {
  await requireCurrentUser();
  const params = await searchParams;
  const returnTo = safeLaborGuideReturnTo(params.returnTo);
  return <ServiceBillingWorkspace repairOrderId={params.repairOrderId ?? ""} paymentOnly={params.mode === "payment"} depositOnly={params.mode === "deposit"} invoiceOnly={params.mode === "invoice"}
    estimateId={params.mode === "invoice" ? params.estimateId : undefined}
    invoiceId={params.mode === "payment" ? params.invoiceId : undefined}
    returnTo={returnTo} />;
}
