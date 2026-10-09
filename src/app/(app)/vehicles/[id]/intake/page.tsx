import { VehicleIntakeWorkspace } from "@/features/inventory/vehicle-intake-workspace";
import { requireCurrentUser } from "@/server/auth/current-user";
import { getVehicleIntake } from "@/server/inventory-unit/intake-service";
import { getVehicleCosts } from "@/server/inventory-unit/service";

export default async function VehicleIntakePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireCurrentUser(), { id } = await params;
  const model = await getVehicleIntake(user, id);
  const costs = await getVehicleCosts(user, id);
  return <VehicleIntakeWorkspace model={model} costs={costs ? JSON.parse(JSON.stringify(costs)) : null} />;
}
