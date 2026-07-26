"use client";

import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  Car,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  Gauge,
  RotateCcw,
  ShieldCheck,
  Wrench
} from "lucide-react";
import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";

type User = { id: string; name: string };
type Inspection = {
  id: string;
  version: number;
  disposition: string;
  inspectedAt: string;
  safetyChecksPassed: boolean;
  peerVerificationRequired: boolean;
  peerVerificationPassed: boolean;
  roadTestRequired: boolean;
  roadTestOutcome: string;
  failureReasonCodes: string[];
  reworkInstructions: string | null;
  inspectorUser: { name: string };
  peerVerifierUser: { name: string } | null;
};
type Job = {
  id: string;
  jobNumber: string;
  description: string;
  plannedCorrection: string;
  status: string;
  lane: string | null;
  executionEvidence: string[] | null;
  qcHandoffNotes: string | null;
  readinessReasonCodes: string[];
  procedureVersion: { title: string; version: number; qcRules: string[] } | null;
  qualityInspections: Inspection[];
  dispatches: Array<{ technicianUser: { name: string } }>;
  laborClocks: Array<{ state: string; accumulatedMinutes: number }>;
};
type Order = {
  id: string;
  repairOrderNumber: string;
  origin: string;
  stage: string;
  locationId: string;
  targetAt: string;
  vehicle: { vehicleNumber: string; year: number | null; make: string | null; model: string | null };
  customer: { displayName: string } | null;
  inventoryUnit: { inventoryNumber: string } | null;
  location: { name: string };
  serviceVisit: { concernSummary: string; promisedAt: string | null };
  releaseAuthorization: { id: string; destination: string; authorizedAt: string } | null;
  repairJobs: Job[];
};
type Model = { repairOrders: Order[]; users: User[] };

const list = (value: string) => value.split(",").map((item) => item.trim()).filter(Boolean);
const isFailed = (job: Job) => job.qualityInspections[0]?.disposition === "FAILED" || job.readinessReasonCodes.some((code) => code.includes("REWORK"));
const vehicleName = (order: Order) => [order.vehicle.year, order.vehicle.make, order.vehicle.model].filter(Boolean).join(" ") || order.vehicle.vehicleNumber;
const dateTime = (value?: string | null) => value ? new Date(value).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "Not set";
const workbenchHref = (order: Order) => `/vehicles/repair-workbench?repairOrderId=${encodeURIComponent(order.id)}`;
const jobHref = (job: Job) => `/vehicles/repair-jobs/${encodeURIComponent(job.id)}/workbench`;

