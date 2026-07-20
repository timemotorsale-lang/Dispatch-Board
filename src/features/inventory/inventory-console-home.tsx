import { AlertTriangle, ArrowRight, Boxes, CarFront, CheckCircle2, ChevronRight, CircleDollarSign, ClipboardList, Clock3, Database, Download, FileCheck2, Gift, Handshake, History, Play, Search, ShieldCheck, Tags, Truck, Wrench } from "lucide-react";
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
  reviews: { approvals: number; reviews: number; available: boolean; items: Array<{ actionHref: string; actionLabel: string; ageHours: number; amountCents: number | null; domain: string; id: string; kind: "REVIEW" | "APPROVAL"; overdue: boolean; owner: string; state: string; subject: string; title: string }> };
  totals: { active: number; agedExposureCents: number; blocked: number; exposureCents: number; overdue: number; waiting: number };
};

const money = (cents: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(cents / 100);

export function InventoryConsoleHome({ data }: { data: InventoryHomeData }) {
  const attention = data.totals.blocked + data.totals.overdue + data.totals.waiting;
  const freshnessLabel = data.freshness === "LIVE" ? "Live data" : data.freshness === "STALE" ? "Stale — verify before acting" : "Unavailable";
  const lifecycleGroups = [
    ["Acquired", ["PURCHASED_OR_TRADE_IN"], Handshake], ["Received", ["TRANSPORTATION", "RECEIVED"], Truck], ["Inspected", ["INSPECTION"], Search], ["Recon", ["RECONDITIONING", "TITLE_DOCUMENT_READINESS"], Wrench], ["Merchandising", ["PHOTOGRAPHY_MERCHANDISING"], Tags], ["Frontline Ready", ["FRONTLINE_READY", "RESERVED_DEAL_PENDING"], FileCheck2], ["Sold / Wholesale / Transferred", ["SOLD", "DELIVERED", "WHOLESALED_OR_OTHER_DISPOSITION"], CarFront],
  ] as const;
  const groupedLifecycle = lifecycleGroups.map(([label, stages, Icon]) => ({ label, stage: stages[0], Icon, count: data.byStage.filter((item) => (stages as readonly string[]).includes(item.stage)).reduce((sum, item) => sum + item.count, 0) }));
  const lifecycleTarget = data.totals.active ? Math.max(0, Math.round((data.totals.active - data.totals.overdue) / data.totals.active * 100)) : 100;
  const shopTarget = data.operational?.shop.active ? Math.max(0, Math.round((data.operational.shop.active - data.operational.shop.blocked) / data.operational.shop.active * 100)) : null;
  const shopStages = [["Unassigned", "—", CarFront], ["Diagnosing", "—", Search], ["Estimate / Approval", "—", ClipboardList], ["Waiting on Parts", data.operational?.parts.waitingDemands ?? "—", Boxes], ["In Progress", data.operational?.shop.active ?? "—", Wrench], ["Quality Check", "—", ShieldCheck], ["Complete", "—", CheckCircle2]] as const;
  return (
    <section className="inventory-console-home">
      <header className="ich-hero">
        <div><p>Operations Home</p><h1>Inventory Console</h1><span>My operational view&nbsp; • &nbsp;{data.locationId ? "Selected location" : "All Locations"}</span></div>
        <div className="ich-hero-actions"><Link className="ich-primary-action" href="/vehicles/workflows"><Play size={16} />Start Workflow</Link><details className="ich-saved-view-menu"><summary>Saved Views</summary><div><InventoryConsoleSavedViews activeId={data.activeSavedViewId} activeView={data.savedView} canShare={data.canShareSavedViews} locationId={data.locationId} savedViews={data.savedViews} /></div></details><Link href="/reports?scope=inventory"><Download size={16} />Reports &amp; Exports</Link></div>
      </header>

      {data.freshness !== "LIVE" ? <div className={`ich-data-state ich-data-${data.freshness.toLowerCase()}`} role="status">
        <Database size={15} /><strong>{freshnessLabel}</strong><span>{data.generatedAt ? `Cutoff ${new Date(data.generatedAt).toLocaleString()}` : data.error ?? "No authoritative snapshot is available."}</span>
      </div> : null}

      <form action="/vehicles" className="ich-scope-bar" method="get">
        <label>Location<select defaultValue={data.locationId ?? ""} name="locationId"><option value="">All Locations</option>{data.byLocation.map((location) => <option key={location.locationId} value={location.locationId}>{location.name} ({location.count})</option>)}</select></label>
        <label>Owner<select disabled><option>All Owners</option></select></label><label>Date<select disabled><option>{data.generatedAt ? new Date(data.generatedAt).toLocaleDateString() : "Current operating window"}</option></select></label>
        <button className="sr-only" type="submit">Apply filters</button><Link className="sr-only" href="/vehicles">Clear filters</Link><span className="sr-only">{data.generatedAt ? `Live · updated ${new Date(data.generatedAt).toLocaleTimeString()}` : "Authoritative data unavailable"}</span>
      </form>
      {data.savedViewNotice ? <p className="ich-view-notice" role="status">{data.savedViewNotice}</p> : null}

      <section aria-label="Inventory Console KPIs" className="ich-kpis">
        <article><i className="blue"><CarFront /></i><span>Active Inventory<strong>{data.freshness === "UNAVAILABLE" ? "—" : data.totals.active}</strong><small>Current permitted scope</small></span><ChevronRight /></article>
        <article><i className="green"><CircleDollarSign /></i><span>Inventory Capital<strong>{data.freshness === "UNAVAILABLE" ? "—" : money(data.totals.exposureCents)}</strong><small>Recorded non-void exposure</small></span><ChevronRight /></article>
        <article><i className="purple"><Clock3 /></i><span>Aged Exposure<strong>{data.freshness === "UNAVAILABLE" ? "—" : money(data.totals.agedExposureCents)}</strong><small>Recorded 31+ day exposure</small></span><ChevronRight /></article>
        <article className={attention ? "attention" : ""}><i className="orange"><AlertTriangle /></i><span>Needs Attention<strong>{data.freshness === "UNAVAILABLE" ? "—" : attention}</strong><small>{data.totals.blocked} blocked · {data.totals.overdue} overdue · {data.totals.waiting} waiting</small></span><ChevronRight /></article>
        <article><i className="blue"><Wrench /></i><span>In Shop<strong>{data.operational?.shop.active ?? "—"}</strong><small>{data.operational ? `${data.operational.shop.blocked} blocked repair orders` : "Shop facts unavailable"}</small></span><ChevronRight /></article>
        <article><i className="orange"><Gift /></i><span>Waiting on Parts<strong>{data.operational?.parts.waitingDemands ?? "—"}</strong><small>{data.operational ? `${data.operational.parts.unreservedUnits} units not reserved` : "Parts facts unavailable"}</small></span><ChevronRight /></article>
      </section>

      <section className="ich-route-grid">
        <article className="ich-route-card">
          <header><div><strong>Inventory Lifecycle</strong><span>Move every unit from acquisition to frontline readiness.</span></div><em>{lifecycleTarget}% within stage target</em></header>
          <div className="ich-stage-strip">{groupedLifecycle.map((stage) => <Link href={`/vehicles/inventory?stage=${encodeURIComponent(stage.stage)}`} key={stage.label}><stage.Icon /><span>{stage.label}</span><strong>{stage.count}</strong><i /></Link>)}</div>
          <footer><Link className="primary" href="/vehicles/inventory">Open Inventory Lifecycle</Link><Link href="/vehicles/inventory/units">All Vehicles</Link><Link href="/vehicles/acquisition-appraisal">Acquisition</Link><Link className="outline" href="/vehicles/disposition-wholesale">Open Disposition &amp; Wholesale <b>{data.reviews.items.filter((item) => item.domain === "DISPOSITION_WHOLESALE").length}</b></Link><Link href="/vehicles/control-tower">Aging</Link></footer>
        </article>
        <article className="ich-route-card">
          <header><div><strong>Shop &amp; Recon</strong><span>Manage production, capacity, parts, and completion risk.</span></div>{shopTarget === null ? null : <em>{shopTarget}% projected on time</em>}</header>
          <p className="ich-shop-facts"><Wrench />Inventory Recon&nbsp; <strong>{data.operational?.shop.active ?? "—"}</strong><span>•</span><CarFront />Customer Repair&nbsp; <strong>—</strong></p>
          <div className="ich-stage-strip ich-shop-strip">{shopStages.map(([label, value, Icon]) => <Link href="/vehicles/shop-recon" key={label}><Icon /><span>{label}</span><strong>{value}</strong><i /></Link>)}</div>
          <footer><Link className="primary" href="/vehicles/shop-recon">Open Shop &amp; Recon</Link><Link href="/vehicles/repair-orders">Repair Orders</Link><Link className="outline" href="/vehicles/parts-operations">Open Parts Operations</Link><Link href="/vehicles/shop-dispatch">Shop Dispatch</Link><Link href="/vehicles/quality-control">Quality Control</Link></footer>
        </article>
      </section>

      <div className="ich-work-grid">
        <section className="ich-panel ich-priority"><header><strong>Priority Work</strong></header>
          <nav aria-label="Priority Work views"><Link className={data.savedView === "MY" ? "active" : ""} href="/vehicles?view=MY">My Work</Link><Link className={data.savedView === "ALL" ? "active" : ""} href="/vehicles?view=ALL">Team</Link><Link className={data.savedView === "BLOCKED" || data.savedView === "OVERDUE" ? "active" : ""} href="/vehicles?view=BLOCKED">Exceptions</Link></nav>
          <div className="ich-priority-head"><span>Vehicle</span><span>Current Stage</span><span>Issue</span><span>Owner</span><span>Age / Due</span><span>Next Action</span></div>{data.priorityWork.length ? <ol className="ich-priority-list">{data.priorityWork.slice(0, 6).map((item) => <li key={item.id}><div className="vehicle"><CarFront /><span><strong>{item.vehicle}</strong><small>Stock # {item.inventoryNumber}</small></span></div><span className={`stage ${item.tier === "P0" ? "critical" : item.tier === "P1" ? "warning" : "neutral"}`}>{item.state.replaceAll("_", " ")}</span><div><span>{item.issue}</span><small>{item.reasonCode}</small></div><div className="owner"><i>{item.owner.split(" ").map((part) => part[0]).join("").slice(0, 2)}</i><span>{item.owner}</span></div><div className="due"><span>{item.ageDays}d</span><small className={item.overdue ? "overdue" : "risk"}>{item.overdue ? "Overdue" : `Due ${new Date(item.dueAt).toLocaleDateString()}`}</small></div><Link href={`/vehicles/control-tower?inventoryUnitId=${encodeURIComponent(item.id)}&returnTo=${encodeURIComponent(`/vehicles?view=${data.savedView}`)}`}>{item.nextAction}<ChevronRight /></Link></li>)}</ol> : <div className="ich-empty"><CheckCircle2 size={20} /><span>No priority work matches this authorized view.</span></div>}
          <Link className="ich-view-all" href="/vehicles?view=ALL">View all my work <ArrowRight /></Link>
        </section>

        <section className="ich-panel ich-decisions"><header><strong>Reviews &amp; Approvals</strong></header>
          {data.reviews.available ? <><nav aria-label="Decision views"><Link className="active" href="/manager-review?scope=inventory&view=reviews">Reviews <b>{data.reviews.reviews}</b></Link><Link href="/manager-review?scope=inventory&view=approvals">Approvals <b>{data.reviews.approvals}</b></Link></nav><div className="ich-decision-head"><span>Item</span><span>Owner</span><span>Age</span><span>Amount</span><span>Action</span></div><ol>{data.reviews.items.slice(0, 5).map((item) => <li key={item.id}><i>{item.kind === "APPROVAL" ? <ShieldCheck /> : <ClipboardList />}</i><div><strong>{item.title}</strong><small>{item.subject}</small></div><span className="owner"><i>{item.owner.split(" ").map((part) => part[0]).join("").slice(0, 2)}</i>{item.owner}</span><span className={item.overdue ? "overdue" : ""}>{item.ageHours < 24 ? `${item.ageHours}h` : `${Math.floor(item.ageHours / 24)}d`}</span><span>{item.amountCents == null ? "—" : money(item.amountCents)}</span><Link href={item.actionHref}>{item.kind === "APPROVAL" ? "Approve" : "Review"}</Link></li>)}{!data.reviews.items.length ? <li className="empty"><CheckCircle2 />No reviews or approvals in this permitted scope.</li> : null}</ol><Link className="ich-view-all" href="/manager-review?scope=inventory&view=reviews">View all reviews &amp; approvals <ArrowRight /></Link></> : <div className="ich-unavailable"><ShieldCheck size={18} /><span>Your current role cannot view enterprise decision counts.</span></div>}
        </section>
      </div>

      <section className="ich-health-grid">
        <article className="ich-flow-health"><strong>Flow Health</strong><span>Inventory Lifecycle</span><i><b style={{ width: data.freshness === "LIVE" ? "88%" : "42%" }} /></i><em className={data.freshness === "LIVE" ? "healthy" : "warning"}>{freshnessLabel}</em><span>Shop &amp; Recon</span><i><b style={{ width: data.operational ? `${Math.max(12, 100 - Math.min(88, data.operational.shop.blocked * 8))}%` : "12%" }} /></i><em className={data.operational ? "healthy" : "warning"}>{data.operational ? "Connected" : "Unavailable"}</em></article>
        <article className="ich-throughput"><strong>Today&apos;s Throughput</strong><div><span><b style={{ height: `${Math.max(8, Math.min(100, (data.operational?.throughput.inventoryTransitions ?? 0) * 8))}%` }} /></span><span><b style={{ height: `${Math.max(8, Math.min(100, (data.operational?.throughput.repairOrdersClosed ?? 0) * 8))}%` }} /></span></div><small>Inventory transitions <strong>{data.operational?.throughput.inventoryTransitions ?? "—"}</strong></small><small>Repair orders closed <strong>{data.operational?.throughput.repairOrdersClosed ?? "—"}</strong></small></article>
        <article className="ich-integration-health"><strong>Data &amp; Integration Health</strong><span>Inventory projection</span><b className={data.freshness === "LIVE" ? "healthy" : "warning"}>{data.freshness}</b><span>Shop operations</span><b className={data.operational ? "healthy" : "warning"}>{data.operational ? "CONNECTED" : "UNAVAILABLE"}</b><span>Parts readiness</span><b className={data.operational ? "healthy" : "warning"}>{data.operational ? "CONNECTED" : "UNAVAILABLE"}</b><span>Provider-neutral exchanges</span><b className={data.operational?.integration.status === "HEALTHY" ? "healthy" : data.operational?.integration.status === "ATTENTION" ? "warning" : ""}>{data.operational ? `${data.operational.integration.status} · ${data.operational.integration.exceptions} exceptions` : "UNAVAILABLE"}</b></article>
      </section>

      <footer className="ich-footer"><Link href="/activity?scope=inventory"><History size={15} />View Event Log</Link><span>Mockup values are never used as operational facts.</span></footer>
    </section>
  );
}
