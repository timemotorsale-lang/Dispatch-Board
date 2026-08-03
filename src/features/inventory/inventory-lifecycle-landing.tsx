import type { CSSProperties } from "react";
import { AlertTriangle, BarChart3, CarFront, CheckCircle2, ClipboardList, Clock3, Download, FileCheck2, Gauge, Handshake, Layers3, MoreVertical, Play, Search, ShieldCheck, Tags, Truck, Wrench } from "lucide-react";
import Link from "next/link";
import type { InventoryLifecycleUnitContext } from "@/features/inventory/lifecycle/types";
import { InventoryLifecyclePrototype } from "@/features/prototype/inventory-lifecycle-prototype";
import type { InventoryControlTowerBaseProjection, InventoryControlTowerProjection } from "@/server/inventory-control-tower/service";

const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const lifecycleGroups = [
  { icon: Handshake, label: "Acquired", stages: ["PURCHASED_OR_TRADE_IN"] },
  { icon: Truck, label: "Received", stages: ["TRANSPORTATION", "RECEIVED"] },
  { icon: Search, label: "Inspected", stages: ["INSPECTION"] },
  { icon: Wrench, label: "Recon", stages: ["RECONDITIONING", "TITLE_DOCUMENT_READINESS"] },
  { icon: Tags, label: "Merchandising", stages: ["PHOTOGRAPHY_MERCHANDISING"] },
  { icon: FileCheck2, label: "Frontline Ready", stages: ["FRONTLINE_READY", "RESERVED_DEAL_PENDING"] },
  { icon: CarFront, label: "Sold / Wholesale / Transferred", stages: ["SOLD", "DELIVERED", "WHOLESALED_OR_OTHER_DISPOSITION"] },
] as const;

