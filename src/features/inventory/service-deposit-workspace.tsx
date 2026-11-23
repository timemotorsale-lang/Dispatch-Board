"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export type RepairDeposits = {
  storageReady?: boolean;
  version: number;
  entries: { id: string; kind: string; relatedEntryId: string | null; invoiceId: string | null; invoiceEntryId?: string | null; method: string | null; amountCents: number; occurredAt: string; reference: string; documentId: string | null }[];
  balance: { collectedCents: number; refundedCents: number; appliedCents: number; availableCents: number };
  collectionAvailability: { allowed: boolean; reason: string | null; maxAmountCents: number };
};
type Invoice = { id: string; invoiceNumber: string; status: string; version: number; totalCents?: number; balance: { balanceCents: number } };
type Action = "DEPOSIT" | "REFUND_DEPOSIT" | "APPLY_DEPOSIT" | "UNAPPLY_DEPOSIT";
const labels: Record<Action, string> = { DEPOSIT: "Record repair deposit", REFUND_DEPOSIT: "Record deposit refund", APPLY_DEPOSIT: "Apply deposit to invoice", UNAPPLY_DEPOSIT: "Reverse deposit application" };
const money = (cents: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
export function ServiceDepositWorkspace({ repairOrderId, deposits, invoices, returnTo, canManage, blockReason, disabled, preferredInvoiceId, onRefresh, onLockChange }: {
  repairOrderId: string; returnTo?: string; deposits: RepairDeposits; invoices: Invoice[]; canManage: boolean; blockReason?: string | null; disabled: boolean; preferredInvoiceId?: string;
  onRefresh: () => Promise<unknown>; onLockChange: (locked: boolean) => void;
}) {
  const [action, setAction] = useState<Action>("DEPOSIT");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("CASH");
  const [reference, setReference] = useState("");
  const [date, setDate] = useState("");
  const [note, setNote] = useState("");
  const [sourceId, setSourceId] = useState("");
  const [invoiceId, setInvoiceId] = useState(preferredInvoiceId ?? "");
  const [verified, setVerified] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState("");
  const [receipt, setReceipt] = useState<{ id: string; action: Action } | null>(null);
  const [needsRefresh, setNeedsRefresh] = useState(false);
  const sending = useRef(false);
  const feedback = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!pending || typeof window === "undefined") return;
    const warnBeforeLeaving = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warnBeforeLeaving);
    return () => window.removeEventListener("beforeunload", warnBeforeLeaving);
  }, [pending]);
  useEffect(() => { onLockChange(busy || Boolean(pending)); }, [busy, pending, onLockChange]);
  useEffect(() => { if (error || receipt) { feedback.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }); feedback.current?.focus({ preventScroll: true }); } }, [error, receipt]);
  const movement = action === "APPLY_DEPOSIT" || action === "UNAPPLY_DEPOSIT";
  const source = deposits.entries.find(entry => entry.id === sourceId);
  const selectedInvoiceId = action === "UNAPPLY_DEPOSIT" ? source?.invoiceId : invoiceId;
  const invoice = invoices.find(item => item.id === selectedInvoiceId);
  const postedInvoices = invoices.filter(item => item.status === "POSTED" && (!preferredInvoiceId || item.id === preferredInvoiceId));
  const amountContext = movement ? (invoice ? [invoice] : []) : postedInvoices;
  const collectionBlocked = action === "DEPOSIT" && !deposits.collectionAvailability.allowed;
  const blocked = disabled || deposits.storageReady === false || !canManage || collectionBlocked || needsRefresh;
  const receiptHref = (id: string) => `/service-documents?${new URLSearchParams({ repairOrderId, documentId: id, workspace: "1", ...(returnTo ? { returnTo } : {}) })}`;
  async function reload() {
    if (sending.current || disabled) return;
    setBusy(true); setError("");
    try { await onRefresh(); setNeedsRefresh(false); }
    catch { setError("The saved receipt is available, but balances could not refresh. Retry loading balances before another action."); }
    finally { setBusy(false); }
  }
  async function submit() {
    if (sending.current || disabled || (!pending && (blocked || !verified))) return;
    sending.current = true; setBusy(true); setError("");
    try {
      const amountCents = Math.round(Number(amount) * 100);
      if (!pending && (!Number.isSafeInteger(amountCents) || amountCents <= 0 || (action !== "DEPOSIT" && !source) || (movement && !invoice))) throw new Error("Enter an amount and select the original deposit or application and invoice.");
      const command = pending ?? {
        action, expectedVersion: deposits.version, idempotencyKey: crypto.randomUUID(), amountCents,
        occurredAt: date ? new Date(date).toISOString() : new Date().toISOString(), reference,
        evidence: [reference], reason: `${labels[action]} after staff verification.${note.trim() ? ` Note: ${note.trim()}` : ""}`,
        ...(action === "DEPOSIT" ? { method } : { relatedEntryId: sourceId }),
        ...(action === "REFUND_DEPOSIT" ? { method: source?.method } : {}),
        ...(movement ? { invoiceId: invoice?.id, invoiceExpectedVersion: invoice?.version } : {})
      };
      setPending(command);
      const response = await fetch(`/api/repair-orders/${encodeURIComponent(repairOrderId)}/billing`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(command) });
      const body = await response.json();
      if (!response.ok) {
        if (response.status < 500) setPending(null);
        if (response.status === 409) { setNeedsRefresh(true); setVerified(false); throw new Error(`${body.error ?? "Deposit or invoice version changed."} Reload deposit balances, review the preserved fields, then confirm again.`); }
        throw new Error(body.error ?? "Deposit action could not be recorded.");
      }
      if (typeof body.result?.documentId !== "string" || !body.result.documentId || typeof body.result?.entryId !== "string" || !body.result.entryId) throw new Error("The deposit response was incomplete. Retry the unchanged request to recover its exact receipt.");
      setReceipt({ id: body.result.documentId, action: command.action as Action }); setPending(null);
      setAmount(""); setReference(""); setDate(""); setNote(""); setVerified(false);
      try { await onRefresh(); setNeedsRefresh(false); }
      catch { setNeedsRefresh(true); setError("The deposit action was saved. Its receipt is available below. Balances could not refresh; reload them before recording another action."); }
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Outcome uncertain. Retry the unchanged request."); }
    finally { sending.current = false; setBusy(false); }
  }
  return <section aria-label="Repair deposits"><h2>Repair deposits</h2>
    <p>Record money already received for this repair order. This does not process a card charge or move money. Deposits do not authorize repairs or issue an invoice.</p>
    <dl><dt>Deposits received</dt><dd>{money(deposits.balance.collectedCents)}</dd><dt>Deposit refunds</dt><dd>{money(deposits.balance.refundedCents)}</dd><dt>Applied to invoices</dt><dd>{money(deposits.balance.appliedCents)}</dd><dt>Unapplied deposit</dt><dd>{money(deposits.balance.availableCents)}</dd></dl>
    <p>Invoice balances already include applied deposits. Do not subtract them again when recording the remaining payment.</p>
    <div ref={feedback} tabIndex={-1}>{error && <p role="alert">{error}</p>}{receipt && <p role="status">{labels[receipt.action]} saved. <Link href={receiptHref(receipt.id)} aria-disabled={Boolean(pending) || undefined} onClick={event => { if (pending) event.preventDefault(); }}>Open / Print {receipt.action === "DEPOSIT" ? "Repair Deposit Receipt" : "Deposit Record"}</Link></p>}{needsRefresh && <button type="button" disabled={busy || disabled} onClick={() => void reload()}>Reload deposit balances</button>}</div>
    {!canManage && <p id={`deposit-blocked-${repairOrderId}`} role="status">{blockReason ?? "Viewing receipts is allowed; recording deposit activity requires billing manage access."}</p>}
    <form onSubmit={event => { event.preventDefault(); void submit(); }}>
      <fieldset aria-describedby={!canManage ? `deposit-blocked-${repairOrderId}` : undefined} disabled={disabled || busy || Boolean(pending) || !canManage || deposits.storageReady === false || needsRefresh}><legend>Deposit activity</legend>
        <label>Action<select value={action} onChange={event => { setAction(event.target.value as Action); setSourceId(""); setAmount(""); setVerified(false); setReference(""); setNote(""); }}>{Object.entries(labels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        {collectionBlocked && <p role="status">{deposits.collectionAvailability.reason ?? "A deposit cannot be recorded for this repair order. Review its estimate and billing state."}</p>}
        {movement && <p>This transfers deposit credit within the repair ledger. No additional money is collected or refunded.</p>}
        {action === "REFUND_DEPOSIT" && <p>Record a refund already returned to the customer, against the original deposit and its original payment method.</p>}
        {action !== "DEPOSIT" && <label>{action === "UNAPPLY_DEPOSIT" ? "Original application" : "Original repair deposit"}<select required value={sourceId} onChange={event => { setSourceId(event.target.value); setVerified(false); }}><option value="">Select a recorded entry</option>{deposits.entries.filter(entry => entry.kind === (action === "UNAPPLY_DEPOSIT" ? "APPLY" : "COLLECTION") && (action !== "UNAPPLY_DEPOSIT" || !preferredInvoiceId || entry.invoiceId === preferredInvoiceId)).map(entry => <option key={entry.id} value={entry.id}>{entry.reference} · {money(entry.amountCents)} · {entry.invoiceId ? invoices.find(invoice => invoice.id === entry.invoiceId)?.invoiceNumber ?? "Issued invoice" : "Repair deposit"} · {entry.occurredAt}</option>)}</select></label>}
        {action === "APPLY_DEPOSIT" && <label>Invoice<select required value={invoiceId} onChange={event => { setInvoiceId(event.target.value); setVerified(false); }}><option value="">Select issued invoice</option>{invoices.filter(item => item.status === "POSTED" && (!preferredInvoiceId || item.id === preferredInvoiceId)).map(item => <option key={item.id} value={item.id}>{item.invoiceNumber} · remaining {money(item.balance.balanceCents)}</option>)}</select></label>}
        <label>Amount (USD)
          <span>{amountContext.length ? amountContext.map(item => <span key={item.id} style={{ display: "block" }}>{item.invoiceNumber} · {item.totalCents !== undefined && <>Total {money(item.totalCents)} · </>}Balance due {money(item.balance.balanceCents)}</span>) : action === "DEPOSIT" ? "No issued invoice yet. Enter the amount received." : null}</span>
          <input required type="number" min="0.01" step="0.01" max={action === "DEPOSIT" ? deposits.collectionAvailability.maxAmountCents / 100 : undefined} value={amount} onChange={event => { setAmount(event.target.value); setVerified(false); }} /></label>
        {action === "DEPOSIT" && <label>Payment method<select value={method} onChange={event => { setMethod(event.target.value); setVerified(false); }}><option value="CASH">Cash</option><option value="EXTERNAL_CARD">Card — processed externally</option><option value="CHECK">Check</option><option value="BANK_TRANSFER">Bank transfer</option><option value="OTHER">Other</option></select></label>}
        {action === "REFUND_DEPOSIT" && source && <p>Original payment method: {source.method?.replaceAll("_", " ") ?? "Not recorded"}</p>}
        <label>{movement ? "Application reference" : "Verified payment / refund reference"}<input required minLength={3} maxLength={200} placeholder={movement ? "Staff allocation record" : "Cashier record, check number, or external card receipt"} value={reference} onChange={event => { setReference(event.target.value); setVerified(false); }} /></label>
        <label>{movement ? "Application date (optional)" : "Money received / refunded at (optional)"}<input type="datetime-local" step="0.001" value={date} onChange={event => { setDate(event.target.value); setVerified(false); }} /></label>
        <details><summary>Optional note</summary><label>Note<textarea maxLength={400} value={note} onChange={event => setNote(event.target.value)} placeholder="For example: customer requested a deposit toward the approved repair" /></label></details>
        <p>Never enter card numbers, security codes, or bank account details.</p>
        <label><input required type="checkbox" checked={verified} onChange={event => setVerified(event.target.checked)} />{movement ? " I verified this deposit allocation and the selected invoice." : action === "DEPOSIT" ? " I verified this money was received for this repair." : " I verified this refund was returned to the customer."}</label>
        <button disabled={!verified || collectionBlocked} type="submit">{busy ? "Recording…" : labels[action]}</button>
      </fieldset>
    </form>
    {pending && <><p>The outcome is not yet confirmed. Retry the exact request; do not collect or refund the money again.</p><button type="button" disabled={busy || disabled} onClick={() => void submit()}>Retry unchanged deposit request</button></>}
    <details><summary>Deposit receipts &amp; applications · {deposits.entries.length}</summary><ul>{deposits.entries.map(entry => <li key={entry.id}>{entry.kind} · {money(entry.amountCents)} · {entry.reference} · {entry.occurredAt}{entry.documentId && <> · <Link href={receiptHref(entry.documentId)} aria-disabled={busy || Boolean(pending) || undefined} onClick={event => { if (busy || pending) event.preventDefault(); }}>Open / Print Deposit Record</Link></>}</li>)}</ul></details>
  </section>;
}
