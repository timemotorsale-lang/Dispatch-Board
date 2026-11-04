"use client";
import { useState } from "react";
import { SALES_DOCUMENT_PATHWAYS } from "@/lib/sales-document-pathways";
export function DealPathwayChange({ id, revision, pathway, initialPathway, disabled = false, onSaved }: { id: string; revision: number; pathway: string; initialPathway?: string; disabled?: boolean; onSaved: () => void }) {
  const [target, setTarget] = useState(initialPathway ?? ""), [reason, setReason] = useState(""), [busy, setBusy] = useState(false), [error, setError] = useState("");
  async function submit() {
    if (busy || disabled) return;
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/crm/v1/deal-drafts", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "CHANGE_PATHWAY", id, revision, pathway: target, reason }) });
      const body = await response.json(); if (!response.ok) throw new Error(body.error || "The pathway could not be changed. Your entries remain here.");
      onSaved();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "The connection was interrupted. Refresh the saved deal before retrying."); }
    finally { setBusy(false); }
  }
  return <form aria-label="Change revenue pathway" onSubmit={event => { event.preventDefault(); void submit(); }}><h3>Change revenue pathway</h3><p>The same deal number, customer, vehicle and history are kept. The new pathway starts as Working for review, and the previous amount is kept in history. Review the new pricing and paperwork.</p><p>Current pathway: {SALES_DOCUMENT_PATHWAYS[pathway as keyof typeof SALES_DOCUMENT_PATHWAYS] ?? pathway}</p><label>New revenue pathway<select required value={target} onChange={event => setTarget(event.target.value)} disabled={busy || disabled}><option value="">Choose a pathway</option>{Object.entries(SALES_DOCUMENT_PATHWAYS).filter(([key]) => key !== pathway).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label><label>Reason for change<textarea required minLength={10} maxLength={1000} value={reason} onChange={event => setReason(event.target.value)} disabled={busy || disabled} /></label><p>Existing signed documents and financial records stay in their original history. Any active vehicle assignment remains open until its actual return or cancellation is recorded.</p>{disabled && <p>Save pending edits before changing pathway.</p>}<button type="submit" disabled={busy || disabled || !target || reason.trim().length < 10}>{busy ? "Changing…" : "Confirm pathway change"}</button>{error && <p role="alert">{error}</p>}</form>;
}
