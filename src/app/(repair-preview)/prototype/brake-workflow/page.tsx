import { BrakeWorkflowPreview } from "@/features/prototype/repair-explorer/brake-workflow-preview";
import { requireCurrentUser } from "@/server/auth/current-user";

export const metadata = { title: "Brake Workflow Preview | Dispatch Board" };

export default async function BrakeWorkflowPage() {
  const user = await requireCurrentUser("/prototype/brake-workflow");
  return <BrakeWorkflowPreview storageKey={`dispatch-board.brake-workflow.v1.${user.id}`} />;
}
