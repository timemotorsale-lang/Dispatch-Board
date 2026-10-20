import { RepairExplorer } from "@/features/prototype/repair-explorer/repair-explorer";
import { requireCurrentUser } from "@/server/auth/current-user";

export const metadata = { title: "Repair Explorer Preview | Dispatch Board" };

export default async function RepairExplorerPreviewPage({ searchParams }: { searchParams?: Promise<{ system?: string; group?: string }> } = {}) {
  const user = await requireCurrentUser("/prototype/repair-explorer");
  const params: { system?: string; group?: string } = searchParams ? await searchParams : {};
  return <RepairExplorer storageKey={`dispatch-board.repair-explorer-preview.v1.${user.id}`} initialSystemId={params.system} initialGroupId={params.group} key={`${params.system ?? "brakes"}:${params.group ?? ""}`} />;
}
