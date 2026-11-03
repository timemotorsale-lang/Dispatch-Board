"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { FileText, Printer, Upload, Pencil, ClipboardCheck, History, RefreshCw } from "lucide-react";
import { savedDealSummary, type SavedDealReviewRecord } from "@/lib/deal-saved-summary";
import { SALES_DOCUMENT_PATHWAYS } from "@/lib/sales-document-pathways";
import { dealGroup } from "@/lib/deal-dashboard";
import type { DealWorkspaceSection } from "@/lib/deal-workspace-navigation";
import type { DealOperationsView } from "@/server/sales-documents/dashboard-operations";
import type { SalesDocumentJacketView } from "@/server/sales-documents/service";
import styles from "./deal-workspace-overview.module.css";

const timestamp = (value: string) => Number.isFinite(Date.parse(value)) ? new Date(value).toLocaleString("en-US", { timeZone:"America/Chicago", dateStyle:"medium", timeStyle:"short" }) + " Central" : "Not recorded";
export function DealSavedSummary({ record, dirty, busy, viewer, viewerId, onNavigate, onPreparePacket, onComplete, onSaveAndClose }: {
  record: SavedDealReviewRecord; dirty: boolean; busy: boolean; viewer: string; viewerId: string;
  onNavigate: (section: DealWorkspaceSection) => void; onPreparePacket: () => void; onComplete: () => void; onSaveAndClose: () => void;
}) {
  const summary = useMemo(() => savedDealSummary(record), [record]);
  const [remote, setRemote] = useState<{ operations: DealOperationsView | null; jacket: SalesDocumentJacketView | null; error: string; loading: boolean }>({operations:null,jacket:null,error:"",loading:true});
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      try {
        setRemote({operations:null,jacket:null,error:"",loading:true});
        const response = await fetch(`/api/crm/v1/deal-drafts?${new URLSearchParams({view:"operations",draftId:record.id})}`,{signal:controller.signal,cache:"no-store"});
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || "The saved deal checklist could not be loaded.");
        if (controller.signal.aborted) return;
        setRemote({operations:body,jacket:null,error:"",loading:Boolean(body.jacketId)});
        if (body.jacketId) {
          const response = await fetch(`/api/sales-documents/${encodeURIComponent(body.jacketId)}`,{signal:controller.signal,cache:"no-store"});
          const jacket = await response.json();
          if (!response.ok) throw new Error(jacket.error || "The saved paperwork checklist could not be loaded.");
          if (!controller.signal.aborted) setRemote({operations:body,jacket,error:"",loading:false});
        }
      } catch (caught) {
        if (!controller.signal.aborted) setRemote(current=>({...current,loading:false,error:caught instanceof Error ? caught.message : "Refresh to try loading this deal again."}));
      }
    };
    void load();
    return () => controller.abort();
  }, [record.id,record.revision,refresh]);
  useEffect(()=>{ const focus=()=>setRefresh(value=>value+1);window.addEventListener("focus",focus);return()=>window.removeEventListener("focus",focus); },[]);
  const { operations, jacket } = remote;
  const jacketId = operations?.jacketId || summary.jacketId;
  const inactive = ["ARCHIVED","LOST","CANCELLED"].includes(record.status ?? "");
  const finalized = jacket?.state === "CLOSED";
  const sale = ["SALES","LEASING"].includes(dealGroup(record.pathway));
  const owner = operations?.staff?.find(person=>person.id === operations.ownerId)?.name || ((operations?.ownerId || summary.ownerId) === viewerId ? viewer : "Assigned staff on record");
  const blockers = jacket?.checklist.filter(item=>item.blocker) ?? [];
  const pendingTasks = operations?.tasks?.filter(task=>!["COMPLETED","CANCELLED"].includes(task.status)) ?? [];
  const guarded = dirty || busy || inactive;
  const missingIdentity = !summary.customerLinked || !summary.vehicleLinked;
  return <section className={styles.savedSummary} aria-label="Saved deal summary">
    <div className={styles.summaryMeta}><div><strong>Saved deal</strong><span>Deal ID: {record.id}</span><span>Revision {record.revision} · {timestamp(record.updatedAt)}</span></div><button type="button" disabled={busy} onClick={onSaveAndClose}>Save &amp; close</button></div>
    {dirty && <p className={styles.summaryNotice} role="status">There are unsaved changes. These figures show the last saved version. Use Save &amp; review before preparing paperwork.</p>}
    <div className={styles.summaryPeople} aria-label="Deal identity summary"><div><small>Vehicle</small><strong>{summary.vehicle || "Vehicle not assigned"}</strong>{summary.vin && <span>VIN: {summary.vin}</span>}{summary.stock && <span>Stock #: {summary.stock}</span>}</div><div><small>Customer</small><strong>{summary.customer}</strong>{summary.phone && <span>{summary.phone}</span>}{summary.email && <span>{summary.email}</span>}{summary.address && <span>{summary.address}</span>}</div><div><small>Pathway</small><strong>{SALES_DOCUMENT_PATHWAYS[record.pathway as keyof typeof SALES_DOCUMENT_PATHWAYS] || record.pathway}</strong><small>Assigned staff</small><strong>{owner}</strong>{jacket && <span>Packet: {jacket.dealNumber}</span>}<span>{finalized ? "Paperwork finalized" : record.status === "SOLD" ? "Sold · paperwork pending" : "Saved · continue this deal"}</span></div></div>
    {missingIdentity && !inactive && <section className={styles.next} aria-label="Next deal action"><div><small>Next action</small><h2>{!summary.customerLinked ? "Choose the customer" : "Confirm the vehicle"}</h2><p>Link the shared customer and vehicle before preparing this deal for signing.</p></div><button className={styles.primary} type="button" onClick={()=>onNavigate("identity")}>{!summary.customerLinked ? "Choose customer" : "Choose vehicle"}</button></section>}
    <div className={styles.summaryLayout}>
      <aside className={styles.summaryTools} aria-label="Saved deal actions"><h2>Next steps</h2>
        <button type="button" disabled={guarded || missingIdentity || summary.pathway === "repairs"} onClick={onPreparePacket}><Printer size={17}/>{record.status === "SOLD" || finalized ? "Prepare / print signing packet" : "Prepare signing packet"}</button>
        {jacketId && !dirty ? <Link href={`/sales-documents?jacketId=${encodeURIComponent(jacketId)}`}><Upload size={17}/>Upload / review signed documents</Link> : <button type="button" disabled={guarded} onClick={()=>onNavigate("documents")}><Upload size={17}/>Documents &amp; uploads</button>}
        <button type="button" disabled={guarded || missingIdentity} onClick={()=>finalized ? onNavigate("documents") : sale ? onComplete() : onNavigate("completion")}><ClipboardCheck size={17}/>{inactive ? "Deal inactive" : finalized ? "Review final paperwork" : record.status === "SOLD" ? "Complete paperwork" : sale ? "Mark deal sold" : "Assignment / service handoff"}</button>
        <button type="button" onClick={()=>onNavigate("terms")}><Pencil size={17}/>{finalized ? "Review saved terms" : "Review / edit terms"}</button>
        <button type="button" onClick={()=>onNavigate("activity")}><History size={17}/>Activity &amp; follow-up</button>
        <button type="button" disabled={remote.loading} onClick={()=>setRefresh(value=>value+1)}><RefreshCw size={17}/>Refresh checklist</button>
      </aside>
      <div className={styles.summaryNumbers}><section className={styles.card} aria-label="Saved deal structure"><h2>Deal structure</h2>{summary.error ? <><p role="alert">{summary.error}</p><button type="button" onClick={()=>onNavigate("terms")}>Correct saved terms</button></> : summary.structure.length ? <dl className={styles.summaryRows}>{summary.structure.map(line=><div key={line.label}><dt>{line.label}</dt><dd>{line.value}</dd></div>)}</dl> : <p>Open Terms &amp; Payments to review the saved pathway details.</p>}{summary.note && <details className={styles.advanced}><summary>Staff notes</summary><p className={styles.savedNote}>{summary.note}</p></details>}</section>
      <section className={styles.card} aria-label="Saved payment summary"><h2>Payment summary</h2>{!summary.error && <dl className={styles.summaryRows}>{summary.highlights.map(line=><div key={line.label} data-emphasis={line.emphasis}><dt>{line.label}</dt><dd>{line.value}</dd></div>)}</dl>}<p className={styles.summaryFootnote}>Saved worksheet figures. Payment, funding and delivery are confirmed separately through the existing deal controls.</p></section></div>
    </div>
    <section className={styles.panel} aria-label="Paperwork and follow-up checklist"><div className={styles.heading}><h2>Paperwork &amp; follow-up</h2>{jacket && <span className={styles.status} data-state={finalized ? "complete" : "pending"}>{finalized ? "Finalized" : `${blockers.length} checklist items pending`}</span>}</div>
      {remote.loading && <p role="status">Loading this deal’s checklist…</p>}{remote.error && <p role="alert">{remote.error} Select Refresh checklist to retry.</p>}
      {!remote.loading && !remote.error && !jacket && <p>No paperwork checklist is linked yet. Prepare the packet or use Completion to open this deal’s paperwork checklist.</p>}
      {jacket && <><ul className={styles.summaryChecklist}>{blockers.slice(0,4).map(item=><li key={item.id}><strong>{item.label}</strong><span>{item.blocker}</span></li>)}</ul>{blockers.length > 4 && <details><summary>{blockers.length-4} more checklist items</summary><ul className={styles.summaryChecklist}>{blockers.slice(4).map(item=><li key={item.id}><strong>{item.label}</strong><span>{item.blocker}</span></li>)}</ul></details>}{!blockers.length && <p>{finalized ? "Final paperwork is preserved on this deal. Managers can reopen it for corrections through Details & actions on Deals Home." : "Document checks are clear. Use Complete paperwork for the remaining finalization checks."}</p>}<div className={styles.actions}><Link href={`/sales-documents?jacketId=${encodeURIComponent(jacketId)}`}><FileText size={16}/>Open paperwork checklist</Link></div></>}
      {operations && <div className={styles.summaryFollowup}><h3>Scheduled follow-up</h3>{pendingTasks.length ? <ul>{pendingTasks.slice(0,3).map(task=><li key={task.id}><strong>{task.title}</strong> · {task.ownerName} · {timestamp(task.dueAt)}</li>)}</ul> : <p>No open deal follow-up is scheduled. Open Activity &amp; follow-up for this deal’s history and reminder tools.</p>}</div>}
    </section>
  </section>;
}
