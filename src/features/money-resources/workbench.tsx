"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { MONEY_CATEGORIES, PAYMENT_METHODS, moneyFlags, moneyLabel, moneyToday, receiptPending, signedExpense } from "@/lib/money-resources";
import type { MoneyResourcesModel } from "@/server/money-resources/service";
import styles from "./workbench.module.css";
import { savedPurchasingFlags } from "@/lib/money-purchasing";
import { PurchasingTools } from "./purchasing-tools";
import { ExpenseReport } from "./expense-report";

type Entry = MoneyResourcesModel["entries"][number];
type Fields = Record<string, unknown>;
const label = (value: string) => value.toLowerCase().replaceAll("_", " ");
function useSave() {
  const pending = useRef<{ signature: string; key: string } | null>(null);
  const send = async (value: Fields) => {
    const signature = JSON.stringify(value);
    if (pending.current?.signature !== signature) pending.current = { signature, key: crypto.randomUUID() };
    const response = await fetch("/api/money-resources", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...value, idempotencyKey: pending.current.key }) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "The action was not saved. Your entries are still here.");
    return result as { id?: string; imported?: number; skipped?: number };
  };
  return { send, reset: () => { pending.current = null; } };
}

export function MoneyResourcesWorkbench({ vehicleId = "", repairOrderId = "", initialDate = "", initialAction = "" }: { vehicleId?: string; repairOrderId?: string; initialDate?: string; initialAction?: string }) {
  const [model, setModel] = useState<MoneyResourcesModel | null>(null);
  const [day, setDay] = useState(/^\d{4}-\d{2}-\d{2}$/.test(initialDate) ? initialDate : moneyToday());
  const [view, setView] = useState(initialAction === "review" ? "Review" : "Record spending");
  const [notice, setNotice] = useState(""), [busy, setBusy] = useState(false), [failed, setFailed] = useState(false);
  const [selected, setSelected] = useState<{ entry: Pick<Entry, "id" | "version" | "purpose">; action: string } | null>(null);
  const [history, setHistory] = useState<Array<{ action: string; createdAt: string; actor: { name: string }; details: { note?: string } }> | null>(null);
  const [search, setSearch] = useState("");
  const detailRef = useRef<HTMLElement>(null);
  useEffect(() => { if (selected) { detailRef.current?.scrollIntoView({ block: "start", behavior: "smooth" }); detailRef.current?.focus({ preventScroll: true }); } }, [selected]);
  const { send: save } = useSave();
  async function refresh() {
    const response = await fetch(`/api/money-resources?date=${day}`, { cache: "no-store" });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Money records could not be loaded.");
    setModel(result);
  }
  useEffect(() => {
    let cancelled = false;
    void fetch(`/api/money-resources?date=${day}`, { cache: "no-store" }).then(async response => { const result = await response.json(); if (!response.ok) throw new Error(result.error); if (!cancelled) setModel(result); }).catch(error => { if (!cancelled) { setFailed(true); setNotice(error.message || "Money records are not available."); } });
    return () => { cancelled = true; };
  }, [day]);
  async function execute(value: Fields, message = "Saved.") {
    if (busy) return;
    setBusy(true); setFailed(false); setNotice("");
    try { const result = await save(value); await refresh(); setNotice(result.imported !== undefined ? `${result.imported} statement lines imported; ${result.skipped} already present.` : message); setSelected(null); return result; }
    catch (error) { setFailed(true); setNotice(error instanceof Error ? error.message : "Connection interrupted. Your entries remain available."); }
    finally { setBusy(false); }
  }
  async function showHistory(row: Pick<Entry, "id" | "version" | "purpose">) {
    setSelected({ entry: row, action: "HISTORY" }); setHistory(null);
    try { const response = await fetch(`/api/money-resources/${row.id}/history`); const result = await response.json(); if (!response.ok) throw new Error(result.error); setHistory(result.history); }
    catch { setFailed(true); setNotice("History could not be loaded. Try again."); }
  }
  const actionButton = (row: Pick<Entry, "id" | "version" | "purpose">, action: string, title: string) => <button disabled={busy} onClick={() => { setSelected({ entry: row, action }); setNotice(""); }} type="button">{title}</button>;
  const entries = model?.entries.filter(row => `${row.merchant} ${row.purpose} ${row.employee.name} ${row.reference ?? ""}`.toLowerCase().includes(search.toLowerCase())) ?? [];
  const review = entries.filter(row => ["PENDING", "REJECTED"].includes(row.approvalStatus) || receiptPending(row));
  return <main className={styles.workbench}>
    <header className={styles.header}><div><Link href="/vehicles/coo-workbook/more-tools">← Workbook extra tools</Link><h1>Money & Resources</h1><p>Record once. Keep the receipt, responsible person and next action together.</p></div><Link href="/vehicles/coo-workbook">Return to workbook</Link></header>
    <nav className={styles.tabs} aria-label="Money tools">{["Record spending", "My spending", "Purchasing authorizations", "Expense report", "Funds", "Card transactions", ...(model?.manager ? ["Review", "Daily journal", "Funding sources"] : [])].map(item => <button aria-pressed={view === item} key={item} onClick={() => { setView(item); setSelected(null); }} type="button">{item}</button>)}</nav>
    {notice ? <p className={failed ? styles.error : styles.notice} role={failed ? "alert" : "status"}>{notice}</p> : null}
    {!model ? <section className={styles.panel}><p>{failed ? "The tool cannot load yet. No records have been changed." : "Loading your spending tools…"}</p>{failed ? <button onClick={() => void refresh().catch(error => setNotice(error.message))} type="button">Try again</button> : null}</section> : <>
      {model.limited ? <p role="alert">This list reached its display limit. Use the date filter or management journal export; older obligations are not automatically closed.</p> : null}
      {view === "Record spending" ? <SpendingForm model={model} vehicleId={vehicleId} repairOrderId={repairOrderId} onSaved={async () => { await refresh(); }} /> : null}
      {view === "Purchasing authorizations" ? <PurchasingTools model={model} onCommand={execute} busy={busy} /> : null}
      {view === "Expense report" ? <ExpenseReport model={model} /> : null}
      {view === "Funds" ? <>
        <section className={styles.panel}><h2>Request funds</h2><form className={styles.form} onSubmit={event => { event.preventDefault(); const data = Object.fromEntries(new FormData(event.currentTarget)); void execute({ ...data, action: "REQUEST", businessDate: day }, "Funds requested. Money has not been issued."); }}><label>Amount ($)<input name="amount" inputMode="decimal" required /></label><label className={styles.wide}>Business purpose<input name="purpose" required maxLength={1000} /></label><button disabled={busy} type="submit">Request funds</button></form></section>
        <section className={styles.panel}><h2>Funds to account for</h2>{model.advances.length ? model.advances.map(advance => <article className={styles.row} key={advance.id}><div><strong>{advance.employee.name} · {moneyLabel(advance.amountCents)} issued</strong><p>{advance.purpose}</p><small>Unsettled balance: {moneyLabel(advance.balanceCents)} · purchases and returns still need review</small></div><div className={styles.actions}>{advance.employeeId === model.actorId ? actionButton(advance, "RETURN", "Record unused funds returned") : model.manager ? actionButton(advance, "SETTLE", "Review settlement") : null}<button onClick={() => void showHistory(advance)} type="button">History</button></div></article>) : <p>No unsettled advances.</p>}</section>
        {model.manager && model.requests.length ? <section className={styles.panel}><h2>Approved requests · awaiting actual handover</h2>{model.requests.map(request => <article className={styles.row} key={request.id}><div><strong>{request.employee.name} · {moneyLabel(request.amountCents)}</strong><p>{request.purpose}</p></div>{actionButton(request, "ISSUE", "Record funds issued")}</article>)}</section> : null}
      </> : null}
      {view === "My spending" || view === "Review" || view === "Daily journal" ? <section className={styles.panel}>
        <header className={styles.listHeader}><h2>{view === "Review" ? "Needs review" : view === "Daily journal" ? "Daily operational journal" : "Spending and follow-ups"}</h2><label>Date<input type="date" value={day} onChange={event => setDay(event.target.value)} /></label></header>
        {view === "Daily journal" ? <><p>This is an operational journal, not a posted general ledger. Advances, reimbursements and card payments are not counted again as expenses.</p><strong>Recorded net spending for {day}: {moneyLabel(entries.filter(row => row.businessDate === day).reduce((sum, row) => sum + signedExpense(row), 0))}</strong><div className={styles.actions}><a href={`/api/money-resources/journal?date=${day}`}>Download daily journal CSV</a><button onClick={() => window.print()} type="button">Print</button></div></> : null}
        <label>Find a transaction<input placeholder="Merchant, purpose, staff or reference" value={search} onChange={event => setSearch(event.target.value)} /></label>
        {(view === "Review" ? review : view === "Daily journal" ? entries.filter(row => row.businessDate === day) : entries).map(row => <article className={styles.row} key={row.id}>
          <div><strong>{moneyLabel(row.amountCents)} · {row.merchant || label(row.kind)}</strong><p>{row.purpose}</p><small>{row.employee.name} · {row.businessDate} · {label(row.kind)} · {row.account?.label || label(row.paymentMethod)} · {label(row.approvalStatus)}{row.reconciledAt ? " · matched to statement" : ""}</small>
            {row.kind === "EXPENSE" ? <p>{row.receiptDocumentId ? <a href={`/api/money-resources/${row.id}/receipt`} target="_blank" rel="noreferrer">View receipt</a> : row.receiptExplanation ? `Receipt exception: ${row.receiptExplanation}` : "Receipt pending — attach it or explain the missing evidence."}</p> : null}
            {row.vehicleId ? <Link href={`/vehicles/${row.vehicleId}/costs`}>Vehicle costs {row.inventoryCostId ? "· existing cost linked" : "· spending is not posted as a second cost"}</Link> : null}
            {moneyFlags(row, model.entries, model.accounts.find(source => source.id === row.accountId)?.limitCents).map(flag => <p key={flag} className={styles.flag}>{flag}</p>)}
            {row.approvalStatus !== "SUPERSEDED" ? savedPurchasingFlags(row.purchasingSnapshot).map(flag => <p key={flag} className={styles.flag}>{flag}</p>) : null}
          </div>
          <div className={styles.actions}>
            {row.kind === "EXPENSE" && row.approvalStatus !== "SUPERSEDED" && !row.reconciledAt ? <><label className={styles.upload}>Attach receipt<input type="file" accept="application/pdf,image/jpeg,image/png" onChange={event => { const file = event.target.files?.[0]; if (file) void uploadReceipt(row.id, file).then(refresh).then(() => { setFailed(false); setNotice("Receipt attached for review."); }).catch(error => { setFailed(true); setNotice(error.message); }); }} /></label>{actionButton(row, "EXPLAIN", "Explain / follow up")}</> : null}
            {row.kind === "EXPENSE" && row.approvalStatus !== "SUPERSEDED" ? actionButton(row, "REFUND", "Record actual refund") : null}
            {model.manager && row.approvalStatus === "PENDING" && row.employeeId !== model.actorId ? actionButton(row, "REVIEW", row.kind === "ADVANCE_RETURN" ? "Confirm returned funds" : "Review") : null}
            {model.manager && row.kind === "EXPENSE" && row.paymentMethod === "PERSONAL" && row.approvalStatus === "APPROVED" ? actionButton(row, "REIMBURSE", "Record reimbursement paid") : null}
            {model.manager && row.kind === "EXPENSE" && row.approvalStatus !== "SUPERSEDED" && !row.reconciledAt && !row.inventoryCostId ? actionButton(row, "CORRECT", "Correct record") : null}
            <button onClick={() => void showHistory(row)} type="button">History</button>
          </div>
        </article>)}
        {!(view === "Review" ? review : entries).length ? <p>No items in this view.</p> : null}
      </section> : null}
      {view === "Card transactions" ? <>
        {model.manager ? <section className={styles.panel}><h2>Import posted card transactions</h2><p>Use a bank statement CSV with headers <code>transaction_id,date,merchant,amount</code>. Dates: YYYY-MM-DD. Purchases positive; refunds/payments negative. Up to 500 lines. This does not connect to or control your bank.</p><form className={styles.form} onSubmit={event => { event.preventDefault(); const form = event.currentTarget, data = new FormData(form), file = data.get("statement"); if (file instanceof File) void file.text().then(csv => execute({ action: "IMPORT", accountId: data.get("accountId"), csv })); }}><AccountSelect model={model} kind="CARD" /><label>Statement CSV<input name="statement" accept=".csv,text/csv" type="file" required /></label><button disabled={busy} type="submit">Import statement</button></form></section> : null}
        <section className={styles.panel}><h2>Charges needing an explanation or match</h2>{model.charges.map(charge => <article className={styles.row} key={charge.id}><div><strong>{moneyLabel(charge.amountCents)} · {charge.merchant}</strong><p>{charge.account.label} · {charge.businessDate} · {charge.externalId}</p><small>{charge.matchedEntryId ? "Matched" : "Not matched — record the purchase or investigate it."}</small></div>{!charge.matchedEntryId && model.manager ? <form onSubmit={event => { event.preventDefault(); const selectedId = new FormData(event.currentTarget).get("entryId"); const spending = model.entries.find(row => row.id === selectedId); if (spending) void execute({ action: "MATCH", id: spending.id, version: spending.version, chargeId: charge.id, chargeVersion: charge.version }, "Statement transaction matched; no new expense created."); }}><label>Approved matching record<select name="entryId" required><option value="">Choose after checking the receipt</option>{model.entries.filter(row => ["EXPENSE", "REFUND", "CARD_PAYMENT"].includes(row.kind) && row.approvalStatus === "APPROVED" && !row.reconciledAt && row.accountId === charge.accountId && row.amountCents * (row.kind === "EXPENSE" ? 1 : -1) === charge.amountCents).map(row => <option key={row.id} value={row.id}>{row.businessDate} · {row.merchant || row.purpose} · {label(row.kind)}</option>)}</select></label><button disabled={busy}>Match transaction</button></form> : null}</article>)}{!model.charges.length ? <p>No imported card transactions need attention.</p> : null}</section>
        {model.manager ? <section className={styles.panel}><h2>Record a company card statement payment</h2><p>Record a payment already made. This does not pay the bank or create another expense.</p><form className={styles.form} onSubmit={event => { event.preventDefault(); void execute({ ...Object.fromEntries(new FormData(event.currentTarget)), action: "CARD_PAYMENT", businessDate: day }, "Actual statement payment recorded."); }}><AccountSelect model={model} kind="CARD" /><label>Amount paid ($)<input name="amount" required inputMode="decimal" /></label><label>Bank payment reference<input name="reference" required maxLength={150} /></label><button disabled={busy}>Record actual payment</button></form></section> : null}
      </> : null}
      {view === "Funding sources" && model.manager ? <>
        <section className={styles.panel}><h2>Assign a card or establish a cash/bank source</h2><form className={styles.form} onSubmit={event => { event.preventDefault(); void execute({ ...Object.fromEntries(new FormData(event.currentTarget)), action: "CREATE_ACCOUNT" }, "Funding source saved. No money was moved."); }}><label>Name<input name="label" required maxLength={100} placeholder="Office petty cash / staff card" /></label><label>Type<select name="kind"><option value="CARD">Company credit card</option><option value="CASH">Cash / petty cash</option><option value="BANK">Bank / transfers</option></select></label><label>Responsible employee<select name="employeeId"><option value="">Shared cash/bank source</option>{model.users.map(user => <option value={user.id} key={user.id}>{user.name}</option>)}</select></label><label>Card last four digits only<input name="lastFour" pattern="[0-9]{4}" maxLength={4} autoComplete="off" /></label><label>Per-purchase policy limit ($, optional)<input name="limit" inputMode="decimal" /></label><label>Initial cash count ($, cash sources only)<input name="opening" inputMode="decimal" defaultValue="0" /></label><button disabled={busy}>Save funding source</button></form><p>Limits flag purchases for review; only the issuer can enforce card declines. Never enter a full card number, PIN or security code.</p></section>
        <section className={styles.panel}><h2>Funding sources</h2>{model.accounts.map(source => <article className={styles.row} key={source.id}><div><strong>{source.label}{source.lastFour ? ` · •••• ${source.lastFour}` : ""}</strong><p>{label(source.kind)} · {model.users.find(user => user.id === source.assignedUserId)?.name || "Shared"} · {source.active ? "Active" : "Inactive"}{source.limitCents ? ` · policy limit ${moneyLabel(source.limitCents)}` : ""}</p></div>{source.active ? <button disabled={busy} onClick={() => void execute({ action: "DEACTIVATE", accountId: source.id }, "Source deactivated. History and unresolved transactions remain available.")}>Deactivate</button> : null}</article>)}</section>
      </> : null}
      {view === "Daily journal" && model.manager ? <section className={styles.panel}><h2>Count cash & record daily review</h2><p>Differences stay open. A review snapshot does not erase missing receipts, close advances or lock staff out of recording spending.</p><form className={styles.form} onSubmit={event => { event.preventDefault(); void execute({ ...Object.fromEntries(new FormData(event.currentTarget)), action: "CLOSE", businessDate: day }, "Cash review snapshot saved. Differences and missing evidence remain visible."); }}><AccountSelect model={model} kind="CASH" /><label>Actual cash counted ($)<input name="amount" required inputMode="decimal" /></label><label className={styles.wide}>Difference / follow-up note<input name="note" maxLength={1000} /></label><button disabled={busy}>Record count & review</button></form>{model.closes.map(close => <article key={close.id}><strong>{close.account.label} · expected {moneyLabel(close.expectedCents)} · counted {moneyLabel(close.countedCents)}</strong><p>Difference: {moneyLabel(close.differenceCents)} · {close.unresolvedCount} unresolved items · {close.note || "No follow-up note recorded"}</p></article>)}</section> : null}
      {selected ? <section className={styles.panel} aria-label="Selected money action" ref={detailRef} tabIndex={-1}><header className={styles.listHeader}><h2>{label(selected.action)}</h2><button onClick={() => setSelected(null)}>Close</button></header><p>{selected.entry.purpose}</p>{selected.action === "HISTORY" ? history ? <ol>{history.map((item, index) => <li key={index}>{new Date(item.createdAt).toLocaleString()} · {item.actor.name} · {label(item.action)} {item.details.note || ""}</li>)}</ol> : <p>Loading history…</p> : <form className={styles.form} onSubmit={event => { event.preventDefault(); void execute({ ...Object.fromEntries(new FormData(event.currentTarget)), action: selected.action, id: selected.entry.id, version: selected.entry.version }, "Action recorded."); }}>
        {["RETURN", "REFUND", "REIMBURSE", "CORRECT"].includes(selected.action) ? <label>Amount ($)<input name="amount" required inputMode="decimal" /></label> : null}
        {selected.action === "ISSUE" ? <AccountSelect model={model} excludeCard /> : null}
        {selected.action === "CORRECT" ? <label>Funding source correction (optional)<select name="accountId"><option value="">Keep the original funding source</option>{model.accounts.filter(source => source.active).map(source => <option value={source.id} key={source.id}>{source.label}</option>)}</select></label> : null}
        {["ISSUE", "REFUND", "REIMBURSE"].includes(selected.action) ? <label>Actual handover / payment reference<input name="reference" required maxLength={150} /></label> : null}
        {selected.action === "REVIEW" ? <label>Decision<select name="decision"><option value="APPROVED">Approve / confirm actual return</option><option value="REJECTED">Return for management investigation</option></select></label> : null}
        <label className={styles.wide}>Note / reason<input name="note" required maxLength={1000} placeholder="Brief decision, explanation or next action" /></label>
        <button disabled={busy} type="submit">{busy ? "Saving…" : "Confirm action"}</button>
      </form>}</section> : null}
    </>}
    <footer className={styles.boundary}>Operational accountability · USD · no bank transfers, automatic reimbursements, payroll deductions or general-ledger posting. Existing inventory costs are linked, never silently duplicated.</footer>
  </main>;
}

