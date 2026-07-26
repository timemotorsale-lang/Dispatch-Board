import { PartsOperationsWorkspace } from "@/features/inventory/parts-operations-workspace";
import { requireCurrentUser } from "@/server/auth/current-user";
import { getPermittedWorkspaces } from "@/server/auth/navigation";
import { getPartsOperationsWorkspace } from "@/server/parts-operations/service";

type SearchParams = Promise<{ repairOrderId?: string; view?: string }>;

export default async function PartsOperationsPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireCurrentUser();
  const [{ repairOrderId, view }, initial] = await Promise.all([
    searchParams,
    getPartsOperationsWorkspace(user)
  ]);
  const showWorkspaceReturn = getPermittedWorkspaces(user).some((workspace) => workspace.key === "VEHICLE_OPERATIONS_LEAD");

  return (
    <PartsOperationsWorkspace
      initial={JSON.parse(JSON.stringify(initial))}
      initialRepairOrderId={repairOrderId}
      initialView={view}
      showWorkspaceReturn={showWorkspaceReturn}
    />
  );
}
