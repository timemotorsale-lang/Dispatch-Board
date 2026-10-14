import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CarFront,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  FileCheck2,
  Handshake,
  Inbox,
  Gauge,
  MessageSquareText,
  Plus,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  Truck,
  Wrench,
} from "lucide-react";
import Link from "next/link";

import { getTimeAwareGreeting } from "@/lib/time-aware-greeting";
import type { InventoryConsoleOperationalFacts } from "@/server/inventory-console-home";
import type { InventoryPriorityWorkItem } from "@/server/inventory-console-home/priority-work";
import type {
  InventoryConsoleSavedViewModel,
  InventoryConsoleWorkView,
} from "@/server/inventory-console-saved-views";

import { InventoryConsoleSavedViews } from "./inventory-console-saved-views";
import { InventorySavedViewsMenu } from "./inventory-saved-views-menu";
import styles from "./inventory-manager-home.module.css";

export type InventoryHomeData = {
  byLocation: Array<{ count: number; locationId: string; name: string }>;
  byStage: Array<{
    averageStageAgeDays?: number | null;
    blocked?: number;
    count: number;
    label: string;
    overdue?: number;
    stage: string;
  }>;
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
  reviews: {
    approvals: number;
    reviews: number;
    available: boolean;
    items: Array<{
      actionHref: string;
      actionLabel: string;
      ageHours: number;
      amountCents: number | null;
      domain: string;
      id: string;
      kind: "REVIEW" | "APPROVAL";
      overdue: boolean;
      owner: string;
      state: string;
      subject: string;
      title: string;
    }>;
  };
  totals: {
    active: number;
    agedExposureCents: number;
    blocked: number;
    exposureCents: number;
    overdue: number;
    waiting: number;
  };
};

const HOME = "/vehicles?workspace=inventory";
const MY_WORKDAY = "/vehicles?workspace=vehicle-operations-lead";

const lifecycleGroups = [
  { label: "Acquired", stages: ["PURCHASED_OR_TRADE_IN"], Icon: Handshake },
  { label: "Received", stages: ["TRANSPORTATION", "RECEIVED"], Icon: Truck },
  { label: "Inspection", stages: ["INSPECTION"], Icon: Search },
  { label: "Recon", stages: ["RECONDITIONING", "TITLE_DOCUMENT_READINESS"], Icon: Wrench },
  { label: "Merchandising", stages: ["PHOTOGRAPHY_MERCHANDISING"], Icon: Sparkles },
  { label: "Frontline Ready", stages: ["FRONTLINE_READY", "RESERVED_DEAL_PENDING"], Icon: FileCheck2 },
  { label: "Sold / Disposition", stages: ["SOLD", "DELIVERED", "WHOLESALED_OR_OTHER_DISPOSITION"], Icon: CarFront },
] as const;

function formatStage(value: string) {
  return value
    .toLocaleLowerCase()
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toLocaleUpperCase());
}

function date(value: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(value));
}

function money(cents: number) {
  return new Intl.NumberFormat("en-US", { currency: "USD", maximumFractionDigits: 0, style: "currency" }).format(cents / 100);
}

function inventoryHref(view: InventoryConsoleWorkView, highVolume = false) {
  return `/vehicles?${new URLSearchParams({ workspace: "inventory", view, ...(highVolume ? { mode: "volume" } : {}) })}`;
}

