import { GovernedReportsWorkspace } from "@/features/inventory/governed-reports-workspace";
import { requireCurrentUser } from "@/server/auth/current-user";
import { getInventoryGovernanceConsole } from "@/server/inventory-governance/service";

export default async function InventoryReportsPage() {
  const user = await requireCurrentUser();
  return <GovernedReportsWorkspace model={await getInventoryGovernanceConsole(user)} />;
}
