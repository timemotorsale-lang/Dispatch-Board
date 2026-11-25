import { AddVehicleWorkflow } from "@/features/inventory/add-vehicle-workflow";
import { requireCurrentUser } from "@/server/auth/current-user";
import { getPermittedWorkspaces } from "@/server/auth/navigation";
import { getVehicleRegistryCreateOptions, getVehicleRegistryToolAccess } from "@/server/vehicle-registry/service";
import Link from "next/link";

function safeReturnTo(value?: string) {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//") && !value.includes("\\") ? value : undefined;
}

export default async function AddVehicleWorkflowPage({ searchParams }: { searchParams?: Promise<{ returnTo?: string; vin?: string; intent?: string }> }) {
  const user = await requireCurrentUser();
  const params = searchParams ? await searchParams : {};
  const serviceOnly = params.intent === "service";
  const options = serviceOnly ? { locations: (await getVehicleRegistryToolAccess(user)).serviceLocations } : await getVehicleRegistryCreateOptions(user);
  const returnTo = safeReturnTo(params.returnTo);
  if (serviceOnly && !options.locations.length) return <section><h1>Vehicle intake unavailable</h1><p>Your account cannot add vehicles for service.</p><Link href={returnTo ?? "/vehicles/registry"}>Back to vehicle search</Link></section>;
  const showWorkspaceReturn = getPermittedWorkspaces(user).some((workspace) => workspace.key === "VEHICLE_OPERATIONS_LEAD");
  const vin = typeof params.vin === "string" ? params.vin.toUpperCase() : "";
  const initialVin = /^[A-HJ-NPR-Z0-9]{17}$/.test(vin) ? vin : undefined;
  return <AddVehicleWorkflow initialVin={initialVin} options={JSON.parse(JSON.stringify(options))} returnTo={returnTo} serviceOnly={serviceOnly} showWorkspaceReturn={showWorkspaceReturn} />;
}
