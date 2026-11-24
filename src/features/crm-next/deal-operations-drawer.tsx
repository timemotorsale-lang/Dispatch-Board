"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { dealGroup } from "@/lib/deal-dashboard";
import { cents, moneyLabel, moneyToday } from "@/lib/money-resources";
import { FINANCIAL_KINDS } from "@/lib/deal-dashboard-enterprise";
import { isRentalPathway, RENTAL_OPERATIONS_CHANGED, rentalTime, type RentalWork } from "@/lib/rental-operations";
import type { DealOperationsView } from "@/server/sales-documents/dashboard-operations";
import type { SalesDocumentJacketView } from "@/server/sales-documents/service";
import { DealDocumentWorkspace } from "@/features/sales-documents/deal-document-workspace";
import { DealPathwayChange, type DealPathwayChangeResult } from "./deal-pathway-change";
import { DEAL_WORK_AREAS, dealAreaAfterPathwayChange } from "@/lib/deal-work-areas";
import { RentalOperationsPanel } from "./rental-operations-panel";
import { DealRepairHistory } from "./deal-repair-history";
import styles from "./deal-draft-workspace.module.css";

export function DealOperationsDrawer({ deal, initialTab = "Documents", alerts = [], onClose, onChanged, onPathwayChanged, onFindEditableDeal }: { deal: { draftId?: string | null; jacketId?: string | null; pathway?: string; customerName: string; customerId?: string | null; rental?: RentalWork | null }; initialTab?: string; alerts?: string[]; onClose: () => void; onChanged: () => void; onPathwayChanged?: (result: DealPathwayChangeResult) => void; onFindEditableDeal?: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null), pending = useRef<{ fingerprint: string; body: Record<string, unknown> } | null>(null);
  const [data, setData] = useState<DealOperationsView | null>(null), [packet, setPacket] = useState<SalesDocumentJacketView | null>(null);
  const [tab, setTab] = useState(isRentalPathway(deal.pathway) && initialTab === "Documents" ? "Rental" : initialTab), [busy, setBusy] = useState(false), [loading, setLoading] = useState(true), [error, setError] = useState(""), [message, setMessage] = useState("");
  const [financialKind, setFinancialKind] = useState("PAYMENT");
  const [updatedDraft, setUpdatedDraft] = useState<DealPathwayChangeResult | null>(null);
  const load = useCallback(async (signal?: AbortSignal, background = false) => {
    if (!background) { setLoading(true); setError(""); }
    try {
      const params = new URLSearchParams({ view: "operations", ...(deal.draftId ? { draftId: deal.draftId } : deal.jacketId ? { jacketId: deal.jacketId } : {}) });
      const response = await fetch(`/api/crm/v1/deal-drafts?${params}`, { signal, cache: "no-store" }), body = await response.json();
      if (!response.ok) throw new Error(body.error || "Deal details could not be loaded.");
      if (!signal?.aborted) { setData(body); setPacket(current => current?.id === body.jacketId ? current : null); }
      if (body.jacketId && body.pathway !== "repairs") { const response = await fetch(`/api/sales-documents/${encodeURIComponent(body.jacketId)}`, { signal, cache: "no-store" }); const jacket = await response.json(); if (!response.ok) throw new Error(jacket.error || "The packet could not be loaded."); if (!signal?.aborted) setPacket(jacket); }
    } catch (caught) { if (!signal?.aborted) setError(caught instanceof Error ? caught.message : "Connection interrupted. Select Refresh to try again."); }
    finally { if (!background && !signal?.aborted) setLoading(false); }
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
  async function prepareDocuments() {
    if (!data?.draftId || busy) return;
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/crm/v1/deal-drafts", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "PREPARE_PAPERWORK", id: data.draftId, revision: data.draftRevision }) });
      const result = await response.json(); if (!response.ok) throw new Error(result.error || "The checklist could not be prepared.");
      onChanged(); await load();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Refresh and retry preparing this deal's checklist."); }
    finally { setBusy(false); }
  }
  const repair = (data?.pathway ?? deal.pathway) === "repairs";
  const repairIntakeHref = data?.draftId && !data.inactive && data.canEdit
    ? `/crm-next/deals/start?${new URLSearchParams({ draftId: data.draftId, section: "terms" })}`
    : null;
  const rental = isRentalPathway(data?.pathway ?? deal.pathway);
  const closedReturn = packet?.versions.findLast(version => version.phase === "RETURN" && version.disposition === "CLOSED");
  useEffect(() => {
    if (!rental || busy || tab !== "Rental") return;
    let controller: AbortController | undefined;
    const refresh = () => {
      if (document.visibilityState !== "visible") return;
      controller?.abort();
      controller = new AbortController();
      void load(controller.signal, true);
    };
    window.addEventListener("focus", refresh);
    window.addEventListener(RENTAL_OPERATIONS_CHANGED, refresh);
    return () => {
      controller?.abort();
      window.removeEventListener("focus", refresh);
      window.removeEventListener(RENTAL_OPERATIONS_CHANGED, refresh);
    };
  }, [rental, busy, tab, load]);
  const packetId = data?.jacketId || deal.jacketId;
  function focusDocuments() {
    setTab("Documents");
    dialog.current?.querySelector<HTMLButtonElement>("#deal-detail-Documents")?.focus();
  }
  const dealHistory = data?.history.filter(event => !["DEAL_REMINDER", "DEAL_REASSIGN", "DEAL_FINANCIAL", "DEAL_MILESTONE"].includes(event.action)) ?? [];
  const field = (form: FormData, name: string) => String(form.get(name) || "");
  const badge = (dimension: "FUNDING" | "DELIVERY" | "TITLE") => data?.milestones[dimension]?.state === "VERIFIED" ? "Verified" : data?.milestones[dimension]?.state === "NOT_REQUIRED" ? "Not required · reason recorded" : "Pending / not verified";
  return <dialog ref={dialog} className={`${styles.archiveDialog} ${styles.dealDrawer}`} aria-label={`Deal details · ${deal.customerName}`} onCancel={event => { if (busy) event.preventDefault(); else onClose(); }}>
    <header><div><h2>{deal.customerName}</h2><p>{data?.vehicleReference}</p></div><button disabled={busy} onClick={onClose}>Close</button></header>
    {alerts.length > 0 && <ul className={styles.dealFlags} aria-label="Deal follow-up flags">{alerts.map(alert => <li key={alert}>{alert}</li>)}</ul>}
    <div className={styles.tabs} role="tablist" aria-label="Deal detail sections" onKeyDown={event => { if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return; event.preventDefault(); const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]')); const current = buttons.findIndex(button => button.getAttribute("aria-selected") === "true"); const next = event.key === "Home" ? 0 : event.key === "End" ? buttons.length - 1 : (current + (event.key === "ArrowRight" ? 1 : -1) + buttons.length) % buttons.length; setTab(buttons[next].textContent || "Documents"); buttons[next].focus(); }}>{[...(rental ? ["Rental"] : []), "Documents", "Completion", "Pathway", "Follow-ups", "Money", "History", ...(data?.canManage ? ["Manager"] : [])].map(label => <button key={label} id={`deal-detail-${label}`} role="tab" aria-controls="deal-details-panel" tabIndex={tab === label ? 0 : -1} aria-selected={tab === label} onClick={() => setTab(label)}>{label}</button>)}</div>
    <p><button disabled={busy || loading} onClick={() => { pending.current = null; void load(); }}>Refresh details</button></p>
    {loading && <p role="status">Loading this deal…</p>}{error && <p role="alert">{error}</p>}{message && <p role="status">{message}</p>}
    {updatedDraft && <p><Link href={`/crm-next/deals/start?draftId=${encodeURIComponent(updatedDraft.id)}`}>Open updated deal</Link></p>}
    {repair && tab === "Documents" && <div id="deal-details-panel" role="tabpanel" aria-labelledby="deal-detail-Documents">
      <DealRepairHistory customerId={deal.customerId ?? undefined} requireCustomer />
      {packetId && <p><Link href={`/sales-documents?jacketId=${encodeURIComponent(packetId)}`}>Open existing deal packet</Link></p>}
    </div>}
    {!loading && data && !(repair && tab === "Documents") && <div id="deal-details-panel" role="tabpanel" aria-labelledby={`deal-detail-${tab}`}>
      {tab === "Pathway" && (repair && data.inactive ? <p>This repair deal is inactive. Its pathway and saved work are preserved.</p> : data.draftId && data.draftRevision !== null ? <DealPathwayChange key={`${data.draftId}:${data.draftRevision}`} id={data.draftId} revision={data.draftRevision} pathway={data.pathway} status={data.draftStatus ?? undefined} disabled={!data.canEdit && !data.canManage} onSaved={result => {
        setUpdatedDraft(result);
        setMessage(`Pathway changed. You can find this same deal in ${DEAL_WORK_AREAS[dealAreaAfterPathwayChange(result.pathway)]}.`);
        if (onPathwayChanged) onPathwayChanged(result); else onChanged();
        void load();
      }} /> : <><p>This row is a saved paperwork packet. Open the editable deal to change its pathway.</p>{onFindEditableDeal && <button type="button" onClick={onFindEditableDeal}>Find editable deal</button>}</>)}
      {tab === "Rental" && <><RentalOperationsPanel key={data.draftId} draftId={data.draftId} pathway={data.pathway} packetClosed={packet?.state === "CLOSED"} closedReturns={packet && closedReturn ? [{ jacketId: packet.id, finalizedAt: closedReturn.finalizedAt }] : []} cancelled={data.draftStatus === "CANCELLED"} inactive={data.inactive} canAct={data.canEdit || data.canManage} fallback={deal.rental} /><h3>Return follow-ups</h3>{data.tasks.length ? <ul>{data.tasks.map(task => <li key={task.id}><Link href={`/tasks/${encodeURIComponent(task.id)}`}>{task.title}</Link> · {task.status.replaceAll("_", " ")} · {rentalTime(task.dueAt)}</li>)}</ul> : <p>No return follow-up is recorded.</p>}</>}
      {!repair && tab === "Documents" && <>
        <div className={styles.progressBadges}><span>Paperwork: {packet?.state === "CLOSED" ? "Finalized" : "Pending"}</span>{!rental && <><span>Funding: {badge("FUNDING")}</span><span>Delivery: {badge("DELIVERY")}</span><span>Title: {badge("TITLE")}</span></>}{rental && <span>Actual checkout and return: see Rental Operations</span>}</div>
        {!packet ? <div><p>Prepare the paperwork checklist on this existing deal to begin adding documents.</p>{data.draftId && !data.inactive && (data.canEdit || data.canManage) && ["SALES", "LEASING"].includes(dealGroup(data.pathway)) && <button type="button" disabled={busy} onClick={() => void prepareDocuments()}>Prepare required document checklist</button>}</div> : <DealDocumentWorkspace key={packet.id} jacket={packet} canManage={data.canManage} disabled={busy} onBusyChange={setBusy} onSaved={next => { setPacket(next); setData(current => current ? { ...current, jacketRevision: next.revision } : current); onChanged(); }} />}

      </>}
      {!repair && tab === "Documents" && packet && <p><Link href={`/sales-documents?jacketId=${encodeURIComponent(packet.id)}`}>Review finalization &amp; packet history</Link></p>}
      {tab === "Follow-ups" && <>
        <h3>{rental ? "Rental return, coverage and customer follow-ups" : "Deal-specific reminders"}</h3><p>These follow-ups belong to this deal. General customer reminders remain in Tasks.</p>
        {data.tasks.length ? <ul className={styles.documentChecklist}>{data.tasks.map(task => <li key={task.id}><Link href={`/tasks/${encodeURIComponent(task.id)}`}>{task.title}</Link><span>{task.ownerName} · {task.status.replaceAll("_", " ")} · {new Date(task.dueAt).toLocaleString("en-US", { timeZone: "America/Chicago" })} Central</span></li>)}</ul> : <p>No reminders recorded on this deal.</p>}
        {!data.inactive && (data.canEdit || data.canManage) && <form onSubmit={event => { event.preventDefault(); const form = new FormData(event.currentTarget); void save({ action: "DEAL_REMINDER", title: field(form, "title"), dueAt: new Date(field(form, "dueAt")).toISOString(), assignedUserId: field(form, "assignedUserId"), priority: field(form, "priority"), reason: field(form, "reason") }); }}>
          <h3>Add reminder</h3><label>Next action<input name="title" required minLength={3} maxLength={240} /></label><label>Due date and time · your local time<input name="dueAt" type="datetime-local" required /></label>
          {data.canManage && <label>Assigned staff<select name="assignedUserId" defaultValue={data.ownerId}>{data.staff.map(person => <option key={person.id} value={person.id}>{person.name}</option>)}</select></label>}
          <label>Priority<select name="priority"><option value="MEDIUM">Normal</option><option value="HIGH">High</option></select></label><label>Notes<textarea name="reason" maxLength={1000} /></label><button disabled={busy}>Save deal reminder</button>
        </form>}
      </>}
      {repair && tab === "Money" && <>
        <p>Repair invoices and payments are recorded on the repair order.</p>
        <button type="button" onClick={focusDocuments}>Find invoices and receipts</button>
      </>}
      {tab === "Money" && (!repair || data.financialEntries.length > 0) && <>
        <h3>{repair ? "Existing deal financial records" : "Recorded financial activity"}</h3>{data.inactive && <p>This deal remains inactive. Managers may record verified financial corrections without reopening it.</p>}<p>Verified records only. This does not process payments or initiate refunds. An unwind request does not reverse money.</p>
        <dl className={styles.reportTotals}><div><dt>Recorded agreed amount</dt><dd>{data.financials.agreedCents === null ? "Not recorded" : moneyLabel(data.financials.agreedCents)}</dd></div><div><dt>Current net collected</dt><dd>{moneyLabel(data.financials.netCents)}</dd></div><div><dt>Current outstanding</dt><dd>{data.financials.outstandingCents === null ? "Agreed amount needed" : moneyLabel(data.financials.outstandingCents)}</dd></div>{data.financials.creditCents > 0 && <div><dt>Customer credit · review required</dt><dd>{moneyLabel(data.financials.creditCents)}</dd></div>}</dl>
        {data.financialEntries.length ? <ul className={styles.documentChecklist}>{data.financialEntries.map(entry => <li key={entry.id}><strong>{FINANCIAL_KINDS[entry.kind]} · {moneyLabel(entry.amountCents)}</strong><span>{entry.businessDate} · {entry.reference} · {entry.actorName}</span>{entry.originalId && <span>Original: {data.financialEntries.find(original => original.id === entry.originalId)?.reference || entry.originalId}</span>}<span>Evidence: {entry.evidence}</span><span>Reason: {entry.reason}</span></li>)}</ul> : <p>No verified financial activity has been recorded for this packet. Draft values are not treated as receipts.</p>}
        {!repair && data.canManage && data.jacketId && <form onSubmit={event => { event.preventDefault(); const form = new FormData(event.currentTarget); try { void save({ action: "DEAL_FINANCIAL", kind: field(form, "kind"), amountCents: cents(field(form, "amount"), field(form, "kind") === "AGREED_AMOUNT"), businessDate: field(form, "businessDate"), originalId: field(form, "originalId") || null, reference: field(form, "reference"), evidence: field(form, "evidence"), reason: field(form, "reason"), confirmed: form.get("confirmed") === "on" }); } catch (caught) { setError(caught instanceof Error ? caught.message : "Enter a valid dollar amount."); } }}>
          <h3>Record verified activity</h3><p>For an agreed amount, record the verified total obligation. A documented cancellation may reduce it to zero; prior records remain in history.</p><label>Activity type<select name="kind" value={financialKind} onChange={event => setFinancialKind(event.target.value)}>{Object.entries(FINANCIAL_KINDS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
          <label>Amount · USD<input name="amount" inputMode="decimal" required placeholder="500.00" /></label><label>Business date<input name="businessDate" type="date" required defaultValue={moneyToday()} max={moneyToday()} /></label>
          {["REFUND", "REVERSAL"].includes(financialKind) && <label>Original transaction<select name="originalId" required><option value="">Choose the original record</option>{data.financialEntries.filter(entry => entry.kind === "PAYMENT" || financialKind === "REVERSAL" && entry.kind === "REFUND").map(entry => <option key={entry.id} value={entry.id}>{entry.reference} · {FINANCIAL_KINDS[entry.kind]} · {moneyLabel(entry.amountCents)}</option>)}</select></label>}
          <label>Receipt / bank / contract reference<input name="reference" required maxLength={240} /></label><label>Supporting evidence reference<textarea name="evidence" required minLength={10} maxLength={1000} /></label><label>Reason<textarea name="reason" required minLength={10} maxLength={1000} /></label><label><input name="confirmed" type="checkbox" required /> I verified this record against its original supporting evidence.</label><button disabled={busy}>Record verified activity</button>
        </form>}
      </>}
      {repair && tab === "Completion" && <>
        <h3>Repair handoff</h3><p>Open the repair order to review authorization, work progress, quality checks and closeout.</p>
        {repairIntakeHref && <p><Link href={repairIntakeHref}>Continue repair intake</Link></p>}
        <button type="button" onClick={focusDocuments}>Find saved repair work</button>
      </>}
      {!repair && tab === "Completion" && <><h3>Delivery, funding and title</h3><p>Each check is recorded separately from the sale and its finalized documents.</p><div className={styles.progressBadges}><span>Funding: {badge("FUNDING")}</span><span>Delivery: {badge("DELIVERY")}</span><span>Title: {badge("TITLE")}</span></div>{!data.canManage && <p>A manager can record verification evidence here. You can review documents and set follow-ups in the other sections.</p>}
        {data.canManage && !rental && !data.inactive && data.jacketId && <form onSubmit={event => { event.preventDefault(); const form = new FormData(event.currentTarget); void save({ action: "DEAL_MILESTONE", dimension: field(form, "dimension"), state: field(form, "state"), reference: field(form, "reference"), reason: field(form, "reason") }); }}><h3>Funding / delivery / title verification</h3><p>Record supporting evidence or an explained exception. This does not release a vehicle, process funds, or finalize paperwork.</p><label>Milestone<select name="dimension"><option value="FUNDING">Funding</option><option value="DELIVERY">Delivery</option><option value="TITLE">Title / registration</option></select></label><label>State<select name="state"><option value="PENDING">Pending</option><option value="VERIFIED">Verified</option><option value="NOT_REQUIRED">Not required · reason recorded</option></select></label><label>Verification reference<input name="reference" maxLength={240} /></label><label>Reason<textarea name="reason" required minLength={10} maxLength={1000} /></label><button disabled={busy}>Save milestone review</button></form>}</>}
      {tab === "History" && <>{deal.customerId ? <DealRepairHistory key={deal.customerId} customerId={deal.customerId} /> : null}<h3>Deal activity history</h3>{dealHistory.length ? <ol className={styles.documentChecklist}>{dealHistory.map(event => <li key={event.id}><strong>{event.action.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, character => character.toUpperCase())}</strong><span>{event.actorName} · {new Date(event.at).toLocaleString("en-US", { timeZone: "America/Chicago" })} Central</span><span>{event.note}</span></li>)}</ol> : <p>No recorded changes yet.</p>}</>}
      {tab === "Manager" && data.canManage && <>
        {!data.inactive && data.draftId && <form onSubmit={event => { event.preventDefault(); const form = new FormData(event.currentTarget); void save({ action: "DEAL_REASSIGN", assignedUserId: field(form, "assignedUserId"), reason: field(form, "reason") }); }}><h3>Assign deal owner</h3><p>Transfers this saved draft to staff who already have access to its customer. If needed, assign customer ownership in Customer 360 first. Existing reminders retain their assignees.</p><label>Owner<select name="assignedUserId" defaultValue={data.ownerId}>{data.staff.map(person => <option key={person.id} value={person.id} disabled={person.canOwnDeal === false}>{person.name}{person.canOwnDeal === false ? " · customer access needed" : ""}</option>)}</select></label><label>Reason<textarea name="reason" required minLength={10} maxLength={1000} /></label><button disabled={busy}>Save deal owner</button></form>}

      </>}
    </div>}
  </dialog>;
}
