"use client";

import { ArrowLeft, BadgeCheck, CarFront, Check, ChevronRight, ClipboardCheck, FileCheck2, Gauge, LockKeyhole, PackageCheck, ShieldCheck, Stethoscope, Wrench } from "lucide-react";
import Link from "next/link";
import { FormEvent, ReactNode, useState } from "react";
import styles from "./shop-planning-workspace.module.css";

type Line = { key: string; type: "LABOR" | "PART" | "FEE"; description: string; quantity: number; unitPriceCents: number; taxable: boolean; workTypeCode: string; laborGuideMinutes: number; plannedCorrection: string };
type Order = {
  id: string; repairOrderNumber: string; version: number; stage: string; updatedAt: string;
  vehicle: { id: string; vehicleNumber: string; vin: string | null; year: number | null; make: string | null; model: string | null };
  customer: { displayName: string } | null;
  inventoryUnit: { inventoryNumber: string } | null;
  serviceVisit: { arrivedAt: string; concernSummary: string };
  inspectionVersions: Array<{ id: string; version: number; summary: string; completedAt: string }>;
  diagnosisVersions: Array<{ id: string; version: number; cause: string; proposedCorrection: string; uncertainty: string; technicianUser: { name: string } }>;
  estimateVersions: Array<{ id: string; version: number; status: string; totalCents: number; expiresAt: string; lineItems: Line[]; authorizations: Array<{ id: string; disposition: string; authorizedLineKeys: string[]; authorizedAmountCents: number; decisionActorName: string }> }>;
  repairJobs: Array<{ id: string; jobNumber: string; description: string; status: string; readinessReasonCodes: string[]; partDemands: Array<{ part: { partNumber: string }; quantityRequired: number; quantityReserved: number }> }>;
  partDemands: Array<{ id: string; repairJobId: string | null; quantityRequired: number; quantityReserved: number; part: { partNumber: string; description: string } }>;
};
type Model = { repairOrders: Order[]; users: Array<{ id: string; name: string }> };

const local = (value: string) => { const date = new Date(value); return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16); };
const money = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value / 100);
const format = (value: string) => value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
const vehicleLabel = (order: Order) => [order.vehicle.year, order.vehicle.make, order.vehicle.model].filter(Boolean).join(" ") || order.vehicle.vehicleNumber;

function activeStep(order?: Order) {
  if (!order || !order.inspectionVersions.length) return 0;
  if (!order.diagnosisVersions.length) return 1;
  if (!order.estimateVersions.length) return 2;
  const accepted = order.estimateVersions.some((estimate) => estimate.authorizations.some((authorization) => ["ACCEPTED", "PARTIAL"].includes(authorization.disposition)));
  if (!accepted) return 3;
  return 4;
}

const steps = [
  { label: "Inspection evidence", icon: FileCheck2 },
  { label: "Diagnosis", icon: Stethoscope },
  { label: "Estimate", icon: Gauge },
  { label: "Authorization", icon: ShieldCheck },
  { label: "Repair job", icon: Wrench },
] as const;

