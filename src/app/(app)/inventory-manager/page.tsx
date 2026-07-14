import { InventoryControlTower } from "@/features/inventory/inventory-control-tower";
import { requireCurrentUser } from "@/server/auth/current-user";

export default async function InventoryManagerWorkspacePage() {
  await requireCurrentUser();
  return <InventoryControlTower />;
}
