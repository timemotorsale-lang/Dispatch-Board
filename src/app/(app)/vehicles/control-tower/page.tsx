import { InventoryControlTower } from "@/features/inventory/inventory-control-tower";
import { requireCurrentUser } from "@/server/auth/current-user";
import { getInventoryControlTowerProjection } from "@/server/inventory-control-tower/service";

type PageProps = { searchParams?: Promise<{ stage?: string; locationId?: string; inventoryUnitId?: string; returnTo?: string }> };

function permittedReturnPath(value?: string) {
  if (!value) return "/vehicles/inventory";
  try { const decoded = decodeURIComponent(value); return decoded === "/vehicles/inventory" || decoded.startsWith("/vehicles/inventory?") || decoded.startsWith("/vehicles/inventory/") ? decoded : "/vehicles/inventory"; }
  catch { return "/vehicles/inventory"; }
}

export default async function InventoryControlTowerPage({ searchParams }: PageProps) {
  const query = searchParams ? await searchParams : {};
  const user = await requireCurrentUser();
  const projection = await getInventoryControlTowerProjection(user, query);
  return <InventoryControlTower projection={JSON.parse(JSON.stringify(projection))} backHref={permittedReturnPath(query.returnTo)} />;
}
