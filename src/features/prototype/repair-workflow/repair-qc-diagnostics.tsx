import Link from "next/link";
import { waitingJobPartsReady } from "@/lib/repair-job-parts-readiness";
import { readableRepairStatus } from "@/lib/repair-workflow-evidence";
import { repairReviewHref, type RepairWorkflowStep } from "@/lib/repair-workflow-review";
import styles from "./repair-workflow.module.css";

type Job = {
  jobNumber: string;
  status: string;
  executionEvidence: unknown;
  qcFailedAt?: unknown;
  partsRequired?: boolean;
  executionBlockerReason?: string | null;
  partDemands: { status: string; quantityRequired: number; quantityReserved: number }[];
};
type Order = {
  id: string;
  estimateVersions: { version: number; lineItems: unknown; authorizations: { disposition: string; authorizedLineKeys: unknown }[] }[];
  repairJobs: Job[];
  vendorWorks: { status: string; approvalStatus?: string }[];
};

export function canOpenRepairQc(order: Order) {
  return order.repairJobs.some(job => ["READY_FOR_QC", "QC_PASSED"].includes(job.status) || (job.status !== "CANCELLED" && job.qcFailedAt)) ||
    order.vendorWorks.some(work => ["RETURNED", "QC_REQUIRED", "COMPLETED"].includes(work.status));
}

export function RepairQcDiagnostics({ order, unavailable = false, customerBilling = false }: { order: Order; unavailable?: boolean; customerBilling?: boolean }) {
  const jobs = order.repairJobs.filter(job => job.status !== "CANCELLED");
  const estimate = order.estimateVersions[0];
  const decision = estimate?.authorizations[0];
  const approved = decision && ["ACCEPTED", "PARTIAL"].includes(decision.disposition);
  const keys = Array.isArray(decision?.authorizedLineKeys) ? decision.authorizedLineKeys : [];
  const approvedLabor = Array.isArray(estimate?.lineItems) && estimate.lineItems.some(
    line => line?.type === "LABOR" && keys.includes(line.key)
  );
  const rows: { title: string; detail: string; step?: RepairWorkflowStep; action?: string }[] = [];

  if (!jobs.length && !canOpenRepairQc(order)) {
    const vendor = order.vendorWorks.find(work => work.status !== "CANCELLED");
    if (vendor && ["ESTIMATE_NEEDED", "SUPPLEMENT_NEEDED"].includes(vendor.status)) {
      rows.push({ title: "Vendor estimate required", detail: "Review the outside repair scope and quote.", step: "estimate", action: "Open estimate" });
    } else if (vendor && !["APPROVED", "NOT_REQUIRED"].includes(vendor.approvalStatus ?? "")) {
      rows.push({ title: "Vendor approval required", detail: "Review the approval status for the outside work.", step: "authorization", action: "Review authorization" });
    } else if (vendor) {
      rows.push({ title: "Vendor return pending", detail: "Review vendor progress and record the return before QC.", step: "repair", action: "Review vendor work" });
    } else if (!estimate) {
      rows.push({ title: "Estimate missing", detail: "Save the repair scope and labor lines for approval.", step: "estimate", action: "Open estimate" });
    } else if (!approved) {
      rows.push({ title: "Approval required", detail: `Review the decision for estimate v${estimate.version}.`, step: "authorization", action: "Review authorization" });
    } else if (!approvedLabor) {
      rows.push({ title: "No approved labor", detail: `Estimate v${estimate.version} has no approved labor line to release as an internal repair job.`, step: "authorization", action: "Review approved scope" });
    } else {
      rows.push({ title: "Approved work awaiting release", detail: `Create a repair job from the approved labor on estimate v${estimate.version}.`, step: "parts", action: "Release approved jobs" });
    }
  }

  for (const job of jobs) {
    const title = `${job.jobNumber} · ${readableRepairStatus(job.status)}`;
    switch (job.status) {
      case "WAITING_PARTS": {
        if (waitingJobPartsReady(job)) {
          rows.push({ title: `${job.jobNumber} · Parts reserved`, detail: "All linked parts are reserved. Review technician and resource eligibility and book the job.", step: "assignment", action: "Open assignment" });
          break;
        }
        const demands = job.partDemands.filter(demand => !["CANCELLED", "RELEASED"].includes(demand.status));
        const reserved = demands.filter(demand => demand.quantityReserved >= demand.quantityRequired).length;
        const detail = job.executionBlockerReason || (demands.length
          ? `${reserved} of ${demands.length} active part demands fully reserved. Review parts readiness before booking.`
          : "No active part demands are linked to this job. Review the required parts and their job linkage.");
        rows.push({ title, detail, step: "parts", action: "Review parts readiness" });
        break;
      }
      case "AUTHORIZED":
      case "READY_FOR_REPAIR":
        rows.push({ title, detail: job.qcFailedAt ? "QC returned this job for rework. Review the findings and book the corrective work." : "Review readiness and book an eligible technician.", step: "assignment", action: "Open assignment" });
        break;
      case "READY_FOR_QC":
        if (Array.isArray(job.executionEvidence) && job.executionEvidence.length) {
          rows.push({ title, detail: "Completion evidence is recorded." });
        } else {
          rows.push({ title, detail: "Completion evidence is missing. Review the repair record before recording QC.", step: "repair", action: "Review repair evidence" });
        }
        break;
      case "QC_PASSED":
        rows.push({ title, detail: "QC passed. Review the recorded result before release." });
        break;
      default:
        rows.push({ title, detail: "Complete repair or rework and record completion evidence.", step: "repair", action: "Open repair" });
    }
  }

  return (
    <section className={styles.qcDiagnostics} aria-label="QC prerequisites">
      <header>
        <h3>QC prerequisites</h3>
        <strong>{rows.filter(row => row.step).length} to resolve</strong>
      </header>
      {unavailable && <p role="alert">The QC workspace could not be loaded for this order. <Link href={repairReviewHref(order.id, "qc")}>Retry QC</Link></p>}
      {rows.length ? <ul>{rows.map(row => (
        <li key={row.title}>
          <div><strong>{row.title}</strong><p>{row.detail}</p></div>
          {row.step && <Link href={repairReviewHref(order.id, row.step)}>{row.action}</Link>}
        </li>
      ))}</ul> : !unavailable && <p>Review vendor return evidence in the QC workspace.</p>}
      {!unavailable && customerBilling && jobs.length > 0 && jobs.every(job => job.status === "QC_PASSED") &&
        <p><Link href={`/vehicles/service-billing?${new URLSearchParams({ repairOrderId: order.id })}`}>Review and create invoice</Link></p>}
    </section>
  );
}
