import { InventoryPlanningReview } from "@/features/inventory/inventory-planning-review";
import { requireCurrentUser } from "@/server/auth/current-user";
import { getFrontlineOptions, listFrontlineWorkflows } from "@/server/inventory-frontline/service";
import { getVehicleExecutionWorkbench } from "@/server/inventory-execution/workbench-service";
import { getVehicleRegistryCreateOptions } from "@/server/vehicle-registry/service";

export default async function InventoryPlanningPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams?: Promise<{ repairOrderId?: string }> }) {
  const user = await requireCurrentUser();
  const { id } = await params;
  const query = searchParams ? await searchParams : {};
  const [projection, frontline, options, registryOptions] = await Promise.all([
    getVehicleExecutionWorkbench(user, id),
    listFrontlineWorkflows(user, { vehicleId: id }),
    getFrontlineOptions(user),
    getVehicleRegistryCreateOptions(user)
  ]);
  const workflow = frontline.items.find(item => item.inventoryUnit.vehicle.id === id) ?? null;
  const eligibleUnit = options.units.find(unit => unit.vehicle.id === id) ?? null;

  return <InventoryPlanningReview eligibleUnit={eligibleUnit ? JSON.parse(JSON.stringify(eligibleUnit)) : null} initial={JSON.parse(JSON.stringify(projection))} initialRepairOrderId={query.repairOrderId} initialWorkflow={workflow ? JSON.parse(JSON.stringify(workflow)) : null} locations={JSON.parse(JSON.stringify(registryOptions.locations))} users={JSON.parse(JSON.stringify(options.users))} />;
}
