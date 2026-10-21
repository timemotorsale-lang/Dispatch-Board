import Link from "next/link";

import { ShopPlanningWorkspace } from "@/features/inventory/shop-planning-workspace";
import { EstimateWorkflowNextStep } from "@/features/inventory/estimate-workflow-next-step";
import { requireCurrentUser } from "@/server/auth/current-user";
import { getShopPlanningWorkspace } from "@/server/shop-planning/service";
import { getActiveLaborRate } from "@/server/services/labor-rate-settings";
import { canManageSettings } from "@/server/policies/access";

export default async function ShopPlanningPage({
  searchParams,
}: {
  searchParams?: Promise<{ repairOrderId?: string; estimateId?: string; returnTo?: string; vendorFollowUp?: string }>;
}) {
  const user = await requireCurrentUser();
  const params = searchParams ? await searchParams : {};

  let initial: Awaited<ReturnType<typeof getShopPlanningWorkspace>> | null = null;
  let loadError: string | null = null;

  try {
    initial = await getShopPlanningWorkspace(user);
  } catch (error) {
    loadError = error instanceof Error ? error.message : "Repair planning could not be opened right now.";
  }

  if (!initial) {
    return (
      <section className="technician-workbench-unavailable">
        <span>Repair planning unavailable</span>
        <h1>Continue this repair from the shared workbench</h1>
        <p>{loadError ?? "Repair planning could not be opened right now."}</p>
        <div>
          <Link
            className="pill pill-primary"
            href={
              params.repairOrderId
                ? `/vehicles/repair-workbench?repairOrderId=${encodeURIComponent(params.repairOrderId)}`
                : "/vehicles/repair-workbench?view=all"
            }
          >
            Open Repair Workbench
          </Link>
          <Link className="pill pill-secondary" href="/vehicles/shop-dispatch">
            Open Repair Assignment
          </Link>
        </div>
      </section>
    );
  }

  if (params.repairOrderId) {
    const selected = initial.repairOrders.find(order => order.id === params.repairOrderId);
    if (!selected) return <section><h1>Repair planning unavailable</h1><p role="alert">This repair order is not available for planning. No other vehicle was selected.</p><Link href="/vehicles/recon-repair-advisor">Return to advisor</Link></section>;
    initial.repairOrders = [selected];
  }
  const savedEstimate = params.repairOrderId && params.estimateId
    ? initial.repairOrders[0]?.estimateVersions.find(estimate => estimate.id === params.estimateId)
    : null;

  return (
    <><nav>{savedEstimate && params.repairOrderId ? <EstimateWorkflowNextStep repairOrderId={params.repairOrderId} estimateId={savedEstimate.id} /> : params.estimateId ? <p role="alert">The requested estimate was not found on this RO. Review its current estimates below.</p> : null}<Link href={`/service-documents?repairOrderId=${encodeURIComponent(params.repairOrderId ?? "")}`}>Service documents</Link>{" · "}<Link href={`/vehicles/service-billing?repairOrderId=${encodeURIComponent(params.repairOrderId ?? "")}`}>Native billing</Link></nav><ShopPlanningWorkspace
      initial={JSON.parse(JSON.stringify(initial))}
      defaultLaborRate={(await getActiveLaborRate(user)).laborRate}
      canOverrideLaborRate={canManageSettings(user)}
      returnTo={params.returnTo}
      vendorFollowUp={params.vendorFollowUp === "1" || params.vendorFollowUp === "true"}
    /></>
  );
}
