"use client";

import { Activity, AlertTriangle, ArrowLeft, Check, ClipboardList, Gauge, LockKeyhole, RefreshCw, ShieldAlert, Stethoscope, UserRound, Zap } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import type { DiagnosticCaseWorkspaceModel } from "@/server/diagnostics/service";
import styles from "./diagnostics.module.css";

const label = (value: string) => value.replaceAll("_", " ").toLocaleLowerCase().replace(/^./, (letter) => letter.toUpperCase());
const stages = ["CONCERN", "EVIDENCE", "TEST", "CAUSE", "VERIFY"] as const;

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

        <div className={styles.evidenceGrid}>
          <section><header><Gauge /><h2>Evidence</h2><span>0 recorded</span></header><div className={styles.moduleEmpty}><p>No observations, measurements, or attachments are available yet.</p><small>Evidence capture activates in DGN-013–014.</small></div></section>
          <section><header><Stethoscope /><h2>Hypotheses</h2><span>Not assessed</span></header><div className={styles.moduleEmpty}><p>No candidate causes have been proposed. Do not infer confidence from case status.</p><small>Hypothesis reasoning activates in DGN-017–019.</small></div></section>
        </div>

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
