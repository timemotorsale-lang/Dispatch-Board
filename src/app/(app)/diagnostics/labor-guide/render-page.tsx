import { LaborGuideEntry } from "@/features/diagnostics/labor-guide-entry";
import { requireCurrentUser } from "@/server/auth/current-user";
import { LABOR_GUIDE_DIAGNOSTIC_NAVIGATION } from "@/server/diagnostics/labor-guide-navigation";
import { LABOR_OPERATION_ADD_ONS, LABOR_OPERATION_TAXONOMY } from "@/server/diagnostics/labor-operation-taxonomy";
import { getRepairOrderDetail, listRepairOrders } from "@/server/repair-order/service";
import { getConnectedCatalogSystems } from "@/server/services/labor-catalog-settings";
import { getActiveLaborRate } from "@/server/services/labor-rate-settings";
import { canManageSettings } from "@/server/policies/access";
import { initialEstimatePricing } from "@/lib/labor-guide-controls";
import { repairExplorerStorageKey } from "@/lib/repair-explorer-context";

export type PageProps = { searchParams?: Promise<{ workflow?: string | string[]; guide?: string | string[]; importExplorer?: string | string[]; experience?: string | string[]; mode?: string | string[]; repairOrderId?: string | string[]; returnLabel?: string | string[]; returnTo?: string | string[] }> };
const first = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;
function safeReturnTo(value: string | undefined) {
  return value?.startsWith("/") && !value.startsWith("//") ? value : undefined;
}

export async function renderLaborGuidePage({ searchParams }: PageProps, initialGuideView: "legacy" | "new") {
  const user = await requireCurrentUser(initialGuideView === "new" ? "/prototype/labor-guide" : "/diagnostics/labor-guide");
  const params = searchParams ? await searchParams : {};
  const requestedMode = first(params.mode);
  const requestedRepairOrderId = first(params.repairOrderId);
  const returnTo = safeReturnTo(first(params.returnTo));
  const returnLabel = first(params.returnLabel)?.slice(0, 120);
  const [ordersResult, activeResult, rateResult, catalogResult] = await Promise.allSettled([
    listRepairOrders(user, { page: 1, pageSize: 10, state: "ACTIVE" }),
    requestedRepairOrderId ? getRepairOrderDetail(user, requestedRepairOrderId) : Promise.resolve(null),
    getActiveLaborRate(user),
    getConnectedCatalogSystems(user),
  ]);
  if (initialGuideView === "new" && first(params.importExplorer) === "1" && requestedRepairOrderId && (activeResult.status === "rejected" || !activeResult.value || activeResult.value.closedAt)) {
    return <main><h1>Repair order could not open</h1><p role="alert">The requested repair order is unavailable, closed, or outside your access. No draft was imported. Return to the original guide and retry.</p><a href="/diagnostics/labor-guide">Return to Labor Guide</a></main>;
  }
  const orders = ordersResult.status === "fulfilled" ? ordersResult.value : { items: [] };
  const active = activeResult.status === "fulfilled" ? activeResult.value : null;
  const laborRate = rateResult.status === "fulfilled" ? rateResult.value : null;
  const initialNotice = [
    ordersResult.status === "rejected" ? "Repair-order listing could not load. Check access or connectivity; this is not a no-records result." : "",
    activeResult.status === "rejected" ? "The requested repair order could not load. No vehicle is selected; verify access and retry before creating records." : "",
    rateResult.status === "rejected" ? "Shop labor-rate policy could not load. Draft work is available, but official presentation is blocked until settings can be verified." : "",
  ].filter(Boolean).join(" ");
  const activeRepairOrder = active ? {
    id: active.id,
    repairOrderNumber: active.repairOrderNumber,
    openedAt: active.openedAt instanceof Date ? active.openedAt.toISOString() : String(active.openedAt),
    concern: active.serviceVisit.concernSummary,
    customer: active.customer?.displayName ?? active.inventoryUnit?.inventoryNumber ?? "Internal vehicle",
    vehicle: {
      id: active.vehicle.id,
      label: [active.vehicle.year, active.vehicle.make, active.vehicle.model].filter(Boolean).join(" ") || active.vehicle.vehicleNumber,
      vin: active.vehicle.vin ?? active.vehicle.vehicleNumber,
    },
  } : null;

  const repairOrders = orders.items.map((order) => ({
    id: order.id,
    label: `${order.repairOrderNumber} - ${[order.vehicle.year, order.vehicle.make, order.vehicle.model].filter(Boolean).join(" ") || order.vehicle.vehicleNumber}`,
  }));

  return <LaborGuideEntry reviewWorkflow={first(params.workflow) === "review" && Boolean(activeRepairOrder)} initialGuideView={initialGuideView} explorerStorageKey={initialGuideView === "new" && first(params.importExplorer) === "1" ? `${repairExplorerStorageKey(user.id, requestedRepairOrderId)}.handoff` : undefined} activeRepairOrder={activeRepairOrder} catalog={LABOR_GUIDE_DIAGNOSTIC_NAVIGATION} connectedExplorer={first(params.experience) === "explorer"} connectedSystemIds={catalogResult.status === "fulfilled" ? catalogResult.value.allowedSystemIds : ["brakes", "steering"]} initialMode={requestedMode === "engine" ? "engine" : "manual"} initialNotice={initialNotice} initialPricing={{ ...initialEstimatePricing, laborRate: laborRate?.laborRate ?? 125, ratePolicyId: laborRate?.policyId, ratePolicyVersion: laborRate?.policyVersion }} pricingAvailable={Boolean(laborRate)} canOverrideLaborRate={canManageSettings(user)} key={`${initialGuideView}:${user.id}:${activeRepairOrder?.id ?? "blank-estimate"}:${first(params.importExplorer) === "1" ? "explorer-import" : "guide"}`} laborAddOns={LABOR_OPERATION_ADD_ONS} repairOrders={repairOrders} repairTaxonomy={LABOR_OPERATION_TAXONOMY} returnLabel={returnLabel} returnTo={returnTo} />;
}
