"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { dealGroup } from "@/lib/deal-dashboard";
import { cents, moneyLabel, moneyToday } from "@/lib/money-resources";
import { FINANCIAL_KINDS } from "@/lib/deal-dashboard-enterprise";
import { RENTAL_PAYMENT_METHODS, rentalReceiptHref, type RentalPaymentMethod } from "@/lib/rental-payment";
import { isRentalPathway, RENTAL_OPERATIONS_CHANGED, rentalTime, type RentalWork } from "@/lib/rental-operations";
import type { DealOperationsView } from "@/server/sales-documents/dashboard-operations";
import type { SalesDocumentJacketView } from "@/server/sales-documents/service";
import { DealDocumentWorkspace } from "@/features/sales-documents/deal-document-workspace";
import { DealPathwayChange, type DealPathwayChangeResult } from "./deal-pathway-change";
import { DEAL_WORK_AREAS, dealAreaAfterPathwayChange } from "@/lib/deal-work-areas";
import { RentalOperationsPanel } from "./rental-operations-panel";
import { DealRepairHistory } from "./deal-repair-history";
import styles from "./deal-draft-workspace.module.css";

type RentalActivity = NonNullable<DealOperationsView["rentalActivity"]>;

function RentalPaymentForm({ busy, save, showError }: {
  busy: boolean; save: (fields: Record<string, unknown>) => Promise<boolean>; showError: (message: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [method, setMethod] = useState<RentalPaymentMethod>("CASH");
  const today = moneyToday();
  return <section aria-label="Collect rental payment">
    {!open ? <button className={styles.rentalPaymentPrimary} type="button" disabled={busy} onClick={() => setOpen(true)}>Collect payment</button> :
      <form aria-label="Rental payment" onSubmit={async event => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        try {
          if (await save({ action: "DEAL_RENTAL_PAYMENT", amountCents: cents(form.get("rentalAmount")), businessDate: form.get("paymentDate"),
            method, reference: String(form.get("paymentReference") ?? "").trim(), confirmed: form.get("paymentReceived") === "on" })) setOpen(false);
        } catch (error) { showError(error instanceof Error ? error.message : "Enter a valid payment amount."); }
      }}>
        <h3>Collect rental payment</h3>
        <p>Receive cash at the counter or confirm the payment through your terminal or bank. Record rental charges here. Security holds are handled separately.</p>
        <label>Amount received (USD)<input name="rentalAmount" inputMode="decimal" placeholder="0.00" required autoFocus /></label>
        <label>Payment method<select value={method} onChange={event => setMethod(event.target.value as RentalPaymentMethod)}>
          {Object.entries(RENTAL_PAYMENT_METHODS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select></label>
        <label>Received date (Chicago)<input name="paymentDate" type="date" required defaultValue={today} max={today} /></label>
        <label>{method === "CASH" ? "Register reference (optional)" : method === "CARD_TERMINAL" ? "Terminal approval reference" : "Payment reference"}
          <input name="paymentReference" maxLength={64} required={method !== "CASH"} autoComplete="off" />
        </label>
        <label><input name="paymentReceived" type="checkbox" required /> I confirmed this payment was received.</label>
        <div className={styles.rentalPaymentActions}>
          <button className={styles.rentalPaymentPrimary} disabled={busy}>{busy ? "Saving payment…" : "Record payment & issue receipt"}</button>
          <button type="button" disabled={busy} onClick={() => setOpen(false)}>Cancel</button>
        </div>
      </form>}
  </section>;
}

function RentalActivitySection({ activity, canEdit, busy, save }: {
  activity: RentalActivity; canEdit: boolean; busy: boolean; save: (fields: Record<string, unknown>) => Promise<boolean>;
}) {
  const canRecord = canEdit && activity.canRecord;
  return <section aria-label="Rental activity">
    <h3>Progress notes</h3>
    {canRecord && <form onSubmit={async event => {
      event.preventDefault();
      const form = event.currentTarget;
      if (await save({ action: "RENTAL_PROGRESS_NOTE", reason: String(new FormData(form).get("note") ?? "").trim() })) form.reset();
    }}>
      <label>Rental progress note<textarea name="note" required maxLength={1000} disabled={busy} /></label>
      <button disabled={busy}>Save progress note</button>
    </form>}
    {activity.notes.length ? <ul>{activity.notes.map(note => <li key={note.id}>
      <p style={{ whiteSpace: "pre-wrap" }}>{note.text}</p><small>{note.author} · {rentalTime(note.at)}</small>
    </li>)}</ul> : <p>No progress notes.</p>}

    <h3>Return incidents</h3>
    {canRecord && (activity.bookingId ? <details>
      <summary>Record damage or theft</summary>
      <form onSubmit={async event => {
        event.preventDefault();
        const form = event.currentTarget, fields = new FormData(form);
        if (await save({ action: "RENTAL_INCIDENT", bookingId: activity.bookingId, kind: fields.get("kind"), reason: String(fields.get("incident") ?? "").trim() })) form.reset();
      }}>
        <label>Incident type<select name="kind" required disabled={busy}><option value="">Choose incident type</option><option value="DAMAGE">Damage</option><option value="THEFT">Theft / missing parts or vehicle</option></select></label>
        <label>What happened?<textarea name="incident" required maxLength={1000} disabled={busy} /></label>
        <p>A high-priority follow-up will be assigned to you in Tasks.</p>
        <button disabled={busy}>Save incident</button>
      </form>
    </details> : <p>Record actual checkout before adding a vehicle incident.</p>)}
    {activity.incidents.length ? <ul>{activity.incidents.map(incident => <li key={incident.id}>
      <strong>{incident.kind === "THEFT" ? "Theft / missing parts or vehicle" : "Damage"}</strong> · <small>{incident.author} · {rentalTime(incident.at)}</small>
      <p style={{ whiteSpace: "pre-wrap" }}>{incident.text}</p>
      {incident.followUp ? <p>
        {incident.followUp.href ? <Link href={incident.followUp.href}>Follow-up task</Link> : "Follow-up task"} · {incident.followUp.owner} · {incident.followUp.status.replaceAll("_", " ")}
        {incident.followUp.completedAt ? ` · Completed ${rentalTime(incident.followUp.completedAt)}` : ` · Due ${rentalTime(incident.followUp.dueAt)}`}
      </p> : <p>Follow-up task unavailable.</p>}
      {incident.claimLinked ? <p>{incident.claimId ? <Link href={`/vehicles/claims-workspace?claimId=${encodeURIComponent(incident.claimId)}`}>Open linked claim</Link> : "Internal claim linked"}</p>
        : activity.canWorkClaims && canEdit ? <details>
          <summary>Connect to Claims Desk</summary>
          <p><Link href="/vehicles/claims-desk" target="_blank" rel="noopener noreferrer">Review existing claims</Link> before starting intake. Claim intake is internal.</p>
          <button type="button" disabled={busy} onClick={() => void save({ action: "RENTAL_INCIDENT_CLAIM", incidentId: incident.id, claimAction: "START" })}>Start internal claim intake</button>
          <form onSubmit={event => {
            event.preventDefault();
            void save({ action: "RENTAL_INCIDENT_CLAIM", incidentId: incident.id, claimAction: "LINK", claimId: String(new FormData(event.currentTarget).get("claimId") ?? "").trim() });
          }}>
            <label>Claims Desk record ID<input name="claimId" required maxLength={240} disabled={busy} /></label>
            <small>From the open claim’s address, copy the record ID after <code>claimId=</code>.</small>
            <button disabled={busy}>Link existing claim</button>
          </form>
        </details> : <p>Ask authorized Claims Desk staff to review this incident if a claim is needed.</p>}
    </li>)}</ul> : <p>No return incidents.</p>}
  </section>;
}

export function DealOperationsDrawer({ deal, expectedCustomerId, initialTab = "Documents", alerts = [], onClose, onChanged, onPathwayChanged, onFindEditableDeal }: { deal: { draftId?: string | null; jacketId?: string | null; pathway?: string; customerName: string; customerId?: string | null; rental?: RentalWork | null }; expectedCustomerId?: string; initialTab?: string; alerts?: string[]; onClose: () => void; onChanged: () => void; onPathwayChanged?: (result: DealPathwayChangeResult) => void; onFindEditableDeal?: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null), pending = useRef<{ fingerprint: string; body: Record<string, unknown> } | null>(null);
  const [data, setData] = useState<DealOperationsView | null>(null), [packet, setPacket] = useState<SalesDocumentJacketView | null>(null);
  const [tab, setTab] = useState(isRentalPathway(deal.pathway) && initialTab === "Documents" ? "Rental" : initialTab), [busy, setBusy] = useState(false), [loading, setLoading] = useState(true), [error, setError] = useState(""), [message, setMessage] = useState("");
  const [financialKind, setFinancialKind] = useState("PAYMENT");
  const [issuedReceipt, setIssuedReceipt] = useState<{ draftId: string; paymentId: string } | null>(null);
  const [updatedDraft, setUpdatedDraft] = useState<DealPathwayChangeResult | null>(null);
  const load = useCallback(async (signal?: AbortSignal, background = false) => {
    if (!background) { setLoading(true); setError(""); }
    try {
      const params = new URLSearchParams({ view: "operations", ...(expectedCustomerId ? { expectedCustomerId } : {}), ...(deal.draftId ? { draftId: deal.draftId } : deal.jacketId ? { jacketId: deal.jacketId } : {}) });
      const response = await fetch(`/api/crm/v1/deal-drafts?${params}`, { signal, cache: "no-store" }), body = await response.json();
      if (!response.ok) throw new Error(body.error || "Deal details could not be loaded.");
      if (!signal?.aborted) { setData(body); setPacket(current => current?.id === body.jacketId ? current : null); }
      if (!expectedCustomerId && body.jacketId && body.pathway !== "repairs") { const response = await fetch(`/api/sales-documents/${encodeURIComponent(body.jacketId)}`, { signal, cache: "no-store" }); const jacket = await response.json(); if (!response.ok) throw new Error(jacket.error || "The packet could not be loaded."); if (!signal?.aborted) setPacket(jacket); }
    } catch (caught) { if (!signal?.aborted) setError(caught instanceof Error ? caught.message : "Connection interrupted. Select Refresh to try again."); }
    finally { if (!background && !signal?.aborted) setLoading(false); }
  }, [deal.draftId, deal.jacketId, expectedCustomerId]);
  useEffect(() => { dialog.current?.showModal(); const controller = new AbortController(); const timer = setTimeout(() => void load(controller.signal), 0); return () => { clearTimeout(timer); controller.abort(); }; }, [load]);
  async function save(fields: Record<string, unknown>) {
    if (!data || busy || loading) return false;
    setBusy(true); setError(""); setMessage("");
    try {
      const fingerprint = JSON.stringify(fields);
      if (pending.current?.fingerprint !== fingerprint) pending.current = { fingerprint, body: { ...fields, ...(expectedCustomerId ? { expectedCustomerId } : {}), draftId: data.draftId, jacketId: data.jacketId, draftRevision: data.draftRevision, jacketRevision: data.jacketRevision, operationKey: crypto.randomUUID() } };
      const rentalActivity = typeof fields.action === "string" && fields.action.startsWith("RENTAL_");
      const response = await fetch(rentalActivity ? "/api/claims-workspace/rental-activity" : "/api/crm/v1/deal-drafts", { method: rentalActivity ? "POST" : "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(pending.current.body) }), body = await response.json();
      if (!response.ok) { if (response.status !== 503) pending.current = null; throw new Error(body.error || "The change could not be saved."); }
      pending.current = null;
      if (fields.action === "DEAL_RENTAL_PAYMENT" && data.draftId && typeof body.receiptId === "string") setIssuedReceipt({ draftId: data.draftId, paymentId: body.receiptId });
      const activityMessages: Record<string, string> = { RENTAL_PROGRESS_NOTE: "Progress note saved.", RENTAL_INCIDENT: "Incident saved and follow-up assigned to you in Tasks.", RENTAL_INCIDENT_CLAIM: "Internal claim linked.", DEAL_RENTAL_PAYMENT: "Payment recorded. The receipt is ready to open or print." };
      setMessage(activityMessages[String(fields.action)] ?? (fields.action === "DEAL_REASSIGN" ? "Owner changed. Existing reminders keep their assignees; create a follow-up for the new owner here." : fields.action === "DEAL_REMINDER" ? "Reminder saved on this exact deal and in Tasks." : "Verified record saved. No bank, card, custody or DMV action was initiated."));
      onChanged(); await load();
      return true;
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Connection interrupted. Retry the same entry; its operation reference prevents duplicates."); return false; }
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
  const dailyRental = (data?.pathway ?? deal.pathway) === "daily-rental";
  const selectedFinancialKind = dailyRental && financialKind === "PAYMENT" ? "AGREED_AMOUNT" : financialKind;
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
    <div className={styles.tabs} role="tablist" aria-label="Deal detail sections" onKeyDown={event => { if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return; event.preventDefault(); const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]')); const current = buttons.findIndex(button => button.getAttribute("aria-selected") === "true"); const next = event.key === "Home" ? 0 : event.key === "End" ? buttons.length - 1 : (current + (event.key === "ArrowRight" ? 1 : -1) + buttons.length) % buttons.length; setTab(buttons[next].textContent || "Documents"); buttons[next].focus(); }}>{(expectedCustomerId ? ["Money"] : [...(rental || data?.rentalActivity ? ["Rental"] : []), "Documents", "Completion", "Pathway", "Follow-ups", "Money", "History", ...(data?.canManage ? ["Manager"] : [])]).map(label => <button key={label} id={`deal-detail-${label}`} role="tab" aria-controls="deal-details-panel" tabIndex={tab === label ? 0 : -1} aria-selected={tab === label} onClick={() => setTab(label)}>{label}</button>)}</div>
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
      {tab === "Rental" && <>{rental && <><RentalOperationsPanel key={data.draftId} draftId={data.draftId} pathway={data.pathway} packetClosed={packet?.state === "CLOSED"} closedReturns={packet && closedReturn ? [{ jacketId: packet.id, finalizedAt: closedReturn.finalizedAt }] : []} cancelled={data.draftStatus === "CANCELLED"} inactive={data.inactive} canAct={data.canEdit || data.canManage} fallback={deal.rental} /><h3>Return follow-ups</h3>{data.tasks.length ? <ul>{data.tasks.map(task => <li key={task.id}><Link href={`/tasks/${encodeURIComponent(task.id)}`}>{task.title}</Link> · {task.status.replaceAll("_", " ")} · {rentalTime(task.dueAt)}</li>)}</ul> : <p>No return follow-up is recorded.</p>}</>}{data.rentalActivity && <RentalActivitySection activity={data.rentalActivity} canEdit={data.canEdit || data.canManage} busy={busy} save={save} />}</>}
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
        <h3>{dailyRental ? "Rental payments" : repair ? "Existing deal financial records" : "Recorded financial activity"}</h3>
        {expectedCustomerId && data.canManage && !repair && !dailyRental && !data.jacketId && data.draftId && <p>
          Prepare the deal packet before recording a verified deposit. <Link href={`/crm-next/deals/start?draftId=${encodeURIComponent(data.draftId)}&section=documents`}>Open deal documents</Link>
        </p>}
        {dailyRental && data.draftId && !data.inactive && (data.canManage ? <RentalPaymentForm busy={busy} save={save} showError={setError} /> : <p>A manager can record a received payment and issue its receipt.</p>)}
        {issuedReceipt && issuedReceipt.draftId === data.draftId && <p><a className={styles.rentalPaymentPrimary} target="_blank" rel="noopener" href={rentalReceiptHref(issuedReceipt.draftId, issuedReceipt.paymentId)}>Open latest receipt</a></p>}
        {data.inactive && <p>Managers can record verified financial corrections for this inactive deal.</p>}
        <dl className={styles.reportTotals}><div><dt>Recorded agreed amount</dt><dd>{data.financials.agreedCents === null ? "Not recorded" : moneyLabel(data.financials.agreedCents)}</dd></div><div><dt>Current net collected</dt><dd>{moneyLabel(data.financials.netCents)}</dd></div><div><dt>Current outstanding</dt><dd>{data.financials.outstandingCents === null ? "Agreed amount needed" : moneyLabel(data.financials.outstandingCents)}</dd></div>{data.financials.creditCents > 0 && <div><dt>Customer credit · review required</dt><dd>{moneyLabel(data.financials.creditCents)}</dd></div>}</dl>
        {data.financialEntries.length ? <ul className={styles.documentChecklist}>{data.financialEntries.map(entry => <li key={entry.id}><strong>{FINANCIAL_KINDS[entry.kind]} · {moneyLabel(entry.amountCents)}</strong><span>{entry.businessDate} · {entry.reference} · {entry.actorName}</span>{entry.originalId && <span>Original: {data.financialEntries.find(original => original.id === entry.originalId)?.reference || entry.originalId}</span>}<span>Evidence: {entry.evidence}</span><span>Reason: {entry.reason}</span></li>)}</ul> : <p>No verified financial activity has been recorded.</p>}
        {!repair && data.canManage && (data.jacketId || dailyRental && data.draftId) && <form onSubmit={event => { event.preventDefault(); const form = new FormData(event.currentTarget); try { void save({ action: "DEAL_FINANCIAL", kind: field(form, "kind"), amountCents: cents(field(form, "amount"), field(form, "kind") === "AGREED_AMOUNT"), businessDate: field(form, "businessDate"), originalId: field(form, "originalId") || null, reference: field(form, "reference"), evidence: field(form, "evidence"), reason: field(form, "reason"), confirmed: form.get("confirmed") === "on" }); } catch (caught) { setError(caught instanceof Error ? caught.message : "Enter a valid dollar amount."); } }}>
          <h3>Record verified activity</h3><p>Record the agreed total or a correction verified against its supporting record. Process any refund through the original payment channel before recording it here.</p><label>Activity type<select name="kind" value={selectedFinancialKind} onChange={event => setFinancialKind(event.target.value)}>{Object.entries(FINANCIAL_KINDS).filter(([key]) => !dailyRental || key !== "PAYMENT").map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
          <label>Amount · USD<input name="amount" inputMode="decimal" required placeholder="500.00" /></label><label>Business date<input name="businessDate" type="date" required defaultValue={moneyToday()} max={moneyToday()} /></label>
          {["REFUND", "REVERSAL"].includes(financialKind) && <label>Original transaction<select name="originalId" required><option value="">Choose the original record</option>{data.financialEntries.filter(entry => entry.kind === "PAYMENT" || financialKind === "REVERSAL" && entry.kind === "REFUND").map(entry => <option key={entry.id} value={entry.id}>{entry.reference} · {FINANCIAL_KINDS[entry.kind]} · {moneyLabel(entry.amountCents)}</option>)}</select></label>}
          <label>Receipt / bank / contract reference<input name="reference" required maxLength={240} /></label><label>Supporting evidence reference<textarea name="evidence" required maxLength={1000} /></label><label>Reason<textarea name="reason" required maxLength={1000} /></label><label><input name="confirmed" type="checkbox" required /> I verified this record against its original supporting evidence.</label><button disabled={busy}>Record verified activity</button>
        </form>}
      </>}
      {tab === "Money" && data.draftId && data.rentalReceipts?.length > 0 && <section aria-label="Rental receipts">
        <h3>Rental receipts</h3>
        <ul className={styles.documentChecklist}>{data.rentalReceipts.map(receipt => <li key={receipt.id}>
          <a target="_blank" rel="noopener" href={rentalReceiptHref(data.draftId!, receipt.id)}>Open receipt · {moneyLabel(receipt.amountCents)} · {receipt.businessDate}</a>
        </li>)}</ul>
      </section>}
      {repair && tab === "Completion" && <>
        <h3>Repair handoff</h3><p>Open the repair order to review authorization, work progress, quality checks and closeout.</p>
        {repairIntakeHref && <p><Link href={repairIntakeHref}>Continue repair intake</Link></p>}
        <button type="button" onClick={focusDocuments}>Find saved repair work</button>
      </>}
      {!repair && tab === "Completion" && <><h3>Delivery, funding and title</h3><p>Each check is recorded separately from the sale and its finalized documents.</p><div className={styles.progressBadges}><span>Funding: {badge("FUNDING")}</span><span>Delivery: {badge("DELIVERY")}</span><span>Title: {badge("TITLE")}</span></div>{!data.canManage && <p>A manager can record verification evidence here. You can review documents and set follow-ups in the other sections.</p>}
        {data.canManage && !rental && !data.inactive && data.jacketId && <form onSubmit={event => { event.preventDefault(); const form = new FormData(event.currentTarget); void save({ action: "DEAL_MILESTONE", dimension: field(form, "dimension"), state: field(form, "state"), reference: field(form, "reference"), reason: field(form, "reason") }); }}><h3>Funding / delivery / title verification</h3><p>Record supporting evidence or an explained exception. This does not release a vehicle, process funds, or finalize paperwork.</p><label>Milestone<select name="dimension"><option value="FUNDING">Funding</option><option value="DELIVERY">Delivery</option><option value="TITLE">Title / registration</option></select></label><label>State<select name="state"><option value="PENDING">Pending</option><option value="VERIFIED">Verified</option><option value="NOT_REQUIRED">Not required · reason recorded</option></select></label><label>Verification reference<input name="reference" maxLength={240} /></label><label>Reason<textarea name="reason" required maxLength={1000} /></label><button disabled={busy}>Save milestone review</button></form>}</>}
      {tab === "History" && <>{deal.customerId ? <DealRepairHistory key={deal.customerId} customerId={deal.customerId} /> : null}<h3>Deal activity history</h3>{dealHistory.length ? <ol className={styles.documentChecklist}>{dealHistory.map(event => <li key={event.id}><strong>{event.action.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, character => character.toUpperCase())}</strong><span>{event.actorName} · {new Date(event.at).toLocaleString("en-US", { timeZone: "America/Chicago" })} Central</span><span>{event.note}</span></li>)}</ol> : <p>No recorded changes yet.</p>}</>}
      {tab === "Manager" && data.canManage && <>
        {!data.inactive && data.draftId && <form onSubmit={event => { event.preventDefault(); const form = new FormData(event.currentTarget); void save({ action: "DEAL_REASSIGN", assignedUserId: field(form, "assignedUserId"), reason: field(form, "reason") }); }}><h3>Assign deal owner</h3><p>Transfers this saved draft to staff who already have access to its customer. If needed, assign customer ownership in Customer 360 first. Existing reminders retain their assignees.</p><label>Owner<select name="assignedUserId" defaultValue={data.ownerId}>{data.staff.map(person => <option key={person.id} value={person.id} disabled={person.canOwnDeal === false}>{person.name}{person.canOwnDeal === false ? " · customer access needed" : ""}</option>)}</select></label><label>Reason<textarea name="reason" required maxLength={1000} /></label><button disabled={busy}>Save deal owner</button></form>}

      </>}
    </div>}
  </dialog>;
}
