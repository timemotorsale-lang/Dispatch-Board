import { notFound } from "next/navigation";

import { ShopReconVehicleCard } from "@/features/inventory/shop-recon-vehicle-card";
import { requireCurrentUser } from "@/server/auth/current-user";
import { getShopReconLanding } from "@/server/shop-completion/service";
import { getShopReconLifecycleWorkspace } from "@/server/shop-recon/service";
import { getTitlePreparation } from "@/server/shop-recon/parallel-title-preparation-service";

export default async function ShopReconVehicleCardPage({ params, searchParams }: { params: Promise<{ repairOrderId: string }>; searchParams?: Promise<{ returnTo?: string; stage?: string }> }) {
  const user = await requireCurrentUser();
  const [{ repairOrderId }, query, model] = await Promise.all([params, searchParams ?? Promise.resolve<{ returnTo?: string; stage?: string }>({}), getShopReconLanding(user)]);
  const item = model.items.find(candidate => candidate.id === repairOrderId);
  if (!item) notFound();
  const [lifecycleWorkspace, titlePreparationWorkspace] = await Promise.all([getShopReconLifecycleWorkspace(user, repairOrderId), getTitlePreparation(user, repairOrderId)]);
  const returnTo = query.returnTo?.startsWith("/") && !query.returnTo.startsWith("//") ? query.returnTo : "/vehicles/shop-recon";
  return <ShopReconVehicleCard initialStage={query.stage} item={JSON.parse(JSON.stringify(item))} lifecycleWorkspace={JSON.parse(JSON.stringify(lifecycleWorkspace))} returnTo={returnTo} titlePreparationWorkspace={JSON.parse(JSON.stringify(titlePreparationWorkspace))} />;
}
