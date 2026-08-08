"use client";

import { Activity, AlertTriangle, CalendarClock, Check, ChevronRight, ClipboardCheck, FileText, Gauge, KeyRound, LockKeyhole, Printer, ShieldAlert, UserRound, Wrench } from "lucide-react";
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
  vehicle: { id: string; make: string | null; model: string | null; vehicleNumber: string; vin: string | null; year: number | null };
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

export function RepairOrderEnterpriseWorkbench({ diagnostics, order, options, returnLabel, returnTo, showAdvisorReturn = false, showWorkspaceReturn = false }: { diagnostics?: DiagnosticsBridge; order: RepairOrderWorkbenchOrder; options: Options; returnLabel?: string; returnTo?: string; showAdvisorReturn?: boolean; showWorkspaceReturn?: boolean }) {
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [ownerUserId, setOwnerUserId] = useState(order.ownerUser.id);
  const [currentOwner, setCurrentOwner] = useState(order.ownerUser);
  const [currentVersion, setCurrentVersion] = useState(order.version);
  const plan = useMemo(() => diagnosticPlan(order.serviceVisit.concernSummary), [order.serviceVisit.concernSummary]);
  const diagnosis = order.diagnosisVersions[0] ?? null;
  const estimate = order.estimateVersions[0] ?? null;
  const authorization = estimate?.authorizations.find((item) => ["ACCEPTED", "PARTIAL"].includes(item.disposition)) ?? null;
  const intakeChecks = [
    ["Customer and vehicle", Boolean(order.customer || order.inventoryUnit) && Boolean(order.vehicle)],
    ["Concern captured", order.serviceVisit.concernSummary.trim().length >= 10],
    ["Keys and custody", order.serviceVisit.keysReceivedCount >= 0],
    ["Consent disposition", Boolean(order.serviceVisit.consentStatus)],
    ["Accountable owner", Boolean(ownerUserId)],
    ["Target and next action", Boolean(order.targetAt && order.nextAction)],
  ] as const;
  const readyCount = intakeChecks.filter((item) => item[1]).length;
  const intakeReady = readyCount === intakeChecks.length;
  const isInventoryRecon = Boolean(order.inventoryUnit);
  const capacityEvidence = Boolean(order.serviceVisit.readinessSnapshotId);
  const safetyReview = /brake|steer|airbag|fire|smoke|fuel|overheat|safety|not operable/i.test(order.serviceVisit.concernSummary);
  const planningReturn = `/vehicles/repair-workbench?repairOrderId=${encodeURIComponent(order.id)}`;
  const planningHref = `/vehicles/shop-planning?repairOrderId=${encodeURIComponent(order.id)}&returnTo=${encodeURIComponent(planningReturn)}`;
  const selectedOwner = options.users.find((user) => user.id === ownerUserId) ?? null;
  const assignmentChanged = Boolean(selectedOwner && selectedOwner.id !== currentOwner.id);
  const diagnosticCase = diagnostics && "cases" in diagnostics ? diagnostics.cases[0] ?? null : null;

  async function assignOwner() {
    if (!selectedOwner || !assignmentChanged) return;
    setBusy(true);
    setNotice("");
    try {
      const response = await fetch(`/api/repair-orders/${encodeURIComponent(order.id)}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ expectedVersion: currentVersion, idempotencyKey: crypto.randomUUID(), locationId: order.location.id, nextAction: order.nextAction, operatingState: order.operatingState, ownerUserId, reason: "Assign accountable repair-order ownership from the enterprise workbench.", stateReason: order.stateReason, targetAt: order.targetAt }) });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error ?? "Assignment could not be saved.");
      const savedVersion = Number(body.result?.version);
      setCurrentOwner(selectedOwner);
      if (Number.isInteger(savedVersion) && savedVersion > currentVersion) setCurrentVersion(savedVersion);
      setNotice(`${selectedOwner.name} is now the accountable owner / technician for ${order.repairOrderNumber}.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Assignment could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  const vehicle = [order.vehicle.year, order.vehicle.make, order.vehicle.model].filter(Boolean).join(" ") || order.vehicle.vehicleNumber;
  return <section className="rowb-shell" aria-label="Repair Order Workbench">
    <header className="rowb-header"><div>{returnTo ? <Link href={returnTo}>← {returnLabel ?? "Return to source workspace"}</Link> : showAdvisorReturn ? <BackToServiceAdvisorWorkspace /> : showWorkspaceReturn ? <BackToVehicleOperationsWorkspace /> : null}<Link href="/vehicles/repair-workbench?view=all">← All Repair Orders</Link><span>Repair Order Workbench</span><h1>{order.repairOrderNumber}</h1><div className="rowb-document-actions"><a href="#repair-order-document"><FileText />View RO</a><button onClick={() => window.print()} type="button"><Printer />Print RO</button></div></div><dl><div><dt>Vehicle</dt><dd>{vehicle}</dd></div><div><dt>Customer</dt><dd>{order.customer?.displayName ?? order.inventoryUnit?.inventoryNumber ?? "Internal work"}</dd></div><div><dt>Stage</dt><dd>{format(order.stage)}</dd></div><div><dt>Arrival</dt><dd>{date(order.serviceVisit.arrivedAt)}</dd></div><div><dt>Promise</dt><dd>{date(order.serviceVisit.promisedAt)}</dd></div><div><dt>Audit</dt><dd>Version {currentVersion}</dd></div></dl></header>
    <nav className="rowb-lifecycle" aria-label="Repair lifecycle">{["Intake", "Diagnose", "Estimate", "Approval", "Repair", "Quality Check", "Handoff"].map((label, index) => { const reached = index === 0 || index === 1 && Boolean(order.inspectionVersions.length || diagnosis) || index === 2 && Boolean(estimate) || index === 3 && Boolean(authorization) || index === 4 && Boolean(order.repairJobs.length); return <span className={reached ? "reached" : "locked"} key={label}><i>{reached ? <Check /> : <LockKeyhole />}</i>{label}</span>; })}</nav>
    {notice ? <div className="rowb-notice" role="status">{notice}</div> : null}
    <section className="rowb-print-document" id="repair-order-document" aria-label="Repair Order document">
      <header><div><small>Authoritative Repair Order</small><h2>{order.repairOrderNumber}</h2><span>RO Version {currentVersion} · {format(order.stage)}</span></div><div className="rowb-print-actions"><button onClick={() => window.print()} type="button"><Printer />Print RO</button></div></header>
      <div className="rowb-document-grid">
        <dl><div><dt>Vehicle</dt><dd>{vehicle}</dd></div><div><dt>VIN / vehicle ID</dt><dd>{order.vehicle.vin ?? order.vehicle.vehicleNumber}</dd></div><div><dt>Customer / inventory</dt><dd>{order.customer?.displayName ?? order.inventoryUnit?.inventoryNumber ?? "Internal work"}</dd></div><div><dt>Location</dt><dd>{order.location.name}</dd></div></dl>
        <dl><div><dt>Arrived</dt><dd>{date(order.serviceVisit.arrivedAt)}</dd></div><div><dt>Promise</dt><dd>{date(order.serviceVisit.promisedAt)}</dd></div><div><dt>Assigned technician / owner</dt><dd>{currentOwner.name}</dd></div><div><dt>Next action</dt><dd>{order.nextAction}</dd></div></dl>
      </div>
      <article><small>Concern reported at intake</small><p>{order.serviceVisit.concernSummary}</p></article>
      {order.serviceVisit.intakeNotes ? <article><small>Advisor / intake notes</small><p>{order.serviceVisit.intakeNotes}</p></article> : null}
      <footer><div><strong>Technician use</strong><span>{diagnosticCase ? `Use this RO as the governing record. Record tests, evidence, and findings in Diagnostic Record v${diagnosticCase.version}.` : `This RO Version ${currentVersion} is the technician's source for the vehicle and concern. Open technician diagnosis to record tests, evidence, and findings against this RO.`}</span></div><div><strong>Authorization boundary</strong><span>Diagnosis is permitted from this RO. No repair is authorized until the estimate and approval are recorded.</span></div></footer>
    </section>
    <RepairOrderDiagnosticsBridge bridge={diagnostics ?? { state: "UNAVAILABLE", repairOrderId: order.id, reason: "Diagnostics bridge was not supplied." }} />
    <div className="rowb-layout">
      <aside className="rowb-context">
        <section><h2><UserRound />Customer / Vehicle</h2><strong>{order.customer?.displayName ?? "No customer linked"}</strong><span>{vehicle}</span><small>{order.vehicle.vin ?? order.vehicle.vehicleNumber}</small></section>
        <section><h2><KeyRound />Appointment &amp; Custody</h2><dl><div><dt>Appointment</dt><dd>{order.serviceVisit.appointmentId ? "Matched" : "Walk-in"}</dd></div><div><dt>Keys</dt><dd>{order.serviceVisit.keysReceivedCount} · {order.serviceVisit.keyTag ?? "No tag"}</dd></div><div><dt>Transportation</dt><dd>{format(order.serviceVisit.transportMode)}</dd></div><div><dt>Arrived</dt><dd>{date(order.serviceVisit.arrivedAt)}</dd></div></dl></section>
        <section><h2><Gauge />Intake Completeness</h2><div className="rowb-readiness"><b>{readyCount}/{intakeChecks.length}</b><span>Required facts complete</span></div>{intakeChecks.map(([label, passed]) => <p className={passed ? "pass" : "pending"} key={label}><i>{passed ? <Check /> : "!"}</i>{label}</p>)}<div className="rowb-context-note"><strong>{isInventoryRecon ? "Inventory path" : capacityEvidence ? "Live capacity checked" : "Capacity snapshot optional"}</strong><span>{isInventoryRecon ? "Customer appointment readiness does not apply. Diagnosis determines the repair scope." : capacityEvidence ? "A live shop-capacity snapshot is linked to this intake." : "You can start diagnosis now; capacity can be reviewed before scheduling repair work."}</span></div></section>
        <section><h2><CalendarClock />Advisor Commitment</h2><dl><div><dt>Owner</dt><dd>{currentOwner.name}</dd></div><div><dt>Target</dt><dd>{date(order.targetAt)}</dd></div><div><dt>Next action</dt><dd>{order.nextAction}</dd></div></dl></section>
        <section><h2><Activity />Traceability</h2><p><i>{capacityEvidence ? <Check /> : "–"}</i>{capacityEvidence ? "Capacity snapshot linked" : isInventoryRecon ? "Inventory intake path recorded" : "Capacity snapshot not required"}</p><p><i><Check /></i>Immutable intake evidence</p><p><i><Check /></i>Exact repair-order version</p></section>
      </aside>
      <main className="rowb-main">
        <nav className="rowb-tabs"><a className="active" href="#concerns">Concerns</a><a href="#inspection">Inspection</a><a href="#diagnosis">Diagnosis</a><a href="#estimate">Estimate</a><a href="#jobs">Jobs</a><a href="#quality">QC</a><a href="#timeline">Timeline</a></nav>
        <div className="rowb-actions"><span>{order.operatingState === "ACTIVE" ? "Active work order" : format(order.operatingState)}</span><Link href={planningHref}>Review Plan</Link><Link className="primary" href={planningHref}>Start Diagnosis <ChevronRight /></Link></div>
        <section className={`rowb-concern ${safetyReview ? "safety" : ""}`} id="concerns"><header><b>1</b><div><small>Customer concern · preserved from intake</small><h2>{order.serviceVisit.concernSummary}</h2></div>{safetyReview ? <em><ShieldAlert />Safety review</em> : <em>Standard triage</em>}</header>
          <div className="rowb-plan"><header><div><h3>Diagnostic Plan</h3><span>Suggested plan · awaiting technician or shop-lead confirmation</span></div><b>{diagnosis ? `Diagnosis v${diagnosis.version}` : "Not released"}</b></header>
            <div className="rowb-plan-head"><span>Step</span><span>Objective</span><span>Owner</span><span>Evidence required</span><span>Status</span></div>
            {plan.map((item, index) => <article key={item.label}><i>{diagnosis ? <Check /> : index + 1}</i><strong>{item.label}</strong><span>{item.objective}</span><span>{diagnosis?.technicianUser.name ?? "Tech to be assigned"}</span><span>{item.evidence}</span><b>{diagnosis ? "Recorded" : "Not started"}</b></article>)}
            <footer><AlertTriangle />This plan identifies what to verify. It does not assume the cause or authorize repair work.</footer>
          </div>
        </section>
        <section className="rowb-finding" id="diagnosis"><header><h2>{diagnosis ? `Current diagnosis · version ${diagnosis.version}` : "Diagnosis"}</h2><span>{diagnosis ? `${format(diagnosis.uncertainty)} uncertainty` : "Not yet recorded"}</span></header>{diagnosis ? <dl><div><dt>Confirmed cause</dt><dd>{diagnosis.cause}</dd></div><div><dt>Recommendation</dt><dd>{diagnosis.recommendation}</dd></div><div><dt>Proposed correction</dt><dd>{diagnosis.proposedCorrection}</dd></div><div><dt>Technician</dt><dd>{diagnosis.technicianUser.name}</dd></div></dl> : <p>Release the repair order to Planning &amp; Diagnosis to record evidence, tests, cause, uncertainty, recommendation, and proposed correction.</p>}</section>
        <div className="rowb-stage-cards"><article id="inspection"><ClipboardCheck /><span>Inspection</span><strong>{order.inspectionVersions.length ? `${order.inspectionVersions.length} version(s)` : "Pending diagnosis"}</strong></article><article id="estimate"><FileText /><span>Estimate</span><strong>{estimate ? `v${estimate.version} · $${(estimate.totalCents / 100).toFixed(2)}` : "Pending diagnosis"}</strong></article><article><LockKeyhole /><span>Authorization</span><strong>{authorization?.disposition ?? "Pending estimate"}</strong></article><article id="jobs"><Wrench /><span>Repair Jobs</span><strong>{order.repairJobs.length ? `${order.repairJobs.length} job(s)` : "Pending authorization"}</strong></article><article id="quality"><ShieldAlert /><span>Quality Check</span><strong>Pending repairs</strong></article></div>
        <section className="rowb-finding" id="timeline"><header><h2>Repair-order timeline</h2><span>Exact version {currentVersion}</span></header><dl><div><dt>Opened</dt><dd>{date(order.openedAt)}</dd></div><div><dt>Current stage</dt><dd>{format(order.stage)}</dd></div><div><dt>Target</dt><dd>{date(order.targetAt)}</dd></div><div><dt>Next accountable action</dt><dd>{order.nextAction}</dd></div></dl></section>
      </main>
      <aside className="rowb-command">
        <section className="rowb-workflow-gate"><h2>Workflow Gate</h2><div className="rowb-gate"><b>{readyCount}/{intakeChecks.length}</b><span>{intakeReady ? "Ready for diagnosis" : "Complete intake facts"}</span></div>{safetyReview ? <p className="danger"><ShieldAlert />Begin with a safety inspection before operating or road-testing this vehicle.</p> : intakeReady ? <p className="success"><Check />Intake is complete. Diagnosis is the next step.</p> : <p className="danger"><AlertTriangle />Complete the highlighted intake facts before diagnosis.</p>}<Link className="rowb-gate-action" href={planningHref}>{safetyReview ? "Start Safety Diagnosis" : "Start Diagnosis"}<ChevronRight /></Link><small>{isInventoryRecon ? "No customer-readiness step is required for dealership inventory." : capacityEvidence ? "Live shop capacity is recorded." : "Scheduling capacity will be checked before repair dispatch."}</small></section>
        <section id="assignment"><h2>Assignment &amp; Capacity</h2><label><span>Accountable owner / technician</span><select aria-label="Accountable owner or technician" disabled={busy} onChange={(event) => { setOwnerUserId(event.target.value); setNotice(""); }} value={ownerUserId}>{options.users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}</select></label><button disabled={busy || !assignmentChanged} onClick={() => void assignOwner()} type="button">{busy ? "Saving Assignment…" : assignmentChanged ? `Assign to ${selectedOwner?.name}` : `Assigned to ${currentOwner.name}`}</button><p>{assignmentChanged ? `Save to make ${selectedOwner?.name} accountable for this repair order.` : `${currentOwner.name} is already assigned. Select a different person to change the assignment.`}</p><dl><div><dt>Current owner</dt><dd>{currentOwner.name}</dd></div><div><dt>Location</dt><dd>{order.location.name}</dd></div><div><dt>Parts demand</dt><dd>{order.partDemands.length}</dd></div></dl></section>
        <section><h2>What happens next</h2><ol className="rowb-next-steps"><li className="current"><b>1</b><span><strong>Diagnose the concern</strong>Record inspection evidence, scan results, tests, and the supported cause.</span></li><li><b>2</b><span><strong>Prepare estimate</strong>Create the repair scope and price from the diagnosis.</span></li><li><b>3</b><span><strong>Authorize &amp; dispatch</strong>Confirm approval, parts, technician, bay, and schedule.</span></li></ol></section>
        <section><h2>SLA / Promise Risk</h2><dl><div><dt>Promise</dt><dd>{date(order.serviceVisit.promisedAt)}</dd></div><div><dt>Target</dt><dd>{date(order.targetAt)}</dd></div><div><dt>Operating state</dt><dd>{format(order.operatingState)}</dd></div></dl></section>
        <section className="rowb-next"><h2>Do this now</h2><Wrench /><strong>{diagnosis ? "Prepare exact-version estimate" : "Start Diagnosis"}</strong><span>{diagnosis ? "Use the recorded evidence to prepare the repair scope and estimate." : "Open the guided diagnostic plan for this exact repair order and vehicle."}</span><Link href={planningHref}>{diagnosis ? "Open Estimate Planning" : "Start Diagnosis"}</Link></section>
      </aside>
    </div>
    <footer className="rowb-footer"><span><ShieldAlert />Customer authorization is required before any repair work is performed.</span><div>{returnTo ? <Link href={returnTo}>{returnLabel ?? "Source Workspace"}</Link> : null}<Link href="/vehicles/shop-recon">Shop &amp; Recon</Link><Link href="/vehicles/repair-workbench?view=all">All Repair Orders</Link><Link className="primary" href={planningHref}>{diagnosis ? "Open Estimate Planning" : "Start Diagnosis"}</Link></div></footer>
  </section>;
}
