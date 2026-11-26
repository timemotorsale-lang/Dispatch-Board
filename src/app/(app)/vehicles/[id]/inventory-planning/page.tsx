import Link from "next/link";
import { InventoryPlanningReview } from "@/features/inventory/inventory-planning-review";
import { guidedStageIndex, lifecycleStages } from "@/features/inventory/lifecycle/stage-config";
import { InventoryLifecyclePrototype } from "@/features/prototype/inventory-lifecycle-prototype";
import { VehicleWorkflowSwitch } from "@/features/prototype/repair-workflow/vehicle-workflow-switch";
import { safeLaborGuideReturnTo } from "@/lib/repair-explorer-context";
import { needsRepairRoadTest } from "@/lib/final-repair-qc";
import { repairReviewHref } from "@/lib/repair-workflow-review";
import { customerInventoryLifecycleNotice, customerRepairShopNotice, shopReconLifecycleHref } from "@/lib/vehicle-lifecycle-links";
import { isCustomerOwnedForInventoryLifecycle } from "@/server/vehicle-registry/inventory-lifecycle-ownership";
import { requireCurrentUser } from "@/server/auth/current-user";
import { getFrontlineOptions, getFrontlineWorkflowForInventoryUnit, listFrontlineWorkflows } from "@/server/inventory-frontline/service";
import { getVehicleExecutionWorkbench } from "@/server/inventory-execution/workbench-service";
import { getEarlyReconContext, listEarlyReconAppointments } from "@/server/inventory-execution/early-recon";
import { getShopPlanningDetail } from "@/server/shop-planning/service";
import { getVehicleRegistryCreateOptions } from "@/server/vehicle-registry/service";

