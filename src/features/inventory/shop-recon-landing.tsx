import Link from "next/link";

type Item = {
  id: string;
  repairOrderNumber: string;
  origin: string;
  stage: string;
  operatingState: string;
  targetAt: string;
  nextAction: string;
  blocker: string | null;
  owner: string;
  location: string;
  vehicle: string;
  subject: string;
  concern: string;
  waitingParts: boolean;
  unassigned: boolean;
  atRisk: boolean;
  approvalPending: boolean;
  technician: string | null;
  bay: string | null;
  jobCount: number;
  qcPending: number;
};

type Model = {
  contractVersion: string;
  freshness: string;
  generatedAt: string;
  totals: {
    openOrders: number;
    projectedOnTime: number;
    waitingParts: number;
    unassigned: number;
    atRisk: number;
    customerRepair: number;
    inventoryRecon: number;
  };
  pipeline: Array<{ key: string; label: string; count: number }>;
  items: Item[];
  reviews: { quality: number; comebacks: number };
  approvals: { estimate: number };
  capability: {
    partsRecommendations: string;
    externalAdapters: string;
    automaticDiscipline: string;
  };
};

export function ShopReconLanding({ model }: { model: Model }) {
  return (
    <section className="page-stack shop-r7-landing">
      <header className="page-copy">
        <span className="eyebrow">Inventory Console &middot; R7 Shop &amp; Recon</span>
        <h1>Keep every repair moving.</h1>
        <p>One daily operating view for customer repair and inventory recon, with accountable work, promise risk, capacity, parts constraints, quality, approvals, and evidence-backed handoffs.</p>
        <div className="form-actions">
          <Link className="button button-primary" href="/vehicles/parts-operations">Open Parts Operations</Link>
          <Link className="pill pill-secondary" href="/vehicles/repair-orders">Start / open RepairOrder</Link>
          <Link className="pill pill-secondary" href="/vehicles/shop-planning">Diagnosis &amp; planning</Link>
          <Link className="pill pill-secondary" href="/vehicles/shop-dispatch">Capacity &amp; assignment</Link>
          <Link className="pill pill-secondary" href="/vehicles/shop-metrics">Production metrics</Link>
          <Link className="pill pill-secondary" href="/vehicles/control-tower">Inventory Control Tower</Link>
        </div>
      </header>

      <section className="ict-integrity">
        <strong>{model.freshness} &middot; {model.contractVersion}</strong>
        <span>As of {new Date(model.generatedAt).toLocaleString()}</span>
        <span>External service, DMS, payment, messaging, and accounting adapters are disabled.</span>
      </section>

      <section className="ict-kpi-strip">
        {[
          { label: "Open work", value: model.totals.openOrders },
          { label: "Projected on time", value: `${model.totals.projectedOnTime}%` },
          { label: "Waiting on parts", value: model.totals.waitingParts },
          { label: "Needs assignment", value: model.totals.unassigned },
          { label: "At risk", value: model.totals.atRisk },
        ].map((metric) => <article key={metric.label}><span>{metric.label}<strong>{metric.value}</strong></span></article>)}
      </section>

      <section className="shop-r7-workload" aria-label="Workload separation">
        <article><span>Customer Repair</span><strong>{model.totals.customerRepair}</strong><small>Customer promise and consent remain visible</small></article>
        <article><span>Inventory Recon</span><strong>{model.totals.inventoryRecon}</strong><small>Inventory handoff remains distinct</small></article>
      </section>

      <section className="shop-r7-pipeline" aria-label="Shop production pipeline">
        {model.pipeline.map((stage) => <article key={stage.key}><span>{stage.label}</span><strong>{stage.count}</strong></article>)}
      </section>

      <div className="shop-r7-grid">
        <section className="panel-card page-stack">
          <header><div><h2>Priority work</h2><p>Promise, constraint, readiness, and assignment signals from live RepairOrders</p></div></header>
          {model.items.length ? model.items.slice(0, 12).map((item) => (
            <Link className={`shop-r7-work-card${item.atRisk ? " at-risk" : ""}`} href={`/vehicles/repair-orders?repairOrderId=${item.id}`} key={item.id}>
              <span>
                <strong>{item.repairOrderNumber} &middot; {item.vehicle}</strong>
                <small>{item.origin.replaceAll("_", " ")} &middot; {item.subject} &middot; {item.location}</small>
                <small>{item.concern}</small>
              </span>
              <span>
                <b>{item.stage.replaceAll("_", " ")} / {item.operatingState}</b>
                <small>{item.technician ?? item.owner}{item.bay ? ` · ${item.bay}` : ""}</small>
                <small>{item.waitingParts ? "Waiting on parts · " : ""}{item.unassigned ? "Needs assignment · " : ""}{item.approvalPending ? "Approval pending · " : ""}{new Date(item.targetAt).toLocaleString()}</small>
                <small>{item.blocker ?? item.nextAction}</small>
              </span>
            </Link>
          )) : <p>No open Shop or Recon work exists in this permitted scope.</p>}
        </section>

        <aside className="page-stack">
          <section className="panel-card page-stack"><h2>Capacity &amp; assignment</h2><p><strong>{model.totals.unassigned}</strong> ready orders need assignment.</p><Link className="text-link" href="/vehicles/shop-dispatch">Open dispatch board</Link><Link className="text-link" href="/vehicles/shop-dispatch">Open technician execution</Link></section>
          <section className="panel-card page-stack"><h2>Blocker Center</h2><p><strong>{model.totals.waitingParts}</strong> waiting on Parts &middot; <strong>{model.totals.atRisk}</strong> at risk.</p><Link className="text-link" href="/vehicles/parts-operations">Open Parts dependencies</Link><Link className="text-link" href="/vehicles/advisor">Open promise and advisor work</Link></section>
          <section className="panel-card page-stack"><h2>Reviews &amp; approvals</h2><p><strong>{model.reviews.quality}</strong> quality reviews &middot; <strong>{model.reviews.comebacks}</strong> comeback reviews &middot; <strong>{model.approvals.estimate}</strong> estimate decisions pending.</p><Link className="text-link" href="/vehicles/quality-control">Open Quality Control</Link><Link className="text-link" href="/manager-review?scope=shop&view=approvals">Open Approvals</Link><Link className="text-link" href="/vehicles/comebacks">Open Comebacks</Link></section>
          <section className="panel-card page-stack"><h2>Invoice-ready close</h2><p>Authorized labor, installed-part custody, QC, delivery readiness, release, handoff, acknowledgement, mismatch, close, and controlled reopen remain evidence-gated.</p><Link className="text-link" href="/vehicles/service-close-parts">Open service close</Link></section>
        </aside>
      </div>

      <section className="ict-integrity">
        <span>Parts recommendations: {model.capability.partsRecommendations}</span>
        <span>Automatic discipline: {model.capability.automaticDiscipline}</span>
        <span>Provider state: {model.capability.externalAdapters}</span>
      </section>
    </section>
  );
}
