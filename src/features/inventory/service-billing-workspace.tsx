"use client";

import Link from "next/link";
import { BillingDocumentLink } from "./billing-document-link";
import { nextBillingTask } from "@/lib/service-billing-workflow";
import styles from "./service-billing-workspace.module.css";
import { useEffect, useRef, useState } from "react";
import { InvoiceRequirements } from "./invoice-requirements";

type Billing = {
  readiness?: { mismatchCodes: string[] };
  order: { id: string; repairOrderNumber: string };
  packages: { id: string; version: number; billingMode: string; mismatchCodes: string[]; identity?: { customer: string; vehicle: string; vin: string }; preview?: { lines: { key: string; description: string; quantity: number; totalCents: number }[]; subtotalCents: number; discountCents: number; taxCents: number; totalCents: number } }[];
  invoices: { id: string; invoiceNumber: string; version: number; status: string; totalCents: number; ledger: { lines: { key: string; description: string }[] }; balance: { balanceCents: number; settlement: string }; entries: { id: string; kind: string; method: string | null; amountCents: number; reference: string; occurredAt: string }[] }[];
};
const money = (cents: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
async function fetchBilling(repairOrderId: string, signal?: AbortSignal): Promise<Billing> {
  const response = await fetch(`/api/repair-orders/${encodeURIComponent(repairOrderId)}/billing`, { cache: "no-store", signal });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error ?? "Billing could not be loaded.");
  return body;
}
export function ServiceBillingWorkspace({ repairOrderId: initialId, onDocumentReady, onLockChange }: { repairOrderId: string; onDocumentReady?: (sourceId: string) => void; onLockChange?: (locked: boolean) => void }) {
  const documentMode = Boolean(onDocumentReady);
  const [paymentVerified, setPaymentVerified] = useState(false);
  const feedbackRef = useRef<HTMLDivElement>(null);
  const [repairOrderId, setRepairOrderId] = useState(initialId), [billing, setBilling] = useState<Billing | null>(null), [error, setError] = useState(""), [notice, setNotice] = useState(""), [busy, setBusy] = useState(Boolean(initialId));
  const [action, setAction] = useState("PREPARE_INVOICE"), [subjectId, setSubjectId] = useState(""), [amount, setAmount] = useState(""), [reference, setReference] = useState(""), [method, setMethod] = useState("CASH"), [evidence, setEvidence] = useState(""), [reason, setReason] = useState(""), [relatedEntryId, setRelatedEntryId] = useState(""), [creditComponents, setCreditComponents] = useState({subtotal:"",discount:"",tax:"",lineKeys:[] as string[]}), [pending, setPending] = useState<Record<string, unknown> | null>(null);
  useEffect(() => {
    if (!initialId) return;
    const controller = new AbortController();
    void fetchBilling(initialId, controller.signal).then(body => { if (!controller.signal.aborted) { setBilling(body); const task = nextBillingTask(body); setAction(task.action); setSubjectId(task.subjectId); if (documentMode && task.action === "PAYMENT") setAmount(((body.invoices.find(invoice => invoice.id === task.subjectId)?.balance.balanceCents ?? 0) / 100).toFixed(2)); } }).catch(failure => { if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : "Billing could not be loaded."); }).finally(() => { if (!controller.signal.aborted) setBusy(false); });
    return () => controller.abort();
  }, [initialId, documentMode]);
  useEffect(() => { onLockChange?.(busy || Boolean(pending)); }, [busy, pending, onLockChange]);
  useEffect(() => {
    if (!error && !notice) return;
    feedbackRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    feedbackRef.current?.focus({ preventScroll: true });
  }, [error, notice]);
  async function load() {
    setError("");
    const body = await fetchBilling(repairOrderId);
    setBilling(body);
    const task = nextBillingTask(body); setAction(task.action); setSubjectId(task.subjectId);
    return body;
  }
  async function submit() {
    setBusy(true); setError(""); setNotice("");
    try {
      const invoice = billing?.invoices.find(item => item.id === subjectId);
      const command = pending ?? { action, idempotencyKey: crypto.randomUUID(), reason: reason || (documentMode && action === "PAYMENT" ? "Record verified customer payment against the issued service invoice." : ""), occurredAt: new Date().toISOString(), packageId: subjectId, invoiceId: subjectId, expectedVersion: invoice?.version, amountCents: Math.round(Number(amount) * 100), reference, evidence: documentMode && action === "PAYMENT" ? [reference] : evidence.split("\n").filter(Boolean), method, relatedEntryId, ...(action === "CREDIT" ? { creditComponents: {subtotalCents:Math.round(Number(creditComponents.subtotal)*100),discountCents:Math.round(Number(creditComponents.discount)*100),taxCents:Math.round(Number(creditComponents.tax)*100),lineKeys:creditComponents.lineKeys} } : {}) };
      setPending(command);
      const response = await fetch(`/api/repair-orders/${encodeURIComponent(billing!.order.id)}/billing`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(command) });
      const body = await response.json();
      if (!response.ok) { if (response.status < 500) setPending(null); throw new Error(body.error ?? "Billing command failed."); }
      const sourceId = command.action === "POST_INVOICE" ? body.result?.id : body.result?.entryId;
      if (onDocumentReady && typeof sourceId === "string" && sourceId) { setPending(null); onDocumentReady(sourceId); return; }
      setPending(null); setNotice(body.duplicate ? "Original receipt recovered; no duplicate financial entry was made." : command.action === "POST_INVOICE" ? "Invoice generated. Open the issued invoice below to print or save as PDF." : command.action === "PAYMENT" ? "Payment recorded and receipt generated. Open the receipt below to print or save as PDF." : "Financial activity recorded. Review the frozen document below.");
      const refreshed = await load();
      if (command.action === "PREPARE_INVOICE") {
        const task = nextBillingTask(refreshed);
        const ready = task.action === "POST_INVOICE";
        setAction(task.action);
        setSubjectId(task.subjectId);
        setNotice(task.action === "PAYMENT" ? "An invoice already exists. Open it below." : ready ? "Ready to create the invoice. Review the total below." : "Invoice not created. Complete the requirements below, then recheck.");
      }
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Request failed. Retry the unchanged request to recover its receipt."); }
    finally { setBusy(false); }
  }
  async function refreshReadiness() {
    setBusy(true); setError(""); setNotice("");
    try {
      const current = await load();
      const codes = current.readiness?.mismatchCodes ?? current.packages[0]?.mismatchCodes ?? [];
      setNotice(codes.length ? "Requirements are still missing. Use the highlighted links below." : "Requirements refreshed. Continue with the invoice action below.");
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Unable to refresh invoice requirements."); }
    finally { setBusy(false); }
  }
  const invoiceAction = action === "PREPARE_INVOICE" || action === "POST_INVOICE";
  const latestPackage = billing?.packages[0];
  const readinessCodes = billing?.readiness?.mismatchCodes ?? latestPackage?.mismatchCodes ?? [];
  return <section className={styles.workspace}><h1>Service Billing</h1><p>Review approved work, issue the invoice, then record payment.</p><details open={!initialId || undefined}><summary>Choose / change repair order</summary><form onSubmit={event => { event.preventDefault(); setBusy(true); void load().catch(failure => setError(failure.message)).finally(() => setBusy(false)); }}><label>Repair order ID <input disabled={busy || Boolean(pending)} value={repairOrderId} onChange={event => { setRepairOrderId(event.target.value); setBilling(null); setPending(null); }} required /></label><button disabled={busy || Boolean(pending)}>Load repair order</button></form></details>
    <div ref={feedbackRef} tabIndex={-1}>{error && <p role="alert">{error}</p>}{notice && <p role="status">{notice}</p>}</div>
    {billing && <><h2>{billing.order.repairOrderNumber}</h2><Link href={`/service-documents?repairOrderId=${encodeURIComponent(billing.order.id)}`}>Documents, authorizations, invoices and receipts</Link>
      {billing.invoices.map(invoice => <article key={invoice.id}><h3>{invoice.invoiceNumber} — {invoice.status}</h3><BillingDocumentLink repairOrderId={billing.order.id} sourceId={invoice.id} onOpen={onDocumentReady ? sourceId => { if (!busy && !pending) onDocumentReady(sourceId); } : undefined} /><p>Total {money(invoice.totalCents)} · Open balance {money(invoice.balance.balanceCents)} · {invoice.balance.settlement} · version {invoice.version}</p>{invoice.entries.length > 0 && <section aria-label={`Receipts for ${invoice.invoiceNumber}`}><h4>Saved receipts</h4><ul>{invoice.entries.map(entry => <li key={entry.id}>{entry.kind} {money(entry.amountCents)} — {entry.reference} · {entry.method} · {entry.occurredAt}{" · "}<BillingDocumentLink repairOrderId={billing.order.id} sourceId={entry.id} receipt onOpen={onDocumentReady ? sourceId => { if (!busy && !pending) onDocumentReady(sourceId); } : undefined} /></li>)}</ul></section>}</article>)}
      {invoiceAction && <p>{action === "POST_INVOICE" ? "Current invoice package selected. Authorization, completed work and QC are checked again when you issue." : "Prepare the invoice from the approved RO. No customer, work or prices need re-entry."}</p>}
      {invoiceAction && <InvoiceRequirements repairOrderId={billing.order.id} codes={readinessCodes} billingMode={latestPackage?.billingMode} />}
      {invoiceAction && <button type="button" disabled={busy || Boolean(pending)} onClick={() => void refreshReadiness()}>{busy ? "Checking requirements…" : "Recheck QC & invoice requirements"}</button>}
      {action === "POST_INVOICE" && latestPackage?.preview && <section className={styles.invoicePreview} aria-label="Invoice review"><h3>Review final invoice</h3>{latestPackage.identity && <p>{latestPackage.identity.customer} · {latestPackage.identity.vehicle} · VIN {latestPackage.identity.vin}</p>}<table><thead><tr><th>Approved work / item</th><th>Qty</th><th>Amount</th></tr></thead><tbody>{latestPackage.preview.lines.map(line => <tr key={line.key}><td>{line.description}</td><td>{line.quantity}</td><td>{money(line.totalCents)}</td></tr>)}</tbody></table><dl><dt>Subtotal</dt><dd>{money(latestPackage.preview.subtotalCents)}</dd><dt>Discount</dt><dd>{money(latestPackage.preview.discountCents)}</dd><dt>Tax</dt><dd>{money(latestPackage.preview.taxCents)}</dd><dt>Total to invoice</dt><dd><strong>{money(latestPackage.preview.totalCents)}</strong></dd></dl></section>}
      {documentMode && action === "PAYMENT" && <form onSubmit={event => { event.preventDefault(); if (paymentVerified) void submit(); }}><fieldset disabled={busy || Boolean(pending)}><legend>Record payment & generate receipt</legend><p>Record money already received. This does not charge a card or move money.</p><label>Amount received (USD)<input required type="number" min="0.01" step="0.01" value={amount} onChange={event => setAmount(event.target.value)} /></label><label>Payment method<select value={method} onChange={event => setMethod(event.target.value)}><option value="CASH">Cash</option><option value="CHECK">Check</option><option value="EXTERNAL_CARD">Card — processed externally</option><option value="BANK_TRANSFER">Bank transfer</option><option value="OTHER">Other</option></select></label><label>Verified payment evidence / reference<input required minLength={3} maxLength={200} value={reference} onChange={event => setReference(event.target.value)} placeholder="Cashier record, check or processor receipt reference" /></label><p>Never enter card or bank account numbers. Partial payments create a receipt with the remaining balance.</p><label><input required type="checkbox" checked={paymentVerified} onChange={event => setPaymentVerified(event.target.checked)} /> I verified this payment was received for this invoice.</label><button disabled={!paymentVerified || !subjectId}>Record payment & view receipt</button></fieldset></form>}
      <div hidden={documentMode && (action === "PAYMENT" || (invoiceAction && readinessCodes.length > 0))}><form onSubmit={event => { event.preventDefault(); void submit(); }}><fieldset disabled={busy || Boolean(pending)}><legend>{invoiceAction ? "Final invoice" : "Record payment / adjustment"}</legend>{!invoiceAction && <><p>This records verified activity only; it does not charge a card or move money. Never enter card or bank account numbers.</p><label>Action <select value={action} onChange={event => { setAction(event.target.value); }}><option>PAYMENT</option><option>REFUND</option><option>CREDIT</option><option>VOID</option></select></label></>}{!invoiceAction && <label>Invoice <select value={subjectId} onChange={event => setSubjectId(event.target.value)} required><option value="">Select</option>{billing.invoices.filter(item => item.status === "POSTED").map(item => <option key={item.id} value={item.id}>{item.invoiceNumber}</option>)}</select></label>}
        {!["POST_INVOICE","PREPARE_INVOICE"].includes(action) && <><label>Amount (USD) <input type="number" min="0" step="0.01" value={amount} onChange={event => setAmount(event.target.value)} required={action !== "VOID"} /></label><label>Receipt / adjustment reference <input value={reference} onChange={event => setReference(event.target.value)} required /></label><label>Method <select value={method} onChange={event => setMethod(event.target.value)}>{["CASH", "CHECK", "EXTERNAL_CARD", "BANK_TRANSFER", "OTHER"].map(item => <option key={item}>{item}</option>)}</select></label><label>Evidence references (one per line) <textarea value={evidence} onChange={event => setEvidence(event.target.value)} required /></label></>}
        {action === "REFUND" && <label>Original payment receipt ID <input value={relatedEntryId} onChange={event => setRelatedEntryId(event.target.value)} required /></label>}
        {action === "CREDIT" && <fieldset><legend>Reviewed credit allocation — no tax rate is inferred</legend>{(["subtotal","discount","tax"] as const).map(field => <label key={field}>Credit {field} (USD)<input type="number" min="0" step="0.01" value={creditComponents[field]} onChange={event => setCreditComponents({...creditComponents,[field]:event.target.value})} required /></label>)}<label>Original invoice lines<select multiple required value={creditComponents.lineKeys} onChange={event => setCreditComponents({...creditComponents,lineKeys:Array.from(event.target.selectedOptions,option=>option.value)})}>{billing.invoices.find(invoice=>invoice.id===subjectId)?.ledger.lines.map(line=><option key={line.key} value={line.key}>{line.description}</option>)}</select></label><p>Confirm the actual tax and discount adjustment against the original invoice and attach your review evidence. Overlapping prior credits are conservatively limited.</p></fieldset>}
        <label>Detailed business reason <textarea minLength={10} value={reason} onChange={event => setReason(event.target.value)} required /></label><button disabled={action !== "PREPARE_INVOICE" && !subjectId}>{busy ? "Checking invoice…" : action === "POST_INVOICE" ? "Create Final Invoice" : action === "PREPARE_INVOICE" ? (latestPackage?.mismatchCodes.length ? "Recheck invoice requirements" : "Check invoice readiness") : `Record ${action.toLowerCase().replaceAll("_", " ")}`}</button></fieldset></form></div>
      <details><summary>Invoice tools & adjustments</summary><button type="button" disabled={busy || Boolean(pending)} onClick={() => void refreshReadiness()}>Recheck invoice readiness</button>{billing.invoices.filter(invoice => invoice.status === "POSTED").map(invoice => <button key={invoice.id} type="button" disabled={busy || Boolean(pending)} onClick={() => { setAction("CREDIT"); setSubjectId(invoice.id); }}>Credit / refund / void {invoice.invoiceNumber}</button>)}<Link href="/diagnostics/labor-reports">Labor and billing reports</Link></details>
      {pending && <><p>The outcome of this exact request is not yet confirmed. Retry without changing it; do not create a second payment.</p><button disabled={busy} onClick={() => void submit()}>Retry unchanged request</button></>}
    </>}
  </section>;
}
