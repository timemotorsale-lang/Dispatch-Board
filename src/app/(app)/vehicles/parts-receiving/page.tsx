import { PartsReceivingWorkspace } from "@/features/parts/parts-receiving-workspace";
import { requireCurrentUser } from "@/server/auth/current-user";
import { getPartsOperationsWorkspace } from "@/server/parts-operations/service";

export default async function PartsReceivingPage() {
  const user = await requireCurrentUser();
  const initial = await getPartsOperationsWorkspace(user);
  return <PartsReceivingWorkspace initial={JSON.parse(JSON.stringify(initial))} />;
}
