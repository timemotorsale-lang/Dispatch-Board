import { redirect } from "next/navigation";
import { repairReviewHref } from "@/lib/repair-workflow-review";
import { requiresDiagnosticAuthorization } from "@/server/repair-order/diagnostic-authorization";
import { getRepairResume } from "@/server/repair-order/resume-service";
import { renderLaborGuidePage } from "@/app/(app)/diagnostics/labor-guide/render-page";
import { RepairExplorer } from "@/features/prototype/repair-explorer/repair-explorer";
import { requireCurrentUser } from "@/server/auth/current-user";
import { getRepairOrderDetail } from "@/server/repair-order/service";
import { getActiveLaborRate } from "@/server/services/labor-rate-settings";
import { repairExplorerStorageKey, repairOrderDocumentsHref, safeLaborGuideReturnTo, type RepairExplorerContext } from "@/lib/repair-explorer-context";
import { repairLaborGuideHref } from "@/lib/repair-resume";

export const metadata = { title: "Labor Guide | Dispatch Board" };

export default async function RepairExplorerPreviewPage({ searchParams }: { searchParams?: Promise<{ attachRepairOrder?: string | string[]; returnLabel?: string | string[]; returnTo?: string | string[]; draftId?: string | string[]; reviseDocument?: string | string[]; importExplorer?: string; workflow?: string; system?: string; group?: string; repairOrderId?: string | string[] }> } = {}) {
  const params = searchParams ? await searchParams : {};
  const attach = Array.isArray(params.attachRepairOrder) ? params.attachRepairOrder[0] : params.attachRepairOrder;
  if (params.reviseDocument !== undefined || params.draftId !== undefined || params.importExplorer === "1" || attach === "1") {
    return renderLaborGuidePage({ searchParams: Promise.resolve(params) }, "new", "explorer");
  }
  const repairOrderId = Array.isArray(params.repairOrderId) ? params.repairOrderId[0] : params.repairOrderId;
  const returnTo = safeLaborGuideReturnTo(Array.isArray(params.returnTo) ? params.returnTo[0] : params.returnTo);
  const loginQuery = new URLSearchParams();
  if (repairOrderId) loginQuery.set("repairOrderId", repairOrderId);
  if (returnTo) loginQuery.set("returnTo", returnTo);
  if (params.workflow === "review") loginQuery.set("workflow", "review");
  const user = await requireCurrentUser(`/prototype/repair-explorer${loginQuery.size ? `?${loginQuery}` : ""}`);
  let context: RepairExplorerContext | undefined;
  if (repairOrderId) {
    const order = await getRepairOrderDetail(user, repairOrderId).catch(() => null);
    if (!order) {
      return <main><h1>Repair order could not open</h1><p role="alert">Verify that you have access to this repair order, then retry.</p><a href={returnTo ?? "/diagnostics/labor-guide"}>{returnTo ? "Back to Repair Workbench" : "Return to Labor Guide"}</a></main>;
    }
    if (!order.closedAt && order.origin === "CUSTOMER_REPAIR" && requiresDiagnosticAuthorization(order.serviceVisit.sourceSnapshot)) {
      const resume = await getRepairResume(user, order.id).catch(() => null);
      if (resume?.needsDiagnosticAuthorization ?? true) {
        redirect(repairReviewHref(order.id, "authorization", { returnTo }));
      }
    }
    const estimate = order.estimateVersions[0];
    if (estimate) {
      const query = new URLSearchParams({
        repairOrderId: order.id,
        estimateId: estimate.id,
        returnTo: returnTo ?? repairReviewHref(order.id),
      });
      redirect(`/repair-estimate?${query}`);
    }
    const vehicleLabel = [order.vehicle.year, order.vehicle.make, order.vehicle.model].filter(Boolean).join(" ") || order.vehicle.vehicleNumber;
    const rate = order.closedAt ? null : await getActiveLaborRate(user).catch(() => null);
    if (!rate) {
      return <main style={{ maxWidth: 1000, margin: "32px auto", padding: 24 }}>
        <a href={returnTo ?? repairReviewHref(order.id)}>Back to Repair Workbench</a>
        <h1>Labor Guide</h1>
        <p>{vehicleLabel} · {order.repairOrderNumber}</p>
        <p>{order.closedAt ? "This repair order is closed." : "Labor rates could not load."}</p>
        <a href={repairOrderDocumentsHref(order.id, repairLaborGuideHref(order.id, returnTo))}>Estimates, invoices & receipts</a>
      </main>;
    }
    context = {
      reviewWorkflow: params.workflow === "review", repairOrderId: order.id, repairOrderNumber: order.repairOrderNumber,
      returnTo,
      vehicleId: order.vehicle.id, vehicleLabel,
      vin: order.vehicle.vin, origin: order.origin, inventoryUnitId: order.inventoryUnit?.id ?? null, inventoryNumber: order.inventoryUnit?.inventoryNumber ?? null,
      concern: order.serviceVisit.concernSummary, laborRate: rate.laborRate,
    };
  }
  return <RepairExplorer storageKey={repairExplorerStorageKey(user.id, repairOrderId)} initialSystemId={params.system} initialGroupId={params.group} context={context} key={`${repairOrderId ?? "sample"}:${params.system ?? "brakes"}:${params.group ?? ""}`} />;
}