function AccountSelect({ model, kind, excludeCard = false }: { model: MoneyResourcesModel; kind?: string; excludeCard?: boolean }) {
  return <label>Funding source<select name="accountId" aria-label="Funding source" required><option value="">Choose source</option>{model.accounts.filter(source => source.active && (!kind || source.kind === kind) && (!excludeCard || source.kind !== "CARD")).map(source => <option value={source.id} key={source.id}>{source.label}{source.lastFour ? ` · ${source.lastFour}` : ""}</option>)}</select></label>;
}
async function uploadReceipt(id: string, file: File) {
  const data = new FormData(); data.set("file", file);
  const response = await fetch(`/api/money-resources/${id}/receipt`, { method: "POST", body: data });
  const result = await response.json(); if (!response.ok) throw new Error(result.error || "Receipt upload failed; the spending record is still saved.");
}
function SpendingForm({ model, vehicleId, repairOrderId, onSaved }: { model: MoneyResourcesModel; vehicleId: string; repairOrderId: string; onSaved: () => Promise<void> }) {
  const assigned = model.accounts.find(source => source.active && source.kind === "CARD" && source.assignedUserId === model.actorId);
  const [method, setMethod] = useState(assigned ? "CARD" : "CASH"), [sourceId, setSourceId] = useState(assigned?.id ?? "");
  const [vehicle, setVehicle] = useState(vehicleId), [order, setOrder] = useState(repairOrderId), [busy, setBusy] = useState(false), [notice, setNotice] = useState(""), [failed, setFailed] = useState(false);
  const [addingCard, setAddingCard] = useState(false);
  const [authorizationId, setAuthorizationId] = useState(""), [purchaseApprovalId, setPurchaseApprovalId] = useState(""), [vendorId, setVendorId] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  const policy = model.authorizations.find(item => item.id === authorizationId);
  function applyApproval(id: string) {
    setPurchaseApprovalId(id);
    const approval = model.purchaseApprovals.find(item => item.id === id);
    if (approval) for (const [key, value] of Object.entries({ amount: (approval.amountCents / 100).toFixed(2), purpose: approval.purpose, category: approval.category, businessDate: approval.businessDate })) {
      const field = formRef.current?.elements.namedItem(key);
      if (field instanceof HTMLInputElement || field instanceof HTMLSelectElement) field.value = value;
    }
  }
  const selectedSource = model.accounts.find(source => source.id === sourceId);
  const sourceOptions = model.accounts.filter(source => source.kind === method && ((source.active && (model.manager && source.kind === "CARD" || !source.assignedUserId || source.assignedUserId === model.actorId)) || policy?.accountId === source.id || model.advances.some(advance => advance.accountId === source.id && advance.employeeId === model.actorId)));
  const sourceLabel = (source: MoneyResourcesModel["accounts"][number]) => [source.label, source.lastFour ? `•••• ${source.lastFour}` : "", model.manager ? model.users.find(user => user.id === source.assignedUserId)?.name : ""].filter(Boolean).join(" · ");
  const { send: save, reset: resetSave } = useSave();
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy) return;
    const form = event.currentTarget, data = new FormData(form), addAnother = (event.nativeEvent as SubmitEvent).submitter?.getAttribute("value") === "another";
    setBusy(true); setFailed(false); setNotice("");
    let id: string | undefined;
    try {
      const fields = Object.fromEntries([...data.entries()].filter(([key]) => key !== "receipt"));
      const result = await save({ ...fields, action: "RECORD", paymentMethod: method, accountId: sourceId, vehicleId: vehicle, repairOrderId: order, vendorId, authorizationId, purchaseApprovalId }); id = result.id;
      const file = data.get("receipt");
      if (id && file instanceof File && file.size) await uploadReceipt(id, file);
      await onSaved(); setNotice(file instanceof File && file.size ? "Spending and receipt saved for review." : "Spending saved. Receipt pending; add it later from My spending.");
      if (addAnother) { form.reset(); setPurchaseApprovalId(""); resetSave(); }
    } catch (error) { setFailed(true); setNotice(`${id ? "Spending is saved; receipt or refresh needs attention. " : ""}${error instanceof Error ? error.message : "Try again. Your entries are still here."}`); }
    finally { setBusy(false); }
  }
  return <section className={styles.panel}><h2>Record spending</h2><p>Record actual spending now. A missing receipt or purchase reference will not prevent recording it.</p>
    <form ref={formRef} className={styles.form} onSubmit={event => void submit(event)}>
      {model.authorizations.length ? <div className={styles.wide}><label>Vendor purchasing authorization<select aria-label="Vendor purchasing authorization" value={authorizationId} onChange={event => { const found = model.authorizations.find(item => item.id === event.target.value); setAuthorizationId(event.target.value); setPurchaseApprovalId(""); if (found) { setMethod("CARD"); setSourceId(found.accountId); setVendorId(found.vendorId); } else if (policy) { setSourceId(""); } }}><option value="">Own funding / no vendor authorization selected</option>{model.authorizations.map(item => <option key={item.id} value={item.id}>{item.vendor.name} · {item.employee.name}{item.revokedAt || item.expiresOn < moneyToday() ? " · ended — actual purchase exception" : ""}</option>)}</select></label>{policy ? <><p>{policy.purposeScope} · {policy.categories.join(", ")} · limit {moneyLabel(policy.perPurchaseLimitCents)} · {policy.startsOn} to {policy.expiresOn}. {policy.requiresPriorApproval ? "Prior approval required." : "Above-limit purchases require prior approval."}</p><label>Prior approval (optional for recording an actual purchase)<select aria-label="Prior approval" value={purchaseApprovalId} onChange={event => applyApproval(event.target.value)}><option value="">Not linked — flag if approval was required</option>{model.purchaseApprovals.filter(item => item.authorizationId === policy.id && item.status === "APPROVED" && !item.entry).map(item => <option value={item.id} key={item.id}>{item.businessDate} · {moneyLabel(item.amountCents)} · {item.purpose}</option>)}</select></label><small>Selecting an approval fills its exact purchase details. Changes must match the approval. Missing approval never hides actual spending; it is flagged for independent review.</small></> : null}</div> : null}
      <label>Amount ($)<input name="amount" required inputMode="decimal" placeholder="0.00" autoFocus /></label><label>Date<input name="businessDate" required type="date" defaultValue={model.day} /></label>
      <label>Paid using<select value={method} onChange={event => { setMethod(event.target.value); setSourceId(""); setAuthorizationId(""); setPurchaseApprovalId(""); }}>{PAYMENT_METHODS.map(item => <option key={item} value={item}>{item === "PERSONAL" ? "Personal funds — reimbursement requested" : label(item)}</option>)}</select></label>
      {method !== "PERSONAL" ? <div><label>Funding source{method !== "CARD" ? " (if known)" : ""}<select aria-label="Funding source" value={sourceId} required={method === "CARD"} onChange={event => setSourceId(event.target.value)}><option value="">{method === "CARD" ? model.manager ? "Choose a company card" : "Choose your assigned card" : "Unknown — flag for review"}</option>{sourceOptions.map(source => <option key={source.id} value={source.id}>{sourceLabel(source)}</option>)}</select></label>{method === "CARD" ? <>
        {model.manager ? <button type="button" aria-expanded={addingCard} aria-controls="inline-company-card" onClick={() => setAddingCard(!addingCard)}>+ Add company card</button> : !sourceOptions.length ? <p>No card is assigned to you. Ask a manager to add or assign your card; other staff’s cards are protected.</p> : null}
        {selectedSource && model.manager ? <small>Responsible staff: {policy?.employee.name || model.users.find(user => user.id === selectedSource.assignedUserId)?.name || "Assigned cardholder"}. You are recorded as the person entering this purchase; another manager must review it.</small> : null}
      </> : null}</div> : <p>Only an approved expense can be reimbursed. This form does not send payment.</p>}
      <label>Paid to<input name="merchant" placeholder="Merchant / vendor, if known" maxLength={200} /></label><label>Category<select name="category">{MONEY_CATEGORIES.map(category => <option key={category}>{category}</option>)}</select></label>
      <label className={styles.wide}>Business purpose<input name="purpose" required placeholder="What did you buy and why?" maxLength={1000} /></label>
      {model.advances.filter(advance => advance.employeeId === model.actorId).length ? <label>Use issued funds (optional)<select name="advanceId" onChange={event => { const advance = model.advances.find(item => item.id === event.target.value); if (advance) { setMethod(advance.paymentMethod); setSourceId(advance.accountId ?? ""); } }}><option value="">Not from an advance</option>{model.advances.filter(advance => advance.employeeId === model.actorId).map(advance => <option key={advance.id} value={advance.id}>{advance.purpose} · {moneyLabel(advance.balanceCents)} unsettled</option>)}</select></label> : null}
      <label>Receipt (optional now)<input name="receipt" type="file" accept="application/pdf,image/jpeg,image/png" /></label>
      <details className={styles.wide} open={!!vehicleId || !!repairOrderId}><summary>Link vehicle / repair order / vendor or purchase reference</summary><div className={styles.form}>
        <label>Existing vehicle<select value={vehicle} onChange={event => { setVehicle(event.target.value); setOrder(""); }}><option value="">Department / general expense</option>{model.vehicles.map(item => <option key={item.id} value={item.id}>{[item.year, item.make, item.model, item.stockNumber || item.vehicleNumber].filter(Boolean).join(" · ")}</option>)}</select></label>
        <label>Existing repair order<select value={order} onChange={event => { const found = model.orders.find(item => item.id === event.target.value); setOrder(event.target.value); if (found) setVehicle(found.vehicleId); }}><option value="">Not linked to an RO</option>{model.orders.filter(item => !vehicle || item.vehicleId === vehicle).map(item => <option key={item.id} value={item.id}>{item.repairOrderNumber}</option>)}</select></label>
        <label>Existing vendor<select aria-label="Existing vendor" value={vendorId} onChange={event => setVendorId(event.target.value)}><option value="">Not selected / merchant entered above</option>{model.vendors.map(vendor => <option key={vendor.id} value={vendor.id}>{vendor.name}</option>)}</select></label>
        <label>Purchase / payment reference (optional)<input name="reference" maxLength={150} /></label><label>Existing inventory cost ID (optional)<input name="inventoryCostId" placeholder="Link an already recorded matching cost" /></label>
      </div></details>
      <div className={`${styles.actions} ${styles.wide}`}><button disabled={busy} type="submit" value="save">{busy ? "Saving…" : "Save spending"}</button><button disabled={busy} type="submit" value="another">Save & add another</button></div>
    </form>{addingCard && model.manager ? <InlineCompanyCard model={model} onCancel={() => setAddingCard(false)} onSaved={async id => { await onSaved(); setMethod("CARD"); setSourceId(id); setAuthorizationId(""); setPurchaseApprovalId(""); setAddingCard(false); }} /> : null}{notice ? <p className={failed ? styles.error : styles.notice} role={failed ? "alert" : "status"}>{notice}</p> : null}
  </section>;
}

