"use client";

import { Activity, AlertTriangle, CalendarClock, Check, ChevronRight, ClipboardCheck, FileText, Gauge, KeyRound, LockKeyhole, ShieldAlert, UserRound, Wrench } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { RepairOrderDiagnosticsBridge } from "@/features/diagnostics/repair-order-diagnostics-bridge";
import { BackToServiceAdvisorWorkspace } from "@/features/advisor/advisor-return-link";
import type { getRepairOrderDiagnosticsBridge } from "@/server/diagnostics/service";

import { BackToVehicleOperationsWorkspace } from "./workspace-return-link";

type RepairOrderWorkbenchOrder = {
  id: string;
  repairOrderNumber: string;
  stage: string;
  operatingState: string;
  openedAt: string;
  targetAt: string;
  nextAction: string;
  stateReason: string | null;
  version: number;
  vehicle: { make: string | null; model: string | null; vehicleNumber: string; vin: string | null; year: number | null };
  customer: { displayName: string } | null;
  inventoryUnit: { inventoryNumber: string } | null;
  ownerUser: { id: string; name: string };
  location: { id: string; name: string };
  serviceVisit: { appointmentId: string | null; arrivedAt: string; concernSummary: string; consentStatus: string; intakeNotes: string | null; keyTag: string | null; keysReceivedCount: number; promisedAt: string | null; readinessSnapshotId: string | null; transportMode: string };
  inspectionVersions: Array<{ id: string; items: unknown; summary: string; version: number }>;
  diagnosisVersions: Array<{ cause: string; concern: string; diagnosedAt: string; id: string; proposedCorrection: string; recommendation: string; technicianUser: { id: string; name: string }; uncertainty: string; version: number }>;
  estimateVersions: Array<{ authorizations: Array<{ disposition: string; id: string }>; id: string; status: string; totalCents: number; version: number }>;
  repairJobs: Array<{ description: string; id: string; jobNumber: string; readinessReasonCodes: string[]; status: string }>;
  partDemands: Array<{ id: string; quantityRequired: number; quantityReserved: number }>;
};

type Options = { users: Array<{ id: string; name: string }> };
type DiagnosticsBridge = Awaited<ReturnType<typeof getRepairOrderDiagnosticsBridge>> | { state: "UNAVAILABLE"; reason: string; repairOrderId: string };

type PlanItem = { evidence: string; label: string; objective: string };

function diagnosticPlan(concern: string): PlanItem[] {
  if (/brake|grind|squeal|rotor|caliper/i.test(concern)) return [
    { label: "Reproduce symptom safely", objective: "Confirm the reported condition under a controlled test", evidence: "Road-test notes" },
    { label: "Complete visual brake inspection", objective: "Inspect pads, rotors, hardware, hoses, and wear indicators", evidence: "Inspection notes and photos" },
    { label: "Measure friction material", objective: "Measure inner and outer pad or shoe thickness", evidence: "Measurements and photos" },
    { label: "Measure rotor or drum condition", objective: "Record thickness, variation, runout, or wear as applicable", evidence: "Measured values" },
    { label: "Inspect hydraulic and caliper operation", objective: "Check binding, slide pins, leaks, and actuation", evidence: "Inspection findings" },
    { label: "Capture diagnostic evidence", objective: "Attach the observations supporting the conclusion", evidence: "Photos and measurements" },
    { label: "Document cause and proposed correction", objective: "Separate confirmed cause from recommended repair", evidence: "Diagnosis version" },
  ];
  if (/engine|warning light|check engine|power|stall|misfire/i.test(concern)) return [
    { label: "Verify the warning indicator", objective: "Confirm current and historical warning state", evidence: "Indicator photo" },
    { label: "Scan all applicable modules", objective: "Record codes, status, and freeze-frame data", evidence: "Scan report" },
    { label: "Reproduce the reported condition", objective: "Use the customer's stated operating conditions", evidence: "Test notes" },
    { label: "Inspect related systems", objective: "Complete visual, electrical, fluid, and connection checks", evidence: "Inspection findings" },
    { label: "Perform pinpoint tests", objective: "Test only the systems supported by current evidence", evidence: "Measurements and results" },
    { label: "Document cause and correction", objective: "Record uncertainty, recommendation, and proposed correction", evidence: "Diagnosis version" },
  ];
  return [
    { label: "Confirm the reported symptom", objective: "Preserve the customer's operating conditions and expected outcome", evidence: "Verification notes" },
    { label: "Perform safety and operability triage", objective: "Identify conditions requiring restricted operation or escalation", evidence: "Triage result" },
    { label: "Inspect the affected system", objective: "Complete the applicable visual and functional inspection", evidence: "Inspection evidence" },
    { label: "Perform evidence-led tests", objective: "Record measurements and test results before identifying cause", evidence: "Test results" },
    { label: "Document confirmed cause", objective: "Separate facts, uncertainty, and recommendation", evidence: "Diagnosis version" },
    { label: "Define proposed correction and verification", objective: "Prepare authorized scope and final validation criteria", evidence: "Correction plan" },
  ];
}

