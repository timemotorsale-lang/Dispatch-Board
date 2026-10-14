import { notFound } from "next/navigation";
import { requireCurrentUser } from "@/server/auth/current-user";
import { getVehicleJourney } from "@/server/inventory-unit/journey-service";
import { getVehicle360 } from "@/server/vehicle-360/service";
import { VehicleWorkflowChoice } from "@/features/inventory/vehicle-workflow-choice";

export default async function VehicleWorkflowPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireCurrentUser();
  const { id } = await params;
  const journey = await getVehicleJourney(user, id);
  if (!journey) notFound();
  const view = await getVehicle360(user, id);
  const photo = view.tabs.documents.items.find(item => item.downloadUrl && item.evidenceObject.malwareStatus === "CLEAN" && ["image/jpeg", "image/png", "image/webp"].includes(item.evidenceObject.contentType))?.downloadUrl;
  return <VehicleWorkflowChoice journey={JSON.parse(JSON.stringify(journey))} photo={photo}/>;
}
