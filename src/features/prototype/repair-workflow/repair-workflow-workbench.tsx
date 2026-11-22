import Link from "next/link";
import type { ReactNode } from "react";
import type { AuthenticatedUser } from "@/server/auth/store";
import { type getShopPlanningDetail, getShopPlanningWorkspace } from "@/server/shop-planning/service";
import { getQualityControlWorkspace } from "@/server/quality-control/service";
import { getShopExecutionWorkspace } from "@/server/shop-execution/service";
import { getServiceClosePartsWorkspace } from "@/server/service-close-parts/service";
import { getActiveLaborRate } from "@/server/services/labor-rate-settings";
import { canManageSettings, isManager } from "@/server/policies/access";
import { currentRepairWorkflowStep, repairReviewHref, repairWorkflowSteps, scopedRepairOrders, type RepairWorkflowStep } from "@/lib/repair-workflow-review";
import { ShopPlanningWorkspace } from "@/features/inventory/shop-planning-workspace";
import { ShopExecutionWorkspace } from "@/features/inventory/shop-execution-workspace";
import { ServiceClosePartsWorkspace } from "@/features/inventory/service-close-parts-workspace";
import { InventoryQcChecklistPreview, QualityControlWorkspace } from "@/features/inventory/quality-control-workspace";
import { readableRepairStatus, repairWorkflowEvidence } from "@/lib/repair-workflow-evidence";
import { RepairRecordedWork } from "@/features/prototype/repair-workflow/repair-recorded-work";
import { RepairWorkflowFrame } from "@/features/prototype/repair-workflow/repair-workflow-frame";
import { canOpenRepairQc, RepairQcDiagnostics } from "@/features/prototype/repair-workflow/repair-qc-diagnostics";
import { RepairExecutionTool } from "@/features/prototype/repair-workflow/repair-execution-tool";
import { RepairHandoffTool } from "@/features/prototype/repair-workflow/repair-handoff-tool";
import { EstimateWorkflowNextStep } from "@/features/inventory/estimate-workflow-next-step";
import { waitingJobPartsReady } from "@/lib/repair-job-parts-readiness";
import { isCustomerOwnedForInventoryLifecycle } from "@/server/vehicle-registry/inventory-lifecycle-ownership";
import { findReconRepairPath } from "@/lib/recon-repair-paths";
import styles from "./repair-workflow.module.css";

const serialized = (value: unknown) => JSON.parse(JSON.stringify(value));

const stageActions: Record<RepairWorkflowStep, { label: string; detail: string }> = {
  inspection: { label: "Open inspection checklist", detail: "Record the vehicle inspection before moving to diagnosis." },
  diagnosis: { label: "Open diagnosis", detail: "Review the inspection and record the cause, supporting evidence, or direct repair scope." },
  estimate: { label: "Open estimate tools", detail: "Build or revise the itemized estimate for this repair order." },
  authorization: { label: "Open authorization", detail: "Review the estimate and record the approval decision before releasing work." },
  parts: { label: "Review parts readiness", detail: "Confirm the required parts and release the approved work." },
  assignment: { label: "Open assignment", detail: "Review technician and shop availability for the released jobs." },
  repair: { label: "Open repair progress", detail: "Review instructions and record progress for the assigned work." },
  qc: { label: "Open quality check", detail: "Review the completed jobs and record the quality and release checks." },
  handoff: { label: "Open closeout", detail: "Review billing and record the vehicle handoff." },
};

