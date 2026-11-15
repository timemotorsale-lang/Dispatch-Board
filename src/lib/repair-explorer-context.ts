export type RepairExplorerContext = {
  reviewWorkflow?: boolean;
  repairOrderId: string;
  repairOrderNumber: string;
  vehicleId: string;
  vehicleLabel: string;
  vin: string | null;
  inventoryUnitId: string | null;
  inventoryNumber: string | null;
  concern: string;
  laborRate: number;
};

export function repairExplorerStorageKey(userId: string, repairOrderId?: string) {
  const base = `dispatch-board.repair-explorer-preview.v1.${userId}`;
  return repairOrderId ? `${base}.ro.${encodeURIComponent(repairOrderId)}` : base;
}

export function repairExplorerHandoffHref(repairOrderId?: string, reviewWorkflow = false) {
  const query = new URLSearchParams({ importExplorer: "1" });
  if (reviewWorkflow) query.set("workflow", "review");
  if (repairOrderId) query.set("repairOrderId", repairOrderId);
  return `/prototype/repair-explorer?${query}`;
}

export function safeLaborGuideReturnTo(value: string | undefined) {
  if (!value?.startsWith("/") || value.startsWith("//") || [...value].some(character => character === "\\" || character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127)) return undefined;
  try {
    const destination = new URL(value, "https://workspace.invalid");
    return destination.origin === "https://workspace.invalid" ? `${destination.pathname}${destination.search}${destination.hash}` : undefined;
  } catch { return undefined; }
}