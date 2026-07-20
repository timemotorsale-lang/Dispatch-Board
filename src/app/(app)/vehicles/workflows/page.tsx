import { WorkflowLauncher } from "@/features/inventory/workflow-launcher";
import { requireCurrentUser } from "@/server/auth/current-user";
import { getInventoryWorkflowLauncher } from "@/server/inventory-workflow-launcher/service";
import { getInventoryOrchestration } from "@/server/inventory-execution/orchestration-service";

export default async function InventoryWorkflowLauncherPage({ searchParams }: { searchParams?: Promise<{ inventoryUnitId?: string; repairJobId?: string; subjectId?: string; subjectType?: string; version?: string }> }) {
  const user = await requireCurrentUser();
  const context = searchParams ? await searchParams : {};
  return <WorkflowLauncher model={getInventoryWorkflowLauncher(user, context)} orchestration={await getInventoryOrchestration(user, context)} />;
}