export async function RepairWorkflowWorkbench({ user, order, params, returnTo, returnLabel, supportingTool, sourceContext, canCompose }: {
  user: AuthenticatedUser;
  order: Awaited<ReturnType<typeof getShopPlanningDetail>>;
  params: { step?: string; estimateId?: string; tool?: string; reconPath?: string; workflow?: string };
  returnTo?: string;
  returnLabel?: string;
  supportingTool?: ReactNode;
  sourceContext?: ReactNode;
  canCompose?: boolean;
}) {
  const current = currentRepairWorkflowStep(order), selected = repairWorkflowSteps.includes(params.step as RepairWorkflowStep) ? params.step as RepairWorkflowStep : current;
  const closed = Boolean(order.closedAt);
  const needsWorkOrder = current === "parts" && !order.repairJobs.some(job => !["CANCELLED", "CANCELED"].includes(job.status));
  const waitingJobs = order.repairJobs.filter(job => job.status === "WAITING_PARTS" && !waitingJobPartsReady(job));
  const waitingVendor = order.vendorWorks.find(work => work.status === "WAITING_PARTS");
  const needsParts = waitingJobs.length > 0 || Boolean(waitingVendor);
  const activeVendor = order.vendorWorks.find(work => !["CANCELLED", "COMPLETED"].includes(work.status));
  const canChoosePath = !closed && !activeVendor && !order.diagnosisVersions.length
    && (current === "inspection" || current === "diagnosis");
  const chosenPath = canChoosePath ? findReconRepairPath(params.reconPath) : undefined;
  const shopView = !supportingTool && params.workflow === "shop";
  const stageOpen = !shopView || repairWorkflowSteps.includes(params.step as RepairWorkflowStep);
  const context = { returnTo, returnLabel, reconPath: chosenPath?.value, workflow: shopView ? "shop" as const : undefined };
  const home = repairReviewHref(order.id, undefined, context);
  const shopReconHref = `/vehicles/shop-recon/${encodeURIComponent(order.id)}?${new URLSearchParams({ returnTo: home })}`;
  const vendor = activeVendor ?? order.vendorWorks[0];
  const vendorAmount = vendor?.approvedAmountCents ?? vendor?.estimateAmountCents;
  const custody = order.vehicle.custodyEvents[0];
  const repairPath = activeVendor ? "Outside vendor"
    : order.diagnosisVersions[0]?.cause?.includes("Direct repair scope approved without troubleshooting diagnosis.")
      ? "Bodywork"
      : order.diagnosisVersions.length ? "Diagnostic / mechanical" : undefined;
  let nextAction: { label: string; detail: string; href?: string } = stageActions[current];
  if (closed) nextAction = { label: "Open closeout", detail: "Review the saved closeout record." };
  else if (current === "parts" && needsParts) {
    const waitingOn = waitingVendor?.vendorName ?? waitingJobs.map(job => job.jobNumber).join(", ");
    nextAction = { label: "Review missing parts", detail: `Waiting on parts for ${waitingOn}. Review demand and stock on this order.` };
  } else if (needsWorkOrder) {
    nextAction = { label: "Prepare technician work order", detail: "Create the job from the approved estimate before assigning it." };
  } else if (order.operatingState !== "ACTIVE" && order.stateReason) {
    nextAction = { ...nextAction, detail: order.stateReason };
  }
  if (chosenPath && current === "inspection") {
    nextAction = { ...nextAction, label: "Document inspection" };
  } else if (chosenPath && current === "diagnosis") {
    switch (chosenPath.value) {
      case "MECHANICAL":
        nextAction = { ...nextAction, label: "Open diagnosis" };
        break;
      case "BODYWORK":
        nextAction = { label: "Open bodywork scope", detail: chosenPath.detail };
        break;
      case "OUTSIDE_VENDOR":
        nextAction = { label: "Open vendor intake", detail: chosenPath.detail };
        break;
      case "DETAIL_PREP":
        nextAction = { label: "Open detail / prep planning", detail: chosenPath.detail, href: shopReconHref };
        break;
      case "INSPECTION_ONLY":
        nextAction = { label: "Review inspection", detail: "Review the saved condition report and close the order if no further work is needed." };
        break;
    }
    if (order.operatingState !== "ACTIVE" && order.stateReason) nextAction = { ...nextAction, detail: order.stateReason };
  }
  const previewOnly = order.origin === "CUSTOMER_REPAIR"
    && repairWorkflowSteps.indexOf(selected) > repairWorkflowSteps.indexOf(current);
  const renderTool = async () => {
    if (supportingTool) return supportingTool;
    if (previewOnly && selected !== "handoff") {
      return <p role="status">Complete the current repair step before recording work in this stage.</p>;
    }
    if (selected === "diagnosis" && current === "diagnosis") {
      if (chosenPath?.value === "INSPECTION_ONLY") {
        const inspection = order.inspectionVersions[0];
        return <section aria-label="Saved inspection">
          <h3>Inspection recorded</h3>
          <p>{inspection.summary}</p>
          <Link href={repairReviewHref(order.id, undefined, { ...context, tool: "close" })}>Open repair order closeout</Link>
        </section>;
      }
      if (chosenPath?.value === "DETAIL_PREP") {
        return <p><Link href={shopReconHref}>Open this repair order in Shop &amp; Recon</Link></p>;
      }
    }
    let tool;
    if (!closed && selected === "handoff" && current !== "handoff" && order.origin === "CUSTOMER_REPAIR") {
      tool = <p role="status">Vehicle handoff opens after the release is recorded. Continue the current repair step above.</p>;
    } else if (closed || selected === "handoff") {
      tool = <RepairHandoffTool repairOrderId={order.id} vehicleId={order.vehicle.id} internal={order.origin === "INVENTORY_RECON"} closed={closed} />;
    }
    else if (selected === "qc") {
      const canOpen = canOpenRepairQc(order);
      const model = canOpen ? await getQualityControlWorkspace(user, {}, order.id).catch(() => null) : null;
      tool = <>
        <RepairQcDiagnostics order={order} unavailable={canOpen && !model?.repairOrders.length} />
        {model?.repairOrders.length ? <QualityControlWorkspace initial={serialized(model)} initialRepairOrderId={order.id} reviewOrderId={order.id} returnTo={home} returnLabel="Return to Repair Workbench" />
          : !canOpen ? <InventoryQcChecklistPreview key={order.id} repairOrderId={order.id} /> : null}
      </>;
    } else if (selected === "assignment" && !order.repairJobs.some(job => job.status !== "CANCELLED")) {
      tool = <section aria-label="Assignment prerequisite">
        <h3>Release a repair job before assigning it</h3>
        <p>{current === "parts" ? "The estimate is approved. Create the job from the approved work, then choose a technician." : "Complete the current planning step before booking a technician."}</p>
        <Link href={repairReviewHref(order.id, current, context)}>{needsWorkOrder ? "Prepare technician work order" : "Continue repair planning"}</Link>
      </section>;
    } else if (selected === "assignment" || selected === "repair") {
      const model = await getShopExecutionWorkspace(user), jobs = model.jobs.filter(job => job.repairOrder.id === order.id);
      const vendor = order.vendorWorks.find(work => !["CANCELLED", "COMPLETED"].includes(work.status));
      if (selected === "repair" && !jobs.length && vendor) {
        const [planning, rate] = await Promise.all([getShopPlanningWorkspace(user), getActiveLaborRate(user)]);
        tool = <ShopPlanningWorkspace initial={serialized({ ...planning, repairOrders: [order] })} reviewOrderId={order.id} focusStep={5} returnTo={home} defaultLaborRate={rate.laborRate} canOverrideLaborRate={canManageSettings(user)} />;
      } else tool = selected === "repair" ? <RepairExecutionTool repairOrderId={order.id} jobs={serialized(jobs)} actorId={user.id} manager={isManager(user)} /> : <ShopExecutionWorkspace initial={serialized({ ...model, jobs, repairOrders: model.repairOrders.filter(row => row.id === order.id) })} initialRepairOrderId={order.id} reviewOrderId={order.id} />;
    } else if (selected === "parts") {
      const [parts, planning, rate] = await Promise.all([getServiceClosePartsWorkspace(user).catch(() => null), getShopPlanningWorkspace(user), getActiveLaborRate(user)]);
      const missing = (waitingVendor ? order.partDemands : waitingJobs.flatMap(job => job.partDemands))
        .filter(demand => !["CANCELLED", "RELEASED"].includes(demand.status) && demand.quantityReserved < demand.quantityRequired);
      const ledgerHref = `/vehicles/parts?${new URLSearchParams({ repairOrderId: order.id, returnTo: home })}`;
      tool = <>
        {needsParts && <section className={styles.partsBlocker} aria-label="Parts blocking repair">
          <h3>Waiting on parts</h3>
          <p>{waitingVendor ? `${waitingVendor.vendorName} is waiting on parts.` : waitingJobs.map(job => job.jobNumber).join(", ")} Parts team: review demand and availability before the repair continues.</p>
          {missing.length > 0 && <ul>{missing.map(demand => <li key={demand.id}>{demand.part.partNumber} · {demand.part.description} · {demand.quantityReserved}/{demand.quantityRequired} reserved</li>)}</ul>}
          {waitingJobs.map(job => <p key={job.id}>{job.executionBlockerReason || (!job.partDemands.length ? `${job.jobNumber}: no linked part demand recorded.` : null)}</p>)}
          {missing.length > 0 && <Link href={ledgerHref}>Reserve stock for this repair order</Link>}
        </section>}
        <details open={needsWorkOrder && !needsParts}>
          <summary>Prepare technician work order</summary>
          <ShopPlanningWorkspace initial={serialized({ ...planning, repairOrders: [order] })} reviewOrderId={order.id} focusStep={5} returnTo={home} defaultLaborRate={rate.laborRate} canOverrideLaborRate={canManageSettings(user)} />
        </details>
        {parts ? <ServiceClosePartsWorkspace initial={serialized(scopedRepairOrders(parts, order.id))} initialRepairOrderId={order.id} reviewOrderId={order.id} returnTo={home} returnLabel="Return to Repair Workbench" /> : <p role="status">Parts tools are unavailable for this role or location. Ask the Parts team to review the order.</p>}
      </>;
    } else {
      const [planning, rate] = await Promise.all([getShopPlanningWorkspace(user), getActiveLaborRate(user)]);
      const focusStep = { inspection: 1, diagnosis: 2, estimate: 3, authorization: 4 }[selected as "inspection" | "diagnosis" | "estimate" | "authorization"];
      const estimate = params.estimateId ? order.estimateVersions.find(estimate => estimate.id === params.estimateId) : null;
      const guidedPath = selected === "diagnosis" && chosenPath
        ? ({ MECHANICAL: "DIAGNOSTIC", BODYWORK: "DIRECT_BODY", OUTSIDE_VENDOR: "VENDOR", DETAIL_PREP: undefined, INSPECTION_ONLY: undefined } as const)[chosenPath.value]
        : undefined;
      tool = <>{estimate && <EstimateWorkflowNextStep reviewWorkflow repairOrderId={order.id} estimateId={estimate.id} />}{selected === "estimate" && <p><Link href={`/prototype/repair-explorer?${new URLSearchParams({ repairOrderId: order.id, workflow: "review" })}`}>Build estimate in simplified Labor Guide</Link></p>}<ShopPlanningWorkspace key={guidedPath} guidedPath={guidedPath} compactStage={shopView} initial={serialized({ ...planning, repairOrders: [order] })} reviewOrderId={order.id} focusStep={focusStep} returnTo={home} defaultLaborRate={rate.laborRate} canOverrideLaborRate={canManageSettings(user)} /></>;
    }
    return tool;
  }
  const [tool, customerOwned] = await Promise.all([
    stageOpen ? renderTool().catch(() => <p role="alert">This tool could not load for the selected RO. Check your role, location access and application setup, then retry. No other vehicle was substituted.</p>) : null,
    isCustomerOwnedForInventoryLifecycle(order.vehicle.id, order.organizationId),
  ]);
  return <RepairWorkflowFrame
    recordedWork={<RepairRecordedWork order={order} />}
    stepStatus={repairWorkflowEvidence(order)}
    repairOrderId={order.id}
    vehicleId={order.vehicle.id}
    number={order.repairOrderNumber}
    vehicle={[order.vehicle.year, order.vehicle.make, order.vehicle.model].filter(Boolean).join(" ") || order.vehicle.vehicleNumber}
    stock={order.inventoryUnit?.inventoryNumber ?? order.vehicle.vehicleNumber}
    location={order.location.name}
    owner={order.ownerUser.name}
    concern={order.serviceVisit.concernSummary}
    inventoryRecon={order.origin === "INVENTORY_RECON"}
    inventoryStage={order.inventoryUnit ? readableRepairStatus(order.inventoryUnit.lifecycleStage) : undefined}
    customerOwned={customerOwned}
    repairPath={repairPath}
    canChoosePath={canChoosePath}
    chosenPath={chosenPath?.value}
    shopView={shopView}
    stageOpen={stageOpen}
    custody={activeVendor?.currentLocation || custody?.positionLabel || custody?.location?.name}
    target={order.targetAt ? new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: order.location.timezone }).format(order.targetAt) : undefined}
    vendorAmount={vendor ? vendorAmount == null ? "Not recorded" : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(vendorAmount / 100) : undefined}
    nextAction={nextAction}
    current={current}
    selected={selected}
    closed={closed}
    returnTo={returnTo}
    returnLabel={returnLabel}
    auxiliary={Boolean(supportingTool)}
    activeTool={params.tool}
    canCompose={canCompose}
    key={`${order.id}:${selected}:${stageOpen}:${params.tool ?? ""}:${order.version}`}
  >{tool}{sourceContext}</RepairWorkflowFrame>;
}
