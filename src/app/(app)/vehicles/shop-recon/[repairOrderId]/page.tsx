import { redirect } from "next/navigation";

import { ShopReconVehicleCard } from "@/features/inventory/shop-recon-vehicle-card";
import { requireCurrentUser } from "@/server/auth/current-user";
import { getShopReconLanding } from "@/server/shop-completion/service";
import { getShopReconLifecycleWorkspace } from "@/server/shop-recon/service";
import { getTitlePreparation } from "@/server/shop-recon/parallel-title-preparation-service";
import { safeLaborGuideReturnTo } from "@/lib/repair-explorer-context";
import { repairReviewHref } from "@/lib/repair-workflow-review";
import { customerInventoryLifecycleNotice, customerRepairShopNotice, inventoryLifecycleHref } from "@/lib/vehicle-lifecycle-links";
import { isCustomerOwnedForInventoryLifecycle } from "@/server/vehicle-registry/inventory-lifecycle-ownership";

export default async function ShopReconVehicleCardPage({ params, searchParams }: { params: Promise<{ repairOrderId: string }>; searchParams?: Promise<{ returnTo?: string; stage?: string; view?: string }> }) {
  const user = await requireCurrentUser();
  const [{ repairOrderId }, query] = await Promise.all([params, searchParams]);
  const focused = query?.view === "lifecycle";
  const returnTo = safeLaborGuideReturnTo(query?.returnTo) ?? (focused ? repairReviewHref(repairOrderId) : "/vehicles/shop-recon");
  const model = await getShopReconLanding(user, { repairOrderId });
  const item = model.items.find(candidate => candidate.id === repairOrderId);
  if (!item) redirect(returnTo);
  const customerRepair = item.workLane === "CUSTOMER_REPAIR";
  const [lifecycleWorkspace, titlePreparationWorkspace, customerOwned] = await Promise.all([
    getShopReconLifecycleWorkspace(user, repairOrderId),
    !customerRepair ? getTitlePreparation(user, repairOrderId) : null,
    !customerRepair && item.vehicleId ? isCustomerOwnedForInventoryLifecycle(item.vehicleId) : false,
  ]);
  const inventoryUnavailableReason = customerRepair ? customerRepairShopNotice : customerOwned ? customerInventoryLifecycleNotice : undefined;
  const inventoryHref = item.vehicleId && !inventoryUnavailableReason ? inventoryLifecycleHref(item.vehicleId, repairOrderId, returnTo) : undefined;
  return <ShopReconVehicleCard focused={focused} inventoryHref={inventoryHref} inventoryUnavailableReason={inventoryUnavailableReason} initialStage={query?.stage} item={JSON.parse(JSON.stringify(item))} lifecycleWorkspace={JSON.parse(JSON.stringify(lifecycleWorkspace))} returnTo={returnTo} titlePreparationWorkspace={customerOwned ? null : JSON.parse(JSON.stringify(titlePreparationWorkspace))} />;
}
