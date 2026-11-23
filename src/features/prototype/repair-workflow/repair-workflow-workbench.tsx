import Link from "next/link";
import type { ReactNode } from "react";
import type { AuthenticatedUser } from "@/server/auth/store";
import { getDiagnosisWorkbench, type getShopPlanningDetail, getShopPlanningWorkspace, repairJobCreationRestriction } from "@/server/shop-planning/service";
import { CourtesyVehicleCheck } from "@/features/inventory/courtesy-vehicle-check";
import { CustomerRepairAuthorization } from "@/features/inventory/customer-repair-authorization";
import { repairLaborGuideHref } from "@/lib/repair-resume";
import { prisma } from "@/server/db/client";
import { diagnosticAuthorizationMessage, requiresDiagnosticAuthorization } from "@/server/repair-order/diagnostic-authorization";
import { getRepairResume } from "@/server/repair-order/resume-service";
import { RepairDiagnosisWork } from "@/features/inventory/repair-diagnosis-work";
import { diagnosisRequestStatus } from "@/lib/repair-diagnosis-request";
import { getQualityControlWorkspace } from "@/server/quality-control/service";
import { getShopExecutionWorkspace } from "@/server/shop-execution/service";
import { getServiceClosePartsWorkspace } from "@/server/service-close-parts/service";
import { getActiveLaborRate } from "@/server/services/labor-rate-settings";
import { canManageSettings, isManager } from "@/server/policies/access";
import { currentRepairAdvisorReason, currentRepairWorkflowStep, pendingApprovedLabor, repairReviewHref, repairWorkflowSteps, scopedRepairOrders, type RepairWorkflowStep } from "@/lib/repair-workflow-review";
import { ShopPlanningWorkspace } from "@/features/inventory/shop-planning-workspace";
import { ShopExecutionWorkspace } from "@/features/inventory/shop-execution-workspace";
import { ServiceClosePartsWorkspace } from "@/features/inventory/service-close-parts-workspace";
import { InventoryQcChecklistPreview, QualityControlWorkspace } from "@/features/inventory/quality-control-workspace";
import { readableRepairStatus, repairWorkflowEvidence } from "@/lib/repair-workflow-evidence";
import { RepairRecordedWork } from "@/features/prototype/repair-workflow/repair-recorded-work";
import { RepairWorkflowFrame } from "@/features/prototype/repair-workflow/repair-workflow-frame";
import { canOpenRepairQc, RepairQcDiagnostics } from "@/features/prototype/repair-workflow/repair-qc-diagnostics";
import { RepairExecutionTool } from "@/features/prototype/repair-workflow/repair-execution-tool";
import { getServiceBilling } from "@/server/service-billing/service";
import { readFinalRepairQcRecommendation } from "@/lib/final-repair-qc";
import { invoiceHoldLabel, laborGuideInvoiceHref, repairBillingHref } from "@/lib/service-billing-workflow";
import { RepairHandoffTool, type HandoffBilling } from "@/features/prototype/repair-workflow/repair-handoff-tool";
import { EstimateWorkflowNextStep } from "@/features/inventory/estimate-workflow-next-step";
import { ApprovedTechnicianWork } from "./approved-technician-work";
import { allocateApprovedJobParts, catalogJobRequirements, unmatchedApprovedJobDemands } from "@/lib/catalog-job-readiness";
import { waitingJobPartsReady } from "@/lib/repair-job-parts-readiness";
import { isCustomerOwnedForInventoryLifecycle } from "@/server/vehicle-registry/inventory-lifecycle-ownership";
import { findReconRepairPath } from "@/lib/recon-repair-paths";
import styles from "./repair-workflow.module.css";

const serialized = (value: unknown) => JSON.parse(JSON.stringify(value));

