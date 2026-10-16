import { RepairExplorer } from "@/features/prototype/repair-explorer/repair-explorer";
import { requireCurrentUser } from "@/server/auth/current-user";

export const metadata = { title: "Repair Explorer Preview | Dispatch Board" };

export default async function RepairExplorerPreviewPage() {
  const user = await requireCurrentUser("/prototype/repair-explorer");
  return <RepairExplorer storageKey={`dispatch-board.repair-explorer-preview.v1.${user.id}`} />;
}
