import { InventoryRetailCompletionWorkspace } from "@/features/inventory/inventory-retail-completion-workspace";
import { requireCurrentUser } from "@/server/auth/current-user";
import { getRetailCompletionOptions, listRetailCompletions } from "@/server/inventory-retail-completion/service";
export default async function RetailCompletionPage({ searchParams }: { searchParams?: Promise<{ completionId?: string; vehicleId?: string }> }) {
  const user = await requireCurrentUser();
  const params = searchParams ? await searchParams : {};
  const [initial, options] = await Promise.all([listRetailCompletions(user), getRetailCompletionOptions(user)]);
  const vehicleId = params.vehicleId?.trim();
  const scopedOptions = vehicleId ? { ...options, units: options.units.filter(unit => unit.vehicleId === vehicleId) } : options;
  return <InventoryRetailCompletionWorkspace initial={JSON.parse(JSON.stringify(initial))} initialCompletionId={params.completionId} initialVehicleId={vehicleId} options={JSON.parse(JSON.stringify(scopedOptions))} />;
}
