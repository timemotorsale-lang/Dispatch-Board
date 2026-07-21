"use client";

import { Activity, AlertTriangle, ArrowLeft, Check, ClipboardList, Eye, Gauge, Link2, LockKeyhole, Plus, RefreshCw, Ruler, ShieldAlert, Stethoscope, UserRound, Zap } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import type { DiagnosticCaseWorkspaceModel } from "@/server/diagnostics/service";
import styles from "./diagnostics.module.css";

const label = (value: string) => value.replaceAll("_", " ").toLocaleLowerCase().replace(/^./, (letter) => letter.toUpperCase());
const stages = ["CONCERN", "EVIDENCE", "TEST", "CAUSE", "VERIFY"] as const;
const measurementUnits: Record<string, string[]> = { VOLTAGE: ["V", "mV"], CURRENT: ["A", "mA"], RESISTANCE: ["ohm", "kohm", "Mohm"], PRESSURE: ["kPa", "psi", "bar"], TEMPERATURE: ["°C", "°F"], ROTATIONAL_SPEED: ["rpm"], TIME: ["s", "ms"], FREQUENCY: ["Hz", "kHz"], PERCENT: ["%"], DISTANCE: ["mm", "in"], MASS_FLOW: ["g/s"] };

function primaryTransition(model: DiagnosticCaseWorkspaceModel) {
  const item = model.diagnosticCase;
  if (item.status === "DRAFT") return { targetStatus: "TRIAGE", reasonCode: "CASE_TRIAGE_STARTED", title: "Begin triage", reason: "Technician began safety and operability triage." };
  if (item.status === "REOPENED") return { targetStatus: "TRIAGE", reasonCode: "CASE_REOPEN_TRIAGE_STARTED", title: "Return to triage", reason: "Reopened concern returned to technician triage." };
  if (item.status === "ESCALATED" && item.resumeStatus) return { targetStatus: item.resumeStatus, reasonCode: "CASE_ESCALATION_RESOLVED", title: "Resume case", reason: "Escalation review completed and diagnostic work resumed." };
  if (item.status.startsWith("WAITING_FOR_") && item.resumeStatus) return { targetStatus: item.resumeStatus, reasonCode: "CASE_WAITING_RESOLVED", title: "Resume case", reason: "Recorded diagnostic blocker was resolved and work resumed." };
  if (["INCONCLUSIVE", "NO_FAULT_FOUND", "ABANDONED", "VERIFIED_CLOSED"].includes(item.status)) return { targetStatus: "REOPENED", reasonCode: "CASE_REOPENED_RECURRENCE", title: "Reopen concern", reason: "Concern recurred or new evidence requires governed review." };
  return null;
}

