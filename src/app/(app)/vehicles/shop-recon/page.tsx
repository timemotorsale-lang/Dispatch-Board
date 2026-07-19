import { ShopReconLanding } from "@/features/inventory/shop-recon-landing";
import { requireCurrentUser } from "@/server/auth/current-user";
import { getShopReconLanding } from "@/server/shop-completion/service";

export default async function ShopReconPage() {
  const user = await requireCurrentUser();
  const model = await getShopReconLanding(user);

  return <ShopReconLanding model={JSON.parse(JSON.stringify(model))} />;
}