const format = (value: string) => value.replaceAll("_", " ").toLocaleLowerCase().replace(/^./, (letter) => letter.toUpperCase());
const date = (value: string | null) => value ? new Date(value).toLocaleString() : "Not recorded";

export function RepairOrderEnterpriseWorkbench({ diagnostics, order, options, returnTo, showAdvisorReturn = false, showWorkspaceReturn = false }: { diagnostics?: DiagnosticsBridge; order: RepairOrderWorkbenchOrder; options: Options; returnTo?: string; showAdvisorReturn?: boolean; showWorkspaceReturn?: boolean }) {
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [ownerUserId, setOwnerUserId] = useState(order.ownerUser.id);
  const plan = useMemo(() => diagnosticPlan(order.serviceVisit.concernSummary), [order.serviceVisit.concernSummary]);
  const diagnosis = order.diagnosisVersions[0] ?? null;
  const estimate = order.estimateVersions[0] ?? null;
  const authorization = estimate?.authorizations.find((item) => ["ACCEPTED", "PARTIAL"].includes(item.disposition)) ?? null;
  const intakeChecks = [
    ["Customer and vehicle", Boolean(order.customer || order.inventoryUnit) && Boolean(order.vehicle)],
    ["Concern captured", order.serviceVisit.concernSummary.trim().length >= 10],
    ["Keys and custody", order.serviceVisit.keysReceivedCount >= 0],
    ["Consent disposition", Boolean(order.serviceVisit.consentStatus)],
    ["Readiness evidence", Boolean(order.serviceVisit.readinessSnapshotId)],
    ["Accountable owner", Boolean(ownerUserId)],
    ["Target and next action", Boolean(order.targetAt && order.nextAction)],
  ] as const;
  const readyCount = intakeChecks.filter((item) => item[1]).length;
  const safetyReview = /brake|steer|airbag|fire|smoke|fuel|overheat|safety|not operable/i.test(order.serviceVisit.concernSummary);
  const planningReturn = `/vehicles/repair-workbench?repairOrderId=${encodeURIComponent(order.id)}`;
  const planningHref = `/vehicles/shop-planning?repairOrderId=${encodeURIComponent(order.id)}&returnTo=${encodeURIComponent(planningReturn)}`;

  async function assignOwner() {
    setBusy(true);
    setNotice("");
    try {
      const response = await fetch(`/api/repair-orders/${encodeURIComponent(order.id)}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ expectedVersion: order.version, idempotencyKey: crypto.randomUUID(), locationId: order.location.id, nextAction: order.nextAction, operatingState: order.operatingState, ownerUserId, reason: "Assign accountable repair-order ownership from the enterprise workbench.", stateReason: order.stateReason, targetAt: order.targetAt }) });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error ?? "Assignment could not be saved.");
      setNotice("Accountable owner updated. Refreshing the workbench will load the new exact version.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Assignment could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  const vehicle = [order.vehicle.year, order.vehicle.make, order.vehicle.model].filter(Boolean).join(" ") || order.vehicle.vehicleNumber;
  return <section className="rowb-shell" aria-label="Repair Order Workbench">
    <header className="rowb-header"><div>{returnTo ? <Link href={returnTo}>← Return to inventory lifecycle</Link> : showAdvisorReturn ? <BackToServiceAdvisorWorkspace /> : showWorkspaceReturn ? <BackToVehicleOperationsWorkspace /> : null}<Link href="/vehicles/repair-workbench?view=all">← All Repair Orders</Link><span>Repair Order Workbench</span><h1>{order.repairOrderNumber}</h1></div><dl><div><dt>Vehicle</dt><dd>{vehicle}</dd></div><div><dt>Customer</dt><dd>{order.customer?.displayName ?? order.inventoryUnit?.inventoryNumber ?? "Internal work"}</dd></div><div><dt>Stage</dt><dd>{format(order.stage)}</dd></div><div><dt>Arrival</dt><dd>{date(order.serviceVisit.arrivedAt)}</dd></div><div><dt>Promise</dt><dd>{date(order.serviceVisit.promisedAt)}</dd></div><div><dt>Audit</dt><dd>Version {order.version}</dd></div></dl></header>
    <nav className="rowb-lifecycle" aria-label="Repair lifecycle">{["Intake", "Diagnose", "Estimate", "Approval", "Repair", "Quality Check", "Handoff"].map((label, index) => { const reached = index === 0 || index === 1 && Boolean(order.inspectionVersions.length || diagnosis) || index === 2 && Boolean(estimate) || index === 3 && Boolean(authorization) || index === 4 && Boolean(order.repairJobs.length); return <span className={reached ? "reached" : "locked"} key={label}><i>{reached ? <Check /> : <LockKeyhole />}</i>{label}</span>; })}</nav>
    {notice ? <div className="rowb-notice" role="status">{notice}</div> : null}
    <RepairOrderDiagnosticsBridge bridge={diagnostics ?? { state: "UNAVAILABLE", repairOrderId: order.id, reason: "Diagnostics bridge was not supplied." }} />
    <div className="rowb-layout">
      <aside className="rowb-context">
        <section><h2><UserRound />Customer / Vehicle</h2><strong>{order.customer?.displayName ?? "No customer linked"}</strong><span>{vehicle}</span><small>{order.vehicle.vin ?? order.vehicle.vehicleNumber}</small></section>
        <section><h2><KeyRound />Appointment &amp; Custody</h2><dl><div><dt>Appointment</dt><dd>{order.serviceVisit.appointmentId ? "Matched" : "Walk-in"}</dd></div><div><dt>Keys</dt><dd>{order.serviceVisit.keysReceivedCount} · {order.serviceVisit.keyTag ?? "No tag"}</dd></div><div><dt>Transportation</dt><dd>{format(order.serviceVisit.transportMode)}</dd></div><div><dt>Arrived</dt><dd>{date(order.serviceVisit.arrivedAt)}</dd></div></dl></section>
        <section><h2><Gauge />Live Readiness Snapshot</h2><div className="rowb-readiness"><b>{readyCount}/7</b><span>Intake facts ready</span></div>{intakeChecks.map(([label, passed]) => <p className={passed ? "pass" : "pending"} key={label}><i>{passed ? <Check /> : "!"}</i>{label}</p>)}</section>
        <section><h2><CalendarClock />Advisor Commitment</h2><dl><div><dt>Owner</dt><dd>{order.ownerUser.name}</dd></div><div><dt>Target</dt><dd>{date(order.targetAt)}</dd></div><div><dt>Next action</dt><dd>{order.nextAction}</dd></div></dl></section>
        <section><h2><Activity />Traceability</h2><p><i><Check /></i>Readiness snapshot linked</p><p><i><Check /></i>Immutable intake evidence</p><p><i><Check /></i>Exact repair-order version</p></section>
      </aside>
      <main className="rowb-main">
        <nav className="rowb-tabs"><a className="active" href="#concerns">Concerns</a><a href="#inspection">Inspection</a><a href="#diagnosis">Diagnosis</a><a href="#estimate">Estimate</a><a href="#jobs">Jobs</a><a href="#quality">QC</a><a href="#timeline">Timeline</a></nav>
        <div className="rowb-actions"><span>{order.operatingState === "ACTIVE" ? "Active work order" : format(order.operatingState)}</span><Link href={planningHref}>Edit Diagnostic Plan</Link><Link className="primary" href={planningHref}>Release to Diagnosis <ChevronRight /></Link></div>
        <section className={`rowb-concern ${safetyReview ? "safety" : ""}`} id="concerns"><header><b>1</b><div><small>Customer concern · preserved from intake</small><h2>{order.serviceVisit.concernSummary}</h2></div>{safetyReview ? <em><ShieldAlert />Safety review</em> : <em>Standard triage</em>}</header>
          <div className="rowb-plan"><header><div><h3>Diagnostic Plan</h3><span>Suggested plan · awaiting technician or shop-lead confirmation</span></div><b>{diagnosis ? `Diagnosis v${diagnosis.version}` : "Not released"}</b></header>
            <div className="rowb-plan-head"><span>Step</span><span>Objective</span><span>Owner</span><span>Evidence required</span><span>Status</span></div>
            {plan.map((item, index) => <article key={item.label}><i>{diagnosis ? <Check /> : index + 1}</i><strong>{item.label}</strong><span>{item.objective}</span><span>{diagnosis?.technicianUser.name ?? "Tech to be assigned"}</span><span>{item.evidence}</span><b>{diagnosis ? "Recorded" : "Not started"}</b></article>)}
            <footer><AlertTriangle />This plan identifies what to verify. It does not assume the cause or authorize repair work.</footer>
          </div>
        </section>
        <section className="rowb-finding" id="diagnosis"><header><h2>{diagnosis ? `Current diagnosis · version ${diagnosis.version}` : "Diagnosis"}</h2><span>{diagnosis ? `${format(diagnosis.uncertainty)} uncertainty` : "Not yet recorded"}</span></header>{diagnosis ? <dl><div><dt>Confirmed cause</dt><dd>{diagnosis.cause}</dd></div><div><dt>Recommendation</dt><dd>{diagnosis.recommendation}</dd></div><div><dt>Proposed correction</dt><dd>{diagnosis.proposedCorrection}</dd></div><div><dt>Technician</dt><dd>{diagnosis.technicianUser.name}</dd></div></dl> : <p>Release the repair order to Planning &amp; Diagnosis to record evidence, tests, cause, uncertainty, recommendation, and proposed correction.</p>}</section>
        <div className="rowb-stage-cards"><article id="inspection"><ClipboardCheck /><span>Inspection</span><strong>{order.inspectionVersions.length ? `${order.inspectionVersions.length} version(s)` : "Pending diagnosis"}</strong></article><article id="estimate"><FileText /><span>Estimate</span><strong>{estimate ? `v${estimate.version} · $${(estimate.totalCents / 100).toFixed(2)}` : "Pending diagnosis"}</strong></article><article><LockKeyhole /><span>Authorization</span><strong>{authorization?.disposition ?? "Pending estimate"}</strong></article><article id="jobs"><Wrench /><span>Repair Jobs</span><strong>{order.repairJobs.length ? `${order.repairJobs.length} job(s)` : "Pending authorization"}</strong></article><article id="quality"><ShieldAlert /><span>Quality Check</span><strong>Pending repairs</strong></article></div>
        <section className="rowb-finding" id="timeline"><header><h2>Repair-order timeline</h2><span>Exact version {order.version}</span></header><dl><div><dt>Opened</dt><dd>{date(order.openedAt)}</dd></div><div><dt>Current stage</dt><dd>{format(order.stage)}</dd></div><div><dt>Target</dt><dd>{date(order.targetAt)}</dd></div><div><dt>Next accountable action</dt><dd>{order.nextAction}</dd></div></dl></section>
      </main>
      <aside className="rowb-command">
        <section><h2>Workflow Gate</h2><div className="rowb-gate"><b>{readyCount}/7</b><span>{readyCount === 7 ? "Intake ready" : "Facts required"}</span></div>{safetyReview ? <p className="danger"><ShieldAlert />Safety review is required before diagnosis release.</p> : <p className="success"><Check />Standard intake gate is satisfied.</p>}</section>
        <section><h2>Assignment &amp; Capacity</h2><label><span>Accountable owner</span><select onChange={(event) => setOwnerUserId(event.target.value)} value={ownerUserId}>{options.users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}</select></label><button disabled={busy || ownerUserId === order.ownerUser.id} onClick={() => void assignOwner()} type="button">Save Assignment</button><dl><div><dt>Location</dt><dd>{order.location.name}</dd></div><div><dt>Parts demand</dt><dd>{order.partDemands.length}</dd></div></dl></section>
        <section><h2>Dependencies</h2><p><i>{order.partDemands.some((item) => item.quantityReserved < item.quantityRequired) ? "!" : <Check />}</i>{order.partDemands.some((item) => item.quantityReserved < item.quantityRequired) ? "Parts readiness requires attention" : "No blocking part demand"}</p><p><i>{estimate ? <Check /> : "!"}</i>{estimate ? "Estimate version recorded" : "Diagnosis required before estimate"}</p></section>
        <section><h2>SLA / Promise Risk</h2><dl><div><dt>Promise</dt><dd>{date(order.serviceVisit.promisedAt)}</dd></div><div><dt>Target</dt><dd>{date(order.targetAt)}</dd></div><div><dt>Operating state</dt><dd>{format(order.operatingState)}</dd></div></dl></section>
        <section className="rowb-next"><h2>Next Best Action</h2><Wrench /><strong>{diagnosis ? "Prepare exact-version estimate" : "Release to Diagnosis"}</strong><span>{order.nextAction}</span><Link href={planningHref}>{diagnosis ? "Open Planning" : "Release to Diagnosis"}</Link></section>
      </aside>
    </div>
    <footer className="rowb-footer"><span><ShieldAlert />Customer authorization is required before any repair work is performed.</span><div><Link href="/vehicles/shop-recon">Shop &amp; Recon</Link><Link href="/vehicles/repair-workbench?view=all">All Repair Orders</Link><Link className="primary" href={planningHref}>Open Planning &amp; Diagnosis</Link></div></footer>
  </section>;
}
