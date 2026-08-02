import { PartsOperationsWorkspace } from "@/features/inventory/parts-operations-workspace";
import { PartsStaffHome } from "@/features/parts/parts-staff-home";
import { requireCurrentUser } from "@/server/auth/current-user";
import { getPermittedWorkspaces, getWorkspaceKey } from "@/server/auth/navigation";
import { getPartsOperationsWorkspace } from "@/server/parts-operations/service";

type SearchParams = Promise<{ repairOrderId?: string; returnTo?: string; view?: string }>;

export default async function PartsOperationsPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireCurrentUser();
  const [{ repairOrderId, returnTo, view }, initial] = await Promise.all([
    searchParams,
    getPartsOperationsWorkspace(user)
  ]);
  const workspaceKey = getWorkspaceKey(user);
  const showWorkspaceReturn = getPermittedWorkspaces(user).some((workspace) => workspace.key === "VEHICLE_OPERATIONS_LEAD");
  const showAdvisorReturn = workspaceKey === "ADVISOR";
  const showPartsReturn = workspaceKey === "PARTS";

  if (workspaceKey === "PARTS" && !view && !repairOrderId) {
    return <PartsStaffHome model={JSON.parse(JSON.stringify(initial))} />;
  }

  return (
    <PartsOperationsWorkspace
      initial={JSON.parse(JSON.stringify(initial))}
      initialRepairOrderId={repairOrderId}
      initialView={view}
      returnTo={returnTo?.startsWith("/") && !returnTo.startsWith("//") ? returnTo : undefined}
      showAdvisorReturn={showAdvisorReturn}
      showPartsReturn={showPartsReturn}
      showWorkspaceReturn={showWorkspaceReturn}
    />
  );
}
