import { DomainWorkflowOperations } from "@/features/inventory/domain-workflow-operations";
import { requireCurrentUser } from "@/server/auth/current-user";
import { getDomainWorkflowOperations } from "@/server/domain-workflow-operations";

export default async function DomainWorkflowOperationsPage() {
  const user = await requireCurrentUser();
  const initial = await getDomainWorkflowOperations(user);
  return <DomainWorkflowOperations initial={JSON.parse(JSON.stringify(initial))} />;
}
