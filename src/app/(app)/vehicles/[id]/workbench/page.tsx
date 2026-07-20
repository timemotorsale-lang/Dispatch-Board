import { VehicleExecutionWorkbench } from "@/features/inventory/vehicle-execution-workbench";
import { requireCurrentUser } from "@/server/auth/current-user";
import { getVehicleExecutionWorkbench } from "@/server/inventory-execution/workbench-service";

export default async function VehicleWorkbenchPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireCurrentUser(), { id } = await params, projection = await getVehicleExecutionWorkbench(user, id);
  return <VehicleExecutionWorkbench initial={JSON.parse(JSON.stringify(projection))} />;
}
