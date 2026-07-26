import { AddVehicleWorkflow } from "@/features/inventory/add-vehicle-workflow";
import { requireCurrentUser } from "@/server/auth/current-user";
import { getPermittedWorkspaces } from "@/server/auth/navigation";
import { getVehicleRegistryCreateOptions } from "@/server/vehicle-registry/service";

function safeReturnTo(value?: string) {
  return value?.startsWith("/") && !value.startsWith("//") && !value.includes("\\") ? value : undefined;
}

export default async function AddVehicleWorkflowPage({ searchParams }: { searchParams?: Promise<{ returnTo?: string }> }) {
  const user = await requireCurrentUser();
  const params = searchParams ? await searchParams : {};
  const options = await getVehicleRegistryCreateOptions(user);
  const showWorkspaceReturn = getPermittedWorkspaces(user).some((workspace) => workspace.key === "VEHICLE_OPERATIONS_LEAD");
  return <AddVehicleWorkflow options={JSON.parse(JSON.stringify(options))} returnTo={safeReturnTo(params.returnTo)} showWorkspaceReturn={showWorkspaceReturn} />;
}