export function DiagnosticCaseWorkspace({ model }: { model: DiagnosticCaseWorkspaceModel }) {
  const router = useRouter();
  const [owner, setOwner] = useState(model.diagnosticCase.assignedUser?.id ?? "");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [captureMode, setCaptureMode] = useState<"NONE" | "OBSERVATION" | "MEASUREMENT" | "LINK">("NONE");
  const [observationStatement, setObservationStatement] = useState("");
  const [measurementQuantity, setMeasurementQuantity] = useState("VOLTAGE");
  const [measurementValue, setMeasurementValue] = useState("");
  const [measurementUnit, setMeasurementUnit] = useState("V");
  const [instrumentName, setInstrumentName] = useState("");
  const [evidenceObjectId, setEvidenceObjectId] = useState("");
  const [evidenceTarget, setEvidenceTarget] = useState(`CASE:${model.diagnosticCase.id}`);
  const action = useMemo(() => primaryTransition(model), [model]);
  const item = model.diagnosticCase;
  const commandEnabled = model.rollout.executable;

  async function execute(url: string, body: Record<string, unknown>) {
    setBusy(true); setNotice("");
    try {
      const response = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...body, expectedVersion: item.version, idempotencyKey: crypto.randomUUID() }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error ?? "The diagnostic command could not be completed.");
      setNotice("Command recorded. Loading the authoritative case version.");
      router.refresh();
    } catch (error) { setNotice(`${error instanceof Error ? error.message : "The command failed."} Refresh before retrying if another technician changed this case.`); }
    finally { setBusy(false); }
  }

  return <section className={styles.workspace} aria-label="Diagnostic case workspace">
    <header className={styles.caseHeader}>
      <div><Link href="/diagnostics"><ArrowLeft size={15} /> Case queue</Link><span className={styles.eyebrow}>Technician diagnostic workspace</span><h1>{item.vehicle.label}</h1><p>{item.repairOrder.repairOrderNumber} · Case {item.id.slice(-8)} · Concern v{item.concernVersion}</p></div>
      <dl><div><dt>Status</dt><dd>{label(item.status)}</dd></div><div><dt>Risk</dt><dd>{item.riskTier}</dd></div><div><dt>Owner</dt><dd>{item.assignedUser?.name ?? "Unassigned"}</dd></div><div><dt>Record</dt><dd>Version {item.version}</dd></div></dl>
    </header>

    <nav className={styles.stages} aria-label="Diagnostic stages">{stages.map((stage, index) => { const active = stages.indexOf(item.stage) === index; const reached = stages.indexOf(item.stage) >= index; return <span aria-current={active ? "step" : undefined} className={active ? styles.activeStage : reached ? styles.reachedStage : ""} key={stage}><i>{reached ? <Check /> : index + 1}</i>{label(stage)}</span>; })}</nav>
    {!commandEnabled ? <div className={styles.hold}><ShieldAlert size={18} /><span><strong>Read-only rollout hold.</strong> Review is available; case commands are disabled ({label(model.rollout.reason)}).</span></div> : null}
    {notice ? <div className={styles.notice} role="status">{notice}<button onClick={() => router.refresh()} type="button"><RefreshCw size={14} /> Refresh</button></div> : null}

    <div className={styles.workspaceGrid}>
      <main className={styles.caseMain}>
        <section className={styles.concernCard}><header><span><ClipboardList /> Authoritative concern</span><b>{label(item.concernSource)}</b></header><h2>{item.concern}</h2><dl><div><dt>Reproduction</dt><dd>Not yet recorded</dd></div><div><dt>Operating conditions</dt><dd>{Object.keys(item.operatingConditions as object).length ? JSON.stringify(item.operatingConditions) : "No structured conditions recorded"}</dd></div><div><dt>Confidence</dt><dd>Not assessed</dd></div></dl></section>

        <section className={styles.primaryAction}><div><span className={styles.eyebrow}>Next best action</span><h2>{item.nextAction}</h2><p>{item.blocker ? `Blocked: ${item.blocker}` : "Complete the next governed step without assuming a cause."}</p></div>{action ? <button disabled={busy || !commandEnabled || !model.permissions.canTransition} onClick={() => void execute(`/api/diagnostics/cases/${encodeURIComponent(item.id)}/transition`, action)} type="button">{busy ? "Recording…" : action.title}</button> : <span className={styles.readOnlyAction}>Continue in the current stage</span>}</section>

        <section className={styles.evidenceFoundation}>
          <header><div><span className={styles.eyebrow}>Structured facts · DGN-013–014</span><h2>Evidence foundation</h2><p>Record what was observed or measured. Attachments retain Vehicle Evidence governance and checksum lineage.</p></div><span>{item.observations.length + item.measurements.length} facts · {item.evidenceLinks.length} attachments</span></header>
          {!model.evidenceRollout.executable ? <div className={styles.hold}><ShieldAlert size={17} /><span><strong>Evidence commands are held.</strong> Existing facts remain reviewable ({label(model.evidenceRollout.reason)}).</span></div> : null}
          <div className={styles.evidenceActions}>
            <button disabled={!model.permissions.canRecordEvidence} onClick={() => setCaptureMode(captureMode === "OBSERVATION" ? "NONE" : "OBSERVATION")} type="button"><Eye /> Observation</button>
            <button disabled={!model.permissions.canRecordEvidence} onClick={() => setCaptureMode(captureMode === "MEASUREMENT" ? "NONE" : "MEASUREMENT")} type="button"><Ruler /> Measurement</button>
            <button disabled={!model.permissions.canLinkEvidence} onClick={() => setCaptureMode(captureMode === "LINK" ? "NONE" : "LINK")} type="button"><Link2 /> Link attachment</button>
          </div>
          {captureMode === "OBSERVATION" ? <form className={styles.captureForm} onSubmit={(event) => { event.preventDefault(); void execute(`/api/diagnostics/cases/${encodeURIComponent(item.id)}/observations`, { factClass: "OBSERVED", independenceGroup: "TECHNICIAN_DIRECT", operatingConditions: item.operatingConditions, qualityReasonCode: "DATA_VALID", qualityStatus: "VALID", rawSource: { kind: "MANUAL_ENTRY" }, reason: "Recorded direct technician observation in the diagnostic case.", reliability: "UNASSESSED", source: "TECHNICIAN", statement: observationStatement }); }}>
            <label className={styles.wideField}><span>Direct observation</span><textarea maxLength={2000} onChange={(event) => setObservationStatement(event.target.value)} placeholder="Describe only what was directly observed; do not state an assumed cause." required rows={3} value={observationStatement} /></label>
            <button disabled={busy || !model.evidenceRollout.executable || observationStatement.trim().length < 3} type="submit"><Plus /> Record observation</button>
          </form> : null}
          {captureMode === "MEASUREMENT" ? <form className={styles.captureForm} onSubmit={(event) => { event.preventDefault(); void execute(`/api/diagnostics/cases/${encodeURIComponent(item.id)}/measurements`, { independenceGroup: `INSTRUMENT:${instrumentName.trim().toUpperCase()}`, instrument: { name: instrumentName, calibrationStatus: "UNKNOWN" }, operatingConditions: item.operatingConditions, qualityReasonCode: "DATA_VALID", qualityStatus: "VALID", quantity: measurementQuantity, rawSource: { kind: "MANUAL_ENTRY" }, reason: "Recorded instrument measurement with unit and setup provenance.", reliability: "UNASSESSED", setup: { entry: "TECHNICIAN_MANUAL" }, source: "TEST_EQUIPMENT", tolerance: {}, unit: measurementUnit, value: measurementValue }); }}>
            <label><span>Quantity</span><select onChange={(event) => { const quantity = event.target.value; setMeasurementQuantity(quantity); setMeasurementUnit(measurementUnits[quantity][0]); }} value={measurementQuantity}>{Object.keys(measurementUnits).map((value) => <option key={value}>{value}</option>)}</select></label>
            <label><span>Value</span><input inputMode="decimal" onChange={(event) => setMeasurementValue(event.target.value)} required value={measurementValue} /></label>
            <label><span>Unit</span><select onChange={(event) => setMeasurementUnit(event.target.value)} value={measurementUnit}>{measurementUnits[measurementQuantity].map((unit) => <option key={unit}>{unit}</option>)}</select></label>
            <label><span>Instrument</span><input maxLength={120} onChange={(event) => setInstrumentName(event.target.value)} placeholder="DVOM, scope, gauge…" required value={instrumentName} /></label>
            <button disabled={busy || !model.evidenceRollout.executable || !measurementValue || !instrumentName.trim()} type="submit"><Plus /> Record measurement</button>
          </form> : null}
          {captureMode === "LINK" ? <form className={styles.captureForm} onSubmit={(event) => { event.preventDefault(); const separator = evidenceTarget.indexOf(":"); void execute(`/api/diagnostics/cases/${encodeURIComponent(item.id)}/evidence`, { evidenceObjectId, purpose: "Supports diagnostic fact review and reproducibility.", reason: "Linked governed Vehicle Evidence to the diagnostic case record.", relationship: "SUPPORTS", subjectType: evidenceTarget.slice(0, separator), subjectId: evidenceTarget.slice(separator + 1) }); }}>
            <label className={styles.wideField}><span>Vehicle Evidence object</span><select onChange={(event) => setEvidenceObjectId(event.target.value)} required value={evidenceObjectId}><option value="">Select an available, malware-clean object</option>{model.evidenceCandidates.map((candidate) => <option disabled={!candidate.linkable} key={candidate.id} value={candidate.id}>{candidate.fileName} · {label(candidate.accessLevel)} · {candidate.linkable ? "Available" : label(candidate.status)}</option>)}</select><small>{model.evidenceCandidates.length ? "Restricted objects appear only with explicit restricted-evidence access." : "No permitted Vehicle Evidence objects are available for this vehicle."}</small></label>
            <label className={styles.wideField}><span>Link to</span><select onChange={(event) => setEvidenceTarget(event.target.value)} value={evidenceTarget}><option value={`CASE:${item.id}`}>Diagnostic case</option>{item.concernVersionId ? <option value={`CONCERN:${item.concernVersionId}`}>Current concern</option> : null}{item.observations.map((fact) => <option key={fact.id} value={`OBSERVATION:${fact.id}`}>Observation · {fact.statement.slice(0, 70)}</option>)}{item.measurements.map((fact) => <option key={fact.id} value={`MEASUREMENT:${fact.id}`}>Measurement · {fact.quantity} {fact.value} {fact.unit}</option>)}</select></label>
            <button disabled={busy || !model.evidenceRollout.executable || !evidenceObjectId.trim()} type="submit"><Link2 /> Link governed evidence</button>
          </form> : null}
          <div className={styles.factColumns}>
            <section><header><Eye /><h3>Observations</h3><span>{item.observations.length}</span></header>{item.observations.length ? item.observations.map((fact) => <article className={fact.correctedById ? styles.supersededFact : ""} key={fact.id}><div><strong>{fact.statement}</strong><small>{label(fact.factClass)} · {label(fact.source)} · {label(fact.reliability)}</small></div><span>{label(fact.qualityStatus)}</span><footer>{fact.authorUser.name} · {new Date(fact.observedAt).toLocaleString()}{fact.correctedById ? " · Corrected" : ""}</footer></article>) : <div className={styles.moduleEmpty}><p>No observations recorded.</p><small>Absence of evidence is not evidence of absence.</small></div>}</section>
            <section><header><Ruler /><h3>Measurements</h3><span>{item.measurements.length}</span></header>{item.measurements.length ? item.measurements.map((fact) => <article className={fact.supersededById ? styles.supersededFact : ""} key={fact.id}><div><strong>{fact.quantity}: {fact.value} {fact.unit}</strong><small>Normalized {fact.normalizedValue} {fact.normalizedUnit} · {label(fact.plausibilityStatus)}</small></div><span>{label(fact.qualityStatus)}</span><footer>{fact.authorUser.name} · {new Date(fact.measuredAt).toLocaleString()}{fact.supersededById ? " · Superseded" : ""}</footer></article>) : <div className={styles.moduleEmpty}><p>No measurements recorded.</p><small>Units and engineering plausibility are validated on the server.</small></div>}</section>
          </div>
          <section className={styles.attachments}><header><Link2 /><h3>Governed attachments</h3><span>{item.evidenceLinks.length}</span></header>{item.evidenceLinks.length ? item.evidenceLinks.map((link) => <article key={link.id}><div><strong>{link.evidence.status === "DELETED" ? "Deleted evidence object" : link.evidence.fileName}</strong><small>{label(link.subjectType)} · {label(link.relationship)} · SHA-256 {link.evidence.checksumSha256.slice(0, 12)}…</small></div><span>{label(link.evidence.accessLevel)} · {label(link.evidence.status)}</span>{link.evidence.downloadUrl ? <a href={link.evidence.downloadUrl}>Open</a> : <b>Unavailable</b>}</article>) : <div className={styles.moduleEmpty}><p>No governed attachments linked.</p><small>Upload and malware scanning remain under Vehicle Evidence authority.</small></div>}</section>
        </section>

        <div className={styles.evidenceGrid}><section><header><Stethoscope /><h2>Hypotheses</h2><span>Not assessed</span></header><div className={styles.moduleEmpty}><p>No candidate causes have been proposed. Facts recorded above do not automatically become a diagnosis.</p><small>Hypothesis reasoning activates in DGN-017–019.</small></div></section><section><header><Gauge /><h2>Consistency evaluation</h2><span>Not run</span></header><div className={styles.moduleEmpty}><p>No reasoning evaluation has consumed these facts.</p><small>Deterministic consistency evaluation activates in its owning milestone.</small></div></section></div>

        <section className={styles.labShell}><header><div><span className={styles.eyebrow}>Progressive diagnostic labs</span><h2>Tool workspace</h2></div><small>Modules activate only when their governed milestone is delivered.</small></header><div>{[{ icon: Activity, name: "Scan & network" }, { icon: Gauge, name: "Live data" }, { icon: Zap, name: "Electrical" }, { icon: Activity, name: "Waveform" }].map(({ icon: Icon, name }) => <article key={name}><Icon /><strong>{name}</strong><span><LockKeyhole /> Staged</span></article>)}</div></section>
      </main>

      <aside className={styles.caseRail}>
        <section><h2><UserRound /> Ownership</h2>{model.permissions.canAssign ? <><label><span>Accountable technician</span><select onChange={(event) => setOwner(event.target.value)} value={owner}><option value="">Select technician</option>{model.assignableUsers.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}</select></label><button disabled={busy || !commandEnabled || !owner || owner === item.assignedUser?.id} onClick={() => void execute(`/api/diagnostics/cases/${encodeURIComponent(item.id)}/assignment`, { assignedUserId: owner, reasonCode: item.assignedUser ? "CASE_REASSIGNED_LOAD" : "CASE_INITIAL_ASSIGNMENT", reason: "Assigned accountable technician from diagnostic workspace." })} type="button">Save assignment</button></> : <p>{item.assignedUser?.name ?? "No technician assigned"}</p>}<small>{item.location.name}</small></section>
        <section><h2><ShieldAlert /> Consistency &amp; safety</h2><p><i className={styles[item.riskTier.toLocaleLowerCase()]}>{item.riskTier}</i>Risk tier is visible; safety review remains a technician judgment.</p><p><i><Check /></i>Concern is linked to its Repair Order source.</p><p><i><Check /></i>Every lifecycle change requires an exact version.</p></section>
        <section><h2><Activity /> Case timeline</h2>{item.timeline.map((event) => <article className={styles.timelineItem} key={event.id}><i /><div><strong>{label(event.eventType)}</strong><span>{label(event.toStatus)} · v{event.version}</span><p>{event.reason}</p><small>{new Date(event.occurredAt).toLocaleString()}</small></div></article>)}</section>
        <section className={styles.trace}><h2>Source traceability</h2><Link href={`/vehicles/repair-workbench?repairOrderId=${encodeURIComponent(item.repairOrder.id)}`}>{item.repairOrder.repairOrderNumber}</Link><span>{item.vehicle.vin ?? item.vehicle.vehicleNumber}</span><span>Case record v{item.version}</span></section>
      </aside>
    </div>
  </section>;
}

export function DiagnosticCaseUnavailable({ message }: { message: string }) {
  return <section className={styles.unavailable}><AlertTriangle /><span className={styles.eyebrow}>Case unavailable</span><h1>The diagnostic workspace could not load</h1><p>{message}</p><Link href="/diagnostics">Return to the case queue</Link></section>;
}