const stageActions: Record<RepairWorkflowStep, { label: string; detail: string }> = {
  inspection: { label: "Open inspection checklist", detail: "Record the vehicle inspection before moving to diagnosis." },
  diagnosis: { label: "Open diagnosis", detail: "Review the inspection and document what needs to be checked." },
  estimate: { label: "Open estimate tools", detail: "Build or revise the itemized estimate for this repair order." },
  authorization: { label: "Open authorization", detail: "Review the estimate and record the approval decision before releasing work." },
  parts: { label: "Review parts readiness", detail: "Confirm the required parts and release the approved work." },
  assignment: { label: "Open assignment", detail: "Review technician and shop availability for the released jobs." },
  repair: { label: "Open repair progress", detail: "Review instructions and record progress for the assigned work." },
  qc: { label: "Open quality check", detail: "Review the completed jobs and record the quality and release checks." },
  handoff: { label: "Record vehicle handoff", detail: "Verify the recipient, keys and final odometer, then close this repair order." },
};

export async function RepairWorkflowWorkbench({ user, order, params, returnTo, returnLabel, supportingTool, sourceContext, canCompose }: {
  user: AuthenticatedUser;
  order: Awaited<ReturnType<typeof getShopPlanningDetail>>;
  params: { step?: string; repairJobId?: string; repairAction?: string; estimateId?: string; tool?: string; reconPath?: string; workflow?: string; tab?: string };
  returnTo?: string;
  returnLabel?: string;
  supportingTool?: ReactNode;
  sourceContext?: ReactNode;
  canCompose?: boolean;
}) {
  const current = currentRepairWorkflowStep(order);
  const closed = Boolean(order.closedAt);
  const diagnosticRequired = !closed && order.origin === "CUSTOMER_REPAIR" && requiresDiagnosticAuthorization(order.serviceVisit.sourceSnapshot);
  const authorizationResume = !closed && order.origin === "CUSTOMER_REPAIR" && (diagnosticRequired || params.step === "authorization")
    ? await getRepairResume(user, order.id, true) : null;
  const diagnosticPending = diagnosticRequired && (authorizationResume?.needsDiagnosticAuthorization ?? true);
  const selected = repairWorkflowSteps.includes(params.step as RepairWorkflowStep)
    ? params.step as RepairWorkflowStep
    : diagnosticPending ? "authorization" : current;
  const estimate = order.estimateVersions[0];
  const authorization = estimate?.authorizations[0];
  const pendingLabor = pendingApprovedLabor(estimate, order.repairJobs);
  const needsWorkOrder = current === "parts" && pendingLabor.length > 0 && !order.vendorWorks.some(work => !["CANCELLED", "COMPLETED"].includes(work.status));
  const waitingJobs = order.repairJobs.filter(job => job.status === "WAITING_PARTS" && !waitingJobPartsReady(job));
  const waitingVendor = order.vendorWorks.find(work => work.status === "WAITING_PARTS");
  const needsParts = waitingJobs.length > 0 || Boolean(waitingVendor);
  const unlinkedPartsPending = order.partDemands.some(demand => !demand.repairJobId
    && ["OPEN", "PARTIALLY_RESERVED"].includes(demand.status) && demand.quantityReserved < demand.quantityRequired);
  const advisorReason = currentRepairAdvisorReason(order.stateReason,
    repairWorkflowSteps.indexOf(current) >= repairWorkflowSteps.indexOf("assignment") && !needsParts && !unlinkedPartsPending);
  const activeVendor = order.vendorWorks.find(work => !["CANCELLED", "COMPLETED"].includes(work.status));
  const diagnosisWork = !closed && current === "diagnosis" && !activeVendor
    ? await getDiagnosisWorkbench(user, order)
    : null;
  const canChoosePath = !closed && !diagnosticPending && !activeVendor && !diagnosisWork?.request && !order.diagnosisVersions.length
    && (current === "inspection" || current === "diagnosis");
  const chosenPath = canChoosePath ? findReconRepairPath(params.reconPath) : undefined;
  const shopView = !supportingTool && params.workflow === "shop";
  const stageOpen = !shopView || repairWorkflowSteps.includes(params.step as RepairWorkflowStep);
  const compactDiagnosis = Boolean(diagnosisWork && selected === "diagnosis" && !supportingTool &&
    (diagnosisWork.request || !chosenPath || ["MECHANICAL", "OUTSIDE_VENDOR"].includes(chosenPath.value)));
  const context = { returnTo, returnLabel, reconPath: chosenPath?.value, workflow: shopView ? "shop" as const : undefined };
  const home = repairReviewHref(order.id, undefined, context);
  const handoffHref = `${repairReviewHref(order.id, "handoff", context)}#repair-workflow-action`;
  const handoffBillingHref = repairBillingHref(order.id, { returnTo: handoffHref });
  const handoffInvoiceHref = laborGuideInvoiceHref(order.id, { estimateId: estimate?.id, returnTo: handoffHref });
  const clearanceHref = `${repairReviewHref(order.id, "qc", context)}#repair-workflow-action`;
  let handoffBilling: HandoffBilling = null;
  let billingUnverified = false;
  if (!closed && current === "handoff" && order.origin === "CUSTOMER_REPAIR") {
    const billing = await getServiceBilling(user, order.id, order.organizationId).catch(() => null);
    billingUnverified = !billing;
    const latestPackage = billing?.packages[0];
    const postedInvoice = billing?.invoices.find(item => item.status === "POSTED");
    const invoice = postedInvoice?.packageId === latestPackage?.id ? postedInvoice : undefined;
    const blockers = [...new Set([
      ...(billing?.readiness.mismatchCodes ?? []),
      ...(invoice ? latestPackage?.mismatchCodes ?? [] : [])
    ])];
    if (postedInvoice && !invoice) {
      handoffBilling = {
        label: "Review existing invoice", href: handoffBillingHref,
        detail: "The posted invoice belongs to an earlier billing package. Ask Billing to reconcile it with the current package before handoff."
      };
    } else if (blockers.length) {
      handoffBilling = { label: postedInvoice ? "Review billing requirements" : "Review invoice requirements", href: postedInvoice ? handoffBillingHref : handoffInvoiceHref, detail: blockers.map(invoiceHoldLabel).join(" ") };
    } else if (billing && !invoice) {
      handoffBilling = { label: "Review invoice in Labor Guide", href: handoffInvoiceHref, detail: "Review the approved work, issue the invoice, and print it for the customer." };
    } else if (invoice && invoice.balance.balanceCents !== 0) {
      handoffBilling = {
        label: "Resolve invoice balance", href: repairBillingHref(order.id, { mode: "payment", invoiceId: invoice.id, returnTo: handoffHref }),
        detail: `${invoice.invoiceNumber} has a remaining balance of ${new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(invoice.balance.balanceCents / 100)}.`
      };
    } else if (!order.releaseAuthorization) {
      handoffBilling = {
        label: "Clear for handoff",
        href: clearanceHref,
        detail: "Record the vehicle release in Final QC, then return to handoff."
      };
    }
  }
  const shopReconHref = `/vehicles/shop-recon/${encodeURIComponent(order.id)}?${new URLSearchParams({ returnTo: home })}`;
  const vendor = activeVendor ?? order.vendorWorks[0];
  const vendorAmount = vendor?.approvedAmountCents ?? vendor?.estimateAmountCents;
  const custody = order.vehicle.custodyEvents[0];
  const repairPath = activeVendor ? "Outside vendor"
    : order.diagnosisVersions[0]?.cause?.includes("Direct repair scope approved without troubleshooting diagnosis.")
      ? "Bodywork"
      : order.diagnosisVersions.length ? "Mechanical Repair" : undefined;
  let nextAction: { label: string; detail: string; href?: string } = stageActions[current];
  if (current === "repair" && selected !== "repair") nextAction = { ...nextAction,
    href: `${repairReviewHref(order.id, "repair", { ...context, repairAction: "progress" })}#repair-workflow-action` };
  if (closed) nextAction = { label: "View saved handoff", detail: "Review the saved handoff record.", href: handoffHref };
  else if (handoffBilling) nextAction = handoffBilling;
  else if (needsWorkOrder) {
    nextAction = { label: pendingLabor.length === 1 ? "Create technician work order" : "Create technician work orders", detail: "Confirm the approved work and technician instructions." };
  } else if (current === "parts" && needsParts) {
    const waitingOn = waitingVendor?.vendorName ?? waitingJobs.map(job => job.jobNumber).join(", ");
    nextAction = { label: "Review parts readiness", detail: `${waitingOn} needs a parts check. Review receipts and reservations before assignment.` };
  } else if (order.operatingState !== "ACTIVE" && advisorReason) {
    nextAction = { ...nextAction, detail: advisorReason };
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
        nextAction = { label: "Open vendor diagnosis request", detail: "Document what the vendor should check and save the handoff." };
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
  if (diagnosisWork?.request) {
    nextAction = {
      label: diagnosisWork.canRecord ? "Open findings form" : "View diagnosis request",
      detail: `${diagnosisRequestStatus(diagnosisWork.request)} · ${diagnosisWork.request.assigneeName}`,
    };
  }
  const diagnosticHref = repairReviewHref(order.id, "authorization", context);
  if (diagnosticPending) {
    nextAction = { label: "Authorize diagnosis", detail: "Review the saved concern and diagnostic fee with the customer.", href: diagnosticHref };
  }
  const previewOnly = order.origin === "CUSTOMER_REPAIR"
    && repairWorkflowSteps.indexOf(selected) > repairWorkflowSteps.indexOf(current);
  const customerAuthorization = selected === "authorization" && !closed && order.origin === "CUSTOMER_REPAIR";
  const renderTool = async () => {
    if (supportingTool) return supportingTool;
    if (diagnosticPending && !customerAuthorization) {
      return <section aria-label="Diagnostic authorization required">
        <p role="status">{diagnosticAuthorizationMessage}</p>
        <Link className="pill pill-primary" href={diagnosticHref}>Open diagnostic authorization</Link>
      </section>;
    }
    if (previewOnly && selected !== "handoff" && !customerAuthorization) {
      return <p role="status">Complete the current repair step before recording work in this stage.</p>;
    }
    if (selected === "diagnosis" && current === "diagnosis") {
      if (compactDiagnosis && diagnosisWork) {
        return <RepairDiagnosisWork repairOrderId={order.id} vehicleId={order.vehicle.id} version={order.version}
          concern={order.serviceVisit.concernSummary} initiallyVendor={chosenPath?.value === "OUTSIDE_VENDOR"} {...diagnosisWork} />;
      }
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
      const qcParams = new URLSearchParams({ repairOrderId: order.id });
      if (returnTo) qcParams.set("returnTo", returnTo);
      if (returnLabel) qcParams.set("returnLabel", returnLabel);
      tool = <section aria-label="Handoff readiness">
        <p role="status">Vehicle handoff opens after the release is recorded. {current === "qc"
          ? "Finish Final QC and record clearance."
          : "Complete the outstanding repair work and Final QC before recording clearance."}</p>
        <Link className="pill" href={`/vehicles/quality-control?${qcParams}`}>Return to Final QC</Link>
      </section>;
    } else if (closed || selected === "handoff") {
      const savedHandoff = closed ? await prisma.repairOrderClosureEvent.findFirst({
        where: { organizationId: order.organizationId, repairOrderId: order.id, type: "CLOSED" },
        orderBy: { version: "desc" },
        select: { recipientName: true, occurredAt: true, finalOdometer: true }
      }) : null;
      const reviewedJobs = order.origin === "CUSTOMER_REPAIR" ? order.repairJobs.filter(job => job.status === "QC_PASSED") : [];
      const inspectionRecords = reviewedJobs.length ? await prisma.repairQualityInspection.findMany({
        where: { organizationId: order.organizationId, repairOrderId: order.id, repairJobId: { in: reviewedJobs.map(job => job.id) } },
        orderBy: { version: "desc" }, distinct: ["repairJobId"],
        select: { repairJobId: true, disposition: true, templateSnapshot: true },
      }) : [];
      const recommendations = inspectionRecords.flatMap(inspection => {
        const recommendation = readFinalRepairQcRecommendation(inspection);
        return recommendation ? [{ ...recommendation, id: inspection.repairJobId, number: reviewedJobs.find(job => job.id === inspection.repairJobId)?.jobNumber }] : [];
      });
      tool = <>{recommendations.length > 0 && <section className="panel-card" aria-label="Final repair QC recommendations">
        <h3>Final repair QC recommendations</h3>
        <ul>{recommendations.map(item => <li key={item.id}><strong>{item.number} · {item.finding}</strong> {item.note}</li>)}</ul>
      </section>}
      {order.origin === "CUSTOMER_REPAIR" && order.customer &&
        <CourtesyVehicleCheck key={order.id} repairOrderId={order.id} mode="advisor" />}
        <RepairHandoffTool repairOrderId={order.id} vehicleId={order.vehicle.id} internal={order.origin === "INVENTORY_RECON"}
        closed={closed} billing={handoffBilling} billingHref={handoffBillingHref} billingUnverified={billingUnverified}
        savedHandoff={savedHandoff ? { ...savedHandoff, occurredAt: savedHandoff.occurredAt.toISOString() } : null}
        timeZone={order.location.timezone} /></>;
    }
    else if (customerAuthorization) {
      const resume = authorizationResume ?? await getRepairResume(user, order.id, true);
      const presentedEstimate = estimate?.status === "PRESENTED" && estimate.expiresAt > new Date() ? estimate : undefined;
      const estimateDocument = presentedEstimate && await prisma.serviceDocument.findFirst({
        where: { organizationId: order.organizationId, repairOrderId: order.id, kind: "ESTIMATE", sourceId: presentedEstimate.id },
        select: { id: true }
      });
      const authorizationHref = repairReviewHref(order.id, "authorization", context);
      const planningHref = `/vehicles/shop-planning?${new URLSearchParams({ repairOrderId: order.id, returnTo: authorizationHref })}`;
      tool = <CustomerRepairAuthorization
        repairOrderId={order.id}
        version={order.version}
        concern={order.serviceVisit.concernSummary}
        customerName={order.customer?.displayName ?? ""}
        consent={resume?.diagnosticConsent?.feeCents != null && !diagnosticPending
          ? { status: "DOCUMENTED", reference: resume.diagnosticConsent.reference, feeCents: resume.diagnosticConsent.feeCents, customerName: resume.diagnosticConsent.customerName }
          : diagnosticRequired
            ? { status: "PENDING", reference: null }
            : { status: resume?.diagnosticConsent ? "DOCUMENTED" : order.serviceVisit.consentStatus, reference: resume?.diagnosticConsent?.reference ?? order.serviceVisit.consentReference }}
        diagnosticOnly={diagnosticPending || (diagnosticRequired && !estimate)}
        inspectionHref={repairReviewHref(order.id, "inspection", context)}
        canAct={Boolean(resume?.summary.canAct && order.customer && current !== "handoff")}
        estimateId={estimateDocument ? presentedEstimate?.id : undefined}
        legacyEstimateHref={presentedEstimate && !estimateDocument ? `/repair-estimate?${new URLSearchParams({ repairOrderId: order.id, estimateId: presentedEstimate.id, workflow: "review" })}` : undefined}
        hasSavedEstimate={Boolean(estimate)}
        vendor={Boolean(activeVendor)}
        laborGuideHref={repairLaborGuideHref(order.id, authorizationHref, resume?.draftId)}
        planningHref={planningHref}
        continueHref={home}
      />;
    }
    else if (selected === "qc") {
      const canOpen = canOpenRepairQc(order);
      const model = canOpen ? await getQualityControlWorkspace(user, {}, order.id).catch(() => null) : null;
      tool = <>
        {!model?.repairOrders.length && <RepairQcDiagnostics order={order} unavailable={canOpen} />}
        {model?.repairOrders.length ? <QualityControlWorkspace initial={serialized(model)} initialRepairOrderId={order.id} reviewOrderId={order.id} returnTo={home} returnLabel="Return to Repair Workbench" />
          : !canOpen ? <InventoryQcChecklistPreview key={order.id} repairOrderId={order.id} /> : null}
      </>;
    } else if (selected === "assignment" && !order.repairJobs.some(job => job.status !== "CANCELLED")) {
      tool = <section aria-label="Assignment prerequisite">
        <h3>Release a repair job before assigning it</h3>
        <p>{current === "parts" ? "The estimate is approved. Create the job from the approved work, then choose a technician." : "Complete the current planning step before booking a technician."}</p>
        <Link href={repairReviewHref(order.id, current, context)}>{needsWorkOrder ? "Create technician work order" : "Continue repair planning"}</Link>
      </section>;
    } else if (selected === "assignment" || selected === "repair") {
      const model = await getShopExecutionWorkspace(user), jobs = model.jobs.filter(job => job.repairOrder.id === order.id);
      const vendor = order.vendorWorks.find(work => !["CANCELLED", "COMPLETED"].includes(work.status));
      if (selected === "repair" && !jobs.length && vendor) {
        const [planning, rate] = await Promise.all([getShopPlanningWorkspace(user), getActiveLaborRate(user)]);
        tool = <ShopPlanningWorkspace initial={serialized({ ...planning, repairOrders: [order] })} reviewOrderId={order.id} focusStep={5} returnTo={home} defaultLaborRate={rate.laborRate} canOverrideLaborRate={canManageSettings(user)} />;
      } else tool = selected === "repair" ? <RepairExecutionTool key={`${params.repairJobId ?? ""}:${params.repairAction ?? ""}`} repairOrderId={order.id} jobs={serialized(jobs)} actorId={user.id} manager={isManager(user)} initialJobId={params.repairJobId} openProgress={params.repairAction === "progress"} /> : <ShopExecutionWorkspace initial={serialized({ ...model, jobs, repairOrders: model.repairOrders.filter(row => row.id === order.id) })} initialRepairOrderId={order.id} reviewOrderId={order.id} />;
    } else if (selected === "parts") {
      const ledgerHref = `/vehicles/parts?${new URLSearchParams({ repairOrderId: order.id, returnTo: repairReviewHref(order.id, "parts", context) })}`;
      if (needsWorkOrder && estimate && authorization) {
        const permissionError = await repairJobCreationRestriction(user, order.locationId);
        const allLines = estimate.lineItems as unknown as Parameters<typeof allocateApprovedJobParts>[0];
        const approvedKeys = authorization.authorizedLineKeys as string[];
        const jobKeys = order.repairJobs.filter(job => job.authorizationId === authorization.id).map(job => job.authorizedLineKey);
        let allocations: ReturnType<typeof allocateApprovedJobParts> | undefined;
        let partsMappingError: string | undefined;
        const unmatched = unmatchedApprovedJobDemands(allLines, approvedKeys, order.partDemands);
        const demands = order.partDemands.filter(demand => !unmatched.includes(demand.id));
        try {
          allocations = allocateApprovedJobParts(allLines, approvedKeys, demands, jobKeys, order.origin === "CUSTOMER_REPAIR");
        } catch (error) {
          partsMappingError = error instanceof Error ? error.message : "Review which approved labor line each part belongs to.";
        }
        tool = <ApprovedTechnicianWork repairOrderId={order.id} estimateId={estimate.id} authorizationId={authorization.id}
          permissionError={permissionError} partsMappingError={partsMappingError}
          unmatchedParts={order.partDemands.filter(demand => unmatched.includes(demand.id)).map(demand => ({
            id: demand.id, label: demand.part.description || demand.part.partNumber, quantity: demand.quantityRequired,
          }))}
          partsHref={`/vehicles/shop-planning?${new URLSearchParams({ repairOrderId: order.id, returnTo: repairReviewHref(order.id, "parts", context) })}#repair-planning-step-5-create-job`}
          resumeHref={repairReviewHref(order.id, undefined, { returnTo, returnLabel })}
          work={pendingLabor.map(line => ({ ...line, plannedCorrection: line.plannedCorrection || line.description,
            partsRequired: allocations?.get(line.key)?.partsRequired ?? catalogJobRequirements(line.key).partsRequired }))} />;
      } else {
        const parts = await getServiceClosePartsWorkspace(user).catch(() => null);
        const missing = (waitingVendor ? order.partDemands : waitingJobs.flatMap(job => job.partDemands))
          .filter(demand => !["CANCELLED", "RELEASED"].includes(demand.status) && demand.quantityReserved < demand.quantityRequired);
        tool = <>
          {order.repairJobs.some(job => job.status !== "CANCELLED") && <p>
            <Link href={`/vehicles/repair-workbench/technician-work-order?${new URLSearchParams({ repairOrderId: order.id, returnTo: repairReviewHref(order.id, "parts", context) })}`}>Review or print technician work order</Link>
          </p>}
          {needsParts && <section className={styles.partsBlocker} aria-label="Parts blocking repair">
            <h3>Parts requirements to resolve</h3>
            {waitingVendor && <p>{waitingVendor.vendorName} is waiting on parts.</p>}
            {missing.length > 0 && <ul>{missing.map(demand => <li key={demand.id}>{demand.part.description || demand.part.partNumber} · {demand.quantityReserved}/{demand.quantityRequired} reserved</li>)}</ul>}
            {waitingJobs.map(job => <p key={job.id}>{job.executionBlockerReason || (!job.partDemands.length ? `${job.jobNumber} · ${job.description}: record the needed parts below.` : null)}</p>)}
            {missing.length > 0 && <Link href={ledgerHref}>Review stock and reservations</Link>}
          </section>}
          {parts ? <ServiceClosePartsWorkspace compactStage initial={serialized(scopedRepairOrders(parts, order.id))} initialRepairOrderId={order.id} reviewOrderId={order.id} returnTo={home} returnLabel="Return to Repair Workbench" />
            : <p role="status">Parts tools are unavailable for this role or location. Ask the Parts team to review the order.</p>}
          {activeVendor && <p><Link href={shopReconHref}>Open vendor repair planning</Link></p>}
        </>;
      }
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
    recordedWork={<RepairRecordedWork order={order} awaitingDiagnosis={Boolean(diagnosisWork?.request)} />}
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
    advisorRepairTab={params.tab === "repair"}
    stageOpen={stageOpen}
    custody={activeVendor?.currentLocation || custody?.positionLabel || custody?.location?.name}
    target={order.targetAt ? new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: order.location.timezone }).format(order.targetAt) : undefined}
    vendorAmount={vendor ? vendorAmount == null ? "Not recorded" : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(vendorAmount / 100) : undefined}
    nextAction={nextAction}
    inlineNextAction={selected === "parts" && current === "parts" && !supportingTool}
    suppressFooterAction={compactDiagnosis || (!supportingTool && (selected === "parts" || (selected === current && (selected === "assignment" || selected === "repair"))))}
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
