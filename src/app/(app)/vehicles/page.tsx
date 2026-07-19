import { InventoryConsoleHome, type InventoryHomeData } from "@/features/inventory/inventory-console-home";
import { requireCurrentUser } from "@/server/auth/current-user";
import { getInventoryConsoleOperationalFacts } from "@/server/inventory-console-home";
import { buildInventoryPriorityWork } from "@/server/inventory-console-home/priority-work";
import { getInventoryConsoleSavedView, INVENTORY_CONSOLE_WORK_VIEWS, listInventoryConsoleSavedViews, type InventoryConsoleWorkView } from "@/server/inventory-console-saved-views";
import { getInventoryControlTowerProjection } from "@/server/inventory-control-tower";
import { isManager } from "@/server/policies/access";
import { getManagerReviewViewModelForToday } from "@/server/services/manager-review";

const stageLabels: Record<string, string> = { PURCHASED_OR_TRADE_IN: "Acquired", TRANSPORTATION: "Transport", RECEIVED: "Received", INSPECTION: "Inspection", RECONDITIONING: "Recon", TITLE_DOCUMENT_READINESS: "Title", PHOTOGRAPHY_MERCHANDISING: "Merchandising", FRONTLINE_READY: "Frontline", RESERVED_DEAL_PENDING: "Deal pending", SOLD: "Sold", DELIVERED: "Delivered", WHOLESALED_OR_OTHER_DISPOSITION: "Disposition" };

export default async function VehiclesPage({ searchParams }: { searchParams: Promise<{ locationId?: string; savedViewId?: string; view?: string }> }) {
  const user = await requireCurrentUser();
  const { locationId: requestedLocationId, savedViewId, view: requestedView } = await searchParams;
  let savedViews: InventoryHomeData["savedViews"] = [];
  let selectedSavedView: InventoryHomeData["savedViews"][number] | null = null;
  try {
    savedViews = await listInventoryConsoleSavedViews(user);
    selectedSavedView = savedViewId ? await getInventoryConsoleSavedView(user, savedViewId) : null;
  } catch { /* View storage must not hide the operational Home. */ }
  const requestedCode = String(requestedView ?? "ALL").toUpperCase() as InventoryConsoleWorkView;
  const systemView = INVENTORY_CONSOLE_WORK_VIEWS.includes(requestedCode) ? requestedCode : "ALL";
  const savedView = selectedSavedView?.workView ?? systemView;
  const locationId = selectedSavedView?.locationId ?? requestedLocationId;
  const savedViewNotice = savedViewId && !selectedSavedView
    ? "That saved view is unavailable or outside your visibility; showing the requested system view."
    : requestedView && systemView === "ALL" && requestedCode !== "ALL" ? `View “${requestedView}” is invalid; showing All inventory.` : null;
  let data: InventoryHomeData;
  try {
    const projection = await getInventoryControlTowerProjection(user, { locationId });
    let reviews: InventoryHomeData["reviews"] = { approvals: 0, reviews: 0, available: false };
    try {
      const reviewModel = await getManagerReviewViewModelForToday(user);
      reviews = { approvals: reviewModel.commandItems.filter((item) => item.queue === "WAITING_ON_APPROVAL").length, reviews: reviewModel.commandItems.filter((item) => item.queue === "READY_FOR_REVIEW").length, available: true };
    } catch { /* Permission-scoped decision counts stay unavailable. */ }
    let operational: InventoryHomeData["operational"] = null;
    try { operational = await getInventoryConsoleOperationalFacts({ locationId: projection.filters.locationId }); } catch { /* Source-specific unavailable state is rendered. */ }
    const priorityItems = buildInventoryPriorityWork(projection.items, user.id, savedView, new Date(projection.generatedAt));
    data = {
      activeSavedViewId: selectedSavedView?.id ?? null,
      byLocation: projection.byLocation.map((item) => ({ count: item.count, locationId: item.locationId, name: item.name })),
      byStage: projection.byStage.map((summary) => ({ count: summary.count, label: stageLabels[summary.stage] ?? summary.label, stage: summary.stage })),
      canShareSavedViews: isManager(user), error: null, freshness: projection.freshness === "COMPLETE" ? "LIVE" : "STALE", generatedAt: projection.generatedAt,
      locationId: projection.filters.locationId, operational, savedViews, savedView, savedViewNotice,
      priorityWork: priorityItems,
      reviews,
      totals: { active: projection.totals.units, blocked: projection.totals.blocked, exposureCents: projection.totals.exposureCents, overdue: projection.totals.overdue, waiting: projection.totals.waiting }
    };
  } catch (error) {
    data = { activeSavedViewId: selectedSavedView?.id ?? null, byLocation: [], byStage: [], canShareSavedViews: isManager(user), error: error instanceof Error ? error.message : "Inventory Home is unavailable.", freshness: "UNAVAILABLE", generatedAt: null, locationId: locationId ?? null, operational: null, savedViews, savedView, savedViewNotice, priorityWork: [], reviews: { approvals: 0, reviews: 0, available: false }, totals: { active: 0, blocked: 0, exposureCents: 0, overdue: 0, waiting: 0 } };
  }
  return <InventoryConsoleHome data={data} />;
}
