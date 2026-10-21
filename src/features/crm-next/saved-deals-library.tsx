"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, FolderOpen, FileText, RefreshCw, Search } from "lucide-react";
import { SALES_DOCUMENT_PATHWAYS } from "@/lib/sales-document-pathways";
import { SAVED_DEAL_STATUSES, type SavedDealStatus } from "@/lib/saved-deal-status";
import styles from "./deal-draft-workspace.module.css";

type SavedDeal = { id: string; draftId?: string | null; jacketId?: string | null; dealNumber?: string | null; packetState?: string | null; customerName: string; vehicleReference: string; pathway: string; status: SavedDealStatus; updatedAt: string };
type Result = { items: SavedDeal[]; counts: Record<string, number>; total: number; page: number; pages: number };

export function SavedDealsLibrary({ onOpen, disabled, refreshKey, title = "Saved Deals", headerAction, renderHeaderAction }: { onOpen: (id: string) => void; disabled: boolean; refreshKey: string; title?: string; headerAction?: ReactNode; renderHeaderAction?: (pathway: string) => ReactNode }) {
  const [search, setSearch] = useState(""), [status, setStatus] = useState("ALL"), [pathway, setPathway] = useState("ALL"), [page, setPage] = useState(1);
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
  const count = (key: string) => key === "ALL" ? Object.values(data?.counts ?? {}).reduce((sum, value) => sum + value, 0) : data?.counts[key] ?? 0;
  return <section className={styles.library} aria-label="Saved deals library">
    <header>{title === "Deals" ? <h1>Deals</h1> : <h2>{title}</h2>}<div className={styles.commands}>{renderHeaderAction?.(pathway) ?? headerAction}<button title="Refresh saved deals" aria-label="Refresh saved deals" disabled={loading} onClick={() => setReload((value) => value + 1)}><RefreshCw size={17} /></button></div></header>
    <div className={styles.filters}>
      <label className={styles.search}><Search size={16} /><input aria-label="Search saved deals" placeholder="Customer, vehicle, or deal reference" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} /></label>
      <select aria-label="Saved deal revenue path" value={pathway} onChange={(event) => { setPathway(event.target.value); setPage(1); }}><option value="ALL">All revenue paths</option>{Object.entries(SALES_DOCUMENT_PATHWAYS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select>
      <select aria-label="Deal status filter" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}><option value="ALL">All statuses ({loading ? "..." : count("ALL")})</option>{Object.entries(SAVED_DEAL_STATUSES).map(([key, label]) => <option key={key} value={key}>{label} ({loading ? "..." : count(key)})</option>)}</select>
    </div>
    {error ? <p role="alert">{error}</p> : null}
    {loading ? <p role="status">Loading saved deals...</p> : !error && !data?.items.length ? <p>No saved deals match this category or search.</p> : null}
    {!loading && !error && data?.items.length ? <div className={styles.tableWrap}><table><thead><tr><th>Customer / Deal</th><th>Vehicle</th><th>Revenue Path</th><th>Status</th><th>Last Saved</th><th /></tr></thead><tbody>{data.items.map((deal) => <tr key={deal.id}>
      <td data-label="Customer / Deal"><strong>{deal.customerName}</strong>{deal.dealNumber ? <small>{deal.dealNumber}</small> : null}</td>
      <td data-label="Vehicle">{deal.vehicleReference || "Not assigned"}</td><td data-label="Revenue Path">{SALES_DOCUMENT_PATHWAYS[deal.pathway as keyof typeof SALES_DOCUMENT_PATHWAYS] ?? deal.pathway}</td>
      <td data-label="Status"><span className={styles.badge} data-status={deal.status}>{SAVED_DEAL_STATUSES[deal.status] ?? deal.status}</span>{deal.packetState === "CHECKED_OUT" ? <small>Checked out</small> : null}</td>
      <td data-label="Last Saved">{new Date(deal.updatedAt).toLocaleString()}</td>
      <td><div className={styles.commands}>{deal.draftId || !deal.jacketId ? <button aria-label={`Open deal for ${deal.customerName}`} disabled={disabled} onClick={() => onOpen(deal.draftId || deal.id)}><FolderOpen size={16} />Continue</button> : null}{deal.jacketId ? <Link aria-label={`Open packet for ${deal.customerName}`} href={`/sales-documents?jacketId=${encodeURIComponent(deal.jacketId)}`}><FileText size={16} />Open packet</Link> : null}{!["vehicle-loaner", "daily-rental", "test-drive"].includes(deal.pathway) && <Link href={`/crm-next/deals/start?${new URLSearchParams({ new: "1", pathway: "vehicle-loaner", ...(deal.draftId ? { sourceDraftId: deal.draftId } : { sourceJacketId: deal.jacketId || deal.id }) })}`} aria-label={`Issue related loaner for ${deal.customerName}`}>Issue loaner</Link>}</div></td>
    </tr>)}</tbody></table></div> : null}
    {!loading && !error && data ? <footer><span>{data.total} {data.total === 1 ? "deal" : "deals"} · Page {data.page} of {data.pages}</span><button title="Previous page" aria-label="Previous saved deals page" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}><ChevronLeft size={18} /></button><button title="Next page" aria-label="Next saved deals page" disabled={page >= data.pages} onClick={() => setPage((value) => value + 1)}><ChevronRight size={18} /></button></footer> : null}
  </section>;
}
