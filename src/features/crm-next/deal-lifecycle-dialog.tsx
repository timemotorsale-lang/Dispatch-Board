"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { SalesDocumentJacketView } from "@/server/sales-documents/service";
import styles from "./deal-draft-workspace.module.css";

export type DealLifecycleAction = "FINISH" | "REOPEN" | "REQUEST_UNWIND";
export function DealLifecycleDialog({ deal, action, onClose, onSaved }: { deal: { draftId: string; jacketId: string; customerName: string; pathway: string }; action: DealLifecycleAction; onClose: () => void; onSaved: (message: string) => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [packet, setPacket] = useState<SalesDocumentJacketView | null>(null), [revision, setRevision] = useState<number | null>(null);
  const [busy, setBusy] = useState(false), [loading, setLoading] = useState(true), [error, setError] = useState(""), [reason, setReason] = useState(""), [confirmed, setConfirmed] = useState(false);
  const finish = action === "FINISH", unwind = action === "REQUEST_UNWIND";
  const title = finish ? deal.pathway === "lease-to-own" ? "Finish lease and mark sold" : "Finish deal and mark sold" : unwind ? "Request unwind review" : "Reopen for corrections";
  useEffect(() => { dialog.current?.showModal(); }, []);
  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true); setError(""); setConfirmed(false);
    try {
      const responses = await Promise.all([fetch(`/api/crm/v1/deal-drafts?id=${encodeURIComponent(deal.draftId)}`, { signal }), fetch(`/api/sales-documents/${encodeURIComponent(deal.jacketId)}`, { signal })]);
      const [draft, jacket] = await Promise.all(responses.map(response => response.json()));
      if (!responses[0].ok || !responses[1].ok) throw new Error(draft.error || jacket.error || "This deal could not be loaded. Refresh and try again.");
      if (!signal?.aborted) { setPacket(jacket); setRevision(draft.revision); }
    } catch (caught) { if (!signal?.aborted) setError(caught instanceof Error ? caught.message : "Connection interrupted. Refresh this panel to try again."); }
    finally { if (!signal?.aborted) setLoading(false); }
  }, [deal.draftId, deal.jacketId]);
  useEffect(() => { const controller = new AbortController(); const timer = setTimeout(() => void load(controller.signal), 0); return () => { clearTimeout(timer); controller.abort(); }; }, [load]);
  const blockers = packet?.state === "CLOSED" ? [] : packet?.checklist.filter(item => item.blocker) || [];
  async function save() {
    if (busy || loading || revision === null || !packet) return;
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/crm/v1/deal-drafts", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, id: deal.draftId, jacketId: deal.jacketId, revision, jacketRevision: packet.revision, note: reason }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "This action could not be completed. Refresh and review the deal.");
      onSaved(finish ? "Existing deal finalized and marked sold. Its revenue pathway and original sale history are preserved." : unwind ? "Unwind review requested. No refund, funds reversal or tax adjustment has been made." : "Deal reopened for corrections. Original final packets remain available. Finish this same deal when corrections are complete.");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Connection interrupted. Refresh to check the deal before trying again."); }
    finally { setBusy(false); }
  }
  return <dialog ref={dialog} className={styles.archiveDialog} aria-label={title} onCancel={event => { if (busy) event.preventDefault(); else onClose(); }}>
    <h2>{title}</h2><p><strong>{deal.customerName}</strong></p>
    {loading ? <p role="status">Checking this saved deal and its packet…</p> : null}
    {finish && packet && <><p>Review required paperwork, then finish this existing deal. A lease stays a lease for reporting.</p>
      {blockers.length ? <><h3>{blockers.length} required items to complete</h3><ul>{blockers.map(item => <li key={item.id}><strong>{item.label}</strong><p>{item.blocker}</p></li>)}</ul><p><Link href={`/sales-documents?jacketId=${encodeURIComponent(deal.jacketId)}`} target="_blank" rel="noreferrer">Upload and review missing paperwork</Link></p><p>After saving the paperwork, select Refresh checklist here.</p></> : <p>Required packet checks are complete. Finalization also verifies the saved files.</p>}
      {packet.state === "DELIVERED_FUNDING_PENDING" && <p>Funding is still pending. Confirm funding through the packet workflow before marking this deal finished.</p>}
      <label><input type="checkbox" checked={confirmed} onChange={event => setConfirmed(event.target.checked)} /> I verified the executed paperwork and this deal is ready to mark sold.</label>
    </>}
    {!finish && <><p>{unwind ? "This starts a manager review. It does not refund the customer, reverse lender funding, release the vehicle, or adjust taxes." : "Open a correction version on this same deal. Original signed paperwork and sale dates stay preserved. Upload corrected copies and finish the deal again when ready."}</p>
      {unwind && <ul><li>Confirm customer payments and any refunds against the original receipts.</li><li>Reconcile lender funding and bank confirmation.</li><li>Review vehicle return, title/DMV status and any tax corrections.</li></ul>}
      <label>Reason<textarea required minLength={10} maxLength={1000} value={reason} onChange={event => setReason(event.target.value)} /></label></>}
    {error && <p role="alert">{error}</p>}
    <div className={styles.commands}><button disabled={busy || loading || !packet || revision === null || (finish ? !confirmed || blockers.length > 0 || ["UNWIND_PENDING", "DELIVERED_FUNDING_PENDING"].includes(packet.state) : reason.trim().length < 10)} onClick={() => void save()}>{busy ? "Saving…" : title}</button><button disabled={busy || loading} onClick={() => void load()}>Refresh checklist</button><button disabled={busy} onClick={onClose}>Cancel</button></div>
  </dialog>;
}
