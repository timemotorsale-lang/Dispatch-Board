import type { CSSProperties } from "react";
import {
  AlertTriangle,
  Building2,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  ClipboardPlus,
  Clock3,
  Download,
  FlaskConical,
  PackageOpen,
  UserRound,
  Wrench,
} from "lucide-react";
import Link from "next/link";

import { BackToServiceAdvisorWorkspace } from "@/features/advisor/advisor-return-link";
import type { ShopReconPilotScenario } from "@/server/shop-recon/pilot";

import { BackToVehicleOperationsWorkspace } from "./workspace-return-link";

type Item = {
  id: string;
  repairOrderNumber: string;
  origin: string;
  workLane: "INVENTORY_RECON" | "CUSTOMER_REPAIR";
  workLaneLabel: string;
  cardTone: string;
  commitmentLabel: string;
  authorizationPath: string;
  completionHandoff: string;
  stage: string;
  shopLifecycleStage: string;
  shopLifecycleLabel: string;
  shopLifecycleOrder: number;
  shopZoneCode: string;
  stageTargetBand: string;
  stageElapsedMinutes: number;
  priorityScore: number;
  priorityBand: string;
  priorityReasons: ReadonlyArray<{ code: string; points: number }>;
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
  pilot: ShopReconPilotScenario | null;
};

type Model = {
  contractVersion: string;
  freshness: string;
  generatedAt: string;
  foundation: {
    contractVersion: string;
    status: string;
    configurationStatus: string;
    stages: ReadonlyArray<{ code: string; label: string; order: number }>;
    operatingCalendar: {
      timeZone: string;
      weekdays: readonly string[];
      openMinute: number;
      closeMinute: number;
    };
    staffing: ReadonlyArray<{ name: string; role: string }>;
    wipLimits: { operatingRepairBays: number };
    activation: {
      stageAlgorithms: string;
      workflowTransitions: string;
      inventoryWriteback: string;
    };
  };
  totals: {
    openOrders: number;
    projectedOnTime: number;
    waitingParts: number;
    unassigned: number;
    atRisk: number;
    customerRepair: number;
    inventoryRecon: number;
  };
  pipeline: Array<{ key: string; label: string; count: number; wipLimit: number | null; wipBreached: boolean }>;
  items: Item[];
  reviews: { quality: number; comebacks: number };
  approvals: { estimate: number };
  capability: {
    partsRecommendations: string;
    externalAdapters: string;
    automaticDiscipline: string;
  };
};

function withReturnTo(href: string, returnTo?: string) {
  if (!returnTo) return href;
  const separator = href.includes("?") ? "&" : "?";
  return `${href}${separator}returnTo=${encodeURIComponent(returnTo)}`;
}

