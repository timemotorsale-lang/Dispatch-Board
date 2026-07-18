import { InventoryConsoleHome, type InventoryHomeData } from "@/features/inventory/inventory-console-home";
import { requireCurrentUser } from "@/server/auth/current-user";
import { getInventoryControlTowerProjection } from "@/server/inventory-control-tower";
import { getManagerReviewViewModelForToday } from "@/server/services/manager-review";

const stageLabels: Record<string, string> = { PURCHASED_OR_TRADE_IN: "Acquired", TRANSPORTATION: "Transport", RECEIVED: "Received", INSPECTION: "Inspection", RECONDITIONING: "Recon", TITLE_DOCUMENT_READINESS: "Title", PHOTOGRAPHY_MERCHANDISING: "Merchandising", FRONTLINE_READY: "Frontline", RESERVED_DEAL_PENDING: "Deal pending", SOLD: "Sold", DELIVERED: "Delivered", WHOLESALED_OR_OTHER_DISPOSITION: "Disposition" };

export default async function VehiclesPage({ searchParams }: { searchParams: Promise<{ locationId?: string; view?: string }> }) {
  const user = await requireCurrentUser();
  const { locationId, view: requestedView } = await searchParams;
  const savedView = (["ALL", "ATTENTION", "BLOCKED", "OVERDUE"] as const).includes(requestedView as "ALL" | "ATTENTION" | "BLOCKED" | "OVERDUE") ? requestedView as "ALL" | "ATTENTION" | "BLOCKED" | "OVERDUE" : "ALL";
  const savedViewNotice = requestedView && savedView === "ALL" && requestedView !== "ALL" ? `Saved view “${requestedView}” is unavailable; showing All inventory.` : null;
  let data: InventoryHomeData;
  try {
    const projection = await getInventoryControlTowerProjection(user, { locationId });
    let reviews: InventoryHomeData["reviews"] = { approvals: 0, reviews: 0, available: false };
    try {
      const view = await getManagerReviewViewModelForToday(user);
      reviews = { approvals: view.commandItems.filter((item) => item.queue === "WAITING_ON_APPROVAL").length, reviews: view.commandItems.filter((item) => item.queue === "READY_FOR_REVIEW").length, available: true };
    } catch { /* permission-scoped decision counts stay unavailable */ }
    data = {
      byLocation: projection.byLocation.map((item) => ({ count: item.count, locationId: item.locationId, name: item.name })),
      byStage: Object.entries(projection.byStage).map(([stage, summary]) => ({ count: summary.count, label: stageLabels[stage] ?? stage, stage })),
      error: null, freshness: projection.freshness === "LIVE" ? "LIVE" : "STALE", generatedAt: projection.generatedAt, locationId: projection.filters.locationId, savedView, savedViewNotice,
      priorityWork: projection.items.filter((item) => (savedView === "BLOCKED" ? item.operatingState === "BLOCKED" : savedView === "OVERDUE" ? item.overdue : item.overdue || item.operatingState === "BLOCKED" || item.operatingState === "WAITING")).map((item) => ({ ageDays: item.ageDays, id: item.id, inventoryNumber: item.inventoryNumber, issue: item.stateReason ?? item.nextAction, owner: item.ownerUser.name, overdue: item.overdue, state: item.operatingState, vehicle: `${item.vehicle.year} ${item.vehicle.make} ${item.vehicle.model}` })),
      reviews,
      totals: { active: projection.totals.units, blocked: projection.totals.blocked, exposureCents: projection.totals.exposureCents, overdue: projection.totals.overdue, waiting: projection.totals.waiting },
    };
  } catch (error) {
    data = { byLocation: [], byStage: [], error: error instanceof Error ? error.message : "Inventory Home is unavailable.", freshness: "UNAVAILABLE", generatedAt: null, locationId: locationId ?? null, savedView, savedViewNotice, priorityWork: [], reviews: { approvals: 0, reviews: 0, available: false }, totals: { active: 0, blocked: 0, exposureCents: 0, overdue: 0, waiting: 0 } };
  }
  return <InventoryConsoleHome data={data} />;
}
