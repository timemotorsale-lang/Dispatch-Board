import { redirect } from "next/navigation";

import { ShopReconVehicleIntakeCustody } from "@/features/inventory/shop-recon-vehicle-intake-custody";
import { requireCurrentUser } from "@/server/auth/current-user";
import { getShopReconLanding } from "@/server/shop-completion/service";
import { getShopReconLifecycleWorkspace } from "@/server/shop-recon/service";

export default async function ShopReconVehicleIntakeCustodyPage({ params, searchParams }: { params: Promise<{ repairOrderId: string }>; searchParams?: Promise<{ returnTo?: string }> }) {
  const user = await requireCurrentUser();
  const [{ repairOrderId }, query, model] = await Promise.all([params, searchParams ?? Promise.resolve<{ returnTo?: string }>({}), getShopReconLanding(user)]);
  const returnTo = query.returnTo?.startsWith("/") && !query.returnTo.startsWith("//") ? query.returnTo : "/vehicles/shop-recon";
  const item = model.items.find(candidate => candidate.id === repairOrderId);
  if (!item) redirect(returnTo);
  const lifecycleWorkspace = await getShopReconLifecycleWorkspace(user, repairOrderId);
  return <ShopReconVehicleIntakeCustody item={JSON.parse(JSON.stringify(item))} lifecycleWorkspace={JSON.parse(JSON.stringify(lifecycleWorkspace))} returnTo={returnTo} />;
}
