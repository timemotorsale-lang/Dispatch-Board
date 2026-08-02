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
  ImagePlus,
  PackageCheck,
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
  comebackCases?: Array<{ id: string; status: string; reasonCategory?: string | null; reportedConcern?: string | null }>;
  partDemands?: Array<{
    id: string;
    quantityRequired: number;
    quantityReserved: number;
    status: string;
    part: { partNumber: string; description: string };
  }>;
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
const code = (value: string) => value.replace(/[^a-z0-9]+/gi, "_").replace(/^_+|_+$/g, "").toUpperCase().slice(0, 80) || "QC_CHECK";
const hasOpenLabor = (job: Job) => job.laborClocks.some((clock) => clock.state === "RUNNING" || clock.state === "PAUSED");
const hasPartsBlock = (job: Job) => (job.partDemands ?? []).some((demand) => demand.quantityReserved < demand.quantityRequired || ["OPEN", "PARTIALLY_RESERVED", "REQUESTED"].includes(demand.status));
const hasPartsActivity = (job: Job) => Boolean(job.partDemands?.length);
const needsRoadTest = (job: Job, order: Order) => /brake|noise|steer|suspension|drive|vibration|alignment|engine|transmission/i.test(`${job.description} ${job.plannedCorrection} ${order.serviceVisit.concernSummary}`);
const needsPeer = (job: Job) => job.lane === "DIAGNOSTIC_HEAVY" || /airbag|brake|steer|safety|engine|transmission|electrical/i.test(`${job.description} ${job.plannedCorrection}`);
const isSafetyCritical = (job: Job, order: Order) => /airbag|srs|brake|steer|suspension|wheel|tire|seatbelt|safety|engine|transmission|abs/i.test(`${job.description} ${job.plannedCorrection} ${order.serviceVisit.concernSummary}`);

function generatedChecklist(order: Order, job: Job) {
  const text = `${job.description} ${job.plannedCorrection} ${order.serviceVisit.concernSummary}`;
  const base = [
    { label: "Original concern resolved", detail: order.serviceVisit.concernSummary || "Verify the customer concern no longer reproduces." },
    { label: "Approved correction completed", detail: job.plannedCorrection || "Confirm completed work matches the authorized repair." },
    { label: "Technician evidence reviewed", detail: job.executionEvidence?.join(", ") || "Completion proof is missing." },
    { label: "Safety-impact check passed", detail: "No visible, functional, custody, or safety condition blocks release." }
  ];
  if (/brake/i.test(text)) base.push({ label: "Brake road test and wheel torque verified", detail: "Confirm pedal feel, noise resolution, no warning lights, and wheel torque evidence." });
  if (/steer|suspension|alignment|vibration/i.test(text)) base.push({ label: "Steering and suspension behavior verified", detail: "Confirm centered steering, no abnormal noise, and stable road-test behavior." });
  if (/electrical|battery|charging|scan|warning|abs|airbag/i.test(text)) base.push({ label: "Electrical/scan evidence verified", detail: "Confirm warning-light state, scan/measurement evidence, and secured wiring/connectors." });
  if ((job.partDemands ?? []).length) {
    base.push({ label: "Parts installed or accounted for", detail: `${job.partDemands?.length ?? 0} part demand record(s) tied to this repair job.` });
    base.push({ label: "Unused parts/core returns accounted for", detail: "Confirm any unused, wrong, warranty, or core part has a return, bin, quarantine, or credit-recovery disposition in Parts." });
  }
  if (needsRoadTest(job, order)) base.push({ label: "Road test outcome captured", detail: "A driving concern or safety-impact repair requires road-test evidence." });
  if (needsPeer(job)) base.push({ label: "Independent/peer review considered", detail: "Safety-critical or heavy diagnostic work should not rely on one set of eyes." });
  return base;
}