export function ShopReconLanding({
  initialBlocker = "all",
  model,
  returnTo,
  showAdvisorReturn = false,
  showWorkspaceReturn = false,
}: {
  initialBlocker?: string;
  model: Model;
  returnTo?: string;
  showAdvisorReturn?: boolean;
  showWorkspaceReturn?: boolean;
}) {
  const now = new Date(model.generatedAt);
  const dateKey = now.toISOString().slice(0, 10);
  const overdue = model.items.filter((item) => new Date(item.targetAt) < now).length;
  const dueToday = model.items.filter((item) => item.targetAt.slice(0, 10) === dateKey).length;
  const partsReadiness = model.totals.openOrders
    ? Math.round(
        ((model.totals.openOrders - model.totals.waitingParts) / model.totals.openOrders) *
          100,
      )
    : 100;

  const repairWorkbenchHref = withReturnTo("/vehicles/repair-workbench", returnTo);
  const partsOperationsHref = withReturnTo("/vehicles/parts-operations", returnTo);

  const columns = [
    { key: "entry", label: "Entry & Triage", from: 1, to: 4 },
    { key: "diagnosis", label: "Inspect & Diagnose", from: 5, to: 7 },
    { key: "approval", label: "Plan & Approval", from: 8, to: 9 },
    { key: "parts", label: "Parts Readiness", from: 10, to: 10 },
    { key: "dispatch", label: "Ready & Assigned", from: 11, to: 12 },
    { key: "repair", label: "Repair & Complete", from: 13, to: 14 },
    { key: "quality", label: "QC & Handoff", from: 15, to: 16 },
  ].map(column => ({ ...column, items: model.items.filter(item => item.shopLifecycleOrder >= column.from && item.shopLifecycleOrder <= column.to) }));
  const pilotItems = model.items.filter(item => item.pilot);

  const allBlockers = model.items.filter(
    (item) => item.blocker || item.waitingParts || item.approvalPending || item.atRisk,
  );
  const blockers = allBlockers
    .filter((item) =>
      initialBlocker === "parts"
        ? item.waitingParts
        : initialBlocker === "approvals"
          ? item.approvalPending
          : initialBlocker === "vendors"
            ? /vendor/i.test(item.blocker ?? "")
            : true,
    )
    .slice(0, 5);

  const technicians = [
    ...new Set(
      model.items.map((item) => item.technician).filter((value): value is string => Boolean(value)),
    ),
  ].map((name) => ({
    name,
    assigned: model.items.filter((item) => item.technician === name).length,
  }));

  const decisionRows = [
    ...model.items
      .filter((item) => item.qcPending > 0)
      .map((item) => ({
        ...item,
        decision: "Quality review",
        action: "Review",
        href: withReturnTo(`/vehicles/quality-control?repairOrderId=${encodeURIComponent(item.id)}`, returnTo),
      })),
    ...model.items
      .filter((item) => item.approvalPending)
      .map((item) => ({
        ...item,
        decision: "Recon estimate approval",
        action: "Review",
        href: withReturnTo(`/vehicles/repair-workbench?repairOrderId=${encodeURIComponent(item.id)}`, returnTo),
      })),
  ];

  const mediumRisk = model.items.filter(
    (item) => !item.atRisk && (item.waitingParts || item.approvalPending),
  ).length;
  const lowRisk = Math.max(0, model.totals.openOrders - model.totals.atRisk - mediumRisk);

  return (
    <section
      aria-label={`Shop and Recon; Customer Repair ${model.totals.customerRepair}; Inventory Recon ${model.totals.inventoryRecon}; ${model.freshness}; ${model.contractVersion}; External adapters: ${model.capability.externalAdapters}`}
      className="shop-r7-landing visual-console-page"
    >
      <header className="vcp-header">
        <div>
          {returnTo ? (
            <Link href={returnTo}>← Return to inventory lifecycle</Link>
          ) : showAdvisorReturn ? (
            <BackToServiceAdvisorWorkspace />
          ) : showWorkspaceReturn ? (
            <BackToVehicleOperationsWorkspace />
          ) : null}
          <p>Inventory Console</p>
          <h1>Shop &amp; Recon</h1>
          <span>Daily production, capacity, and obstacle management</span>
        </div>
        <div className="vcp-actions">
          <Link className="vcp-primary" href="/vehicles/repair-orders?intakeSource=WALK_IN">
            <ClipboardPlus size={15} />
            Check In Vehicle
          </Link>
          <Link href={repairWorkbenchHref}>
            <ClipboardList size={15} />
            Repair Workbench
          </Link>
          <Link href={partsOperationsHref}>
            <PackageOpen size={15} />
            Parts Operations
          </Link>
          <button disabled title="Saved views are not activated for Shop & Recon">
            Saved Views
          </button>
          <button disabled title="Export activation is pending">
            <Download size={15} />
            Export
          </button>
        </div>
      </header>

      <section className="vcp-filter-bar" aria-label="Shop and Recon filters">
        <label>
          Location
          <select disabled>
            <option>All permitted locations</option>
          </select>
        </label>
        <label>
          Work Type
          <select disabled>
            <option>All work</option>
          </select>
        </label>
        <label>
          Technician
          <select disabled>
            <option>All technicians</option>
          </select>
        </label>
        <label>
          Vendor
          <select disabled>
            <option>All vendors</option>
          </select>
        </label>
        <label>
          Status
          <select disabled>
            <option>All states</option>
          </select>
        </label>
        <label>
          Date
          <select disabled>
            <option>{now.toLocaleDateString()}</option>
          </select>
        </label>
      </section>

      <section className="vcp-panel" aria-label="Shop foundation configuration">
        <header>
          <div>
            <strong>Controlled Shop Foundation</strong>
            <span>{model.foundation.contractVersion} · {model.foundation.configurationStatus.replaceAll("_", " ").toLowerCase()}</span>
          </div>
        </header>
        <div className="shop-parts-facts">
          <p>
            <span>Lifecycle</span>
            <strong>{model.foundation.stages.length} stages</strong>
          </p>
          <p>
            <span>Operating window</span>
            <strong>Mon-Fri · 9 AM-6 PM</strong>
          </p>
          <p>
            <span>Repair capacity</span>
            <strong>{model.foundation.wipLimits.operatingRepairBays} shared bays</strong>
          </p>
          <p>
            <span>Primary technician</span>
            <strong>{model.foundation.staffing.find(person => person.role === "PRIMARY_TECHNICIAN")?.name ?? "Unconfirmed"}</strong>
          </p>
          <p>
            <span>Activation</span>
            <strong>{model.foundation.activation.workflowTransitions === "ACTIVE_GOVERNED_TRANSITIONS" ? "Governed live" : "Review required"}</strong>
          </p>
        </div>
      </section>

      <section className="vcp-panel" aria-label="Sixteen-stage Shop and Recon lifecycle">
        <header>
          <div>
            <strong>Live 16-Stage Lifecycle</strong>
            <span>Derived from current repair evidence; no manual status invention</span>
          </div>
        </header>
        <div className="shop-parts-facts">
          {model.pipeline.map(stage => (
            <p key={stage.key}>
              <span>{stage.label}</span>
              <strong>
                {stage.count}{stage.wipLimit === null ? "" : ` / ${stage.wipLimit}`}{stage.wipBreached ? " · WIP HOLD" : ""}
              </strong>
            </p>
          ))}
        </div>
      </section>

      <Link className="sr-only" href="/vehicles/control-tower">
        Inventory Control Tower
      </Link>

      <section className="vcp-kpis vcp-kpis-seven" aria-label="Shop and Recon KPIs">
        {[
          { icon: Wrench, label: "In Shop", value: model.totals.openOrders, detail: "Open repair orders", tone: "blue" },
          { icon: UserRound, label: "Ready to Assign", value: model.totals.unassigned, detail: "Needs accountable owner", tone: "blue" },
          { icon: CalendarDays, label: "Due Today", value: dueToday, detail: "Current target date", tone: "amber" },
          { icon: AlertTriangle, label: "Overdue", value: overdue, detail: "Target passed", tone: "red" },
          { icon: PackageOpen, label: "Parts Readiness", value: `${partsReadiness}%`, detail: `${model.totals.waitingParts} waiting`, tone: "orange" },
          { icon: CheckCircle2, label: "Completed Today", value: "—", detail: "Closure history unavailable", tone: "green" },
          { icon: Clock3, label: "Avg. Cycle Time", value: "—", detail: "History unavailable", tone: "purple" },
        ].map(({ icon: Icon, label, value, detail, tone }) => (
          <article className={`vcp-kpi tone-${tone}`} key={label}>
            <Icon size={21} />
            <span>
              {label}
              <strong>{value}</strong>
              <small>{detail}</small>
            </span>
          </article>
        ))}
      </section>

      <div className="shop-lane-legend" aria-label="Vehicle ownership lane legend">
        <span className="lane-inventory"><Building2 size={13} /> Inventory Recon · dark blue</span>
        <span className="lane-customer"><UserRound size={13} /> Customer Vehicle · bright blue</span>
        <small>Amber and red remain reserved for timing risk and blockers.</small>
      </div>

      {pilotItems.length ? <section className="shop-pilot-launchpad" aria-label="Shop and Recon operational pilots"><header><FlaskConical /><div><strong>16-Stage Operational Pilot</strong><small>Use these controlled records to validate the normal journey and exception safeguards.</small></div><b>{pilotItems.length} ready</b></header><div>{pilotItems.map(item => <Link className={item.workLane === "INVENTORY_RECON" ? "inventory" : "customer"} href={withReturnTo(`/vehicles/shop-recon/${encodeURIComponent(item.id)}`, returnTo)} key={item.id}><span><b>Pilot</b>{item.workLaneLabel}</span><strong>{item.repairOrderNumber} · {item.vehicle}</strong><small>Stage {item.shopLifecycleOrder} of 16 · {item.shopLifecycleLabel}</small><p>{item.pilot?.objective}</p><footer>Expected exit: {item.pilot?.expectedHandoff}</footer></Link>)}</div></section> : null}

      <section className="shop-board" aria-label="Shop production board">
        {columns.map((column) => (
          <article
            className={column.key === "parts" && column.items.length ? "attention" : ""}
            key={column.key}
          >
            <header>
              <div>
                <strong>{column.label}</strong>
                <small>{column.items.length ? `${column.items.length} work items` : "No current work"}</small>
              </div>
              <b>{column.items.length}</b>
            </header>
            <div>
              {column.items.slice(0, 3).map((item) => (
                <Link
                  className={`shop-vehicle-card ${item.workLane === "INVENTORY_RECON" ? "lane-inventory" : "lane-customer"}`}
                  href={withReturnTo(
                    `/vehicles/shop-recon/${encodeURIComponent(item.id)}`,
                    returnTo,
                  )}
                  key={item.id}
                >
                  <header className="shop-vehicle-card-header">
                    <div>
                      <span className="shop-work-lane">
                        {item.workLane === "INVENTORY_RECON" ? <Building2 size={10} /> : <UserRound size={10} />}
                        {item.workLaneLabel}
                        {item.pilot ? <b className="shop-pilot-badge">Pilot</b> : null}
                      </span>
                      <strong>{item.vehicle}</strong>
                    </div>
                    <span
                      className={
                        item.atRisk
                          ? "high"
                          : item.waitingParts || item.approvalPending
                            ? "medium"
                            : "standard"
                      }
                    >
                      {item.atRisk
                        ? item.priorityBand
                        : item.waitingParts || item.approvalPending
                          ? "Medium"
                          : item.priorityBand}
                    </span>
                  </header>
                  <small>
                    {item.repairOrderNumber} · {item.subject}
                  </small>
                  <small>
                    Stage {item.shopLifecycleOrder}: {item.shopLifecycleLabel} · {item.shopZoneCode}
                  </small>
                  <small>{item.stageTargetBand.replaceAll("_", " ")} · {item.stageElapsedMinutes} staffed min · Priority {item.priorityScore}</small>
                  <small>{item.authorizationPath} · {item.completionHandoff}</small>
                  <p>{item.blocker ?? item.nextAction}</p>
                  <footer>
                    <em>
                      <i>
                        {(item.technician ?? item.owner)
                          .split(" ")
                          .map((part) => part[0])
                          .join("")
                          .slice(0, 2)}
                      </i>
                      {item.technician ?? item.owner}
                    </em>
                    <time dateTime={item.targetAt}>
                      {item.commitmentLabel}
                      <br />
                      {new Date(item.targetAt).toLocaleString()}
                    </time>
                  </footer>
                </Link>
              ))}
            </div>
            {column.items.length > 3 ? (
              <Link className="shop-board-more" href={repairWorkbenchHref}>
                + {column.items.length - 3} more
              </Link>
            ) : null}
            {!column.items.length ? <p className="shop-board-empty">No current work</p> : null}
          </article>
        ))}
      </section>

      <div className="shop-operations-grid">
        <section className="vcp-panel shop-capacity">
          <header>
            <strong>Capacity &amp; Assignment</strong>
            <Link href="/vehicles/shop-dispatch">Assign Work</Link>
          </header>
          <div className="shop-mini-head">
            <span>Technician</span>
            <span>Assigned / Capacity</span>
            <span>Available</span>
          </div>
          {technicians.map((technician) => (
            <p key={technician.name}>
              <strong>{technician.name}</strong>
              <span>{technician.assigned} / — hrs</span>
              <em>—</em>
            </p>
          ))}
          {!technicians.length ? (
            <p className="vcp-empty">Technician capacity facts are unavailable.</p>
          ) : null}
          <Link className="shop-panel-all" href="/vehicles/shop-dispatch">
            View all technicians
          </Link>
        </section>

        <section className="vcp-panel shop-blockers">
          <header>
            <strong>Blocker Center</strong>
            <Link href={repairWorkbenchHref}>All blockers</Link>
          </header>
          <nav aria-label="Blocker categories">
            <Link
              aria-current={initialBlocker === "all" ? "page" : undefined}
              className={initialBlocker === "all" ? "active" : ""}
              href={withReturnTo("/vehicles/shop-recon", returnTo)}
            >
              All Blockers
            </Link>
            <Link
              aria-current={initialBlocker === "parts" ? "page" : undefined}
              className={initialBlocker === "parts" ? "active" : ""}
              href={withReturnTo("/vehicles/shop-recon?blocker=parts", returnTo)}
            >
              Parts
            </Link>
            <Link
              aria-current={initialBlocker === "approvals" ? "page" : undefined}
              className={initialBlocker === "approvals" ? "active" : ""}
              href={withReturnTo("/vehicles/shop-recon?blocker=approvals", returnTo)}
            >
              Approvals
            </Link>
            <Link
              aria-current={initialBlocker === "vendors" ? "page" : undefined}
              className={initialBlocker === "vendors" ? "active" : ""}
              href={withReturnTo("/vehicles/shop-recon?blocker=vendors", returnTo)}
            >
              Vendors
            </Link>
          </nav>
          <div className="shop-blocker-head">
            <span>Blocker</span>
            <span>Impacted</span>
            <span>Age</span>
            <span>Owner</span>
            <span>Escalation</span>
            <span>Action</span>
          </div>
          {blockers.map((item) => (
            <Link
              href={withReturnTo(
                `/vehicles/repair-workbench?repairOrderId=${encodeURIComponent(item.id)}`,
                returnTo,
              )}
              key={item.id}
            >
              <AlertTriangle size={14} />
              <span>
                <strong>
                  {item.blocker ??
                    (item.waitingParts
                      ? "Part backorder"
                      : item.approvalPending
                        ? "Approval pending"
                        : "Promise at risk")}
                </strong>
              </span>
              <span>1 vehicle</span>
              <span>—</span>
              <span>{item.owner}</span>
              <em>{item.atRisk ? "At risk" : "Monitor"}</em>
              <b>View</b>
            </Link>
          ))}
          {!blockers.length ? (
            <p className="vcp-empty">
              No current {initialBlocker === "all" ? "" : `${initialBlocker} `}blockers.
            </p>
          ) : null}
          <Link className="shop-panel-all" href={repairWorkbenchHref}>
            View all blockers
          </Link>
        </section>

        <section className="vcp-panel shop-decisions">
          <header>
            <strong>Reviews &amp; Approvals</strong>
            <Link href="/manager-review?scope=shop">View all</Link>
          </header>
          <nav aria-label="Shop decision categories">
            <Link className="active" href="/manager-review?scope=shop&view=reviews">
              Reviews <b>{model.reviews.quality + model.reviews.comebacks}</b>
            </Link>
            <Link href="/manager-review?scope=shop&view=approvals">
              Approvals <b>{model.approvals.estimate}</b>
            </Link>
          </nav>
          <div className="shop-decision-head">
            <span>Item</span>
            <span>Age</span>
            <span>Owner</span>
            <span>Amount</span>
            <span>Action</span>
          </div>
          {decisionRows.slice(0, 5).map((item) => (
            <Link href={item.href} key={`${item.decision}:${item.id}`}>
              <span>
                <strong>{item.decision}</strong>
                <small>
                  {item.vehicle} · {item.repairOrderNumber}
                </small>
              </span>
              <span>—</span>
              <span>{item.owner}</span>
              <span>—</span>
              <b>{item.action}</b>
            </Link>
          ))}
          {!decisionRows.length ? (
            <p className="vcp-empty">No governed reviews or approvals.</p>
          ) : null}
          <Link className="shop-panel-all" href="/manager-review?scope=shop">
            View all reviews &amp; approvals
          </Link>
        </section>
      </div>

      <section className="shop-analytics-grid">
        <article className="vcp-panel">
          <header>
            <div>
              <strong>Daily Throughput</strong>
              <span>Current production snapshot · history unavailable</span>
            </div>
          </header>
          <div className="vcp-column-chart">
            {columns.map((column) => (
              <div key={column.key}>
                <span
                  style={{
                    "--bar": `${Math.max(
                      4,
                      (column.items.length /
                        Math.max(1, ...columns.map((item) => item.items.length))) *
                        100,
                    )}%`,
                  } as CSSProperties}
                >
                  <b>{column.items.length}</b>
                </span>
                <small>{column.label}</small>
              </div>
            ))}
          </div>
        </article>

        <article className="vcp-panel">
          <header>
            <div>
              <strong>Parts Operations</strong>
              <span>Readiness and constrained work</span>
            </div>
          </header>
          <div className="shop-parts-facts">
            <p>
              <span>Jobs ready to start</span>
              <strong>{Math.max(0, model.totals.openOrders - model.totals.waitingParts)}</strong>
            </p>
            <p>
              <span>Backordered jobs</span>
              <strong>{model.totals.waitingParts}</strong>
            </p>
            <p>
              <span>Parts arriving today</span>
              <strong>—</strong>
            </p>
            <p>
              <span>Receipt discrepancies</span>
              <strong>—</strong>
            </p>
            <p>
              <span>Core / warranty recovery at risk</span>
              <strong>—</strong>
            </p>
          </div>
          <Link className="shop-panel-all" href={partsOperationsHref}>
            Open Parts Operations →
          </Link>
        </article>

        <article className="vcp-panel vcp-aging">
          <header>
            <div>
              <strong>At-Risk Completion</strong>
              <span>Current open repair orders</span>
            </div>
          </header>
          <div>
            <div
              className="vcp-donut"
              style={{
                background: `conic-gradient(#df2736 0 ${
                  model.totals.openOrders
                    ? (model.totals.atRisk / model.totals.openOrders) * 100
                    : 0
                }%, #f39a05 0 ${
                  model.totals.openOrders
                    ? ((model.totals.atRisk + mediumRisk) / model.totals.openOrders) * 100
                    : 0
                }%, #0a8a4e 0)`,
              }}
            >
              <span>
                <strong>{model.totals.atRisk + mediumRisk}</strong>
                <small>Vehicles at risk</small>
              </span>
            </div>
            <ul>
              <li>
                <i style={{ background: "#df2736" }} />
                <span>High risk</span>
                <strong>{model.totals.atRisk}</strong>
              </li>
              <li>
                <i style={{ background: "#f39a05" }} />
                <span>Medium risk</span>
                <strong>{mediumRisk}</strong>
              </li>
              <li>
                <i style={{ background: "#0a8a4e" }} />
                <span>Low risk</span>
                <strong>{lowRisk}</strong>
              </li>
            </ul>
          </div>
        </article>
      </section>
    </section>
  );
}
