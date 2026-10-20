"use client";

import { useRef, useState, type FormEvent } from "react";
import { parsePreviewDraft, estimateTotals, type EstimateLine } from "./estimate";
import { decideServiceRevision, handoffApprovedWork, newServicePreview, presentServiceRevision, reviseServiceEstimate, REVIEW_CONTEXTS, type Decision, type ServiceContext } from "./service-preview-domain";
import styles from "./brake-workflow.module.css";

const money = (cents: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);

export function ServiceWorkspacePreview({ initialContext, records = [], notice = "", explorerStorageKey }: { initialContext?: ServiceContext; records?: { id: string; label: string }[]; notice?: string; explorerStorageKey: string }) {
  const [context, setContext] = useState(initialContext ?? REVIEW_CONTEXTS[0]);
  const [state, setState] = useState(newServicePreview);
  const [status, setStatus] = useState("Confirm customer, vehicle and scope before preparing the review estimate.");
  const heading = useRef<HTMLHeadingElement>(null);
  const current = state.revisions.at(-1);
  const decision = state.decisions.find(item => item.revisionId === current?.id);
  const totals = estimateTotals(state.lines, state.rate);

  function run(action: () => typeof state) {
    try { setState(action()); setStatus("Preview updated. No live records were changed. This workspace is session-only; leaving or refreshing clears it."); requestAnimationFrame(() => heading.current?.focus()); }
    catch (error) { setStatus(error instanceof Error ? error.message : "Unable to complete the preview action."); }
  }

  function changeContext(id: string) {
    const next = REVIEW_CONTEXTS.find(item => item.id === id);
    if (!next || ((state.revisions.length || state.lines.length) && !window.confirm("Switching context clears this session's preview estimates and decisions. Continue?"))) return;
    setContext(next); setState(newServicePreview()); setStatus("Customer, vehicle and RO changed together. No approval or work was carried over.");
  }

  function importDraft() {
    if (state.revisions.length || state.lines.length) {
      if (!window.confirm("Replace the editable work list with the saved Repair Explorer draft?")) return;
    }
    try {
      const raw = window.localStorage.getItem(explorerStorageKey);
      const draft = raw ? parsePreviewDraft(raw) : null;
      if (!draft?.lines.length) { setStatus("No valid saved Repair Explorer estimate found. Save an estimate in Repair Explorer first."); return; }
      setState({ ...state, lines: draft.lines.map(line => ({ ...line })), rate: draft.rate });
      setStatus("Work and allowances imported only. Confirm applicability for this vehicle; customer identity and approvals are never imported.");
    } catch { setStatus("The browser draft is unavailable. Current work was kept."); }
  }

  function updateLine(id: string, field: "hours" | "parts", value: string) {
    const amount = value.trim() === "" ? null : Number(value);
    if (amount !== null && (!Number.isFinite(amount) || amount < 0 || amount > (field === "hours" ? 100 : 100000))) return;
    setState({ ...state, lines: state.lines.map(line => line.id === id ? { ...line, [field]: amount, ...(field === "hours" ? { laborBasis: "MANUAL" as const, laborConfiguration: undefined, reportedJobCount: undefined } : {}) } : line) });
  }

  function addDiagnosis() {
    if (state.lines.some(line => line.id === "brake-noise")) return;
    const line: EstimateLine = { id: "brake-noise", label: "Diagnose brake noise or vibration", hours: 0.8, parts: 0, laborBasis: "PLANNING" };
    setState({ ...state, lines: [...state.lines, line] });
  }

  function present(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    if (!data.has("applicability")) { setStatus("Confirm vehicle applicability and labor overlap before presenting."); return; }
    run(() => presentServiceRevision(state, context, String(data.get("reason") ?? ""), Date.now()));
  }

  function recordDecision(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!current) return;
    const data = new FormData(event.currentTarget);
    const choices = Object.fromEntries(current.lines.map(line => [line.id, String(data.get(`decision-${line.id}`) ?? "")])) as Record<string, Decision>;
    run(() => decideServiceRevision(state, current.id, choices, String(data.get("name") ?? ""), String(data.get("staff") ?? ""), Date.now()));
  }

  function exportReview() {
    if (context.live) { setStatus("Export is disabled for live RO context. No live customer information is saved in this preview."); return; }
    const url = URL.createObjectURL(new Blob([JSON.stringify({ previewOnly: true, context, state }, null, 2)], { type: "application/json" }));
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = "service-workspace-review.json"; anchor.click(); URL.revokeObjectURL(url);
  }

  return <div className={styles.page}>
    <header className={styles.header}><a href="/prototype/repair-explorer">← Repair Explorer Preview</a><strong>Dispatch Board / Service workspace</strong><a href="/prototype/brake-workflow">Brakes execution preview →</a><span>Review preview</span></header>
    <main>
      <div className={styles.intro}><div><p className={styles.eyebrow}>CUSTOMER → VEHICLE → ESTIMATE → DECISION → HANDOFF</p><h1>One connected service workspace.</h1><p>Prepare the right work. Preserve the decision. Hand off only what is approved.</p></div><button type="button" disabled={context.live} onClick={exportReview}>Export fictional review</button></div>
      <p className={styles.notice}>Review only · no live RO, estimate, customer message, authorization or job is created. Decisions are simulated by staff, not verified customer signatures. Session-only: refreshing or leaving clears this workspace. {context.live ? "Live context is read-only; export is disabled and no customer data is saved to browser storage." : "Use fictional review information only."}</p>
      {notice && <p role="alert" className={styles.notice}>{notice}</p>}
      <div className={styles.layout}>
        <section className={styles.card} aria-label="Estimate and authorization workspace">
          <h2 ref={heading} tabIndex={-1}>{state.editing ? "Build the estimate" : decision ? "Approved work handoff" : "Customer estimate review"}</h2>
          <details><summary>Customer, vehicle and RO context</summary>
            {!initialContext && <label className={styles.field}>Fictional review job<select value={context.id} onChange={event => changeContext(event.target.value)}>{REVIEW_CONTEXTS.map(item => <option key={item.id} value={item.id}>{item.roNumber} · {item.customer}</option>)}</select></label>}
            <p><strong>{context.customer}</strong><br />{context.vehicle}<br />Concern: {context.concern}</p>
            <p>{context.live ? "Read-only existing RO" : "Fictional review RO"}: {context.roNumber} · recorded RO version {context.roVersion}</p>
            <a href="/prototype/service-workspace?browse=1">Browse existing active ROs (read-only)</a>
            {initialContext && <p><a href="/prototype/service-workspace">Return to fictional review context</a></p>}
            {records.length > 0 && <ul>{records.map(item => <li key={item.id}><a href={`/prototype/service-workspace?repairOrderId=${encodeURIComponent(item.id)}`}>{item.label}</a></li>)}</ul>}
          </details>
          {state.editing ? <form onSubmit={present} key={`draft-${state.revisions.length}`}>
            <div className={styles.actions}><button type="button" onClick={importDraft}>Import saved Repair Explorer work</button><button type="button" onClick={addDiagnosis}>Add brake diagnosis</button></div>
            <p>Imported work does not confirm vehicle fitment. Diagnostic labor may overlap with repair labor: review scope before quoting.</p>
            {state.lines.map(line => <fieldset className={styles.workItem} key={line.id}><legend>{line.label}</legend><div className={styles.fields}><label className={styles.field}>Hours · {line.label}<input type="number" min="0" max="100" step="0.1" required value={line.hours ?? ""} onChange={event => updateLine(line.id, "hours", event.target.value)} /></label><label className={styles.field}>Parts ($) · {line.label}<input type="number" min="0" max="100000" step="0.01" required value={line.parts ?? ""} onChange={event => updateLine(line.id, "parts", event.target.value)} /></label><button type="button" aria-label={`Remove ${line.label}`} onClick={() => setState({ ...state, lines: state.lines.filter(item => item.id !== line.id) })}>Remove</button></div><p>Labor basis: {line.laborBasis === "MANUAL" ? "Staff-adjusted allowance" : line.laborBasis === "REPORTED_MEDIAN" ? "Technician-reported median; confirm configuration" : "Provisional planning allowance"}. Parts are an allowance, not a supplier quote.</p></fieldset>)}
            <label className={styles.field}>Shop hourly rate ($)<input type="number" min="0" max="1000" step="0.01" required value={state.rate} onChange={event => setState({ ...state, rate: Number(event.target.value) })} /></label>
            <label className={styles.field}>Scope / revision reason<input name="reason" maxLength={200} required placeholder="Explain proposed work or why this revision is needed" /></label>
            <label className={styles.check}><input name="applicability" type="checkbox" required />I reviewed vehicle configuration, scope, parts allowances and shared labor; these remain review estimates, not vehicle-specific labor standards.</label>
            <p className={styles.notice}>Subtotal only: tax, fees, discounts and outside services are not finalized. Not a customer-ready final quote.</p>
            <button className={styles.primary} disabled={!state.lines.length || totals.unpricedLines > 0}>Prepare immutable preview revision →</button>
          </form> : current && <>
            <h3>{context.roNumber} / preview v{current.version} · {money(current.subtotalCents)} before tax and fees</h3><p>{context.customer} · {context.vehicle}</p><p>Scope: {current.reason}<br />Valid until: {new Date(current.expiresAt).toLocaleString()}</p>
            {!decision ? <form key={current.id} onSubmit={recordDecision}>
              {current.lines.map(line => <fieldset className={styles.workItem} key={line.id}><legend>{line.label}</legend><p>{line.hours} labor hours × {money(Math.round(current.rate * 100))} + {money(Math.round(line.parts! * 100))} parts allowance = {money(current.lineItems.filter(item => item.key === `${line.id}:labor` || item.key === `${line.id}:parts`).reduce((sum, item) => sum + item.unitPriceCents, 0))}</p><label className={styles.field}>Decision · {line.label}<select aria-label={`Decision · ${line.label}`} name={`decision-${line.id}`} required defaultValue=""><option value="" disabled>Choose a decision</option><option value="APPROVED">Approve this work</option><option value="DECLINED">Decline this work</option><option value="DEFERRED">Defer for later</option></select></label></fieldset>)}
              <label className={styles.field}>Reviewer acting as customer<input name="name" maxLength={200} required /></label><label className={styles.field}>Recording staff<input name="staff" maxLength={200} required /></label><button className={styles.primary}>Record simulated decision →</button>
            </form> : <>
              <p className={styles.notice}>Recorded against preview v{current.version}: {money(decision.authorizedAmountCents)} approved subtotal · customer role: {decision.name} · staff: {decision.staff}. No actual customer authorization was captured.</p>
              <ul>{current.lines.map(line => <li key={line.id}>{line.label} — <strong>{decision.choices[line.id]}</strong></li>)}</ul>
              <form onSubmit={event => { event.preventDefault(); const data = new FormData(event.currentTarget); run(() => handoffApprovedWork(state, String(data.get("technician") ?? ""), Date.now())); }}><label className={styles.field}>Assign approved work to technician<input name="technician" maxLength={200} required /></label><button className={styles.primary} disabled={!decision.authorizedLineKeys.length}>Prepare approved jobs (preview only)</button></form>
              <ul>{state.handoffs.filter(item => item.revisionId === current.id).map(item => <li key={item.workId}>{item.description} → {item.technician} · preview job ready for review</li>)}</ul>
              <p>Declined and deferred work is excluded. Repeating handoff does not create duplicate preview jobs. These jobs are not dispatched to the separate brakes execution preview.</p>
            </>}
            <button type="button" onClick={() => run(() => reviseServiceEstimate(state))}>Create revision / supplemental scope</button><p>Changes copy scope only. All work must receive a new decision; previous approvals and handoffs are not carried forward.</p>
          </>}
        </section>
        <aside className={styles.card} aria-label="Connected job summary"><p className={styles.eyebrow}>ONE JOB · ONE CONTEXT</p><h2>{context.roNumber}</h2><p>{context.customer}<br />{context.vehicle}</p><dl><dt>Next action</dt><dd>{state.editing ? "Review and present scope" : decision ? "Hand off approved work only" : "Review each work item"}</dd><dt>Draft subtotal</dt><dd>{money(Math.round(totals.subtotal * 100))}{totals.unpricedLines > 0 && " · incomplete pricing"}</dd><dt>Current preview</dt><dd>{state.editing ? "Editing · prior approval cannot authorize this draft" : `Revision ${current?.version}`}</dd><dt>Record mode</dt><dd>{context.live ? "Read-only live context · session-only" : "Fictional review · session-only"}</dd></dl>
          <details><summary>Revision and decision history ({state.revisions.length})</summary>{state.revisions.map(revision => { const recorded = state.decisions.find(item => item.revisionId === revision.id); return <article key={revision.id}><h3>Preview v{revision.version} · {money(revision.subtotalCents)}</h3><p>{revision.reason}</p><ul>{revision.lines.map(line => <li key={line.id}>{line.label} · {recorded?.choices[line.id] ?? "No decision"}</li>)}</ul><p>{recorded ? `${recorded.name} · recorded by ${recorded.staff} · ${money(recorded.authorizedAmountCents)} approved subtotal` : "No decision recorded"}{revision.id !== current?.id && " · superseded for this preview"}</p></article>; })}</details>
          <details><summary>What is connected—and what is not</summary><p>Existing authenticated RO read services supply customer, vehicle and RO context. Estimate lines follow the existing versioned-estimate contract; revision copying uses the existing scope-copy helper.</p><p>Live writes, customer delivery, identity verification, legal authorization, tax finalization and actual job creation remain disabled. No new production record system was introduced.</p></details>
        </aside>
      </div><p className={styles.status} role="status" aria-live="polite">{status}</p><footer>Session-only review · no live mutations · refresh clears preview decisions and work · not a final customer estimate</footer>
    </main>
  </div>;
}
