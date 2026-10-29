"use client";
import { useEffect, useState } from "react";
import type { DocumentCustomerDetails } from "@/lib/service-document-review";
import { serviceChargeLines, type ServiceCharge } from "@/lib/service-charges";
import { ServiceChargesEditor } from "./service-charges-editor";

type Review = { discountCents: number; workSubtotalCents: number; customer: DocumentCustomerDetails; documentHash: string; canEditCustomer: boolean; canEditCharges: boolean; chargeEditReason: string; estimateId?: string; expectedVersion: number; laborCents: number; charges: ServiceCharge[]; suppliesTaxable: boolean; taxRatePercent: number | null };
export function ServiceDocumentReview({ repairOrderId, documentId, onSaved, onEstimate, onLockChange }: { repairOrderId: string; documentId: string; onSaved: (documentId: string) => void; onEstimate: (sourceId: string) => void; onLockChange: (locked: boolean) => void }) {
  const [review, setReview] = useState<Review | null>(null), [error, setError] = useState(""), [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<Record<string, unknown> | null>(null);
  const url = `/api/repair-orders/${encodeURIComponent(repairOrderId)}/document-review`;
  useEffect(() => { onLockChange(busy || Boolean(pending)); }, [busy, pending, onLockChange]);
  useEffect(() => {
    const abort = new AbortController();
    void fetch(`${url}?documentId=${encodeURIComponent(documentId)}`, { cache: "no-store", signal: abort.signal }).then(async response => { const data = await response.json(); if (!response.ok) throw new Error(data.error ?? "Review details could not load."); if (!abort.signal.aborted) setReview(data); }).catch(failure => { if (!abort.signal.aborted) setError(failure instanceof Error ? failure.message : "Review details could not load."); });
    return () => abort.abort();
  }, [url, documentId]);
  async function save(action: "CUSTOMER_DETAILS" | "CHARGES") {
    if (!review) return;
    const now = new Date();
    const command = pending ?? { ...review, documentId, action, idempotencyKey: crypto.randomUUID(), presentedAt: now.toISOString(), expiresAt: new Date(now.getTime() + 7 * 86400000).toISOString() };
    setBusy(true); setError(""); setPending(command);
    try {
      const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(command) });
      const body = await response.json();
      if (!response.ok) { if (response.status < 500) setPending(null); throw new Error(body.error ?? "Review changes could not be saved."); }
      const id = command.action === "CUSTOMER_DETAILS" ? body.documentId : body.result?.id;
      if (typeof id !== "string" || !id) throw new Error("The saved document response was incomplete. Retry the same request.");
      setPending(null); onLockChange(false);
      if (command.action === "CUSTOMER_DETAILS") onSaved(id); else onEstimate(id);
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Save outcome is uncertain. Retry the unchanged request."); }
    finally { setBusy(false); }
  }
  if (!review) return <section aria-label="Customer details and charges"><h2>Customer details & charges</h2>{error ? <p role="alert">{error}</p> : <p role="status">Loading document details…</p>}</section>;
  return <section aria-label="Customer details and charges"><h2>Customer details</h2><p>Saved for this repair order and its service documents.</p>{error && <p role="alert">{error}</p>}
    <form onSubmit={event => { event.preventDefault(); void save("CUSTOMER_DETAILS"); }}><fieldset disabled={busy || Boolean(pending) || !review.canEditCustomer}><label>Customer name<input required maxLength={200} value={review.customer.name} onChange={event => setReview({ ...review, customer: { ...review.customer, name: event.target.value } })} /></label><label>Phone<input type="tel" maxLength={50} value={review.customer.phone} onChange={event => setReview({ ...review, customer: { ...review.customer, phone: event.target.value } })} /></label><label>Email<input type="email" maxLength={254} value={review.customer.email} onChange={event => setReview({ ...review, customer: { ...review.customer, email: event.target.value } })} /></label><label>Billing address<textarea maxLength={500} value={review.customer.address} onChange={event => setReview({ ...review, customer: { ...review.customer, address: event.target.value } })} /></label><button type="submit">Save customer details</button></fieldset></form>
    <h2>Other charges & shop supplies</h2>
    {review.canEditCharges ? <form onSubmit={event => { event.preventDefault(); void save("CHARGES"); }}><fieldset disabled={busy || Boolean(pending)}><ServiceChargesEditor laborCents={review.laborCents} charges={review.charges} suppliesTaxable={review.suppliesTaxable} discountCents={review.discountCents} subtotalCents={review.workSubtotalCents + serviceChargeLines(review.laborCents, review.charges, review.suppliesTaxable).reduce((sum, line) => sum + line.unitPriceCents, 0)} onDiscount={discountCents => setReview({ ...review, discountCents })} busy={busy || Boolean(pending)} onChange={charges => setReview({ ...review, charges })} onSuppliesTaxable={suppliesTaxable => setReview({ ...review, suppliesTaxable })} /><label>Tax rate (%)<input required type="number" min="0" max="30" step="0.001" value={review.taxRatePercent ?? ""} onChange={event => setReview({ ...review, taxRatePercent: event.target.value === "" ? null : Number(event.target.value) })} /></label><p>Saving charges creates a revised estimate for customer approval.</p><button type="submit">Save charges & review estimate</button></fieldset></form> : <p>{review.chargeEditReason}</p>}
    {pending && <button type="button" disabled={busy} onClick={() => void save(pending.action === "CUSTOMER_DETAILS" ? "CUSTOMER_DETAILS" : "CHARGES")}>Retry unchanged save</button>}
  </section>;
}
