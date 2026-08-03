import { AlertTriangle, Boxes, CarFront, Clock3, Gauge, Landmark, Wrench } from "lucide-react";
import Link from "next/link";

import { buildInventoryLifecycleHref } from "@/features/inventory/lifecycle/shell";
import type { InventoryControlTowerBaseProjection, InventoryControlTowerProjection } from "@/server/inventory-control-tower/service";
import { buildVehicleLifecycleCardProjection } from "@/server/inventory-execution/vehicle-card-projection";

import { ExpandedVehicleCommandCard } from "./vehicle-lifecycle-card";

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const formatCurrency = (cents: number) => currency.format(cents / 100);

const isConnected = (
  projection: InventoryControlTowerProjection | InventoryControlTowerBaseProjection,
): projection is InventoryControlTowerProjection => "crossLane" in projection;

export function InventoryControlTower({
  projection,
  backHref = "/vehicles/inventory",
}: {
  projection: InventoryControlTowerProjection | InventoryControlTowerBaseProjection;
  backHref?: string;
}) {
  const connected = isConnected(projection) ? projection : null;
  const selected = projection.selectedAsset;
  const avgStageDays = projection.totals.units
    ? projection.byStage.reduce(
        (sum, stage) => sum + (stage.averageStageAgeDays ?? 0) * stage.count,
        0,
      ) / projection.totals.units
    : 0;
  const reconWip =
    projection.byStage.find((stage) => stage.stage === "RECONDITIONING")?.count ?? 0;
  const agedExposure = projection.agingBands
    .filter((band) => ["31_45", "46_60", "61_plus"].includes(band.key))
    .reduce((sum, band) => sum + band.exposureCents, 0);
  const retailHealth = projection.totals.units
    ? Math.round(
        ((projection.totals.units - projection.totals.overdue) / projection.totals.units) *
          100,
      )
    : 100;
  const shopHealth = connected?.crossLane.activeOrders
    ? Math.max(
        0,
        Math.round(
          ((connected.crossLane.activeOrders - connected.crossLane.blockedOrders) /
            connected.crossLane.activeOrders) *
            100,
        ),
      )
    : null;
  const partsHealth = connected?.crossLane.waitingPartDemands
    ? Math.max(
        0,
        Math.round(
          (1 -
            connected.crossLane.unreservedPartUnits /
              Math.max(
                1,
                connected.crossLane.waitingPartDemands +
                  connected.crossLane.unreservedPartUnits,
              )) *
            100,
        ),
      )
    : null;
  const confidence =
    projection.dataQualityGrade === "A"
      ? 96
      : projection.dataQualityGrade === "B"
        ? 82
        : 65;

  const vehicleCard = selected
    ? buildVehicleLifecycleCardProjection({
        inventoryUnit: {
          ...selected,
          owner: selected.ownerUser.name,
          location: selected.location.name,
        },
        context: connected?.selectedContext ?? null,
        freshness: projection.freshness,
      })
    : null;

  const lifecycleHref = selected
    ? buildInventoryLifecycleHref(selected.id)
    : buildInventoryLifecycleHref();

  const rollupNow = new Date();
  const readinessRollup = projection.items.reduce(
    (total, item) => {
      if (item.operatingState === "BLOCKED") total.blocked += 1;
      if (item.targetAt < rollupNow) total.overdue += 1;
      if (item.operatingState === "ACTIVE" && item.targetAt >= rollupNow) total.ready += 1;
      return total;
    },
    { blocked: 0, overdue: 0, ready: 0 },
  );

  const agingByStage = [...projection.byStage]
    .sort(
      (left, right) =>
        (right.averageStageAgeDays ?? 0) - (left.averageStageAgeDays ?? 0),
    )
    .slice(0, 3);

  const towerHref = (context: { stage?: string; inventoryUnitId?: string }) => {
    const params = new URLSearchParams({ returnTo: backHref });
    if (projection.filters.locationId) params.set("locationId", projection.filters.locationId);
    if (context.stage) params.set("stage", context.stage);
    if (context.inventoryUnitId) params.set("inventoryUnitId", context.inventoryUnitId);
    return `/vehicles/control-tower?${params.toString()}`;
  };

  const retailNode = (label: string, stages: string[]) => {
    const matches = projection.byStage.filter((stage) => stages.includes(stage.stage));
    const count = matches.reduce((sum, stage) => sum + stage.count, 0);
    const age = count
      ? matches.reduce(
          (sum, stage) => sum + (stage.averageStageAgeDays ?? 0) * stage.count,
          0,
        ) / count
      : 0;

    return {
      label,
      count,
      meta: `${age.toFixed(0)}d`,
      attention: matches.some((stage) => stage.blocked > 0 || stage.overdue > 0),
      href: matches[0] ? towerHref({ stage: matches[0].stage }) : backHref,
    };
  };

  const flowNodes = [
    { label: "Source", count: "—", meta: "—", href: "/vehicles/acquisition-appraisal" },
    { label: "Appraise", count: "—", meta: "—", href: "/vehicles/acquisition-appraisal" },
    retailNode("Acquire", ["PURCHASED_OR_TRADE_IN"]),
    retailNode("Receive", ["TRANSPORTATION", "RECEIVED"]),
    retailNode("Inspect", ["INSPECTION"]),
    retailNode("Recon Handoff", ["RECONDITIONING"]),
    retailNode("Title", ["TITLE_DOCUMENT_READINESS"]),
    retailNode("Merchandise", ["PHOTOGRAPHY_MERCHANDISING"]),
    retailNode("Frontline", ["FRONTLINE_READY"]),
    retailNode("Deal", ["RESERVED_DEAL_PENDING"]),
    retailNode("Sold", ["SOLD"]),
    retailNode("Delivered", ["DELIVERED", "WHOLESALED_OR_OTHER_DISPOSITION"]),
  ];

  const shopNodes = connected
    ? [
        { label: "Intake", count: connected.crossLane.activeOrders, meta: "Open" },
        { label: "Diagnose", count: connected.crossLane.openJobs, meta: "Jobs" },
        {
          label: "Estimate",
          count: connected.decisions.approvals,
          meta: "Decisions",
        },
        {
          label: "Approve",
          count: connected.decisions.approvals,
          meta: "Pending",
        },
        {
          label: "Order Parts",
          count: connected.crossLane.waitingPartDemands,
          meta: "Demand",
          attention: connected.crossLane.waitingPartDemands > 0,
        },
        { label: "Repair", count: connected.crossLane.openJobs, meta: "WIP" },
        { label: "QC", count: connected.crossLane.qcPassedJobs, meta: "Passed" },
        {
          label: "Inventory Handoff",
          count: Math.max(
            0,
            connected.crossLane.qcPassedJobs - connected.crossLane.blockedOrders,
          ),
          meta: "Ready",
        },
      ]
    : [];

  const partsNodes = connected
    ? [
        { label: "Demand", count: connected.crossLane.waitingPartDemands, meta: "Open" },
        { label: "Source", count: connected.crossLane.waitingPartDemands, meta: "Needs" },
        { label: "Compare", count: "—", meta: "—" },
        { label: "PO", count: "—", meta: "—" },
        { label: "Ordered", count: "—", meta: "—" },
        { label: "Received", count: "—", meta: "—" },
        { label: "Binned", count: "—", meta: "—" },
        {
          label: "Reserved",
          count: connected.crossLane.unreservedPartUnits,
          meta: "Unreserved",
          attention: connected.crossLane.unreservedPartUnits > 0,
        },
        { label: "Issued", count: "—", meta: "—" },
        { label: "Installed", count: connected.crossLane.qcPassedJobs, meta: "Jobs" },
        { label: "Reconciled", count: connected.crossLane.qcPassedJobs, meta: "QC" },
      ]
    : [];

  return (
    <section
      aria-label={`Inventory Lifecycle Control Tower; ${projection.freshness}; quality ${projection.dataQualityGrade}`}
      className="ict-exact"
    >
      <nav aria-label="Control Tower workspaces" className="ict-exact-tabs">
        <Link className="active" href="/vehicles/control-tower">
          Control Tower
        </Link>
        <Link href="/vehicles/workflows/add-vehicle?returnTo=%2Fvehicles%2Fcontrol-tower">
          Vehicle Intake
        </Link>
        <Link href="/vehicles/inventory/units">Vehicles</Link>
        <Link href="/vehicles/acquisition-appraisal">Acquisition</Link>
        <Link href="/vehicles/inventory-to-frontline">Recon</Link>
        <Link href="/vehicles/shop-recon">Shop Work</Link>
        <Link href="/vehicles/parts-operations">Parts</Link>
        <Link href="/vehicles/parts-operations?view=purchase-orders">Purchase Orders</Link>
        <Link href="/vehicles/inventory/units?view=locations">Locations</Link>
        <Link href="/vehicles/inventory/units?view=aging">Aging</Link>
        <Link href="/vehicles/workflow-operations">Exceptions</Link>
      </nav>

      <header className="ict-exact-header">
        <div>
          <h1>Inventory Lifecycle Control Tower</h1>
          <p>Protect flow, capital, readiness, and accountable commitments.</p>
        </div>
        <div>
          <Link
            className="ict-exact-primary-action"
            href="/vehicles/workflows/add-vehicle?returnTo=%2Fvehicles%2Fcontrol-tower"
          >
            Start Vehicle Intake
          </Link>
          <Link className="ict-exact-secondary-action" href="/vehicles/registry">
            Find / Create Identity
          </Link>
          <button disabled title="Alternate operating dates are not activated">
            Today
          </button>
          <button
            disabled
            title="Location selection is controlled by the permitted Inventory Lifecycle view"
          >
            Location: All
          </button>
          <button disabled title="Control Tower saved views are not activated">
            Saved Views
          </button>
          <button disabled title="Additional Control Tower filters are not activated">
            Filters
          </button>
          <button disabled title="Use Reports & Exports from Inventory Console Home">
            Export
          </button>
          <button disabled title="Control Tower configuration is managed in Administration">
            Configure
          </button>
        </div>
      </header>

      <div className="ict-exact-shell">
        <main>
          <section className="ict-exact-kpis">
            {[
              {
                icon: Landmark,
                label: "Inventory Capital",
                value: formatCurrency(projection.totals.exposureCents),
              },
              { icon: CarFront, label: "Vehicles", value: projection.totals.units },
              { icon: Clock3, label: "Days to Frontline", value: avgStageDays.toFixed(1) },
              { icon: Wrench, label: "Recon WIP", value: reconWip },
              {
                icon: Gauge,
                label: "Shop Load",
                value: shopHealth === null ? "—" : `${shopHealth}%`,
              },
              {
                icon: Boxes,
                label: "Parts Fill",
                value: partsHealth === null ? "—" : `${partsHealth}%`,
              },
              {
                icon: Clock3,
                label: "Aged Exposure",
                value: formatCurrency(agedExposure),
              },
              {
                icon: AlertTriangle,
                label: "Critical Exceptions",
                value: projection.totals.blocked + projection.totals.overdue,
              },
            ].map(({ icon: Icon, label, value }) => (
              <article key={label}>
                <Icon size={18} />
                <span>
                  {label}
                  <strong>{value}</strong>
                </span>
              </article>
            ))}
          </section>

          <section className="ict-exact-health">
            {[
              ["Retail Flow", retailHealth],
              ["Shop Flow", shopHealth],
              ["Parts Readiness", partsHealth],
              ["Data Confidence", confidence],
            ].map(([label, value]) => (
              <div key={label}>
                <span>{label}</span>
                <strong>{value === null ? "—" : `${value}%`}</strong>
                <i>
                  <b style={{ width: `${value ?? 0}%` }} />
                </i>
              </div>
            ))}
          </section>

          <section className="ict-flow-map">
            <header>
              <strong>Lifecycle Flow Map</strong>
              <span>
                <i className="green" />
                No blocker
                <i className="amber" />
                Waiting
                <i className="red" />
                Critical
                <i className="blue" />
                QC
              </span>
            </header>
            <FlowLane label="Retail Inventory" nodes={flowNodes} tone="retail" />
            <FlowLane
              label="Shop / Recon"
              nodes={shopNodes.map((node) => ({ ...node, href: "/vehicles/shop-recon" }))}
              tone="shop"
            />
            <FlowLane
              label="Repair Parts"
              nodes={partsNodes.map((node) => ({
                ...node,
                href: "/vehicles/parts-operations",
              }))}
              tone="parts"
            />
          </section>

          <div className="ict-exact-work-grid">
            <section className="ict-exact-panel">
              <header>
                <strong>Flow Exceptions</strong>
              </header>
              <div className="ict-exact-table">
                <div className="head">
                  <span>Priority</span>
                  <span>Asset</span>
                  <span>Exception</span>
                  <span>Age</span>
                  <span>Owner</span>
                  <span>Value at Risk</span>
                  <span>Next Action</span>
                </div>
                {projection.priorityWork.slice(0, 5).map((item) => (
                  <Link href={towerHref({ inventoryUnitId: item.id })} key={item.id}>
                    <b
                      className={
                        item.blocker ? "critical" : item.overdue ? "high" : "medium"
                      }
                    >
                      {item.blocker ? "Critical" : item.overdue ? "High" : "Medium"}
                    </b>
                    <span>
                      <strong>{item.inventoryNumber}</strong>
                      <small>{item.vehicle}</small>
                    </span>
                    <span>{item.blocker ?? (item.overdue ? "Target overdue" : item.nextAction)}</span>
                    <em>{item.ageDays}d</em>
                    <span>{item.owner}</span>
                    <span>{formatCurrency(item.exposureCents)}</span>
                    <span>{item.nextAction}</span>
                  </Link>
                ))}
                {!projection.priorityWork.length ? (
                  <p>No current flow exceptions in this permitted scope.</p>
                ) : null}
              </div>
            </section>

            <section className="ict-exact-panel">
              <header>
                <strong>Shop Capacity Board</strong>
                <Link href="/vehicles/shop-dispatch">Optimize Assignment</Link>
              </header>
              <div className="ict-exact-table capacity">
                <div className="head">
                  <span>Technician</span>
                  <span>Current Vehicle / Job</span>
                  <span>Productive Touch Time</span>
                  <span>Next Checkpoint</span>
                  <span>Parts Readiness</span>
                  <span>Est. Finish</span>
                  <span>Bay</span>
                </div>
                <p>Technician assignment and touch-time facts require the Shop capacity projection.</p>
              </div>
            </section>
          </div>

          <section className="ict-exact-panel ict-exact-portfolio">
            <header>
              <strong>Capital &amp; Aging Portfolio</strong>
            </header>
            <div className="aging">
              <header>
                <span>Aging Distribution</span>
                <span>Vehicles</span>
                <span>Capital Exposure</span>
              </header>
              {projection.agingBands.map((band) => (
                <p key={band.key}>
                  <span>{band.label}</span>
                  <i>
                    <b
                      style={{
                        width: `${
                          projection.totals.units
                            ? Math.max(3, (band.count / projection.totals.units) * 100)
                            : 0
                        }%`,
                      }}
                    />
                  </i>
                  <strong>{band.count}</strong>
                  <em>{formatCurrency(band.exposureCents)}</em>
                </p>
              ))}
            </div>
            <div className="market">
              <span>Market Fit × Age</span>
              <div>
                <p>Market-fit evidence is unavailable in the current authoritative projection.</p>
              </div>
            </div>
            <div className="actions">
              <strong>Recommended Actions</strong>
              {connected?.decisions.recommendations ? (
                <p>
                  <i className="red" />
                  Disposition review
                  <small>
                    {connected.decisions.recommendations} governed recommendations require
                    human review
                  </small>
                </p>
              ) : (
                <p>
                  <i className="green" />
                  No governed recommendations
                  <small>No eligible recommendation evidence in this scope</small>
                </p>
              )}
            </div>
          </section>

          <section className="ict-exact-panel ict-exact-portfolio">
            <header>
              <strong>Lifecycle Rollups</strong>
            </header>
            <div className="aging">
              <header>
                <span>Blocked units</span>
                <span>Overdue</span>
                <span>Handoff ready</span>
              </header>
              <p>
                <span>Current governed lifecycle</span>
                <strong>{readinessRollup.blocked}</strong>
                <strong>{readinessRollup.overdue}</strong>
                <em>{readinessRollup.ready}</em>
              </p>
            </div>
            <div className="market">
              <span>Aging by stage</span>
              <div>
                {agingByStage.map((stage) => (
                  <p key={stage.stage}>
                    <strong>{stage.label}</strong>
                    <small>
                      {stage.averageStageAgeDays?.toFixed(1) ?? "0.0"} days avg · {stage.count} units
                    </small>
                  </p>
                ))}
              </div>
            </div>
            <div className="actions">
              <strong>Lifecycle command</strong>
              <p>
                <i className="green" />
                Lifecycle shell ready
                <small>
                  Open the governed lifecycle shell for the selected unit to inspect stage
                  history, trail, and handoff readiness.
                </small>
              </p>
              <Link href={lifecycleHref}>Open Inventory Lifecycle Shell</Link>
            </div>
          </section>
        </main>

        {vehicleCard ? (
          <div>
            <ExpandedVehicleCommandCard card={vehicleCard} />
            <section className="ict-exact-panel" style={{ marginTop: 12 }}>
              <header>
                <strong>Lifecycle summary card</strong>
                <Link href={lifecycleHref}>Open lifecycle shell</Link>
              </header>
              <div className="ict-exact-table">
                <div className="head">
                  <span>Inventory unit</span>
                  <span>Current stage</span>
                  <span>Operating state</span>
                  <span>Owner</span>
                  <span>Location</span>
                  <span>Next action</span>
                  <span>Lifecycle</span>
                </div>
                <div>
                  <span>
                    <strong>{selected?.inventoryNumber}</strong>
                    <small>{selected?.vehicle.vin ?? selected?.vehicle.vehicleNumber}</small>
                  </span>
                  <span>{selected?.lifecycleStage.replaceAll("_", " ")}</span>
                  <span>{selected?.operatingState.replaceAll("_", " ")}</span>
                  <span>{selected?.ownerUser.name}</span>
                  <span>{selected?.location.name}</span>
                  <span>{selected?.nextAction}</span>
                  <span>
                    <Link href={lifecycleHref}>Open</Link>
                  </span>
                </div>
              </div>
            </section>
          </div>
        ) : (
          <div className="vehicle-card-empty">
            <CarFront size={28} />
            <h2>Selected inventory unit</h2>
            <p>
              No unit is selected yet. Select an eligible Inventory unit to open its official
              lifecycle card.
            </p>
          </div>
        )}
      </div>

      <footer className="ict-exact-footer">
        <span>
          <i className="retail" />
          Retail Inventory
          <i className="shop" />
          Shop / Recon
          <i className="parts" />
          Parts
          <i className="waiting" />
          Waiting
          <i className="critical" />
          Critical
        </span>
        <span>
          Last synchronized {new Date(projection.generatedAt).toLocaleTimeString()} · Data
          confidence {confidence}%
        </span>
      </footer>
    </section>
  );
}

function FlowLane({
  label,
  tone,
  nodes,
}: {
  label: string;
  tone: string;
  nodes: Array<{
    label: string;
    count: number | string;
    meta: string;
    attention?: boolean;
    href: string;
  }>;
}) {
  return (
    <div className={`ict-flow-lane ${tone}`}>
      <h2>
        {tone === "retail" ? <CarFront /> : tone === "shop" ? <Wrench /> : <Boxes />}
        <span>{label}</span>
      </h2>
      <div>
        {nodes.map((node, index) => (
          <div className="ict-flow-node-wrap" key={`${node.label}-${index}`}>
            <Link className={node.attention ? "attention" : ""} href={node.href}>
              <span>{node.label}</span>
              <strong>{node.count}</strong>
              <small>{node.meta}</small>
            </Link>
            {index < nodes.length - 1 ? <b>›</b> : null}
          </div>
        ))}
      </div>
    </div>
  );
}
