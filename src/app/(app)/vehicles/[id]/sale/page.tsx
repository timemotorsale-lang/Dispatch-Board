import { notFound, redirect } from "next/navigation";
import { requireCurrentUser } from "@/server/auth/current-user";
import { getVehicleJourney } from "@/server/inventory-unit/journey-service";
import { getDispositionWholesaleWorkspace } from "@/server/disposition-wholesale/service";
import { createEnterpriseCommandRepository } from "@/server/enterprise-command/repository";
import { evaluateVehicleCapability } from "@/server/enterprise-command/vehicle-capabilities";
import { INITIAL_ORGANIZATION } from "@/server/appointments/location-foundation";
import { AsIsSaleWorkspace } from "@/features/inventory/as-is-sale-workspace";
import { prisma } from "@/server/db/client";
import Link from "next/link";

export default async function VehicleSaleEntryPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ mode?: string }> }) {
  const user = await requireCurrentUser(), { id } = await params, { mode } = await searchParams;
  const journey = await getVehicleJourney(user, id);
  if (!journey) notFound();
  if (!journey.access.inventory) throw new Error("Inventory access is required for sale preparation.");
  const now = new Date();
  const relationships = await prisma.vehicleRelationship.findMany({ where: { organizationId: INITIAL_ORGANIZATION.id, vehicleId: id, effectiveFrom: { lte: now }, OR: [{ effectiveTo: null }, { effectiveTo: { gt: now } }] }, select: { relationshipType: true } });
  const controlled = relationships.some(record => ["DEALERSHIP_OWNED", "TRADE_IN", "CONSIGNMENT"].includes(record.relationshipType));
  const customerOwned = relationships.some(record => ["CUSTOMER_OWNER", "SOLD_TO_CUSTOMER", "SERVICE_ONLY"].includes(record.relationshipType));
  if (!controlled && customerOwned) return <section className="page-stack"><h1>Vehicle not available for inventory sale</h1><p>This is a customer vehicle. A dealership acquisition must be recorded before starting an inventory sale.</p><Link href={`/vehicles/${encodeURIComponent(id)}/workbench`}>Return to Vehicle Workbench</Link></section>;
  if (mode !== "as-is") redirect(`/vehicles/${encodeURIComponent(id)}/details`);
  if (!journey.unit || journey.intake?.status !== "CONFIRMED") redirect(`/vehicles/${encodeURIComponent(id)}/intake`);
  if (!controlled) redirect(`/vehicles/${encodeURIComponent(id)}/intake`);
  const [workspace, grants] = await Promise.all([getDispositionWholesaleWorkspace(user), createEnterpriseCommandRepository().listCapabilityGrants(user.id, INITIAL_ORGANIZATION.id)]);
  const canStart = evaluateVehicleCapability({ actor: user, capability: "INVENTORY_RELEASE_MANAGE", grants, locationId: journey.unit.locationId, now: new Date() }).allowed;
  const existingCaseId = workspace.cases.find(record => record.inventoryUnitId === journey.unit?.id)?.id;
  return <AsIsSaleWorkspace journey={JSON.parse(JSON.stringify(journey))} canStart={canStart} ownerUserId={user.id} existingCaseId={existingCaseId}/>;
}
