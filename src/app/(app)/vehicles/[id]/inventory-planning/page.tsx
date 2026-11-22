import Link from "next/link";
import { InventoryPlanningReview } from "@/features/inventory/inventory-planning-review";
import { safeLaborGuideReturnTo } from "@/lib/repair-explorer-context";
import { repairReviewHref } from "@/lib/repair-workflow-review";
import { customerInventoryLifecycleNotice, shopReconLifecycleHref } from "@/lib/vehicle-lifecycle-links";
import { isCustomerOwnedForInventoryLifecycle } from "@/server/vehicle-registry/inventory-lifecycle-ownership";
import { requireCurrentUser } from "@/server/auth/current-user";
import { getFrontlineOptions, listFrontlineWorkflows } from "@/server/inventory-frontline/service";
import { getVehicleExecutionWorkbench } from "@/server/inventory-execution/workbench-service";
import { getShopPlanningDetail } from "@/server/shop-planning/service";
import { getVehicleRegistryCreateOptions } from "@/server/vehicle-registry/service";

export default async function InventoryPlanningPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams?: Promise<{ repairOrderId?: string; returnTo?: string; view?: string }> }) {
  const user = await requireCurrentUser();
  const { id } = await params;
  const query = searchParams ? await searchParams : {};
  const focused = query.view === "lifecycle";
  const projection = await getVehicleExecutionWorkbench(user, id);
  const requestedOrder = projection.workOrders.items.find(order => order.id === query.repairOrderId);
  const exactOrder = focused && query.repairOrderId && !requestedOrder
    ? await getShopPlanningDetail(user, query.repairOrderId).catch(() => null)
    : null;
  const requestedOrderId = typeof requestedOrder?.id === "string" ? requestedOrder.id
    : exactOrder?.vehicle.id === id ? exactOrder.id : undefined;
  if (focused && await isCustomerOwnedForInventoryLifecycle(id)) {
    const returnTo = safeLaborGuideReturnTo(query.returnTo) ?? (requestedOrderId ? repairReviewHref(requestedOrderId) : `/vehicles/${encodeURIComponent(id)}/workbench`);
    return <section className="panel-card page-stack" aria-label="Inventory lifecycle unavailable">
      <h1>Inventory Lifecycle unavailable</h1>
      <p role="status">{customerInventoryLifecycleNotice}</p>
      <div className="form-actions">
        {requestedOrderId && <Link className="button button-primary" href={shopReconLifecycleHref(requestedOrderId, returnTo)}>Continue in Shop &amp; Recon</Link>}
        <Link className="button button-secondary" href={returnTo}>Return to workbench</Link>
      </div>
    </section>;
  }
  const [frontline, options, registryOptions] = !focused || projection.hasInventoryRecord
    ? await Promise.all([listFrontlineWorkflows(user, { vehicleId: id }), getFrontlineOptions(user), getVehicleRegistryCreateOptions(user)])
    : [null, null, null] as const;
  const workflow = frontline?.items.find(item => item.inventoryUnit.vehicle.id === id) ?? null;
  const eligibleUnit = options?.units.find(unit => unit.vehicle.id === id) ?? null;
  const repairOrderId = requestedOrderId ?? workflow?.repairOrder?.id;
  const returnTo = safeLaborGuideReturnTo(query.returnTo) ?? (focused && repairOrderId ? repairReviewHref(repairOrderId) : undefined);
  const shopHref = repairOrderId ? shopReconLifecycleHref(repairOrderId, returnTo ?? repairReviewHref(repairOrderId)) : undefined;
  return <>
    {!focused && returnTo && <Link className="button button-secondary" href={returnTo}>Return to Repair Workbench</Link>}
    <InventoryPlanningReview focused={focused} returnTo={returnTo} shopHref={shopHref} eligibleUnit={eligibleUnit ? JSON.parse(JSON.stringify(eligibleUnit)) : null} initial={JSON.parse(JSON.stringify(projection))} initialRepairOrderId={focused ? repairOrderId : query.repairOrderId} initialWorkflow={workflow ? JSON.parse(JSON.stringify(workflow)) : null} locations={JSON.parse(JSON.stringify(registryOptions?.locations ?? []))} users={JSON.parse(JSON.stringify(options?.users ?? []))} />
  </>;
}
