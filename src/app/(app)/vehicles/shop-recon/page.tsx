import { ShopReconLanding } from "@/features/inventory/shop-recon-landing";
import { redirect } from "next/navigation";
import { requireCurrentUser } from "@/server/auth/current-user";
import { getPermittedWorkspaces, isTechnicianOnlyUser } from "@/server/auth/navigation";
import { getShopReconLanding } from "@/server/shop-completion/service";

export default async function ShopReconPage({ searchParams }: { searchParams?: Promise<{ blocker?: string }> }) {
  const user = await requireCurrentUser();
  if (isTechnicianOnlyUser(user)) redirect("/my-tasks");
  const model = await getShopReconLanding(user);
  const params = searchParams ? await searchParams : {};
  const initialBlocker = ["parts", "approvals", "vendors"].includes(params.blocker ?? "") ? params.blocker : "all";
  const showWorkspaceReturn = getPermittedWorkspaces(user).some((workspace) => workspace.key === "VEHICLE_OPERATIONS_LEAD");

  return <ShopReconLanding initialBlocker={initialBlocker} model={JSON.parse(JSON.stringify(model))} showWorkspaceReturn={showWorkspaceReturn} />;
}
