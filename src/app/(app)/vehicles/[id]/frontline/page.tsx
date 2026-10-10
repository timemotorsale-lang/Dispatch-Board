import { notFound } from "next/navigation";
import { requireCurrentUser } from "@/server/auth/current-user";
import { getVehicleJourney } from "@/server/inventory-unit/journey-service";
import { getVehicleCosts, getVehiclePricing } from "@/server/inventory-unit/service";
import { getVehicle360 } from "@/server/vehicle-360/service";
import { FrontlinePreparationWorkspace } from "@/features/inventory/frontline-preparation-workspace";

export default async function FrontlinePreparationPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireCurrentUser(), { id } = await params;
  const journey = await getVehicleJourney(user, id);
  if (!journey) notFound();
  const [pricing, costs, media] = await Promise.all([
    journey.access.pricing ? getVehiclePricing(user, id) : Promise.resolve(null),
    journey.access.costs ? getVehicleCosts(user, id) : Promise.resolve(null),
    getVehicle360(user, id).then(view => ({ available: view.tabs.documents.allowed, documents: view.tabs.documents.items.map(item => ({ id: item.evidenceObjectId, name: item.evidenceObject.fileName, href: item.evidenceObject.malwareStatus === "CLEAN" ? item.downloadUrl : null, image: ["image/jpeg", "image/png", "image/webp"].includes(item.evidenceObject.contentType) })) })).catch(() => ({ available: false, documents: [] }))
  ]);
  return <FrontlinePreparationWorkspace journey={JSON.parse(JSON.stringify(journey))} pricing={JSON.parse(JSON.stringify(pricing))} costs={JSON.parse(JSON.stringify(costs))} documents={media.documents} mediaUnavailable={!media.available}/>;
}
