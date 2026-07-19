import { WorkflowLauncher } from "@/features/inventory/workflow-launcher";
import { requireCurrentUser } from "@/server/auth/current-user";
import { getInventoryWorkflowLauncher } from "@/server/inventory-workflow-launcher/service";

export default async function InventoryWorkflowLauncherPage({ searchParams }: { searchParams?: Promise<{ inventoryUnitId?: string; repairJobId?: string; subjectId?: string; subjectType?: string; version?: string }> }) {
  const user = await requireCurrentUser();
  return <WorkflowLauncher model={getInventoryWorkflowLauncher(user, searchParams ? await searchParams : {})} />;
}
