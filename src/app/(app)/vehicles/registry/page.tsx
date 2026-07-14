import { VehicleRegistryWorkspace } from "@/features/inventory/vehicle-registry-workspace";
import { requireCurrentUser } from "@/server/auth/current-user";
import { listVehicleRegistry } from "@/server/vehicle-registry/service";

export default async function VehicleRegistryPage() {
  const user = await requireCurrentUser();
  const registry = await listVehicleRegistry(user, { page: 1, pageSize: 25, query: "" });
  return <VehicleRegistryWorkspace initial={JSON.parse(JSON.stringify(registry))} />;
}
