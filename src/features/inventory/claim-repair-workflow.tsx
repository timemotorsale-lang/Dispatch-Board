"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowRight, ClipboardCheck, ExternalLink, Plus, RefreshCw, X } from "lucide-react";
import { CLAIM_CHECKPOINTS, CHECKPOINT_LABELS, claimWorkflowAlerts, claimWorkflowNextAction, currentCheckpoint, supplementResolved, workflowReleaseBlockers, type ClaimCheckpoint, type ClaimSupplement } from "@/lib/claim-repair-workflow";
import type { ClaimRepairWorkflowModel } from "@/server/claims-workspace/repair-workflow-service";
import styles from "./claim-repair-workflow.module.css";

const tabs = ["Overview", "Repair plan", "Parts", "Supplements", "QC & delivery", "Billing", "History"] as const;
type Tab = typeof tabs[number];
type ActionForm = { action: string; point?: ClaimCheckpoint; supplement?: ClaimSupplement };
const money = (cents: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
const label = (value: string) => value.replaceAll("_", " ").toLowerCase();
const dateLabel = (iso: string) => new Intl.DateTimeFormat("en-US", { timeZone: "America/Chicago", dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));
const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Chicago", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());

type WorkflowProps = { claimId: string; intakeTask?: { title: string; detail: string; actionLabel: string; ownerRole: string; dueLabel: string }; intakeReady?: boolean; onIntake?: () => void; onAuthorize?: () => void; onTools?: () => void; taskHref?: string; taskTitle?: string; continueHref?: string };
export function ClaimRepairWorkflow(props: WorkflowProps) {
  return <section className={styles.root} aria-label="Claim repair workflow">
    <WorkflowWorkbench key={props.claimId} {...props} />
  </section>;
}

function WorkflowWorkbench({ claimId, intakeTask, intakeReady = true, onIntake, onAuthorize, onTools, taskHref, taskTitle, continueHref }: WorkflowProps) {
  const [open, setOpen] = useState(false);
  const [model, setModel] = useState<ClaimRepairWorkflowModel | null>(null);
  const [tab, setTab] = useState<Tab>("Overview");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<ActionForm | null>(null);
  const [allAlerts, setAllAlerts] = useState(false);
  const requests = useRef(new Map<string, string>());
  const inFlight = useRef(false);
  const endpoint = `/api/claims-workspace/claims/${encodeURIComponent(claimId)}/workflow`;
  useEffect(() => {
    const controller = new AbortController();
    void fetch(endpoint, { signal: controller.signal, cache: "no-store" }).then(async (response) => {
      const body = await response.json();
      if (!response.ok) throw new Error(body.error);
      setModel(body);
      if (new URLSearchParams(window.location.search).get("workflow") === "next") { setOpen(true); setTab(claimWorkflowNextAction(body.state, body.source).view); }
    }).catch((caught) => { if (!controller.signal.aborted) setError(caught instanceof Error ? caught.message : "Workflow could not be loaded."); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [endpoint]);

  async function refresh() {
    setError(""); setLoading(true);
    try {
      const response = await fetch(endpoint, { cache: "no-store" }); const body = await response.json();
      if (!response.ok) throw new Error(body.error);
      setModel(body);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Refresh failed."); }
    finally { setLoading(false); }
  }
  async function save(input: Record<string, unknown>) {
    if (!model || inFlight.current) return;
    const payload = { ...input, expectedVersion: model.version, sourceVersion: model.sourceVersion };
    const signature = JSON.stringify(payload);
    const key = requests.current.get(signature) ?? crypto.randomUUID();
    requests.current.set(signature, key);
    inFlight.current = true; setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...payload, idempotencyKey: key }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error);
      setModel(body); setForm(null); setMessage("Workflow action recorded."); requests.current.clear();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Workflow action failed."); }
    finally { inFlight.current = false; setBusy(false); }
  }
  if (!model) return <div className={styles.notice}><h2>Next Action</h2>{loading ? <p role="status">Checking claim workflow...</p> : <><p role="alert">{error}</p><button onClick={() => void refresh()} type="button"><RefreshCw size={18} /> Retry workflow</button></>}{taskHref ? <a className={styles.secondary} href={taskHref} title={taskTitle}>View assigned task <ExternalLink size={16} /></a> : null}</div>;
  const { source, state } = model;
  const order = source.repairOrder;
  const returnTo = `/vehicles/claims-workspace?claimId=${encodeURIComponent(claimId)}`;
  const href = (path: string) => `${path}?${new URLSearchParams({ ...(order ? { repairOrderId: order.id } : { query: source.vin }), returnTo, returnLabel: "Return to claim" })}`;
  const repairHref = href("/vehicles/repair-workbench") + (!order ? "&compose=1" : "");
  const planningHref = href("/vehicles/shop-planning");
  const partsHref = href("/vehicles/parts-operations");
  const qcHref = href("/vehicles/quality-control");
  const billingHref = href("/vehicles/service-close-parts");
  const alerts = claimWorkflowAlerts(state, source, today());
  const blockers = workflowReleaseBlockers(state, source);
  const active = state.supplements.filter((item) => item.status !== "SUPERSEDED");
  const awaiting = active.filter((item) => !supplementResolved(item)).length;
  const next = claimWorkflowNextAction(state, source);
  const intakePending = !intakeReady && intakeTask && !source.claimClosed && !state.financialClose && next.label !== "Get claim authorization signed";
  function continueWorkflow() {
    if (next.label === "Get claim authorization signed" && onAuthorize) { onAuthorize(); return; }
    setOpen(true); setTab(next.view);
    if (next.point) setForm({ action: "CHECKPOINT", point: next.point });
    else if (next.action && (next.action === "DELIVERY" || model?.canDecide)) setForm({ action: next.action });
  }
  return <div>
    <header className={styles.launcher}><div><h2>{continueHref ? "Claim workflow" : "Next Action"}</h2><span className={styles.review}>Integration review</span></div>{!continueHref ? <button aria-expanded={open} onClick={() => { setOpen(!open); if (!open) setTab(next.view); }} type="button"><ClipboardCheck size={18} />{open ? "Hide workflow" : "View workflow"}</button> : null}</header>
    <div className={styles.nextAction}><h3>{intakePending ? intakeTask.title : next.label}</h3><p>{intakePending ? intakeTask.detail : next.reason}</p><div className={styles.actions}>
      {continueHref ? <a className={styles.primary} href={continueHref}>Continue claim workflow <ArrowRight size={18} /></a> : <button className={styles.primary} disabled={busy || loading || Boolean(intakePending && !onIntake)} onClick={intakePending ? onIntake : continueWorkflow} type="button">{intakePending ? intakeTask.actionLabel : next.label}<ArrowRight size={18} /></button>}
      {taskHref ? <a className={styles.secondary} href={taskHref} title={taskTitle}>View assigned task <ExternalLink size={16} /></a> : null}
      {onTools ? <button onClick={onTools} type="button">Extra Action Tools</button> : null}
      <button aria-label="Refresh claim workflow" title="Refresh workflow" disabled={busy || loading} onClick={() => void refresh()} type="button"><RefreshCw size={18} /></button>
    </div><small>Owner: {intakePending ? intakeTask.ownerRole : order?.owner ?? "Claim advisor"} · Due: {intakePending ? intakeTask.dueLabel : order ? dateLabel(order.targetAt) : "Now"}</small></div>
    {error ? <p className={styles.error} role="alert">{error}</p> : null}{message ? <p role="status">{message}</p> : null}
    {open && !continueHref ? <>
    <div className={styles.summary}><dl><div><dt>Repair order</dt><dd>{order?.number ?? "Not linked"}</dd></div><div><dt>Repair phase</dt><dd>{state.delivery ? "Delivered" : label(order?.stage ?? "Planning")}</dd></div><div><dt>Owner</dt><dd>{order?.owner ?? "Claim advisor"}</dd></div><div><dt>Target</dt><dd>{order ? dateLabel(order.targetAt) : "Not scheduled"}</dd></div><div><dt>Supplements</dt><dd>{awaiting} awaiting action</dd></div><div><dt>Financial close</dt><dd>{state.financialClose ? "Verified settlement recorded" : "Open"}</dd></div></dl></div>
    <nav className={styles.tabs} aria-label="Claim workflow views">{tabs.map((item) => <button aria-pressed={tab === item} key={item} onClick={() => setTab(item)} type="button">{item}{item === "Supplements" && awaiting ? ` (${awaiting})` : ""}</button>)}</nav>
    <div className={styles.content}>
    {tab === "Overview" ? <>
      {!order ? <><h3>Link repair order</h3><form className={styles.inlineForm} onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); void save({ action: "LINK_REPAIR_ORDER", repairOrderId: data.get("repairOrderId"), reason: "Linked matching repair order after claim review." }); }}><label>Matching open repair orders<select name="repairOrderId" required disabled={!source.candidates.length || busy}>{source.candidates.length ? <option value="">Select repair order</option> : <option value="">No matching repair order</option>}{source.candidates.map((candidate) => <option value={candidate.id} key={candidate.id}>{candidate.number} - {candidate.vehicle}</option>)}</select></label><button disabled={busy || !source.candidates.length} type="submit">Link repair order</button></form><a className={styles.link} href={repairHref}>Open repair intake <ExternalLink size={16} /></a></> : <a className={styles.link} href={repairHref}>Open {order.number} <ExternalLink size={16} /></a>}
      <h3>Workflow attention ({alerts.length})</h3>{alerts.length ? <ul className={styles.alerts}>{(allAlerts ? alerts : alerts.slice(0, 3)).map((alert) => <li key={alert}>{alert}</li>)}</ul> : <p>No outstanding workflow alerts.</p>}{alerts.length > 3 ? <button onClick={() => setAllAlerts(!allAlerts)} type="button">{allAlerts ? "Show fewer" : "Show all alerts"}</button> : null}
      <h3>Supplement checkpoints</h3><Checkpoints model={model} onReview={(point) => setForm({ action: "CHECKPOINT", point })} busy={busy} />
    </> : null}
    {tab === "Repair plan" ? <><div className={styles.sectionHeader}><h3>Approved scope and repair operations</h3>{order ? <a className={styles.link} href={planningHref}>Open repair planning <ExternalLink size={16} /></a> : null}</div><dl className={styles.facts}><div><dt>Customer authorization</dt><dd>{source.customerAuthorization ? "Supporting document received" : "Missing supporting document"}</dd></div><div><dt>Latest estimate</dt><dd>{source.estimates[0] ? `Version ${source.estimates[0].version} - ${money(source.estimates[0].totalCents)}` : "Not recorded"}</dd></div><div><dt>Repair authorization</dt><dd>{label(source.estimates[0]?.authorizations[0]?.disposition ?? "Pending")}</dd></div></dl><OperationTable model={model} /><button disabled={!order || busy} onClick={() => setForm({ action: "CHECKPOINT", point: "TEARDOWN" })} type="button">Review teardown findings</button><button disabled={!order || busy} onClick={() => setForm({ action: "CHECKPOINT", point: "REPAIR" })} type="button">Review repair changes</button></> : null}
    {tab === "Parts" ? <><div className={styles.sectionHeader}><h3>Parts procurement and receiving</h3>{order ? <a className={styles.link} href={partsHref}>Open parts operations <ExternalLink size={16} /></a> : null}</div><div className={styles.tableWrap}><table><thead><tr><th>Part</th><th>Required</th><th>Reserved</th><th>Status</th></tr></thead><tbody>{source.parts.map((part) => <tr key={part.id}><td>{part.number}<small>{part.description}</small></td><td>{part.required}</td><td>{part.reserved}</td><td>{label(part.status)}</td></tr>)}</tbody></table></div>{!source.parts.length ? <p>No parts demands recorded on this repair order.</p> : null}<h3>Purchase orders</h3><div className={styles.tableWrap}><table><thead><tr><th>Order / supplier</th><th>Status</th><th>Ordered</th><th>Received</th><th>Discrepancies</th></tr></thead><tbody>{source.orders.map((purchase) => <tr key={purchase.id}><td>{purchase.number}<small>{purchase.supplier}</small></td><td>{label(purchase.status)}</td><td>{money(purchase.orderedCents)}</td><td>{money(purchase.receivedCents)}</td><td>{purchase.discrepancyCount}</td></tr>)}</tbody></table></div><button disabled={!order || busy} onClick={() => setForm({ action: "CHECKPOINT", point: "PARTS" })} type="button">Review parts changes</button></> : null}
    {tab === "Supplements" ? <><div className={styles.sectionHeader}><h3>Supplement register</h3><button disabled={!source.estimates.length || busy || Boolean(state.delivery || state.financialClose)} onClick={() => setForm({ action: "CREATE_SUPPLEMENT" })} type="button"><Plus size={18} /> Create supplement</button></div>{order ? <a className={styles.link} href={planningHref}>Record estimate revision <ExternalLink size={16} /></a> : null}{!active.length ? <p>No supplements recorded.</p> : null}{active.map((supplement) => <article className={styles.supplement} key={supplement.id}><div className={styles.sectionHeader}><h4>Supplement {supplement.number}.{supplement.revision}</h4><strong>{label(supplement.status)}</strong></div><p>{supplement.reason}</p><dl className={styles.facts}><div><dt>Owner</dt><dd>{supplement.owner}</dd></div><div><dt>Follow-up</dt><dd>{supplement.followUpDate}</dd></div><div><dt>Requested change</dt><dd>{money(supplement.lines.reduce((sum, line) => sum + line.amountCents, 0))}</dd></div><div><dt>Approved change</dt><dd>{money(supplement.lines.filter((line) => supplement.approvedKeys.includes(line.key)).reduce((sum, line) => sum + line.amountCents, 0))}</dd></div></dl>{supplement.lines.length ? <ul>{supplement.lines.map((line) => <li key={line.key}>{line.description} - {money(line.amountCents)}{supplement.approvedKeys.includes(line.key) ? " - payer approved" : ""}</li>)}</ul> : null}<div className={styles.actions}>{supplement.status === "DRAFT" ? <button disabled={busy} onClick={() => setForm({ action: "SUBMIT_SUPPLEMENT", supplement })} type="button">Record submission</button> : null}{supplement.status === "SUBMITTED" && model.canDecide ? <button disabled={busy} onClick={() => setForm({ action: "DECIDE_SUPPLEMENT", supplement })} type="button">Record payer decision</button> : null}{["CHANGES_REQUESTED", "DENIED"].includes(supplement.status) ? <button disabled={busy} onClick={() => setForm({ action: "REVISE_SUPPLEMENT", supplement })} type="button">Create revised supplement</button> : null}{!supplementResolved(supplement) ? <button disabled={busy} onClick={() => setForm({ action: "FOLLOW_UP", supplement })} type="button">Record follow-up</button> : null}</div></article>)}</> : null}
    {tab === "QC & delivery" ? <><div className={styles.sectionHeader}><h3>Quality clearance and handover</h3>{order ? <a className={styles.link} href={qcHref}>Open QC inspections <ExternalLink size={16} /></a> : null}</div><OperationTable model={model} /><p>Quality release: <strong>{source.qualityRelease ? "Recorded" : "Not authorized"}</strong></p><button disabled={!order || busy} onClick={() => setForm({ action: "CHECKPOINT", point: "QC" })} type="button">Review QC findings</button>{state.delivery ? <p>Delivered to {state.delivery.recipient} at {dateLabel(state.delivery.at)}; mileage {state.delivery.mileage}.</p> : <><h3>Delivery readiness</h3>{blockers.length ? <ul className={styles.alerts}>{blockers.map((blocker) => <li key={blocker}>{blocker}</li>)}</ul> : <p>Quality and workflow release gates satisfied.</p>}<button disabled={busy || blockers.length > 0} onClick={() => setForm({ action: "DELIVERY" })} type="button">Record customer handover</button></>}</> : null}
    {tab === "Billing" ? <><div className={styles.sectionHeader}><h3>Billing and settlement</h3>{order ? <a className={styles.link} href={billingHref}>Open service closeout <ExternalLink size={16} /></a> : null}</div><dl className={styles.facts}><div><dt>Latest invoice package</dt><dd>{source.invoiceCount ? money(source.invoiceTotalCents) : "Not recorded"}</dd></div><div><dt>Repair authorization</dt><dd>{source.estimates[0]?.authorizations[0] ? money(source.estimates[0].authorizations[0].amountCents) : "Pending"}</dd></div><div><dt>Vehicle handover</dt><dd>{state.delivery ? "Recorded" : "Pending"}</dd></div></dl><button disabled={!order || busy} onClick={() => setForm({ action: "CHECKPOINT", point: "BILLING" })} type="button">Review invoice and supplements</button>{state.financialClose ? <p>Settlement verified by {state.financialClose.actor} at {dateLabel(state.financialClose.at)}.</p> : <button disabled={!model.canDecide || busy || !state.delivery || alerts.length > 0 || !source.invoiceCount} onClick={() => setForm({ action: "FINANCIAL_CLOSE" })} type="button">Record verified settlement</button>}</> : null}
    {tab === "Billing" && state.financialClose && model.canDecide ? <button disabled={busy} onClick={() => setForm({ action: "REOPEN" })} type="button">Reopen settlement review</button> : null}
    {tab === "History" ? <><h3>Workflow audit history</h3>{model.history.length ? <ol className={styles.history}>{model.history.map((event) => <li key={event.id}><strong>{label(event.action)}</strong><small>{event.actor} - {dateLabel(event.at)}</small><p>{event.reason}</p></li>)}</ol> : <p>No workflow actions recorded.</p>}</> : null}
    </div>
    </> : null}
    {form ? <WorkflowForm key={`${form.action}:${form.point ?? form.supplement?.id ?? "new"}`} form={form} model={model} busy={busy} error={error} onClose={() => setForm(null)} onSave={save} /> : null}
  </div>;
}
function Checkpoints({ model, onReview, busy }: { model: ClaimRepairWorkflowModel; onReview: (point: ClaimCheckpoint) => void; busy: boolean }) {
  return <div className={styles.checkpoints}>{CLAIM_CHECKPOINTS.map((point) => {
    const check = currentCheckpoint(model.state, model.source, point);
    return <div key={point}><strong>{CHECKPOINT_LABELS[point]}</strong><span>{check ? check.outcome === "NO_CHANGE" ? "No supplement needed" : "Supplement linked" : "Review required"}</span><button disabled={!model.source.repairOrder || busy || Boolean(model.state.financialClose)} onClick={() => onReview(point)} type="button">Review</button></div>;
  })}</div>;
}
function OperationTable({ model }: { model: ClaimRepairWorkflowModel }) {
  return <><div className={styles.tableWrap}><table><thead><tr><th>Operation</th><th>Technician</th><th>Status / blocker</th><th>Latest QC</th></tr></thead><tbody>{model.source.jobs.map((job) => <tr key={job.id}><td>{job.number}<small>{job.description}</small></td><td>{job.technician}</td><td>{label(job.status)}{job.blocker ? <small>{job.blocker}</small> : null}</td><td>{label(job.latestQc ?? "Not inspected")}</td></tr>)}</tbody></table></div>{!model.source.jobs.length ? <p>No authorized repair operations recorded.</p> : null}</>;
}
function WorkflowForm({ form, model, busy, error, onClose, onSave }: { form: ActionForm; model: ClaimRepairWorkflowModel; busy: boolean; error: string; onClose: () => void; onSave: (input: Record<string, unknown>) => Promise<void> }) {
  const [outcome, setOutcome] = useState("NO_CHANGE");
  const [decision, setDecision] = useState("APPROVED");
  const close = useRef<HTMLButtonElement>(null);
  useEffect(() => { const previous = document.activeElement as HTMLElement | null; close.current?.focus(); return () => previous?.focus(); }, []);
  const title = form.action === "CHECKPOINT" ? `${CHECKPOINT_LABELS[form.point!]} review` : label(form.action);
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const data = new FormData(event.currentTarget);
    void onSave({ ...Object.fromEntries(data.entries()), action: form.action, point: form.point, supplementId: form.supplement?.id ?? data.get("supplementId"), evidenceIds: data.getAll("evidenceIds"), approvedKeys: data.getAll("approvedKeys"), keysVerified: data.get("keysVerified") === "on", settlementConfirmed: data.get("settlementConfirmed") === "on" });
  }
  const needEvidence = ["SUBMIT_SUPPLEMENT", "DECIDE_SUPPLEMENT", "DELIVERY", "FINANCIAL_CLOSE"].includes(form.action);
  return <div className={styles.backdrop}><section className={styles.dialog} aria-modal="true" role="dialog" aria-label={title} onKeyDown={(event) => {
    if (event.key === "Escape" && !busy) onClose();
    if (event.key === "Tab") {
      const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled)')).filter((item) => item.tabIndex >= 0);
      if (event.shiftKey && document.activeElement === controls[0]) { event.preventDefault(); controls.at(-1)?.focus(); }
      else if (!event.shiftKey && document.activeElement === controls.at(-1)) { event.preventDefault(); controls[0]?.focus(); }
    }
  }}><header><h3>{title}</h3><button aria-label="Close workflow action" title="Close" ref={close} disabled={busy} onClick={onClose} type="button"><X size={18} /></button></header><form onSubmit={submit}>
    <fieldset disabled={busy}>
    {form.action === "CHECKPOINT" ? <><label>Finding<select name="outcome" value={outcome} onChange={(event) => setOutcome(event.target.value)}><option value="NO_CHANGE">No supplement needed</option><option value="SUPPLEMENT">Supplement required / linked</option></select></label>{outcome === "SUPPLEMENT" ? <label>Supplement<select name="supplementId" required><option value="">Select supplement</option>{model.state.supplements.filter((item) => item.status !== "SUPERSEDED").map((item) => <option value={item.id} key={item.id}>{item.number}.{item.revision} - {item.reason}</option>)}</select></label> : null}</> : null}
    {["CREATE_SUPPLEMENT", "REVISE_SUPPLEMENT", "SUBMIT_SUPPLEMENT", "FOLLOW_UP"].includes(form.action) ? <label>Follow-up date<input name="followUpDate" type="date" defaultValue={form.supplement?.followUpDate ?? today()} required /></label> : null}
    {form.action === "SUBMIT_SUPPLEMENT" ? <><label>Revised estimate<select name="estimateId" required><option value="">Select revised estimate</option>{model.source.estimates.filter((item) => item.version > (model.source.estimates.find((base) => base.id === form.supplement?.baseEstimateId)?.version ?? Infinity)).map((item) => <option value={item.id} key={item.id}>Version {item.version} - {money(item.totalCents)}</option>)}</select></label><label>Submitted to<input name="recipient" required maxLength={200} /></label></> : null}
    {form.action === "DECIDE_SUPPLEMENT" ? <><label>Payer decision<select name="status" value={decision} onChange={(event) => setDecision(event.target.value)}><option value="APPROVED">Approved</option><option value="PARTIALLY_APPROVED">Partially approved</option><option value="CHANGES_REQUESTED">Changes requested</option><option value="DENIED">Denied</option></select></label><label>Decision-maker<input name="decisionBy" required maxLength={200} /></label>{["APPROVED", "PARTIALLY_APPROVED"].includes(decision) ? <fieldset><legend>Approved supplement lines</legend>{form.supplement?.lines.map((line) => <label className={styles.checkbox} key={line.key}><input type="checkbox" name="approvedKeys" value={line.key} defaultChecked={decision === "APPROVED"} />{line.description} - {money(line.amountCents)}</label>)}</fieldset> : null}</> : null}
    {form.action === "DELIVERY" ? <><label>Receiving customer<input name="recipient" defaultValue={model.source.customer} required maxLength={200} /></label><label>Delivery mileage<input name="mileage" inputMode="numeric" pattern="[0-9]+" required maxLength={12} /></label><label className={styles.checkbox}><input name="keysVerified" type="checkbox" required />Keys verified</label></> : null}
    {form.action === "FINANCIAL_CLOSE" ? <label className={styles.checkbox}><input name="settlementConfirmed" type="checkbox" required />Settlement verified against payment evidence</label> : null}
    {needEvidence ? <fieldset><legend>Supporting claim evidence</legend>{model.source.evidence.filter((item) => form.action !== "FINANCIAL_CLOSE" || item.category === "PAYMENT").map((item) => <label className={styles.checkbox} key={item.id}><input type="checkbox" name="evidenceIds" value={item.id} />{item.title}</label>)}</fieldset> : null}
    <label>Reason / outcome<textarea name="reason" required minLength={10} maxLength={1000} rows={3} /></label>
    </fieldset>{error ? <p className={styles.error} role="alert">{error}</p> : null}<div className={styles.actions}><button disabled={busy} type="submit">{busy ? "Saving..." : "Record action"}</button><button disabled={busy} onClick={onClose} type="button">Cancel</button></div>
  </form></section></div>;
}
