export const vehiclePilotFeatureCode = "VEHICLE_WORKSPACE_PILOT";

export type VehiclePilotMode = "existing" | "side-by-side" | "new";

export function existingVehicleHref(vehicleId: string) {
  return `/vehicles/360/${encodeURIComponent(vehicleId)}`;
}

export function vehiclePilotHref(vehicleId: string) {
  return `/vehicles/${encodeURIComponent(vehicleId)}/workbench?pilot=1`;
}

export function isVehiclePilotReturn(href: string | undefined, vehicleId: string) {
  const path = `/vehicles/${encodeURIComponent(vehicleId)}/workbench`;
  if (!href?.startsWith(`${path}?`)) return false;
  return new URLSearchParams(href.slice(path.length + 1).split("#", 1)[0]).get("pilot") === "1";
}

export function pilotRepairOrderHref(repairOrderId: string, vehicleId: string, pilot: boolean) {
  const query = new URLSearchParams({ repairOrderId, vehicleId });
  if (pilot) query.set("pilot", "1");
  return `/vehicles/repair-workbench?${query}`;
}
