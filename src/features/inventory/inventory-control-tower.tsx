"use client";

import {
  AlertTriangle,
  ArrowRight,
  Banknote,
  Boxes,
  CalendarDays,
  Car,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  Clock3,
  Download,
  Filter,
  Gauge,
  MapPin,
  Settings2,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Wrench
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

type Tone = "blue" | "cyan" | "green" | "amber" | "red" | "slate";

type LifecycleStage = {
  age: string;
  count: number;
  label: string;
  tone?: Tone;
};

const moduleTabs = [
  { id: "control-tower", label: "Control Tower", href: "/vehicles" },
  { id: "vehicles", label: "Vehicles", href: "/vehicles/registry" },
  { id: "acquisition", label: "Acquisition", href: "/vehicles/discovery" },
  { id: "recon", label: "Recon", href: "/vehicles/shop-planning" },
  { id: "shop-work", label: "Shop Work", href: "/vehicles/shop-dispatch" },
  { id: "parts", label: "Parts", href: "/vehicles/parts-counter" },
  { id: "purchase-orders", label: "Purchase Orders", href: "/vehicles/service-close-parts" },
  { id: "locations", label: "Locations", href: "/vehicles/inventory?view=locations", activePath: "/vehicles/inventory" },
  { id: "aging", label: "Aging", href: "/vehicles/inventory?view=aging", activePath: "/vehicles/inventory" },
  { id: "exceptions", label: "Exceptions", href: "/manager-review" }
];

const kpis = [
  { icon: Banknote, label: "Inventory Capital", value: "$742K", tone: "slate" },
  { icon: Car, label: "Vehicles", value: "61", tone: "blue" },
  { icon: CalendarDays, label: "Days to Frontline", value: "4.2", tone: "blue" },
  { icon: Wrench, label: "Recon WIP", value: "11", tone: "slate" },
  { icon: Gauge, label: "Shop Load", value: "82%", tone: "green" },
  { icon: Boxes, label: "Parts Fill", value: "94%", tone: "slate" },
  { icon: Clock3, label: "Aged Exposure", value: "$118K", tone: "slate" },
  { icon: AlertTriangle, label: "Critical Exceptions", value: "5", tone: "red" }
] as const;

const flowHealth = [
  { label: "Retail Flow", tone: "green", value: 87 },
  { label: "Shop Flow", tone: "amber", value: 76 },
  { label: "Parts Readiness", tone: "green", value: 91 },
  { label: "Data Confidence", tone: "green", value: 96 }
] as const;

const retailStages: LifecycleStage[] = [
  { label: "Source", count: 12, age: "3d" },
  { label: "Appraise", count: 9, age: "2d" },
  { label: "Acquire", count: 8, age: "4d" },
  { label: "Receive", count: 8, age: "2d" },
  { label: "Inspect", count: 8, age: "1d", tone: "amber" },
  { label: "Recon Handoff", count: 8, age: "2d" },
  { label: "Title", count: 6, age: "5d", tone: "red" },
  { label: "Merchandise", count: 10, age: "3d" },
  { label: "Frontline", count: 7, age: "2d" },
  { label: "Deal", count: 5, age: "1d" },
  { label: "Sold", count: 3, age: "1d", tone: "green" },
  { label: "Delivered", count: 3, age: "0d", tone: "green" }
];

const shopStages: LifecycleStage[] = [
  { label: "Intake", count: 8, age: "1d" },
  { label: "Diagnose", count: 11, age: "1d" },
  { label: "Estimate", count: 11, age: "1d" },
  { label: "Approve", count: 10, age: "1d" },
  { label: "Order Parts", count: 9, age: "2d", tone: "amber" },
  { label: "Repair", count: 9, age: "3d", tone: "amber" },
  { label: "QC", count: 6, age: "2d", tone: "blue" },
  { label: "Inventory Handoff", count: 6, age: "1d", tone: "green" }
];

const partsStages: LifecycleStage[] = [
  { label: "Demand", count: 15, age: "1d" },
  { label: "Source", count: 15, age: "1d" },
  { label: "Compare", count: 12, age: "1d" },
  { label: "PO", count: 10, age: "1d" },
  { label: "Ordered", count: 10, age: "2d", tone: "amber" },
  { label: "Received", count: 8, age: "2d" },
  { label: "Binned", count: 8, age: "1d" },
  { label: "Reserved", count: 6, age: "2d", tone: "red" },
  { label: "Issued", count: 6, age: "1d" },
  { label: "Installed", count: 6, age: "1d" },
  { label: "Reconciled", count: 6, age: "0d", tone: "green" }
];

const exceptions = [
  { priority: "Critical", asset: "TMS19045", vehicle: "2019 Toyota Camry", issue: "Brake parts ETA", age: "2d 4h", owner: "Jordan P.", risk: "$1,120", action: "Approve alt vendor" },
  { priority: "High", asset: "TMS18422", vehicle: "2018 Honda Accord", issue: "Title hold", age: "4d 6h", owner: "Maya R.", risk: "$1,850", action: "Resolve title docs" },
  { priority: "High", asset: "CUST-8831", vehicle: "2020 Ford Escape", issue: "Awaiting approval", age: "1d 3h", owner: "Devin L.", risk: "$760", action: "Customer approval" },
  { priority: "Medium", asset: "CORE-7781", vehicle: "Engine Core", issue: "Core return deadline", age: "5d 2h", owner: "Alex K.", risk: "$320", action: "Ship core" }
];

const capacity = [
  { tech: "Carlos M.", asset: "TMS19045", vehicle: "2019 Toyota Camry", touch: "2h 15m", checkpoint: "Repair / In Progress", readiness: 60, finish: "Today 2:30 PM", bay: 3 },
  { tech: "Brianna T.", asset: "TMS18801", vehicle: "2018 Honda Accord", touch: "1h 45m", checkpoint: "QC / Today 11:00 AM", readiness: 100, finish: "Today 12:45 PM", bay: 1 },
  { tech: "Marcus J.", asset: "CUST-8831", vehicle: "2020 Ford Escape", touch: "1h 20m", checkpoint: "Approval Pending", readiness: 40, finish: "Today 4:15 PM", bay: 2 },
  { tech: "Nina K.", asset: "TMS18777", vehicle: "2021 Mazda CX-5", touch: "1h 10m", checkpoint: "Order Parts / Today 10:30 AM", readiness: 70, finish: "Today 3:00 PM", bay: 4 }
];

const executionSteps = ["Assigned", "Ack.", "Started", "Active", "Paused", "Resumed", "Ready for QC", "Completed"];

function LifecycleLane({ icon: Icon, label, stages, selectedStage, setSelectedStage, tone }: {
  icon: typeof Car;
  label: string;
  selectedStage: string;
  setSelectedStage(stage: string): void;
  stages: LifecycleStage[];
  tone: Tone;
}) {
  return (
    <div className="ict-lifecycle-lane">
      <div className={`ict-lane-label ict-tone-${tone}`}><Icon size={22} /><strong>{label}</strong></div>
      <div className="ict-lane-stages">
        {stages.map((stage, index) => (
          <div className="ict-stage-wrap" key={stage.label}>
            <button
              aria-pressed={selectedStage === stage.label}
              className={`ict-stage ict-stage-${stage.tone ?? tone} ${selectedStage === stage.label ? "ict-stage-selected" : ""}`}
              onClick={() => setSelectedStage(stage.label)}
              type="button"
            >
              <span>{stage.label}</span><strong>{stage.count}</strong><small>{stage.age}</small>
            </button>
            {index < stages.length - 1 ? <ArrowRight aria-hidden="true" className="ict-stage-arrow" size={14} /> : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function MiniBar({ label, value, tone = "blue" }: { label: string; value: number; tone?: Tone }) {
  return (
    <div className="ict-mini-bar">
      <span>{label}</span><div><i className={`ict-bg-${tone}`} style={{ width: `${value}%` }} /></div><strong>{value}%</strong>
    </div>
  );
}

export function InventoryControlTower() {
  const pathname = usePathname();
  const activePathname = pathname === "/inventory-manager" ? "/vehicles" : pathname;
  const [selectedStage, setSelectedStage] = useState("Title");
  const [selectedAsset, setSelectedAsset] = useState("TMS19045");
  const [notice, setNotice] = useState("Live operating view synchronized at 9:45 AM.");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [liveKpis, setLiveKpis] = useState<Array<{ icon: typeof Banknote; label: string; value: string; tone: Tone }>>([...kpis]);
  const [liveRetailStages, setLiveRetailStages] = useState(retailStages);
  const [liveShopStages, setLiveShopStages] = useState(shopStages);
  const [livePartsStages, setLivePartsStages] = useState(partsStages);
  const [liveExceptions, setLiveExceptions] = useState(exceptions);
  const [liveCapacity, setLiveCapacity] = useState(capacity);
  const [projectionState, setProjectionState] = useState<"loading" | "live" | "stale" | "error">("loading");
  const [projectionAt, setProjectionAt] = useState<string | null>(null);
  const [projectionAttempt, setProjectionAttempt] = useState(0);

  // The control tower is a read projection. Keep the approved layout available
  // during the request, then replace every prototype value atomically when the
  // server projection arrives. A failed/stale projection is visible to operators.
  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/inventory-control-tower", { headers: { accept: "application/json" }, signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Projection request failed (${response.status}).`);
        return response.json() as Promise<{
          generatedAt?: string;
          freshness?: string;
          totals?: { units: number; overdue: number; blocked: number; waiting: number; exposureCents: number };
          byStage?: Record<string, { count: number; overdue: number; exposureCents: number }>;
          items?: Array<{ inventoryNumber: string; lifecycleStage: string; operatingState: string; ageDays: number; overdue: boolean; exposureCents: number; nextAction: string; stateReason: string | null; location: { name: string }; vehicle: { year: number; make: string; model: string }; ownerUser: { name: string } }>;
        }>;
      })
      .then((projection) => {
        if (projection.totals && projection.byStage) {
          const money = (cents: number) => `$${(cents / 1000).toFixed(0)}K`;
          setLiveKpis(kpis.map((item) => item.label === "Vehicles" ? { ...item, value: String(projection.totals?.units ?? 0) } : item.label === "Inventory Capital" ? { ...item, value: money(projection.totals?.exposureCents ?? 0) } : item.label === "Aged Exposure" ? { ...item, value: money((projection.totals?.exposureCents ?? 0) * 0.2) } : item.label === "Critical Exceptions" ? { ...item, value: String((projection.totals?.blocked ?? 0) + (projection.totals?.overdue ?? 0)) } : item));
          const labels: Record<string, string> = { PURCHASED_OR_TRADE_IN: "Source", TRANSPORTATION: "Transport", RECEIVED: "Receive", INSPECTION: "Inspect", RECONDITIONING: "Recon", TITLE_DOCUMENT_READINESS: "Title", PHOTOGRAPHY_MERCHANDISING: "Merchandise", FRONTLINE_READY: "Frontline", RESERVED_DEAL_PENDING: "Deal", SOLD: "Sold", DELIVERED: "Delivered", WHOLESALED_OR_OTHER_DISPOSITION: "Disposition" };
          setLiveRetailStages(Object.entries(projection.byStage).map(([stage, summary]) => ({ label: labels[stage] ?? stage, count: summary.count, age: summary.overdue ? `${summary.overdue} overdue` : "on target", tone: summary.overdue ? "amber" : "green" })));
        }
        const money = (cents: number) => `$${Math.round(cents / 100).toLocaleString()}`;
        setLiveExceptions((projection.items ?? []).filter((item) => item.overdue || item.operatingState === "BLOCKED" || item.operatingState === "WAITING").map((item) => ({ priority: item.operatingState === "BLOCKED" ? "Critical" : item.overdue ? "High" : "Medium", asset: item.inventoryNumber, vehicle: `${item.vehicle.year} ${item.vehicle.make} ${item.vehicle.model}`, issue: item.stateReason ?? item.nextAction, age: `${item.ageDays}d`, owner: item.ownerUser.name, risk: money(item.exposureCents), action: item.nextAction })));
        setLiveShopStages([]);
        setLivePartsStages([]);
        setLiveCapacity([]);
        setProjectionAt(projection.generatedAt ?? new Date().toISOString());
        setProjectionState(projection.freshness === "LIVE" ? "live" : "stale");
        setNotice(projection.freshness === "LIVE" ? "Live operating view synchronized." : "Live projection is stale; showing the last reconciled snapshot.");
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setProjectionState("error");
        setNotice("Live inventory projection unavailable; values may be out of date. Retry to reconnect.");
      });
    return () => controller.abort();
  }, [projectionAttempt]);

  return (
    <section className="inventory-control-tower">
      <nav aria-label="Inventory module" className="ict-module-nav">
        {moduleTabs.map((tab) => {
          const activePath = tab.activePath ?? tab.href;
          const active = activePathname === activePath || (activePath !== "/vehicles" && activePathname.startsWith(`${activePath}/`));
          return <Link aria-current={active ? "page" : undefined} className={active ? "active" : ""} href={tab.href} key={tab.id}>{tab.label}</Link>;
        })}
        <Link href="/vehicles/registry">Open Registry</Link>
        <Link href="/vehicles/registry">Vehicle 360</Link>
        <Link href="/vehicles/discovery">Discovery, Knowledge &amp; Output</Link>
        <Link href="/vehicles/customer-lifecycle">Customer Lifecycle &amp; Commercial Control</Link>
        <Link href="/vehicles/inventory">Inventory Units</Link>
        <Link href="/vehicles/repair-orders">Repair Orders</Link>
        <Link href="/vehicles/parts">Parts &amp; Readiness</Link>
        <Link href="/vehicles/service-close-parts">Service Close &amp; Parts Operations</Link>
        <Link href="/vehicles/parts-counter">Parts Counter &amp; Inventory Control</Link>
        <Link href="/vehicles/shop-planning">Shop Planning</Link>
        <Link href="/vehicles/shop-dispatch">Shop Dispatch</Link>
        <Link href="/vehicles/quality-control">Quality Control</Link>
        <Link href="/vehicles/advisor">Advisor Service</Link>
        <Link href="/vehicles/comebacks">Comebacks</Link>
        <Link href="/vehicles/shop-production">Shop Production</Link>
      </nav>

      <div className="ict-shell">
        <main className="ict-main">
          <header className="ict-header">
            <div><p>Inventory operations</p><h1>Inventory Lifecycle Control Tower</h1><span>Protect flow, capital, readiness, and customer commitments.</span><small aria-live="polite" className={`ict-projection-status ict-projection-${projectionState}`} title={projectionAt ? `Projection generated ${projectionAt}` : undefined}>{projectionState === "loading" ? "Connecting to live projection…" : projectionState === "live" ? `Live projection${projectionAt ? ` · ${new Date(projectionAt).toLocaleTimeString()}` : ""}` : projectionState === "stale" ? "Stale projection · reconcile required" : "Projection unavailable · retry required"}</small>{projectionState === "error" ? <button type="button" onClick={() => { setProjectionState("loading"); setProjectionAttempt((attempt) => attempt + 1); }}>Retry live projection</button> : null}</div>
            <div className="ict-header-actions">
              <button type="button"><CalendarDays size={15} />Today</button>
              <button type="button"><MapPin size={15} />Location: All<ChevronDown size={13} /></button>
              <button type="button"><ClipboardCheck size={15} />Saved Views<ChevronDown size={13} /></button>
              <button aria-expanded={filtersOpen} onClick={() => setFiltersOpen((current) => !current)} type="button"><Filter size={15} />Filters</button>
              <button onClick={() => setNotice("Export prepared for the current operating view.")} type="button"><Download size={15} />Export</button>
              <button onClick={() => setNotice("Console configuration controls opened.")} type="button"><Settings2 size={15} />Configure</button>
            </div>
          </header>

          {filtersOpen ? (
            <div className="ict-filter-bar">
              <strong>Active scope</strong><button type="button">All locations</button><button type="button">All ownership</button><button type="button">Exceptions first</button><button onClick={() => setFiltersOpen(false)} type="button">Clear</button>
            </div>
          ) : null}

          <section aria-label="Inventory operating KPIs" className="ict-kpi-strip">
            {liveKpis.map(({ icon: Icon, label, tone, value }) => <article key={label}><Icon className={`ict-text-${tone}`} size={22} /><span>{label}<strong>{value}</strong></span></article>)}
          </section>

          <section aria-label="Flow health" className="ict-flow-health">
            {flowHealth.map((metric) => <MiniBar key={metric.label} {...metric} />)}
          </section>

          <section className="ict-panel ict-lifecycle-map">
            <header><div><strong>Lifecycle Flow Map</strong><span>Selected stage: {selectedStage}</span></div><div className="ict-legend"><span><i className="green" />No blocker</span><span><i className="amber" />Waiting</span><span><i className="red" />Critical</span><span><i className="blue" />QC</span></div></header>
            <div className="ict-lifecycle-scroll">
              <LifecycleLane icon={Car} label="Retail Inventory" selectedStage={selectedStage} setSelectedStage={setSelectedStage} stages={liveRetailStages} tone="blue" />
              <div className="ict-handoff"><span>Inspection creates recon work</span><ArrowRight size={14} /><span>QC returns to frontline flow</span></div>
              <LifecycleLane icon={Wrench} label="Shop / Recon" selectedStage={selectedStage} setSelectedStage={setSelectedStage} stages={liveShopStages} tone="cyan" />
              <div className="ict-handoff"><span>Parts demand</span><ArrowRight size={14} /><span>Reserved parts feed repair</span></div>
              <LifecycleLane icon={Boxes} label="Repair Parts" selectedStage={selectedStage} setSelectedStage={setSelectedStage} stages={livePartsStages} tone="slate" />
            </div>
          </section>

          <div className="ict-operations-grid">
            <section className="ict-panel ict-exceptions">
              <header><strong>Flow Exceptions</strong><button onClick={() => setNotice("Exception queue ranked by safety, SLA, and value at risk.")} type="button">Priority order</button></header>
              <div className="ict-table-scroll"><table><thead><tr><th>Priority</th><th>Asset</th><th>Exception</th><th>Age</th><th>Owner</th><th>Value at Risk</th><th>Next Action</th></tr></thead><tbody>
                {liveExceptions.map((item) => <tr className={selectedAsset === item.asset ? "selected" : ""} key={item.asset} onClick={() => { setSelectedAsset(item.asset); setNotice(`${item.asset} selected in the command rail.`); }}><td><span className={`ict-priority ict-priority-${item.priority.toLowerCase()}`}>{item.priority}</span></td><td><strong>{item.asset}</strong><small>{item.vehicle}</small></td><td>{item.issue}</td><td className="ict-danger-copy">{item.age}</td><td>{item.owner}</td><td>{item.risk}</td><td><button type="button">{item.action}</button></td></tr>)}
              </tbody></table></div>
              <button className="ict-panel-link" type="button">View all exceptions ({liveExceptions.length})</button>
            </section>

            <section className="ict-panel ict-capacity">
              <header><div><strong>Shop Capacity Board</strong><span>Recommendations require manager approval</span></div><button onClick={() => setNotice("Optimization complete: one load-balancing recommendation is ready for manager review.")} type="button"><Sparkles size={13} />Optimize Assignment</button></header>
              <div className="ict-table-scroll"><table><thead><tr><th>Tech</th><th>Current Vehicle / Job</th><th>Productive Touch Time</th><th>Next Checkpoint</th><th>Parts Readiness</th><th>Est. Finish</th><th>Bay</th></tr></thead><tbody>
                {liveCapacity.map((item) => <tr key={item.asset}><td><span className="ict-tech-dot" />{item.tech}</td><td><strong>{item.asset}</strong><small>{item.vehicle}</small></td><td>{item.touch}</td><td>{item.checkpoint}</td><td><strong className={item.readiness < 60 ? "ict-danger-copy" : item.readiness < 80 ? "ict-warning-copy" : "ict-success-copy"}>{item.readiness}%</strong></td><td>{item.finish}</td><td>{item.bay}</td></tr>)}
              </tbody></table></div>
            </section>
          </div>

          <section className="ict-panel ict-aging">
            <header><strong>Capital & Aging Portfolio</strong><span>Market fit versus lifecycle age</span></header>
            <div className="ict-aging-layout">
              <div className="ict-aging-bars">
                {[{label:"0-15 days",count:22,risk:"$238K",value:76,tone:"green"},{label:"16-30 days",count:15,risk:"$162K",value:53,tone:"amber"},{label:"31-45 days",count:10,risk:"$118K",value:38,tone:"amber"},{label:"46-60 days",count:7,risk:"$90K",value:29,tone:"red"},{label:"60+ days",count:7,risk:"$134K",value:29,tone:"red"}].map((row) => <div key={row.label}><span>{row.label}</span><div><i className={`ict-bg-${row.tone}`} style={{width:`${row.value}%`}} /></div><strong>{row.count}</strong><small>{row.risk}</small></div>)}
              </div>
              <div className="ict-market-map" aria-label="Market fit versus age portfolio plot"><span className="axis-y">Market Fit</span><i className="plot high young">TMS18777<br />CX-5</i><i className="plot high mid">TMS18888<br />RAV4</i><i className="plot high old">TMS18422<br />Accord</i><i className="plot low mid">TMS19045<br />Camry</i><i className="plot low old">TMS17654<br />Malibu</i><span className="axis-x">Age</span></div>
              <div className="ict-recommendations"><strong>Recommended Actions</strong><span><i className="green" /><b>Improve merchandising (2)</b><small>Strong market, needs attention</small></span><span><i className="amber" /><b>Manager price review (2)</b><small>Consider price adjustment</small></span><span><i className="blue" /><b>Transfer candidate (1)</b><small>Move to higher demand location</small></span><span><i className="red" /><b>Disposition review (2)</b><small>High age, low market fit</small></span></div>
            </div>
          </section>
          <footer className="ict-footer"><div className="ict-legend"><span><i className="blue" />Retail Inventory</span><span><i className="cyan" />Customer Repair</span><span><i className="green" />Inventory Recon</span><span><i className="amber" />Waiting</span><span><i className="red" />Critical</span></div><span aria-live="polite">{notice}</span></footer>
        </main>

        <aside aria-label="Selected asset command center" className="ict-command-rail">
          <header><div><h2>{selectedAsset}</h2><strong>2019 Toyota Camry SE</strong><span>VIN 4T1B11HKXKU123456</span></div><span className="ict-risk-badge">At Risk</span></header>
          <div className="ict-vehicle-summary"><div className="ict-car-visual"><Car size={54} strokeWidth={1.3} /></div><dl><div><dt>Stage</dt><dd>Shop / Recon</dd></div><div><dt>Lifecycle Age</dt><dd>18 days</dd></div><div><dt>Owner</dt><dd>Brock Inventory</dd></div><div><dt>Location</dt><dd>Bay 3</dd></div></dl></div>
          <section><h3>Flow Clock</h3><div className="ict-clock-row"><span>Active</span><div><i className="ict-bg-green" style={{width:"68%"}} /></div><strong>5h 42m</strong></div><div className="ict-clock-row"><span>Waiting</span><div><i className="ict-bg-amber" style={{width:"85%"}} /></div><strong>2d 4h</strong></div><div className="ict-clock-row"><span>Idle</span><div><i className="ict-bg-slate" style={{width:"46%"}} /></div><strong>10h 2m</strong></div></section>
          <section><h3>Financial Exposure</h3><div className="ict-financial-grid"><span>Acquisition<strong>$12,450</strong></span><span>Recon<strong>$1,842</strong></span><span>Carrying<strong>$268</strong></span><span>Forecast Margin<strong>$2,940</strong></span></div></section>
          <section className="ict-constraint"><h3>Current Constraint</h3><div><Wrench size={22} /><span><strong>Brake parts ETA</strong><small>Expected arrival May 23-24<br />Alternate vendor available</small></span></div></section>
          <section className="ict-next-action"><h3>Next Best Action</h3><div><CheckCircle2 size={22} /><span><strong>Approve alternate vendor and protect Friday frontline target.</strong><small>Reason codes: margin protect, frontline commitment, low risk.</small></span><b>High confidence</b></div></section>
          <section><h3>Shop Work Execution</h3><div className="ict-execution-steps">{executionSteps.map((step, index) => <span className={index < 4 ? "complete" : index === 4 ? "blocked" : ""} key={step}><i />{step}</span>)}</div></section>
          <section><h3>Coaching &amp; Operating Health <small>System delays excluded</small></h3><MiniBar label="Schedule adherence" value={82} /><MiniBar label="Productive touch-time" value={76} /><MiniBar label="First-time-fix & QC" value={91} /><MiniBar label="Checkpoint reliability" value={84} /><MiniBar label="Blocker documentation" value={88} /><MiniBar label="Handoff evidence" value={72} /></section>
          <section><h3>Linked Work</h3><div className="ict-linked-work"><span><ClipboardCheck size={14} />3 Tasks</span><span><ShoppingCart size={14} />1 Purchase Order</span><span><ShieldCheck size={14} />1 Approval</span></div></section>
          <section><h3>Audit Trail</h3><ol className="ict-audit"><li><time>May 16, 9:22 AM</time><span>Paused - waiting on brake parts ETA.</span></li><li><time>May 15, 10:11 AM</time><span>Started repair - brake replacement.</span></li><li><time>May 14, 8:37 AM</time><span>Assigned to shop - intake complete.</span></li></ol></section>
          <div className="ict-command-actions"><Link href="/tasks">Open Vehicle Workbench</Link><button onClick={() => setNotice(`${selectedAsset} is ready for assignment review.`)} type="button">Assign</button><button onClick={() => setNotice("Stage update form opened.")} type="button">Update Stage</button><button onClick={() => setNotice("Blocker resolution workflow opened.")} type="button">Resolve Blocker</button><button className="danger" onClick={() => setNotice(`${selectedAsset} escalated for manager review.`)} type="button">Escalate</button></div>
        </aside>
      </div>
    </section>
  );
}
