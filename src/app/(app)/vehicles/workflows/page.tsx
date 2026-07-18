import { WorkflowLauncher } from "@/features/inventory/workflow-launcher";
import { requireCurrentUser } from "@/server/auth/current-user";

export default async function InventoryWorkflowLauncherPage() {
  const user = await requireCurrentUser();
  return <WorkflowLauncher roles={user.roles} />;
}