function gateRows(order: Order, job: Job) {
  return [
    { label: "Technician completion evidence", state: job.executionEvidence?.length ? "ready" : "blocked", detail: job.executionEvidence?.length ? `${job.executionEvidence.length} evidence item(s)` : "Missing completion proof" },
    { label: "QC handoff notes", state: job.qcHandoffNotes ? "ready" : "blocked", detail: job.qcHandoffNotes ?? "Technician must tell QC what to verify" },
    { label: "Labor clock", state: hasOpenLabor(job) ? "blocked" : "ready", detail: hasOpenLabor(job) ? "Running or paused labor blocks release" : "No open labor clock" },
    { label: "Parts readiness", state: hasPartsBlock(job) ? "warning" : "ready", detail: hasPartsBlock(job) ? "Parts demand, reservation, or issue still needs review" : "No parts blocker detected" },
    { label: "Unused parts return control", state: hasPartsActivity(job) ? "warning" : "ready", detail: hasPartsActivity(job) ? "Verify installed vs unused/return/core disposition before release" : "No repair-linked parts demand" },
    { label: "Road test", state: needsRoadTest(job, order) ? "warning" : "ready", detail: needsRoadTest(job, order) ? "Road-test evidence expected" : "Not automatically required" },
    { label: "Peer review", state: needsPeer(job) ? "warning" : "ready", detail: needsPeer(job) ? "Independent verification recommended/required for heavy work" : "Standard QC applies" }
  ];
}

function releaseLocks(order: Order) {
  const locks = order.repairJobs.flatMap((job) => [
    ...(job.status !== "QC_PASSED" || job.qualityInspections[0]?.disposition !== "PASSED" ? [`${job.jobNumber}: latest QC pass required`] : []),
    ...(hasOpenLabor(job) ? [`${job.jobNumber}: close running/paused labor`] : []),
    ...(hasPartsBlock(job) ? [`${job.jobNumber}: resolve parts custody/readiness`] : [])
  ]);
  return order.releaseAuthorization ? [] : locks;
}

function advisorSafeStatus(order: Order, job: Job) {
  if (order.releaseAuthorization) return "Vehicle passed QC and has been authorized for handoff.";
  if (job.status === "QC_PASSED") return "This repair passed QC. We are waiting for the full repair order release gate.";
  if (isFailed(job)) return "QC found an item that must be corrected before release. The vehicle is not ready for delivery yet.";
  if (job.status === "READY_FOR_QC") return "The repair is complete and waiting for final quality verification.";
  return "The repair is not yet ready for final quality verification.";
}

function customerReadySummary(order: Order, job: Job) {
  if (order.releaseAuthorization) return `Final quality control passed for ${vehicleName(order)}. The repair order has been authorized for handoff.`;
  if (job.status === "QC_PASSED") return `${job.description} passed final quality inspection. The vehicle is waiting for remaining repair-order release checks.`;
  if (isFailed(job)) return `QC found an item needing correction on ${job.description}. We are routing it back for rework before delivery.`;
  if (job.status === "READY_FOR_QC") return `${job.description} is complete and waiting for final quality verification.`;
  return `${job.description} is still in repair workflow and is not ready for final QC yet.`;
}

function scorecardRows(jobs: Array<{ order: Order; job: Job }>) {
  const byTech = new Map<string, { failed: number; passed: number; total: number }>();
  for (const { job } of jobs) {
    const tech = job.dispatches[0]?.technicianUser.name ?? "Unassigned";
    const row = byTech.get(tech) ?? { failed: 0, passed: 0, total: 0 };
    row.total += 1;
    if (job.status === "QC_PASSED") row.passed += 1;
    if (isFailed(job)) row.failed += 1;
    byTech.set(tech, row);
  }
  return [...byTech.entries()].map(([name, row]) => ({ name, ...row }));
}

