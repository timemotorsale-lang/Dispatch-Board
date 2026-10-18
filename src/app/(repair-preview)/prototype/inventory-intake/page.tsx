import { CompactInventoryIntake } from "@/features/prototype/inventory-intake/compact-inventory-intake";
import { requireCurrentUser } from "@/server/auth/current-user";
import { getCompactIntake } from "@/server/inventory-unit/compact-intake-service";

export const metadata = { title: "Compact Inventory Intake Review | Dispatch Board" };

export default async function CompactInventoryIntakePage({ searchParams }: { searchParams?: Promise<{ vehicleId?: string | string[] }> } = {}) {
  const params = searchParams ? await searchParams : {};
  const vehicleId = Array.isArray(params.vehicleId) ? params.vehicleId[0] : params.vehicleId;
  const user = await requireCurrentUser(`/prototype/inventory-intake${vehicleId ? `?${new URLSearchParams({ vehicleId })}` : ""}`);
  const data = await getCompactIntake(user, { vehicleId }).catch(() => null);
  if (!data) {
    return <main><h1>Vehicle intake unavailable</h1><p role="alert">Check acquisition-intake access and the selected vehicle, then retry. Nothing was changed.</p><a href="/vehicles/repair-orders?intakeSource=INVENTORY_RECON">Return to check-in</a></main>;
  }
  const users = [...data.options.users].sort((first, second) => Number(second.id === user.id) - Number(first.id === user.id));
  return <CompactInventoryIntake context={data.intake ?? undefined} options={{ locations: data.options.locations, users }} key={vehicleId ?? "new"} />;
}
