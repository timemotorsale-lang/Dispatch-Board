import { Vehicle360Workspace } from "@/features/inventory/vehicle-360-workspace";
import { requireCurrentUser } from "@/server/auth/current-user";
import { getVehicle360 } from "@/server/vehicle-360/service";
import { WorkspaceMockupReference } from "@/components/ui/workspace-mockup-reference";

export default async function Vehicle360Page({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireCurrentUser(), { id } = await params, view = await getVehicle360(user, id);
  return <div className="workspace-page-with-reference"><WorkspaceMockupReference image="/mockups/vehicle-360-workspace.png" role="Inventory, service advisor, and manager" title="Vehicle 360 Workspace" /><Vehicle360Workspace initial={JSON.parse(JSON.stringify(view))} /></div>;
}
