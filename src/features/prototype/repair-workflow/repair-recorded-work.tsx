import Link from "next/link";
import type { getShopPlanningDetail } from "@/server/shop-planning/service";
import { repairReviewHref } from "@/lib/repair-workflow-review";
import { readableRepairStatus } from "@/lib/repair-workflow-evidence";
import styles from "./repair-workflow.module.css";

type Order = Awaited<ReturnType<typeof getShopPlanningDetail>>;
const money = (cents: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
const date = (value: Date | string) => new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }).format(new Date(value)) + " UTC";
const estimateHref = (repairOrderId: string, estimateId: string) => `/repair-estimate?${new URLSearchParams({ repairOrderId, estimateId, workflow: "review" })}`;
const reasonCodes = (value: unknown) => Array.isArray(value) ? value.filter((code): code is string => typeof code === "string") : [];
const approval = (value?: string) => value ? ({ ACCEPTED: "Approved", PARTIAL: "Partially approved" } as Record<string, string>)[value] ?? readableRepairStatus(value) : "Pending";

export function RepairRecordedWork({ order }: { order: Order }) {
  const estimates = [...order.estimateVersions].sort((left, right) => right.version - left.version);
  const latest = estimates[0], decision = latest?.authorizations[0];
  const jobs = order.repairJobs.filter(job => job.status !== "CANCELLED");
  const passed = jobs.filter(job => job.status === "QC_PASSED").length;
  const awaitingQc = jobs.filter(job => job.status === "READY_FOR_QC").length;
  const events = [...order.stateEvents].sort((left, right) => right.occurredAt.getTime() - left.occurredAt.getTime()).slice(0, 20);
  return <section className={styles.recorded} aria-label="Already recorded">
    <h2>Already recorded</h2>
    <dl className={styles.recordedStrip}>
      <div><dt>Received</dt><dd><time dateTime={order.serviceVisit.arrivedAt.toISOString()}>{date(order.serviceVisit.arrivedAt)}</time><small>RO owner: {order.ownerUser.name}</small></dd></div>
      <div><dt>Estimate</dt><dd>{latest ? <><strong>v{latest.version} · {money(latest.totalCents)}</strong><small>{readableRepairStatus(latest.status)}</small><Link href={estimateHref(order.id, latest.id)}>View / Print estimate</Link></> : <>No saved estimate<small>Browser-only drafts are not saved RO estimates.</small> <Link href={repairReviewHref(order.id, "estimate")}>Build estimate</Link></>}</dd></div>
      <div><dt>Authorization</dt><dd>{latest ? <>{approval(decision?.disposition)} · v{latest.version}{decision && <small>{decision.decisionActorName} · {date(decision.decidedAt)}</small>}<Link href={repairReviewHref(order.id, "authorization")}>Review decision</Link></> : "No estimate to authorize"}</dd></div>
      <div><dt>Repair work</dt><dd>{jobs.length ? <>{passed}/{jobs.length} jobs QC passed<small>{awaitingQc} awaiting QC · {jobs.length - passed - awaitingQc} unfinished</small></> : "No repair jobs recorded"}</dd></div>
    </dl>
    <p><strong>Concern:</strong> {order.serviceVisit.concernSummary}</p>
    <p><strong>Next action:</strong> {order.nextAction || "Review recorded work and continue the current task."}{order.stateReason && <small className={styles.blocker}>Recorded hold / reason: {order.stateReason}</small>}</p>
    <details className={styles.history}><summary>History · estimates, findings, jobs &amp; notes</summary>
      <p>Saved records only. Earlier approvals do not automatically approve a newer estimate. Times shown in UTC.</p>
      <h3>Estimate revisions &amp; decisions</h3>
      {estimates.length ? <ul>{estimates.map(estimate => <li key={estimate.id}><Link href={estimateHref(order.id, estimate.id)}>Estimate v{estimate.version} · {money(estimate.totalCents)}</Link> · {estimate.id === latest.id ? "Latest revision" : "Earlier revision"} · {readableRepairStatus(estimate.status)}<small>Presented {date(estimate.presentedAt)} · expires {date(estimate.expiresAt)}</small>{estimate.authorizations.length ? <ul>{estimate.authorizations.map(authorization => <li key={authorization.id}>{approval(authorization.disposition)} · {authorization.decisionActorName} · {date(authorization.decidedAt)}<small>{authorization.reason}</small></li>)}</ul> : <small>No authorization decision recorded for this revision.</small>}</li>)}</ul> : <p>No saved estimate revisions.</p>}
      <h3>Inspection &amp; diagnosis</h3>
      <ul>{order.inspectionVersions.map(inspection => <li key={inspection.id}>Inspection v{inspection.version} · {date(inspection.completedAt)}<small>{inspection.summary}</small></li>)}{order.diagnosisVersions.map(diagnosis => <li key={diagnosis.id}>Diagnosis / scope v{diagnosis.version} · {date(diagnosis.diagnosedAt)} · {diagnosis.technicianUser.name}<small>{diagnosis.cause} · {diagnosis.proposedCorrection}</small></li>)}</ul>
      {!order.inspectionVersions.length && !order.diagnosisVersions.length && <p>No saved inspection or diagnosis versions.</p>}
      <h3>Repair jobs</h3>
      {order.repairJobs.length ? <ul>{order.repairJobs.map(job => <li key={job.id}>{job.jobNumber} · {job.description} · {readableRepairStatus(job.status)}{reasonCodes(job.readinessReasonCodes).length > 0 && <small>Readiness reasons: {reasonCodes(job.readinessReasonCodes).map(readableRepairStatus).join(", ")}</small>}</li>)}</ul> : <p>No repair jobs recorded.</p>}
      {order.vendorWorks.length > 0 && <><h3>Outside work</h3><ul>{order.vendorWorks.map(work => <li key={work.id}>{work.vendorName} · {readableRepairStatus(work.status)} · {approval(work.approvalStatus)}<small>{work.scope} · {work.lastUpdateSummary} · Next: {work.nextAction}</small></li>)}</ul></>}
      <h3>Notes &amp; recorded movement</h3><p>Showing up to 10 loaded notes and 20 loaded movement entries.</p>
      <ul>{order.advisorUpdates.slice(0, 10).map(note => <li key={note.id}>{date(note.occurredAt)} · {note.authorUser.name}<small>{note.customerVisibleSummary}{note.internalNotes ? ` · Internal: ${note.internalNotes}` : ""}</small></li>)}{events.map(event => <li key={event.id}>{date(event.occurredAt)} · {readableRepairStatus(event.toStage)} · {event.actorUser.name}<small>{event.reason} · {event.nextAction}</small></li>)}</ul>
      <Link href={`/service-documents?${new URLSearchParams({ repairOrderId: order.id })}`}>Documents &amp; approvals for this RO</Link>
    </details>
  </section>;
}
