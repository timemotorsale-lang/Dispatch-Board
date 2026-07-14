import { InventoryUnitFoundationWorkspace } from "@/features/inventory/inventory-unit-foundation-workspace";
import { requireCurrentUser } from "@/server/auth/current-user";
import { getInventoryUnitCreateOptions, listInventoryUnits } from "@/server/inventory-unit/service";

export default async function InventoryUnitFoundationPage() {
  const user = await requireCurrentUser(); const [initial, options] = await Promise.all([listInventoryUnits(user, { page: 1, pageSize: 25, query: "" }), getInventoryUnitCreateOptions(user)]);
  return <InventoryUnitFoundationWorkspace initial={JSON.parse(JSON.stringify(initial))} options={JSON.parse(JSON.stringify(options))} />;
}
