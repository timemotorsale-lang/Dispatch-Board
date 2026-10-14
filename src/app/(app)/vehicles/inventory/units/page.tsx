import { InventoryUnitFoundationWorkspace } from "@/features/inventory/inventory-unit-foundation-workspace";
import { requireCurrentUser } from "@/server/auth/current-user";
import { getInventoryUnitCreateOptions, getInventoryUnitDetail, listInventoryUnits } from "@/server/inventory-unit/service";

type PageProps = { searchParams?: Promise<{ view?: string; inventoryUnitId?: string; vehicleId?: string }> };

export default async function InventoryUnitsPage({ searchParams }: PageProps) {
  const query = searchParams ? await searchParams : {};
  const initialView = query.view === "locations" || query.view === "aging" ? query.view : "units";
  const user = await requireCurrentUser();
  const [initial, options, initialSelected] = await Promise.all([listInventoryUnits(user, { page: 1, pageSize: 25, query: "" }), getInventoryUnitCreateOptions(user), query.inventoryUnitId ? getInventoryUnitDetail(user, query.inventoryUnitId) : Promise.resolve(null)]);
  return <InventoryUnitFoundationWorkspace initial={JSON.parse(JSON.stringify(initial))} initialSelected={JSON.parse(JSON.stringify(initialSelected))} initialView={initialView} initialVehicleId={query.vehicleId} options={JSON.parse(JSON.stringify(options))} />;
}
