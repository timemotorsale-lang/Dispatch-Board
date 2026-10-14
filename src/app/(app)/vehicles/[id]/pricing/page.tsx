import { VehiclePricingWorkspace } from "@/features/inventory/vehicle-pricing-workspace";
import { requireCurrentUser } from "@/server/auth/current-user";
import { getVehiclePricing } from "@/server/inventory-unit/service";
export default async function VehiclePricingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const unit = await getVehiclePricing(await requireCurrentUser(), id);
  return <VehiclePricingWorkspace vehicleId={id} unit={unit ? JSON.parse(JSON.stringify(unit)) : null}/>;
}
