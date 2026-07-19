import { AlertTriangle, ArrowRight, BarChart3, Boxes, CarFront, CheckCircle2, ClipboardList, Database, History, Play, Search, ShieldCheck, Wrench } from "lucide-react";
import Link from "next/link";
import { InventoryConsoleSavedViews } from "./inventory-console-saved-views";
import type { InventoryConsoleSavedViewModel, InventoryConsoleWorkView } from "@/server/inventory-console-saved-views";
import type { InventoryConsoleOperationalFacts } from "@/server/inventory-console-home";
import type { InventoryPriorityWorkItem } from "@/server/inventory-console-home/priority-work";

export type InventoryHomeData = {
  byLocation: Array<{ count: number; locationId: string; name: string }>;
  byStage: Array<{ count: number; label: string; stage: string }>;
  error: string | null;
  freshness: "LIVE" | "STALE" | "UNAVAILABLE";
  generatedAt: string | null;
  locationId: string | null;
  activeSavedViewId: string | null;
  canShareSavedViews: boolean;
  savedViews: InventoryConsoleSavedViewModel[];
  savedView: InventoryConsoleWorkView;
  savedViewNotice: string | null;
  operational: InventoryConsoleOperationalFacts | null;
  priorityWork: InventoryPriorityWorkItem[];
  reviews: { approvals: number; reviews: number; available: boolean };
  totals: { active: number; blocked: number; exposureCents: number; overdue: number; waiting: number };
};

