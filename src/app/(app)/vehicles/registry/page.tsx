import { VehicleRegistryWorkspace } from "@/features/inventory/vehicle-registry-workspace";
import { requireCurrentUser } from "@/server/auth/current-user";
import { getVehicleRegistryDetail, listVehicleRegistry } from "@/server/vehicle-registry/service";

export default async function VehicleRegistryPage({ searchParams }: { searchParams?: Promise<{ query?: string; vehicleId?: string }> }) {
  const user = await requireCurrentUser();
  const params = searchParams ? await searchParams : {};
  const query = params.query ?? "";
  const registry = await listVehicleRegistry(user, { page: 1, pageSize: 25, query });
  const autoSelectedId = params.vehicleId ?? (registry.items.length === 1 ? registry.items[0].id : undefined);
  const selected = autoSelectedId ? await getVehicleRegistryDetail(user, autoSelectedId) : null;
  return <VehicleRegistryWorkspace initial={JSON.parse(JSON.stringify(registry))} initialQuery={query} initialSelected={JSON.parse(JSON.stringify(selected))} />;
}
