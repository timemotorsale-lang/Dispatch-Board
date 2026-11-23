import { createHash } from "node:crypto";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ApprovedTechnicianWork } from "@/features/prototype/repair-workflow/approved-technician-work";
import { TechnicianCommentForm } from "@/features/prototype/repair-workflow/technician-comment-form";
import { savedTechnicianText, technicianExecutionState, type TechnicianExecutionJob } from "@/features/prototype/repair-workflow/technician-execution-state";
import { isManager } from "@/server/policies/access";
import { PrintTechnicianWorkOrder } from "@/features/prototype/repair-workflow/print-technician-work-order";
import { allocateApprovedJobParts, catalogJobRequirements, unmatchedApprovedJobDemands } from "@/lib/catalog-job-readiness";
import { safeLaborGuideReturnTo } from "@/lib/repair-explorer-context";
import { technicianCommentAssignments, technicianCommentJobStatuses } from "@/lib/technician-comment-access";
import { pendingApprovedLabor, repairReviewHref } from "@/lib/repair-workflow-review";
import { requireCurrentUser } from "@/server/auth/current-user";
import { getTechnicianWorkOrderDetail, repairJobCreationRestriction } from "@/server/shop-planning/service";

import styles from "./technician-work-order.module.css";

type PageProps = { searchParams: Promise<{ repairOrderId?: string | string[]; jobId?: string | string[]; returnTo?: string | string[] }> };

function authorizedTechnicianJobs(order: Awaited<ReturnType<typeof getTechnicianWorkOrderDetail>>) {
  const estimate = order.estimateVersions[0];
  const authorization = estimate?.authorizations[0];
  const authorizedKeys = authorization && ["ACCEPTED", "PARTIAL"].includes(authorization.disposition) &&
    Array.isArray(authorization.authorizedLineKeys)
    ? authorization.authorizedLineKeys.filter((key): key is string => typeof key === "string") : [];
  const currentJobs = order.repairJobs.filter(job => job.authorizationId === authorization?.id &&
    job.estimateVersionId === estimate?.id && authorizedKeys.includes(job.authorizedLineKey));
  return { estimate, authorization, authorizedKeys, currentJobs };
}

type TechnicianOrder = Awaited<ReturnType<typeof getTechnicianWorkOrderDetail>>;
type SavedJob = TechnicianOrder["repairJobs"][number];
const instructionVerb = /^(?:adjust|align|assemble|calibrate|check|clean|complete|confirm|diagnose|disassemble|evaluate|fit|flush|inspect|install|lubricate|measure|paint|perform|program|rebuild|recheck|recondition|refinish|reinstall|remove|repair|replace|retest|resurface|rotate|scan|service|test|tighten|torque|verify)\b/i;

function executionJob(job: SavedJob): TechnicianExecutionJob {
  return {
    id: job.id, jobNumber: job.jobNumber, description: job.description, plannedCorrection: job.plannedCorrection,
    procedureVersion: job.procedureVersion,
    status: job.status, qcFailedAt: job.qcFailedAt?.toISOString(), executionBlockerReason: job.executionBlockerReason,
    partsRequired: job.partsRequired, partCustodyEvents: job.partCustodyEvents,
    partDemands: job.partDemands.map(({ partId, status, quantityRequired, quantityReserved }) => ({
      partId, status, quantityRequired, quantityReserved,
    })),
    dispatches: job.dispatches.map(({ status, technicianUserId }) => ({ status, technicianUserId })),
    laborClocks: job.laborClocks.map(clock => ({ ...clock, finishedAt: clock.finishedAt?.toISOString() })),
  };
}

function savedJobAssignment(job: SavedJob) {
  return job.dispatches.find(row => row.status === "ACTIVE") ?? job.dispatches.find(row => row.status === "STAGED") ??
    (["READY_FOR_QC", "QC_PASSED"].includes(job.status) ? job.dispatches.find(row => row.status === "COMPLETED") : undefined);
}

