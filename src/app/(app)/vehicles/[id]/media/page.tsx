import Link from "next/link";
import { redirect } from "next/navigation";
import { requireCurrentUser } from "@/server/auth/current-user";
import { prisma } from "@/server/db/client";
import { INITIAL_ORGANIZATION } from "@/server/appointments/location-foundation";
import { getVehicleSalesMedia } from "@/server/vehicle-360/service";
import { VehicleSalesMediaWorkspace } from "@/features/inventory/vehicle-sales-media-workspace";

export default async function VehicleMediaEntry({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireCurrentUser(), { id } = await params, now = new Date();
  const relationships = await prisma.vehicleRelationship.findMany({ where: { organizationId: INITIAL_ORGANIZATION.id, vehicleId: id, effectiveFrom: { lte: now }, OR: [{ effectiveTo: null }, { effectiveTo: { gt: now } }] }, select: { relationshipType: true } });
  const inventory = relationships.some(item => ["DEALERSHIP_OWNED", "TRADE_IN", "CONSIGNMENT"].includes(item.relationshipType));
  const customerOnly = !inventory && relationships.some(item => ["CUSTOMER_OWNER", "SOLD_TO_CUSTOMER", "SERVICE_ONLY"].includes(item.relationshipType));
  if (!customerOnly) redirect(`/vehicles/${encodeURIComponent(id)}/details?tab=media&purpose=intake`);
  // Service vehicles use the same capture tool without inventory advertising actions.
  const media = await getVehicleSalesMedia(user, id);
  return <section className="page-stack"><Link href={`/vehicles/${encodeURIComponent(id)}/workbench`}>Return to service workspace</Link><h1>Photos &amp; Videos</h1><VehicleSalesMediaWorkspace vehicleId={id} initialModel={media} intakeOnly/></section>;
}
