import { redirect } from "next/navigation";
import { repairReviewHref } from "@/lib/repair-workflow-review";
import { requiresDiagnosticAuthorization } from "@/server/repair-order/diagnostic-authorization";
import { getRepairResume } from "@/server/repair-order/resume-service";
import { LaborGuideEntry } from "@/features/diagnostics/labor-guide-entry";
import { requireCurrentUser } from "@/server/auth/current-user";
import { LABOR_GUIDE_DIAGNOSTIC_NAVIGATION } from "@/server/diagnostics/labor-guide-navigation";
import { LABOR_OPERATION_ADD_ONS, LABOR_OPERATION_TAXONOMY } from "@/server/diagnostics/labor-operation-taxonomy";
import { getRepairOrderDetail, listRepairOrders } from "@/server/repair-order/service";
import { getLaborGuideRevision } from "@/server/repair-order/document-review-service";
import { estimateRevisionSeed, type SavedEstimateRevision } from "@/lib/labor-guide-estimate-revision";
import { getConnectedCatalogSystems } from "@/server/services/labor-catalog-settings";
import { getActiveLaborRate } from "@/server/services/labor-rate-settings";
import { canManageSettings } from "@/server/policies/access";
import { initialEstimatePricing } from "@/lib/labor-guide-controls";
import { repairExplorerStorageKey, safeLaborGuideReturnTo } from "@/lib/repair-explorer-context";

export type PageProps = { searchParams?: Promise<{ attachRepairOrder?: string | string[]; draftId?: string | string[]; reviseDocument?: string | string[]; workflow?: string | string[]; guide?: string | string[]; importExplorer?: string | string[]; experience?: string | string[]; mode?: string | string[]; repairOrderId?: string | string[]; returnLabel?: string | string[]; returnTo?: string | string[] }> };
const first = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;


