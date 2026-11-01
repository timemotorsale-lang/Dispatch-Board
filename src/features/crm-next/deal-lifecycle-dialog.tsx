"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { SalesDocumentJacketView } from "@/server/sales-documents/service";
import styles from "./deal-draft-workspace.module.css";

export type DealLifecycleAction = "MARK_SOLD" | "FINISH" | "REOPEN" | "REQUEST_UNWIND";
export function DealLifecycleDialog({ deal, action, onClose, onSaved }: { deal: { draftId: string; jacketId?: string | null; customerName: string; pathway: string }; action: DealLifecycleAction; onClose: () => void; onSaved: (message: string) => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [packet, setPacket] = useState<SalesDocumentJacketView | null>(null), [revision, setRevision] = useState<number | null>(null);
  const [busy, setBusy] = useState(false), [loading, setLoading] = useState(true), [error, setError] = useState(""), [reason, setReason] = useState(""), [confirmed, setConfirmed] = useState(false);
  const [jacketId, setJacketId] = useState(deal.jacketId || "");
  const sold = action === "MARK_SOLD", finish = action === "FINISH", unwind = action === "REQUEST_UNWIND";
  const title = sold ? "Mark deal sold" : finish ? "Finalize paperwork" : unwind ? "Request unwind review" : "Reopen for corrections";
  useEffect(() => { dialog.current?.showModal(); }, []);
  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true); setError(""); setConfirmed(false);
    try {
      const responses = await Promise.all([fetch(`/api/crm/v1/deal-drafts?id=${encodeURIComponent(deal.draftId)}`, { signal }), ...(!sold && jacketId ? [fetch(`/api/sales-documents/${encodeURIComponent(jacketId)}`, { signal })] : [])]);
      const [draft, jacket] = await Promise.all(responses.map(response => response.json()));
      if (!responses[0].ok || (responses[1] && !responses[1].ok)) throw new Error(draft.error || jacket?.error || "This deal could not be loaded. Refresh and try again.");
      if (!signal?.aborted) { setPacket(jacket || null); setRevision(draft.revision); }
    } catch (caught) { if (!signal?.aborted) setError(caught instanceof Error ? caught.message : "Connection interrupted. Refresh this panel to try again."); }
    finally { if (!signal?.aborted) setLoading(false); }
  }, [deal.draftId, jacketId, sold]);
  useEffect(() => { const controller = new AbortController(); const timer = setTimeout(() => void load(controller.signal), 0); return () => { clearTimeout(timer); controller.abort(); }; }, [load]);
  const blockers = packet?.state === "CLOSED" ? [] : packet?.checklist.filter(item => item.blocker) || [];
  async function save() {
    if (busy || loading || revision === null || (!sold && !packet)) return;
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/crm/v1/deal-drafts", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, id: deal.draftId, ...(jacketId ? { jacketId } : {}), revision, jacketRevision: packet?.revision, note: reason }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "This action could not be completed. Refresh and review the deal.");
      onSaved(sold ? "Deal marked sold. Paperwork stays open for signed documents, insurance, DMV/title paperwork and remaining follow-up. Yellow means pending; green means finalized." : finish ? "Paperwork finalized. This sold deal is now complete and shown in green. Its original sold date is preserved." : unwind ? "Unwind review requested. No refund, funds reversal or tax adjustment has been made." : "Deal reopened for corrections. Original final packets remain available. Finalize the paperwork again when corrections are complete.");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Connection interrupted. Refresh to check the deal before trying again."); }
    finally { setBusy(false); }
  }
  async function preparePaperwork() {
    if (busy || revision === null) return;
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/crm/v1/deal-drafts", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "PREPARE_PAPERWORK", id: deal.draftId, revision }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "The paperwork checklist could not be opened.");
      setJacketId(body.jacketId);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Connection interrupted. Refresh this existing deal before retrying."); }
    finally { setBusy(false); }
  }
  return <dialog ref={dialog} className={styles.archiveDialog} aria-label={title} onCancel={event => { if (busy) event.preventDefault(); else onClose(); }}>
    <h2>{title}</h2><p><strong>{deal.customerName}</strong></p>
    {loading ? <p role="status">Checking this saved deal…</p> : null}
    {sold && <><p>Mark this existing deal sold now. Signed documents, insurance, DMV/title paperwork and other required items can be completed afterward.</p><p>The deal stays yellow until paperwork is finalized. This does not confirm payment, funding, delivery or DMV acceptance. A lease stays a lease for reporting.</p><label><input type="checkbox" checked={confirmed} onChange={event => setConfirmed(event.target.checked)} /> I confirm this deal should be recorded as sold.</label></>}
    {finish && !loading && !packet && <><p>This deal is already sold. Open its paperwork checklist to upload signed documents, insurance and DMV/title paperwork on the same deal.</p><button disabled={busy} onClick={() => void preparePaperwork()}>Start paperwork checklist</button></>}
    {finish && packet && <><p>This deal is already sold. Complete the required paperwork, then finalize it to turn the status green.</p>
      {blockers.length ? <><h3>{blockers.length} required items to complete</h3><ul>{blockers.map(item => <li key={item.id}><strong>{item.label}</strong><p>{item.blocker}</p></li>)}</ul></> : <p>Required packet checks are complete. Finalization also verifies the saved files.</p>}
      <p><Link href={`/sales-documents?jacketId=${encodeURIComponent(jacketId)}`} target="_blank" rel="noreferrer">Upload and review paperwork</Link></p><p>After saving paperwork, select Refresh checklist here.</p>
      {packet.state === "DELIVERED_FUNDING_PENDING" && <p>Funding is still pending. Confirm funding through the packet workflow before marking this deal finished.</p>}
      <label><input type="checkbox" checked={confirmed} onChange={event => setConfirmed(event.target.checked)} /> I verified the required paperwork and all checklist items are complete.</label>
    </>}
    {!finish && !sold && <><p>{unwind ? "This starts a manager review. It does not refund the customer, reverse lender funding, release the vehicle, or adjust taxes." : "Open a correction version on this same deal. Original signed paperwork and sale dates stay preserved. Upload corrected copies and finalize the paperwork again when ready."}</p>
      {unwind && <ul><li>Confirm customer payments and any refunds against the original receipts.</li><li>Reconcile lender funding and bank confirmation.</li><li>Review vehicle return, title/DMV status and any tax corrections.</li></ul>}
      <label>Reason<textarea required minLength={10} maxLength={1000} value={reason} onChange={event => setReason(event.target.value)} /></label></>}
    {error && <p role="alert">{error}</p>}
    <div className={styles.commands}><button data-completion={sold ? "pending" : finish ? "finalized" : undefined} disabled={busy || loading || revision === null || (sold ? !confirmed : !packet || (finish ? !confirmed || blockers.length > 0 || ["UNWIND_PENDING", "DELIVERED_FUNDING_PENDING"].includes(packet.state) : reason.trim().length < 10))} onClick={() => void save()}>{busy ? "Saving…" : title}</button><button disabled={busy || loading} onClick={() => void load()}>Refresh checklist</button><button disabled={busy} onClick={onClose}>Cancel</button></div>
  </dialog>;
}
