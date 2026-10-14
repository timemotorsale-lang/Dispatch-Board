import { notFound } from "next/navigation";
import { requireCurrentUser } from "@/server/auth/current-user";
import { getVehicleJourney } from "@/server/inventory-unit/journey-service";
import { VehicleJourneyWorkspace } from "@/features/inventory/vehicle-journey-workspace";
export default async function VehicleJourneyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const model = await getVehicleJourney(await requireCurrentUser(), id);
  if (!model) notFound();
  return <VehicleJourneyWorkspace model={model}/>;
}
