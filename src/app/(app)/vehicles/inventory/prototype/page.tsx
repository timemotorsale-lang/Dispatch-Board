import { buildLifecycleUnitContext } from "@/features/inventory/lifecycle/shell";
import { InventoryLifecyclePrototype } from "@/features/prototype/inventory-lifecycle-prototype";
import { requireCurrentUser } from "@/server/auth/current-user";
import { getInventoryControlTowerProjection } from "@/server/inventory-control-tower/service";

type PageProps = {
  searchParams?: Promise<{ inventoryUnitId?: string; stage?: string }>;
};

export default async function InventoryLifecyclePrototypePage({ searchParams }: PageProps) {
  const params = searchParams ? await searchParams : {};
  const user = await requireCurrentUser();
  const projection = await getInventoryControlTowerProjection(user, { inventoryUnitId: params.inventoryUnitId });
  const selected = projection.selectedAsset;
  const initialStage = Number.isFinite(Number(params.stage)) ? Number(params.stage) : 0;
  const initialUnitContext = buildLifecycleUnitContext(selected ? {
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

  return <InventoryLifecyclePrototype initialStage={initialStage} initialUnitContext={initialUnitContext} />;
}
