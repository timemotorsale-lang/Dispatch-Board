import { InventoryLifecycleLanding } from "@/features/inventory/inventory-lifecycle-landing";
import { buildLifecycleUnitContext } from "@/features/inventory/lifecycle/shell";
import { requireCurrentUser } from "@/server/auth/current-user";
import { getInventoryControlTowerProjection } from "@/server/inventory-control-tower/service";

type PageProps = { searchParams?: Promise<{ locationId?: string; stage?: string; view?: string; inventoryUnitId?: string; guidedStage?: string }> };

export default async function InventoryLifecyclePage({ searchParams }: PageProps) {
  const query = searchParams ? await searchParams : {};
  const user = await requireCurrentUser();
  const projection = await getInventoryControlTowerProjection(user, { inventoryUnitId: query.inventoryUnitId, locationId: query.locationId, stage: query.stage });
  const activeWorkView = query.view === "TEAM" || query.view === "EXCEPTIONS" ? query.view : "MY";
  const selected = projection.selectedAsset;
  const guidedLifecycleStage = Number.isFinite(Number(query.guidedStage)) ? Number(query.guidedStage) : 0;
  const guidedLifecycleUnitContext = buildLifecycleUnitContext(selected ? {
    accountableOwner: selected.ownerUser.name,
    canonicalVehicleId: selected.vehicle.id,
    currentStageLabel: selected.lifecycleStage.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase()),
    currentStageStatus: selected.operatingState.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase()),
    custody: selected.operatingState === "ACTIVE" ? "Accepted | accountable custody active" : selected.operatingState,
    inventoryNumber: selected.inventoryNumber,
    inventoryUnitId: selected.id,
    location: selected.location.name,
    returnHref: "/vehicles/inventory",
    safetyState: selected.stateReason ?? "No controlling safety exception in selected inventory record",
    targetFrontlineDate: new Date(selected.targetAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }),
    titleState: "Canonical title readiness is managed in downstream lifecycle stages",
    vehicleLabel: [selected.vehicle.year, selected.vehicle.make, selected.vehicle.model].filter(Boolean).join(" ") || selected.vehicle.vehicleNumber,
    vin: selected.vehicle.vin ?? selected.vehicle.vehicleNumber,
  } : null);
  const returnQuery = new URLSearchParams();
  if (query.locationId) returnQuery.set("locationId", query.locationId);
  if (query.stage) returnQuery.set("stage", query.stage);
  if (query.view) returnQuery.set("view", query.view);
  if (query.inventoryUnitId) returnQuery.set("inventoryUnitId", query.inventoryUnitId);
  if (query.guidedStage) returnQuery.set("guidedStage", query.guidedStage);
  const returnTo = `/vehicles/inventory${returnQuery.size ? `?${returnQuery.toString()}` : ""}`;
  const towerQuery = new URLSearchParams({ returnTo });
  if (query.locationId) towerQuery.set("locationId", query.locationId);
  return <InventoryLifecycleLanding activeWorkView={activeWorkView} controlTowerHref={`/vehicles/control-tower?${towerQuery.toString()}`} currentUserId={user.id} guidedLifecycleStage={guidedLifecycleStage} guidedLifecycleUnitContext={guidedLifecycleUnitContext} projection={JSON.parse(JSON.stringify(projection))} />;
}
