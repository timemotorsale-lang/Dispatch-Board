import { AddVehicleWorkflow } from "@/features/inventory/add-vehicle-workflow";
import { requireCurrentUser } from "@/server/auth/current-user";
import { getVehicleRegistryCreateOptions } from "@/server/vehicle-registry/service";

export default async function AddVehicleWorkflowPage() {
  const user = await requireCurrentUser();
  const options = await getVehicleRegistryCreateOptions(user);
  return <AddVehicleWorkflow options={JSON.parse(JSON.stringify(options))} />;
}
