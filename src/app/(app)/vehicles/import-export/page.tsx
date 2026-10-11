import { InventoryTransferWorkspace } from "@/features/inventory/inventory-transfer-workspace";
import { requireCurrentUser } from "@/server/auth/current-user";
import { getVehicleRegistryCreateOptions } from "@/server/vehicle-registry/service";

export default async function InventoryTransferPage({ searchParams }: { searchParams?: Promise<{ mode?: string }> }) {
  const user = await requireCurrentUser();
  const { locations } = await getVehicleRegistryCreateOptions(user);
  const params = searchParams ? await searchParams : {};
  const mode = params.mode === "import" ? "import" : "export";
  return <InventoryTransferWorkspace initialMode={mode} key={mode} locations={locations} />;
}