function technicianPrintFingerprint(order: TechnicianOrder, scope: ReturnType<typeof authorizedTechnicianJobs>) {
  const { estimate, authorization, authorizedKeys, currentJobs } = scope;
  const header = [order.location, order.repairOrderNumber, order.vehicle.year, order.vehicle.make,
    order.vehicle.model, order.vehicle.vehicleNumber, order.vehicle.vin, order.serviceVisit.concernSummary, order.closedAt, order.stage,
    order.releaseAuthorization?.id, order.vendorWorks.some(work => !["CANCELLED", "COMPLETED"].includes(work.status))];
  return createHash("sha256").update(JSON.stringify([header, estimate?.id, estimate?.version, estimate?.lineItems,
    authorization?.id, authorization?.disposition, authorizedKeys, currentJobs])).digest("hex");
}

export default async function TechnicianWorkOrderPage({ searchParams }: PageProps) {
  const user = await requireCurrentUser();
  const { repairOrderId, returnTo, jobId } = await searchParams;
  if (typeof repairOrderId !== "string" || !repairOrderId.trim()) notFound();
  const order = await getTechnicianWorkOrderDetail(user, repairOrderId).catch(() => null);
  if (!order) notFound();

  const destination = safeLaborGuideReturnTo(typeof returnTo === "string" ? returnTo : undefined);
  const fallback = repairReviewHref(order.id);
  const parsedReturn = destination ? new URL(destination, "https://workspace.invalid") : null;
  const backHref = parsedReturn?.pathname === "/vehicles/repair-workbench" &&
    parsedReturn.searchParams.get("repairOrderId") === order.id ? destination ?? fallback : fallback;
  const resumeQuery = new URLSearchParams({ repairOrderId: order.id });
  if (backHref !== fallback) resumeQuery.set("returnTo", backHref);
  const resumeHref = `/vehicles/repair-workbench/technician-work-order?${resumeQuery}`;
  const scope = authorizedTechnicianJobs(order);
  const { estimate, authorization, authorizedKeys, currentJobs } = scope;
  const jobs = currentJobs.filter(job => job.status !== "CANCELLED");
  const cancelled = currentJobs.filter(job => job.status === "CANCELLED");
  const expectedFingerprint = technicianPrintFingerprint(order, scope);
  const orderId = order.id;
  const userId = user.id;
  const manager = isManager(user);
  async function verifyPrintAction() {
    "use server";
    const actor = await requireCurrentUser();
    const current = await getTechnicianWorkOrderDetail(actor, orderId).catch(() => null);
    return actor.id === userId && isManager(actor) === manager && !!current &&
      technicianPrintFingerprint(current, authorizedTechnicianJobs(current)) === expectedFingerprint;
  }
  const pendingLabor = pendingApprovedLabor(estimate, order.repairJobs);
  const closed = Boolean(order.closedAt) || ["CLOSED", "CANCELLED"].includes(order.stage);
  const released = Boolean(order.releaseAuthorization) || order.stage === "HANDOFF";
  const activeVendor = order.vendorWorks.some(work => !["CANCELLED", "COMPLETED"].includes(work.status));
  const vehicle = [order.vehicle.year, order.vehicle.make, order.vehicle.model].filter(Boolean).join(" ") || order.vehicle.vehicleNumber;
  const lines = Array.isArray(estimate?.lineItems)
    ? estimate.lineItems as unknown as (Parameters<typeof allocateApprovedJobParts>[0][number] & { quantity?: number })[] : [];
  const canWork = !closed && !released && !activeVendor;
  const rows = jobs.map(job => {
    const state = technicianExecutionState(executionJob(job));
    const assignment = savedJobAssignment(job);
    const canComment = canWork && technicianCommentJobStatuses.some(status => status === job.status) &&
      (manager || job.dispatches.some(dispatch => dispatch.technicianUserId === user.id &&
        technicianCommentAssignments.some(rule => rule.status === dispatch.status && rule.position === dispatch.position)));
    return { job, state, assignment, canComment };
  });
  const commentJobs = rows.filter(row => row.canComment).map(({ job }) => ({ id: job.id, jobNumber: job.jobNumber, description: job.description }));
  const defaultCommentJob = typeof jobId === "string" && commentJobs.some(job => job.id === jobId) ? jobId : undefined;
  const comments = (order.advisorUpdates ?? []).filter(update => update.internalNotes && (manager || update.authorUserId === user.id)).slice(0, 3);
  const bays = [...new Set(rows.map(row => row.assignment?.bayResource?.name).filter(Boolean))];
  const technicians = [...new Set(rows.map(row => row.assignment?.technicianUser.name).filter(Boolean))];
  let prepare = null;

  if (estimate && authorization && pendingLabor.length && !closed && !released && !activeVendor) {
    const permissionError = await repairJobCreationRestriction(user, order.locationId);
    const unmatched = new Set(unmatchedApprovedJobDemands(lines, authorizedKeys, order.partDemands));
    let allocations: ReturnType<typeof allocateApprovedJobParts> | undefined;
    let partsMappingError: string | undefined;
    try {
      allocations = allocateApprovedJobParts(lines, authorizedKeys, order.partDemands.filter(demand => !unmatched.has(demand.id)),
        currentJobs.map(job => job.authorizedLineKey), order.origin === "CUSTOMER_REPAIR");
    } catch (error) {
      partsMappingError = error instanceof Error ? error.message : "Review which approved labor line each part belongs to.";
    }
    const partsHref = `/vehicles/shop-planning?${new URLSearchParams({ repairOrderId: order.id, returnTo: resumeHref })}#repair-planning-step-5-create-job`;
    prepare = <section className={styles.controls} aria-labelledby="prepare-technician-work">
      <h2 id="prepare-technician-work">Prepare technician work</h2>
      <ApprovedTechnicianWork
        key={JSON.stringify([authorization.id, pendingLabor.map(line => line.key)])}
        repairOrderId={order.id} estimateId={estimate.id} authorizationId={authorization.id}
        permissionError={permissionError} partsMappingError={partsMappingError} partsHref={partsHref} resumeHref={resumeHref}
        unmatchedParts={order.partDemands.filter(demand => unmatched.has(demand.id)).map(demand => ({
          id: demand.id, label: demand.part.description || demand.part.partNumber, quantity: demand.quantityRequired,
        }))}
        work={pendingLabor.map(line => ({
          ...line, plannedCorrection: line.plannedCorrection || line.description,
          partsRequired: allocations?.get(line.key)?.partsRequired ?? catalogJobRequirements(line.key).partsRequired,
        }))}
      />
    </section>;
  }

  return <main className={styles.page}>
    <nav className={styles.controls} aria-label="Work order actions">
      <Link href={backHref}>Back to Repair Workbench</Link>
    </nav>
    {jobs.length === 0 && <header className={styles.header}><h1>Technician Work Order</h1><p>{vehicle} · {order.repairOrderNumber}</p></header>}

    {jobs.length > 0 && prepare ? <details className={styles.controls}>
      <summary>Prepare remaining approved jobs</summary>{prepare}
    </details> : prepare}
    {!jobs.length && !prepare && <section className={styles.controls}>
      <h2>{activeVendor ? "Outside vendor work is active" : "No current technician work orders"}</h2>
      <p>{closed ? "This closed repair order has no saved jobs under its current approval." :
        released ? "This repair order is at handoff. Review the saved work from the Repair Workbench." :
        activeVendor ? "Continue the vendor workflow from the Repair Workbench." :
        cancelled.length ? "The saved jobs under the current approval were cancelled. Review the repair scope before proceeding." :
        authorizedKeys.length ? "The authorized scope has no executable labor lines." :
        "Record approval for the current estimate to prepare technician work."}</p>
      {!closed && !released && !activeVendor && !cancelled.length && !authorizedKeys.length &&
        <Link href={repairReviewHref(order.id, "authorization")}>Review repair authorization</Link>}
    </section>}
    {rows.length > 0 && <article className={styles.job}>
      <header className={styles.header}>
        <h1>Technician Work Order</h1><p className={styles.vehicle}>{vehicle}</p>
        <p className={styles.meta}>{[order.repairOrderNumber, ...bays, ...technicians].join(" · ")}</p>
      </header>
      <section className={styles.section}>
        <h2>Customer concern</h2><p className={styles.concern}>{order.serviceVisit.concernSummary || "No concern recorded."}</p>
      </section>
      <section className={styles.section}>
        <h2>Work instructions</h2>
        <ol className={styles.steps}>{rows.map(({ job, state, assignment }) => {
          const assigned = assignment && (bays.length > 1 || technicians.length > 1)
            ? [assignment.technicianUser.name, assignment.bayResource?.name].filter(Boolean).join(" · ") : null;
          const status = state.complete ? job.status === "READY_FOR_QC" ? "Ready for QC" : "Completed"
            : state.waitingForParts ? "Waiting on parts" : !assignment || assignment.status === "STAGED" ? "Awaiting assignment" : null;
          const steps = [...new Set([
            ...savedTechnicianText(job.procedureVersion?.safetySteps), job.plannedCorrection ?? "",
            ...savedTechnicianText(job.procedureVersion?.instructions), ...savedTechnicianText(job.procedureVersion?.qcRules),
          ].map(step => step.trim()).filter(step => step && step.toLowerCase() !== job.description.trim().toLowerCase()))];
          const requiredEvidence = savedTechnicianText(job.procedureVersion?.requiredEvidence);
          const rework = job.qcFailedAt && !state.complete ? job.qualityInspections[0] : undefined;
          const correction = job.plannedCorrection?.trim();
          const hasInstruction = instructionVerb.test(job.description.trim()) ||
            Boolean(correction && correction.toLowerCase() !== job.description.trim().toLowerCase()) ||
            savedTechnicianText(job.procedureVersion?.instructions).length > 0;
          return <li key={job.id}>
            <div className={styles.stepTitle}>
              <h3>{job.description}</h3>
              <span className={styles.stepMeta}>{job.jobNumber}{status && <span className={state.waitingForParts ? styles.waiting : undefined}>{status}</span>}</span>
            </div>
            {assigned && <p className={styles.meta}>{assigned}</p>}
            {rework && <p className={styles.blocker}><strong>Rework:</strong> {rework.reworkInstructions || "Address the failed QC findings."} {savedTechnicianText(rework.failureReasonCodes).map(code => code.replaceAll("_", " ").toLowerCase()).join(", ")}</p>}
            {steps.length > 0 && <ul>{steps.map(step => <li key={step}>{step}</li>)}</ul>}
            {!hasInstruction && !rework && !state.complete && <p className={styles.meta}>Ask the advisor to confirm the exact task.</p>}
            {requiredEvidence.length > 0 && <p className={styles.required}><strong>Required evidence</strong> · {requiredEvidence.join("; ")}</p>}
            {job.executionBlockerReason && job.executionBlockerReason !== rework?.reworkInstructions && <p className={styles.blocker}>{job.executionBlockerReason}</p>}
          </li>;
        })}</ol>
      </section>
      {(commentJobs.length > 0 || comments.length > 0) && <section className={`${styles.section} ${styles.controls}`}>
        <h2>Technician comments</h2>
        {commentJobs.length > 0 && <TechnicianCommentForm repairOrderId={order.id} jobs={commentJobs} initialJobId={defaultCommentJob} />}
        {comments.length > 0 && <details className={styles.details}><summary>Recent comments sent to the advisor</summary>
          {comments.map(comment => <p key={comment.id} className={styles.saved}>{comment.internalNotes}</p>)}
        </details>}
      </section>}
      <div className={`${styles.section} ${styles.printNotes}`}><p>Technician comment · Job __________</p></div>
      <footer className={styles.audit}>
        <span>Approved estimate v{estimate?.version}</span>
        <PrintTechnicianWorkOrder verifyPrintAction={verifyPrintAction} timeZone={order.location.timezone} controlsClassName={styles.controls} />
      </footer>
      <details className={`${styles.controls} ${styles.details}`}>
        <summary>Work order details</summary>
        <p>{order.location.name}{order.vehicle.vin ? ` · VIN ${order.vehicle.vin}` : ""}</p>
        {jobs.map(job => <div key={job.id}><p>{job.jobNumber} · Job revision {job.version} · {job.laborGuideMinutes} planned min</p>
          {job.qcHandoffNotes && <p className={styles.saved}><strong>Saved QC handoff</strong><br />{job.qcHandoffNotes}</p>}
          {savedTechnicianText(job.executionEvidence).map((item, index) => <p key={index}>{item}</p>)}
        </div>)}
      </details>
    </article>}
  </main>;
}