export function ShopPlanningWorkspace({ initial, returnTo }: { initial: Model; returnTo?: string }) {
  const [model, setModel] = useState(initial);
  const [selectedId, setSelectedId] = useState(initial.repairOrders[0]?.id ?? "");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const first = initial.repairOrders[0];
  const defaultTime = first?.updatedAt ?? first?.serviceVisit.arrivedAt ?? "";
  const [inspection, setInspection] = useState({ templateCode: "GENERAL_DVI", templateVersion: 1, startedAt: defaultTime ? local(defaultTime) : "", completedAt: defaultTime ? local(defaultTime) : "", summary: "", itemKey: "GENERAL_CONDITION", itemLabel: "General condition", itemResult: "PASS", measurement: "", itemNotes: "", evidence: "" });
  const [diagnosis, setDiagnosis] = useState({ concern: first?.serviceVisit.concernSummary ?? "", symptoms: "", testName: "", testResult: "", evidence: "", cause: "", uncertainty: "MEDIUM", recommendation: "", proposedCorrection: "", technicianUserId: initial.users[0]?.id ?? "", diagnosedAt: defaultTime ? local(defaultTime) : "" });
  const [estimate, setEstimate] = useState({ lineKey: "LINE-1", lineType: "LABOR", description: "", quantity: 1, unitPriceCents: 0, taxable: false, workTypeCode: "GENERAL_REPAIR", laborGuideMinutes: 60, plannedCorrection: "", taxCents: 0, discountCents: 0, taxBoundary: "Taxes are calculated by the configured financial system boundary.", presentationChannel: "IN_PERSON", presentedAt: defaultTime ? local(defaultTime) : "", expiresAt: "" });
  const [authorization, setAuthorization] = useState({ estimateVersionId: "", disposition: "ACCEPTED", channel: "IN_PERSON", authorizedLineKeys: "", decisionActorType: "CUSTOMER", decisionActorName: "", decisionActorReference: "", decidedAt: defaultTime ? local(defaultTime) : "" });
  const [job, setJob] = useState({ authorizationId: "", authorizedLineKey: "", diagnosisVersionId: "", workTypeCode: "GENERAL_REPAIR", description: "", plannedCorrection: "", laborGuideMinutes: 60, requiredSkills: "", requiredCertifications: "", bayRequirements: "", toolRequirements: "", priority: "NORMAL", dependencyJobIds: "", partsRequired: false, partDemandIds: [] as string[] });
  const selected = model.repairOrders.find((item) => item.id === selectedId) ?? model.repairOrders[0];
  const safeReturnTo = returnTo?.startsWith("/") && !returnTo.startsWith("//") ? returnTo : selected ? `/vehicles/repair-workbench?repairOrderId=${encodeURIComponent(selected.id)}` : "/vehicles/repair-workbench";
  const currentStep = activeStep(selected);
  const latestEstimate = selected?.estimateVersions[0];
  const latestDiagnosis = selected?.diagnosisVersions[0];
  const accepted = selected?.estimateVersions.flatMap((item) => item.authorizations.map((auth) => ({ ...auth, estimate: item }))).find((item) => ["ACCEPTED", "PARTIAL"].includes(item.disposition));

  async function request(url: string, init?: RequestInit) { const response = await fetch(url, init); const body = await response.json().catch(() => ({})); if (!response.ok) throw new Error(body.error ?? "Shop planning request failed."); return body; }
  async function refresh() { const next = await request("/api/shop-planning") as Model; setModel(next); }
  async function submit(action: string, value: Record<string, unknown>, reason: string) { if (!selected) return; setBusy(true); setNotice(""); try { await request(`/api/repair-orders/${selected.id}/planning`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action, ...value, idempotencyKey: crypto.randomUUID(), reason }) }); setNotice(reason); await refresh(); } catch (error) { setNotice(error instanceof Error ? error.message : "Shop planning request failed."); } finally { setBusy(false); } }
  function choose(id: string) { setSelectedId(id); const order = model.repairOrders.find((item) => item.id === id); if (order) { const time = local(order.updatedAt); setDiagnosis((value) => ({ ...value, concern: order.serviceVisit.concernSummary, diagnosedAt: time })); setInspection((value) => ({ ...value, startedAt: local(order.serviceVisit.arrivedAt), completedAt: time })); setEstimate((value) => ({ ...value, presentedAt: time })); setAuthorization((value) => ({ ...value, decidedAt: time })); } }

  return <section className={styles.workspace}>
    <header className={styles.hero}>
      <div>
        <nav aria-label="Diagnostic release breadcrumb"><Link href="/vehicles/repair-workbench">Repair Workbench</Link><ChevronRight /><span>Diagnostic Release</span></nav>
        <span className={styles.eyebrow}>Shop Operations · Governed diagnostic handoff</span>
        <h1>Diagnostic Release Command Center</h1>
        <p>Turn the intake concern into evidence-backed diagnosis, an exact-version estimate, attributable authorization, and a readiness-gated repair job.</p>
      </div>
      <div className={styles.heroActions}><Link href={safeReturnTo}><ArrowLeft />Return to workbench</Link>{selected ? <Link className={styles.primary} href={`/vehicles/360/${encodeURIComponent(selected.vehicle.id)}?returnTo=${encodeURIComponent(`/vehicles/shop-planning?repairOrderId=${selected.id}&returnTo=${encodeURIComponent(safeReturnTo)}`)}`}>Open Vehicle 360</Link> : null}</div>
      <div className={styles.truthBar}><span><BadgeCheck /><b>Authoritative repair plan</b></span><span><LockKeyhole />Immutable evidence versions</span><span>Exact-version customer authorization required</span><span>Repair work remains blocked until readiness passes.</span></div>
    </header>

    {notice ? <div aria-live="polite" className={`${styles.notice} ${/required|cannot|invalid|not enabled/i.test(notice) ? styles.danger : styles.success}`}><p>{notice}</p></div> : null}

    <section className={styles.orderBar}>
      <label><span>Active repair order</span><select value={selected?.id ?? ""} onChange={(event) => choose(event.target.value)}>{model.repairOrders.map((order) => <option key={order.id} value={order.id}>{order.repairOrderNumber} · {order.vehicle.vehicleNumber} · {format(order.stage)}</option>)}</select></label>
      {selected ? <><div className={styles.vehicleIcon}><CarFront /></div><div className={styles.orderIdentity}><span>Vehicle released for diagnosis</span><h2>{vehicleLabel(selected)}</h2><p>{selected.vehicle.vin ? `VIN ${selected.vehicle.vin}` : selected.vehicle.vehicleNumber} · {selected.repairOrderNumber} · version {selected.version}</p></div><dl><div><dt>Current gate</dt><dd>{format(selected.stage)}</dd></div><div><dt>Responsible party</dt><dd>{selected.customer?.displayName ?? selected.inventoryUnit?.inventoryNumber ?? "Internal inventory"}</dd></div><div><dt>Arrival</dt><dd>{new Date(selected.serviceVisit.arrivedAt).toLocaleString()}</dd></div></dl></> : null}
    </section>

    {selected ? <>
      <section className={styles.mission}><Stethoscope /><div><span>Diagnostic mission</span><h2>Verify the reported concern and identify the root cause</h2><p>{selected.serviceVisit.concernSummary}</p></div><aside><strong>{currentStep + 1} of {steps.length}</strong><span>governed stages</span></aside></section>

      <section className={styles.stepRail} aria-label="Diagnostic release stages">{steps.map((step, index) => { const Icon = step.icon; const state = index < currentStep ? styles.complete : index === currentStep ? styles.active : ""; return <div className={state} key={step.label}><span>{index < currentStep ? <Check /> : <Icon />}</span><small>Stage {index + 1}</small><strong>{step.label}</strong></div>; })}</section>

      <div className={styles.commandGrid}>
        <main className={styles.workflow}>
          <WorkflowStep complete={selected.inspectionVersions.length > 0} icon={<FileCheck2 />} number={1} open={currentStep === 0} subtitle="Establish the physical-condition baseline and attach supporting evidence." title="Digital vehicle inspection">
            <form onSubmit={(event: FormEvent) => { event.preventDefault(); void submit("RECORD_INSPECTION", { templateCode: inspection.templateCode, templateVersion: inspection.templateVersion, templateSnapshot: { code: inspection.templateCode, version: inspection.templateVersion }, startedAt: inspection.startedAt, completedAt: inspection.completedAt, summary: inspection.summary, items: [{ key: inspection.itemKey, label: inspection.itemLabel, result: inspection.itemResult, measurement: inspection.measurement, notes: inspection.itemNotes, evidence: inspection.evidence.split(",").map((value) => value.trim()).filter(Boolean) }] }, "Record a versioned digital vehicle inspection."); }}>
              <FormGrid><Field label="Template code"><input value={inspection.templateCode} onChange={(event) => setInspection((value) => ({ ...value, templateCode: event.target.value }))} /></Field><Field label="Inspection item"><input value={inspection.itemLabel} onChange={(event) => setInspection((value) => ({ ...value, itemLabel: event.target.value }))} /></Field><Field label="Result"><select value={inspection.itemResult} onChange={(event) => setInspection((value) => ({ ...value, itemResult: event.target.value }))}>{["PASS", "ADVISORY", "FAIL", "NOT_APPLICABLE"].map((value) => <option key={value}>{value}</option>)}</select></Field><Field label="Measurement"><input value={inspection.measurement} onChange={(event) => setInspection((value) => ({ ...value, measurement: event.target.value }))} /></Field><Field label="Notes"><input value={inspection.itemNotes} onChange={(event) => setInspection((value) => ({ ...value, itemNotes: event.target.value }))} /></Field><Field label="Evidence references"><input value={inspection.evidence} onChange={(event) => setInspection((value) => ({ ...value, evidence: event.target.value }))} /></Field><Field label="Started"><input type="datetime-local" value={inspection.startedAt} onChange={(event) => setInspection((value) => ({ ...value, startedAt: event.target.value }))} /></Field><Field label="Completed"><input type="datetime-local" value={inspection.completedAt} onChange={(event) => setInspection((value) => ({ ...value, completedAt: event.target.value }))} /></Field><Field label="Inspection summary" wide><textarea value={inspection.summary} onChange={(event) => setInspection((value) => ({ ...value, summary: event.target.value }))} /></Field></FormGrid>
              <Submit busy={busy}>Record immutable inspection version</Submit>
            </form>
          </WorkflowStep>

          <WorkflowStep complete={selected.diagnosisVersions.length > 0} icon={<Stethoscope />} number={2} open={currentStep === 1} subtitle="Connect symptoms, tests, evidence, cause, uncertainty, and the proposed correction." title="Evidence-backed diagnosis">
            <form onSubmit={(event: FormEvent) => { event.preventDefault(); void submit("RECORD_DIAGNOSIS", { ...diagnosis, symptoms: diagnosis.symptoms.split(",").map((value) => value.trim()).filter(Boolean), tests: [{ name: diagnosis.testName, result: diagnosis.testResult }], evidence: diagnosis.evidence.split(",").map((value) => value.trim()).filter(Boolean) }, "Record evidence-backed concern, cause, and proposed correction."); }}>
              <div className={styles.concern}><span>Carried forward from intake</span><p>{diagnosis.concern}</p></div><FormGrid><Field label="Symptoms"><input placeholder="Comma separated" value={diagnosis.symptoms} onChange={(event) => setDiagnosis((value) => ({ ...value, symptoms: event.target.value }))} /></Field><Field label="Diagnostic test"><input value={diagnosis.testName} onChange={(event) => setDiagnosis((value) => ({ ...value, testName: event.target.value }))} /></Field><Field label="Test result"><input value={diagnosis.testResult} onChange={(event) => setDiagnosis((value) => ({ ...value, testResult: event.target.value }))} /></Field><Field label="Evidence references"><input value={diagnosis.evidence} onChange={(event) => setDiagnosis((value) => ({ ...value, evidence: event.target.value }))} /></Field><Field label="Root cause" wide><textarea value={diagnosis.cause} onChange={(event) => setDiagnosis((value) => ({ ...value, cause: event.target.value }))} /></Field><Field label="Diagnostic uncertainty"><select value={diagnosis.uncertainty} onChange={(event) => setDiagnosis((value) => ({ ...value, uncertainty: event.target.value }))}>{["LOW", "MEDIUM", "HIGH"].map((value) => <option key={value}>{value}</option>)}</select></Field><Field label="Technician"><select value={diagnosis.technicianUserId} onChange={(event) => setDiagnosis((value) => ({ ...value, technicianUserId: event.target.value }))}>{model.users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}</select></Field><Field label="Recommendation"><textarea value={diagnosis.recommendation} onChange={(event) => setDiagnosis((value) => ({ ...value, recommendation: event.target.value }))} /></Field><Field label="Proposed correction"><textarea value={diagnosis.proposedCorrection} onChange={(event) => setDiagnosis((value) => ({ ...value, proposedCorrection: event.target.value }))} /></Field></FormGrid>
              <Submit busy={busy}>Record diagnosis version</Submit>
            </form>
          </WorkflowStep>

          <WorkflowStep complete={selected.estimateVersions.length > 0} icon={<Gauge />} number={3} open={currentStep === 2} subtitle="Create an immutable, expiring estimate from the verified diagnostic correction." title="Exact-version estimate">
            <form onSubmit={(event: FormEvent) => { event.preventDefault(); void submit("PRESENT_ESTIMATE", { lineItems: [{ key: estimate.lineKey, type: estimate.lineType, description: estimate.description, quantity: estimate.quantity, unitPriceCents: estimate.unitPriceCents, taxable: estimate.taxable, workTypeCode: estimate.workTypeCode, laborGuideMinutes: estimate.laborGuideMinutes, plannedCorrection: estimate.plannedCorrection }], taxCents: estimate.taxCents, discountCents: estimate.discountCents, taxBoundary: estimate.taxBoundary, presentationChannel: estimate.presentationChannel, presentedAt: estimate.presentedAt, expiresAt: estimate.expiresAt }, "Present an immutable estimate version from diagnostic evidence."); }}>
              <FormGrid><Field label="Line key"><input value={estimate.lineKey} onChange={(event) => setEstimate((value) => ({ ...value, lineKey: event.target.value }))} /></Field><Field label="Type"><select value={estimate.lineType} onChange={(event) => setEstimate((value) => ({ ...value, lineType: event.target.value }))}>{["LABOR", "PART", "FEE"].map((value) => <option key={value}>{value}</option>)}</select></Field><Field label="Description"><input value={estimate.description} onChange={(event) => setEstimate((value) => ({ ...value, description: event.target.value }))} /></Field><Field label="Unit price (cents)"><input min="0" type="number" value={estimate.unitPriceCents} onChange={(event) => setEstimate((value) => ({ ...value, unitPriceCents: Number(event.target.value) }))} /></Field><Field label="Labor guide minutes"><input min="0" type="number" value={estimate.laborGuideMinutes} onChange={(event) => setEstimate((value) => ({ ...value, laborGuideMinutes: Number(event.target.value) }))} /></Field><Field label="Planned correction"><input value={estimate.plannedCorrection} onChange={(event) => setEstimate((value) => ({ ...value, plannedCorrection: event.target.value }))} /></Field><Field label="Tax (cents)"><input min="0" type="number" value={estimate.taxCents} onChange={(event) => setEstimate((value) => ({ ...value, taxCents: Number(event.target.value) }))} /></Field><Field label="Discount (cents)"><input min="0" type="number" value={estimate.discountCents} onChange={(event) => setEstimate((value) => ({ ...value, discountCents: Number(event.target.value) }))} /></Field><Field label="Presented"><input type="datetime-local" value={estimate.presentedAt} onChange={(event) => setEstimate((value) => ({ ...value, presentedAt: event.target.value }))} /></Field><Field label="Expires"><input type="datetime-local" value={estimate.expiresAt} onChange={(event) => setEstimate((value) => ({ ...value, expiresAt: event.target.value }))} /></Field></FormGrid>
              <Submit busy={busy}>Present estimate version</Submit>
            </form>
          </WorkflowStep>

          <WorkflowStep complete={Boolean(accepted)} icon={<ShieldCheck />} number={4} open={currentStep === 3} subtitle="Record who decided, through which channel, and exactly which estimate lines were accepted." title="Attributable authorization">
            <form onSubmit={(event: FormEvent) => { event.preventDefault(); void submit("DECIDE_AUTHORIZATION", { ...authorization, estimateVersionId: authorization.estimateVersionId || latestEstimate?.id, authorizedLineKeys: (authorization.authorizedLineKeys || latestEstimate?.lineItems.map((line) => line.key).join(",") || "").split(",").map((value) => value.trim()).filter(Boolean) }, "Record an attributable decision on the exact estimate version."); }}>
              <FormGrid><Field label="Estimate version"><select value={authorization.estimateVersionId || latestEstimate?.id || ""} onChange={(event) => setAuthorization((value) => ({ ...value, estimateVersionId: event.target.value }))}>{selected.estimateVersions.map((item) => <option key={item.id} value={item.id}>v{item.version} · {money(item.totalCents)}</option>)}</select></Field><Field label="Decision"><select value={authorization.disposition} onChange={(event) => setAuthorization((value) => ({ ...value, disposition: event.target.value }))}>{["ACCEPTED", "PARTIAL", "DECLINED", "DEFERRED", "EXPIRED", "REVOKED"].map((value) => <option key={value}>{value}</option>)}</select></Field><Field label="Authorized line keys"><input placeholder={latestEstimate?.lineItems.map((line) => line.key).join(",")} value={authorization.authorizedLineKeys} onChange={(event) => setAuthorization((value) => ({ ...value, authorizedLineKeys: event.target.value }))} /></Field><Field label="Channel"><select value={authorization.channel} onChange={(event) => setAuthorization((value) => ({ ...value, channel: event.target.value }))}>{["IN_PERSON", "PHONE", "SMS", "EMAIL", "INTERNAL", "WARRANTY"].map((value) => <option key={value}>{value}</option>)}</select></Field><Field label="Decision actor"><input value={authorization.decisionActorName} onChange={(event) => setAuthorization((value) => ({ ...value, decisionActorName: event.target.value }))} /></Field><Field label="Decision time"><input type="datetime-local" value={authorization.decidedAt} onChange={(event) => setAuthorization((value) => ({ ...value, decidedAt: event.target.value }))} /></Field></FormGrid>
              <Submit busy={busy}>Record authorization decision</Submit>
            </form>
          </WorkflowStep>

          <WorkflowStep complete={selected.repairJobs.length > 0} icon={<Wrench />} number={5} open={currentStep === 4} subtitle="Promote only authorized work into a job with explicit skill, bay, tool, dependency, and parts readiness." title="Readiness-gated repair job">
            <form onSubmit={(event: FormEvent) => { event.preventDefault(); void submit("CREATE_JOB", { ...job, authorizationId: job.authorizationId || accepted?.id, authorizedLineKey: job.authorizedLineKey || accepted?.authorizedLineKeys[0], diagnosisVersionId: job.diagnosisVersionId || latestDiagnosis?.id, requiredSkills: job.requiredSkills.split(",").map((value) => value.trim()).filter(Boolean), requiredCertifications: job.requiredCertifications.split(",").map((value) => value.trim()).filter(Boolean), bayRequirements: job.bayRequirements.split(",").map((value) => value.trim()).filter(Boolean), toolRequirements: job.toolRequirements.split(",").map((value) => value.trim()).filter(Boolean), dependencyJobIds: job.dependencyJobIds.split(",").map((value) => value.trim()).filter(Boolean) }, "Create an authorized, readiness-gated repair job."); }}>
              <FormGrid><Field label="Authorization"><select value={job.authorizationId || accepted?.id || ""} onChange={(event) => setJob((value) => ({ ...value, authorizationId: event.target.value }))}>{selected.estimateVersions.flatMap((item) => item.authorizations).filter((item) => ["ACCEPTED", "PARTIAL"].includes(item.disposition)).map((item) => <option key={item.id} value={item.id}>{item.decisionActorName} · {item.disposition}</option>)}</select></Field><Field label="Authorized line"><select value={job.authorizedLineKey || accepted?.authorizedLineKeys[0] || ""} onChange={(event) => setJob((value) => ({ ...value, authorizedLineKey: event.target.value }))}>{accepted?.authorizedLineKeys.map((value) => <option key={value}>{value}</option>)}</select></Field><Field label="Description"><input value={job.description} onChange={(event) => setJob((value) => ({ ...value, description: event.target.value }))} /></Field><Field label="Planned correction"><input value={job.plannedCorrection} onChange={(event) => setJob((value) => ({ ...value, plannedCorrection: event.target.value }))} /></Field><Field label="Required skills"><input placeholder="Comma separated" value={job.requiredSkills} onChange={(event) => setJob((value) => ({ ...value, requiredSkills: event.target.value }))} /></Field><Field label="Certifications"><input value={job.requiredCertifications} onChange={(event) => setJob((value) => ({ ...value, requiredCertifications: event.target.value }))} /></Field><Field label="Bay requirements"><input value={job.bayRequirements} onChange={(event) => setJob((value) => ({ ...value, bayRequirements: event.target.value }))} /></Field><Field label="Tool requirements"><input value={job.toolRequirements} onChange={(event) => setJob((value) => ({ ...value, toolRequirements: event.target.value }))} /></Field><label className={styles.check}><input checked={job.partsRequired} type="checkbox" onChange={(event) => setJob((value) => ({ ...value, partsRequired: event.target.checked }))} />Parts required</label>{job.partsRequired ? <fieldset className={styles.parts}><legend>Promote existing part demand</legend>{selected.partDemands.filter((item) => !item.repairJobId).map((item) => <label key={item.id}><input checked={job.partDemandIds.includes(item.id)} type="checkbox" onChange={(event) => setJob((value) => ({ ...value, partDemandIds: event.target.checked ? [...value.partDemandIds, item.id] : value.partDemandIds.filter((id) => id !== item.id) }))} />{item.part.partNumber} · {item.quantityReserved}/{item.quantityRequired} reserved</label>)}</fieldset> : null}</FormGrid>
              <Submit busy={busy}>Create authorized repair job</Submit>
            </form>
          </WorkflowStep>
        </main>

        <aside className={styles.rail}>
          <section><span>Release readiness</span><h2>{currentStep === 0 ? "Inspection evidence required" : currentStep === 1 ? "Ready for diagnosis" : currentStep === 2 ? "Diagnosis established" : currentStep === 3 ? "Estimate awaiting decision" : "Authorized work ready"}</h2><div className={styles.progress}><i style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }} /></div><small>Stage {currentStep + 1} of {steps.length}</small></section>
          <section><span>Evidence ledger</span><dl><div><dt>Inspection versions</dt><dd>{selected.inspectionVersions.length}</dd></div><div><dt>Diagnosis versions</dt><dd>{selected.diagnosisVersions.length}</dd></div><div><dt>Estimate versions</dt><dd>{selected.estimateVersions.length}</dd></div><div><dt>Repair jobs</dt><dd>{selected.repairJobs.length}</dd></div></dl></section>
          <section><span>Safety controls</span><ul><li><LockKeyhole />No estimate overwrites a prior version</li><li><ShieldCheck />Authorization is tied to exact line keys</li><li><PackageCheck />Parts readiness follows the repair job</li><li><ClipboardCheck />Repair cannot start from intake alone</li></ul></section>
          {selected.repairJobs.length ? <section><span>Job readiness</span>{selected.repairJobs.map((item) => <article key={item.id}><strong>{item.jobNumber} · {format(item.status)}</strong><p>{item.description}</p><small>{item.readinessReasonCodes.length ? item.readinessReasonCodes.map(format).join(" · ") : "No blocking reason codes"}</small></article>)}</section> : null}
          <section><span>Connected workspaces</span><nav><Link href={`/vehicles/360/${encodeURIComponent(selected.vehicle.id)}`}>Vehicle 360 <ChevronRight /></Link><Link href="/vehicles/parts">Parts &amp; readiness <ChevronRight /></Link><Link href="/vehicles/quality-control">Quality control <ChevronRight /></Link></nav></section>
        </aside>
      </div>
    </> : <section className={styles.empty}><CarFront /><h2>No open repair order is available</h2><p>Return to the Repair Workbench and select an eligible order before releasing work to diagnosis.</p><Link href="/vehicles/repair-workbench">Open Repair Workbench</Link></section>}
  </section>;
}

function WorkflowStep({ children, complete, icon, number, open, subtitle, title }: { children: ReactNode; complete: boolean; icon: ReactNode; number: number; open: boolean; subtitle: string; title: string }) {
  return <details className={styles.step} open={open}><summary><span className={complete ? styles.done : ""}>{complete ? <Check /> : icon}</span><div><small>Stage {number}</small><h2>{title}</h2><p>{subtitle}</p></div><b>{complete ? "Complete" : open ? "Current" : "Pending"}</b><ChevronRight /></summary><div className={styles.stepBody}>{children}</div></details>;
}
function FormGrid({ children }: { children: ReactNode }) { return <div className={styles.formGrid}>{children}</div>; }
function Field({ children, label, wide = false }: { children: ReactNode; label: string; wide?: boolean }) { return <label className={wide ? styles.wide : ""}><span>{label}</span>{children}</label>; }
function Submit({ busy, children }: { busy: boolean; children: ReactNode }) { return <footer className={styles.submit}><span><LockKeyhole />Creates a new immutable version and audit event.</span><button disabled={busy} type="submit">{busy ? "Saving governed version…" : children}</button></footer>; }
