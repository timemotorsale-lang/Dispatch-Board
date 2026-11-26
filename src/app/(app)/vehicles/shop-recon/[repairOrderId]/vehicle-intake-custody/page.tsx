import { redirect } from "next/navigation";

import { ShopReconVehicleIntakeCustody } from "@/features/inventory/shop-recon-vehicle-intake-custody";
import { requireCurrentUser } from "@/server/auth/current-user";
import { getShopReconLanding } from "@/server/shop-completion/service";
import { getShopReconLifecycleWorkspace } from "@/server/shop-recon/service";
import { getShopReconStageHref } from "@/features/inventory/shop-recon-navigation";
import { safeLaborGuideReturnTo } from "@/lib/repair-explorer-context";

export default async function ShopReconVehicleIntakeCustodyPage({ params, searchParams }: { params: Promise<{ repairOrderId: string }>; searchParams?: Promise<{ returnTo?: string }> }) {
  const user = await requireCurrentUser();
  const [{ repairOrderId }, query] = await Promise.all([params, searchParams]);
  const explicitReturn = safeLaborGuideReturnTo(query?.returnTo);
  const model = await getShopReconLanding(user, { repairOrderId });
  const item = model.items.find(candidate => candidate.id === repairOrderId);
  if (!item) redirect(explicitReturn ?? "/vehicles/shop-recon");
  const returnTo = explicitReturn ?? getShopReconStageHref(repairOrderId, undefined);
  const lifecycleWorkspace = await getShopReconLifecycleWorkspace(user, repairOrderId);
  return <ShopReconVehicleIntakeCustody item={JSON.parse(JSON.stringify(item))} lifecycleWorkspace={JSON.parse(JSON.stringify(lifecycleWorkspace))} returnTo={returnTo} />;
}
