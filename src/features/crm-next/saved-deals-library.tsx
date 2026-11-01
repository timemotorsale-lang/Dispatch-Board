"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, FolderOpen, FileText, RefreshCw, Search } from "lucide-react";
import { SALES_DOCUMENT_PATHWAYS } from "@/lib/sales-document-pathways";
import { SAVED_DEAL_STATUSES, type SavedDealStatus } from "@/lib/saved-deal-status";
import styles from "./deal-draft-workspace.module.css";

type SavedDeal = { id: string; draftId?: string | null; draftRevision?: number | null; jacketId?: string | null; dealNumber?: string | null; packetState?: string | null; customerName: string; vehicleReference: string; pathway: string; status: SavedDealStatus; updatedAt: string };
type Result = { items: SavedDeal[]; counts: Record<string, number>; total: number; page: number; pages: number };

export function SavedDealsLibrary({ onOpen, disabled, refreshKey, title = "Saved Deals", headerAction, renderHeaderAction }: { onOpen: (id: string) => void; disabled: boolean; refreshKey: string; title?: string; headerAction?: ReactNode; renderHeaderAction?: (pathway: string) => ReactNode }) {
  const [search, setSearch] = useState(""), [status, setStatus] = useState("CURRENT"), [pathway, setPathway] = useState("ALL"), [page, setPage] = useState(1);
  const [archiving, setArchiving] = useState<SavedDeal | null>(null), [archiveBusy, setArchiveBusy] = useState(false), [message, setMessage] = useState("");
  const archiveDialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { if (archiving) archiveDialog.current?.showModal(); }, [archiving]);
  const [data, setData] = useState<Result | null>(null), [loading, setLoading] = useState(true), [error, setError] = useState(""), [reload, setReload] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setLoading(true); setError("");
      const params = new URLSearchParams({ view: "workbench", search, status, pathway, page: String(page) });
      void fetch(`/api/crm/v1/deal-drafts?${params}`, { signal: controller.signal }).then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || "Saved deals could not be loaded.");
        if (!controller.signal.aborted) setData(body);
      }).catch((caught) => { if (!controller.signal.aborted) setError(caught instanceof Error ? caught.message : "Saved deals could not be loaded."); })
        .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    }, 200);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [search, status, pathway, page, reload, refreshKey]);
  async function archiveDuplicate() {
    if (!archiving || archiveBusy) return;
    setArchiveBusy(true); setError("");
    try {
      const response = await fetch("/api/crm/v1/deal-drafts", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "ARCHIVE_DUPLICATE", id: archiving.draftId, revision: archiving.draftRevision }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "The duplicate could not be archived. Your documents are unchanged.");
      setArchiving(null); setMessage("Duplicate removed from Current deals. All documents are preserved in the Archived deals tab."); setPage(1); setReload(value => value + 1);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Connection interrupted. Refresh the deals list to check whether it was archived."); }
    finally { setArchiveBusy(false); }
  }
  const count = (key: string) => key === "ALL" || key === "CURRENT" ? Object.entries(data?.counts ?? {}).reduce((sum, [statusKey, value]) => sum + (key === "CURRENT" && statusKey === "ARCHIVED" ? 0 : value), 0) : data?.counts[key] ?? 0;
  return <section className={styles.library} aria-label="Saved deals library">
    <header>{title === "Deals" ? <h1>Deals</h1> : <h2>{title}</h2>}<div className={styles.commands}>{renderHeaderAction?.(pathway) ?? headerAction}<button title="Refresh saved deals" aria-label="Refresh saved deals" disabled={loading} onClick={() => setReload((value) => value + 1)}><RefreshCw size={17} /></button></div></header>
    <div className={styles.tabs} role="tablist" aria-label="Deal sections">
      <button role="tab" aria-selected={status !== "ARCHIVED"} onClick={() => { setStatus("CURRENT"); setPage(1); }}>Current deals ({loading ? "…" : count("CURRENT")})</button>
      <button role="tab" aria-selected={status === "ARCHIVED"} onClick={() => { setStatus("ARCHIVED"); setPage(1); }}>Archived deals ({loading ? "…" : count("ARCHIVED")})</button>
    </div>
    {status === "ARCHIVED" ? <p>Archived deals · preserved packet documents and history. These deals are excluded from Current deals.</p> : null}
    <div className={styles.filters}>
      <label className={styles.search}><Search size={16} /><input aria-label="Search saved deals" placeholder="Customer, vehicle, or deal reference" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} /></label>
      <select aria-label="Saved deal revenue path" value={pathway} onChange={(event) => { setPathway(event.target.value); setPage(1); }}><option value="ALL">All revenue paths</option>{Object.entries(SALES_DOCUMENT_PATHWAYS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select>
      {status !== "ARCHIVED" ? <select aria-label="Deal status filter" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}><option value="CURRENT">All current deals ({loading ? "..." : count("CURRENT")})</option>{Object.entries(SAVED_DEAL_STATUSES).filter(([key]) => key !== "ARCHIVED").map(([key, label]) => <option key={key} value={key}>{label} ({loading ? "..." : count(key)})</option>)}</select> : null}
    </div>
    {error && !archiving ? <p role="alert">{error}</p> : null}
    {message ? <p role="status">{message}</p> : null}
    {archiving ? <dialog ref={archiveDialog} className={styles.archiveDialog} aria-label="Archive duplicate deal" onCancel={event => { if (archiveBusy) event.preventDefault(); else setArchiving(null); }}>
      <h2>Archive this duplicate?</h2><p><strong>{archiving.customerName}</strong> · {archiving.vehicleReference} · {SALES_DOCUMENT_PATHWAYS[archiving.pathway as keyof typeof SALES_DOCUMENT_PATHWAYS]}</p>
      <p>This hides this draft from Current deals. All packet documents and history stay saved. Documents are not moved or merged. Confirm that staff have another deal to continue using.</p>
      {archiving.jacketId ? <p><Link href={`/sales-documents?jacketId=${encodeURIComponent(archiving.jacketId)}`} target="_blank" rel="noreferrer">Review this packet before archiving</Link></p> : null}
      {error ? <p role="alert">{error}</p> : null}
      <div className={styles.commands}><button disabled={archiveBusy} onClick={() => void archiveDuplicate()}>{archiveBusy ? "Archiving…" : "Confirm archive"}</button><button disabled={archiveBusy} onClick={() => setArchiving(null)}>Cancel</button></div>
    </dialog> : null}
    {loading ? <p role="status">Loading saved deals...</p> : !error && !data?.items.length ? <p>No saved deals match this category or search.</p> : null}
    {!loading && !error && data?.items.length ? <div className={styles.tableWrap}><table><thead><tr><th>Customer / Deal</th><th>Vehicle</th><th>Revenue Path</th><th>Status</th><th>Last Saved</th><th /></tr></thead><tbody>{data.items.map((deal) => <tr key={deal.id}>
      <td data-label="Customer / Deal"><strong>{deal.customerName}</strong>{deal.dealNumber ? <small>{deal.dealNumber}</small> : null}</td>
      <td data-label="Vehicle">{deal.vehicleReference || "Not assigned"}</td><td data-label="Revenue Path">{SALES_DOCUMENT_PATHWAYS[deal.pathway as keyof typeof SALES_DOCUMENT_PATHWAYS] ?? deal.pathway}</td>
      <td data-label="Status"><span className={styles.badge} data-status={deal.status}>{SAVED_DEAL_STATUSES[deal.status] ?? deal.status}</span>{deal.packetState === "CHECKED_OUT" ? <small>Checked out</small> : null}</td>
      <td data-label="Last Saved">{new Date(deal.updatedAt).toLocaleString()}{deal.draftId && Number.isInteger(deal.draftRevision) && ["IN_PROGRESS", "PENDING"].includes(deal.status) ? <div className={styles.commands}><button disabled={disabled || archiveBusy} onClick={() => { setError(""); setMessage(""); setArchiving(deal); }}>Archive duplicate</button></div> : null}</td>
      <td><div className={styles.commands}>{deal.draftId || !deal.jacketId ? <button aria-label={`Open deal for ${deal.customerName}`} disabled={disabled} onClick={() => onOpen(deal.draftId || deal.id)}><FolderOpen size={16} />Continue</button> : null}{deal.jacketId ? <Link aria-label={`Open packet for ${deal.customerName}`} href={`/sales-documents?jacketId=${encodeURIComponent(deal.jacketId)}`}><FileText size={16} />Open packet</Link> : null}{!["vehicle-loaner", "daily-rental", "test-drive"].includes(deal.pathway) && <Link href={`/crm-next/deals/start?${new URLSearchParams({ new: "1", pathway: "vehicle-loaner", ...(deal.draftId ? { sourceDraftId: deal.draftId } : { sourceJacketId: deal.jacketId || deal.id }) })}`} aria-label={`Issue related loaner for ${deal.customerName}`}>Issue loaner</Link>}</div></td>
    </tr>)}</tbody></table></div> : null}
    {!loading && !error && data ? <footer><span>{data.total} {data.total === 1 ? "deal" : "deals"} · Page {data.page} of {data.pages}</span><button title="Previous page" aria-label="Previous saved deals page" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}><ChevronLeft size={18} /></button><button title="Next page" aria-label="Next saved deals page" disabled={page >= data.pages} onClick={() => setPage((value) => value + 1)}><ChevronRight size={18} /></button></footer> : null}
  </section>;
}
