export type RepairExplorerContext = {
  reviewWorkflow?: boolean;
  returnTo?: string;
  repairOrderId: string;
  repairOrderNumber: string;
  vehicleId: string;
  vehicleLabel: string;
  vin: string | null;
  origin?: "CUSTOMER_REPAIR" | "INVENTORY_RECON";
  inventoryUnitId: string | null;
  inventoryNumber: string | null;
  concern: string;
  laborRate: number;
};

export function repairExplorerStorageKey(userId: string, repairOrderId?: string) {
  const base = `dispatch-board.repair-explorer-preview.v1.${userId}`;
  return repairOrderId ? `${base}.ro.${encodeURIComponent(repairOrderId)}` : base;
}

export function repairOrderDocumentsHref(repairOrderId: string, returnTo?: string) {
  const query = new URLSearchParams({ repairOrderId, workspace: "1" });
  if (returnTo) query.set("returnTo", returnTo);
  return `/service-documents?${query}`;
}

export function repairExplorerHandoffHref(repairOrderId?: string, reviewWorkflow = false, returnTo?: string) {
  const query = new URLSearchParams({ importExplorer: "1" });
  if (reviewWorkflow) query.set("workflow", "review");
  if (repairOrderId) query.set("repairOrderId", repairOrderId);
  if (returnTo) {
    query.set("returnTo", returnTo);
    query.set("returnLabel", "Back to repair order");
  }
  return `/prototype/repair-explorer?${query}`;
}

export function safeLaborGuideReturnTo(value: string | undefined) {
  if (!value?.startsWith("/") || value.startsWith("//") || [...value].some(character => character === "\\" || character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127)) return undefined;
  try {
    const destination = new URL(value, "https://workspace.invalid");
    return destination.origin === "https://workspace.invalid" ? `${destination.pathname}${destination.search}${destination.hash}` : undefined;
  } catch { return undefined; }
}
