import { VehicleCostWorkspace } from "@/features/inventory/vehicle-cost-workspace";
import { requireCurrentUser } from "@/server/auth/current-user";
import { getVehicleCosts } from "@/server/inventory-unit/service";

export default async function VehicleCostsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const unit = await getVehicleCosts(await requireCurrentUser(), id);
  return <VehicleCostWorkspace vehicleId={id} unit={unit ? JSON.parse(JSON.stringify(unit)) : null} />;
}
