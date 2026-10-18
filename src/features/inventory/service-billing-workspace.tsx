"use client";

import Link from "next/link";
import styles from "./service-billing-workspace.module.css";
import { useState } from "react";

type Billing = { order: { id: string; repairOrderNumber: string }; packages: { id: string; version: number; billingMode: string; mismatchCodes: string[] }[]; invoices: { id: string; invoiceNumber: string; version: number; status: string; totalCents: number; ledger: { lines: {key:string;description:string}[] }; balance: { balanceCents: number; settlement: string }; entries: { id: string; kind: string; method: string | null; amountCents: number; reference: string; occurredAt: string }[] }[] };
const money = (cents: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
export function ServiceBillingWorkspace({ repairOrderId: initialId }: { repairOrderId: string }) {
  const [repairOrderId, setRepairOrderId] = useState(initialId), [billing, setBilling] = useState<Billing | null>(null), [error, setError] = useState(""), [notice, setNotice] = useState(""), [busy, setBusy] = useState(false);
  const [action, setAction] = useState("POST_INVOICE"), [subjectId, setSubjectId] = useState(""), [amount, setAmount] = useState(""), [reference, setReference] = useState(""), [method, setMethod] = useState("CASH"), [evidence, setEvidence] = useState(""), [reason, setReason] = useState(""), [relatedEntryId, setRelatedEntryId] = useState(""), [creditComponents, setCreditComponents] = useState({subtotal:"",discount:"",tax:"",lineKeys:[] as string[]}), [pending, setPending] = useState<Record<string, unknown> | null>(null);
  async function load() {
    setError("");
    const response = await fetch(`/api/repair-orders/${encodeURIComponent(repairOrderId)}/billing`, { cache: "no-store" });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error ?? "Billing could not be loaded.");
    setBilling(body);
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
      await load();
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Request failed. Retry the unchanged request to recover its receipt."); }
    finally { setBusy(false); }
  }
  return <section className={styles.workspace}><h1>Service Billing</h1><p>Native invoices and verified payment receipts. This app does not charge cards or move money. Never enter card or bank account numbers.</p><Link href="/diagnostics/labor-reports">Labor and billing reports</Link><form onSubmit={event => { event.preventDefault(); setBusy(true); void load().catch(failure => setError(failure.message)).finally(() => setBusy(false)); }}><label>Repair order ID <input disabled={busy || Boolean(pending)} value={repairOrderId} onChange={event => { setRepairOrderId(event.target.value); setBilling(null); setPending(null); }} required /></label><button disabled={busy}>Load repair order</button></form>
    {error && <p role="alert">{error}</p>}{notice && <p role="status">{notice}</p>}
    {billing && <><h2>{billing.order.repairOrderNumber}</h2><Link href={`/service-documents?repairOrderId=${encodeURIComponent(billing.order.id)}`}>Documents, authorizations, invoices and receipts</Link>
      {billing.invoices.map(invoice => <article key={invoice.id}><h3>{invoice.invoiceNumber} — {invoice.status}</h3><p>Total {money(invoice.totalCents)} · Open balance {money(invoice.balance.balanceCents)} · {invoice.balance.settlement} · version {invoice.version}</p><ul>{invoice.entries.map(entry => <li key={entry.id}>{entry.kind} {money(entry.amountCents)} — {entry.reference} · {entry.method} · {entry.occurredAt}<br />Receipt ID: {entry.id}</li>)}</ul></article>)}
      <form onSubmit={event => { event.preventDefault(); void submit(); }}><fieldset disabled={busy || Boolean(pending)}><legend>Record financial activity</legend><label>Action <select value={action} onChange={event => { setAction(event.target.value); setSubjectId(""); }}><option>PREPARE_INVOICE</option><option>POST_INVOICE</option><option>PAYMENT</option><option>REFUND</option><option>CREDIT</option><option>VOID</option></select></label>{action !== "PREPARE_INVOICE" && <label>{action === "POST_INVOICE" ? "Invoice package" : "Invoice"} <select value={subjectId} onChange={event => setSubjectId(event.target.value)} required><option value="">Select</option>{action === "POST_INVOICE" ? billing.packages.map(item => <option key={item.id} value={item.id} disabled={item.mismatchCodes.length > 0 || item.billingMode !== "NATIVE"}>Package v{item.version} ({item.billingMode}) {item.mismatchCodes.join(", ")}</option>) : billing.invoices.filter(item => item.status === "POSTED").map(item => <option key={item.id} value={item.id}>{item.invoiceNumber}</option>)}</select></label>}
        {!["POST_INVOICE","PREPARE_INVOICE"].includes(action) && <><label>Amount (USD) <input type="number" min="0" step="0.01" value={amount} onChange={event => setAmount(event.target.value)} required={action !== "VOID"} /></label><label>Receipt / adjustment reference <input value={reference} onChange={event => setReference(event.target.value)} required /></label><label>Method <select value={method} onChange={event => setMethod(event.target.value)}>{["CASH", "CHECK", "EXTERNAL_CARD", "BANK_TRANSFER", "OTHER"].map(item => <option key={item}>{item}</option>)}</select></label><label>Evidence references (one per line) <textarea value={evidence} onChange={event => setEvidence(event.target.value)} required /></label></>}
        {action === "REFUND" && <label>Original payment receipt ID <input value={relatedEntryId} onChange={event => setRelatedEntryId(event.target.value)} required /></label>}
        {action === "CREDIT" && <fieldset><legend>Reviewed credit allocation — no tax rate is inferred</legend>{(["subtotal","discount","tax"] as const).map(field => <label key={field}>Credit {field} (USD)<input type="number" min="0" step="0.01" value={creditComponents[field]} onChange={event => setCreditComponents({...creditComponents,[field]:event.target.value})} required /></label>)}<label>Original invoice lines<select multiple required value={creditComponents.lineKeys} onChange={event => setCreditComponents({...creditComponents,lineKeys:Array.from(event.target.selectedOptions,option=>option.value)})}>{billing.invoices.find(invoice=>invoice.id===subjectId)?.ledger.lines.map(line=><option key={line.key} value={line.key}>{line.description}</option>)}</select></label><p>Confirm the actual tax and discount adjustment against the original invoice and attach your review evidence. Overlapping prior credits are conservatively limited.</p></fieldset>}
        <label>Detailed business reason <textarea minLength={10} value={reason} onChange={event => setReason(event.target.value)} required /></label><button disabled={action !== "PREPARE_INVOICE" && !subjectId}>Record {action.toLowerCase().replaceAll("_", " ")}</button></fieldset></form>
      {pending && <><p>The outcome of this exact request is not yet confirmed. Retry without changing it; do not create a second payment.</p><button disabled={busy} onClick={() => void submit()}>Retry unchanged request</button></>}
    </>}
  </section>;
}