export async function renderLaborGuidePage({ searchParams }: PageProps, initialGuideView: "legacy" | "new", presentation: "workspace" | "explorer" = "workspace") {
  const params = searchParams ? await searchParams : {};
  const reviseDocument = first(params.reviseDocument);
  const draftId = reviseDocument !== undefined ? undefined : first(params.draftId);
  const requestedMode = first(params.mode);
  const requestedRepairOrderId = first(params.repairOrderId);
  const authPath = presentation === "explorer" ? "/prototype/repair-explorer" : initialGuideView === "new" ? "/prototype/labor-guide" : "/diagnostics/labor-guide";
  const returnTo = reviseDocument && requestedRepairOrderId
    ? `/service-documents?${new URLSearchParams({ repairOrderId: requestedRepairOrderId, documentId: reviseDocument, workspace: "1" })}`
    : safeLaborGuideReturnTo(first(params.returnTo));
  const returnLabel = first(params.returnLabel)?.slice(0, 120);
  const authQuery = new URLSearchParams();
  if (reviseDocument !== undefined) authQuery.set("reviseDocument", reviseDocument);
  if (draftId !== undefined) authQuery.set("draftId", draftId);
  if (first(params.attachRepairOrder) === "1") authQuery.set("attachRepairOrder", "1");
  if (requestedRepairOrderId) authQuery.set("repairOrderId", requestedRepairOrderId);
  if (first(params.importExplorer) === "1") authQuery.set("importExplorer", "1");
  if (first(params.workflow) === "review") authQuery.set("workflow", "review");
  if (returnTo) authQuery.set("returnTo", returnTo);
  if (returnTo && returnLabel) authQuery.set("returnLabel", returnLabel);
  const user = await requireCurrentUser(authQuery.size ? authPath + "?" + authQuery : authPath);
  const [ordersResult, activeResult, rateResult, catalogResult] = await Promise.allSettled([
    listRepairOrders(user, { page: 1, pageSize: 10, state: "ACTIVE" }),
    requestedRepairOrderId ? getRepairOrderDetail(user, requestedRepairOrderId) : Promise.resolve(null),
    getActiveLaborRate(user),
    getConnectedCatalogSystems(user),
  ]);
  if (initialGuideView === "new" && draftId === undefined && first(params.importExplorer) === "1" && requestedRepairOrderId && (activeResult.status === "rejected" || !activeResult.value || activeResult.value.closedAt)) {
    return <main><h1>Repair order could not open</h1><p role="alert">The requested repair order is unavailable, closed, or outside your access. No draft was imported. Return to the original guide and retry.</p><a href="/diagnostics/labor-guide">Return to Labor Guide</a></main>;
  }
  const orders = ordersResult.status === "fulfilled" ? ordersResult.value : { items: [] };
  const active = activeResult.status === "fulfilled" ? activeResult.value : null;
  if (active?.origin === "CUSTOMER_REPAIR" && !active.closedAt && requiresDiagnosticAuthorization(active.serviceVisit.sourceSnapshot)) {
    const resume = await getRepairResume(user, active.id);
    if (resume?.needsDiagnosticAuthorization ?? true) {
      redirect(repairReviewHref(active.id, "authorization", { returnTo, returnLabel }));
    }
  }
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

  let estimateRevision: SavedEstimateRevision | undefined;
  if (reviseDocument !== undefined) {
    try {
      if (!active || !reviseDocument || !laborRate) throw new Error("Open an accessible repair order with a shop labor rate to edit this estimate.");
      estimateRevision = await getLaborGuideRevision(user, active.id, reviseDocument);
    } catch (error) {
      return <main><h1>Estimate could not open for editing</h1><p role="alert">{error instanceof Error ? error.message : "Open the latest saved estimate and try again."}</p><a href={returnTo ?? "/service-documents"}>Back to saved estimate</a></main>;
    }
  }
  const revisionSeed = estimateRevision ? estimateRevisionSeed(estimateRevision, LABOR_OPERATION_TAXONOMY.flatMap(system => system.groups.flatMap(group => group.operations))) : undefined;
  const repairOrders = orders.items.map((order) => ({
    id: order.id,
    label: `${order.repairOrderNumber} - ${[order.vehicle.year, order.vehicle.make, order.vehicle.model].filter(Boolean).join(" ") || order.vehicle.vehicleNumber}`,
  }));

  return <LaborGuideEntry estimateRevision={estimateRevision} initialExplorerSeed={revisionSeed} presentation={estimateRevision ? "explorer" : presentation} attachRepairOrderOnOpen={first(params.attachRepairOrder) === "1"} initialDraftId={draftId} expectedDraftRepairOrderId={requestedRepairOrderId} reviewWorkflow={first(params.workflow) === "review"} initialGuideView={initialGuideView} explorerStorageKey={!estimateRevision && initialGuideView === "new" && draftId === undefined && first(params.importExplorer) === "1" ? `${repairExplorerStorageKey(user.id, requestedRepairOrderId)}.handoff` : undefined} activeRepairOrder={activeRepairOrder} catalog={LABOR_GUIDE_DIAGNOSTIC_NAVIGATION} connectedExplorer={first(params.experience) === "explorer"} connectedSystemIds={catalogResult.status === "fulfilled" ? catalogResult.value.allowedSystemIds : ["brakes", "steering"]} initialMode={requestedMode === "engine" ? "engine" : "manual"} initialNotice={initialNotice} initialPricing={{ ...initialEstimatePricing, laborRate: laborRate?.laborRate ?? 125, ...(estimateRevision ? { taxRatePercent: estimateRevision.taxRatePercent } : {}), ratePolicyId: laborRate?.policyId, ratePolicyVersion: laborRate?.policyVersion }} pricingAvailable={Boolean(laborRate)} canOverrideLaborRate={canManageSettings(user)} key={`${reviseDocument ?? ""}:${first(params.attachRepairOrder) ?? ""}:${presentation}:${initialGuideView}:${user.id}:${draftId !== undefined ? `${draftId}:${requestedRepairOrderId ?? ""}` : activeRepairOrder?.id ?? "blank-estimate"}:${draftId === undefined && first(params.importExplorer) === "1" ? "explorer-import" : "guide"}`} laborAddOns={LABOR_OPERATION_ADD_ONS} repairOrders={repairOrders} repairTaxonomy={LABOR_OPERATION_TAXONOMY} returnLabel={estimateRevision ? "Back to saved estimate" : returnLabel} returnTo={returnTo} />;
}
