import { InventoryLifecycleLanding } from "@/features/inventory/inventory-lifecycle-landing";
import { requireCurrentUser } from "@/server/auth/current-user";
import { getInventoryControlTowerProjection } from "@/server/inventory-control-tower/service";

type PageProps = { searchParams?: Promise<{ locationId?: string; view?: string }> };

export default async function InventoryLifecyclePage({ searchParams }: PageProps) {
  const query = searchParams ? await searchParams : {};
  const user = await requireCurrentUser();
  const projection = await getInventoryControlTowerProjection(user, { locationId: query.locationId });
  const returnQuery = new URLSearchParams();
  if (query.locationId) returnQuery.set("locationId", query.locationId);
  if (query.view) returnQuery.set("view", query.view);
  const returnTo = `/vehicles/inventory${returnQuery.size ? `?${returnQuery.toString()}` : ""}`;
  const towerQuery = new URLSearchParams({ returnTo });
  if (query.locationId) towerQuery.set("locationId", query.locationId);
  return <InventoryLifecycleLanding projection={JSON.parse(JSON.stringify(projection))} controlTowerHref={`/vehicles/control-tower?${towerQuery.toString()}`} />;
}