export function QualityControlWorkspace({ initial, initialRepairOrderId, returnTo }: { initial: Model; initialRepairOrderId?: string; returnTo?: string }) {
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
    reworkRoute: "TECHNICIAN",
    reworkInstructions: ""
  });
  const [release, setRelease] = useState({ keysVerified: false, releaseEvidence: "", openExceptions: "" });
  const [checkResults, setCheckResults] = useState<Record<string, "PASS" | "FAIL" | "NOT_APPLICABLE">>({});

  const jobs = useMemo(() => model.repairOrders.flatMap((order) => order.repairJobs.map((job) => ({ order, job }))), [model]);
  const readyJobs = jobs.filter(({ job }) => job.status === "READY_FOR_QC");
  const failedJobs = jobs.filter(({ job }) => isFailed(job));
  const passedOrders = model.repairOrders.filter((order) => order.repairJobs.length && order.repairJobs.every((job) => job.status === "QC_PASSED"));
  const releaseReadyOrders = model.repairOrders.filter((order) => order.repairJobs.length && order.repairJobs.every((job) => job.status === "QC_PASSED" && job.qualityInspections[0]?.disposition === "PASSED") && !order.releaseAuthorization);
  const evidenceBlocked = readyJobs.filter(({ job }) => !job.executionEvidence?.length || !job.qcHandoffNotes);
  const partsBlocked = jobs.filter(({ job }) => hasPartsBlock(job));
  const inspectedJobs = jobs.filter(({ job }) => job.qualityInspections.length);
  const firstPassRate = inspectedJobs.length ? Math.round((inspectedJobs.filter(({ job }) => job.qualityInspections.at(-1)?.disposition === "PASSED").length / inspectedJobs.length) * 100) : 0;
  const order = model.repairOrders.find((item) => item.id === orderId) ?? model.repairOrders[0];
  const job = order?.repairJobs.find((item) => item.id === jobId) ?? order?.repairJobs[0];
  const allPassed = Boolean(order?.repairJobs.length) && order.repairJobs.every((item) => item.status === "QC_PASSED" && item.qualityInspections[0]?.disposition === "PASSED");
  const latestInspection = job?.qualityInspections[0];
  const checklist = order && job ? generatedChecklist(order, job) : [];
  const gates = order && job ? gateRows(order, job) : [];
  const locks = order ? releaseLocks(order) : [];
  const technicianScorecard = scorecardRows(jobs);
  const safetyEscalation = Boolean(order && job && isSafetyCritical(job, order));
  const comebackCount = job?.comebackCases?.filter((item) => item.status !== "CLOSED").length ?? 0;

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

  function chooseJob(nextOrder: Order, nextJob: Job) {
    setOrderId(nextOrder.id);
    setJobId(nextJob.id);
  }

  function resultFor(label: string) {
    return checkResults[label] ?? "PASS";
  }

  return (
    <section className="qc-workspace-home">
      <header className="qc-hero">
        <div>
          {returnTo ? <Link href={returnTo}>← Return to inventory lifecycle</Link> : null}
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
        <article><PackageCheck /><span>Parts Blocks</span><strong>{partsBlocked.length}</strong><small>Custody/readiness</small></article>
        <article><CheckCircle2 /><span>Release Ready</span><strong>{releaseReadyOrders.length}</strong><small>All jobs passed</small></article>
        <article><Gauge /><span>First Pass</span><strong>{firstPassRate}%</strong><small>{passedOrders.length} passed order(s)</small></article>
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
              <div className="qc-empty-state">
                <CheckCircle2 />
                <strong>No vehicles ready for QC right now.</strong>
                <span>{evidenceBlocked.length} evidence-blocked · {partsBlocked.length} parts-blocked · {failedJobs.length} recheck item(s)</span>
                <Link href="/vehicles/shop-recon">Review shop flow</Link>
              </div>
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
              <p><BadgeCheck /><span><strong>Advisor-safe status</strong><small>{advisorSafeStatus(order, job)}</small></span></p>
              <p><AlertTriangle /><span><strong>{safetyEscalation ? "Safety escalation applies" : "Standard QC"}</strong><small>{safetyEscalation ? "Peer/road-test attention is expected before release." : "No automatic safety escalation detected."}</small></span></p>
            </div>
          ) : (
            <p className="qc-empty"><ShieldCheck /> Select a repair job to inspect.</p>
          )}
        </aside>
      </div>

      {order && job ? (
        <div className="qc-review-grid" id="qc-review">
          <section className="qc-panel qc-gates">
            <header>
              <div>
                <strong>Enterprise release gates</strong>
                <span>Error-proof checks before QC pass or vehicle release.</span>
              </div>
            </header>
            <div>
              {gates.map((gate) => (
                <p className={gate.state} key={gate.label}>
                  <span>{gate.label}</span>
                  <strong>{gate.state === "ready" ? "Ready" : gate.state === "warning" ? "Review" : "Blocked"}</strong>
                  <small>{gate.detail}</small>
                </p>
              ))}
            </div>
          </section>

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

          <section className="qc-panel qc-checklist">
            <header>
              <div>
                <strong>Generated QC checklist</strong>
                <span>Context-aware checklist from concern, correction, procedure, parts, and repair lane.</span>
              </div>
            </header>
            <div>
              {checklist.map((item, index) => (
                <p key={`${item.label}-${index}`}>
                  <CheckCircle2 />
                  <span><strong>{item.label}</strong><small>{item.detail}</small></span>
                  <select aria-label={`${item.label} result`} value={resultFor(item.label)} onChange={(event) => setCheckResults((value) => ({ ...value, [item.label]: event.target.value as "PASS" | "FAIL" | "NOT_APPLICABLE" }))}>
                    <option>PASS</option>
                    <option>FAIL</option>
                    <option>NOT_APPLICABLE</option>
                  </select>
                </p>
              ))}
            </div>
          </section>

          <section className="qc-panel qc-summary-panel">
            <header>
              <div>
                <strong>Customer-ready completion summary</strong>
                <span>Advisor-safe language after QC state changes.</span>
              </div>
            </header>
            <p>{customerReadySummary(order, job)}</p>
          </section>

          <section className="qc-panel qc-upload-panel">
            <header>
              <div>
                <strong>QC photo / evidence staging</strong>
                <span>Attach references now; direct upload storage can plug into the same canonical evidence trail later.</span>
              </div>
            </header>
            <p><ImagePlus /> Use the evidence field below for photo, video, scan, torque, road-test, or measurement references. These references become immutable QC evidence when the inspection is recorded.</p>
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
                  { category: "SAFETY", code: "SAFETY_CONTROLS", label: "Applicable safety checks passed", result: qc.safetyResult, evidence: list(qc.completionEvidence) },
                  ...checklist.map((item) => ({ category: isSafetyCritical(job, order) && /safety|brake|steer|suspension|road test|wheel/i.test(item.label) ? "SAFETY" : "OTHER", code: code(item.label), label: item.label, result: resultFor(item.label), evidence: list(qc.completionEvidence) }))
                ],
                completionEvidence: list(qc.completionEvidence),
                roadTestRequired: qc.roadTestRequired,
                roadTestOutcome: qc.roadTestRequired ? qc.roadTestOutcome : "NOT_REQUIRED",
                roadTestEvidence: list(qc.roadTestEvidence),
                peerVerificationPassed: heavy || safetyEscalation ? qc.peerVerificationPassed : false,
                peerVerifierUserId: heavy || safetyEscalation ? qc.peerVerifierUserId : null,
                reworkInstructions: qc.reworkInstructions ? `Route ${qc.reworkRoute}: ${qc.reworkInstructions}` : null,
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
              <label><span>Failed-QC route</span><select value={qc.reworkRoute} onChange={(event) => setQc((value) => ({ ...value, reworkRoute: event.target.value }))}>{["TECHNICIAN", "PARTS", "ADVISOR", "MANAGER", "HOLD"].map((route) => <option key={route}>{route}</option>)}</select></label>
              <label className="qc-checkbox"><input checked={qc.roadTestRequired} type="checkbox" onChange={(event) => setQc((value) => ({ ...value, roadTestRequired: event.target.checked, roadTestOutcome: event.target.checked ? "PASSED" : "NOT_REQUIRED" }))} /> Road test applies</label>
              {qc.roadTestRequired ? (
                <>
                  <label><span>Road-test outcome</span><select value={qc.roadTestOutcome} onChange={(event) => setQc((value) => ({ ...value, roadTestOutcome: event.target.value }))}><option>PASSED</option><option>FAILED</option></select></label>
                  <label><span>Road-test evidence</span><input value={qc.roadTestEvidence} onChange={(event) => setQc((value) => ({ ...value, roadTestEvidence: event.target.value }))} /></label>
                </>
              ) : null}
              {job.lane === "DIAGNOSTIC_HEAVY" || safetyEscalation ? (
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

          <section className="qc-panel qc-comeback-panel">
            <header>
              <div>
                <strong>Comeback feedback loop</strong>
                <span>Links QC back to post-release repeat concerns without punitive automation.</span>
              </div>
              <Link href="/vehicles/comebacks">Open comebacks</Link>
            </header>
            {comebackCount ? (
              job.comebackCases?.filter((item) => item.status !== "CLOSED").map((item) => (
                <p key={item.id}><AlertTriangle /> <span><strong>{item.status}</strong><small>{item.reportedConcern ?? item.reasonCategory ?? "Open comeback review"}</small></span></p>
              ))
            ) : (
              <p><CheckCircle2 /> <span><strong>No open comeback linked</strong><small>QC history remains available if a future comeback is opened.</small></span></p>
            )}
          </section>

          <section className="qc-panel qc-scorecard">
            <header>
              <div>
                <strong>QC operating scorecard</strong>
                <span>Pattern visibility for coaching and process improvement, not automatic discipline.</span>
              </div>
            </header>
            <div>
              {technicianScorecard.map((row) => (
                <p key={row.name}><span>{row.name}</span><strong>{row.passed}/{row.total} passed</strong><small>{row.failed} rework item(s)</small></p>
              ))}
            </div>
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
            {locks.length ? (
              <div className="qc-lock-list">
                {locks.map((lock) => <p key={lock}><AlertTriangle /> {lock}</p>)}
              </div>
            ) : null}
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
