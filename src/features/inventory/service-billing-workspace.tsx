"use client";

import Link from "next/link";
import { invoiceHoldLabel, nextBillingTask } from "@/lib/service-billing-workflow";
import styles from "./service-billing-workspace.module.css";
import { useEffect, useState } from "react";

type Billing = { order: { id: string; repairOrderNumber: string }; packages: { id: string; version: number; billingMode: string; mismatchCodes: string[]; identity?: { customer: string; vehicle: string; vin: string }; preview?: { lines: { key: string; description: string; quantity: number; totalCents: number }[]; subtotalCents: number; discountCents: number; taxCents: number; totalCents: number } }[]; invoices: { id: string; invoiceNumber: string; version: number; status: string; totalCents: number; ledger: { lines: {key:string;description:string}[] }; balance: { balanceCents: number; settlement: string }; entries: { id: string; kind: string; method: string | null; amountCents: number; reference: string; occurredAt: string }[] }[] };
const money = (cents: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
async function fetchBilling(repairOrderId: string, signal?: AbortSignal): Promise<Billing> {
  const response = await fetch(`/api/repair-orders/${encodeURIComponent(repairOrderId)}/billing`, { cache: "no-store", signal });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error ?? "Billing could not be loaded.");
  return body;
}
export function ServiceBillingWorkspace({ repairOrderId: initialId }: { repairOrderId: string }) {
  const [repairOrderId, setRepairOrderId] = useState(initialId), [billing, setBilling] = useState<Billing | null>(null), [error, setError] = useState(""), [notice, setNotice] = useState(""), [busy, setBusy] = useState(Boolean(initialId));
  const [action, setAction] = useState("PREPARE_INVOICE"), [subjectId, setSubjectId] = useState(""), [amount, setAmount] = useState(""), [reference, setReference] = useState(""), [method, setMethod] = useState("CASH"), [evidence, setEvidence] = useState(""), [reason, setReason] = useState(""), [relatedEntryId, setRelatedEntryId] = useState(""), [creditComponents, setCreditComponents] = useState({subtotal:"",discount:"",tax:"",lineKeys:[] as string[]}), [pending, setPending] = useState<Record<string, unknown> | null>(null);
  useEffect(() => {
    if (!initialId) return;
    const controller = new AbortController();
    void fetchBilling(initialId, controller.signal).then(body => { if (!controller.signal.aborted) { setBilling(body); const task = nextBillingTask(body); setAction(task.action); setSubjectId(task.subjectId); } }).catch(failure => { if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : "Billing could not be loaded."); }).finally(() => { if (!controller.signal.aborted) setBusy(false); });
    return () => controller.abort();
  }, [initialId]);
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
      const command = pending ?? { action, idempotencyKey: crypto.randomUUID(), reason, occurredAt: new Date().toISOString(), packageId: subjectId, invoiceId: subjectId, expectedVersion: invoice?.version, amountCents: Math.round(Number(amount) * 100), reference, evidence: evidence.split("\n").filter(Boolean), method, relatedEntryId, ...(action === "CREDIT" ? { creditComponents: {subtotalCents:Math.round(Number(creditComponents.subtotal)*100),discountCents:Math.round(Number(creditComponents.discount)*100),taxCents:Math.round(Number(creditComponents.tax)*100),lineKeys:creditComponents.lineKeys} } : {}) };
      setPending(command);
      const response = await fetch(`/api/repair-orders/${encodeURIComponent(billing!.order.id)}/billing`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(command) });
      const body = await response.json();
      if (!response.ok) { if (response.status < 500) setPending(null); throw new Error(body.error ?? "Billing command failed."); }
      setPending(null); setNotice(body.duplicate ? "Original receipt recovered; no duplicate financial entry was made." : "Financial activity recorded. Review the frozen document below.");
      const refreshed = await load();
      if (command.action === "PREPARE_INVOICE") {
        const task = nextBillingTask(refreshed);
        const ready = task.action === "POST_INVOICE";
        setAction(task.action);
        setSubjectId(task.subjectId);
        setNotice(task.action === "PAYMENT" ? "This RO already has an issued invoice. Open it above or record verified payment." : ready ? "Invoice package prepared. Review the package and business reason, then create the final invoice. Authorization, work completion and QC are checked again before issue." : "Invoice preparation has readiness holds. Resolve the listed issues before posting.");
      }
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Request failed. Retry the unchanged request to recover its receipt."); }
    finally { setBusy(false); }
  }
  const invoiceAction = action === "PREPARE_INVOICE" || action === "POST_INVOICE";
  const latestPackage = billing?.packages[0];
  return <section className={styles.workspace}><h1>Service Billing</h1><p>Review approved work, issue the invoice, then record payment.</p><details open={!initialId || undefined}><summary>Choose / change repair order</summary><form onSubmit={event => { event.preventDefault(); setBusy(true); void load().catch(failure => setError(failure.message)).finally(() => setBusy(false)); }}><label>Repair order ID <input disabled={busy || Boolean(pending)} value={repairOrderId} onChange={event => { setRepairOrderId(event.target.value); setBilling(null); setPending(null); }} required /></label><button disabled={busy || Boolean(pending)}>Load repair order</button></form></details>
    {error && <p role="alert">{error}</p>}{notice && <p role="status">{notice}</p>}
    {billing && <><h2>{billing.order.repairOrderNumber}</h2><Link href={`/service-documents?repairOrderId=${encodeURIComponent(billing.order.id)}`}>Documents, authorizations, invoices and receipts</Link>
      {billing.invoices.map(invoice => <article key={invoice.id}><h3>{invoice.invoiceNumber} — {invoice.status}</h3><Link href={`/service-documents?repairOrderId=${encodeURIComponent(billing.order.id)}&sourceId=${encodeURIComponent(invoice.id)}`}>Open / Print Final Invoice</Link><p>Total {money(invoice.totalCents)} · Open balance {money(invoice.balance.balanceCents)} · {invoice.balance.settlement} · version {invoice.version}</p><details><summary>Payment & adjustment history</summary><ul>{invoice.entries.map(entry => <li key={entry.id}>{entry.kind} {money(entry.amountCents)} — {entry.reference} · {entry.method} · {entry.occurredAt}<br />Receipt ID: {entry.id}</li>)}</ul></details></article>)}
      {invoiceAction && <p>{action === "POST_INVOICE" ? "Current invoice package selected. Authorization, completed work and QC are checked again when you issue." : "Prepare the invoice from the approved RO. No customer, work or prices need re-entry."}</p>}
      {invoiceAction && latestPackage && (latestPackage.mismatchCodes.length > 0 || latestPackage.billingMode !== "NATIVE") && <div role="status"><strong>Before invoicing</strong><ul>{latestPackage.mismatchCodes.map(code => <li key={code}>{invoiceHoldLabel(code)}</li>)}</ul>{latestPackage.billingMode !== "NATIVE" && <p>This package is not a native customer invoice. Review its billing path.</p>}<Link href={`/vehicles/repair-workbench?repairOrderId=${encodeURIComponent(billing.order.id)}`}>Resolve RO requirements</Link></div>}
      {action === "POST_INVOICE" && latestPackage?.preview && <section className={styles.invoicePreview} aria-label="Invoice review"><h3>Review final invoice</h3>{latestPackage.identity && <p>{latestPackage.identity.customer} · {latestPackage.identity.vehicle} · VIN {latestPackage.identity.vin}</p>}<table><thead><tr><th>Approved work / item</th><th>Qty</th><th>Amount</th></tr></thead><tbody>{latestPackage.preview.lines.map(line => <tr key={line.key}><td>{line.description}</td><td>{line.quantity}</td><td>{money(line.totalCents)}</td></tr>)}</tbody></table><dl><dt>Subtotal</dt><dd>{money(latestPackage.preview.subtotalCents)}</dd><dt>Discount</dt><dd>{money(latestPackage.preview.discountCents)}</dd><dt>Tax</dt><dd>{money(latestPackage.preview.taxCents)}</dd><dt>Total to invoice</dt><dd><strong>{money(latestPackage.preview.totalCents)}</strong></dd></dl></section>}
      <form onSubmit={event => { event.preventDefault(); void submit(); }}><fieldset disabled={busy || Boolean(pending)}><legend>{invoiceAction ? "Final invoice" : "Record payment / adjustment"}</legend>{!invoiceAction && <><p>This records verified activity only; it does not charge a card or move money. Never enter card or bank account numbers.</p><label>Action <select value={action} onChange={event => { setAction(event.target.value); }}><option>PAYMENT</option><option>REFUND</option><option>CREDIT</option><option>VOID</option></select></label></>}{!invoiceAction && <label>Invoice <select value={subjectId} onChange={event => setSubjectId(event.target.value)} required><option value="">Select</option>{billing.invoices.filter(item => item.status === "POSTED").map(item => <option key={item.id} value={item.id}>{item.invoiceNumber}</option>)}</select></label>}
        {!["POST_INVOICE","PREPARE_INVOICE"].includes(action) && <><label>Amount (USD) <input type="number" min="0" step="0.01" value={amount} onChange={event => setAmount(event.target.value)} required={action !== "VOID"} /></label><label>Receipt / adjustment reference <input value={reference} onChange={event => setReference(event.target.value)} required /></label><label>Method <select value={method} onChange={event => setMethod(event.target.value)}>{["CASH", "CHECK", "EXTERNAL_CARD", "BANK_TRANSFER", "OTHER"].map(item => <option key={item}>{item}</option>)}</select></label><label>Evidence references (one per line) <textarea value={evidence} onChange={event => setEvidence(event.target.value)} required /></label></>}
        {action === "REFUND" && <label>Original payment receipt ID <input value={relatedEntryId} onChange={event => setRelatedEntryId(event.target.value)} required /></label>}
        {action === "CREDIT" && <fieldset><legend>Reviewed credit allocation — no tax rate is inferred</legend>{(["subtotal","discount","tax"] as const).map(field => <label key={field}>Credit {field} (USD)<input type="number" min="0" step="0.01" value={creditComponents[field]} onChange={event => setCreditComponents({...creditComponents,[field]:event.target.value})} required /></label>)}<label>Original invoice lines<select multiple required value={creditComponents.lineKeys} onChange={event => setCreditComponents({...creditComponents,lineKeys:Array.from(event.target.selectedOptions,option=>option.value)})}>{billing.invoices.find(invoice=>invoice.id===subjectId)?.ledger.lines.map(line=><option key={line.key} value={line.key}>{line.description}</option>)}</select></label><p>Confirm the actual tax and discount adjustment against the original invoice and attach your review evidence. Overlapping prior credits are conservatively limited.</p></fieldset>}
        <label>Detailed business reason <textarea minLength={10} value={reason} onChange={event => setReason(event.target.value)} required /></label><button disabled={action !== "PREPARE_INVOICE" && !subjectId}>{action === "POST_INVOICE" ? "Create Final Invoice" : action === "PREPARE_INVOICE" ? "Prepare invoice package" : `Record ${action.toLowerCase().replaceAll("_", " ")}`}</button></fieldset></form>
      <details><summary>Invoice tools & adjustments</summary><button type="button" disabled={busy || Boolean(pending)} onClick={() => { setAction("PREPARE_INVOICE"); setSubjectId(""); }}>Recheck invoice readiness</button>{billing.invoices.filter(invoice => invoice.status === "POSTED").map(invoice => <button key={invoice.id} type="button" disabled={busy || Boolean(pending)} onClick={() => { setAction("CREDIT"); setSubjectId(invoice.id); }}>Credit / refund / void {invoice.invoiceNumber}</button>)}<Link href="/diagnostics/labor-reports">Labor and billing reports</Link></details>
      {pending && <><p>The outcome of this exact request is not yet confirmed. Retry without changing it; do not create a second payment.</p><button disabled={busy} onClick={() => void submit()}>Retry unchanged request</button></>}
    </>}
  </section>;
}
