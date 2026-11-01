"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, FolderOpen, FileText, RefreshCw, Search } from "lucide-react";
import { SALES_DOCUMENT_PATHWAYS } from "@/lib/sales-document-pathways";
import { SAVED_DEAL_STATUSES, type SavedDealStatus } from "@/lib/saved-deal-status";
import styles from "./deal-draft-workspace.module.css";
import { DEAL_GROUPS, dealGroup } from "@/lib/deal-dashboard";
import { moneyToday, csvCell } from "@/lib/money-resources";
import { DealDashboardPanels, type DealDashboardData } from "./deal-dashboard-panels";
import { DealLifecycleDialog, type DealLifecycleAction } from "./deal-lifecycle-dialog";

type SavedDeal = { id: string; draftId?: string | null; draftRevision?: number | null; jacketId?: string | null; dealNumber?: string | null; packetState?: string | null; customerId?: string | null; customerName: string; vehicleReference: string; pathway: string; status: SavedDealStatus; updatedAt: string; ownerName?: string; nextAction?: string; dueAt?: string | null; taskHref?: string | null; stage?: string; documentsReady?: number; documentsTotal?: number; documentChecklist?: Array<{ id: string; label: string; phase: string; status: string }> };
type Result = { items: SavedDeal[]; counts: Record<string, number>; total: number; page: number; pages: number; dashboard?: DealDashboardData };

