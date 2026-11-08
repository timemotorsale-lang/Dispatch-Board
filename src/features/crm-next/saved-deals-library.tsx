"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, FolderOpen, FileText, RefreshCw, Search } from "lucide-react";
import { SALES_DOCUMENT_PATHWAYS } from "@/lib/sales-document-pathways";
import { SAVED_DEAL_STATUSES } from "@/lib/saved-deal-status";
import styles from "./deal-draft-workspace.module.css";
import { DEAL_GROUPS, dealGroup } from "@/lib/deal-dashboard";
import { moneyToday, csvCell } from "@/lib/money-resources";
import { DealDashboardPanels, type DealDashboardData } from "./deal-dashboard-panels";
import { DealLifecycleDialog, type DealLifecycleAction } from "./deal-lifecycle-dialog";
import { DealOperationsDrawer } from "./deal-operations-drawer";
import { DEAL_WORK_VIEWS } from "@/lib/deal-dashboard-enterprise";
import { DealHomeQuickLinks } from "./deal-home-quick-links";
import { dealTimeShortcut } from "@/lib/deal-workspace-navigation";
import overviewStyles from "./deal-workspace-overview.module.css";
import { DealRowActions, DealRowStatus, type DealLibraryRow } from "./deal-row-controls";
import { DEAL_WORK_AREAS, DEAL_AREA_HELP, isDealWorkArea, type DealWorkArea } from "@/lib/deal-work-areas";
import { moneyLabel } from "@/lib/money-resources";

type SavedDeal = DealLibraryRow;
type SavedWorkView = { id: string; name: string; area?: DealWorkArea; group: string; owner: string; workspace: string; pathway: string; bucket: string; search: string };
type Result = { items: SavedDeal[]; counts: Record<string, number>; total: number; page: number; pages: number; dashboard?: DealDashboardData };

