export function inventoryLifecycleHref(vehicleId: string, repairOrderId: string, returnTo: string) {
  const query = new URLSearchParams({ view: "lifecycle", repairOrderId, returnTo });
  return `/vehicles/${encodeURIComponent(vehicleId)}/inventory-planning?${query}`;
}

export function shopReconLifecycleHref(repairOrderId: string, returnTo: string) {
  const query = new URLSearchParams({ view: "lifecycle", returnTo });
  return `/vehicles/shop-recon/${encodeURIComponent(repairOrderId)}?${query}`;
}
export const customerInventoryLifecycleNotice = "Customer-owned vehicle. If the dealership has acquired it, update its status to dealership inventory through Acquisition & Intake to use Inventory Lifecycle.";
