import { notFound } from "next/navigation";
import { requireCurrentUser } from "@/server/auth/current-user";
import { getVehicleJourney } from "@/server/inventory-unit/journey-service";
import { getVehicleCosts, getVehiclePricing } from "@/server/inventory-unit/service";
import { getVehicle360, getVehicleSalesMedia } from "@/server/vehicle-360/service";
import { FrontlinePreparationWorkspace } from "@/features/inventory/frontline-preparation-workspace";
import { getVehicleIntake } from "@/server/inventory-unit/intake-service";

export default async function FrontlinePreparationPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireCurrentUser(), { id } = await params;
  const journey = await getVehicleJourney(user, id);
  if (!journey) notFound();
  const [pricing, costs, media, intake, salesMedia] = await Promise.all([
    journey.access.pricing ? getVehiclePricing(user, id) : Promise.resolve(null),
    journey.access.costs ? getVehicleCosts(user, id) : Promise.resolve(null),
    getVehicle360(user, id).then(view => ({
      available: view.tabs.documents.allowed,
      documents: view.tabs.documents.items.map(item => ({ id: item.evidenceObjectId, name: item.evidenceObject.fileName, href: item.evidenceObject.malwareStatus === "CLEAN" ? item.downloadUrl : null, image: ["image/jpeg", "image/png", "image/webp"].includes(item.evidenceObject.contentType) })),
      context: {
        available: true,
        specifications: Object.entries(view.tabs.specifications.specifications).filter(([, value]) => typeof value === "string" || typeof value === "number").map(([key, value]) => [key.replaceAll("_", " "), String(value)]),
        timeline: view.timeline.map(item => ({ id: item.id, occurredAt: item.occurredAt.toISOString(), source: item.source, type: item.type, title: item.title, detail: item.detail, actorName: item.actorName ?? null }))
      }
    })).catch(() => ({ available: false, documents: [], context: null })),
    getVehicleIntake(user, id).catch(() => null),
    getVehicleSalesMedia(user, id).catch(() => null)
  ]);
  return <FrontlinePreparationWorkspace journey={JSON.parse(JSON.stringify(journey))} pricing={JSON.parse(JSON.stringify(pricing))} costs={JSON.parse(JSON.stringify(costs))} documents={media.documents} mediaUnavailable={!media.available} intake={JSON.parse(JSON.stringify(intake))} recordContext={JSON.parse(JSON.stringify(media.context))} salesMedia={salesMedia}/>;
}
