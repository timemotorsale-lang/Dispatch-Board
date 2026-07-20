import { VehicleRegistryWorkspace } from "@/features/inventory/vehicle-registry-workspace";
import { requireCurrentUser } from "@/server/auth/current-user";
import { getVehicleRegistryDetail, listVehicleRegistry } from "@/server/vehicle-registry/service";

export default async function VehicleRegistryPage({ searchParams }: { searchParams?: Promise<{ vehicleId?: string }> }) {
  const user = await requireCurrentUser();
  const params = searchParams ? await searchParams : {};
  const [registry, selected] = await Promise.all([listVehicleRegistry(user, { page: 1, pageSize: 25, query: "" }), params.vehicleId ? getVehicleRegistryDetail(user, params.vehicleId) : Promise.resolve(null)]);
  return <VehicleRegistryWorkspace initial={JSON.parse(JSON.stringify(registry))} initialSelected={JSON.parse(JSON.stringify(selected))} />;
}
