import Link from "next/link";

import { ServiceClosePartsWorkspace } from "@/features/inventory/service-close-parts-workspace";
import { requireCurrentUser } from "@/server/auth/current-user";
import { getServiceClosePartsWorkspace } from "@/server/service-close-parts/service";
import { getShopReconLifecycleWorkspace } from "@/server/shop-recon/service";
import { safeLaborGuideReturnTo } from "@/lib/repair-explorer-context";
import { scopedRepairOrders } from "@/lib/repair-workflow-review";

export default async function ServiceClosePartsPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requireCurrentUser();
  const params = await searchParams;
  const value = (key: string) => {
    const input = params?.[key];
    return Array.isArray(input) ? input[0] : input;
  };
  const repairOrderId = value("repairOrderId");
  const parallelTask = value("view") === "recon-task";
  const returnTo = safeLaborGuideReturnTo(value("returnTo"));
  let initial: Awaited<ReturnType<typeof getServiceClosePartsWorkspace>> | null = null;
  let loadError: string | null = null;
  try {
    if (parallelTask && (!repairOrderId || !(await getShopReconLifecycleWorkspace(user, repairOrderId)).permissions.canViewParts)) {
      throw new Error("Parts access on this repair order is required.");
    }
    initial = await getServiceClosePartsWorkspace(user);
    if (parallelTask) initial = scopedRepairOrders(initial, repairOrderId);
  } catch (error) {
    loadError = error instanceof Error ? error.message : "Parts purchases could not be opened right now.";
  }
  if (!initial || (parallelTask && !initial.repairOrders.length)) {
    return <section className="technician-workbench-unavailable">
      <span>Parts purchases unavailable</span>
      <h1>Open this repair from the shared workbench</h1>
      <p>{loadError ?? "Parts purchases could not be opened right now."}</p>
      <div>
        {returnTo && <Link className="pill pill-secondary" href={returnTo}>Return to current Shop &amp; Recon task</Link>}
        <Link className="pill pill-primary" href={repairOrderId ? `/vehicles/repair-workbench?repairOrderId=${encodeURIComponent(repairOrderId)}` : "/vehicles/repair-workbench?view=all"}>Open Repair Workbench</Link>
        <Link className="pill pill-secondary" href="/vehicles/shop-dispatch">Open Repair Assignment</Link>
      </div>
    </section>;
  }
  return <>{!parallelTask && <nav><Link href={`/vehicles/service-billing?repairOrderId=${encodeURIComponent(repairOrderId ?? "")}`}>Native billing</Link>{" · "}<Link href={`/service-documents?repairOrderId=${encodeURIComponent(repairOrderId ?? "")}`}>Documents and receipts</Link>{" · "}<Link href="/diagnostics/labor-reports">Labor reports</Link></nav>}<ServiceClosePartsWorkspace initial={JSON.parse(JSON.stringify(initial))} initialRepairOrderId={repairOrderId} parallelTask={parallelTask} reviewOrderId={parallelTask ? repairOrderId : undefined} returnLabel={value("returnLabel")} returnTo={returnTo} /></>;
}
