"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { cents, moneyLabel, moneyToday } from "@/lib/money-resources";
import { dealDocumentHref, FINANCIAL_KINDS } from "@/lib/deal-dashboard-enterprise";
import type { DealOperationsView } from "@/server/sales-documents/dashboard-operations";
import type { SalesDocumentJacketView } from "@/server/sales-documents/service";
import { DealPathwayChange } from "./deal-pathway-change";
import { RentalOperationsPanel } from "./rental-operations-panel";
import styles from "./deal-draft-workspace.module.css";

export function DealOperationsDrawer({ deal, initialTab = "Documents", alerts = [], onClose, onChanged }: { deal: { draftId?: string | null; jacketId?: string | null; pathway?: string; customerName: string }; initialTab?: string; alerts?: string[]; onClose: () => void; onChanged: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null), pending = useRef<{ fingerprint: string; body: Record<string, unknown> } | null>(null);
  const [data, setData] = useState<DealOperationsView | null>(null), [packet, setPacket] = useState<SalesDocumentJacketView | null>(null);
  const [tab, setTab] = useState(deal.pathway === "daily-rental" && initialTab === "Documents" ? "Rental" : initialTab), [busy, setBusy] = useState(false), [loading, setLoading] = useState(true), [error, setError] = useState(""), [message, setMessage] = useState("");
  const [financialKind, setFinancialKind] = useState("PAYMENT");
  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true); setError("");
    try {
      const params = new URLSearchParams({ view: "operations", ...(deal.draftId ? { draftId: deal.draftId } : {}), ...(deal.jacketId ? { jacketId: deal.jacketId } : {}) });
      const response = await fetch(`/api/crm/v1/deal-drafts?${params}`, { signal }), body = await response.json();
      if (!response.ok) throw new Error(body.error || "Deal details could not be loaded.");
      let jacket = null;
      if (body.jacketId) { const response = await fetch(`/api/sales-documents/${encodeURIComponent(body.jacketId)}`, { signal }); jacket = await response.json(); if (!response.ok) throw new Error(jacket.error || "The packet could not be loaded."); }
      if (!signal?.aborted) { setData(body); setPacket(jacket); }
    } catch (caught) { if (!signal?.aborted) setError(caught instanceof Error ? caught.message : "Connection interrupted. Select Refresh to try again."); }
    finally { if (!signal?.aborted) setLoading(false); }
  }, [deal.draftId, deal.jacketId]);
  useEffect(() => { dialog.current?.showModal(); const controller = new AbortController(); const timer = setTimeout(() => void load(controller.signal), 0); return () => { clearTimeout(timer); controller.abort(); }; }, [load]);
  async function save(fields: Record<string, unknown>) {
    if (!data || busy || loading) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const fingerprint = JSON.stringify(fields);
      if (pending.current?.fingerprint !== fingerprint) pending.current = { fingerprint, body: { ...fields, draftId: data.draftId, jacketId: data.jacketId, draftRevision: data.draftRevision, jacketRevision: data.jacketRevision, operationKey: crypto.randomUUID() } };
      const response = await fetch("/api/crm/v1/deal-drafts", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(pending.current.body) }), body = await response.json();
      if (!response.ok) { if (response.status !== 503) pending.current = null; throw new Error(body.error || "The change could not be saved."); }
      pending.current = null;
      setMessage(fields.action === "DEAL_REASSIGN" ? "Owner changed. Existing reminders keep their assignees; create a follow-up for the new owner here." : fields.action === "DEAL_REMINDER" ? "Reminder saved on this exact deal and in Tasks." : "Verified record saved. No bank, card, custody or DMV action was initiated.");
      onChanged(); await load();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Connection interrupted. Retry the same entry; its operation reference prevents duplicates."); }
    finally { setBusy(false); }
  }
  const rental = (data?.pathway ?? deal.pathway) === "daily-rental";
  const field = (form: FormData, name: string) => String(form.get(name) || "");
  const badge = (dimension: "FUNDING" | "DELIVERY") => data?.milestones[dimension]?.state === "VERIFIED" ? "Verified" : data?.milestones[dimension]?.state === "NOT_REQUIRED" ? "Not required · reason recorded" : "Pending / not verified";
  return <dialog ref={dialog} className={`${styles.archiveDialog} ${styles.dealDrawer}`} aria-label={`Deal details · ${deal.customerName}`} onCancel={event => { if (busy) event.preventDefault(); else onClose(); }}>
    <header><div><h2>{deal.customerName}</h2><p>{data?.vehicleReference}</p></div><button disabled={busy} onClick={onClose}>Close</button></header>
    {alerts.length > 0 && <ul className={styles.dealFlags} aria-label="Deal follow-up flags">{alerts.map(alert => <li key={alert}>{alert}</li>)}</ul>}
    <div className={styles.tabs} role="tablist" aria-label="Deal detail sections" onKeyDown={event => { if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return; event.preventDefault(); const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]')); const current = buttons.findIndex(button => button.getAttribute("aria-selected") === "true"); const next = event.key === "Home" ? 0 : event.key === "End" ? buttons.length - 1 : (current + (event.key === "ArrowRight" ? 1 : -1) + buttons.length) % buttons.length; setTab(buttons[next].textContent || "Documents"); buttons[next].focus(); }}>{[...(rental ? ["Rental"] : []), "Documents", "Pathway", "Follow-ups", "Money", "History", ...(data?.canManage ? ["Manager"] : [])].map(label => <button key={label} id={`deal-detail-${label}`} role="tab" aria-controls="deal-details-panel" tabIndex={tab === label ? 0 : -1} aria-selected={tab === label} onClick={() => setTab(label)}>{label}</button>)}</div>
    <p><button disabled={busy || loading} onClick={() => { pending.current = null; void load(); }}>Refresh details</button></p>
    {loading && <p role="status">Loading this deal…</p>}{error && <p role="alert">{error}</p>}{message && <p role="status">{message}</p>}
    {!loading && data && <div id="deal-details-panel" role="tabpanel" aria-labelledby={`deal-detail-${tab}`}>
      {tab === "Pathway" && data.draftId && data.draftRevision !== null && <DealPathwayChange key={`${data.draftId}:${data.draftRevision}`} id={data.draftId} revision={data.draftRevision} pathway={data.pathway} status={data.draftStatus ?? undefined} disabled={!data.canEdit && !data.canManage} onSaved={() => { setMessage("Revenue pathway changed. Review the new terms and prepare the appropriate paperwork."); onChanged(); void load(); }} />}
      {tab === "Rental" && <><RentalOperationsPanel key={data.draftId} draftId={data.draftId} packetClosed={packet?.state === "CLOSED"} inactive={data.inactive} /><h3>Rental follow-ups</h3>{data.tasks.length ? <ul>{data.tasks.map(task => <li key={task.id}><Link href={`/tasks/${encodeURIComponent(task.id)}`}>{task.title}</Link> · {task.status.replaceAll("_", " ")} · {new Date(task.dueAt).toLocaleString()}</li>)}</ul> : <p>No return follow-up exists yet. Activation creates it automatically; review any legacy active rental missing a task.</p>}</>}
      {tab === "Documents" && <>
        <div className={styles.progressBadges}><span>Paperwork: {packet?.state === "CLOSED" ? "Finalized" : "Pending"}</span>{!rental && <><span>Funding: {badge("FUNDING")}</span><span>Delivery: {badge("DELIVERY")}</span></>}{rental && <span>Actual checkout and return: see Rental Operations</span>}</div>
        {!packet ? <p>Prepare the paperwork checklist on this existing deal to begin adding documents.</p> : <><h3>{packet.phase === "RETURN" ? "Vehicle return" : packet.phase === "CHECKOUT" ? "Checkout" : "Closing"} documents</h3><ul className={styles.documentChecklist}>{packet.checklist.map(item => <li key={item.id}><strong>{item.label}</strong><span>{item.waiver ? `Approved exception: ${item.waiver.reason}` : item.ready ? "Reviewed" : item.required ? item.blocker : "Optional / if applicable"}</span><Link href={dealDocumentHref(packet.id, item.id)}>{item.ready ? "Review saved document" : "Upload / correct this item"}</Link></li>)}</ul><Link href={dealDocumentHref(packet.id)}>Open full packet</Link></>}
      </>}
      {tab === "Follow-ups" && <>
        <h3>{rental ? "Rental return, coverage and customer follow-ups" : "Deal-specific reminders"}</h3><p>These follow-ups belong to this deal. General customer reminders remain in Tasks.</p>
        {data.tasks.length ? <ul className={styles.documentChecklist}>{data.tasks.map(task => <li key={task.id}><Link href={`/tasks/${encodeURIComponent(task.id)}`}>{task.title}</Link><span>{task.ownerName} · {task.status.replaceAll("_", " ")} · {new Date(task.dueAt).toLocaleString("en-US", { timeZone: "America/Chicago" })} Central</span></li>)}</ul> : <p>No reminders recorded on this deal.</p>}
        {!data.inactive && <form onSubmit={event => { event.preventDefault(); const form = new FormData(event.currentTarget); void save({ action: "DEAL_REMINDER", title: field(form, "title"), dueAt: new Date(field(form, "dueAt")).toISOString(), assignedUserId: field(form, "assignedUserId"), priority: field(form, "priority"), reason: field(form, "reason") }); }}>
          <h3>Add reminder</h3><label>Next action<input name="title" required minLength={3} maxLength={240} /></label><label>Due date and time · your local time<input name="dueAt" type="datetime-local" required /></label>
          {data.canManage && <label>Assigned staff<select name="assignedUserId" defaultValue={data.ownerId}>{data.staff.map(person => <option key={person.id} value={person.id}>{person.name}</option>)}</select></label>}
          <label>Priority<select name="priority"><option value="MEDIUM">Normal</option><option value="HIGH">High</option></select></label><label>Notes<textarea name="reason" maxLength={1000} /></label><button disabled={busy}>Save deal reminder</button>
        </form>}
      </>}
      {tab === "Money" && <>
        <h3>Recorded financial activity</h3>{data.inactive && <p>This deal remains inactive. Managers may record verified financial corrections without reopening it.</p>}<p>Verified records only. This does not process payments or initiate refunds. An unwind request does not reverse money.</p>
        <dl className={styles.reportTotals}><div><dt>Recorded agreed amount</dt><dd>{data.financials.agreedCents === null ? "Not recorded" : moneyLabel(data.financials.agreedCents)}</dd></div><div><dt>Current net collected</dt><dd>{moneyLabel(data.financials.netCents)}</dd></div><div><dt>Current outstanding</dt><dd>{data.financials.outstandingCents === null ? "Agreed amount needed" : moneyLabel(data.financials.outstandingCents)}</dd></div>{data.financials.creditCents > 0 && <div><dt>Customer credit · review required</dt><dd>{moneyLabel(data.financials.creditCents)}</dd></div>}</dl>
        {data.financialEntries.length ? <ul className={styles.documentChecklist}>{data.financialEntries.map(entry => <li key={entry.id}><strong>{FINANCIAL_KINDS[entry.kind]} · {moneyLabel(entry.amountCents)}</strong><span>{entry.businessDate} · {entry.reference} · {entry.actorName}</span>{entry.originalId && <span>Original: {data.financialEntries.find(original => original.id === entry.originalId)?.reference || entry.originalId}</span>}<span>Evidence: {entry.evidence}</span><span>Reason: {entry.reason}</span></li>)}</ul> : <p>No verified financial activity has been recorded for this packet. Draft values are not treated as receipts.</p>}
        {data.canManage && data.jacketId && <form onSubmit={event => { event.preventDefault(); const form = new FormData(event.currentTarget); try { void save({ action: "DEAL_FINANCIAL", kind: field(form, "kind"), amountCents: cents(field(form, "amount"), field(form, "kind") === "AGREED_AMOUNT"), businessDate: field(form, "businessDate"), originalId: field(form, "originalId") || null, reference: field(form, "reference"), evidence: field(form, "evidence"), reason: field(form, "reason"), confirmed: form.get("confirmed") === "on" }); } catch (caught) { setError(caught instanceof Error ? caught.message : "Enter a valid dollar amount."); } }}>
          <h3>Record verified activity</h3><p>For an agreed amount, record the verified total obligation. A documented cancellation may reduce it to zero; prior records remain in history.</p><label>Activity type<select name="kind" value={financialKind} onChange={event => setFinancialKind(event.target.value)}>{Object.entries(FINANCIAL_KINDS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
          <label>Amount · USD<input name="amount" inputMode="decimal" required placeholder="500.00" /></label><label>Business date<input name="businessDate" type="date" required defaultValue={moneyToday()} max={moneyToday()} /></label>
          {["REFUND", "REVERSAL"].includes(financialKind) && <label>Original transaction<select name="originalId" required><option value="">Choose the original record</option>{data.financialEntries.filter(entry => entry.kind === "PAYMENT" || financialKind === "REVERSAL" && entry.kind === "REFUND").map(entry => <option key={entry.id} value={entry.id}>{entry.reference} · {FINANCIAL_KINDS[entry.kind]} · {moneyLabel(entry.amountCents)}</option>)}</select></label>}
          <label>Receipt / bank / contract reference<input name="reference" required maxLength={240} /></label><label>Supporting evidence reference<textarea name="evidence" required minLength={10} maxLength={1000} /></label><label>Reason<textarea name="reason" required minLength={10} maxLength={1000} /></label><label><input name="confirmed" type="checkbox" required /> I verified this record against its original supporting evidence.</label><button disabled={busy}>Record verified activity</button>
        </form>}
      </>}
      {tab === "History" && <><h3>Deal activity history</h3>{data.history.length ? <ol className={styles.documentChecklist}>{data.history.filter(event => !["DEAL_REMINDER", "DEAL_REASSIGN", "DEAL_FINANCIAL", "DEAL_MILESTONE"].includes(event.action)).map(event => <li key={event.id}><strong>{event.action.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, character => character.toUpperCase())}</strong><span>{event.actorName} · {new Date(event.at).toLocaleString("en-US", { timeZone: "America/Chicago" })} Central</span><span>{event.note}</span></li>)}</ol> : <p>No recorded changes yet.</p>}</>}
      {tab === "Manager" && data.canManage && <>
        {!data.inactive && data.draftId && <form onSubmit={event => { event.preventDefault(); const form = new FormData(event.currentTarget); void save({ action: "DEAL_REASSIGN", assignedUserId: field(form, "assignedUserId"), reason: field(form, "reason") }); }}><h3>Assign deal owner</h3><p>Transfers this saved draft to staff who already have access to its customer. If needed, assign customer ownership in Customer 360 first. Existing reminders retain their assignees.</p><label>Owner<select name="assignedUserId" defaultValue={data.ownerId}>{data.staff.map(person => <option key={person.id} value={person.id} disabled={person.canOwnDeal === false}>{person.name}{person.canOwnDeal === false ? " · customer access needed" : ""}</option>)}</select></label><label>Reason<textarea name="reason" required minLength={10} maxLength={1000} /></label><button disabled={busy}>Save deal owner</button></form>}
        {!rental && !data.inactive && data.jacketId && <form onSubmit={event => { event.preventDefault(); const form = new FormData(event.currentTarget); void save({ action: "DEAL_MILESTONE", dimension: field(form, "dimension"), state: field(form, "state"), reference: field(form, "reference"), reason: field(form, "reason") }); }}><h3>Funding / delivery verification</h3><p>Record supporting evidence or an explained exception. This does not release a vehicle, process funds, or finalize paperwork.</p><label>Milestone<select name="dimension"><option value="FUNDING">Funding</option><option value="DELIVERY">Delivery</option></select></label><label>State<select name="state"><option value="PENDING">Pending</option><option value="VERIFIED">Verified</option><option value="NOT_REQUIRED">Not required · reason recorded</option></select></label><label>Verification reference<input name="reference" maxLength={240} /></label><label>Reason<textarea name="reason" required minLength={10} maxLength={1000} /></label><button disabled={busy}>Save milestone review</button></form>}
      </>}
    </div>}
  </dialog>;
}