export function InventoryConsoleHome({
  data,
  highVolume = false,
  showMyWorkdayReturn = false,
  userName = "Inventory Manager",
}: {
  data: InventoryHomeData;
  highVolume?: boolean;
  showMyWorkdayReturn?: boolean;
  userName?: string;
}) {
  const home = highVolume ? "/vehicles?workspace=inventory&mode=volume" : HOME;
  const reference = data.generatedAt ? new Date(data.generatedAt) : null;
  const dueToday = reference
    ? data.priorityWork.filter((item) => new Date(item.dueAt).toDateString() === reference.toDateString()).length
    : 0;
  const groupedLifecycle = lifecycleGroups.map((group) => {
    const stages = data.byStage.filter((item) => (group.stages as readonly string[]).includes(item.stage));
    const count = stages.reduce((sum, item) => sum + item.count, 0);
    const averageDays = count
      ? stages.reduce((sum, item) => sum + (item.averageStageAgeDays ?? 0) * item.count, 0) / count
      : 0;
    return {
      ...group,
      averageDays,
      blocked: stages.reduce((sum, item) => sum + (item.blocked ?? 0), 0),
      count,
      overdue: stages.reduce((sum, item) => sum + (item.overdue ?? 0), 0),
      stage: group.stages[0],
    };
  });
  const frontlineReady = groupedLifecycle.find((item) => item.label === "Frontline Ready")?.count ?? 0;
  const inboxItems = [
    ...data.reviews.items.slice(0, 3).map((item) => ({
      href: item.actionHref,
      id: `review-${item.id}`,
      label: item.kind === "APPROVAL" ? "Approval" : "Review",
      meta: `${item.owner} · ${item.ageHours < 24 ? `${item.ageHours}h` : `${Math.floor(item.ageHours / 24)}d`} waiting`,
      title: item.title,
      tone: item.overdue ? "urgent" : "decision",
    })),
    ...(data.operational?.parts.waitingDemands
      ? [{ href: `/vehicles/parts-operations?${new URLSearchParams({ returnTo: home, returnLabel: "Back to Inventory Manager" })}`, id: "parts", label: "Parts", meta: `${data.operational.parts.unreservedUnits} unreserved unit(s)`, title: `${data.operational.parts.waitingDemands} parts constraint(s) need coordination`, tone: "dependency" }]
      : []),
    ...(data.operational?.shop.blocked
      ? [{ href: `/vehicles/recon-repair-advisor?${new URLSearchParams({ returnTo: home })}`, id: "shop", label: "Recon / Repair", meta: "Cross-team dependency", title: `${data.operational.shop.blocked} repair blocker(s) affecting flow`, tone: "urgent" }]
      : []),
  ].slice(0, 4);
  const greeting = getTimeAwareGreeting(userName);

  return (
    <section className={`${styles.home} ${highVolume ? styles.highVolume : ""}`}>
      <header className={styles.hero}>
        <div>
          {showMyWorkdayReturn ? <Link className={styles.back} href={MY_WORKDAY}><ArrowLeft />Back to My Workday</Link> : null}
          <p>Inventory Manager Workspace</p>
          <h1>{greeting} Keep inventory moving.</h1>
          <span>See the exceptions, make the decision, and move the vehicle forward.</span>
        </div>
        <div className={styles.heroActions}>
          <Link className={styles.primary} href={`/vehicles/workflows/add-vehicle?returnTo=${encodeURIComponent(home)}`}><Plus />Add / receive vehicle</Link>
          <Link href="/vehicles/registry"><Search />Find vehicle</Link>
        </div>
      </header>

      <nav aria-label="Inventory Manager workspace navigation" className={styles.nav}>
        {showMyWorkdayReturn ? <Link href={MY_WORKDAY}>My Workday</Link> : null}
        <Link aria-current="page" href={home}>Inventory Manager</Link>
        <Link href="/vehicles/inventory">Lifecycle</Link>
        <a href="#inventory-inbox">Inbox <b>{inboxItems.length}</b></a>
        <Link href="/manager-review?scope=inventory">Approvals <b>{data.reviews.approvals}</b></Link>
        <div aria-label="Inventory Manager display mode" className={styles.modeSwitch} role="group"><Link aria-current={!highVolume ? "page" : undefined} href={HOME}>Calm</Link><Link aria-current={highVolume ? "page" : undefined} href="/vehicles?workspace=inventory&amp;mode=volume">High volume</Link></div>
      </nav>

      <form action="/vehicles/registry" className={styles.search} method="get">
        <Search />
        <label className="sr-only" htmlFor="inventory-manager-search">Find inventory</label>
        <input id="inventory-manager-search" name="q" placeholder="Find stock #, VIN, vehicle, or owner" />
        <button type="submit">Find vehicle <ArrowRight /></button>
      </form>

      {data.freshness !== "LIVE" ? <div className={styles.dataState} role="status"><AlertTriangle /><strong>{data.freshness === "STALE" ? "Inventory data may be delayed" : "Inventory workspace unavailable"}</strong><span>{data.error ?? "Verify the source record before acting."}</span></div> : null}
      {data.savedViewNotice ? <p className={styles.notice} role="status">{data.savedViewNotice}</p> : null}

      <section aria-label="Inventory pulse" className={styles.metrics}>
        <Link href="/vehicles/inventory/units"><CarFront /><span>Active inventory<strong>{data.freshness === "UNAVAILABLE" ? "—" : data.totals.active}</strong><small>Vehicles in current scope</small></span><ChevronRight /></Link>
        <Link className={data.priorityWork.length ? styles.attention : ""} href={inventoryHref("ATTENTION", highVolume)}><AlertTriangle /><span>Needs attention<strong>{data.freshness === "UNAVAILABLE" ? "—" : data.priorityWork.length}</strong><small>Unique exceptions in this view</small></span><ChevronRight /></Link>
        <Link className={data.totals.overdue ? styles.attention : ""} href={inventoryHref("OVERDUE", highVolume)}><Clock3 /><span>Overdue<strong>{data.freshness === "UNAVAILABLE" ? "—" : data.totals.overdue}</strong><small>Past the current stage target</small></span><ChevronRight /></Link>
        <Link href="/vehicles/inventory?stage=FRONTLINE_READY"><FileCheck2 /><span>Frontline ready<strong>{data.freshness === "UNAVAILABLE" ? "—" : frontlineReady}</strong><small>Available for the next handoff</small></span><ChevronRight /></Link>
        {highVolume ? <><Link className={data.totals.blocked ? styles.attention : ""} href={inventoryHref("BLOCKED", true)}><ShieldCheck /><span>Blocked<strong>{data.totals.blocked}</strong><small>Requires direct intervention</small></span><ChevronRight /></Link><Link href={inventoryHref("ATTENTION", true)}><Gauge /><span>Waiting<strong>{data.totals.waiting}</strong><small>Dependent on another owner</small></span><ChevronRight /></Link><Link href="/vehicles/control-tower"><CircleDollarSign /><span>Capital exposure<strong>{money(data.totals.exposureCents)}</strong><small>Recorded active inventory value</small></span><ChevronRight /></Link></> : null}
      </section>

      <div className={styles.mainGrid}>
        <section className={styles.queue}>
          <header><div><p>Execution queue</p><h2>What needs attention</h2><span>Highest-risk inventory appears first.</span></div><b>{highVolume ? "High-volume view" : "Calm view"}</b></header>
          <nav aria-label="Inventory exception views">
            {(["MY", "ATTENTION", "BLOCKED", "OVERDUE", "ALL"] as const).map((view) => <Link aria-current={data.savedView === view ? "page" : undefined} href={inventoryHref(view, highVolume)} key={view}>{view === "MY" ? "My priorities" : view === "ATTENTION" ? "Needs attention" : view.charAt(0) + view.slice(1).toLocaleLowerCase()}</Link>)}
          </nav>
          {data.priorityWork.length ? <ol>{data.priorityWork.slice(0, highVolume ? 16 : 7).map((item, index) => <PriorityRow index={index} item={item} key={item.id} returnTo={home} />)}</ol> : <div className={styles.empty}><CheckCircle2 /><div><strong>No inventory exceptions in this view.</strong><span>Normal work remains available in the lifecycle workspace.</span></div></div>}
          <Link className={styles.textLink} href="/vehicles/control-tower">Open full inventory control tower <ArrowRight /></Link>
        </section>

        <aside className={styles.rail}>
          <section>
            <header><div><p>Today</p><h2>Daily flow brief</h2></div><Clock3 /></header>
            <Link href={inventoryHref("OVERDUE", highVolume)}><span><strong>{data.totals.overdue}</strong> overdue</span><small>Recover missed stage targets</small><ChevronRight /></Link>
            <Link href="/manager-review?scope=inventory"><span><strong>{data.reviews.approvals}</strong> approvals</span><small>Decisions waiting for authority</small><ChevronRight /></Link>
            <Link href={`/vehicles/parts-operations?${new URLSearchParams({ returnTo: home })}`}><span><strong>{data.operational?.parts.waitingDemands ?? 0}</strong> parts constraints</span><small>Confirm availability or ETA</small><ChevronRight /></Link>
            <Link href={inventoryHref("ATTENTION", highVolume)}><span><strong>{dueToday}</strong> due today</span><small>Protect today&apos;s flow</small><ChevronRight /></Link>
          </section>

          <section id="inventory-inbox" className={styles.inbox}>
            <header><div><p>Operational inbox</p><h2>Handoffs and decisions</h2></div><Inbox /></header>
            {inboxItems.length ? inboxItems.map((item) => <Link href={item.href} key={item.id}><i className={styles[item.tone]}><MessageSquareText /></i><span><small>{item.label}</small><strong>{item.title}</strong><em>{item.meta}</em></span><ChevronRight /></Link>) : <div className={styles.inboxClear}><CheckCircle2 />No inventory handoffs need a response.</div>}
          </section>
        </aside>
      </div>

      <section className={styles.lifecycle}>
        <header><div><p>Flow visibility</p><h2>Inventory lifecycle</h2><span>Select a stage to work only the vehicles inside it.</span></div><Link href="/vehicles/inventory">Open full lifecycle <ArrowRight /></Link></header>
        <div>{groupedLifecycle.map((stage) => <Link className={stage.blocked || stage.overdue ? styles.stageRisk : ""} href={`/vehicles/inventory?${new URLSearchParams({ stage: stage.stage, returnTo: home })}`} key={stage.label}><stage.Icon /><span><strong>{stage.label}</strong><small>{stage.averageDays ? `${stage.averageDays.toFixed(1)} average days` : "No active stage time"}</small></span><b>{stage.count}</b>{stage.blocked || stage.overdue ? <em>{stage.blocked ? `${stage.blocked} blocked` : `${stage.overdue} overdue`}</em> : <em>On flow</em>}</Link>)}</div>
      </section>

      {highVolume ? <section aria-label="High-volume operating signals" className={styles.volumeSignals}><header><div><p>Expanded operations</p><h2>High-volume signals</h2><span>Cross-team capacity and throughput remain visible while the queue stays actionable.</span></div></header><div><Link href="/vehicles/recon-repair-advisor"><Wrench /><span>Recon / repair<strong>{data.operational?.shop.active ?? "—"}</strong><small>{data.operational?.shop.blocked ?? 0} blocked</small></span></Link><Link href={`/vehicles/parts-operations?${new URLSearchParams({ returnTo: home })}`}><Truck /><span>Parts demand<strong>{data.operational?.parts.waitingDemands ?? "—"}</strong><small>{data.operational?.parts.unreservedUnits ?? 0} unreserved</small></span></Link><Link href="/manager-review?scope=inventory"><ShieldCheck /><span>Decisions<strong>{data.reviews.approvals + data.reviews.reviews}</strong><small>Approvals and reviews</small></span></Link><Link href="/activity?scope=inventory"><Gauge /><span>24-hour flow<strong>{data.operational?.throughput.inventoryTransitions ?? "—"}</strong><small>Inventory transitions</small></span></Link></div></section> : null}

      <details className={styles.tools}>
        <summary><span><Settings2 /><b>More inventory tools</b><small>Planning, analysis, disposition, saved views, reports, and audit history.</small></span><strong>Show tools</strong></summary>
        <div>
          <Link href="/vehicles/acquisition-appraisal">Acquisition &amp; appraisal</Link>
          <Link href="/vehicles/control-tower">Aging &amp; cost exposure</Link>
          <Link href="/vehicles/disposition-wholesale">Disposition &amp; wholesale</Link>
          <Link href="/vehicles/recon-repair-advisor">Recon / Repair Advisor</Link>
          <Link href="/vehicles/parts-operations">Parts operations</Link>
          <Link href="/vehicles/reports">Reports &amp; exports</Link>
          <Link href="/activity?scope=inventory">Inventory event history</Link>
          <InventorySavedViewsMenu><InventoryConsoleSavedViews activeId={data.activeSavedViewId} activeView={data.savedView} canShare={data.canShareSavedViews} locationId={data.locationId} mode={highVolume ? "volume" : undefined} savedViews={data.savedViews} workspace="inventory" /></InventorySavedViewsMenu>
        </div>
      </details>

      <footer className={styles.safeguard}><ShieldCheck /><span><strong>Role protection stays active.</strong> Inventory actions retain their source ownership, permissions, and return path.</span></footer>
    </section>
  );
}

function PriorityRow({ index, item, returnTo }: { index: number; item: InventoryPriorityWorkItem; returnTo: string }) {
  return (
    <li>
      <span className={styles.rank}>{index + 1}</span>
      <div className={styles.vehicle}><CarFront /><span><strong>{item.vehicle}</strong><small>Stock # {item.inventoryNumber}</small></span></div>
      <div className={styles.issue}><span><b className={styles[item.tier.toLocaleLowerCase()]}>{item.reasonCode}</b>{formatStage(item.lifecycleStage)}</span><strong>{item.issue}</strong><small>{item.owner} · {item.ageDays} days in inventory · {item.overdue ? "Overdue" : `Due ${date(item.dueAt)}`}</small></div>
      <Link href={`/vehicles/control-tower?${new URLSearchParams({ inventoryUnitId: item.id, returnTo })}`}><span>{item.nextAction}</span><ArrowRight /></Link>
    </li>
  );
}
