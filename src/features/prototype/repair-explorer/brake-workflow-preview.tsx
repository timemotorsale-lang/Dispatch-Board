"use client";

import { useRef, useState, type FormEvent } from "react";
import { applyWorkflowAction, newBrakeWorkflow, parseBrakeWorkflow, workflowTotal, WORKFLOW_STEPS, type WorkflowAction } from "./brake-workflow";
import styles from "./brake-workflow.module.css";

const money = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
const checks = ["Record final measurements against the applicable service specifications", "Confirm required assembly, torque and leak checks using the vehicle service procedure", "Record pedal/function checks and any required scans or calibrations", "Document the appropriate controlled verification or road test and its result"];

export function BrakeWorkflowPreview({ storageKey }: { storageKey: string }) {
  const [job, setJob] = useState(newBrakeWorkflow);
  const [actor, setActor] = useState("");
  const [status, setStatus] = useState("Start with the inspection. Use fictional review information only.");
  const [partsReady, setPartsReady] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);

  function act(action: Omit<WorkflowAction, "actor" | "at">) {
    try {
      const next = applyWorkflowAction(job, { ...action, actor, at: Date.now() });
      setJob(next);
      if (next.stage !== job.stage) requestAnimationFrame(() => heading.current?.focus());
      setStatus(`${WORKFLOW_STEPS[next.stage]} · review record updated. Save draft to keep it in this browser.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "The action could not be completed.");
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const value = (key: string) => String(data.get(key) ?? "");
    if (job.stage === 0) act({ type: "inspect", vehicle: value("vehicle"), notes: value("finding"), measurement: value("measurement") });
    if (job.stage === 1) act({ type: "quote", hours: Number(value("hours")), parts: Number(value("parts")), rate: Number(value("rate")), technician: value("technician") });
    if (job.stage === 2) act({ type: "approve", notes: value("customer") });
    if (job.stage === 3) act({ type: "finish", notes: value("completion") });
    if (job.stage === 4) act({ type: "verify", notes: value("verification"), checks: checks.map((_, index) => data.has(`check-${index}`)) });
  }

  function save() {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify({ version: 1, events: job.events }));
      setStatus("Workflow saved in this browser only. No live records were changed.");
    } catch { setStatus("Storage is unavailable. Export the review record before leaving."); }
  }

  function load() {
    try {
      const raw = window.localStorage.getItem(storageKey);
      const saved = raw ? parseBrakeWorkflow(raw) : null;
      if (!saved) { setStatus("No valid saved workflow found. Your current work was kept."); return; }
      if (job.events.length && !window.confirm("Replace this review workflow with the saved draft?")) return;
      setJob(saved);
      requestAnimationFrame(() => heading.current?.focus());
      setPartsReady(false);
      setStatus("Saved workflow loaded. A running clock continues across browser sessions; review elapsed time before using it.");
    } catch { setStatus("The saved workflow could not be loaded. Current work was kept."); }
  }

  function exportRecord() {
    const url = URL.createObjectURL(new Blob([JSON.stringify({ version: 1, previewOnly: true, events: job.events, summary: job }, null, 2)], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "brake-workflow-review.json";
    link.click();
    URL.revokeObjectURL(url);
    setStatus("Review record exported. This is not a customer authorization or invoice.");
  }

  return <div className={styles.page}>
    <header className={styles.header}><a href="/prototype/repair-explorer">← Repair Explorer Preview</a><strong>Dispatch Board / Brake workflow</strong><a href="/prototype/service-workspace">Customer estimates & RO preview →</a><span>Review preview</span></header>
    <main>
      <div className={styles.intro}><div><p className={styles.eyebrow}>ONE JOB. ONE CLEAR NEXT STEP.</p><h1>From finding to finished.</h1><p>Front brake pads & rotors · guided workflow for review</p></div><div className={styles.actions}><button type="button" onClick={save}>Save workflow</button><button type="button" onClick={load}>Load workflow</button><button type="button" onClick={exportRecord}>Export review record</button></div></div>
      <p className={styles.notice}>Isolated review only. No live repair orders, customer messages, payments or approvals. Names and approvals below are entered by the reviewer, not authenticated customers. Use fictional information.</p>
      <ol className={styles.steps} aria-label="Repair workflow">{WORKFLOW_STEPS.map((step, index) => <li key={step} aria-current={index === job.stage ? "step" : undefined}><span>{index < job.stage ? "✓" : index + 1}</span>{step}</li>)}</ol>
      <div className={styles.layout}>
        <section className={styles.card} aria-labelledby="step-heading">
          <p className={styles.eyebrow}>STEP {job.stage + 1} OF 6</p><h2 id="step-heading" ref={heading} tabIndex={-1}>{["Record what you found", "Build the complete estimate", "Review the customer decision", "Do the approved work", "Verify before release", "Ready for review"][job.stage]}</h2>
          {job.stage < 5 && <label className={styles.field}>Staff name for this action<input value={actor} maxLength={100} onChange={(event) => setActor(event.target.value)} placeholder="Reviewer acting as staff" /></label>}
          <form key={`${job.stage}-${job.revision}`} onSubmit={submit}>
            {job.stage === 0 && <>
              <label className={styles.field}>Vehicle configuration / reference<input name="vehicle" required maxLength={1000} placeholder="Year, make, model, engine and brake configuration" /></label>
              <label className={styles.field}>Concern and inspection finding<textarea name="finding" required maxLength={1000} placeholder="Describe the concern, location and observed condition." /></label>
              <label className={styles.field}>Measurements and specification reference<textarea name="measurement" required maxLength={1000} placeholder="Record both front sides, pad/rotor measurements and applicable specification source. Do not infer replacement from symptoms alone." /></label>
              <button className={styles.primary}>Continue to estimate →</button>
            </>}
            {job.stage === 1 && <>
              <h3>Replace front brake pads and rotors</h3><p>Both front sides. Confirm configuration and scope; this is not a diagnosis or vehicle-specific procedure.</p>
              <div className={styles.fields}><label className={styles.field}>Labor hours<input name="hours" type="number" required min="0" max="100" step="0.1" defaultValue={job.hours} /></label><label className={styles.field}>Hourly rate ($)<input name="rate" type="number" required min="0" max="1000" step="0.01" defaultValue={job.rate} /></label><label className={styles.field}>Parts allowance ($)<input name="parts" type="number" required min="0" max="100000" step="0.01" defaultValue={job.parts} /></label></div>
              <p className={styles.notice}>Initial hours and parts are provisional planning allowances, not measured technician hours or supplier quotes. Subtotal excludes tax, fees and outside services.</p>
              <details><summary>Scope and parts checklist</summary><ul><li>Verify front pad set and both front rotors by vehicle fitment.</li><li>Confirm required hardware, consumables and any additional work against the service procedure.</li><li>Do not add a separate pad replacement labor charge over this combined job.</li><li>Calipers, hydraulic repairs, rear brakes and additional diagnosis are excluded. Additional scope needs a revised authorization.</li></ul></details>
              <label className={styles.field}>Assign technician<input name="technician" required maxLength={1000} defaultValue={job.technician} /></label><button className={styles.primary}>Prepare approval review →</button>
            </>}
            {job.stage === 2 && <>
              <h3>Revision {job.revision} · {money(workflowTotal(job))} subtotal</h3><p>Front pads and both front rotors · {job.hours} labor hours × {money(job.rate)} + {money(job.parts)} parts allowance. Tax and fees excluded.</p>
              <p>This decision is simulated for workflow review. Nothing is sent to a customer and no legal authorization is captured.</p>
              <label className={styles.field}>Reviewer acting as customer<input name="customer" required maxLength={1000} /></label><button className={styles.primary}>Record preview approval →</button>
              <label className={styles.field}>Reason for revision<input name="revisionReason" maxLength={1000} /></label><button type="button" onClick={(event) => { const form = event.currentTarget.form!; act({ type: "decline", notes: String(new FormData(form).get("revisionReason") ?? "") }); }}>Return for revision</button>
            </>}
            {job.stage === 3 && <>
              <h3>Assigned to {job.technician}</h3><p><strong>{job.blocked ? `Blocked: ${job.blocked}` : job.runningSince !== null ? "Work clock running" : "Work clock stopped"}</strong></p>
              <label className={styles.check}><input type="checkbox" checked={partsReady} onChange={(event) => setPartsReady(event.target.checked)} />Parts and applicable service instructions are ready</label>
              <div className={styles.actions}><button type="button" disabled={job.runningSince !== null} onClick={() => act({ type: "start", partsReady })}>{job.events.some((event) => event.type === "start") ? "Resume work" : "Start work"}</button><button type="button" disabled={job.runningSince === null} onClick={() => act({ type: "pause" })}>Pause work</button></div>
              <label className={styles.field}>What is blocking this job?<input name="blocker" maxLength={1000} /></label><button type="button" onClick={(event) => act({ type: "block", notes: String(new FormData(event.currentTarget.form!).get("blocker") ?? "") })}>Mark blocked / stop clock</button>
              <label className={styles.field}>Work completed and exceptions<textarea name="completion" required maxLength={1000} /></label><button className={styles.primary} disabled={Boolean(job.blocked)}>Finish work →</button>
              <p className={styles.notice}>Browser clock only; running time includes time away unless paused. Not a verified timecard or published labor standard. Added scope requires a separate revised estimate; do not treat this preview as permission to perform it.</p>
            </>}
            {job.stage === 4 && <>
              <p>Use the vehicle-specific service procedure. These are documentation gates, not repair instructions or a substitute for qualified judgment.</p>
              {checks.map((check, index) => <label className={styles.check} key={check}><input name={`check-${index}`} type="checkbox" required />{check}</label>)}
              <label className={styles.field}>Verification results and measurements<textarea name="verification" required maxLength={1000} placeholder="Record results and references. Do not release if any required check fails." /></label><button className={styles.primary}>Complete verification →</button>
            </>}
            {job.stage === 5 && <><h3>Inspection → approval → repair → verification recorded</h3><p>Export the review record to assess the workflow. This preview does not release a real vehicle, generate an invoice or publish labor times.</p><button type="button" className={styles.primary} onClick={exportRecord}>Export completed review</button></>}
          </form>
        </section>
        <aside className={styles.card} aria-label="Job summary"><p className={styles.eyebrow}>JOB AT A GLANCE</p><h2>Front brakes</h2><p>{job.vehicle || "Vehicle not recorded yet"}</p><dl><dt>Current owner</dt><dd>{job.stage === 3 ? job.technician : job.stage === 4 ? "Verifier" : job.stage === 2 ? "Approval reviewer" : "Service advisor"}</dd><dt>Next action</dt><dd>{["Document inspection", "Confirm scope and pricing", "Record preview decision", job.blocked ? "Resolve blocker, then resume" : "Complete approved work", "Record release checks", "Export and review"][job.stage]}</dd><dt>Estimate subtotal</dt><dd>{money(workflowTotal(job))}{job.revision === 0 && " · planning only"}</dd><dt>Recorded active time</dt><dd>{(job.elapsedMs / 3600000).toFixed(2)} hours{job.runningSince !== null && " + running interval"}</dd></dl>
          {job.approval && <p>Preview approval: revision {job.approval.revision} · {money(job.approval.total)} · {job.approval.actor}</p>}
          {job.finding && <details><summary>Inspection evidence</summary><p>{job.finding}</p><p>{job.measurement}</p></details>}
          <details><summary>Activity history ({job.events.length})</summary><ol>{job.events.map((event, index) => <li key={index}><strong>{event.type}</strong> · {event.actor}<br /><time>{new Date(event.at).toLocaleString()}</time>{event.notes && <p>{event.notes}</p>}</li>)}</ol></details>
        </aside>
      </div>
      <p className={styles.status} role="status" aria-live="polite">{status}</p>
      <footer>Review-only browser draft · no live records changed · save before leaving · not for real customer data</footer>
    </main>
  </div>;
}
