"use client";

import Link from "next/link";
import { BillingDocumentLink } from "./billing-document-link";
import { nextBillingTask } from "@/lib/service-billing-workflow";
import styles from "./service-billing-workspace.module.css";
import { useCallback, useEffect, useRef, useState } from "react";
import { InvoiceRequirements } from "./invoice-requirements";
import { ServiceDepositWorkspace, type RepairDeposits } from "./service-deposit-workspace";

type Billing = {
  deposits?: RepairDeposits;
  canManage: boolean;
  mutationAvailability: { allowed: boolean; reason: string | null; canManageRollout?: boolean };
  readiness?: { mismatchCodes: string[] };
  order: { id: string; repairOrderNumber: string };
  packages: { id: string; version: number; billingMode: string; mismatchCodes: string[]; identity?: { customer: string; vehicle: string; vin: string }; preview?: { lines: { key: string; description: string; quantity: number; totalCents: number }[]; subtotalCents: number; discountCents: number; taxCents: number; totalCents: number } }[];
  invoices: { appliedDepositCents?: number; id: string; invoiceNumber: string; version: number; status: string; totalCents: number; ledger: { lines: { key: string; description: string }[] }; balance: { balanceCents: number; settlement: string }; entries: { evidence?: { depositTransfer?: boolean }; id: string; kind: string; method: string | null; amountCents: number; reference: string; occurredAt: string }[] }[];
};
const money = (cents: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
async function fetchBilling(repairOrderId: string, signal?: AbortSignal): Promise<Billing> {
  const response = await fetch(`/api/repair-orders/${encodeURIComponent(repairOrderId)}/billing`, { cache: "no-store", signal });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error ?? "Billing could not be loaded.");
  return body;
}
type WorkspaceProps = { repairOrderId: string; invoiceId?: string; onDocumentReady?: (sourceId: string, documentId?: string) => void; onLockChange?: (locked: boolean) => void };
export function ServiceBillingWorkspace(props: WorkspaceProps) {
  const [active, setActive] = useState({ repairOrderId: props.repairOrderId, invoiceId: props.invoiceId });
  const [locked, setLocked] = useState(false);
  const { onLockChange } = props;
  const reportLock = useCallback((value: boolean) => { setLocked(value); onLockChange?.(value); }, [onLockChange]);
  const changed = active.repairOrderId !== props.repairOrderId || active.invoiceId !== props.invoiceId;
  if (!locked && changed) setActive({ repairOrderId: props.repairOrderId, invoiceId: props.invoiceId });
  return <>{changed && <p role="status">Finish or retry the current billing request before opening another billing record.</p>}<BillingWorkspace key={`${active.repairOrderId}${active.invoiceId ? `:${active.invoiceId}` : ""}`} {...props} {...active} onLockChange={reportLock} /></>;
}
function BillingWorkspace({ repairOrderId: initialId, invoiceId, onDocumentReady, onLockChange }: WorkspaceProps) {
  const documentMode = Boolean(onDocumentReady);
  const [paymentVerified, setPaymentVerified] = useState(false);
  const feedbackRef = useRef<HTMLDivElement>(null);
  const submitting = useRef(false);
  const [repairOrderId, setRepairOrderId] = useState(initialId), [billing, setBilling] = useState<Billing | null>(null), [error, setError] = useState(""), [notice, setNotice] = useState(""), [busy, setBusy] = useState(Boolean(initialId));
  const [action, setAction] = useState("PREPARE_INVOICE"), [subjectId, setSubjectId] = useState(""), [amount, setAmount] = useState(""), [reference, setReference] = useState(""), [method, setMethod] = useState("CASH"), [evidence, setEvidence] = useState(""), [reason, setReason] = useState(""), [relatedEntryId, setRelatedEntryId] = useState(""), [creditComponents, setCreditComponents] = useState({subtotal:"",discount:"",tax:"",lineKeys:[] as string[]}), [pending, setPending] = useState<Record<string, unknown> | null>(null);
  const [paymentDate, setPaymentDate] = useState("");
  const [depositLocked, setDepositLocked] = useState(false);
  const [savedReceipt, setSavedReceipt] = useState<{ sourceId: string; documentId?: string } | null>(null);
  useEffect(() => {
    if (!initialId) return;
    const controller = new AbortController();
    void fetchBilling(initialId, controller.signal).then(body => { if (!controller.signal.aborted) { setBilling(body); const task = invoiceId ? { action: "PAYMENT", subjectId: body.invoices.find(invoice => invoice.id === invoiceId && invoice.status === "POSTED")?.id ?? "" } : nextBillingTask(body); setAction(task.action); setSubjectId(task.subjectId); if (task.action === "PAYMENT") setAmount(((body.invoices.find(invoice => invoice.id === task.subjectId)?.balance.balanceCents ?? 0) / 100).toFixed(2)); } }).catch(failure => { if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : "Billing could not be loaded."); }).finally(() => { if (!controller.signal.aborted) setBusy(false); });
    return () => controller.abort();
  }, [initialId, documentMode, invoiceId]);
  useEffect(() => {
    if (!pending || typeof window === "undefined") return;
    const warnBeforeLeaving = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warnBeforeLeaving);
    return () => window.removeEventListener("beforeunload", warnBeforeLeaving);
  }, [pending]);
  useEffect(() => { onLockChange?.(busy || Boolean(pending) || depositLocked); }, [busy, pending, depositLocked, onLockChange]);
  useEffect(() => {
    if (!error && !notice) return;
    feedbackRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    feedbackRef.current?.focus({ preventScroll: true });
  }, [error, notice]);
  async function load() {
    setError("");
    const body = await fetchBilling(repairOrderId);
    setBilling(body);
    const task = invoiceId ? { action: "PAYMENT", subjectId: body.invoices.find(invoice => invoice.id === invoiceId && invoice.status === "POSTED")?.id ?? "" } : nextBillingTask(body); setAction(task.action); setSubjectId(task.subjectId);
    if (task.action === "PAYMENT") { setAmount(((body.invoices.find(invoice => invoice.id === task.subjectId)?.balance.balanceCents ?? 0) / 100).toFixed(2)); setPaymentVerified(false); setReference(""); setEvidence(""); }
    return body;
  }
  async function submit() {
    if (submitting.current || depositLocked || !billing) return;
    if (!pending && invoiceId && (subjectId !== invoiceId || !billing.invoices.some(invoice => invoice.id === invoiceId && invoice.status === "POSTED"))) { setError("This saved invoice is not available for new billing activity. Its document remains available to print."); return; }
    if (!pending && (!billing.canManage || !billing.mutationAvailability?.allowed)) { setError(billing.mutationAvailability?.reason ?? "Billing changes are unavailable. Reload to check your access."); return; }
    submitting.current = true;
    setBusy(true); setError(""); setNotice("");
    try {
      const invoice = billing?.invoices.find(item => item.id === subjectId);
      if (!pending && action === "PAYMENT" && invoice && invoice.balance.balanceCents <= 0) throw new Error("This invoice has no outstanding balance. Open a saved receipt or choose an adjustment.");
      const command = pending ?? { action, idempotencyKey: crypto.randomUUID(), reason: action === "PAYMENT" ? `Record verified customer payment against the issued service invoice.${reason.trim() ? ` Note: ${reason.trim()}` : ""}` : action === "POST_INVOICE" ? "Issue the final invoice for the approved repair order." : action === "PREPARE_INVOICE" ? "Check repair order readiness for final invoicing." : reason, occurredAt: action === "PAYMENT" && paymentDate ? new Date(paymentDate).toISOString() : new Date().toISOString(), packageId: subjectId, invoiceId: subjectId, expectedVersion: invoice?.version, amountCents: Math.round(Number(amount) * 100), reference, evidence: action === "PAYMENT" ? [reference] : evidence.split("\n").filter(Boolean), method, relatedEntryId, ...(action === "CREDIT" ? { creditComponents: {subtotalCents:Math.round(Number(creditComponents.subtotal)*100),discountCents:Math.round(Number(creditComponents.discount)*100),taxCents:Math.round(Number(creditComponents.tax)*100),lineKeys:creditComponents.lineKeys} } : {}) };
      setPending(command);
      const response = await fetch(`/api/repair-orders/${encodeURIComponent(billing!.order.id)}/billing`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(command) });
      const body = await response.json();
      if (!response.ok) { if (response.status < 500) setPending(null); throw new Error(body.error ?? "Billing command failed."); }
      const savedId = ["PREPARE_INVOICE", "POST_INVOICE"].includes(String(command.action)) ? body.result?.id : body.result?.entryId;
      if (typeof savedId !== "string" || !savedId) throw new Error("The saved billing response was incomplete. Retry the unchanged request to recover its original result.");
      const sourceId = command.action === "PREPARE_INVOICE" ? undefined : savedId;
      if (sourceId) setSavedReceipt({ sourceId, ...(typeof body.result?.documentId === "string" ? { documentId: body.result.documentId } : {}) });
      if (command.action !== "PREPARE_INVOICE") setReason("");
      setPaymentVerified(false); setPaymentDate(""); setAmount(""); setReference(""); setEvidence(""); setRelatedEntryId("");
      setCreditComponents({ subtotal: "", discount: "", tax: "", lineKeys: [] });
      if (onDocumentReady && typeof sourceId === "string" && sourceId) { setPending(null); onDocumentReady(sourceId, typeof body.result?.documentId === "string" ? body.result.documentId : undefined); return; }
      if (command.action === "POST_INVOICE" && sourceId) {
        setPending(null);
        const params = new URLSearchParams({ repairOrderId, workspace: "1", ...(typeof body.result?.documentId === "string" ? { documentId: body.result.documentId } : { sourceId }) });
        window.location.assign(`/service-documents?${params}`);
        return;
      }
      setPending(null); setNotice(body.duplicate ? "Original receipt recovered; no duplicate financial entry was made." : command.action === "POST_INVOICE" ? "Invoice generated. Open the issued invoice below to print or save as PDF." : command.action === "PAYMENT" ? "Payment recorded and receipt generated. Open the receipt below to print or save as PDF." : "Financial activity recorded. Review the frozen document below.");
      let refreshed: Billing;
      try { refreshed = await load(); }
      catch { setBilling(null); setError("The billing request was saved, but refreshed billing could not load. Load the repair order again before recording another action."); return; }
      if (command.action === "PREPARE_INVOICE") {
        const task = nextBillingTask(refreshed);
        const ready = task.action === "POST_INVOICE";
        setAction(task.action);
        setSubjectId(task.subjectId);
        setNotice(task.action === "PAYMENT" ? "An invoice already exists. Open it below." : ready ? "Ready to create the invoice. Review the total below." : "Invoice not created. Complete the requirements below, then recheck.");
      }
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Request failed. Retry the unchanged request to recover its receipt."); }
    finally { submitting.current = false; setBusy(false); }
  }
  async function refreshReadiness() {
    setBusy(true); setError(""); setNotice("");
    try {
      const current = await load();
      const codes = current.readiness?.mismatchCodes ?? current.packages[0]?.mismatchCodes ?? [];
      if (current.invoices.some(invoice => invoice.status === "POSTED" && (!invoiceId || invoice.id === invoiceId))) {
        setNotice("Invoice loaded. Review the balance below.");
      } else {
        setNotice(codes.length ? "No invoice is available for payment yet. Complete the items below first." : "Create the final invoice below, then choose Record payment on the issued invoice.");
      }
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Unable to refresh invoice requirements."); }
    finally { setBusy(false); }
  }
  const selectedInvoiceUnavailable = Boolean(invoiceId && billing && !billing.invoices.some(invoice => invoice.id === invoiceId && invoice.status === "POSTED"));
  const mutationBlocked = !billing?.canManage || !billing?.mutationAvailability?.allowed || selectedInvoiceUnavailable;
  const blockedReasonId = `billing-blocked-${billing?.order.id ?? initialId}`;
  const blockedReason = selectedInvoiceUnavailable ? "This saved invoice is not available for new billing activity. Its document remains available to print." : billing?.mutationAvailability?.reason ?? "Billing changes are unavailable. Ask an administrator to review your access.";
  const paymentSettled = action === "PAYMENT" && Boolean(billing?.invoices.some(invoice => invoice.id === subjectId && invoice.balance.balanceCents <= 0));
  const formBlocked = mutationBlocked || paymentSettled;
  const invoiceAction = action === "PREPARE_INVOICE" || action === "POST_INVOICE";
  const latestPackage = billing?.packages[0];
  const readinessCodes = billing?.readiness?.mismatchCodes ?? latestPackage?.mismatchCodes ?? [];
  return <section id="invoice-payment" className={styles.workspace}><h1>Repair payments</h1><p>Record payment against the issued invoice, then continue to vehicle handoff.</p>{!documentMode && <details open={!initialId || undefined}><summary>Choose / change repair order</summary><form onSubmit={event => { event.preventDefault(); setBusy(true); void load().catch(failure => setError(failure.message)).finally(() => setBusy(false)); }}><label>Repair order ID <input disabled={busy || Boolean(pending) || depositLocked} value={repairOrderId} onChange={event => { setRepairOrderId(event.target.value); setBilling(null); setPending(null); setPaymentVerified(false); setPaymentDate(""); setAmount(""); setReference(""); setEvidence(""); setReason(""); setRelatedEntryId(""); setSavedReceipt(null); setCreditComponents({ subtotal: "", discount: "", tax: "", lineKeys: [] }); }} required /></label><button disabled={busy || Boolean(pending) || depositLocked}>Load repair order</button></form></details>}
    <div ref={feedbackRef} tabIndex={-1}>{error && <p role="alert">{error}</p>}{error && !billing && <button type="button" disabled={busy || Boolean(pending) || !repairOrderId} onClick={() => void refreshReadiness()}>Retry loading billing</button>}{notice && <p role="status">{notice}</p>}</div>
    {savedReceipt && <p role="status">Saved billing document: <Link href={`/service-documents?${new URLSearchParams({ repairOrderId, ...(savedReceipt.documentId ? { documentId: savedReceipt.documentId } : { sourceId: savedReceipt.sourceId }), workspace: "1" })}`} aria-disabled={Boolean(pending) || depositLocked || undefined} onClick={event => { if (pending || depositLocked) event.preventDefault(); }}>Open / Print Saved Receipt or Invoice</Link></p>}
    {billing && <>{mutationBlocked && <aside aria-label="Billing changes unavailable"><p id={blockedReasonId} role="status"><strong>Billing changes unavailable.</strong> {blockedReason} Saved documents remain available to view and print.</p>{billing.mutationAvailability?.canManageRollout === true && <Link href="/settings/vehicle-operations" aria-disabled={busy || Boolean(pending) || depositLocked || undefined} onClick={event => { if (busy || pending || depositLocked) event.preventDefault(); }}>Review Vehicle Operations settings</Link>}<button type="button" disabled={busy || Boolean(pending) || depositLocked} onClick={() => void refreshReadiness()}>{busy ? "Checking billing access…" : "Recheck billing access"}</button></aside>}<h2>{billing.order.repairOrderNumber}</h2>{paymentSettled && <><p role="status">This invoice has no outstanding balance.</p>{!busy && !pending && !depositLocked && <Link href={`/prototype/repair-workbench?${new URLSearchParams({ repairOrderId: billing.order.id, step: "handoff" })}`}>Continue to vehicle handoff</Link>}</>}<Link aria-disabled={busy || Boolean(pending) || depositLocked || undefined} onClick={event => { if (busy || pending || depositLocked) event.preventDefault(); }} href={`/service-documents?repairOrderId=${encodeURIComponent(billing.order.id)}`}>Documents, authorizations, invoices and receipts</Link>

      {action === "PAYMENT" && !paymentSettled && <form onSubmit={event => { event.preventDefault(); if (paymentVerified) void submit(); }}><fieldset aria-describedby={mutationBlocked ? blockedReasonId : undefined} disabled={busy || Boolean(pending) || depositLocked || formBlocked}><legend>Record invoice payment & generate receipt</legend><p>{billing.invoices.filter(invoice => invoice.id === subjectId).map(invoice => <strong key={invoice.id}>{invoice.invoiceNumber} · Invoice total {money(invoice.totalCents)} · Balance due {money(invoice.balance.balanceCents)}</strong>)}</p><p>Record money already received. This does not charge a card or move money.</p><label>Amount received (USD)<input required type="number" min="0.01" step="0.01" value={amount} onChange={event => { setAmount(event.target.value); setPaymentVerified(false); }} /></label><label>Payment method<select value={method} onChange={event => { setMethod(event.target.value); setPaymentVerified(false); }}><option value="CASH">Cash</option><option value="CHECK">Check</option><option value="EXTERNAL_CARD">Card — processed externally</option><option value="BANK_TRANSFER">Bank transfer / Zelle</option><option value="OTHER">Other</option></select></label><label>Verified payment evidence / reference<input required minLength={3} maxLength={200} value={reference} onChange={event => { setReference(event.target.value); setPaymentVerified(false); }} placeholder="Cashier record, check or processor receipt reference" /></label><label>Payment received at (optional)<input type="datetime-local" step="0.001" value={paymentDate} onChange={event => { setPaymentDate(event.target.value); setPaymentVerified(false); }} /></label><details><summary>Optional note</summary><label>Note<textarea maxLength={400} value={reason} onChange={event => setReason(event.target.value)} /></label></details><p>Never enter card or bank account numbers. Partial payments create a receipt with the remaining balance.</p><label><input required type="checkbox" checked={paymentVerified} onChange={event => setPaymentVerified(event.target.checked)} /> I verified this payment was received for this invoice.</label><button disabled={!paymentVerified || !subjectId}>Receive payment</button></fieldset></form>}
      {billing.invoices.map(invoice => <article key={invoice.id}><h3>{invoice.invoiceNumber} — {invoice.status}</h3><BillingDocumentLink repairOrderId={billing.order.id} sourceId={invoice.id} disabled={busy || Boolean(pending) || depositLocked} onOpen={onDocumentReady ? sourceId => { if (!busy && !pending && !depositLocked) onDocumentReady(sourceId); } : undefined} /><p>Total {money(invoice.totalCents)} · Open balance {money(invoice.balance.balanceCents)} · {invoice.balance.settlement} · version {invoice.version}</p>{typeof invoice.appliedDepositCents === "number" && invoice.appliedDepositCents > 0 && <p>Deposit applied {money(invoice.appliedDepositCents)} — already included in the remaining balance above.</p>}{invoice.entries.length > 0 && <section aria-label={`Receipts for ${invoice.invoiceNumber}`}><h4>Saved receipts</h4><ul>{invoice.entries.map(entry => <li key={entry.id}>{entry.kind} {money(entry.amountCents)} — {entry.reference} · {entry.method} · {entry.occurredAt}{" · "}{billing.deposits?.entries.some(deposit => deposit.invoiceEntryId === entry.id && deposit.documentId) ? <Link href={`/service-documents?${new URLSearchParams({ repairOrderId: billing.order.id, documentId: billing.deposits.entries.find(deposit => deposit.invoiceEntryId === entry.id)!.documentId!, workspace: "1" })}`} aria-disabled={busy || Boolean(pending) || depositLocked || undefined} onClick={event => { if (busy || pending || depositLocked) event.preventDefault(); }}>Open / Print Deposit Record</Link> : <BillingDocumentLink repairOrderId={billing.order.id} sourceId={entry.id} receipt disabled={busy || Boolean(pending) || depositLocked} onOpen={onDocumentReady ? sourceId => { if (!busy && !pending && !depositLocked) onDocumentReady(sourceId); } : undefined} />}</li>)}</ul></section>}</article>)}
      {invoiceAction && <p>{action === "POST_INVOICE" ? "Current invoice package selected. Authorization, completed work and QC are checked again when you issue." : "Prepare the invoice from the approved RO. No customer, work or prices need re-entry."}</p>}
      {invoiceAction && readinessCodes.length > 0 && <p role="status"><strong>No final invoice has been issued.</strong> If the customer has already paid toward this repair, record the amount received as a deposit below.</p>}
      {billing.deposits && <details><summary>{invoiceAction ? "Receive money before invoicing (deposit)" : "Record or manage a deposit (optional)"}</summary><ServiceDepositWorkspace key={`${billing.order.id}:${invoiceId ?? ""}`} repairOrderId={billing.order.id} deposits={billing.deposits} invoices={billing.invoices} canManage={billing.canManage && billing.mutationAvailability.allowed} blockReason={billing.mutationAvailability.reason} disabled={busy || Boolean(pending)} preferredInvoiceId={invoiceId} onRefresh={load} onLockChange={setDepositLocked} /></details>}
      {invoiceAction && <InvoiceRequirements repairOrderId={billing.order.id} codes={readinessCodes} billingMode={latestPackage?.billingMode} />}
      {invoiceAction && readinessCodes.length > 0 && <button type="button" disabled={busy || Boolean(pending) || depositLocked} onClick={() => void refreshReadiness()}>{busy ? "Refreshing billing…" : "Refresh after completing requirements"}</button>}
      {action === "POST_INVOICE" && latestPackage?.preview && <section className={styles.invoicePreview} aria-label="Invoice review"><h3>Review final invoice</h3>{latestPackage.identity && <p>{latestPackage.identity.customer} · {latestPackage.identity.vehicle} · VIN {latestPackage.identity.vin}</p>}<table><thead><tr><th>Approved work / item</th><th>Qty</th><th>Amount</th></tr></thead><tbody>{latestPackage.preview.lines.map(line => <tr key={line.key}><td>{line.description}</td><td>{line.quantity}</td><td>{money(line.totalCents)}</td></tr>)}</tbody></table><dl><dt>Subtotal</dt><dd>{money(latestPackage.preview.subtotalCents)}</dd><dt>Discount</dt><dd>{money(latestPackage.preview.discountCents)}</dd><dt>Tax</dt><dd>{money(latestPackage.preview.taxCents)}</dd><dt>Total to invoice</dt><dd><strong>{money(latestPackage.preview.totalCents)}</strong></dd></dl></section>}

      <div hidden={action === "PAYMENT" || (invoiceAction && readinessCodes.length > 0)}><form onSubmit={event => { event.preventDefault(); void submit(); }}><fieldset aria-describedby={mutationBlocked ? blockedReasonId : undefined} disabled={busy || Boolean(pending) || depositLocked || formBlocked}><legend>{invoiceAction ? "Final invoice" : "Record payment / adjustment"}</legend>{!invoiceAction && <><p>This records verified activity only; it does not charge a card or move money. Never enter card or bank account numbers.</p><label>Action <select value={action} onChange={event => { setAction(event.target.value); }}><option>PAYMENT</option><option>REFUND</option><option>CREDIT</option><option>VOID</option></select></label></>}{!invoiceAction && <label>Invoice <select value={subjectId} onChange={event => setSubjectId(event.target.value)} required><option value="">Select</option>{billing.invoices.filter(item => item.status === "POSTED" && (!invoiceId || item.id === invoiceId)).map(item => <option key={item.id} value={item.id}>{item.invoiceNumber}</option>)}</select></label>}
        {!["POST_INVOICE","PREPARE_INVOICE"].includes(action) && <><label>Amount (USD) <input type="number" min="0" step="0.01" value={amount} onChange={event => { setAmount(event.target.value); setPaymentVerified(false); }} required={action !== "VOID"} /></label><label>Receipt / adjustment reference <input value={reference} onChange={event => { setReference(event.target.value); setPaymentVerified(false); }} required /></label><label>Method <select value={method} onChange={event => { setMethod(event.target.value); setPaymentVerified(false); }}>{["CASH", "CHECK", "EXTERNAL_CARD", "BANK_TRANSFER", "OTHER"].map(item => <option key={item}>{item}</option>)}</select></label><label>Evidence references (one per line) <textarea value={evidence} onChange={event => setEvidence(event.target.value)} required /></label></>}
        {action === "REFUND" && <><label>Original payment<select value={relatedEntryId} onChange={event => setRelatedEntryId(event.target.value)} required><option value="">Select the payment being refunded</option>{billing.invoices.find(invoice => invoice.id === subjectId)?.entries.filter(entry => entry.kind === "PAYMENT" && !entry.evidence?.depositTransfer && !billing.deposits?.entries.some(deposit => deposit.invoiceEntryId === entry.id)).map(entry => <option key={entry.id} value={entry.id}>{entry.reference} · {money(entry.amountCents)} · {entry.method} · {entry.occurredAt}</option>)}</select></label><p>For money originally received as a repair deposit, use Reverse deposit application, then Record deposit refund in Repair deposits. Reversing an application does not itself refund money.</p></>}
        {action === "CREDIT" && <fieldset><legend>Reviewed credit allocation — no tax rate is inferred</legend>{(["subtotal","discount","tax"] as const).map(field => <label key={field}>Credit {field} (USD)<input type="number" min="0" step="0.01" value={creditComponents[field]} onChange={event => setCreditComponents({...creditComponents,[field]:event.target.value})} required /></label>)}<label>Original invoice lines<select multiple required value={creditComponents.lineKeys} onChange={event => setCreditComponents({...creditComponents,lineKeys:Array.from(event.target.selectedOptions,option=>option.value)})}>{billing.invoices.find(invoice=>invoice.id===subjectId)?.ledger.lines.map(line=><option key={line.key} value={line.key}>{line.description}</option>)}</select></label><p>Confirm the actual tax and discount adjustment against the original invoice and attach your review evidence. Overlapping prior credits are conservatively limited.</p></fieldset>}
        {!invoiceAction && <label>Detailed business reason <textarea minLength={10} value={reason} onChange={event => setReason(event.target.value)} required /></label>}<button disabled={action !== "PREPARE_INVOICE" && !subjectId}>{busy ? "Checking invoice…" : action === "POST_INVOICE" ? "Create Final Invoice" : action === "PREPARE_INVOICE" ? (latestPackage?.mismatchCodes.length ? "Recheck invoice requirements" : "Check invoice readiness") : `Record ${action.toLowerCase().replaceAll("_", " ")}`}</button></fieldset></form></div>

      {billing.invoices.some(invoice => invoice.status === "POSTED" && (!invoiceId || invoice.id === invoiceId)) && <details><summary>Credit, refund or void</summary>{billing.invoices.filter(invoice => invoice.status === "POSTED" && (!invoiceId || invoice.id === invoiceId)).map(invoice => <button key={invoice.id} type="button" aria-describedby={mutationBlocked ? blockedReasonId : undefined} disabled={busy || Boolean(pending) || depositLocked || mutationBlocked} onClick={() => { setAction("CREDIT"); setSubjectId(invoice.id); }}>Credit / refund / void {invoice.invoiceNumber}</button>)}</details>}
      {pending && <><p>The outcome of this exact request is not yet confirmed. Retry without changing it; do not create a second payment.</p><button disabled={busy} onClick={() => void submit()}>Retry unchanged request</button></>}
    </>}
  </section>;
}
