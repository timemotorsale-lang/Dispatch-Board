export type RepairExplorerContext = {
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

export function repairExplorerHandoffHref(repairOrderId?: string) {
  const query = new URLSearchParams({ importExplorer: "1" });
  if (repairOrderId) query.set("repairOrderId", repairOrderId);
  return `/prototype/labor-guide?${query}`;
}
