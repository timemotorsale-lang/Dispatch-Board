import {
  AlertTriangle,
  ArrowRight,
  Boxes,
  CarFront,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  ClipboardPlus,
  Clock3,
  FileCheck2,
  Flag,
  MapPinned,
  PackageCheck,
  RefreshCw,
  Search,
  ShieldCheck,
  Truck,
  Wrench
} from "lucide-react";
import Link from "next/link";

import type { InventoryHomeData } from "./inventory-console-home";

const number = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

function countStages(data: InventoryHomeData, stages: string[]) {
  return data.byStage
    .filter((item) => stages.includes(item.stage))
    .reduce((sum, item) => sum + item.count, 0);
}

function initials(value: string) {
  return value.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}

export function VehicleOperationsLeadHome({ data }: { data: InventoryHomeData }) {
  const attention = data.totals.blocked + data.totals.overdue + data.totals.waiting;
  const received = countStages(data, ["TRANSPORTATION", "RECEIVED"]);
  const inspection = countStages(data, ["INSPECTION"]);
  const recon = countStages(data, ["RECONDITIONING", "TITLE_DOCUMENT_READINESS"]);
  const merchandising = countStages(data, ["PHOTOGRAPHY_MERCHANDISING"]);
  const frontline = countStages(data, ["FRONTLINE_READY", "RESERVED_DEAL_PENDING"]);
  const shopActive = data.operational?.shop.active ?? null;
  const waitingParts = data.operational?.parts.waitingDemands ?? null;
  const leadQueue = data.priorityWork.slice(0, 5);
  const reviewQueue = data.reviews.items.slice(0, 4);

  const lanes = [
    {
      title: "Receive and lot",
      href: "/vehicles/workflows/add-vehicle",
      Icon: Truck,
      count: received,
      detail: "Arrival, keys, custody, lot placement",
      action: "Receive vehicle"
    },
    {
      title: "Inspect and triage",
      href: "/vehicles/inventory?stage=INSPECTION",
      Icon: Search,
      count: inspection,
      detail: "First look, issue capture, readiness call",
      action: "Open inspection"
    },
    {
      title: "Shop and recon",
      href: "/vehicles/shop-recon",
      Icon: Wrench,
      count: shopActive ?? recon,
      detail: "Production, blockers, QC, promise risk",
      action: "Open shop"
    },
    {
      title: "Parts runner",
      href: "/vehicles/parts-operations",
      Icon: Boxes,
      count: waitingParts ?? 0,
      detail: "Pickup, receiving, returns, waiting demand",
      action: "Open parts"
    },
    {
      title: "Merchandising",
      href: "/vehicles/inventory?stage=PHOTOGRAPHY_MERCHANDISING",
      Icon: FileCheck2,
      count: merchandising,
      detail: "Photos, listing facts, frontline prep",
      action: "Open queue"
    }
  ];

  return (
    <section className="vehicle-operations-lead-home">
      <header className="vol-hero">
        <div>
          <p>Vehicle Operations Lead</p>
          <h1>Move the next vehicle forward</h1>
          <span>Inventory, shop, parts runner, and lot support in one focused workspace.</span>
        </div>
        <nav aria-label="Primary vehicle operations actions">
          <Link className="primary" href="/my-tasks?workspace=vehicle-operations-lead">
            <ClipboardList size={16} /> My Vehicle Work
          </Link>
          <Link href="/vehicles/workflows/add-vehicle">
            <ClipboardPlus size={16} /> Receive Vehicle
          </Link>
          <Link href="/vehicles/shop-recon">
            <Wrench size={16} /> Shop &amp; Recon
          </Link>
        </nav>
      </header>

      <section aria-label="Vehicle operations attention" className="vol-command-strip">
        <article className={attention ? "attention" : ""}>
          <AlertTriangle />
          <span>Needs action</span>
          <strong>{data.freshness === "UNAVAILABLE" ? "-" : number.format(attention)}</strong>
          <small>{data.totals.blocked} blocked, {data.totals.overdue} overdue, {data.totals.waiting} waiting</small>
        </article>
        <article>
          <CarFront />
          <span>Active inventory</span>
          <strong>{data.freshness === "UNAVAILABLE" ? "-" : number.format(data.totals.active)}</strong>
          <small>Permitted vehicle scope</small>
        </article>
        <article>
          <Wrench />
          <span>In shop</span>
          <strong>{shopActive ?? "-"}</strong>
          <small>{data.operational ? `${data.operational.shop.blocked} blocked repair orders` : "Shop facts unavailable"}</small>
        </article>
        <article>
          <PackageCheck />
          <span>Parts constraints</span>
          <strong>{waitingParts ?? "-"}</strong>
          <small>{data.operational ? `${data.operational.parts.unreservedUnits} units unreserved` : "Parts facts unavailable"}</small>
        </article>
        <article>
          <ShieldCheck />
          <span>Exceptions</span>
          <strong>{data.reviews.available ? data.reviews.reviews + data.reviews.approvals : "-"}</strong>
          <small>Reviews and approvals in scope</small>
        </article>
      </section>

      <section className="vol-grid">
        <article className="vol-panel vol-lead-queue">
          <header>
            <div>
              <strong>Start here</strong>
              <span>Only the vehicle work that needs movement now.</span>
            </div>
            <Link href="/vehicles?view=BLOCKED">View all <ArrowRight size={14} /></Link>
          </header>
          {leadQueue.length ? (
            <ol>
              {leadQueue.map((item) => (
                <li key={item.id}>
                  <div className={`vol-tier ${item.tier.toLowerCase()}`}>{item.tier}</div>
                  <div>
                    <strong>{item.vehicle}</strong>
                    <small>Stock # {item.inventoryNumber} | {item.state.replaceAll("_", " ")}</small>
                  </div>
                  <span>{item.issue}</span>
                  <em>{item.overdue ? "Overdue" : `Due ${new Date(item.dueAt).toLocaleDateString()}`}</em>
                  <Link href={`/vehicles/control-tower?inventoryUnitId=${encodeURIComponent(item.id)}`}>
                    {item.nextAction} <ChevronRight size={13} />
                  </Link>
                </li>
              ))}
            </ol>
          ) : (
            <div className="vol-empty"><CheckCircle2 /> No blocked or overdue vehicle work in this view.</div>
          )}
        </article>

        <aside className="vol-panel vol-now">
          <header>
            <strong>Today&apos;s operating pulse</strong>
            <span>{data.generatedAt ? `Updated ${new Date(data.generatedAt).toLocaleTimeString()}` : data.freshness}</span>
          </header>
          <div>
            <span><Clock3 /> Inventory transitions <b>{data.operational?.throughput.inventoryTransitions ?? "-"}</b></span>
            <span><CheckCircle2 /> Repair orders closed <b>{data.operational?.throughput.repairOrdersClosed ?? "-"}</b></span>
            <span><Flag /> Integration exceptions <b>{data.operational?.integration.exceptions ?? "-"}</b></span>
          </div>
          <Link href="/activity?scope=inventory">Open activity log <ArrowRight size={13} /></Link>
        </aside>
      </section>

      <section aria-label="Vehicle operations work modes" className="vol-lanes">
        {lanes.map(({ Icon, action, count, detail, href, title }) => (
          <Link href={href} key={title}>
            <Icon />
            <span>{title}</span>
            <strong>{number.format(count)}</strong>
            <small>{detail}</small>
            <b>{action} <ChevronRight size={12} /></b>
          </Link>
        ))}
      </section>

      <section className="vol-secondary-grid">
        <article className="vol-panel vol-handoff">
          <header>
            <strong>Handoff map</strong>
            <span>Keep work in one canonical record.</span>
          </header>
          <div>
            <Link href="/vehicles/inventory"><RefreshCw /> Inventory Flow <span>{received + inspection + recon + merchandising + frontline}</span></Link>
            <Link href="/vehicles/repair-workbench"><ClipboardList /> Repair Orders <span>{shopActive ?? "-"}</span></Link>
            <Link href="/vehicles/parts-operations"><Boxes /> Parts Runner <span>{waitingParts ?? "-"}</span></Link>
            <Link href="/vehicles/workflows/add-vehicle"><MapPinned /> Receive and Lot <span>{received}</span></Link>
          </div>
        </article>

        <article className="vol-panel vol-exceptions">
          <header>
            <div>
              <strong>Exceptions</strong>
              <span>Lead review without full manager clutter.</span>
            </div>
            <Link href="/manager-review?scope=inventory">Open exceptions</Link>
          </header>
          {reviewQueue.length ? (
            <ol>
              {reviewQueue.map((item) => (
                <li key={item.id}>
                  <i>{initials(item.owner)}</i>
                  <div>
                    <strong>{item.title}</strong>
                    <small>{item.subject} | {item.kind}</small>
                  </div>
                  <Link href={item.actionHref}>{item.actionLabel}</Link>
                </li>
              ))}
            </ol>
          ) : (
            <div className="vol-empty"><CheckCircle2 /> No vehicle operations exceptions in this scope.</div>
          )}
        </article>
      </section>
    </section>
  );
}
