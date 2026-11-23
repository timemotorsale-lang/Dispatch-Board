"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { BillingDocumentLink } from "./billing-document-link";
import { issuedInvoiceDocumentHref, laborGuideInvoiceHref, matchesEstimateDocument, nextBillingTask, type EstimateDocumentReference } from "@/lib/service-billing-workflow";
import styles from "./service-billing-workspace.module.css";
import { useCallback, useEffect, useRef, useState } from "react";
import { InvoiceRequirements } from "./invoice-requirements";
import { repairReviewHref } from "@/lib/repair-workflow-review";
import { ServiceDepositWorkspace, type RepairDeposits } from "./service-deposit-workspace";

type Billing = {
  deposits?: RepairDeposits;
  canManage: boolean;
  mutationAvailability: { allowed: boolean; reason: string | null; canManageRollout?: boolean };
  readiness?: { mismatchCodes: string[]; repairJobsMissing?: boolean; missingRepairJobLines?: string[]; estimateId?: string; estimateVersion?: number; estimateDocument?: EstimateDocumentReference };
  invoiceEligibility?: "INTERNAL_COST" | "CUSTOMER_REQUIRED" | "CUSTOMER_INVOICE";
  order: { id: string; repairOrderNumber: string };
  packages: { id: string; version: number; billingMode: string; mismatchCodes: string[]; identity?: { customer: string; vehicle: string; vin: string }; preview?: { lines: { key: string; description: string; quantity: number; totalCents: number }[]; subtotalCents: number; discountCents: number; taxCents: number; totalCents: number } }[];
  invoices: { appliedDepositCents?: number; id: string; packageId: string; invoiceNumber: string; version: number; status: string; totalCents: number; ledger: { estimateId?: string; estimateDocument?: EstimateDocumentReference; lines: { key: string; description: string }[] }; balance: { balanceCents: number; settlement: string }; entries: { evidence?: { depositTransfer?: boolean }; id: string; kind: string; method: string | null; amountCents: number; reference: string; occurredAt: string }[] }[];
};
const money = (cents: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
async function fetchBilling(repairOrderId: string, signal?: AbortSignal): Promise<Billing> {
  const response = await fetch(`/api/repair-orders/${encodeURIComponent(repairOrderId)}/billing`, { cache: "no-store", signal });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error ?? "Billing could not be loaded.");
  return body;
}
type WorkspaceProps = { returnTo?: string; paymentOnly?: boolean; depositOnly?: boolean; invoiceOnly?: boolean; repairOrderId: string; invoiceId?: string; estimateId?: string; estimateDocument?: EstimateDocumentReference; onDocumentReady?: (sourceId: string, documentId?: string) => void; onLockChange?: (locked: boolean) => void };
export function ServiceBillingWorkspace(props: WorkspaceProps) {
  const [active, setActive] = useState({ repairOrderId: props.repairOrderId, invoiceId: props.invoiceId, estimateId: props.estimateId, estimateDocument: props.estimateDocument });
  const [locked, setLocked] = useState(false);
  const { onLockChange } = props;
  const reportLock = useCallback((value: boolean) => { setLocked(value); onLockChange?.(value); }, [onLockChange]);
  const changed = active.repairOrderId !== props.repairOrderId || active.invoiceId !== props.invoiceId || active.estimateId !== props.estimateId ||
    active.estimateDocument?.documentId !== props.estimateDocument?.documentId || active.estimateDocument?.documentHash !== props.estimateDocument?.documentHash;
  if (!locked && changed) setActive({ repairOrderId: props.repairOrderId, invoiceId: props.invoiceId, estimateId: props.estimateId, estimateDocument: props.estimateDocument });
  const documentKey = active.estimateDocument ? `:document:${JSON.stringify([active.estimateDocument.documentId, active.estimateDocument.documentHash])}` : "";
  return <>{changed && <p role="status">Finish or retry the current billing request before opening another billing record.</p>}<BillingWorkspace key={`${active.repairOrderId}${active.invoiceId ? `:invoice:${active.invoiceId}` : ""}${active.estimateId !== undefined ? `:estimate:${active.estimateId}` : ""}${documentKey}`} {...props} {...active} onLockChange={reportLock} /></>;
}
function BillingWorkspace({ paymentOnly = false, depositOnly = false, invoiceOnly = false, repairOrderId: initialId, invoiceId, estimateId, estimateDocument, onDocumentReady, onLockChange, returnTo }: WorkspaceProps) {
  const router = useRouter();
  const documentMode = Boolean(onDocumentReady);
  const [paymentVerified, setPaymentVerified] = useState(false);
  const feedbackRef = useRef<HTMLDivElement>(null);
  const submitting = useRef(false);
  const [repairOrderId, setRepairOrderId] = useState(initialId), [billing, setBilling] = useState<Billing | null>(null), [error, setError] = useState(""), [notice, setNotice] = useState(""), [busy, setBusy] = useState(Boolean(initialId));
  const [action, setAction] = useState("PREPARE_INVOICE"), [subjectId, setSubjectId] = useState(""), [amount, setAmount] = useState(""), [reference, setReference] = useState(""), [method, setMethod] = useState("CASH"), [evidence, setEvidence] = useState(""), [reason, setReason] = useState(""), [relatedEntryId, setRelatedEntryId] = useState(""), [creditComponents, setCreditComponents] = useState({subtotal:"",discount:"",tax:"",lineKeys:[] as string[]}), [pending, setPending] = useState<Record<string, unknown> | null>(null);
  const [paymentDate, setPaymentDate] = useState("");
  const [depositLocked, setDepositLocked] = useState(false);
  const [savedReceipt, setSavedReceipt] = useState<{ sourceId: string; documentId?: string } | null>(null);
  const [reviewedEstimateId, setReviewedEstimateId] = useState(estimateId);
  const [reviewedDocument, setReviewedDocument] = useState(estimateDocument);
  useEffect(() => {
    if (!initialId) return;
    const controller = new AbortController();
    void fetchBilling(initialId, controller.signal).then(body => {
      if (controller.signal.aborted) return;
      if (invoiceOnly) {
        setReviewedEstimateId(selected => selected ?? body.readiness?.estimateId);
        setReviewedDocument(selected => selected ?? body.readiness?.estimateDocument);
      }
      setBilling(body);
      const task = invoiceId ? { action: "PAYMENT", subjectId: body.invoices.find(invoice => invoice.id === invoiceId && invoice.status === "POSTED")?.id ?? "" } : nextBillingTask(body);
      setAction(task.action);
      setSubjectId(task.subjectId);
      if (task.action === "PAYMENT" && !invoiceOnly) setAmount(((body.invoices.find(invoice => invoice.id === task.subjectId)?.balance.balanceCents ?? 0) / 100).toFixed(2));
    }).catch(failure => { if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : "Billing could not be loaded."); }).finally(() => { if (!controller.signal.aborted) setBusy(false); });
    return () => controller.abort();
  }, [initialId, documentMode, invoiceId, invoiceOnly]);
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
    if (invoiceOnly) {
      setReviewedEstimateId(selected => selected ?? body.readiness?.estimateId);
      setReviewedDocument(selected => selected ?? body.readiness?.estimateDocument);
    }
    setBilling(body);
    const task = invoiceId ? { action: "PAYMENT", subjectId: body.invoices.find(invoice => invoice.id === invoiceId && invoice.status === "POSTED")?.id ?? "" } : nextBillingTask(body); setAction(task.action); setSubjectId(task.subjectId);
    if (task.action === "PAYMENT" && !invoiceOnly) { setAmount(((body.invoices.find(invoice => invoice.id === task.subjectId)?.balance.balanceCents ?? 0) / 100).toFixed(2)); setPaymentVerified(false); setReference(""); setEvidence(""); }
    return body;
  }
  async function submit() {
    if (submitting.current || depositLocked || !billing) return;
    if (!pending && estimateUnavailable) return;
    if (!pending && invoiceOnly && (!invoiceAction || postedInvoice || savedReceipt || !targetEstimateId || !targetDocument || documentChanged || readinessCodes.length)) return;
    if (!pending && invoiceAction && ineligible) return;
    if (!pending && invoiceId && (subjectId !== invoiceId || !billing.invoices.some(invoice => invoice.id === invoiceId && invoice.status === "POSTED"))) { setError("This saved invoice is not available for new billing activity. Its document remains available to print."); return; }
    if (!pending && (!billing.canManage || !billing.mutationAvailability?.allowed)) { setError(billing.mutationAvailability?.reason ?? "Billing changes are unavailable. Reload to check your access."); return; }
    submitting.current = true;
    setBusy(true); setError(""); setNotice("");
    try {
      const invoice = billing?.invoices.find(item => item.id === subjectId);
      if (!pending && action === "PAYMENT" && invoice && invoice.balance.balanceCents <= 0) throw new Error("This invoice has no outstanding balance. Open a saved receipt or choose an adjustment.");
      const command = pending ?? { action, idempotencyKey: crypto.randomUUID(), reason: action === "PAYMENT" ? `Record verified customer payment against the issued service invoice.${reason.trim() ? ` Note: ${reason.trim()}` : ""}` : action === "POST_INVOICE" ? "Issue the final invoice for the approved repair order." : action === "PREPARE_INVOICE" ? "Check repair order readiness for final invoicing." : reason, occurredAt: action === "PAYMENT" && paymentDate ? new Date(paymentDate).toISOString() : new Date().toISOString(), packageId: subjectId, invoiceId: subjectId, expectedVersion: invoice?.version, amountCents: Math.round(Number(amount) * 100), reference, evidence: action === "PAYMENT" ? [reference] : evidence.split("\n").filter(Boolean), method, relatedEntryId, ...(action === "CREDIT" ? { creditComponents: {subtotalCents:Math.round(Number(creditComponents.subtotal)*100),discountCents:Math.round(Number(creditComponents.discount)*100),taxCents:Math.round(Number(creditComponents.tax)*100),lineKeys:creditComponents.lineKeys} } : {}) };
      if (!pending && invoiceAction && (targetEstimateId || billing.readiness?.estimateId)) {
        Object.assign(command, { expectedEstimateId: targetEstimateId || billing.readiness?.estimateId });
        if (invoiceOnly) Object.assign(command, { expectedEstimateDocument: targetDocument });
      }
      setPending(command);
      const response = await fetch(`/api/repair-orders/${encodeURIComponent(billing!.order.id)}/billing`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(command) });
      const body = await response.json();
      if (!response.ok) {
        if (response.status < 500) {
          setPending(null);
          if (["POST_INVOICE", "PREPARE_INVOICE"].includes(String(command.action))) await load().catch(() => undefined);
        }
        throw new Error(body.error ?? "Billing command failed.");
      }
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
        router.push(issuedInvoiceDocumentHref(repairOrderId, sourceId, { returnTo, documentId: typeof body.result?.documentId === "string" ? body.result.documentId : undefined }));
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
      if (invoiceOnly) {
        setNotice(current.invoices.some(invoice => invoice.status === "POSTED") ? "An issued invoice is available to print."
          : codes.length ? "Complete the requirements below before issuing the invoice." : "Invoice requirements refreshed.");
      } else if (current.invoices.some(invoice => invoice.status === "POSTED" && (!invoiceId || invoice.id === invoiceId))) {
        setNotice("Invoice loaded. Review the balance below.");
      } else {
        setNotice(codes.length ? "No invoice is available for payment yet. Complete the items below first." : "Create the final invoice below, then choose Record payment on the issued invoice.");
      }
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Unable to refresh invoice requirements."); }
    finally { setBusy(false); }
  }
  const selectedInvoiceUnavailable = Boolean(invoiceId && billing && !billing.invoices.some(invoice => invoice.id === invoiceId && invoice.status === "POSTED"));
  const targetEstimateId = invoiceOnly ? reviewedEstimateId ?? estimateId : estimateId;
  const estimateUnavailable = targetEstimateId !== undefined && billing?.readiness?.estimateId !== targetEstimateId;
  const targetDocument = reviewedDocument ?? estimateDocument;
  const currentDocument = billing?.readiness?.estimateDocument;
  const documentChanged = Boolean(invoiceOnly && targetDocument && !matchesEstimateDocument(targetDocument, currentDocument));
  const mutationBlocked = !billing?.canManage || !billing?.mutationAvailability?.allowed || selectedInvoiceUnavailable || estimateUnavailable || documentChanged;
  const blockedReasonId = `billing-blocked-${billing?.order.id ?? initialId}`;
  const blockedReason = estimateUnavailable ? "This document is not the current approved estimate. Open the current estimate before invoicing."
    : documentChanged ? "The saved estimate document changed. Review the latest estimate document before invoicing."
      : selectedInvoiceUnavailable ? "This saved invoice is not available for new billing activity. Its document remains available to print." : billing?.mutationAvailability?.reason ?? "Billing changes are unavailable. Ask an administrator to review your access.";
  const paymentSettled = action === "PAYMENT" && Boolean(billing?.invoices.some(invoice => invoice.id === subjectId && invoice.balance.balanceCents <= 0));
  const postedInvoice = billing?.invoices.find(invoice => invoice.status === "POSTED");
  const postedInvoiceHref = invoiceOnly && postedInvoice ? issuedInvoiceDocumentHref(repairOrderId, postedInvoice.id, { returnTo }) : undefined;
  const matchesPostedSource = Boolean(postedInvoice &&
    (estimateId === undefined || postedInvoice.ledger?.estimateId === estimateId) &&
    (!estimateDocument || matchesEstimateDocument(estimateDocument, postedInvoice.ledger?.estimateDocument)));
  useEffect(() => {
    if (!postedInvoiceHref || !postedInvoice || !matchesPostedSource || busy || pending || depositLocked) return;
    if (onDocumentReady) onDocumentReady(postedInvoice.id);
    else router.replace(postedInvoiceHref);
  }, [postedInvoiceHref, postedInvoice, matchesPostedSource, busy, pending, depositLocked, onDocumentReady, router]);
  const latestPackage = billing?.packages[0];
  const billingReadinessCodes = billing?.readiness?.mismatchCodes ?? [];
  const reconcileInvoice = Boolean(postedInvoice && (
    postedInvoice.packageId !== latestPackage?.id || latestPackage?.mismatchCodes.length || billingReadinessCodes.length
  ));
  const formBlocked = mutationBlocked || paymentSettled || (action === "PAYMENT" && reconcileInvoice);
  const invoiceAction = action === "PREPARE_INVOICE" || action === "POST_INVOICE";
  const internal = billing?.invoiceEligibility === "INTERNAL_COST";
  const customerRequired = billing?.invoiceEligibility === "CUSTOMER_REQUIRED";
  const ineligible = internal || customerRequired;
  const readinessCodes = billing?.readiness?.mismatchCodes ?? latestPackage?.mismatchCodes ?? [];
  const returnDestination = returnTo ? new URL(returnTo, "https://workspace.invalid") : null;
  const returnLabel = returnDestination?.pathname;
  const returnToHandoff = returnDestination?.pathname === "/vehicles/repair-workbench" && returnDestination.searchParams.get("step") === "handoff" && returnDestination.searchParams.get("repairOrderId") === repairOrderId;
  const returnText = returnToHandoff
    ? "Return to vehicle handoff"
    : returnLabel && /labor-guide|repair-explorer/.test(returnLabel) ? "Return to Labor Guide" : "Return to Repair Workbench";
  if (invoiceOnly && savedReceipt && !pending) return <section className={styles.workspace}>
    {returnTo && <Link href={returnTo}>{returnText}</Link>}
    <h1>Invoice issued</h1>
    <Link href={issuedInvoiceDocumentHref(repairOrderId, savedReceipt.sourceId, { ...savedReceipt, returnTo })}>Open / Print Final Invoice</Link>
  </section>;
  if (postedInvoiceHref && postedInvoice && !pending) return <section className={styles.workspace}>
    {returnTo && !depositLocked && <Link href={returnTo}>{returnText}</Link>}
    <h1>{matchesPostedSource ? "Issued invoice" : "Review saved estimate for invoicing"}</h1>
    <p>{postedInvoice.invoiceNumber} · {billing?.order.repairOrderNumber}</p>
    {!matchesPostedSource && <p>This repair order already has an issued invoice. Open it to review its saved estimate and charges.</p>}
    <Link href={postedInvoiceHref} aria-disabled={depositLocked || undefined} onClick={event => { if (depositLocked) event.preventDefault(); }}>Open / Print Final Invoice</Link>
  </section>;
  if (depositOnly) return <section className={styles.workspace} aria-label="Repair deposit">
    {returnTo && !busy && !depositLocked && <Link href={returnTo}>{returnText}</Link>}
    <h1>Record repair deposit</h1>
    {busy && !billing && <p role="status">Loading repair order…</p>}
    {error && <p role="alert">{error}</p>}
    {error && !billing && <button type="button" disabled={busy || !repairOrderId} onClick={() => void refreshReadiness()}>Retry loading repair order</button>}
    {billing && <><h2>{billing.order.repairOrderNumber}</h2>
      {ineligible || !billing.deposits
        ? <p role="status">Deposits are available for customer-linked repair orders. Review this repair order before recording money.</p>
        : <ServiceDepositWorkspace returnTo={returnTo} key={billing.order.id} repairOrderId={billing.order.id} deposits={billing.deposits}
          invoices={billing.invoices} canManage={billing.canManage && billing.mutationAvailability.allowed}
          blockReason={billing.mutationAvailability.reason} disabled={busy} onRefresh={load} onLockChange={setDepositLocked} />}
    </>}
  </section>;
  return <section id="invoice-payment" className={styles.workspace}>{returnTo && (!returnToHandoff || (invoiceOnly || !reconcileInvoice)) && !busy && !pending && !depositLocked && <Link href={returnTo}>{returnText}</Link>}<h1>{invoiceOnly ? "Review saved estimate for invoicing" : paymentOnly ? "Repair payments" : "Service Billing"}</h1><p>{invoiceOnly ? "Review the approved work and charges, then issue the invoice to print or save as PDF." : paymentOnly ? "Record payment against the issued invoice, then continue to vehicle handoff." : "Prepare and issue an invoice from the approved repair order, then record payment."}</p>{!paymentOnly && !invoiceOnly && !documentMode && <details open={!initialId || undefined}><summary>Choose / change repair order</summary><form onSubmit={event => { event.preventDefault(); setBusy(true); void load().catch(failure => setError(failure.message)).finally(() => setBusy(false)); }}><label>Repair order ID <input disabled={busy || Boolean(pending) || depositLocked} value={repairOrderId} onChange={event => { setRepairOrderId(event.target.value); setBilling(null); setPending(null); setPaymentVerified(false); setPaymentDate(""); setAmount(""); setReference(""); setEvidence(""); setReason(""); setRelatedEntryId(""); setSavedReceipt(null); setCreditComponents({ subtotal: "", discount: "", tax: "", lineKeys: [] }); }} required /></label><button disabled={busy || Boolean(pending) || depositLocked}>Load repair order</button></form></details>}
    {invoiceOnly && busy && !billing && <p role="status">Loading invoice requirements…</p>}
    {invoiceOnly && !repairOrderId && <p role="alert">Open a repair order to review its saved estimate.</p>}
    {!documentMode && <Link href="/service-documents" aria-disabled={busy || Boolean(pending) || depositLocked || undefined} onClick={event => { if (busy || pending || depositLocked) event.preventDefault(); }}>Search estimates and issued invoices</Link>}
    <div ref={feedbackRef} tabIndex={-1}>{error && <p role="alert">{error}</p>}{error && !billing && <button type="button" disabled={busy || Boolean(pending) || !repairOrderId} onClick={() => void refreshReadiness()}>Retry loading billing</button>}{notice && <p role="status">{notice}</p>}</div>
    {savedReceipt && <p role="status">Saved billing document: <Link href={`/service-documents?${new URLSearchParams({ repairOrderId, ...(savedReceipt.documentId ? { documentId: savedReceipt.documentId } : { sourceId: savedReceipt.sourceId }), workspace: "1", ...(returnTo ? { returnTo } : {}) })}`} aria-disabled={Boolean(pending) || depositLocked || undefined} onClick={event => { if (pending || depositLocked) event.preventDefault(); }}>Open / Print Saved Receipt or Invoice</Link></p>}
    {billing && <>{mutationBlocked && <aside aria-label="Billing changes unavailable"><p id={blockedReasonId} role="status"><strong>Billing changes unavailable.</strong> {blockedReason} Saved documents remain available to view and print.</p>{billing.mutationAvailability?.canManageRollout === true && <Link href="/settings/vehicle-operations" aria-disabled={busy || Boolean(pending) || depositLocked || undefined} onClick={event => { if (busy || pending || depositLocked) event.preventDefault(); }}>Review Vehicle Operations settings</Link>}<button type="button" disabled={busy || Boolean(pending) || depositLocked} onClick={() => void refreshReadiness()}>{busy ? "Checking billing access…" : "Recheck billing access"}</button></aside>}<h2>{billing.order.repairOrderNumber}</h2>{!invoiceOnly && paymentSettled && <><p role="status">This invoice has no outstanding balance.</p>{!reconcileInvoice && !busy && !pending && !depositLocked && <Link href={returnToHandoff && returnTo ? returnTo : `/vehicles/repair-workbench?${new URLSearchParams({ repairOrderId: billing.order.id, step: "handoff" })}`}>Continue to vehicle handoff</Link>}</>}<Link aria-disabled={busy || Boolean(pending) || depositLocked || undefined} onClick={event => { if (busy || pending || depositLocked) event.preventDefault(); }} href={`/service-documents?repairOrderId=${encodeURIComponent(billing.order.id)}`}>Documents, authorizations, invoices and receipts</Link>

      {!invoiceOnly && reconcileInvoice && <p role="status">The posted invoice does not match the current repair billing requirements. Ask Billing to reconcile it before taking payment or handing off the vehicle. Open Credit, refund or void to review the available corrections.
        {billingReadinessCodes.includes("INVOICE_AUTHORIZATION_REQUIRED") && <> <Link href={repairReviewHref(billing.order.id, "authorization")}>Review current repair authorization</Link></>}
      </p>}
      {!invoiceOnly && action === "PAYMENT" && !paymentSettled && !reconcileInvoice && <form onSubmit={event => { event.preventDefault(); if (paymentVerified) void submit(); }}><fieldset aria-describedby={mutationBlocked ? blockedReasonId : undefined} disabled={busy || Boolean(pending) || depositLocked || formBlocked}><legend>Record invoice payment & generate receipt</legend><p>{billing.invoices.filter(invoice => invoice.id === subjectId).map(invoice => <strong key={invoice.id}>{invoice.invoiceNumber} · Invoice total {money(invoice.totalCents)} · Balance due {money(invoice.balance.balanceCents)}</strong>)}</p><p>Record money already received. This does not charge a card or move money.</p><label>Amount received (USD)<input required type="number" min="0.01" step="0.01" value={amount} onChange={event => { setAmount(event.target.value); setPaymentVerified(false); }} /></label><label>Payment method<select value={method} onChange={event => { setMethod(event.target.value); setPaymentVerified(false); }}><option value="CASH">Cash</option><option value="CHECK">Check</option><option value="EXTERNAL_CARD">Card — processed externally</option><option value="BANK_TRANSFER">Bank transfer / Zelle</option><option value="OTHER">Other</option></select></label><label>Verified payment evidence / reference<input required minLength={3} maxLength={200} value={reference} onChange={event => { setReference(event.target.value); setPaymentVerified(false); }} placeholder="Cashier record, check or processor receipt reference" /></label><label>Payment received at (optional)<input type="datetime-local" step="0.001" value={paymentDate} onChange={event => { setPaymentDate(event.target.value); setPaymentVerified(false); }} /></label><details><summary>Optional note</summary><label>Note<textarea maxLength={400} value={reason} onChange={event => setReason(event.target.value)} /></label></details><p>Never enter card or bank account numbers. Partial payments create a receipt with the remaining balance.</p><label><input required type="checkbox" checked={paymentVerified} onChange={event => setPaymentVerified(event.target.checked)} /> I verified this payment was received for this invoice.</label><button disabled={!paymentVerified || !subjectId}>Receive payment</button></fieldset></form>}
      {!invoiceOnly && billing.invoices.map(invoice => <article key={invoice.id}><h3>{invoice.invoiceNumber} — {invoice.status}</h3><BillingDocumentLink returnTo={returnTo} repairOrderId={billing.order.id} sourceId={invoice.id} disabled={busy || Boolean(pending) || depositLocked} onOpen={onDocumentReady ? sourceId => { if (!busy && !pending && !depositLocked) onDocumentReady(sourceId); } : undefined} /><p>Total {money(invoice.totalCents)} · Open balance {money(invoice.balance.balanceCents)} · {invoice.balance.settlement} · version {invoice.version}</p>{typeof invoice.appliedDepositCents === "number" && invoice.appliedDepositCents > 0 && <p>Deposit applied {money(invoice.appliedDepositCents)} — already included in the remaining balance above.</p>}{invoice.entries.length > 0 && <section aria-label={`Receipts for ${invoice.invoiceNumber}`}><h4>Saved receipts</h4><ul>{invoice.entries.map(entry => <li key={entry.id}>{entry.kind} {money(entry.amountCents)} — {entry.reference} · {entry.method} · {entry.occurredAt}{" · "}{billing.deposits?.entries.some(deposit => deposit.invoiceEntryId === entry.id && deposit.documentId) ? <Link href={`/service-documents?${new URLSearchParams({ repairOrderId: billing.order.id, documentId: billing.deposits.entries.find(deposit => deposit.invoiceEntryId === entry.id)!.documentId!, workspace: "1" })}`} aria-disabled={busy || Boolean(pending) || depositLocked || undefined} onClick={event => { if (busy || pending || depositLocked) event.preventDefault(); }}>Open / Print Deposit Record</Link> : <BillingDocumentLink returnTo={returnTo} repairOrderId={billing.order.id} sourceId={entry.id} receipt disabled={busy || Boolean(pending) || depositLocked} onOpen={onDocumentReady ? sourceId => { if (!busy && !pending && !depositLocked) onDocumentReady(sourceId); } : undefined} />}</li>)}</ul></section>}</article>)}
      {paymentOnly && invoiceAction && <p role="status">No issued invoice is available for payment on this repair order.</p>}
      {ineligible && invoiceAction && <section aria-label="Customer invoice unavailable">
        <h3>{internal ? "Internal recon order" : "Customer record required"}</h3>
        <p>{internal
          ? "This repair order records dealership recon costs. If the customer should be billed, ask Service to verify the order type and establish the correct customer repair order before invoicing."
          : "A final invoice needs a customer-linked repair order. Ask Service to verify the customer on this repair before invoicing."}</p>
        <Link href={internal ? repairReviewHref(billing.order.id, "handoff") : `/vehicles/repair-workbench?repairOrderId=${encodeURIComponent(billing.order.id)}`}>
          {internal ? "Open internal cost closeout" : "Open repair order"}
        </Link>
        {internal && <InvoiceRequirements repairOrderId={billing.order.id} codes={readinessCodes} repairJobsMissing={billing.readiness?.repairJobsMissing} missingRepairJobLines={billing.readiness?.missingRepairJobLines} />}
      </section>}
      {invoiceOnly && !targetEstimateId && !ineligible && <p role="status">Save an estimate for this repair order and record customer approval before invoicing.</p>}
      {estimateUnavailable && <Link href={repairReviewHref(billing.order.id, "estimate")}>Review current estimate</Link>}
      {!estimateUnavailable && documentChanged && currentDocument && <Link href={laborGuideInvoiceHref(billing.order.id, {
        estimateId: billing.readiness?.estimateId, estimateDocument: currentDocument, returnTo,
      })} aria-disabled={Boolean(pending) || depositLocked || undefined} onClick={event => { if (pending || depositLocked) event.preventDefault(); }}>Review latest estimate document</Link>}
      {!paymentOnly && !estimateUnavailable && !documentChanged && (!ineligible || !invoiceAction) && <>
      {invoiceAction && readinessCodes.length === 0 && <p>{action === "POST_INVOICE" ? "Review the approved lines and total. Authorization, completed work and QC are checked again when you issue." : "Prepare the invoice from the approved estimate. The approved lines and prices carry forward."}</p>}
      {invoiceAction && readinessCodes.length > 0 && <p role="status"><strong>No final invoice has been issued.</strong> If the customer has already paid toward this repair, record the amount received as a deposit below.</p>}
      {billing.deposits && <details><summary>{invoiceAction ? "Receive money before invoicing (deposit)" : "Record or manage a deposit (optional)"}</summary><ServiceDepositWorkspace returnTo={returnTo} key={`${billing.order.id}:${invoiceId ?? ""}`} repairOrderId={billing.order.id} deposits={billing.deposits} invoices={billing.invoices} canManage={billing.canManage && billing.mutationAvailability.allowed} blockReason={billing.mutationAvailability.reason} disabled={busy || Boolean(pending)} preferredInvoiceId={invoiceId} onRefresh={load} onLockChange={setDepositLocked} /></details>}
      {invoiceAction && <InvoiceRequirements repairOrderId={billing.order.id} codes={readinessCodes} billingMode={latestPackage?.billingMode} repairJobsMissing={billing.readiness?.repairJobsMissing} missingRepairJobLines={billing.readiness?.missingRepairJobLines} />}
      {invoiceAction && readinessCodes.length > 0 && <button type="button" disabled={busy || Boolean(pending) || depositLocked} onClick={() => void refreshReadiness()}>{busy ? "Refreshing billing…" : "Refresh after completing requirements"}</button>}
      {action === "POST_INVOICE" && latestPackage?.preview && <section className={styles.invoicePreview} aria-label="Invoice review"><h3>Review final invoice</h3>{billing.readiness?.estimateVersion !== undefined && <p>Approved estimate revision {billing.readiness.estimateVersion}</p>}{latestPackage.identity && <p>{latestPackage.identity.customer} · {latestPackage.identity.vehicle} · VIN {latestPackage.identity.vin}</p>}<table><thead><tr><th>Approved work / item</th><th>Qty</th><th>Amount</th></tr></thead><tbody>{latestPackage.preview.lines.map(line => <tr key={line.key}><td>{line.description}</td><td>{line.quantity}</td><td>{money(line.totalCents)}</td></tr>)}</tbody></table><dl><dt>Subtotal</dt><dd>{money(latestPackage.preview.subtotalCents)}</dd><dt>Discount</dt><dd>{money(latestPackage.preview.discountCents)}</dd><dt>Tax</dt><dd>{money(latestPackage.preview.taxCents)}</dd><dt>Total to invoice</dt><dd><strong>{money(latestPackage.preview.totalCents)}</strong></dd></dl></section>}

      {(!invoiceOnly || (invoiceAction && targetEstimateId && targetDocument && readinessCodes.length === 0)) && <div hidden={action === "PAYMENT" || (invoiceAction && readinessCodes.length > 0)}><form onSubmit={event => { event.preventDefault(); void submit(); }}><fieldset aria-describedby={mutationBlocked ? blockedReasonId : undefined} disabled={busy || Boolean(pending) || depositLocked || formBlocked}><legend>{invoiceAction ? "Final invoice" : "Record payment / adjustment"}</legend>{!invoiceAction && <><p>This records verified activity only; it does not charge a card or move money. Never enter card or bank account numbers.</p><label>Action <select value={action} onChange={event => { setAction(event.target.value); }}><option>PAYMENT</option><option>REFUND</option><option>CREDIT</option><option>VOID</option></select></label></>}{!invoiceAction && <label>Invoice <select value={subjectId} onChange={event => setSubjectId(event.target.value)} required><option value="">Select</option>{billing.invoices.filter(item => item.status === "POSTED" && (!invoiceId || item.id === invoiceId)).map(item => <option key={item.id} value={item.id}>{item.invoiceNumber}</option>)}</select></label>}
        {!["POST_INVOICE","PREPARE_INVOICE"].includes(action) && <><label>Amount (USD) <input type="number" min="0" step="0.01" value={amount} onChange={event => { setAmount(event.target.value); setPaymentVerified(false); }} required={action !== "VOID"} /></label><label>Receipt / adjustment reference <input value={reference} onChange={event => { setReference(event.target.value); setPaymentVerified(false); }} required /></label><label>Method <select value={method} onChange={event => { setMethod(event.target.value); setPaymentVerified(false); }}>{["CASH", "CHECK", "EXTERNAL_CARD", "BANK_TRANSFER", "OTHER"].map(item => <option key={item}>{item}</option>)}</select></label><label>Evidence references (one per line) <textarea value={evidence} onChange={event => setEvidence(event.target.value)} required /></label></>}
        {action === "REFUND" && <><label>Original payment<select value={relatedEntryId} onChange={event => setRelatedEntryId(event.target.value)} required><option value="">Select the payment being refunded</option>{billing.invoices.find(invoice => invoice.id === subjectId)?.entries.filter(entry => entry.kind === "PAYMENT" && !entry.evidence?.depositTransfer && !billing.deposits?.entries.some(deposit => deposit.invoiceEntryId === entry.id)).map(entry => <option key={entry.id} value={entry.id}>{entry.reference} · {money(entry.amountCents)} · {entry.method} · {entry.occurredAt}</option>)}</select></label><p>For money originally received as a repair deposit, use Reverse deposit application, then Record deposit refund in Repair deposits. Reversing an application does not itself refund money.</p></>}
        {action === "CREDIT" && <fieldset><legend>Reviewed credit allocation — no tax rate is inferred</legend>{(["subtotal","discount","tax"] as const).map(field => <label key={field}>Credit {field} (USD)<input type="number" min="0" step="0.01" value={creditComponents[field]} onChange={event => setCreditComponents({...creditComponents,[field]:event.target.value})} required /></label>)}<label>Original invoice lines<select multiple required value={creditComponents.lineKeys} onChange={event => setCreditComponents({...creditComponents,lineKeys:Array.from(event.target.selectedOptions,option=>option.value)})}>{billing.invoices.find(invoice=>invoice.id===subjectId)?.ledger.lines.map(line=><option key={line.key} value={line.key}>{line.description}</option>)}</select></label><p>Confirm the actual tax and discount adjustment against the original invoice and attach your review evidence. Overlapping prior credits are conservatively limited.</p></fieldset>}
        {!invoiceAction && <label>Detailed business reason <textarea minLength={10} value={reason} onChange={event => setReason(event.target.value)} required /></label>}<button disabled={action !== "PREPARE_INVOICE" && !subjectId}>{busy ? "Checking invoice…" : action === "POST_INVOICE" ? (invoiceOnly && !documentMode ? "Issue invoice" : "Create Final Invoice") : action === "PREPARE_INVOICE" ? (invoiceOnly && !documentMode ? "Review approved invoice lines" : latestPackage?.mismatchCodes.length ? "Recheck invoice requirements" : "Check invoice readiness") : `Record ${action.toLowerCase().replaceAll("_", " ")}`}</button></fieldset></form></div>}

      {!invoiceOnly && billing.invoices.some(invoice => invoice.status === "POSTED" && (!invoiceId || invoice.id === invoiceId)) && <details><summary>Credit, refund or void</summary>{billing.invoices.filter(invoice => invoice.status === "POSTED" && (!invoiceId || invoice.id === invoiceId)).map(invoice => <button key={invoice.id} type="button" aria-describedby={mutationBlocked ? blockedReasonId : undefined} disabled={busy || Boolean(pending) || depositLocked || mutationBlocked} onClick={() => { setAction("CREDIT"); setSubjectId(invoice.id); }}>Credit / refund / void {invoice.invoiceNumber}</button>)}</details>}
      </>}
      {pending && <><p>The outcome of this exact request is not yet confirmed. Retry unchanged to recover the original result.</p><button disabled={busy} onClick={() => void submit()}>Retry unchanged request</button></>}
    </>}
  </section>;
}