function InlineCompanyCard({ model, onSaved, onCancel }: { model: MoneyResourcesModel; onSaved: (id: string) => Promise<void>; onCancel: () => void }) {
  const { send: save } = useSave();
  const nameRef = useRef<HTMLInputElement>(null);
  useEffect(() => { nameRef.current?.scrollIntoView({ block: "center", behavior: "smooth" }); nameRef.current?.focus({ preventScroll: true }); }, []);
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy) return;
    const fields = Object.fromEntries(new FormData(event.currentTarget));
    setBusy(true); setError("");
    try {
      const result = await save({ ...fields, action: "CREATE_ACCOUNT", kind: "CARD" });
      if (!result.id) throw new Error("The card could not be selected. Refresh the available funding sources.");
      await onSaved(result.id);
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Card not saved. Your spending form is still here."); }
    finally { setBusy(false); }
  }
  return <section id="inline-company-card" className={styles.panel} aria-label="Add company card"><h3>Add company card</h3><p>Your spending details stay in place. Enter only the last four digits, never the full card number.</p><form className={styles.form} onSubmit={event => void submit(event)}>
    <label>Card name<input ref={nameRef} name="label" required maxLength={100} placeholder="Company Visa" /></label>
    <label>Cardholder<select name="employeeId" aria-label="Cardholder" required><option value="">Choose responsible staff</option>{model.users.map(user => <option key={user.id} value={user.id}>{user.name}</option>)}</select></label>
    <label>Last four digits<input name="lastFour" required pattern="[0-9]{4}" maxLength={4} inputMode="numeric" autoComplete="off" /></label>
    <div className={styles.actions}><button type="submit" disabled={busy}>{busy ? "Saving card…" : "Save card & select"}</button><button type="button" disabled={busy} onClick={onCancel}>Cancel card</button></div>
  </form>{error ? <p className={styles.error} role="alert">{error}</p> : null}</section>;
}