export default async function InventoryPlanningPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams?: Promise<{ guidedStage?: string; repairOrderId?: string; returnTo?: string; view?: string }> }) {
  const user = await requireCurrentUser();
  const { id } = await params;
  const query = searchParams ? await searchParams : {};
  const guided = query.view === "guided-lifecycle";
  const focused = query.view === "lifecycle" || guided;
  const candidate = typeof query.repairOrderId === "string" ? await getShopPlanningDetail(user, query.repairOrderId).catch(() => null) : null;
  const exactOrder = candidate?.vehicle.id === id ? candidate : null;
  const requestedOrderId = exactOrder?.id;
  if (query.repairOrderId !== undefined && !exactOrder) return <section className="panel-card page-stack">
    <h1>Repair order unavailable for this vehicle</h1>
    <p role="status">The requested order could not be opened for this vehicle. No other order was selected.</p>
    <Link href={`/vehicles/${encodeURIComponent(id)}/workbench`}>Back to vehicle workbench</Link>
  </section>;
  const customerRepair = exactOrder?.origin === "CUSTOMER_REPAIR";
  const unavailable = (notice: string) => {
    const returnTo = safeLaborGuideReturnTo(query.returnTo) ?? (requestedOrderId ? repairReviewHref(requestedOrderId) : `/vehicles/${encodeURIComponent(id)}/workbench`);
    return <section className="panel-card page-stack" aria-label="Inventory lifecycle unavailable">
      <h1>Inventory Lifecycle unavailable</h1>
      <p role="status">{notice}</p>
      <div className="form-actions">
        {requestedOrderId && <Link className="button button-primary" href={shopReconLifecycleHref(requestedOrderId, returnTo)}>Continue in Shop &amp; Recon</Link>}
        <Link className="button button-secondary" href={returnTo}>Return to workbench</Link>
      </div>
    </section>;
  };
  if (customerRepair) return unavailable(customerRepairShopNotice);
  const projection = await getVehicleExecutionWorkbench(user, id);
  if (focused && await isCustomerOwnedForInventoryLifecycle(id)) return unavailable(customerInventoryLifecycleNotice);
  const [frontline, options, registryOptions] = !focused || projection.hasInventoryRecord
    ? await Promise.all([listFrontlineWorkflows(user, { vehicleId: id }), getFrontlineOptions(user), guided ? null : getVehicleRegistryCreateOptions(user)])
    : [null, null, null] as const;
  const workflow = frontline?.items.find(item => item.inventoryUnit.vehicle.id === id) ?? null;
  const eligibleUnit = options?.units.find(unit => unit.vehicle.id === id) ?? null;
  const repairOrderId = requestedOrderId ?? workflow?.repairOrder?.id;
  const returnTo = safeLaborGuideReturnTo(query.returnTo) ?? (focused && repairOrderId ? repairReviewHref(repairOrderId) : undefined);
  const shopHref = repairOrderId ? shopReconLifecycleHref(repairOrderId, returnTo ?? repairReviewHref(repairOrderId)) : undefined;
  if (guided) {
    const workbench = returnTo ?? `/vehicles/${encodeURIComponent(id)}/workbench`;
    const liveQuery = new URLSearchParams({ view: "lifecycle", returnTo: workbench });
    if (repairOrderId) liveQuery.set("repairOrderId", repairOrderId);
    const previewQuery = new URLSearchParams(liveQuery);
    previewQuery.set("view", "guided-lifecycle");
    const previewHref = "/vehicles/" + encodeURIComponent(id) + "/inventory-planning?" + previewQuery;
    const requestedStage = query.guidedStage && /^\d+$/.test(query.guidedStage) ? Number(query.guidedStage) : -1;
    const liveHref = `/vehicles/${encodeURIComponent(id)}/inventory-planning?${liveQuery}`;
    const order = exactOrder;
    const linkedUnit = order?.inventoryUnit;
    const previewWorkflow = linkedUnit ? await getFrontlineWorkflowForInventoryUnit(user, linkedUnit) : workflow;
    const unit = previewWorkflow?.inventoryUnit ?? (order && linkedUnit ? { ...linkedUnit, vehicle: order.vehicle } : eligibleUnit);
    const stage = previewWorkflow?.stage ?? unit?.lifecycleStage;
    const initialStage = requestedStage >= 0 && requestedStage < lifecycleStages.length ? requestedStage : guidedStageIndex(stage ?? "");
    const roadTestNeeded = order?.repairJobs.some(job => job.status !== "CANCELLED" && needsRepairRoadTest(job)) ?? false;
    return <section className="page-stack">
      <div className="form-actions">
        <Link href={workbench}>← Return to Repair Workbench</Link>
        <Link href={liveHref}>Open live Inventory Lifecycle</Link>
      </div>
      <VehicleWorkflowSwitch active="inventory" shopHref={shopHref} />
      {unit && stage ? <InventoryLifecyclePrototype key={`${unit.id}:${initialStage}`} embedded review reviewHref={previewHref} reviewRepairOrderId={repairOrderId} reviewRoadTestNeeded={roadTestNeeded} initialStage={initialStage} initialUnitContext={{
        inventoryUnitId: unit.id,
        inventoryNumber: unit.inventoryNumber,
        canonicalVehicleId: id,
        vehicleLabel: [unit.vehicle.year, unit.vehicle.make, unit.vehicle.model].filter(Boolean).join(" ") || unit.vehicle.vehicleNumber,
        vin: typeof projection.identity.vin === "string" ? projection.identity.vin : "Not recorded",
        location: previewWorkflow?.location.name ?? (eligibleUnit?.id === unit.id ? eligibleUnit.location.name : "See live inventory record"),
        accountableOwner: previewWorkflow?.ownerUser.name ?? linkedUnit?.ownerUser.name ?? "Not recorded",
        custody: "See live inventory record",
        currentStageLabel: stage.replaceAll("_", " "),
        currentStageStatus: unit.operatingState.replaceAll("_", " "),
        safetyState: unit.stateReason ?? "See live inventory record",
        titleState: "See live title record",
        targetFrontlineDate: unit.targetAt.toLocaleDateString("en-US"),
        returnHref: workbench,
      }} /> : <p role="status">The linked inventory unit is unavailable for this preview. Open the live Inventory Lifecycle to review its record.</p>}
    </section>;
  }
  const earlyRecon = focused ? null : await getEarlyReconContext(user, id);
  const planningHref = `/vehicles/${encodeURIComponent(id)}/inventory-planning`;
  const intake = new URLSearchParams({ intakeSource: "INVENTORY_RECON", vehicleId: id });
  const reconAppointments = earlyRecon ? await listEarlyReconAppointments(user, earlyRecon) : [];
  const dateInStore = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Chicago", year: "numeric", month: "2-digit", day: "2-digit" });
  const reconActions = !earlyRecon ? undefined : {
    appointment: earlyRecon.canBook ? `/appointments?${new URLSearchParams({ action: "new", inventoryReconVehicleId: id })}` : undefined,
    appointments: reconAppointments.map(item => {
      const query = new URLSearchParams({ view: "board", appointment: item.appointmentNumber, returnTo: planningHref });
      if (item.startsAt) query.set("localDate", dateInStore.format(item.startsAt));
      return { href: `/appointments?${query}`, label: `${item.bookingStatus === "DRAFT" ? "Resume appointment draft" : "View recon appointment"} · ${item.appointmentNumber}` };
    }),
    order: earlyRecon.activeOrderId ? repairReviewHref(earlyRecon.activeOrderId, undefined, { workflow: "shop", returnTo: planningHref }) : undefined,
    shop: earlyRecon.canStartOrder && !earlyRecon.activeOrderId ? `/vehicles/repair-orders?${intake}&earlyRecon=shop` : undefined,
    vendor: earlyRecon.canRouteVendor ? `/vehicles/repair-orders?${intake}&earlyRecon=vendor` : undefined
  };
  return <>
    {!focused && returnTo && <Link className="button button-secondary" href={returnTo}>Return to Repair Workbench</Link>}
    <InventoryPlanningReview focused={focused} returnTo={returnTo} shopHref={shopHref} reconActions={reconActions} eligibleUnit={eligibleUnit ? JSON.parse(JSON.stringify(eligibleUnit)) : null} initial={JSON.parse(JSON.stringify(projection))} initialRepairOrderId={focused ? repairOrderId : requestedOrderId} initialWorkflow={workflow ? JSON.parse(JSON.stringify(workflow)) : null} locations={JSON.parse(JSON.stringify(registryOptions?.locations ?? []))} users={JSON.parse(JSON.stringify(options?.users ?? []))} />
  </>;
}
