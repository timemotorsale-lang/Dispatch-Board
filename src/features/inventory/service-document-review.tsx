"use client";

import { useEffect, useMemo, useState } from "react";
import type { DocumentCustomerDetails } from "@/lib/service-document-review";
import { normalizeServiceCharges, serviceChargeLines, serviceQuoteTax, type ServiceCharge } from "@/lib/service-charges";
import type { ServiceDocumentContent } from "@/server/repair-order/service-documents";
import { ServiceChargesEditor } from "./service-charges-editor";

type Review = { discountCents: number; workSubtotalCents: number; workTaxableCents: number; savedTaxCents: number; customer: DocumentCustomerDetails; documentHash: string; canEditCustomer: boolean; canEditCharges: boolean; chargeEditReason: string; estimateId?: string; expectedVersion: number; laborCents: number; charges: ServiceCharge[]; suppliesTaxable: boolean; taxRatePercent: number | null };
const financial = (review: Review) => JSON.stringify([review.charges, review.suppliesTaxable, review.discountCents, review.taxRatePercent]);
const editable = (review: Review) => JSON.stringify([review.customer, financial(review)]);
const money = (cents: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);

export function ServiceDocumentReview({ repairOrderId, documentId, content, onSaved, onEstimate, onLockChange, onPreview }: { repairOrderId: string; documentId: string; content?: ServiceDocumentContent; onSaved: (documentId: string) => void; onEstimate: (sourceId: string) => void; onLockChange: (locked: boolean) => void; onPreview?: (content: ServiceDocumentContent | null) => void }) {
  const [review, setReview] = useState<Review | null>(null), [original, setOriginal] = useState<Review | null>(null);
  const [error, setError] = useState(""), [busy, setBusy] = useState(false), [loadAttempt, setLoadAttempt] = useState(0);
  const [pending, setPending] = useState<Record<string, unknown> | null>(null);
  const url = `/api/repair-orders/${encodeURIComponent(repairOrderId)}/document-review`;
  const storageKey = `service-document-review:${documentId}`;
  const dirty = Boolean(review && original && editable(review) !== editable(original));
  const customerChanged = Boolean(review && original && JSON.stringify(review.customer) !== JSON.stringify(original.customer));
  const chargesChanged = Boolean(review && original && financial(review) !== financial(original));
  const locked = busy || Boolean(pending);
  useEffect(() => { onLockChange(locked || dirty); }, [locked, dirty, onLockChange]);
  useEffect(() => {
    if (!dirty && !pending) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty, pending]);
  useEffect(() => {
    const abort = new AbortController();
    void fetch(`${url}?documentId=${encodeURIComponent(documentId)}`, { cache: "no-store", signal: abort.signal }).then(async response => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Review details could not load.");
      if (abort.signal.aborted) return;
      setOriginal(data); setReview(data);
      try {
        const saved = JSON.parse(sessionStorage.getItem(storageKey) ?? "null");
        if (saved?.documentHash === data.documentHash) {
          // Restore editable values only; permissions and current versions come from the server.
          setReview({ ...data, customer: data.canEditCustomer ? saved.customer : data.customer, ...(data.canEditCharges ? { charges: saved.charges, suppliesTaxable: saved.suppliesTaxable, discountCents: saved.discountCents, taxRatePercent: saved.taxRatePercent } : {}) });
          if (saved.pending) setPending(saved.pending);
        }
      } catch { /* A draft cannot prevent loading the saved document. */ }
    }).catch(failure => { if (!abort.signal.aborted) setError(failure instanceof Error ? failure.message : "Review details could not load."); });
    return () => abort.abort();
  }, [url, documentId, storageKey, loadAttempt]);
  useEffect(() => {
    if (!review) return;
    try { if (dirty || pending) sessionStorage.setItem(storageKey, JSON.stringify({ ...review, pending })); else sessionStorage.removeItem(storageKey); } catch { /* Saving to the server remains available without browser storage. */ }
  }, [review, dirty, pending, storageKey]);
  const calculation = useMemo(() => {
    if (!review) return null;
    if (!chargesChanged) return { subtotalCents: content?.totals?.subtotalCents ?? review.workSubtotalCents, discountCents: review.discountCents, taxCents: content?.totals?.taxCents ?? review.savedTaxCents, totalCents: content?.totals?.totalCents ?? review.workSubtotalCents - review.discountCents + review.savedTaxCents };
    const fees = serviceChargeLines(review.laborCents, review.charges, review.suppliesTaxable);
    const subtotalCents = review.workSubtotalCents + fees.reduce((sum, line) => sum + line.unitPriceCents, 0);
    try {
      normalizeServiceCharges(review.charges);
      if (review.taxRatePercent === null) throw new Error("Enter the applicable tax rate.");
      const taxCents = serviceQuoteTax(subtotalCents, review.workTaxableCents + fees.filter(line => line.taxable).reduce((sum, line) => sum + line.unitPriceCents, 0), review.taxRatePercent, review.discountCents);
      return { subtotalCents, discountCents: review.discountCents, taxCents, totalCents: subtotalCents - review.discountCents + taxCents };
    } catch (failure) { return { error: failure instanceof Error ? failure.message : "Check the amounts." }; }
  }, [review, chargesChanged, content]);
  useEffect(() => {
    if (!content || !review || !dirty || !calculation || "error" in calculation) { onPreview?.(null); return; }
    const fees = serviceChargeLines(review.laborCents, review.charges, review.suppliesTaxable).map(line => ({ ...line, totalCents: line.unitPriceCents }));
    onPreview?.({ ...content, identity: { ...content.identity, customer: review.customer.name, customerContact: { phone: review.customer.phone, email: review.customer.email, address: review.customer.address } }, ...(chargesChanged ? { lines: [...content.lines.filter(line => line.type !== "FEE"), ...fees], totals: calculation } : {}) });
  }, [content, review, dirty, calculation, chargesChanged, onPreview]);
  async function save() {
    if (!review || (!dirty && !pending) || (calculation && "error" in calculation)) return;
    const now = new Date();
    const command = pending ?? { ...review, customer: review.canEditCustomer && customerChanged ? review.customer : undefined, documentId, action: chargesChanged ? "CHARGES" : "CUSTOMER_DETAILS", idempotencyKey: crypto.randomUUID(), presentedAt: now.toISOString(), expiresAt: new Date(now.getTime() + 7 * 86400000).toISOString() };
    setBusy(true); setError(""); setPending(command);
    try {
      const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(command) });
      const body = await response.json();
      if (!response.ok) { if (response.status < 500) setPending(null); throw new Error(body.error ?? "Changes could not be saved."); }
      const id = command.action === "CUSTOMER_DETAILS" ? body.documentId : body.result?.id;
      if (typeof id !== "string" || !id) throw new Error("The saved document response was incomplete. Retry the same request.");
      try { sessionStorage.removeItem(storageKey); } catch { /* Server save succeeded. */ }
      setOriginal(review); setPending(null); onPreview?.(null); onLockChange(false);
      if (command.action === "CUSTOMER_DETAILS") onSaved(id); else onEstimate(id);
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Save outcome is uncertain. Retry the unchanged request."); }
    finally { setBusy(false); }
  }
  function discard() { if (original && !locked) { setReview(original); setError(""); onPreview?.(null); } }
  if (!review) return <section aria-label="Customer details and charges"><h2>Review details</h2>{error ? <><p role="alert">{error}</p><button type="button" onClick={() => { setError(""); setLoadAttempt(value => value + 1); }}>Try loading again</button></> : <p role="status">Loading document details…</p>}</section>;
  return <section aria-label="Customer details and charges"><h2>Customer details & charges</h2>{error && <p role="alert">{error}</p>}
    <form onSubmit={event => { event.preventDefault(); void save(); }}><fieldset disabled={locked}>
      <fieldset disabled={!review.canEditCustomer}><legend>Customer details</legend>
        <label>Customer name<input autoComplete="name" required maxLength={200} value={review.customer.name} onChange={event => setReview({ ...review, customer: { ...review.customer, name: event.target.value } })} /></label>
        <label>Phone<input autoComplete="tel" type="tel" maxLength={50} value={review.customer.phone} onChange={event => setReview({ ...review, customer: { ...review.customer, phone: event.target.value } })} /></label>
        <label>Email<input autoComplete="email" type="email" maxLength={254} value={review.customer.email} onChange={event => setReview({ ...review, customer: { ...review.customer, email: event.target.value } })} /></label>
        <label>Billing address<textarea autoComplete="street-address" maxLength={500} value={review.customer.address} onChange={event => setReview({ ...review, customer: { ...review.customer, address: event.target.value } })} /></label>
      </fieldset>
      {review.canEditCharges ? <><ServiceChargesEditor laborCents={review.laborCents} charges={review.charges} suppliesTaxable={review.suppliesTaxable} discountCents={review.discountCents} subtotalCents={review.workSubtotalCents + serviceChargeLines(review.laborCents, review.charges, review.suppliesTaxable).reduce((sum, line) => sum + line.unitPriceCents, 0)} onDiscount={discountCents => setReview({ ...review, discountCents })} busy={locked} onChange={charges => setReview({ ...review, charges })} onSuppliesTaxable={suppliesTaxable => setReview({ ...review, suppliesTaxable })} /><label>Tax rate (%)<input required={chargesChanged} type="number" min="0" max="30" step="0.001" value={review.taxRatePercent ?? ""} onChange={event => setReview({ ...review, taxRatePercent: event.target.value === "" ? null : Number(event.target.value) })} /></label></> : <p>{review.chargeEditReason}</p>}
      {calculation && <section aria-label="Updated totals" aria-live="polite"><h3>{dirty ? "Unsaved preview" : "Saved total"}</h3>{"error" in calculation ? <p role="alert">{calculation.error}</p> : <dl><dt>Subtotal</dt><dd>{money(calculation.subtotalCents)}</dd><dt>Discount</dt><dd>−{money(calculation.discountCents)}</dd><dt>Tax</dt><dd>{money(calculation.taxCents)}</dd><dt>Total</dt><dd><strong>{money(calculation.totalCents)}</strong></dd></dl>}</section>}
      {dirty && <p role="status">{chargesChanged ? "Save the revised estimate before recording customer approval." : "Save your changes before printing."}</p>}
      <button type="submit" disabled={!dirty || Boolean(calculation && "error" in calculation)}>{busy ? "Saving changes…" : "Save changes & review"}</button>
      {dirty && <button type="button" onClick={discard}>Discard changes</button>}
    </fieldset></form>
    {pending && <button type="button" disabled={busy} onClick={() => void save()}>Retry unchanged save</button>}
  </section>;
}
