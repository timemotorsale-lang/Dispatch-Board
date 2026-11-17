export function waitingJobPartsReady(job: {
  partsRequired?: boolean;
  executionBlockerReason?: string | null;
  partDemands?: { partId?: string; status: string; quantityRequired: number; quantityReserved: number }[];
  partCustodyEvents?: { partId: string; type: string; quantity: number }[];
}) {
  const demands = job.partDemands ?? [];
  if (job.partsRequired !== true || job.executionBlockerReason || !demands.length) return false;
  const installed = new Map<string, number>();
  const events = job.partCustodyEvents ?? [];
  for (const event of events) {
    if (event.type !== "INSTALL" || events.some(other => other.partId === event.partId && ["UNUSED_RETURN", "WARRANTY_SHIP", "VENDOR_SHIP"].includes(other.type))) continue;
    installed.set(event.partId, (installed.get(event.partId) ?? 0) + event.quantity);
  }
  return demands.every(demand => {
    if (demand.status === "CANCELLED") return false;
    const reserved = demand.status === "RELEASED" ? 0 : demand.quantityReserved;
    const missing = Math.max(0, demand.quantityRequired - reserved);
    if (!missing) return true;
    const quantity = demand.partId ? installed.get(demand.partId) ?? 0 : 0;
    if (!demand.partId || quantity < missing) return false;
    installed.set(demand.partId, quantity - missing);
    return true;
  });
}