const money = (cents: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(cents / 100);

export function InventoryConsoleHome({ data }: { data: InventoryHomeData }) {
  const attention = data.totals.blocked + data.totals.overdue + data.totals.waiting;
  const freshnessLabel = data.freshness === "LIVE" ? "Live data" : data.freshness === "STALE" ? "Stale — verify before acting" : "Unavailable";
  return (
    <section className="inventory-console-home">
      <header className="ich-hero">
        <div><p>Inventory Console</p><h1>Vehicle Operations Home</h1><span>Start work, protect flow, and route attention to the right operating workspace.</span></div>
        <div className="ich-hero-actions"><Link className="ich-primary-action" href="/vehicles/workflows"><Play size={16} />Start Workflow</Link><Link href="/vehicles/discovery"><Search size={16} />Search</Link></div>
      </header>

      <div className={`ich-data-state ich-data-${data.freshness.toLowerCase()}`} role="status">
        <Database size={15} /><strong>{freshnessLabel}</strong><span>{data.generatedAt ? `Cutoff ${new Date(data.generatedAt).toLocaleString()}` : data.error ?? "No authoritative snapshot is available."}</span>
      </div>

      <form action="/vehicles" className="ich-scope-bar" method="get">
        <label>Location scope<select defaultValue={data.locationId ?? ""} name="locationId"><option value="">All permitted locations</option>{data.byLocation.map((location) => <option key={location.locationId} value={location.locationId}>{location.name} ({location.count})</option>)}</select></label>
        <button type="submit">Apply scope</button><Link href="/vehicles">Clear</Link><span>System view contract v1 · permission-scoped</span>
      </form>
      <InventoryConsoleSavedViews activeId={data.activeSavedViewId} activeView={data.savedView} canShare={data.canShareSavedViews} locationId={data.locationId} savedViews={data.savedViews} />
      {data.savedViewNotice ? <p className="ich-view-notice" role="status">{data.savedViewNotice}</p> : null}

      <section aria-label="Inventory Console KPIs" className="ich-kpis">
        <article><CarFront /><span>Active inventory<strong>{data.freshness === "UNAVAILABLE" ? "—" : data.totals.active}</strong></span></article>
        <article><BarChart3 /><span>Inventory capital<strong>{data.freshness === "UNAVAILABLE" ? "—" : money(data.totals.exposureCents)}</strong></span></article>
        <article className={attention ? "attention" : ""}><AlertTriangle /><span>Needs attention<strong>{data.freshness === "UNAVAILABLE" ? "—" : attention}</strong><small>{data.totals.blocked} blocked · {data.totals.overdue} overdue · {data.totals.waiting} waiting</small></span></article>
        <article><Wrench /><span>In-shop work<strong>{data.operational?.shop.active ?? "—"}</strong><small>{data.operational ? `${data.operational.shop.blocked} blocked repair orders` : "Shop facts unavailable"}</small></span></article>
        <article><Boxes /><span>Waiting parts<strong>{data.operational?.parts.waitingDemands ?? "—"}</strong><small>{data.operational ? `${data.operational.parts.unreservedUnits} units not yet reserved` : "Parts facts unavailable"}</small></span></article>
        <article><ShieldCheck /><span>Pending decisions<strong>{data.reviews.available ? data.reviews.reviews + data.reviews.approvals : "Restricted"}</strong><small>{data.reviews.reviews} reviews · {data.reviews.approvals} approvals</small></span></article>
      </section>

      <section className="ich-route-grid">
        <article className="ich-route-card">
          <header><CarFront size={21} /><div><strong>Inventory Lifecycle</strong><span>Acquisition through sale, transfer, or disposition.</span></div></header>
          <div className="ich-stage-strip">{data.byStage.filter((stage) => stage.count > 0).slice(0, 7).map((stage) => <Link href={`/vehicles/inventory?stage=${encodeURIComponent(stage.stage)}`} key={stage.stage}><span>{stage.label}</span><strong>{stage.count}</strong></Link>)}{data.byStage.every((stage) => stage.count === 0) ? <p>No active lifecycle records in this scope.</p> : null}</div>
          <footer><Link href="/vehicles/inventory">Open Inventory Lifecycle<ArrowRight size={15} /></Link><Link href="/vehicles/control-tower">Open Control Tower</Link><Link href="/vehicles/workflow-operations">Review Workflow Operations</Link><Link href="/vehicles/disposition-wholesale">Open Disposition &amp; Wholesale</Link></footer>
        </article>
        <article className="ich-route-card">
          <header><Wrench size={21} /><div><strong>Shop &amp; Recon</strong><span>Daily production, constraints, quality, and parts readiness.</span></div></header>
          {data.operational ? <div className="ich-operational-summary"><span>Open repair orders<strong>{data.operational.shop.active}</strong></span><span>Blocked<strong>{data.operational.shop.blocked}</strong></span><span>Parts demands<strong>{data.operational.parts.waitingDemands}</strong></span></div> : <div className="ich-unavailable"><AlertTriangle size={18} /><div><strong>Operational facts unavailable</strong><span>Open the workspace for current supported operations.</span></div></div>}
          <footer><Link href="/vehicles/shop-production">Open Shop &amp; Recon<ArrowRight size={15} /></Link><Link href="/vehicles/parts-operations">Open Parts Operations</Link></footer>
        </article>
      </section>

      <div className="ich-work-grid">
        <section className="ich-panel"><header><div><strong>Priority Work · {data.savedView}</strong><span>Deduplicated My Work, Team, and exception tiers from authoritative inventory state.</span></div><Link href="/vehicles?view=ALL">View all</Link></header>
          {data.priorityWork.length ? <ol className="ich-priority-list">{data.priorityWork.slice(0, 6).map((item) => <li key={item.id}><span className={item.tier === "P0" ? "critical" : item.tier === "P1" ? "warning" : "neutral"}>{item.tier} · {item.reasonCode}</span><div><strong>{item.inventoryNumber} · {item.vehicle}</strong><small>{item.issue} · Next: {item.nextAction}</small></div><div><span>{item.owner} · {item.queue}</span><small>Due {new Date(item.dueAt).toLocaleString()} · {item.ageDays} lifecycle days{item.escalated ? " · ESCALATED" : ""}</small></div><Link href={`/vehicles/inventory?id=${encodeURIComponent(item.id)}&returnTo=${encodeURIComponent(`/vehicles?view=${data.savedView}`)}`}>Open</Link></li>)}</ol> : <div className="ich-empty"><CheckCircle2 size={20} /><span>No blocked, overdue, or waiting inventory records in this view.</span></div>}
        </section>

        <section className="ich-panel ich-decisions"><header><div><strong>Reviews &amp; Approvals</strong><span>Review and approval remain distinct decisions.</span></div></header>
          {data.reviews.available ? <div><Link href="/manager-review?scope=inventory&view=reviews"><ClipboardList /><span>Reviews<strong>{data.reviews.reviews}</strong></span></Link><Link href="/manager-review?scope=inventory&view=approvals"><ShieldCheck /><span>Approvals<strong>{data.reviews.approvals}</strong></span></Link></div> : <div className="ich-unavailable"><ShieldCheck size={18} /><span>Your current role cannot view enterprise decision counts.</span></div>}
        </section>
      </div>

      <section className="ich-health-grid">
        <article><strong>Flow Health</strong><span>Inventory lifecycle</span><b className={data.freshness === "LIVE" ? "healthy" : "warning"}>{freshnessLabel}</b><span>Shop / Parts facts</span><b className={data.operational ? "healthy" : "warning"}>{data.operational ? "CONNECTED" : "UNAVAILABLE"}</b></article>
        <article><strong>Last 24 Hours</strong><span>Inventory transitions</span><b>{data.operational?.throughput.inventoryTransitions ?? "—"}</b><span>Repair orders closed</span><b>{data.operational?.throughput.repairOrdersClosed ?? "—"}</b></article>
        <article><strong>Data &amp; Integration Health</strong><span>Inventory projection</span><b className={data.freshness === "LIVE" ? "healthy" : "warning"}>{data.freshness}</b><span>Provider-neutral exchanges</span><b className={data.operational?.integration.status === "HEALTHY" ? "healthy" : data.operational?.integration.status === "ATTENTION" ? "warning" : ""}>{data.operational ? `${data.operational.integration.status} · ${data.operational.integration.exceptions} exceptions` : "UNAVAILABLE"}</b></article>
      </section>

      <footer className="ich-footer"><Link href="/activity?scope=inventory"><History size={15} />View Event Log</Link><span>Mockup values are never used as operational facts.</span></footer>
    </section>
  );
}
