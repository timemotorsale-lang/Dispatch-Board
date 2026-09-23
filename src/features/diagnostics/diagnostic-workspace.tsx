"use client";

import Link from "next/link";
import { useEffect, useId, useState, type ReactNode } from "react";
import styles from "./diagnostic-workspace.module.css";
import { DiagnosticEvidencePanel } from "./diagnostic-evidence-panel";
import type { ClinicalDrafts } from "@/lib/diagnostic-clinical-draft";

const sections = ["Overview", "Findings & tests", "Estimate", "Authorization", "Verification"] as const;
const workflowSections = sections.filter((name) => name !== "Overview");
type Section = typeof sections[number];
type Planning = {
  nextAction: string;
  stage: string;
  diagnosisVersions: Array<{ id: string; concern: string; cause: string; proposedCorrection: string; uncertainty: string }>;
  inspectionVersions: Array<{ id: string }>;
  estimateVersions: Array<{ id: string; version: number; totalCents: number; status: string; authorizations: Array<{ id: string; disposition: string }> }>;
  repairJobs: Array<{ id: string; jobNumber: string; description: string; status: string }>;
};

export function DiagnosticWorkspace({ vehicle, customer, vin, concern, repairOrderId, repairOrderNumber, tools, children, feedback, onSave, onFindDrafts, saveStatus, returnTo, returnLabel, clinical, onClinicalChange, onClinicalPersist }: {
  vehicle: string | null | undefined; customer: string | null | undefined; vin: string | null | undefined; concern: string | null | undefined;
  repairOrderId?: string; repairOrderNumber?: string; tools: ReactNode; children: ReactNode;
  onSave: () => Promise<boolean>; onFindDrafts: () => Promise<unknown>; saveStatus: string; returnTo?: string; returnLabel?: string; feedback?: ReactNode;
  clinical?: ClinicalDrafts; onClinicalChange?: (value: ClinicalDrafts) => void; onClinicalPersist?: (value: ClinicalDrafts) => Promise<boolean>;
}) {
  const [section, setSection] = useState<Section>("Overview");
  const [toolsOpen, setToolsOpen] = useState(false);
  const [snapshot, setSnapshot] = useState<{ id: string; value: Planning } | null>(null);
  const [loadError, setLoadError] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const prefix = useId();
  const planning = snapshot && snapshot.id === repairOrderId ? snapshot.value : null;
  useEffect(() => {
    if (!repairOrderId) return;
    const abort = new AbortController();
    fetch(`/api/repair-orders/${encodeURIComponent(repairOrderId)}/planning`, { signal: abort.signal, cache: "no-store" })
      .then(async response => { const data = await response.json(); if (!response.ok) throw new Error(data.error || "Unable to load repair progress."); return data as Planning; })
      .then(value => { setSnapshot({ id: repairOrderId, value }); setLoadError(""); })
      .catch(error => { if (!abort.signal.aborted) { setSnapshot(null); setLoadError(error.message); } });
    return () => abort.abort();
  }, [repairOrderId, refresh]);
  const workbench = repairOrderId ? `/vehicles/repair-workbench?repairOrderId=${encodeURIComponent(repairOrderId)}&fullDetails=1&returnTo=${encodeURIComponent(`/diagnostics/labor-guide?repairOrderId=${repairOrderId}`)}` : null;
  const diagnosis = planning?.diagnosisVersions[0];
  const estimate = planning?.estimateVersions[0];
  const decision = estimate?.authorizations[0];
  const unavailable = repairOrderId && !planning;
  const inspectionCount = planning?.inspectionVersions.length ?? 0;
  const hasInspection = inspectionCount > 0;
  const hasDiagnosis = Boolean(diagnosis);
  const hasEstimate = Boolean(estimate);
  const hasDecision = Boolean(decision);
  const hasRepairRelease = Boolean(planning?.repairJobs.length);
  const findingsStatus = unavailable ? "Not loaded" : diagnosis ? "Recorded" : "Not yet recorded";
  const authorizationStatus = unavailable ? "Not loaded" : decision ? decision.disposition.replaceAll("_", " ") : "No decision recorded";
  const showTools = () => setToolsOpen(true);
  const toolPanelOpen = toolsOpen || (section === "Estimate" && !vehicle);

  return <section className={styles.workspace} aria-label="Diagnostic vehicle workspace" onClickCapture={async event => {
    const link = (event.target as HTMLElement).closest("a");
    if (!link || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || link.target === "_blank") return;
    event.preventDefault();
    if (leaving) return;
    setLeaving(true);
    try { if (await onSave()) window.location.assign(link.href); } finally { setLeaving(false); }
  }}>
    <aside className={styles.sidebar} aria-label="Diagnostics navigation">
      <strong>DIAGNOSTICS</strong>
      <Link href="/my-tasks">My work</Link>
      <button type="button" aria-current={section !== "Estimate" ? "page" : undefined} onClick={() => setSection("Overview")}>Vehicle workspace</button>
      <button type="button" aria-current={section === "Estimate" ? "page" : undefined} onClick={() => setSection("Estimate")}>Labor lookup</button>
      <button type="button" onClick={() => { showTools(); void onFindDrafts().catch(() => {}); }}>Saved quotes</button>
      <Link href="/diagnostics">Diagnostic queue</Link>
      {returnTo ? <Link href={returnTo}>{returnLabel ?? "Return to source workspace"}</Link> : null}
      <small>Drafts remain separate from recorded findings and repair authorization.</small>
    </aside>
    <div className={styles.main}>
      <header className={styles.identity} aria-label="Selected RO context">
        <div><span className={styles.eyebrow}>Diagnostic workspace</span><h1>{vehicle || "Choose a vehicle to begin"}</h1><p>{customer || "Customer not selected"} · {repairOrderNumber ? `Active RO ${repairOrderNumber}` : "Preliminary quote · no repair order"}</p>{vin ? <small>VIN / vehicle reference: {vin}</small> : null}</div>
        <div className={styles.actions}><span role="status">Draft: {saveStatus}</span><button type="button" disabled={saveStatus === "Saving…" || leaving} onClick={() => void onSave()}>Save quote</button><button type="button" aria-expanded={toolPanelOpen} onClick={() => setToolsOpen(!toolPanelOpen)}>Vehicle & draft tools</button></div>
      </header>
      <div hidden={!toolPanelOpen} className={styles.tools}>{tools}</div>
      {feedback}
      {leaving ? <p role="status">Saving your draft before opening the next workspace…</p> : null}
      <nav className={styles.tabs} aria-label="Workspace sections">{workflowSections.map(name => <button id={`${prefix}-${name.replaceAll(" ", "-")}`} type="button" key={name} aria-pressed={section === name} aria-controls={`${prefix}-panel-${name.replaceAll(" ", "-")}`} onClick={() => setSection(name)}>{name}</button>)}</nav>
      {repairOrderId && section !== "Estimate" ? <div className={styles.progress}><span>{planning ? `Recorded stage: ${planning.stage.replaceAll("_", " ")}` : loadError || "Loading recorded progress…"}</span><button type="button" onClick={() => { setSnapshot(null); setLoadError(""); setRefresh(value => value + 1); }}>Refresh progress</button></div> : null}
      <section id={`${prefix}-panel-Overview`} aria-labelledby={`${prefix}-Overview`} hidden={section !== "Overview"} className={styles.panel}>
        <h2>What needs to happen next?</h2><p>{concern || "Enter customer and vehicle details or select an existing repair order. You can prepare a quote without creating an RO."}</p>
        <dl className={styles.rows}><div><dt>Customer concern</dt><dd>{concern ? "Captured" : "Not entered"}</dd></div><div><dt>Technical findings</dt><dd>{findingsStatus}</dd></div><div><dt>Official estimate</dt><dd>{unavailable ? "Not loaded" : estimate ? `Version ${estimate.version} · ${estimate.status}` : "Not yet presented"}</dd></div><div><dt>Authorization</dt><dd>{authorizationStatus}</dd></div></dl>
        <footer><span>{planning?.nextAction || "A preliminary quote is not a diagnosis or authorization."}</span><button className={styles.primary} type="button" onClick={() => vehicle ? setSection(repairOrderId ? "Findings & tests" : "Estimate") : showTools()}>{vehicle ? repairOrderId ? "Review findings" : "Prepare preliminary quote" : "Choose vehicle / enter details"}</button></footer>
      </section>
      <section id={`${prefix}-panel-Findings-&-tests`} aria-labelledby={`${prefix}-Findings-&-tests`} hidden={section !== "Findings & tests"} className={styles.panel}>
        <h2>Findings & tests</h2><p>Capture what was checked, what failed or passed, and what proof supports the next repair step.</p>
        <div className={styles.stageCards} aria-label="Findings and tests daily steps">
          <article className={hasInspection ? styles.stageDone : styles.stageCurrent}><span>1</span><strong>Capture condition</strong><small>{unavailable ? "Loading" : hasInspection ? `${inspectionCount} inspection saved` : "Save the first finding"}</small></article>
          <article className={hasDiagnosis ? styles.stageDone : hasInspection ? styles.stageCurrent : ""}><span>2</span><strong>Record cause or scope</strong><small>{unavailable ? "Loading" : hasDiagnosis ? "Cause recorded" : "Explain what needs repair"}</small></article>
          <article className={hasEstimate ? styles.stageDone : hasDiagnosis ? styles.stageCurrent : ""}><span>3</span><strong>Continue estimate</strong><small>{unavailable ? "Loading" : hasEstimate ? `Estimate v${estimate?.version}` : "Move to pricing when ready"}</small></article>
        </div>
        {diagnosis ? <><h3>Latest recorded finding</h3><p>{diagnosis.cause}</p><dl className={styles.rows}><div><dt>Proposed correction</dt><dd>{diagnosis.proposedCorrection}</dd></div><div><dt>Recorded uncertainty</dt><dd>{diagnosis.uncertainty}</dd></div></dl></> : <p>{unavailable ? "Recorded findings are unavailable until progress loads." : "No diagnosis has been recorded."}</p>}
        <p>Saved inspection findings: {planning ? inspectionCount : repairOrderId ? "Not loaded" : "No RO selected"}</p>
        <footer><span>Use this step before pricing. The system keeps the recorded history and approval controls in place.</span>{workbench ? <Link className={styles.primary} href={workbench}>Open simple findings entry</Link> : <button type="button" onClick={showTools}>Select or check in a vehicle</button>}</footer>
      </section>
      <section id={`${prefix}-panel-Estimate`} aria-labelledby={`${prefix}-Estimate`} hidden={section !== "Estimate"} className={styles.estimate}>{children}</section>
      <section id={`${prefix}-panel-Authorization`} aria-labelledby={`${prefix}-Authorization`} hidden={section !== "Authorization"} className={styles.panel}>
        <h2>Authorization</h2><p>Confirm what was presented, who decided, and which approved lines can move into repair.</p>
        <div className={styles.stageCards} aria-label="Authorization daily steps">
          <article className={hasEstimate ? styles.stageDone : styles.stageCurrent}><span>1</span><strong>Present estimate</strong><small>{unavailable ? "Loading" : hasEstimate ? `Version ${estimate?.version}` : "Prepare pricing first"}</small></article>
          <article className={hasDecision ? styles.stageDone : hasEstimate ? styles.stageCurrent : ""}><span>2</span><strong>Record decision</strong><small>{unavailable ? "Loading" : hasDecision ? authorizationStatus : "Accepted, declined, or partial"}</small></article>
          <article className={hasRepairRelease ? styles.stageDone : hasDecision ? styles.stageCurrent : ""}><span>3</span><strong>Release repair</strong><small>{unavailable ? "Loading" : hasRepairRelease ? `${planning?.repairJobs.length} job(s)` : "Create work from approved lines"}</small></article>
        </div>
        <dl className={styles.rows}><div><dt>Latest recorded estimate</dt><dd>{unavailable ? "Not loaded" : estimate ? `Version ${estimate.version} · $${(estimate.totalCents / 100).toFixed(2)}` : "Not presented"}</dd></div><div><dt>Latest decision on that version</dt><dd>{authorizationStatus}</dd></div></dl>
        <footer>{estimate && repairOrderId ? <Link href={`/repair-estimate?repairOrderId=${encodeURIComponent(repairOrderId)}&estimateId=${encodeURIComponent(estimate.id)}`}>View estimate</Link> : <button type="button" onClick={() => setSection("Estimate")}>Prepare estimate</button>}{workbench ? <Link className={styles.primary} href={workbench}>Record customer decision</Link> : null}</footer>
      </section>
      <section id={`${prefix}-panel-Verification`} aria-labelledby={`${prefix}-Verification`} hidden={section !== "Verification"} className={styles.panel}>
        <h2>Repair verification</h2><p>Review authorized repair jobs, then record post-repair checks in the repair workbench.</p>
        {planning?.repairJobs.length ? <ul className={styles.jobs}>{planning.repairJobs.map(job => <li key={job.id}><strong>{job.jobNumber} · {job.description}</strong><span>{job.status.replaceAll("_", " ")}</span></li>)}</ul> : <p>{unavailable ? "Repair job status has not loaded." : "No repair jobs recorded. This does not indicate that the vehicle has passed verification."}</p>}
        <footer><span>Job completion alone does not prove that the concern was resolved.</span>{workbench ? <Link className={styles.primary} href={workbench}>Open repair & verification workbench</Link> : <button type="button" onClick={showTools}>Select a repair order</button>}</footer>
      </section>
      {repairOrderId && clinical && onClinicalChange && onClinicalPersist ? <DiagnosticEvidencePanel key={repairOrderId} repairOrderId={repairOrderId} section={section} drafts={clinical} onChange={onClinicalChange} onPersist={onClinicalPersist} /> : null}
    </div>
  </section>;
}
