import Link from "next/link";

import { ShopExecutionWorkspace } from "@/features/inventory/shop-execution-workspace";
import { requireCurrentUser } from "@/server/auth/current-user";
import { getShopExecutionWorkspace } from "@/server/shop-execution/service";
export default async function ShopDispatchPage({searchParams}:{searchParams?:Promise<{repairOrderId?:string}>}){
  const user=await requireCurrentUser();
  const params=searchParams?await searchParams:{};
  let initial: Awaited<ReturnType<typeof getShopExecutionWorkspace>> | null = null;
  let loadError: string | null = null;
  try {
    initial=await getShopExecutionWorkspace(user);
  } catch (error) {
    loadError = error instanceof Error ? error.message : "Repair assignment could not be opened right now.";
  }
  if (!initial) {
    return <section className="technician-workbench-unavailable">
      <span>Repair assignment unavailable</span>
      <h1>Open this repair from the shared workbench</h1>
      <p>{loadError ?? "Repair assignment could not be opened right now."}</p>
      <div>
        <Link className="pill pill-primary" href={params.repairOrderId ? `/vehicles/repair-workbench?repairOrderId=${encodeURIComponent(params.repairOrderId)}` : "/vehicles/repair-workbench?view=all"}>Open Repair Workbench</Link>
        <Link className="pill pill-secondary" href="/vehicles/quality-control">Open Final QC</Link>
      </div>
    </section>;
  }
  return <ShopExecutionWorkspace initial={JSON.parse(JSON.stringify(initial))} initialRepairOrderId={params.repairOrderId}/>;
}
