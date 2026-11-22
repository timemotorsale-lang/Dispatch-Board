import { VehicleRegistryWorkspace } from "@/features/inventory/vehicle-registry-workspace";
import { listVehicleWorkActions } from "@/server/repair-order/resume-service";
import { requireCurrentUser } from "@/server/auth/current-user";
import { getVehicleRegistryDetail, listVehicleRegistry } from "@/server/vehicle-registry/service";

export default async function VehicleRegistryPage({ searchParams }: { searchParams?: Promise<{ q?: string; query?: string; vehicleId?: string }> }) {
  const user = await requireCurrentUser();
  const params = searchParams ? await searchParams : {};
  const query = params.query ?? params.q ?? "";
  const registry = await listVehicleRegistry(user, { page: 1, pageSize: 25, query });
  const work = await listVehicleWorkActions(user, registry.items.map(item => item.id));
  const autoSelectedId = params.vehicleId;
  const selected = autoSelectedId ? await getVehicleRegistryDetail(user, autoSelectedId) : null;
  return <VehicleRegistryWorkspace initial={JSON.parse(JSON.stringify({ ...registry, items: registry.items.map(item => ({ ...item, work: work[item.id] })) }))} initialQuery={query} initialSelected={JSON.parse(JSON.stringify(selected))} />;
}