export function SavedDealsLibrary({ onOpen, disabled, refreshKey, title = "Saved Deals", headerAction, renderHeaderAction }: { onOpen: (id: string) => void; disabled: boolean; refreshKey: string; title?: string; headerAction?: ReactNode; renderHeaderAction?: (pathway: string) => ReactNode }) {
  const dashboard = title === "Deals";
  const [area, setArea] = useState<DealWorkArea>("working");
  const [workspace, setWorkspace] = useState("ACCESSIBLE"), [details, setDetails] = useState<SavedDeal | null>(null);
  const [detailsTab, setDetailsTab] = useState("Documents");
  const [savedViews, setSavedViews] = useState<SavedWorkView[]>([]), [viewName, setViewName] = useState(""), [selectedView, setSelectedView] = useState("");
  const [section, setSection] = useState("work"), [group, setGroup] = useState("ALL"), [owner, setOwner] = useState("ALL"), [period, setPeriod] = useState("month"), [date, setDate] = useState(moneyToday), [bucket, setBucket] = useState("ALL"), [pageSize, setPageSize] = useState(25);
  const [search, setSearch] = useState(""), [status, setStatus] = useState("CURRENT"), [pathway, setPathway] = useState("ALL"), [page, setPage] = useState(1);
  const [archiving, setArchiving] = useState<SavedDeal | null>(null), [archiveBusy, setArchiveBusy] = useState(false), [message, setMessage] = useState("");
  const archiveDialog = useRef<HTMLDialogElement>(null);
  const [lifecycle, setLifecycle] = useState<{ deal: SavedDeal; action: DealLifecycleAction } | null>(null);
  useEffect(() => { if (archiving) archiveDialog.current?.showModal(); }, [archiving]);
  const [data, setData] = useState<Result | null>(null), [loading, setLoading] = useState(true), [error, setError] = useState(""), [reload, setReload] = useState(0);
  useEffect(() => {
    if (!dashboard) return;
    const timer = setInterval(() => { if (document.visibilityState === "visible") setReload(value => value + 1); }, 60000);
    return () => clearInterval(timer);
  }, [dashboard]);
  const [restored, setRestored] = useState(!dashboard);
  useEffect(() => {
    if (!dashboard) return;
    const timer = setTimeout(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem("deal-dashboard-filters-v2") || "null");
      if (saved) {
        if (isDealWorkArea(saved.area)) setArea(saved.area);
        if (Object.hasOwn(DEAL_GROUPS, saved.group)) setGroup(saved.group);
        if (["day", "week", "month"].includes(saved.period)) setPeriod(saved.period);
        if (/^\d{4}-\d{2}-\d{2}$/.test(saved.date)) setDate(saved.date);
        if (["overview", "work", "report", "archive"].includes(saved.section)) setSection(saved.section);
        if (["ALL", "CURRENT", ...Object.keys(SAVED_DEAL_STATUSES)].includes(saved.status)) setStatus(saved.status);
        if (["ALL", ...Object.keys(SALES_DOCUMENT_PATHWAYS)].includes(saved.pathway)) setPathway(saved.pathway);
        if (Object.hasOwn(DEAL_WORK_VIEWS, saved.bucket)) setBucket(saved.bucket);
        if (["MY", "TEAM", "ACCESSIBLE"].includes(saved.workspace)) setWorkspace(saved.workspace);
        if (typeof saved.owner === "string") setOwner(saved.owner);
        if (typeof saved.search === "string") setSearch(saved.search);
        if ([25, 50, 100].includes(saved.pageSize)) setPageSize(saved.pageSize);
      }
    } catch {}
    const query = new URLSearchParams(window.location.search);
    if (isDealWorkArea(query.get("area") || "")) {
      setArea(query.get("area") as DealWorkArea); setSection("work"); setStatus("ALL"); setBucket("ALL"); setGroup("ALL"); setPathway("ALL"); setSearch(""); setOwner("ALL");
      if (Object.hasOwn(SALES_DOCUMENT_PATHWAYS, query.get("pathway") || "")) setPathway(query.get("pathway")!);
    }
    setRestored(true);
    }, 0);
    return () => clearTimeout(timer);
  }, [dashboard]);
  useEffect(() => { if (dashboard && restored) { try { sessionStorage.setItem("deal-dashboard-filters-v2", JSON.stringify({ area, group, period, date, section, status, pathway, bucket, owner, search, pageSize, workspace })); } catch {} } }, [dashboard, restored, area, group, period, date, section, status, pathway, bucket, owner, search, pageSize, workspace]);
  useEffect(() => {
    if (!restored) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setLoading(true); setError("");
      const params = new URLSearchParams({ view: "workbench", search, status, pathway, page: String(page) });
      if (dashboard) for (const [key, value] of Object.entries({ dashboard: "1", area: section === "overview" || section === "report" ? "all" : area, group, owner, period, date, bucket, pageSize: String(pageSize), workspace })) params.set(key, value);
      void fetch(`/api/crm/v1/deal-drafts?${params}`, { signal: controller.signal }).then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || "Saved deals could not be loaded.");
        if (!controller.signal.aborted) setData(body);
      }).catch((caught) => { if (!controller.signal.aborted) setError(caught instanceof Error ? caught.message : "Saved deals could not be loaded."); })
        .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    }, 200);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [search, status, pathway, page, reload, refreshKey, dashboard, area, section, group, owner, period, date, bucket, pageSize, restored, workspace]);
  const actorId = data?.dashboard?.actorId;
  useEffect(() => {
    if (!actorId) return;
    const timer = setTimeout(() => { try { const value = JSON.parse(localStorage.getItem(`deal-work-views:${actorId}`) || "[]"); setSavedViews(Array.isArray(value) ? value.filter(view => typeof view.id === "string" && typeof view.name === "string" && Object.hasOwn(DEAL_GROUPS, view.group) && Object.hasOwn(DEAL_WORK_VIEWS, view.bucket) && ["MY", "TEAM", "ACCESSIBLE"].includes(view.workspace)).slice(0, 20) : []); } catch { setSavedViews([]); } }, 0);
    return () => clearTimeout(timer);
  }, [actorId]);
  function storeViews(views: SavedWorkView[]) { if (!actorId) return; try { localStorage.setItem(`deal-work-views:${actorId}`, JSON.stringify(views)); setSavedViews(views); } catch { setError("This browser could not save the view. Your deal records are unchanged."); } }
  function applyWorkView(view: Omit<SavedWorkView, "id" | "name">) { setArea(view.area && isDealWorkArea(view.area) ? view.area : "all"); setGroup(view.group); setOwner(view.owner); setWorkspace(view.workspace); setPathway(view.pathway); setBucket(view.bucket); setSearch(view.search); setSection("work"); setStatus("ALL"); setPage(1); }
  function selectArea(value: DealWorkArea) { setLoading(true); setReload(value => value + 1); setArea(value); setSection(value === "archive" ? "archive" : "work"); setStatus("ALL"); setBucket("ALL"); setGroup("ALL"); setPathway("ALL"); setPage(1); setSelectedView(""); setMessage(""); setSearch(""); }
  function selectBucket(value: string) { if (section === "overview" || section === "report") setArea(value === "paperwork" || value === "aging" || value === "funding" ? "sold" : value === "returns" ? "rentals" : "all"); setBucket(value); setSection("work"); setStatus("ALL"); setPage(1); }
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
  const detailedDeal = data?.items.find(deal => deal.id === details?.id) || details;
  return <section className={styles.library} aria-label="Saved deals library">
    <header>{title === "Deals" ? <h1>Deals</h1> : <h2>{title}</h2>}<div className={styles.commands}>{renderHeaderAction?.(pathway !== "ALL" ? pathway : group === "LEASING" ? "lease-to-own" : group === "SERVICE" ? "repairs" : group === "USE" ? "daily-rental" : "ALL") ?? headerAction}<button title="Refresh saved deals" aria-label="Refresh saved deals" disabled={loading} onClick={() => setReload((value) => value + 1)}><RefreshCw size={17} /></button></div></header>
    {dashboard && <p className={overviewStyles.compactIntro}>Choose a work area, then open the original deal jacket. Documents, money and history stay together.</p>}
    {dashboard && section === "overview" && <DealHomeQuickLinks onContinue={() => selectArea("working")} onPaperwork={() => { selectBucket("paperwork"); setMessage("Choose the deal's Packet or Actions control to review requirements and attach signed documents."); }} onReturns={() => selectBucket("returns")} onSummary={() => { setSection("report"); setStatus("ALL"); setBucket("ALL"); setPage(1); }} />}
    <div className={styles.tabs} role="tablist" aria-label="Deal sections">
      {dashboard && <button role="tab" aria-selected={section === "overview"} onClick={() => { setSection("overview"); setStatus("CURRENT"); setBucket("ALL"); setPage(1); }}>Overview</button>}
      {dashboard ? Object.entries(DEAL_WORK_AREAS).map(([key, label]) => <button key={key} role="tab" aria-selected={["work", "archive"].includes(section) && area === key} onClick={() => selectArea(key as DealWorkArea)}>{label} ({loading ? "…" : data?.dashboard?.areaCounts?.[key] ?? 0})</button>) : <button role="tab" aria-selected={status !== "ARCHIVED"} onClick={() => { setSection("work"); setStatus("CURRENT"); setPage(1); }}>Current deals ({loading ? "…" : count("CURRENT")})</button>}
      {dashboard && <button role="tab" aria-selected={section === "report"} onClick={() => { setSection("report"); setStatus("CURRENT"); setBucket("ALL"); setPage(1); }}>Period summary</button>}
      {!dashboard && <button role="tab" aria-selected={status === "ARCHIVED"} onClick={() => { setSection("archive"); setStatus("ARCHIVED"); setBucket("ALL"); setPage(1); }}>Archived deals ({loading ? "…" : count("ARCHIVED")})</button>}
    </div>
    {status === "ARCHIVED" ? <p>Archived deals · preserved packet documents and history. These deals are excluded from Current deals.</p> : null}
    {dashboard && ["work", "archive"].includes(section) && <div className={styles.areaHeading}><h2>{DEAL_WORK_AREAS[area]}</h2><details><summary>About this view</summary><p>{DEAL_AREA_HELP[area]}</p>{area === "accounts" && <p>Accounts and Sold Deals can reference the same original transaction. Their totals must not be added together.</p>}</details></div>}
    {dashboard && ["overview", "report"].includes(section) && <div className={styles.commands} style={{marginTop:12}}><label>Quick reporting range<select aria-label="Quick reporting range" value="" onChange={event => { const value=event.target.value; if(!value)return; const next=dealTimeShortcut(value,moneyToday());setDate(next.date);setPeriod(next.period);setPage(1); }}><option value="">Choose a reporting period</option>{[["today","Today"],["week","This week"],["month","This month"],["yesterday","Yesterday"],["last-week","Last week"],["two-weeks","Two weeks ago"],["last-month","Last month"]].map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label><span>{period === "day" ? "Daily" : period === "week" ? "Weekly" : "Monthly"} reporting · {date}</span></div>}
    {dashboard && <div className={styles.filters}><label className={styles.search}><Search size={16} /><input aria-label="Search saved deals" placeholder="Customer, vehicle, or deal reference" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} /></label><select aria-label="Saved deal revenue path" value={pathway} onChange={(event) => { setPathway(event.target.value); setPage(1); }}><option value="ALL">All revenue paths</option>{Object.entries(SALES_DOCUMENT_PATHWAYS).filter(([key]) => group === "ALL" || dealGroup(key) === group).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></div>}
    <details className={overviewStyles.advanced} open={!dashboard}><summary>Filters, pathway and personal views</summary>
    {dashboard && section !== "archive" && <div className={styles.savedViews} aria-label="Saved work views">
      <label>Workspace<select aria-label="Workspace" value={workspace} onChange={event => { setWorkspace(event.target.value); setOwner("ALL"); setPage(1); }}><option value="ACCESSIBLE">Accessible deals</option><option value="MY">My work</option>{data?.dashboard?.canManage && <option value="TEAM">Team work · manager</option>}</select></label>
      <button onClick={() => { setSelectedView(""); applyWorkView({ group: "ALL", owner: "ALL", workspace: "MY", pathway: "ALL", bucket: "overdue", search: "" }); }}>My overdue deals</button>
      <button onClick={() => { setSelectedView(""); applyWorkView({ area: "all", group: "LEASING", owner: "ALL", workspace, pathway: "lease-to-own", bucket: "paperwork", search: "" }); }}>Lease paperwork pending</button>
      <button onClick={() => { setSelectedView(""); applyWorkView({ area: "rentals", group: "USE", owner: "ALL", workspace, pathway: "daily-rental", bucket: "returns", search: "" }); }}>Rental returns due</button>
      <label>Saved view<select aria-label="Saved view" value={selectedView} onChange={event => { setSelectedView(event.target.value); const view = savedViews.find(view => view.id === event.target.value); if (view) applyWorkView(view); }}><option value="">Choose a personal view</option>{savedViews.filter(view => view.workspace !== "TEAM" || data?.dashboard?.canManage).map(view => <option key={view.id} value={view.id}>{view.name}</option>)}</select></label>
      <details className={styles.viewEditor}><summary>Save / manage views</summary><div><label>View name<input value={viewName} maxLength={60} placeholder="My lease follow-ups" onChange={event => setViewName(event.target.value)} /></label><button disabled={!viewName.trim() || !actorId || savedViews.length >= 20} onClick={() => { const view = { id: crypto.randomUUID(), name: viewName.trim(), area, group, owner, workspace, pathway, bucket, search }; storeViews([...savedViews, view]); setSelectedView(view.id); setViewName(""); }}>Save current view</button>
      {selectedView && <button onClick={() => { storeViews(savedViews.filter(view => view.id !== selectedView)); setSelectedView(""); }}>Remove saved view</button>}<small>Personal views are saved in this browser for your account.</small></div></details>
    </div>}
    <div className={styles.filters}>
      {dashboard && <><label>Pathway group<select value={group} onChange={event => { setGroup(event.target.value); setPathway("ALL"); setPage(1); }}>{Object.entries(DEAL_GROUPS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label><label>Owner<select value={owner} onChange={event => { setOwner(event.target.value); setPage(1); }}><option value="ALL">All accessible records</option><option value="ME">My work</option>{data?.dashboard?.owners.map(person => <option key={person.id} value={person.id}>{person.name}</option>)}</select></label><label>Reporting period<select value={period} onChange={event => { setPeriod(event.target.value); setPage(1); }}><option value="day">Day</option><option value="week">Week</option><option value="month">Month</option></select></label><label>Report date<input type="date" value={date} onChange={event => { if (event.target.value) { setDate(event.target.value); setPage(1); } }} /></label></>}
      {!dashboard && <label className={styles.search}><Search size={16} /><input aria-label="Search saved deals" placeholder="Customer, vehicle, or deal reference" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} /></label>}
      {!dashboard && <select aria-label="Saved deal revenue path" value={pathway} onChange={(event) => { setPathway(event.target.value); setPage(1); }}><option value="ALL">All revenue paths</option>{Object.entries(SALES_DOCUMENT_PATHWAYS).filter(([key]) => group === "ALL" || dealGroup(key) === group).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select>}
      {status !== "ARCHIVED" ? <select aria-label="Deal status filter" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}>{dashboard && <option value="ALL">All statuses in this area</option>}<option value="CURRENT">Current records ({loading ? "..." : count("CURRENT")})</option>{Object.entries(SAVED_DEAL_STATUSES).filter(([key]) => dashboard || key !== "ARCHIVED").map(([key, label]) => <option key={key} value={key}>{label} ({loading ? "..." : count(key)})</option>)}</select> : null}
      {dashboard && <button onClick={() => { setGroup("ALL"); setOwner("ALL"); setWorkspace("ACCESSIBLE"); setSelectedView(""); setPathway("ALL"); setSearch(""); setBucket("ALL"); setStatus("ALL"); setPage(1); }}>Clear filters</button>}
    </div>
    </details>
    {dashboard && section !== "archive" && section !== "report" && <div className={styles.commands}><label>Work view<select aria-label="Work view" value={bucket} onChange={event => { selectBucket(event.target.value); }}>{Object.entries(DEAL_WORK_VIEWS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label><button onClick={exportVisible} disabled={loading}>Export visible rows</button><label>Rows<select value={pageSize} onChange={event => { setPageSize(Number(event.target.value)); setPage(1); }}>{[25, 50, 100].map(size => <option key={size} value={size}>{size}</option>)}</select></label></div>}
    {dashboard && data?.dashboard && !loading && ["overview", "report"].includes(section) && <DealDashboardPanels data={data.dashboard} report={section === "report"} onFilter={selectBucket} />}
    {error && !archiving ? <p role="alert">{error}</p> : null}
    {message ? <p role="status">{message}</p> : null}
    {detailedDeal && <DealOperationsDrawer deal={detailedDeal} initialTab={detailsTab} alerts={detailedDeal.indicators?.alerts} onClose={() => setDetails(null)} onChanged={() => setReload(value => value + 1)} />}
    {lifecycle?.deal.draftId && <DealLifecycleDialog deal={{ ...lifecycle.deal, draftId: lifecycle.deal.draftId }} action={lifecycle.action} onClose={() => setLifecycle(null)} onSaved={text => { setLifecycle(null); setMessage(text); setReload(value => value + 1); }} />}
    {archiving ? <dialog ref={archiveDialog} className={styles.archiveDialog} aria-label="Archive duplicate deal" onCancel={event => { if (archiveBusy) event.preventDefault(); else setArchiving(null); }}>
      <h2>Archive this duplicate?</h2><p><strong>{archiving.customerName}</strong> · {archiving.vehicleReference} · {SALES_DOCUMENT_PATHWAYS[archiving.pathway as keyof typeof SALES_DOCUMENT_PATHWAYS]}</p>
      <p>This hides this draft from Current deals. All packet documents and history stay saved. Documents are not moved or merged. Confirm that staff have another deal to continue using.</p>
      {archiving.jacketId ? <p><Link href={`/sales-documents?jacketId=${encodeURIComponent(archiving.jacketId)}`} target="_blank" rel="noreferrer">Review this packet before archiving</Link></p> : null}
      {error ? <p role="alert">{error}</p> : null}
      <div className={styles.commands}><button disabled={archiveBusy} onClick={() => void archiveDuplicate()}>{archiveBusy ? "Archiving…" : "Confirm archive"}</button><button disabled={archiveBusy} onClick={() => setArchiving(null)}>Cancel</button></div>
    </dialog> : null}
    {loading ? <p role="status">Loading saved deals...</p> : section !== "report" && !error && !data?.items.length ? <p>No saved deals match this category or search.</p> : null}
    {!loading && !error && section !== "report" && data?.items.length ? <div className={`${styles.tableWrap} ${dashboard ? styles.compact : ""}`}><table><thead><tr><th>Customer / Deal</th><th>Vehicle</th><th>Revenue Path</th><th>Status / Next action</th><th>Owner / Due</th><th>Actions</th></tr></thead><tbody>{data.items.map((deal) => <tr key={deal.id}>
      <td data-label="Customer / Deal"><strong>{deal.customerName}</strong>{deal.dealNumber ? <small>{deal.dealNumber}</small> : null}{dashboard && (deal.soldDate ? <small>Sold {deal.soldDate}</small> : deal.indicators && <small>{deal.indicators.ageDays} days open</small>)}{dashboard && area === "accounts" && section === "work" && <><small>Recorded outstanding: {deal.indicators?.financials?.outstandingCents == null ? "Not recorded" : moneyLabel(deal.indicators.financials.outstandingCents)}</small></>}</td>
      <td data-label="Vehicle"><span className={styles.truncate} title={deal.vehicleReference}>{deal.vehicleReference || "Not assigned"}</span></td>
      <td data-label="Revenue Path">{SALES_DOCUMENT_PATHWAYS[deal.pathway as keyof typeof SALES_DOCUMENT_PATHWAYS] ?? deal.pathway}</td>
      <td data-label="Status / Next action">{dashboard ? <DealRowStatus deal={deal} onDetails={() => { setDetailsTab(deal.outstandingItems?.length ? "Completion" : "Documents"); setDetails(deal); }} /> : <span className={styles.badge} data-status={deal.status}>{deal.stage || SAVED_DEAL_STATUSES[deal.status] || deal.status}</span>}</td>
      <td data-label="Owner / Due">{dashboard ? <><span>{deal.ownerName || "Unassigned"}</span><small>{deal.dueAt ? new Date(deal.dueAt).toLocaleString() : "No due date"}</small></> : new Date(deal.updatedAt).toLocaleString()}</td>
      <td>{dashboard ? <DealRowActions deal={deal} canManage={Boolean(data.dashboard?.canManage)} disabled={disabled} archiveBusy={archiveBusy} onOpen={() => onOpen(deal.draftId || deal.id)} onDetails={tab => { setDetailsTab(tab); setDetails(deal); }} onLifecycle={action => setLifecycle({ deal, action })} onArchive={() => { setError(""); setMessage(""); setArchiving(deal); }} /> : <>
        <div className={styles.commands}>{(deal.draftId || !deal.jacketId) && deal.indicators?.canEdit !== false ? <button aria-label={`Open deal for ${deal.customerName}`} disabled={disabled} onClick={() => onOpen(deal.draftId || deal.id)}><FolderOpen size={16} />Continue</button> : null}{deal.jacketId ? <Link aria-label={`Open packet for ${deal.customerName}`} href={`/sales-documents?jacketId=${encodeURIComponent(deal.jacketId)}`}><FileText size={16} />Open packet</Link> : null}</div>
        {deal.status !== "ARCHIVED" && <details><summary>More</summary><div className={styles.commands}>
          {!["vehicle-loaner", "daily-rental", "test-drive"].includes(deal.pathway) && <Link href={`/crm-next/deals/start?${new URLSearchParams({ new: "1", pathway: "vehicle-loaner", ...(deal.draftId ? { sourceDraftId: deal.draftId } : { sourceJacketId: deal.jacketId || deal.id }) })}`} aria-label={`Issue related loaner for ${deal.customerName}`}>Issue loaner</Link>}
          {deal.customerId && <Link href={`/crm-next/actions/set-reminder?customerId=${encodeURIComponent(deal.customerId)}`}>Set reminder</Link>}
          {deal.draftId && deal.indicators?.canEdit !== false && Number.isInteger(deal.draftRevision) && ["IN_PROGRESS", "PENDING"].includes(deal.status) && <button disabled={disabled || archiveBusy} onClick={() => { setError(""); setMessage(""); setArchiving(deal); }}>Archive duplicate</button>}
        </div></details>}
      </>}</td>
    </tr>)}</tbody></table></div> : null}
    {!loading && !error && section !== "report" && data ? <footer><span>{data.total} {data.total === 1 ? "deal" : "deals"} · Page {data.page} of {data.pages}</span><button title="Previous page" aria-label="Previous saved deals page" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}><ChevronLeft size={18} /></button><button title="Next page" aria-label="Next saved deals page" disabled={page >= data.pages} onClick={() => setPage((value) => value + 1)}><ChevronRight size={18} /></button></footer> : null}
  </section>;
}
