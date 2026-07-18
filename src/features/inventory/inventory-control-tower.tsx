import Link from "next/link";
import type { InventoryControlTowerProjection } from "@/server/inventory-control-tower/service";

const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const formatCurrency = (cents: number) => currency.format(cents / 100);
const formatDate = (date: Date | string) => new Date(date).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });

function ConnectedPanel({ title, reason, href, action }: { title: string; reason: string; href: string; action: string }) {
  return <article className="ict-panel"><span className="status-chip">Connected workspace</span><h2>{title}</h2><p>{reason}</p><Link className="text-link" href={href}>{action}</Link></article>;
}

export function InventoryControlTower({ projection, backHref = "/vehicles/inventory" }: { projection: InventoryControlTowerProjection; backHref?: string }) {
  const selected = projection.selectedAsset;
  function towerHref(context: { stage?: string; inventoryUnitId?: string }) {
    const params = new URLSearchParams({ returnTo: backHref });
    if (projection.filters.locationId) params.set("locationId", projection.filters.locationId);
    if (context.stage) params.set("stage", context.stage);
    if (context.inventoryUnitId) params.set("inventoryUnitId", context.inventoryUnitId);
    return `/vehicles/control-tower?${params.toString()}`;
  }
  return <section className="page-stack ict-r3">
    <header className="page-copy ict-r3-header">
      <nav aria-label="Breadcrumb"><Link href="/vehicles/inventory">Inventory Lifecycle</Link><span aria-hidden="true"> / </span><span>Control Tower</span></nav>
      <span className="eyebrow">R3 · reconciled at {formatDate(projection.generatedAt)}</span>
      <h1>Inventory Lifecycle Control Tower</h1>
      <p>Operate the live inventory population, its clocks, exposure, blockers, and accountable next actions.</p>
      <div className="form-actions"><Link className="button button-primary" href={backHref}>Back to Inventory Lifecycle</Link><Link className="pill pill-secondary" href="/vehicles/inventory/units">Open Inventory Units</Link><Link className="pill pill-secondary" href="/vehicles/workflows">Start Workflow</Link></div>
    </header>

    <section aria-label="Projection integrity" className="ict-integrity">
      <strong>{projection.freshness} · Quality {projection.dataQualityGrade}</strong>
      <span>{projection.reconciliation.stageUnits} stage records reconcile to {projection.reconciliation.scopedUnits} scoped units.</span>
      <span>Contract {projection.contractVersion} · Projection {projection.projectionVersion}</span>
      {projection.partialReasons.map((reason) => <span key={reason}>{reason}</span>)}
    </section>

    <section aria-label="Inventory operating KPIs" className="ict-kpi-strip">
      {[{ label: "Open units", value: projection.totals.units }, { label: "Overdue", value: projection.totals.overdue }, { label: "Blocked", value: projection.totals.blocked }, { label: "Waiting", value: projection.totals.waiting }, { label: "Recorded exposure", value: formatCurrency(projection.totals.exposureCents) }].map((metric) => <article key={metric.label}><span>{metric.label}<strong>{metric.value}</strong></span></article>)}
    </section>

    <section className="ict-panel"><header><div><strong>Retail lifecycle flow</strong><span>One mutually exclusive stage per open InventoryUnit</span></div></header><div className="ict-r3-pipeline">
      {projection.byStage.map((stage) => <Link className={stage.overdue || stage.blocked ? "needs-attention" : ""} href={towerHref({ stage: stage.stage })} key={stage.stage}><span>{stage.label}</span><strong>{stage.count}</strong><small>{stage.averageStageAgeDays === null ? "No population" : `${stage.averageStageAgeDays} avg stage days`}</small><small>{stage.overdue} overdue · {stage.blocked} blocked</small></Link>)}
    </div></section>

    <div className="ict-r3-grid">
      <section className="ict-panel"><header><div><strong>Priority work</strong><span>Blocked and overdue conditions rank first</span></div></header>{projection.priorityWork.length ? <div className="ict-table-scroll"><table><thead><tr><th>Unit</th><th>Stage / state</th><th>Owner</th><th>Target</th><th>Exposure</th><th>Next action</th></tr></thead><tbody>{projection.priorityWork.map((item) => <tr key={item.id}><td><Link href={towerHref({ inventoryUnitId: item.id })}><strong>{item.inventoryNumber}</strong></Link><small>{item.vehicle}</small></td><td>{item.stageLabel}<small>{item.operatingState}{item.overdue ? " · overdue" : ""}</small></td><td>{item.owner}<small>{item.location}</small></td><td>{formatDate(item.targetAt)}</td><td>{formatCurrency(item.exposureCents)}</td><td>{item.nextAction}{item.blocker ? <small>Blocker: {item.blocker}</small> : null}</td></tr>)}</tbody></table></div> : <p>No open inventory work exists in this permitted scope.</p>}</section>
      <aside className="ict-panel ict-r3-selected" aria-label="Selected inventory unit">{selected ? <><span className="eyebrow">Selected asset · live record</span><h2>{selected.inventoryNumber}</h2><p>{[selected.vehicle.year, selected.vehicle.make, selected.vehicle.model].filter(Boolean).join(" ") || selected.vehicle.vehicleNumber}</p><dl className="etw-facts compact"><div><dt>Stage</dt><dd>{selected.lifecycleStage}</dd></div><div><dt>State</dt><dd>{selected.operatingState}</dd></div><div><dt>Lifecycle age</dt><dd>{selected.ageDays} days</dd></div><div><dt>Stage age</dt><dd>{selected.stageAgeDays} days</dd></div><div><dt>Owner</dt><dd>{selected.ownerUser.name}</dd></div><div><dt>Location</dt><dd>{selected.location.name}</dd></div><div><dt>Target</dt><dd>{formatDate(selected.targetAt)}</dd></div><div><dt>Recorded exposure</dt><dd>{formatCurrency(selected.exposureCents)}</dd></div></dl>{selected.stateReason ? <div className="notice notice-warning"><p>{selected.stateReason}</p></div> : null}<h3>Next valid operating action</h3><p>{selected.nextAction}</p><Link className="button button-primary" href={`/vehicles/inventory/units?inventoryUnitId=${selected.id}`}>Open Inventory Unit</Link></> : <><h2>No selected asset</h2><p>Select a priority record when inventory becomes available.</p></>}</aside>
    </div>

    <section className="ict-panel"><header><div><strong>Capital &amp; aging portfolio</strong><span>Recorded non-void cost entries only</span></div></header><div className="ict-aging-bars">{projection.agingBands.map((band) => <div key={band.key}><span>{band.label}</span><strong>{band.count} units</strong><small>{formatCurrency(band.exposureCents)}</small></div>)}</div></section>

    <div className="ict-r3-unavailable-grid">
      <ConnectedPanel title="Shop / Recon dependencies" reason="R7 owns reconciled Shop and RepairOrder work; open it without duplicating state in the Control Tower." href="/vehicles/shop-recon" action="Open Shop & Recon" />
      <ConnectedPanel title="Parts dependencies" reason="R8 owns Parts demand, purchasing, custody, recovery, and count evidence." href="/vehicles/parts-operations" action="Open Parts Operations" />
      <ConnectedPanel title="Reviews & approvals" reason="R10 composes permission-scoped review and exact-version approval queues across owning domains." href="/manager-review?scope=inventory&view=reviews" action="Open Reviews" />
      <ConnectedPanel title="Disposition recommendations" reason="R9 owns advisory candidate and channel recommendations; no recommendation executes a disposition." href="/vehicles/disposition-wholesale" action="Open Disposition & Wholesale" />
    </div>
  </section>;
}
