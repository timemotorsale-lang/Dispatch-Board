import { createHash } from "node:crypto";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ApprovedTechnicianWork } from "@/features/prototype/repair-workflow/approved-technician-work";
import { PrintTechnicianWorkOrder } from "@/features/prototype/repair-workflow/print-technician-work-order";
import { allocateApprovedJobParts, catalogJobRequirements, unmatchedApprovedJobDemands } from "@/lib/catalog-job-readiness";
import { safeLaborGuideReturnTo } from "@/lib/repair-explorer-context";
import { pendingApprovedLabor, repairReviewHref } from "@/lib/repair-workflow-review";
import { requireCurrentUser } from "@/server/auth/current-user";
import { getShopPlanningDetail, repairJobCreationRestriction } from "@/server/shop-planning/service";

import styles from "./technician-work-order.module.css";

type PageProps = { searchParams: Promise<{ repairOrderId?: string | string[]; returnTo?: string | string[] }> };

function authorizedTechnicianJobs(order: Awaited<ReturnType<typeof getShopPlanningDetail>>) {
  const estimate = order.estimateVersions[0];
  const authorization = estimate?.authorizations[0];
  const authorizedKeys = authorization && ["ACCEPTED", "PARTIAL"].includes(authorization.disposition) &&
    Array.isArray(authorization.authorizedLineKeys)
    ? authorization.authorizedLineKeys.filter((key): key is string => typeof key === "string") : [];
  const currentJobs = order.repairJobs.filter(job => job.authorizationId === authorization?.id &&
    job.estimateVersionId === estimate?.id && authorizedKeys.includes(job.authorizedLineKey));
  return { estimate, authorization, authorizedKeys, currentJobs };
}

function technicianPrintFingerprint(order: Awaited<ReturnType<typeof getShopPlanningDetail>>, scope: ReturnType<typeof authorizedTechnicianJobs>) {
  const { estimate, authorization, authorizedKeys, currentJobs } = scope;
  const jobs = currentJobs.map(job => ({
    id: job.id, status: job.status, version: job.version, label: job.description, correction: job.plannedCorrection,
    laborGuideMinutes: job.laborGuideMinutes, partsRequired: job.partsRequired, partDemands: job.partDemands,
  }));
  const header = [order.location.name, order.repairOrderNumber, order.vehicle.year, order.vehicle.make,
    order.vehicle.model, order.vehicle.vehicleNumber, order.vehicle.vin, order.serviceVisit.concernSummary, order.closedAt, order.stage];
  return createHash("sha256").update(JSON.stringify([header, estimate?.id, authorization?.id, authorizedKeys, jobs])).digest("hex");
}

export default async function TechnicianWorkOrderPage({ searchParams }: PageProps) {
  const user = await requireCurrentUser();
  const { repairOrderId, returnTo } = await searchParams;
  if (typeof repairOrderId !== "string" || !repairOrderId.trim()) notFound();
  const order = await getShopPlanningDetail(user, repairOrderId).catch(() => null);
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
  async function verifyPrintAction() {
    "use server";
    const actor = await requireCurrentUser();
    const current = await getShopPlanningDetail(actor, orderId).catch(() => null);
    return !!current && technicianPrintFingerprint(current, authorizedTechnicianJobs(current)) === expectedFingerprint;
  }
  const pendingLabor = pendingApprovedLabor(estimate, order.repairJobs);
  const closed = Boolean(order.closedAt) || ["CLOSED", "CANCELLED"].includes(order.stage);
  const released = Boolean(order.releaseAuthorization) || order.stage === "HANDOFF";
  const activeVendor = order.vendorWorks.some(work => !["CANCELLED", "COMPLETED"].includes(work.status));
  const vehicle = [order.vehicle.year, order.vehicle.make, order.vehicle.model].filter(Boolean).join(" ") || order.vehicle.vehicleNumber;
  const lines = Array.isArray(estimate?.lineItems)
    ? estimate.lineItems as unknown as (Parameters<typeof allocateApprovedJobParts>[0][number] & { quantity?: number })[] : [];
  const approvedParts = lines.filter(line => line.type === "PART" && authorizedKeys.includes(line.key));
  const approvedLabor = lines.filter(line => line.type === "LABOR" && authorizedKeys.includes(line.key));
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
      {jobs.length > 0 && <PrintTechnicianWorkOrder verifyPrintAction={verifyPrintAction} />}
    </nav>
    <header className={styles.header}>
      <p>{order.location.name}</p>
      <h1>Technician work order</h1>
      <p><strong>{order.repairOrderNumber} · {vehicle}</strong></p>
      {order.vehicle.vin && <p>VIN {order.vehicle.vin}</p>}
      <p>Customer concern</p>
      <p className={styles.instructions}>{order.serviceVisit.concernSummary}</p>
      {jobs.length > 0 && <p>Approved estimate v{estimate?.version}{closed ? " · Closed repair order" : ""}</p>}
    </header>

    {prepare}
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
    {jobs.length > 0 && <section aria-label="Saved technician jobs">
      <h2>Saved technician jobs</h2>
      {pendingLabor.length > 0 && <p>{pendingLabor.length} approved labor {pendingLabor.length === 1 ? "line still needs" : "lines still need"} a job. This copy lists saved jobs only.</p>}
      {cancelled.length > 0 && <p>Cancelled jobs excluded: {cancelled.map(job => job.jobNumber).join(", ")}.</p>}
      {jobs.map(job => {
        const parts = job.partDemands.filter(part => !["CANCELLED", "RELEASED"].includes(part.status));
        const quotedParts = approvedParts.filter(part =>
          (part.laborLineKey === job.authorizedLineKey || (!part.laborLineKey && approvedLabor.length === 1)) &&
          !parts.some(demand => part.partNumber && demand.part.partNumber
            ? part.partNumber.toLowerCase() === demand.part.partNumber.toLowerCase()
            : part.description.toLowerCase() === demand.part.description?.toLowerCase()));
        return <article className={styles.job} key={job.id}>
          <h3>{job.jobNumber} · {job.description}</h3>
          <p>{job.laborGuideMinutes} planned min · {job.status.toLowerCase().replaceAll("_", " ")}</p>
          <p><strong>Technician instructions</strong></p>
          <p className={styles.instructions}>{job.plannedCorrection || job.description}</p>
          {parts.length > 0 ? <>
            <p><strong>Linked parts</strong></p>
            <ul>{parts.map(demand => <li key={demand.id}>
              {demand.quantityRequired} × {demand.part.description || demand.part.partNumber}
              {demand.part.description && demand.part.partNumber ? ` (${demand.part.partNumber})` : ""}
            </li>)}</ul>
          </> : job.partsRequired && <p>Parts required. Review this job’s parts and readiness in the Repair Workbench.</p>}
          {quotedParts.length > 0 && <>
            <p><strong>Approved estimate parts without a linked demand</strong></p>
            <ul>{quotedParts.map(part => <li key={part.key}>
              {part.quantity ? `${part.quantity} × ` : ""}{part.description}{part.partNumber ? ` (${part.partNumber})` : ""}
            </li>)}</ul>
          </>}
        </article>;
      })}
      <p>Before sending work to QC, record what was completed, how the repair was verified, and any measurements, photos, or references the inspector needs in the Repair Workbench. Report additional work to the advisor for approval.</p>
    </section>}
  </main>;
}
