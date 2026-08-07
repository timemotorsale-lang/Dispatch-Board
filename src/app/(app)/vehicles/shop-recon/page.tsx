import { ShopReconLanding } from "@/features/inventory/shop-recon-landing";
import { redirect } from "next/navigation";
import { requireCurrentUser } from "@/server/auth/current-user";
import { getPermittedWorkspaces, getWorkspaceKey, isTechnicianOnlyUser } from "@/server/auth/navigation";
import { getShopReconLanding } from "@/server/shop-completion/service";

export default async function ShopReconPage({ searchParams }: { searchParams?: Promise<{ blocker?: string; returnTo?: string; view?: string }> }) {
  const user = await requireCurrentUser();
  if (isTechnicianOnlyUser(user)) redirect("/my-tasks");
  const model = await getShopReconLanding(user);
  const params = searchParams ? await searchParams : {};
  const initialBlocker = ["parts", "approvals", "vendors"].includes(params.blocker ?? "") ? params.blocker : "all";
  const initialView = params.view === "high-volume" ? "high-volume" : "calm";
  const returnTo = params.returnTo?.startsWith("/") && !params.returnTo.startsWith("//") ? params.returnTo : undefined;
  const showWorkspaceReturn = getPermittedWorkspaces(user).some((workspace) => workspace.key === "VEHICLE_OPERATIONS_LEAD");
  const showAdvisorReturn = getWorkspaceKey(user) === "ADVISOR";

  return <ShopReconLanding initialBlocker={initialBlocker} initialView={initialView} model={JSON.parse(JSON.stringify(model))} returnTo={returnTo} showAdvisorReturn={showAdvisorReturn} showWorkspaceReturn={showWorkspaceReturn} />;
}
