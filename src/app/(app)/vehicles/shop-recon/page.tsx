import { ShopReconLanding } from "@/features/inventory/shop-recon-landing";
import { requireCurrentUser } from "@/server/auth/current-user";
import { getShopReconLanding } from "@/server/shop-completion/service";

export default async function ShopReconPage({ searchParams }: { searchParams?: Promise<{ blocker?: string }> }) {
  const user = await requireCurrentUser();
  const model = await getShopReconLanding(user);
  const params = searchParams ? await searchParams : {};
  const initialBlocker = ["parts", "approvals", "vendors"].includes(params.blocker ?? "") ? params.blocker : "all";

  return <ShopReconLanding initialBlocker={initialBlocker} model={JSON.parse(JSON.stringify(model))} />;
}
