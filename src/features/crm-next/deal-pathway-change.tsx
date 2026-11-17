"use client";
import { useRef, useState } from "react";
import { SALES_DOCUMENT_PATHWAYS } from "@/lib/sales-document-pathways";
import styles from "./crm-next-shell.module.css";
export type DealPathwayChangeResult = { id: string; pathway: string; revision: number };
export function DealPathwayChange({ id, revision, pathway, status = "IN_PROGRESS", initialPathway, disabled = false, onSaved }: { id: string; revision: number; pathway: string; status?: string; initialPathway?: string; disabled?: boolean; onSaved: (result: DealPathwayChangeResult) => void }) {
  const [target, setTarget] = useState(initialPathway ?? ""), [reason, setReason] = useState(""), [busy, setBusy] = useState(false), [error, setError] = useState("");
  const pending = useRef(false);
  const moveToPending = status === "SOLD" || status === "COMPLETED";
  async function submit() {
    if (pending.current || busy || disabled || !target || target === pathway) return;
    pending.current = true;
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/crm/v1/deal-drafts", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "CHANGE_PATHWAY", id, revision, pathway: target, reason }) });
      const body = await response.json(); if (!response.ok) throw new Error(body.error || "The pathway could not be changed. Your entries remain here.");
      onSaved({ id, pathway: target, revision: body.revision });
    } catch (caught) { setError(caught instanceof Error ? caught.message : "The connection was interrupted. Refresh the saved deal before retrying."); }
    finally { pending.current = false; setBusy(false); }
  }
  return (
    <form data-deal-transient className={styles.retailSection} aria-label="Change revenue pathway" onSubmit={event => { event.preventDefault(); void submit(); }}>
      <h3>Change revenue pathway</h3>
      <p>The same deal number, customer, vehicle and history are kept. Review the new pricing and paperwork; the previous amount stays in history.</p>
      {target === "test-drive" && <p>After confirming, review the driver and prepare a separate test-drive agreement. The prepared sale or lease packet stays on file and does not count as test-drive paperwork.</p>}
      <p>Current pathway: {SALES_DOCUMENT_PATHWAYS[pathway as keyof typeof SALES_DOCUMENT_PATHWAYS] ?? pathway}</p>
      {moveToPending && <p>This action moves the deal back to Pending and changes its pathway together, so staff can review and edit the new terms.</p>}
      <div className={styles.retailFieldGrid}>
        <label><span>New revenue pathway</span><select required value={target} onChange={event => { setTarget(event.target.value); setError(""); }} disabled={busy || disabled}><option value="">Choose a pathway</option>{Object.entries(SALES_DOCUMENT_PATHWAYS).filter(([key]) => key !== pathway).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
        <label><span>Reason for change (optional)</span><textarea maxLength={1000} placeholder="Add a note if helpful" value={reason} onChange={event => { setReason(event.target.value); setError(""); }} disabled={busy || disabled} /></label>
      </div>
      <p>Existing signed documents and financial records stay in their original history. Any active vehicle assignment remains open until its actual return or cancellation is recorded.</p>
      {disabled && <p>Save pending edits before changing pathway.</p>}
      <div><button className={styles.primaryButton} type="submit" disabled={busy || disabled || !target || target === pathway}>{busy ? "Changing…" : moveToPending ? "Move to Pending & change pathway" : "Confirm pathway change"}</button></div>
      {error && <p role="alert">{error}</p>}
    </form>
  );
}
