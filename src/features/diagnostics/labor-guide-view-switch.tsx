export type LaborGuideView = "legacy" | "new";

export function laborGuideHref(_view: LaborGuideView, repairOrderId?: string, reviewWorkflow = false) {
  const query = new URLSearchParams();
  if (repairOrderId) query.set("repairOrderId", repairOrderId);
  if (reviewWorkflow) query.set("workflow", "review");
  return `/prototype/repair-explorer${query.size ? `?${query}` : ""}`;
}