export function SavedDealsLibrary({ onOpen, disabled, refreshKey, title = "Saved Deals", headerAction, renderHeaderAction }: { onOpen: (id: string) => void; disabled: boolean; refreshKey: string; title?: string; headerAction?: ReactNode; renderHeaderAction?: (pathway: string) => ReactNode }) {
  const dashboard = title === "Deals";
  const [section, setSection] = useState("overview"), [group, setGroup] = useState("ALL"), [owner, setOwner] = useState("ALL"), [period, setPeriod] = useState("month"), [date, setDate] = useState(moneyToday), [bucket, setBucket] = useState("ALL"), [pageSize, setPageSize] = useState(25), [expanded, setExpanded] = useState<string | null>(null);
  const [search, setSearch] = useState(""), [status, setStatus] = useState("CURRENT"), [pathway, setPathway] = useState("ALL"), [page, setPage] = useState(1);
  const [archiving, setArchiving] = useState<SavedDeal | null>(null), [archiveBusy, setArchiveBusy] = useState(false), [message, setMessage] = useState("");
  const archiveDialog = useRef<HTMLDialogElement>(null);
  const [lifecycle, setLifecycle] = useState<{ deal: SavedDeal; action: DealLifecycleAction } | null>(null);
  useEffect(() => { if (archiving) archiveDialog.current?.showModal(); }, [archiving]);
  const [data, setData] = useState<Result | null>(null), [loading, setLoading] = useState(true), [error, setError] = useState(""), [reload, setReload] = useState(0);
  const [restored, setRestored] = useState(!dashboard);
  useEffect(() => {
    if (!dashboard) return;
    const timer = setTimeout(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem("deal-dashboard-filters") || "null");
      if (saved) {
        if (Object.hasOwn(DEAL_GROUPS, saved.group)) setGroup(saved.group);
        if (["day", "week", "month"].includes(saved.period)) setPeriod(saved.period);
        if (/^\d{4}-\d{2}-\d{2}$/.test(saved.date)) setDate(saved.date);
        if (["overview", "work", "report", "archive"].includes(saved.section)) setSection(saved.section);
        if (["CURRENT", ...Object.keys(SAVED_DEAL_STATUSES)].includes(saved.status)) setStatus(saved.status);
        if (["ALL", ...Object.keys(SALES_DOCUMENT_PATHWAYS)].includes(saved.pathway)) setPathway(saved.pathway);
        if (["ALL", "attention", "working", "ready", "funding", "completed", "overdue"].includes(saved.bucket)) setBucket(saved.bucket);
        if (typeof saved.owner === "string") setOwner(saved.owner);
        if (typeof saved.search === "string") setSearch(saved.search);
        if ([25, 50, 100].includes(saved.pageSize)) setPageSize(saved.pageSize);
      }
    } catch {}
    setRestored(true);
    }, 0);
    return () => clearTimeout(timer);
  }, [dashboard]);
  useEffect(() => { if (dashboard && restored) { try { sessionStorage.setItem("deal-dashboard-filters", JSON.stringify({ group, period, date, section, status, pathway, bucket, owner, search, pageSize })); } catch {} } }, [dashboard, restored, group, period, date, section, status, pathway, bucket, owner, search, pageSize]);
  useEffect(() => {
    if (!restored) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setLoading(true); setError("");
      const params = new URLSearchParams({ view: "workbench", search, status, pathway, page: String(page) });
      if (dashboard) for (const [key, value] of Object.entries({ dashboard: "1", group, owner, period, date, bucket, pageSize: String(pageSize) })) params.set(key, value);
      void fetch(`/api/crm/v1/deal-drafts?${params}`, { signal: controller.signal }).then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || "Saved deals could not be loaded.");
        if (!controller.signal.aborted) setData(body);
      }).catch((caught) => { if (!controller.signal.aborted) setError(caught instanceof Error ? caught.message : "Saved deals could not be loaded."); })
        .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    }, 200);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [search, status, pathway, page, reload, refreshKey, dashboard, group, owner, period, date, bucket, pageSize, restored]);
  function selectBucket(value: string) { setBucket(value); setSection("work"); setStatus("CURRENT"); setPage(1); }
  function exportVisible() {
    if (!data) return;
    const rows = [["Deal", "Customer", "Vehicle", "Pathway", "Stage", "Next action", "Owner", "Due", "Updated"], ...data.items.map(row => [row.dealNumber || row.id, row.customerName, row.vehicleReference, SALES_DOCUMENT_PATHWAYS[row.pathway as keyof typeof SALES_DOCUMENT_PATHWAYS], row.stage || SAVED_DEAL_STATUSES[row.status], row.nextAction || "", row.ownerName || "", row.dueAt || "", row.updatedAt])];
    const url = URL.createObjectURL(new Blob([rows.map(row => row.map(csvCell).join(",")).join("\r\n")], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = `deal-visible-rows-page-${page}.csv`; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
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
    <header>{title === "Deals" ? <h1>Deals</h1> : <h2>{title}</h2>}<div className={styles.commands}>{renderHeaderAction?.(pathway !== "ALL" ? pathway : group === "LEASING" ? "lease-to-own" : group === "SERVICE" ? "repairs" : group === "USE" ? "daily-rental" : "ALL") ?? headerAction}<button title="Refresh saved deals" aria-label="Refresh saved deals" disabled={loading} onClick={() => setReload((value) => value + 1)}><RefreshCw size={17} /></button></div></header>
    <div className={styles.tabs} role="tablist" aria-label="Deal sections">
      {dashboard && <button role="tab" aria-selected={section === "overview"} onClick={() => { setSection("overview"); setStatus("CURRENT"); setBucket("ALL"); setPage(1); }}>Overview</button>}
      <button role="tab" aria-selected={status !== "ARCHIVED" && (!dashboard || section === "work")} onClick={() => { setSection("work"); setStatus("CURRENT"); setBucket("ALL"); setPage(1); }}>Current deals ({loading ? "…" : count("CURRENT")})</button>
      {dashboard && <button role="tab" aria-selected={section === "report"} onClick={() => { setSection("report"); setStatus("CURRENT"); setBucket("ALL"); setPage(1); }}>Period summary</button>}
      <button role="tab" aria-selected={status === "ARCHIVED"} onClick={() => { setSection("archive"); setStatus("ARCHIVED"); setBucket("ALL"); setPage(1); }}>Archived deals ({loading ? "…" : count("ARCHIVED")})</button>
    </div>
    {status === "ARCHIVED" ? <p>Archived deals · preserved packet documents and history. These deals are excluded from Current deals.</p> : null}
    <div className={styles.filters}>
      {dashboard && <><label>Pathway group<select value={group} onChange={event => { setGroup(event.target.value); setPathway("ALL"); setPage(1); }}>{Object.entries(DEAL_GROUPS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label><label>Owner<select value={owner} onChange={event => { setOwner(event.target.value); setPage(1); }}><option value="ALL">All accessible records</option><option value="ME">My work</option>{data?.dashboard?.owners.map(person => <option key={person.id} value={person.id}>{person.name}</option>)}</select></label><label>Reporting period<select value={period} onChange={event => { setPeriod(event.target.value); setPage(1); }}><option value="day">Day</option><option value="week">Week</option><option value="month">Month</option></select></label><label>Report date<input type="date" value={date} onChange={event => { if (event.target.value) { setDate(event.target.value); setPage(1); } }} /></label></>}
      <label className={styles.search}><Search size={16} /><input aria-label="Search saved deals" placeholder="Customer, vehicle, or deal reference" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} /></label>
      <select aria-label="Saved deal revenue path" value={pathway} onChange={(event) => { setPathway(event.target.value); setPage(1); }}><option value="ALL">All revenue paths</option>{Object.entries(SALES_DOCUMENT_PATHWAYS).filter(([key]) => group === "ALL" || dealGroup(key) === group).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select>
      {status !== "ARCHIVED" ? <select aria-label="Deal status filter" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}><option value="CURRENT">All current deals ({loading ? "..." : count("CURRENT")})</option>{Object.entries(SAVED_DEAL_STATUSES).filter(([key]) => key !== "ARCHIVED").map(([key, label]) => <option key={key} value={key}>{label} ({loading ? "..." : count(key)})</option>)}</select> : null}
      {dashboard && <button onClick={() => { setGroup("ALL"); setOwner("ALL"); setPathway("ALL"); setSearch(""); setBucket("ALL"); setStatus(section === "archive" ? "ARCHIVED" : "CURRENT"); setPage(1); }}>Clear filters</button>}
    </div>
    {dashboard && section !== "archive" && section !== "report" && <div className={styles.commands}><label>Work view<select value={bucket} onChange={event => { selectBucket(event.target.value); }}><option value="ALL">All current work</option><option value="attention">Needs attention</option><option value="overdue">My overdue follow-ups</option><option value="working">Working</option><option value="ready">Ready to finalize</option><option value="funding">Awaiting funding</option><option value="completed">Completed in selected period</option></select></label><button onClick={exportVisible} disabled={loading}>Export visible rows</button><label>Rows<select value={pageSize} onChange={event => { setPageSize(Number(event.target.value)); setPage(1); }}>{[25, 50, 100].map(size => <option key={size} value={size}>{size}</option>)}</select></label></div>}
    {dashboard && data?.dashboard && !loading && section !== "archive" && <DealDashboardPanels data={data.dashboard} report={section === "report"} onFilter={selectBucket} />}
    {error && !archiving ? <p role="alert">{error}</p> : null}
    {message ? <p role="status">{message}</p> : null}
    {lifecycle?.deal.draftId && lifecycle.deal.jacketId && <DealLifecycleDialog deal={{ ...lifecycle.deal, draftId: lifecycle.deal.draftId, jacketId: lifecycle.deal.jacketId }} action={lifecycle.action} onClose={() => setLifecycle(null)} onSaved={text => { setLifecycle(null); setMessage(text); setReload(value => value + 1); }} />}
    {archiving ? <dialog ref={archiveDialog} className={styles.archiveDialog} aria-label="Archive duplicate deal" onCancel={event => { if (archiveBusy) event.preventDefault(); else setArchiving(null); }}>
      <h2>Archive this duplicate?</h2><p><strong>{archiving.customerName}</strong> · {archiving.vehicleReference} · {SALES_DOCUMENT_PATHWAYS[archiving.pathway as keyof typeof SALES_DOCUMENT_PATHWAYS]}</p>
      <p>This hides this draft from Current deals. All packet documents and history stay saved. Documents are not moved or merged. Confirm that staff have another deal to continue using.</p>
      {archiving.jacketId ? <p><Link href={`/sales-documents?jacketId=${encodeURIComponent(archiving.jacketId)}`} target="_blank" rel="noreferrer">Review this packet before archiving</Link></p> : null}
      {error ? <p role="alert">{error}</p> : null}
      <div className={styles.commands}><button disabled={archiveBusy} onClick={() => void archiveDuplicate()}>{archiveBusy ? "Archiving…" : "Confirm archive"}</button><button disabled={archiveBusy} onClick={() => setArchiving(null)}>Cancel</button></div>
    </dialog> : null}
    {loading ? <p role="status">Loading saved deals...</p> : section !== "report" && !error && !data?.items.length ? <p>No saved deals match this category or search.</p> : null}
    {!loading && !error && section !== "report" && data?.items.length ? <div className={`${styles.tableWrap} ${dashboard ? styles.compact : ""}`}><table><thead><tr><th>Customer / Deal</th><th>Vehicle</th><th>Revenue Path</th><th>Status / Next action</th><th>Owner / Due</th><th>Actions</th></tr></thead><tbody>{data.items.map((deal) => <tr key={deal.id}>
      <td data-label="Customer / Deal"><strong>{deal.customerName}</strong>{deal.dealNumber ? <small>{deal.dealNumber}</small> : null}</td>
      <td data-label="Vehicle"><span className={styles.truncate} title={deal.vehicleReference}>{deal.vehicleReference || "Not assigned"}</span>{dashboard && <details open={expanded === deal.id} onToggle={event => { if (event.currentTarget.open) setExpanded(deal.id); else setExpanded(current => current === deal.id ? null : current); }}><summary>Details</summary><p>{deal.vehicleReference}</p><p>Last saved: {new Date(deal.updatedAt).toLocaleString()}</p><p>{deal.documentsTotal ? `${deal.documentsReady}/${deal.documentsTotal} document checks complete` : "Packet checklist not yet available"}</p>
        {deal.documentChecklist?.length ? <ul className={styles.documentChecklist}>{deal.documentChecklist.map(item => <li key={`${item.phase}:${item.id}`}><strong>{item.phase === "RETURN" ? "Return" : item.phase === "CHECKOUT" ? "Checkout" : "Closing"} · {item.label}</strong><span>{item.status}</span></li>)}</ul> : null}
        {deal.jacketId && <Link href={`/sales-documents?jacketId=${encodeURIComponent(deal.jacketId)}`}>Upload and review documents</Link>}
      </details>}</td><td data-label="Revenue Path">{SALES_DOCUMENT_PATHWAYS[deal.pathway as keyof typeof SALES_DOCUMENT_PATHWAYS] ?? deal.pathway}</td>
      <td data-label="Status / Next action"><span className={styles.badge} data-status={deal.status}>{deal.stage === "Completed" && deal.status === "SOLD" ? deal.pathway === "lease-to-own" ? "Sold · lease" : "Sold" : deal.stage || SAVED_DEAL_STATUSES[deal.status] || deal.status}</span>{deal.nextAction && <small>{deal.taskHref ? <Link href={deal.taskHref}>{deal.nextAction}</Link> : deal.nextAction}</small>}{Boolean(deal.documentsTotal) && <small>{deal.documentsReady}/{deal.documentsTotal} reviewed</small>}</td>
      <td data-label="Owner / Due">{dashboard ? <><span>{deal.ownerName || "Unassigned"}</span><small>{deal.dueAt ? new Date(deal.dueAt).toLocaleString() : "No due date"}</small></> : new Date(deal.updatedAt).toLocaleString()}</td>
      <td><div className={styles.commands}>{deal.draftId || !deal.jacketId ? <button aria-label={`Open deal for ${deal.customerName}`} disabled={disabled} onClick={() => onOpen(deal.draftId || deal.id)}><FolderOpen size={16} />Continue</button> : null}{deal.jacketId ? <Link aria-label={`Open packet for ${deal.customerName}`} href={`/sales-documents?jacketId=${encodeURIComponent(deal.jacketId)}`}><FileText size={16} />{dashboard ? "Packet" : "Open packet"}</Link> : null}</div>
        {dashboard && deal.draftId && deal.jacketId && ["SALES", "LEASING"].includes(dealGroup(deal.pathway)) && !["ARCHIVED", "CANCELLED", "LOST"].includes(deal.status) && !["UNWIND_PENDING", "DELIVERED_FUNDING_PENDING"].includes(deal.packetState || "") && !(deal.status === "SOLD" && deal.packetState === "CLOSED") && <button disabled={disabled} onClick={() => setLifecycle({ deal, action: "FINISH" })}>{deal.pathway === "lease-to-own" ? "Finish lease" : "Finish deal"}</button>}
        {deal.status !== "ARCHIVED" && <details><summary>More</summary><div className={styles.commands}>
          {dashboard && data.dashboard?.canManage && deal.draftId && deal.jacketId && ["SALES", "LEASING"].includes(dealGroup(deal.pathway)) && ["CLOSED", "DELIVERED_FUNDING_PENDING"].includes(deal.packetState || "") && <><button disabled={disabled} onClick={() => setLifecycle({ deal, action: "REOPEN" })}>Reopen for corrections</button><button disabled={disabled} onClick={() => setLifecycle({ deal, action: "REQUEST_UNWIND" })}>Request unwind review</button></>}
          {!["vehicle-loaner", "daily-rental", "test-drive"].includes(deal.pathway) && <Link href={`/crm-next/deals/start?${new URLSearchParams({ new: "1", pathway: "vehicle-loaner", ...(deal.draftId ? { sourceDraftId: deal.draftId } : { sourceJacketId: deal.jacketId || deal.id }) })}`} aria-label={`Issue related loaner for ${deal.customerName}`}>Issue loaner</Link>}
          {deal.customerId && <Link href={`/crm-next/actions/set-reminder?customerId=${encodeURIComponent(deal.customerId)}`}>Set reminder</Link>}
          {deal.draftId && Number.isInteger(deal.draftRevision) && ["IN_PROGRESS", "PENDING"].includes(deal.status) && <button disabled={disabled || archiveBusy} onClick={() => { setError(""); setMessage(""); setArchiving(deal); }}>Archive duplicate</button>}
        </div></details>}
      </td>
    </tr>)}</tbody></table></div> : null}
    {!loading && !error && section !== "report" && data ? <footer><span>{data.total} {data.total === 1 ? "deal" : "deals"} · Page {data.page} of {data.pages}</span><button title="Previous page" aria-label="Previous saved deals page" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}><ChevronLeft size={18} /></button><button title="Next page" aria-label="Next saved deals page" disabled={page >= data.pages} onClick={() => setPage((value) => value + 1)}><ChevronRight size={18} /></button></footer> : null}
  </section>;
}