export function QualityControlWorkspace({ initial, initialRepairOrderId }: { initial: Model; initialRepairOrderId?: string }) {
  const initialOrder = initial.repairOrders.find((order) => order.id === initialRepairOrderId) ?? initial.repairOrders[0];
  const [model, setModel] = useState(initial);
  const [orderId, setOrderId] = useState(initialOrder?.id ?? "");
  const [jobId, setJobId] = useState(initialOrder?.repairJobs.find((job) => job.status === "READY_FOR_QC")?.id ?? initialOrder?.repairJobs[0]?.id ?? "");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [qc, setQc] = useState({
    templateCode: "FINAL_QC",
    templateVersion: 1,
    completionResult: "PASS",
    safetyResult: "PASS",
    completionEvidence: "",
    roadTestRequired: false,
    roadTestOutcome: "NOT_REQUIRED",
    roadTestEvidence: "",
    peerVerificationPassed: false,
    peerVerifierUserId: initial.users[0]?.id ?? "",
    reworkInstructions: ""
  });
  const [release, setRelease] = useState({ keysVerified: false, releaseEvidence: "", openExceptions: "" });

  const jobs = useMemo(() => model.repairOrders.flatMap((order) => order.repairJobs.map((job) => ({ order, job }))), [model]);
  const readyJobs = jobs.filter(({ job }) => job.status === "READY_FOR_QC");
  const failedJobs = jobs.filter(({ job }) => isFailed(job));
  const passedOrders = model.repairOrders.filter((order) => order.repairJobs.length && order.repairJobs.every((job) => job.status === "QC_PASSED"));
  const releaseReadyOrders = model.repairOrders.filter((order) => order.repairJobs.length && order.repairJobs.every((job) => job.status === "QC_PASSED" && job.qualityInspections[0]?.disposition === "PASSED") && !order.releaseAuthorization);
  const evidenceBlocked = readyJobs.filter(({ job }) => !job.executionEvidence?.length || !job.qcHandoffNotes);
  const order = model.repairOrders.find((item) => item.id === orderId) ?? model.repairOrders[0];
  const job = order?.repairJobs.find((item) => item.id === jobId) ?? order?.repairJobs[0];
  const allPassed = Boolean(order?.repairJobs.length) && order.repairJobs.every((item) => item.status === "QC_PASSED" && item.qualityInspections[0]?.disposition === "PASSED");
  const latestInspection = job?.qualityInspections[0];

  async function request(url: string, init?: RequestInit) {
    const response = await fetch(url, init);
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error ?? "Quality-control request failed.");
    return body;
  }

  async function refresh() {
    const next = await request("/api/quality-control") as Model;
    setModel(next);
  }

  async function submit(url: string, value: Record<string, unknown>, success: string) {
    setBusy(true);
    setNotice("");
    try {
      await request(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...value, idempotencyKey: crypto.randomUUID() }) });
      setNotice(success);
      await refresh();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Quality-control request failed.");
    } finally {
      setBusy(false);
    }
  }

  function chooseOrder(id: string) {
    setOrderId(id);
    const next = model.repairOrders.find((item) => item.id === id);
    setJobId(next?.repairJobs.find((item) => item.status === "READY_FOR_QC")?.id ?? next?.repairJobs[0]?.id ?? "");
  }

  function chooseJob(nextOrder: Order, nextJob: Job) {
    setOrderId(nextOrder.id);
    setJobId(nextJob.id);
  }

  return (
    <section className="qc-workspace-home">
      <header className="qc-hero">
        <div>
          <p>Quality Control Workspace</p>
          <h1>Verify completed repairs before they leave the shop.</h1>
          <span>One inspector queue for ready work, failed rechecks, evidence gaps, release decisions, and repair-order context.</span>
        </div>
        <nav aria-label="Quality control primary actions">
          <Link className="primary" href="#ready-for-qc"><ClipboardCheck /> Ready for QC</Link>
          <Link href="#qc-review"><ShieldCheck /> Inspect Selected</Link>
          <Link href={order ? workbenchHref(order) : "/vehicles/repair-workbench"}><FileText /> Repair Order</Link>
          <Link href="/my-tasks"><BadgeCheck /> My Work</Link>
        </nav>
      </header>

      {notice ? (
        <div className={/blocked|required|must|cannot|failed|only|different/i.test(notice) ? "notice notice-danger" : "notice notice-success"}>
          <p>{notice}</p>
        </div>
      ) : null}

      <section className="qc-kpis" aria-label="Quality control snapshot">
        <article><ClipboardCheck /><span>Ready for QC</span><strong>{readyJobs.length}</strong><small>Awaiting inspection</small></article>
        <article><RotateCcw /><span>Recheck / Rework</span><strong>{failedJobs.length}</strong><small>Failed or returned</small></article>
        <article><AlertTriangle /><span>Evidence Gaps</span><strong>{evidenceBlocked.length}</strong><small>Missing proof or notes</small></article>
        <article><CheckCircle2 /><span>Release Ready</span><strong>{releaseReadyOrders.length}</strong><small>All jobs passed</small></article>
        <article><Gauge /><span>Passed Orders</span><strong>{passedOrders.length}</strong><small>QC complete</small></article>
      </section>

      <div className="qc-layout">
        <section className="qc-panel qc-queue" id="ready-for-qc">
          <header>
            <div>
              <strong>Inspector queue</strong>
              <span>Prioritize ready work, failed rechecks, and evidence-blocked repairs.</span>
            </div>
            <Link href="/vehicles/shop-recon">Shop picture</Link>
          </header>
          <div>
            {jobs.length ? jobs.map(({ order: queueOrder, job: queueJob }) => {
              const statusClass = queueJob.status === "READY_FOR_QC" ? "ready" : isFailed(queueJob) ? "danger" : queueJob.status === "QC_PASSED" ? "passed" : "neutral";
              return (
                <button aria-pressed={orderId === queueOrder.id && jobId === queueJob.id} className={`qc-row ${statusClass}`} key={queueJob.id} onClick={() => chooseJob(queueOrder, queueJob)} type="button">
                  <span>
                    <strong>{queueOrder.repairOrderNumber} · {queueJob.jobNumber}</strong>
                    <small>{vehicleName(queueOrder)} · {queueOrder.customer?.displayName ?? queueOrder.inventoryUnit?.inventoryNumber ?? queueOrder.origin}</small>
                  </span>
                  <span>
                    <b>{queueJob.status.replaceAll("_", " ")}</b>
                    <small>{queueJob.dispatches[0]?.technicianUser.name ?? "Technician not recorded"}</small>
                  </span>
                  <ArrowRight />
                </button>
              );
            }) : (
              <p className="qc-empty"><CheckCircle2 /> No repair work is waiting for QC right now.</p>
            )}
          </div>
        </section>

        <aside className="qc-panel qc-selected">
          <header>
            <div>
              <strong>Selected repair</strong>
              <span>Canonical repair-order context</span>
            </div>
            {order ? <Link href={workbenchHref(order)}>Open RO</Link> : null}
          </header>
          {order && job ? (
            <div className="qc-selected-body">
              <p><Car /><span><strong>{vehicleName(order)}</strong><small>{order.vehicle.vehicleNumber} · {order.location.name}</small></span></p>
              <p><FileText /><span><strong>{order.repairOrderNumber}</strong><small>{order.serviceVisit.concernSummary || "No concern summary"}</small></span></p>
              <p><Wrench /><span><strong>{job.description}</strong><small>{job.plannedCorrection || "No planned correction"}</small></span></p>
              <p><ShieldCheck /><span><strong>{latestInspection?.disposition ?? "No QC result yet"}</strong><small>Promise: {dateTime(order.serviceVisit.promisedAt ?? order.targetAt)}</small></span></p>
            </div>
          ) : (
            <p className="qc-empty"><ShieldCheck /> Select a repair job to inspect.</p>
          )}
        </aside>
      </div>

      {order && job ? (
        <div className="qc-review-grid" id="qc-review">
          <section className="qc-panel">
            <header>
              <div>
                <strong>Technician handoff evidence</strong>
                <span>QC starts from what the technician completed and documented.</span>
              </div>
              <Link href={jobHref(job)}>Open technician workbench</Link>
            </header>
            <div className="qc-evidence-grid">
              <article>
                <span>Procedure</span>
                <strong>{job.procedureVersion ? `${job.procedureVersion.title} · v${job.procedureVersion.version}` : "No procedure attached"}</strong>
                <small>{job.procedureVersion?.qcRules.join(" · ") || "QC will block if the backend requires a procedure."}</small>
              </article>
              <article>
                <span>Completion evidence</span>
                <strong>{job.executionEvidence?.length ?? 0} item(s)</strong>
                <small>{job.executionEvidence?.join(" · ") || "Missing technician proof"}</small>
              </article>
              <article>
                <span>QC handoff notes</span>
                <strong>{job.qcHandoffNotes ? "Provided" : "Missing"}</strong>
                <small>{job.qcHandoffNotes ?? "Ask technician for what QC should verify."}</small>
              </article>
            </div>
          </section>

          <form
            className="qc-panel qc-form"
            onSubmit={(event: FormEvent) => {
              event.preventDefault();
              const heavy = job.lane === "DIAGNOSTIC_HEAVY";
              submit(`/api/repair-jobs/${job.id}/quality-inspection`, {
                templateCode: qc.templateCode,
                templateVersion: qc.templateVersion,
                checks: [
                  { category: "COMPLETION", code: "CORRECTION_COMPLETE", label: "Approved correction completed", result: qc.completionResult, evidence: list(qc.completionEvidence) },
                  { category: "SAFETY", code: "SAFETY_CONTROLS", label: "Applicable safety checks passed", result: qc.safetyResult, evidence: list(qc.completionEvidence) }
                ],
                completionEvidence: list(qc.completionEvidence),
                roadTestRequired: qc.roadTestRequired,
                roadTestOutcome: qc.roadTestRequired ? qc.roadTestOutcome : "NOT_REQUIRED",
                roadTestEvidence: list(qc.roadTestEvidence),
                peerVerificationPassed: heavy ? qc.peerVerificationPassed : false,
                peerVerifierUserId: heavy ? qc.peerVerifierUserId : null,
                reworkInstructions: qc.reworkInstructions || null,
                inspectedAt: new Date().toISOString(),
                reason: "Record attributable quality inspection and enforce release gates."
              }, "Quality inspection recorded.");
            }}
          >
            <header>
              <div>
                <strong>Record QC decision</strong>
                <span>Pass, fail back to technician, or require peer/road-test evidence.</span>
              </div>
            </header>
            <div className="qc-form-grid">
              <label><span>Completion</span><select value={qc.completionResult} onChange={(event) => setQc((value) => ({ ...value, completionResult: event.target.value }))}><option>PASS</option><option>FAIL</option><option>NOT_APPLICABLE</option></select></label>
              <label><span>Safety</span><select value={qc.safetyResult} onChange={(event) => setQc((value) => ({ ...value, safetyResult: event.target.value }))}><option>PASS</option><option>FAIL</option></select></label>
              <label><span>Evidence references</span><input value={qc.completionEvidence} onChange={(event) => setQc((value) => ({ ...value, completionEvidence: event.target.value }))} placeholder="photo:final, scan:alignment" /></label>
              <label><span>Template</span><input value={qc.templateCode} onChange={(event) => setQc((value) => ({ ...value, templateCode: event.target.value }))} /></label>
              <label><span>Version</span><input min="1" type="number" value={qc.templateVersion} onChange={(event) => setQc((value) => ({ ...value, templateVersion: Number(event.target.value) }))} /></label>
              <label className="qc-checkbox"><input checked={qc.roadTestRequired} type="checkbox" onChange={(event) => setQc((value) => ({ ...value, roadTestRequired: event.target.checked, roadTestOutcome: event.target.checked ? "PASSED" : "NOT_REQUIRED" }))} /> Road test applies</label>
              {qc.roadTestRequired ? (
                <>
                  <label><span>Road-test outcome</span><select value={qc.roadTestOutcome} onChange={(event) => setQc((value) => ({ ...value, roadTestOutcome: event.target.value }))}><option>PASSED</option><option>FAILED</option></select></label>
                  <label><span>Road-test evidence</span><input value={qc.roadTestEvidence} onChange={(event) => setQc((value) => ({ ...value, roadTestEvidence: event.target.value }))} /></label>
                </>
              ) : null}
              {job.lane === "DIAGNOSTIC_HEAVY" ? (
                <>
                  <label className="qc-checkbox"><input checked={qc.peerVerificationPassed} type="checkbox" onChange={(event) => setQc((value) => ({ ...value, peerVerificationPassed: event.target.checked }))} /> Peer verification passed</label>
                  <label><span>Peer verifier</span><select value={qc.peerVerifierUserId} onChange={(event) => setQc((value) => ({ ...value, peerVerifierUserId: event.target.value }))}>{model.users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}</select></label>
                </>
              ) : null}
              <label className="wide"><span>Rework instructions when any gate fails</span><textarea value={qc.reworkInstructions} onChange={(event) => setQc((value) => ({ ...value, reworkInstructions: event.target.value }))} placeholder="Explain exactly what must be corrected before this can pass QC." /></label>
            </div>
            <button disabled={busy || job.status !== "READY_FOR_QC"} type="submit">Record immutable QC result</button>
          </form>

          <section className="qc-panel">
            <header>
              <div>
                <strong>Inspection history</strong>
                <span>Immutable QC evidence attached to this repair job.</span>
              </div>
            </header>
            {job.qualityInspections.length ? job.qualityInspections.map((inspection) => (
              <article className="qc-history-row" key={inspection.id}>
                <strong>v{inspection.version} · {inspection.disposition}</strong>
                <span>{dateTime(inspection.inspectedAt)} · {inspection.inspectorUser.name}</span>
                <small>{inspection.failureReasonCodes.join(" · ") || "All applicable gates passed"}</small>
                {inspection.reworkInstructions ? <small>Rework: {inspection.reworkInstructions}</small> : null}
              </article>
            )) : (
              <p className="qc-empty"><ShieldCheck /> No QC inspection recorded yet.</p>
            )}
          </section>

          <section className="qc-panel qc-release">
            <header>
              <div>
                <strong>Final release authorization</strong>
                <span>Vehicle cannot leave QC until every job has a latest passing inspection.</span>
              </div>
            </header>
            <div className="qc-release-list">
              {order.repairJobs.map((item) => <p key={item.id}><span>{item.jobNumber} · {item.description}</span><strong>{item.status.replaceAll("_", " ")}</strong></p>)}
            </div>
            {order.releaseAuthorization ? (
              <p className="qc-release-authorized"><CheckCircle2 /> Authorized for {order.releaseAuthorization.destination} on {dateTime(order.releaseAuthorization.authorizedAt)}.</p>
            ) : (
              <form
                className="qc-release-form"
                onSubmit={(event: FormEvent) => {
                  event.preventDefault();
                  submit(`/api/repair-orders/${order.id}/release-authorization`, {
                    ...release,
                    releaseEvidence: list(release.releaseEvidence),
                    openExceptions: list(release.openExceptions),
                    authorizedAt: new Date().toISOString(),
                    reason: "Authorize vehicle handoff after every applicable quality gate passed."
                  }, "Vehicle release authorized.");
                }}
              >
                <label className="qc-checkbox"><input checked={release.keysVerified} type="checkbox" onChange={(event) => setRelease((value) => ({ ...value, keysVerified: event.target.checked }))} /> Keys verified</label>
                <label><span>Final-condition evidence</span><input value={release.releaseEvidence} onChange={(event) => setRelease((value) => ({ ...value, releaseEvidence: event.target.value }))} /></label>
                <label><span>Open exceptions</span><input value={release.openExceptions} onChange={(event) => setRelease((value) => ({ ...value, openExceptions: event.target.value }))} placeholder="Must be empty for release" /></label>
                <button disabled={busy || !allPassed} type="submit">Authorize governed handoff</button>
              </form>
            )}
          </section>
        </div>
      ) : null}
    </section>
  );
}
