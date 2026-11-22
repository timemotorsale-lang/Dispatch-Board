import { Vehicle360Workspace } from "@/features/inventory/vehicle-360-workspace";
import { requireCurrentUser } from "@/server/auth/current-user";
import { listVehicleWorkActions } from "@/server/repair-order/resume-service";
import { getVehicle360 } from "@/server/vehicle-360/service";

export default async function Vehicle360Page({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireCurrentUser(), { id } = await params;
  const view = await getVehicle360(user, id);
  const work = await listVehicleWorkActions(user, [id]);
  return <Vehicle360Workspace initial={JSON.parse(JSON.stringify(view))} work={work[id]} />;
}
