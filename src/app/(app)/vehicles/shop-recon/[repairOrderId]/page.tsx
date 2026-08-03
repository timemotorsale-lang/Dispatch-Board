import { notFound } from "next/navigation";

import { ShopReconVehicleCard } from "@/features/inventory/shop-recon-vehicle-card";
import { requireCurrentUser } from "@/server/auth/current-user";
import { getShopReconLanding } from "@/server/shop-completion/service";

export default async function ShopReconVehicleCardPage({ params, searchParams }: { params: Promise<{ repairOrderId: string }>; searchParams?: Promise<{ returnTo?: string }> }) {
  const user = await requireCurrentUser();
  const [{ repairOrderId }, query, model] = await Promise.all([params, searchParams ?? Promise.resolve<{ returnTo?: string }>({}), getShopReconLanding(user)]);
  const item = model.items.find(candidate => candidate.id === repairOrderId);
  if (!item) notFound();
  const returnTo = query.returnTo?.startsWith("/") && !query.returnTo.startsWith("//") ? query.returnTo : "/vehicles/shop-recon";
  return <ShopReconVehicleCard item={JSON.parse(JSON.stringify(item))} returnTo={returnTo} />;
}
