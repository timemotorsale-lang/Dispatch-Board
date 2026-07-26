import { OperationsCoordinatorWorkspace } from "@/features/operations-coordinator/operations-coordinator-workspace";
import { requireCurrentUser } from "@/server/auth/current-user";
import { getOperationsCoordinatorWorkspace } from "@/server/operations-coordinator/service";

export default async function OperationsCoordinatorPage() {
  const user = await requireCurrentUser();
  const model = await getOperationsCoordinatorWorkspace(user);

  return <OperationsCoordinatorWorkspace model={JSON.parse(JSON.stringify(model))} />;
}