export function InventoryLifecycleLanding({ projection, controlTowerHref, currentUserId = "", activeWorkView = "MY", guidedLifecycleStage = 0, guidedLifecycleUnitContext = null }: { projection: InventoryControlTowerProjection | InventoryControlTowerBaseProjection; controlTowerHref: string; currentUserId?: string; activeWorkView?: "MY" | "TEAM" | "EXCEPTIONS"; guidedLifecycleStage?: number; guidedLifecycleUnitContext?: InventoryLifecycleUnitContext | null }) {
  const connected = "decisions" in projection ? projection : null;
  const grouped = lifecycleGroups.map((group) => {
    const stages = projection.byStage.filter((stage) => (group.stages as readonly string[]).includes(stage.stage));
    const count = stages.reduce((sum, stage) => sum + stage.count, 0);
    const weightedAge = stages.reduce((sum, stage) => sum + (stage.averageStageAgeDays ?? 0) * stage.count, 0);
    return { ...group, count, overdue: stages.reduce((sum, stage) => sum + stage.overdue, 0), blocked: stages.reduce((sum, stage) => sum + stage.blocked, 0), averageAge: count ? weightedAge / count : 0, stage: group.stages[0] };
  });
  const attention = projection.totals.overdue + projection.totals.blocked;
  const targetCompliance = projection.totals.units ? Math.max(0, Math.round(((projection.totals.units - projection.totals.overdue) / projection.totals.units) * 100)) : 100;
  const avgStageDays = projection.totals.units ? projection.byStage.reduce((sum, stage) => sum + (stage.averageStageAgeDays ?? 0) * stage.count, 0) / projection.totals.units : 0;
  const aged = projection.agingBands.filter((band) => ["31_45", "46_60", "61_plus"].includes(band.key)).reduce((sum, band) => sum + band.exposureCents, 0);
  const decisionReviews = connected?.decisions.items.filter((item) => item.kind !== "APPROVAL").length ?? 0;
  const unitById = new Map(projection.items.map((item) => [item.id, item]));
  const priorityRows = projection.priorityWork.filter((item) => activeWorkView === "TEAM" ? true : activeWorkView === "EXCEPTIONS" ? Boolean(item.blocker || item.overdue) : unitById.get(item.id)?.ownerUser.id === currentUserId);
  const viewHref = (view: "MY" | "TEAM" | "EXCEPTIONS") => `/vehicles/inventory?view=${view}${projection.filters.locationId ? `&locationId=${encodeURIComponent(projection.filters.locationId)}` : ""}`;
  const decisionRows = connected?.decisions.items.map((item) => {
    const unit = unitById.get(item.inventoryUnitId);
    const actionHref = item.domain === "FRONTLINE" ? `/vehicles/inventory-to-frontline?workflowId=${item.id}` : item.domain === "RETAIL" ? `/vehicles/retail-completion?completionId=${item.id}` : `/vehicles/disposition-wholesale?caseId=${item.id}`;
    return { ...item, unit, actionHref, actionLabel: item.kind === "APPROVAL" ? "Approve" : "Review", title: item.domain === "FRONTLINE" ? "Frontline readiness review" : item.domain === "RETAIL" ? "Retail completion review" : item.kind === "APPROVAL" ? "Wholesale disposition approval" : "Disposition recommendation review" };
  }) ?? [];
  const maxGroup = Math.max(1, ...grouped.map((stage) => stage.count));
  const totalAging = Math.max(1, projection.agingBands.reduce((sum, band) => sum + band.count, 0));
  const agingColors = ["#09854d", "#f4a000", "#ef7b0b", "#df2736", "#7239b7"];
  const agingGradient = projection.agingBands.map((band, index) => {
    const start = projection.agingBands.slice(0, index).reduce((sum, item) => sum + (item.count / totalAging) * 100, 0);
    const end = start + (band.count / totalAging) * 100;
    return `${agingColors[index % agingColors.length]} ${start}% ${end}%`;
  }).join(", ");

  return <section aria-label={`Inventory Lifecycle; ${projection.freshness}; quality ${projection.dataQualityGrade}; ${projection.reconciliation.stageUnits} of ${projection.reconciliation.scopedUnits} units reconciled`} className="inventory-lifecycle-landing visual-console-page">
    <header className="vcp-header">
      <div><p>Inventory Console</p><h1>Inventory Lifecycle</h1><span>Enterprise inventory health and movement</span></div>
      <div className="vcp-actions"><Link className="vcp-primary" href="/vehicles/registry"><Search size={15} />Find Vehicle / Open Workbench</Link><Link href="#integrated-lifecycle"><Layers3 size={15} />Guided Lifecycle</Link><Link href={controlTowerHref}><Gauge size={15} />Open Control Tower</Link><Link href="/vehicles/workflows/add-vehicle">Add / Find Vehicle</Link><Link href="/vehicles/disposition-wholesale">Open Disposition &amp; Wholesale</Link><button disabled title="Saved views activation is pending">Saved Views</button><button disabled title="Export activation is pending"><Download size={15} />Export</button></div>
    </header>

    <form className="vcp-filter-bar" action="/vehicles/inventory">
      <label>Location<select defaultValue={projection.filters.locationId ?? ""} name="locationId"><option value="">All permitted locations</option>{projection.byLocation.map((location) => <option key={location.locationId} value={location.locationId}>{location.name} ({location.count})</option>)}</select></label>
      <label>Stage<select defaultValue={projection.filters.stage ?? ""} name="stage"><option value="">All stages</option>{projection.byStage.map((stage) => <option value={stage.stage} key={stage.stage}>{stage.label}</option>)}</select></label>
      <label>Owner<select disabled><option>All permitted owners</option></select></label>
      <label>Age<select disabled><option>All ages</option></select></label>
      <label>Date Range<select disabled><option>Current operating window</option></select></label>
      <button className="sr-only" type="submit">Apply filters</button>
    </form>
    <nav aria-label="Inventory Lifecycle governed workspaces" className="sr-only"><Link href="/vehicles/registry">Find Vehicle / Open Workbench</Link><Link href="/vehicles/acquisition-appraisal">Acquisition &amp; Appraisal</Link><Link href="/vehicles/inventory-to-frontline">Inventory to Frontline</Link><Link href="/vehicles/retail-completion">Retail Completion</Link><Link href="/vehicles/workflows"><Play size={14} />Workflow Launcher</Link></nav>

    {!projection.totals.units ? <section className="vehicle-map-empty lifecycle-map" aria-label="Vehicle map guidance"><h2>No inventory lifecycle units are visible yet</h2><p>A vehicle may still exist in the canonical registry even when it has not become an InventoryUnit. Staff should search the vehicle first, open its Vehicle Workbench, and only start acquisition or lifecycle work when that is the right business step.</p><div className="form-actions"><Link className="button button-primary" href="/vehicles/registry">Find Vehicle / Open Workbench</Link><Link className="button button-secondary" href="/vehicles/workflows/add-vehicle">Add / Find Vehicle</Link><Link className="button button-secondary" href="/vehicles/acquisition-appraisal">Start Acquisition</Link></div></section> : null}

    <section id="integrated-lifecycle" aria-label="Integrated guided inventory lifecycle">
      <InventoryLifecyclePrototype embedded initialStage={guidedLifecycleStage} initialUnitContext={guidedLifecycleUnitContext} />
    </section>

    <section aria-label="Inventory lifecycle KPIs" className="vcp-kpis">
      {[
        { icon: CarFront, label: "Active Inventory", value: projection.totals.units, tone: "blue", detail: "Authoritative open units" },
        { icon: AlertTriangle, label: "Needs Attention", value: attention, tone: "amber", detail: `${projection.totals.overdue} overdue · ${projection.totals.blocked} blocked` },
        { icon: Clock3, label: "Avg. Days in Stage", value: avgStageDays.toFixed(1), tone: "blue", detail: "Weighted current population" },
        { icon: BarChart3, label: "Aged Exposure", value: currency.format(aged / 100), tone: "purple", detail: "31+ day recorded exposure" },
        { icon: Layers3, label: "Blocked", value: projection.totals.blocked, tone: "red", detail: "Action required" },
        { icon: ShieldCheck, label: "Target Compliance", value: `${targetCompliance}%`, tone: "green", detail: "Target-date proxy" },
      ].map(({ icon: Icon, label, value, tone, detail }) => <article className={`vcp-kpi tone-${tone}`} key={label}><Icon size={21} /><span>{label}<strong>{value}</strong><small>{detail}</small></span></article>)}
    </section>

    <section className="vcp-panel vcp-lifecycle-flow"><header><div><strong className="sr-only">Lifecycle Pipeline</strong><span className="sr-only">Choose a stage to open the Control Tower in context</span></div></header><div className="vcp-flow-row">{grouped.map((stage, index) => <div className="vcp-flow-wrap" key={stage.label}><Link className={stage.blocked || stage.overdue ? "attention" : ""} href={`${controlTowerHref}&stage=${stage.stage}`}><stage.icon /><span>{stage.label}</span><strong>{stage.count}</strong><small><b>Avg. Days</b>{stage.averageAge.toFixed(1)} <b>Overdue</b>{stage.overdue}</small><i /></Link>{index < grouped.length - 1 ? <b aria-hidden="true">›</b> : null}</div>)}</div><footer><span>ⓘ Numbers reflect InventoryUnits. Existing vehicles without inventory lifecycle are found through Vehicle Registry → Vehicle Workbench.</span><div className="vcp-legend"><i className="healthy" />Healthy (On Track)<i className="warning" />At Risk (Monitor)<i className="danger" />Overdue (Action Needed)</div></footer></section>

    <div className="vcp-primary-grid">
      <section className="vcp-panel vcp-priority"><header><strong>Priority Work</strong><Link href={viewHref("TEAM")}>View all</Link></header><nav aria-label="Priority Work categories"><Link className={activeWorkView === "MY" ? "active" : ""} href={viewHref("MY")}>My Work</Link><Link className={activeWorkView === "TEAM" ? "active" : ""} href={viewHref("TEAM")}>Team</Link><Link className={activeWorkView === "EXCEPTIONS" ? "active" : ""} href={viewHref("EXCEPTIONS")}>Exceptions</Link></nav><div className="vcp-table-scroll"><table><thead><tr><th>Vehicle</th><th>VIN (Last 6)</th><th>Current Stage</th><th>Age (Days)</th><th>Owner</th><th>Blocker / Issue</th><th>Due</th><th>Next Action</th><th aria-label="More" /></tr></thead><tbody>{priorityRows.slice(0, 5).map((item) => { const unit = unitById.get(item.id); return <tr key={item.id}><td><strong>{item.vehicle}</strong><small>Stock # {item.inventoryNumber}</small></td><td>{unit?.vehicle.vin?.slice(-6) ?? "—"}</td><td><span className="vcp-chip">{item.stageLabel}</span></td><td className={item.ageDays > 30 ? "danger-text" : ""}>{item.ageDays}</td><td>{item.owner}</td><td>{item.blocker ?? (item.overdue ? "Target overdue" : item.nextAction)}</td><td className={item.overdue ? "danger-text" : ""}>{new Date(item.targetAt).toLocaleString()}</td><td><Link href={`${controlTowerHref}&inventoryUnitId=${item.id}`}>{item.nextAction}</Link></td><td><MoreVertical /></td></tr>; })}{!priorityRows.length ? <tr><td className="vcp-empty" colSpan={9}>No priority inventory work matches this category.</td></tr> : null}</tbody></table></div><footer><span>ⓘ Recommendations remain advisory · Manager approval is required where governed</span></footer></section>
      <section className="vcp-panel vcp-decisions"><header><strong>Reviews &amp; Approvals</strong><Link href="/manager-review?scope=inventory">View all</Link></header><nav aria-label="Review and Approval categories"><Link className="active" href="/manager-review?scope=inventory&view=reviews">Reviews <b>{decisionReviews}</b></Link><Link href="/manager-review?scope=inventory&view=approvals">Approvals <b>{connected?.decisions.approvals ?? "—"}</b></Link></nav><div className="vcp-decision-head"><span>Item</span><span>Owner</span><span>Age</span><span>Action</span><span /></div><ol>{decisionRows.slice(0, 5).map((item) => <li key={`${item.domain}:${item.id}`}><i>{item.kind === "APPROVAL" ? <ShieldCheck /> : <ClipboardList />}</i><div><strong>{item.title}</strong><small>Stock # {item.unit?.inventoryNumber ?? item.inventoryUnitId}</small></div><span>{item.unit?.ownerUser.name ?? "—"}</span><span>{item.unit?.ageDays ?? "—"}d</span><Link href={item.actionHref}>{item.actionLabel}</Link><MoreVertical /></li>)}{!decisionRows.length ? <li className="empty"><CheckCircle2 />No governed reviews or approvals in this permitted scope.</li> : null}</ol><Link className="vcp-decisions-all" href="/manager-review?scope=inventory">View all reviews &amp; approvals →</Link></section>
    </div>

    <section className="vcp-analytics-grid">
      <article className="vcp-panel"><header><div><strong>Lifecycle Velocity</strong><span>30-day exits by approved lifecycle group</span></div></header><div className="vcp-column-chart">{grouped.map((group) => { const exits = connected?.stageFlow.filter((flow) => (group.stages as readonly string[]).includes(flow.stage)).reduce((sum, flow) => sum + flow.exits30d, 0) ?? 0; return <div key={group.label}><span style={{ "--bar": `${Math.max(4, (exits / Math.max(1, ...(connected?.stageFlow.map((flow) => flow.exits30d) ?? [0]))) * 100)}%` } as CSSProperties}><b>{connected ? exits : "—"}</b></span><small>{group.label}</small></div>; })}</div></article>
      <article className="vcp-panel"><header><div><strong>Stage Bottlenecks</strong><span>Average days in current stage</span></div></header><div className="vcp-bar-list">{[...grouped].sort((a, b) => b.averageAge - a.averageAge).slice(0, 6).map((stage) => <p key={stage.label}><span>{stage.label}</span><i><b style={{ width: `${Math.max(3, stage.count / maxGroup * 100)}%` }} /></i><strong>{stage.averageAge.toFixed(1)}d</strong></p>)}</div></article>
      <article className="vcp-panel vcp-aging"><header><div><strong>Inventory Aging</strong><span>Current open population</span></div></header><div><div className="vcp-donut" style={{ background: agingGradient ? `conic-gradient(${agingGradient})` : "#e5eaf0" }}><span><strong>{projection.totals.units}</strong><small>Total units</small></span></div><ul>{projection.agingBands.map((band, index) => <li key={band.key}><i style={{ background: agingColors[index % agingColors.length] }} /><span>{band.label}</span><strong>{band.count}</strong></li>)}</ul></div></article>
    </section>
  </section>;
}
