import { InventoryFrontlineWorkspace } from "@/features/inventory/inventory-frontline-workspace";
import { requireCurrentUser } from "@/server/auth/current-user";
import { getFrontlineOptions, listFrontlineWorkflows } from "@/server/inventory-frontline/service";
export default async function InventoryToFrontlinePage({ searchParams }: { searchParams?: Promise<{ workflowId?: string; vehicleId?: string }> }) {
  const user = await requireCurrentUser();
  const params = searchParams ? await searchParams : {};
  const vehicleId = params.vehicleId?.trim();
  const [initial, options] = await Promise.all([listFrontlineWorkflows(user, vehicleId ? { vehicleId } : {}), getFrontlineOptions(user)]);
  const scopedOptions = vehicleId ? { ...options, units: options.units.filter(unit => unit.vehicle.id === vehicleId) } : options;
  return <InventoryFrontlineWorkspace initial={JSON.parse(JSON.stringify(initial))} initialWorkflowId={params.workflowId} options={JSON.parse(JSON.stringify(scopedOptions))} />;
}
