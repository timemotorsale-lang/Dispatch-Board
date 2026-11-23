import { redirect } from "next/navigation";

import { ShopReconVehicleCard } from "@/features/inventory/shop-recon-vehicle-card";
import { requireCurrentUser } from "@/server/auth/current-user";
import { getShopReconLanding } from "@/server/shop-completion/service";
import { getShopReconLifecycleWorkspace } from "@/server/shop-recon/service";
import { getTitlePreparation } from "@/server/shop-recon/parallel-title-preparation-service";
import { safeLaborGuideReturnTo } from "@/lib/repair-explorer-context";
import { repairReviewHref } from "@/lib/repair-workflow-review";
import { customerInventoryLifecycleNotice, inventoryLifecycleHref } from "@/lib/vehicle-lifecycle-links";
import { isCustomerOwnedForInventoryLifecycle } from "@/server/vehicle-registry/inventory-lifecycle-ownership";

export default async function ShopReconVehicleCardPage({ params, searchParams }: { params: Promise<{ repairOrderId: string }>; searchParams?: Promise<{ returnTo?: string; stage?: string; view?: string }> }) {
  const user = await requireCurrentUser();
  const [{ repairOrderId }, query] = await Promise.all([params, searchParams]);
  const focused = query?.view === "lifecycle";
  const returnTo = safeLaborGuideReturnTo(query?.returnTo) ?? (focused ? repairReviewHref(repairOrderId) : "/vehicles/shop-recon");
  const model = await getShopReconLanding(user, focused ? { repairOrderId } : undefined);
  const item = model.items.find(candidate => candidate.id === repairOrderId);
  if (!item) redirect(returnTo);
  const [lifecycleWorkspace, titlePreparationWorkspace, customerOwned] = await Promise.all([
    getShopReconLifecycleWorkspace(user, repairOrderId),
    !focused || item.workLane === "INVENTORY_RECON" ? getTitlePreparation(user, repairOrderId) : null,
    focused && item.vehicleId ? isCustomerOwnedForInventoryLifecycle(item.vehicleId) : false,
  ]);
  const inventoryHref = item.vehicleId && !customerOwned ? inventoryLifecycleHref(item.vehicleId, repairOrderId, returnTo) : undefined;
  return <ShopReconVehicleCard focused={focused} inventoryHref={inventoryHref} inventoryUnavailableReason={customerOwned ? customerInventoryLifecycleNotice : undefined} initialStage={query?.stage} item={JSON.parse(JSON.stringify(item))} lifecycleWorkspace={JSON.parse(JSON.stringify(lifecycleWorkspace))} returnTo={returnTo} titlePreparationWorkspace={JSON.parse(JSON.stringify(titlePreparationWorkspace))} />;
}
