import Link from "next/link";
import { requireCurrentUser } from "@/server/auth/current-user";
import { getShopPlanningDetail, getShopPlanningWorkspace } from "@/server/shop-planning/service";
import { getQualityControlWorkspace } from "@/server/quality-control/service";
import { getShopExecutionWorkspace } from "@/server/shop-execution/service";
import { getServiceClosePartsWorkspace } from "@/server/service-close-parts/service";
import { getActiveLaborRate } from "@/server/services/labor-rate-settings";
import { canManageSettings } from "@/server/policies/access";
import { currentRepairWorkflowStep, repairReviewHref, repairWorkflowSteps, scopedRepairOrders, type RepairWorkflowStep } from "@/lib/repair-workflow-review";
import { ShopPlanningWorkspace } from "@/features/inventory/shop-planning-workspace";
import { ShopExecutionWorkspace } from "@/features/inventory/shop-execution-workspace";
import { ServiceClosePartsWorkspace } from "@/features/inventory/service-close-parts-workspace";
import { QualityControlWorkspace } from "@/features/inventory/quality-control-workspace";
import { repairWorkflowEvidence } from "@/lib/repair-workflow-evidence";
import { RepairRecordedWork } from "@/features/prototype/repair-workflow/repair-recorded-work";
import { RepairWorkflowFrame } from "@/features/prototype/repair-workflow/repair-workflow-frame";
import { RepairExecutionTool } from "@/features/prototype/repair-workflow/repair-execution-tool";
import { RepairHandoffTool } from "@/features/prototype/repair-workflow/repair-handoff-tool";
import { EstimateWorkflowNextStep } from "@/features/inventory/estimate-workflow-next-step";

const serialized = (value: unknown) => JSON.parse(JSON.stringify(value));
export default async function RepairWorkflowWorkbenchPage({ searchParams }: { searchParams?: Promise<{ repairOrderId?: string; step?: string; estimateId?: string }> }) {
  const user = await requireCurrentUser(), params = searchParams ? await searchParams : {};
  if (!params.repairOrderId) return <main><h1>Repair Workbench · review</h1><Link href="/prototype/repair-workflow">Find vehicle / start intake</Link></main>;
  const order = await getShopPlanningDetail(user, params.repairOrderId).catch(() => null);
  if (!order) return <main><h1>Repair Workbench unavailable</h1><p role="alert">This RO could not be opened. Verify access; no other vehicle was selected.</p><Link href="/prototype/repair-workflow">Return to Find vehicle</Link></main>;
  const current = currentRepairWorkflowStep(order), selected = repairWorkflowSteps.includes(params.step as RepairWorkflowStep) ? params.step as RepairWorkflowStep : current;
  const closed = Boolean(order.closedAt), home = repairReviewHref(order.id);
  const renderTool = async () => {
    let tool;
    if (closed || selected === "handoff") tool = <RepairHandoffTool repairOrderId={order.id} vehicleId={order.vehicle.id} internal={order.origin === "INVENTORY_RECON"} closed={closed} />;
    else if (selected === "qc") {
      const model = scopedRepairOrders(await getQualityControlWorkspace(user), order.id);
      if (!model.repairOrders.length) throw new Error("Quality control is unavailable for this RO.");
      tool = <QualityControlWorkspace initial={serialized(model)} initialRepairOrderId={order.id} reviewOrderId={order.id} returnTo={home} returnLabel="Return to review Repair Workbench" />;
    } else if (selected === "assignment" || selected === "repair") {
      const model = await getShopExecutionWorkspace(user), jobs = model.jobs.filter(job => job.repairOrder.id === order.id);
      const vendor = order.vendorWorks.find(work => !["CANCELLED", "COMPLETED"].includes(work.status));
      if (selected === "repair" && !jobs.length && vendor) {
        const [planning, rate] = await Promise.all([getShopPlanningWorkspace(user), getActiveLaborRate(user)]);
        tool = <ShopPlanningWorkspace initial={serialized({ ...planning, repairOrders: [order] })} reviewOrderId={order.id} focusStep={5} returnTo={home} defaultLaborRate={rate.laborRate} canOverrideLaborRate={canManageSettings(user)} />;
      } else tool = selected === "repair" ? <RepairExecutionTool repairOrderId={order.id} jobs={serialized(jobs)} /> : <ShopExecutionWorkspace initial={serialized({ ...model, jobs, repairOrders: model.repairOrders.filter(row => row.id === order.id) })} initialRepairOrderId={order.id} reviewOrderId={order.id} />;
    } else if (selected === "parts") {
      const [parts, planning, rate] = await Promise.all([getServiceClosePartsWorkspace(user), getShopPlanningWorkspace(user), getActiveLaborRate(user)]);
      tool = <><details><summary>Release approved repair jobs</summary><ShopPlanningWorkspace initial={serialized({ ...planning, repairOrders: [order] })} reviewOrderId={order.id} focusStep={5} returnTo={home} defaultLaborRate={rate.laborRate} canOverrideLaborRate={canManageSettings(user)} /></details><ServiceClosePartsWorkspace initial={serialized(scopedRepairOrders(parts, order.id))} initialRepairOrderId={order.id} reviewOrderId={order.id} returnTo={home} returnLabel="Return to review Repair Workbench" /></>;
    } else {
      const [planning, rate] = await Promise.all([getShopPlanningWorkspace(user), getActiveLaborRate(user)]);
      const focusStep = { inspection: 1, diagnosis: 2, estimate: 3, authorization: 4 }[selected as "inspection" | "diagnosis" | "estimate" | "authorization"];
      const estimate = params.estimateId ? order.estimateVersions.find(estimate => estimate.id === params.estimateId) : null;
      tool = <>{estimate && <EstimateWorkflowNextStep reviewWorkflow repairOrderId={order.id} estimateId={estimate.id} />}{selected === "estimate" && <p><Link href={`/prototype/repair-explorer?${new URLSearchParams({ repairOrderId: order.id, workflow: "review" })}`}>Build estimate in simplified Labor Guide</Link></p>}<ShopPlanningWorkspace initial={serialized({ ...planning, repairOrders: [order] })} reviewOrderId={order.id} focusStep={focusStep} returnTo={home} defaultLaborRate={rate.laborRate} canOverrideLaborRate={canManageSettings(user)} /></>;
    }
    return tool;
  }
  const tool = await renderTool().catch(() => <p role="alert">This tool could not load for the selected RO. Check your role, location access and application setup, then retry. No other vehicle was substituted.</p>);
  return <RepairWorkflowFrame recordedWork={<RepairRecordedWork order={order} />} stepStatus={repairWorkflowEvidence(order)} repairOrderId={order.id} number={order.repairOrderNumber} vehicle={[order.vehicle.year, order.vehicle.make, order.vehicle.model].filter(Boolean).join(" ") || order.vehicle.vehicleNumber} stock={order.inventoryUnit?.inventoryNumber ?? order.vehicle.vehicleNumber} location={order.location.name} current={current} selected={selected} closed={closed} key={`${order.id}:${selected}:${order.version}`} >{tool}</RepairWorkflowFrame>;
}
