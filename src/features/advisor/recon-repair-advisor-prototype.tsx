"use client";

import {
  AlertTriangle,
  ArrowRight,
  Building2,
  CarFront,
  CheckCircle2,
  Clock3,
  Gauge,
  Inbox,
  MapPin,
  MessageSquareText,
  PackageCheck,
  Search,
  ShieldCheck,
  TimerReset,
  Wrench,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import type { ServiceAdvisorWorkspaceModel } from "@/server/advisor-workspace/service";

type Model = ServiceAdvisorWorkspaceModel;
type Action = Model["actionQueue"][number];
type Lane = "MOVE_NOW" | "WAITING" | "AT_RISK" | "READY";
const RECON_REPAIR_ADVISOR_HOME = "/vehicles/recon-repair-advisor";

function withReturnTo(href: string, returnTo = RECON_REPAIR_ADVISOR_HOME) {
  const url = new URL(href, "http://advisor-workspace.local");
  url.searchParams.set("returnTo", returnTo);
  return `${url.pathname}${url.search}${url.hash}`;
}

const laneLabels: Record<Lane, { copy: string; label: string }> = {
  AT_RISK: { copy: "Overdue, promise risk, or aging without a clean next step.", label: "At risk" },
  MOVE_NOW: { copy: "The advisor can take action immediately.", label: "Move now" },
  READY: { copy: "Ready for QC, handoff, listing, customer pickup, or next owner.", label: "Ready to move" },
  WAITING: { copy: "Waiting on vendor, technician, parts, customer, or manager.", label: "Waiting on others" },
};

function stageLabel(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function dateLabel(value: string) {
  return new Date(value).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function timeReality(value: string, overdue: boolean) {
  const target = new Date(value).getTime();
  const deltaHours = Math.round((target - Date.now()) / 36e5);
  if (overdue || deltaHours < 0) return { detail: `Target was ${dateLabel(value)}`, label: `${Math.abs(deltaHours)}h overdue`, tone: "late" };
  if (deltaHours <= 24) return { detail: `Target ${dateLabel(value)}`, label: "Due today", tone: "soon" };
  return { detail: `Target ${dateLabel(value)}`, label: `${Math.ceil(deltaHours / 24)}d left`, tone: "ok" };
}

function workLane(item: Action) {
  const text = `${item.customerName} ${item.nextAction} ${item.actionReason}`.toLowerCase();
  if (/internal vehicle|inventory|recon|auction|vendor|diego|frontline|listing/.test(text)) return "Inventory recon";
  return "Customer repair";
}

function vendorWaitingOnOurParts(item: Action) {
  return item.vendorStatus === "WAITING_PARTS" || (item.hasActiveVendorWork && item.unresolvedPartDemandCount > 0);
}

function realStatus(item: Action) {
  const text = `${item.customerName} ${item.nextAction} ${item.actionReason} ${item.actionLabel}`.toLowerCase();
  if (vendorWaitingOnOurParts(item)) return { detail: "The outside vendor is waiting on parts from us before repair work can continue.", label: "Vendor waiting on our parts", tone: "parts" };
  if (/vendor waiting on our parts|waiting on our parts|parts needed by vendor|vendor needs .*part/.test(text)) return { detail: "The outside vendor is waiting on parts from us before repair work can continue.", label: "Vendor waiting on our parts", tone: "parts" };
  if (/part|parts|eta|bumper|airbag|seat belt|retractor/.test(text) || item.actionKind === "PARTS_DELAY") return { detail: "Needed, ordered, received, used, and returns must stay tied to this RO.", label: "Waiting on parts", tone: "parts" };
  if (/diego|body shop|vendor|offsite/.test(text)) return { detail: "Document vendor progress and expected return.", label: "Offsite vendor", tone: "vendor" };
  if (item.actionKind === "TECHNICIAN_CLARIFICATION") return { detail: "Clarification is needed before the advisor can move the vehicle.", label: "Waiting on technician", tone: "waiting" };
  if (item.actionKind === "AUTHORIZATION") return { detail: "A customer or internal spend decision is blocking progress.", label: "Approval needed", tone: "approval" };
  if (item.actionKind === "HANDOFF" || /ready|quality|handoff|frontline|listing|pickup/.test(text)) return { detail: "This vehicle is ready for the next owner in the process.", label: "Ready to move", tone: "ready" };
  if (item.overdue || item.actionKind === "PROMISE_RISK") return { detail: "The promised or target time needs attention.", label: "At risk", tone: "risk" };
  return { detail: item.nextAction, label: stageLabel(item.stage), tone: "move" };
}

function bottleneck(item: Action) {
  const status = realStatus(item);
  if (status.label === "Vendor waiting on our parts") return "Parts";
  if (status.label === "Offsite vendor") return "Vendor";
  if (status.label === "Waiting on parts") return "Parts";
  if (status.label === "Approval needed") return "Approval";
  if (status.label === "Waiting on technician") return "Technician";
  if (item.overdue || item.actionKind === "PROMISE_RISK") return "Promise risk";
  return "No blocker";
}

function classify(item: Action): Lane {
  if (item.overdue || item.actionKind === "PROMISE_RISK") return "AT_RISK";
  if (["PARTS_DELAY", "TECHNICIAN_CLARIFICATION", "FOLLOW_UP_SCHEDULED"].includes(item.actionKind)) return "WAITING";
  if (["HANDOFF", "CUSTOMER_UPDATE"].includes(item.actionKind) && /ready|handoff|pickup|complete|quality|listing|frontline/i.test(item.nextAction)) return "READY";
  return "MOVE_NOW";
}

function nextActionLabel(item: Action) {
  if (vendorWaitingOnOurParts(item)) return "Open parts desk";
  if (item.actionKind === "AUTHORIZATION") return workLane(item) === "Inventory recon" ? "Approve recon spend" : "Record customer decision";
  if (item.actionKind === "PARTS_DELAY") return "Open parts desk";
  if (item.actionKind === "TECHNICIAN_CLARIFICATION") return "Review technician note";
  if (item.actionKind === "HANDOFF") return workLane(item) === "Inventory recon" ? "Handoff to frontline" : "Prepare customer handoff";
  if (/vendor|diego|body/i.test(item.nextAction + item.actionReason)) return "Record vendor update";
  return "Open RO";
}

function primaryAction(item: Action) {
  const status = realStatus(item);
  if (status.label === "Vendor waiting on our parts") return { href: `/vehicles/service-close-parts?repairOrderId=${encodeURIComponent(item.id)}&returnTo=${encodeURIComponent(RECON_REPAIR_ADVISOR_HOME)}&returnLabel=${encodeURIComponent("Return to Recon/Repair Advisor")}`, label: "Buy or update parts" };
  if (status.label === "Offsite vendor") return { href: withReturnTo(`/vehicles/repair-workbench?repairOrderId=${encodeURIComponent(item.id)}&tab=repair#vendor-update`), label: "Record vendor update" };
  if (status.label === "Waiting on parts") return { href: `/vehicles/service-close-parts?repairOrderId=${encodeURIComponent(item.id)}&returnTo=${encodeURIComponent(RECON_REPAIR_ADVISOR_HOME)}&returnLabel=${encodeURIComponent("Return to Recon/Repair Advisor")}`, label: "Buy or update parts" };
  if (status.label === "Approval needed") return { href: withReturnTo(`/vehicles/repair-workbench?repairOrderId=${encodeURIComponent(item.id)}&tab=estimate`), label: "Approve or decide" };
  if (status.label === "Ready to move") return { href: withReturnTo(`/vehicles/repair-workbench?repairOrderId=${encodeURIComponent(item.id)}&tab=quality`), label: "Move to next step" };
  return { href: nextActionHref(item), label: nextActionLabel(item) };
}

function nextActionHref(item: Action) {
  if (vendorWaitingOnOurParts(item)) return `/vehicles/service-close-parts?repairOrderId=${encodeURIComponent(item.id)}&returnTo=${encodeURIComponent(RECON_REPAIR_ADVISOR_HOME)}&returnLabel=${encodeURIComponent("Return to Recon/Repair Advisor")}`;
  if (item.actionKind === "PARTS_DELAY") return `/vehicles/service-close-parts?repairOrderId=${encodeURIComponent(item.id)}&returnTo=${encodeURIComponent(RECON_REPAIR_ADVISOR_HOME)}&returnLabel=${encodeURIComponent("Return to Recon/Repair Advisor")}`;
  if (/vendor|diego|body/i.test(item.nextAction + item.actionReason)) return withReturnTo(`/vehicles/repair-workbench?repairOrderId=${encodeURIComponent(item.id)}&tab=repair`);
  return withReturnTo(`/vehicles/repair-workbench?repairOrderId=${encodeURIComponent(item.id)}`);
}

function tone(item: Action) {
  if (classify(item) === "AT_RISK") return "risk";
  if (vendorWaitingOnOurParts(item)) return "parts";
  if (item.actionKind === "PARTS_DELAY") return "parts";
  if (/vendor|diego|body/i.test(item.nextAction + item.actionReason)) return "vendor";
  if (classify(item) === "READY") return "ready";
  return "move";
}

export function ReconRepairAdvisorPrototype({ model }: { model: Model }) {
  const firstName = model.advisor.name.split(" ")[0] ?? "Advisor";
  const cards = useMemo(() => model.actionQueue.map((item) => ({ item, lane: classify(item), status: realStatus(item), time: timeReality(item.targetAt, item.overdue), workLane: workLane(item) })), [model.actionQueue]);
  const defaultLane = (["MOVE_NOW", "WAITING", "AT_RISK", "READY"] as Lane[]).find((key) => cards.some((card) => card.lane === key)) ?? "MOVE_NOW";
  const [lane, setLane] = useState<Lane>(defaultLane);
  const visible = cards.filter((card) => card.lane === lane);
  const inventoryReconCount = cards.filter((card) => card.workLane === "Inventory recon").length;
  const customerRepairCount = cards.length - inventoryReconCount;
  const needsResponse = model.inbox.filter((item) => item.needsResponse);
  const bottlenecks = ["Vendor", "Parts", "Approval", "Technician", "Promise risk"].map((label) => ({
    count: cards.filter((card) => bottleneck(card.item) === label).length,
    label
  }));
  const currentFocus = cards[0] ?? null;

  return <section className="rra-prototype">
    <header className="rra-hero">
      <div>
        <span>Prototype · live advisor data</span>
        <h1>Recon/Repair Service Advisor</h1>
        <p>One calm cockpit for customer repair and inventory recon: know the vehicle, know the blocker, click the next action, and move the work forward.</p>
      </div>
      <aside>
        <small>Prototype safety</small>
        <strong>Current Service Advisor is untouched</strong>
        <span>Use this page to compare the Rapid Recon-inspired flow before adoption.</span>
      </aside>
    </header>

    <section className="rra-command-strip rra-command-strip-six" aria-label="Recon repair advisor operating snapshot">
      <article><Gauge /><span>Advisor</span><strong>{firstName}</strong><small>Execution cockpit</small></article>
      <article><Wrench /><span>Open work</span><strong>{model.counts.activeRepairOrders}</strong><small>{inventoryReconCount} recon · {customerRepairCount} customer</small></article>
      <article><Inbox /><span>Inbox</span><strong>{model.counts.inboxNeedsResponse}</strong><small>Customer, team, manager</small></article>
      <article><AlertTriangle /><span>Risk</span><strong>{cards.filter((card) => card.lane === "AT_RISK").length}</strong><small>Promise or aging risk</small></article>
      <article><Building2 /><span>Vendor</span><strong>{bottlenecks.find((item) => item.label === "Vendor")?.count ?? 0}</strong><small>Offsite or sublet work</small></article>
      <article><PackageCheck /><span>Parts</span><strong>{bottlenecks.find((item) => item.label === "Parts")?.count ?? 0}</strong><small>Blocking demand</small></article>
    </section>

    {currentFocus ? <section className={`rra-next-best ${currentFocus.status.tone}`}>
      <div>
        <span>Recommended next action</span>
        <h2>{primaryAction(currentFocus.item).label}</h2>
        <p>{currentFocus.item.repairOrderNumber} · {currentFocus.item.vehicleLabel} · {currentFocus.status.label}. {currentFocus.status.detail}</p>
      </div>
      <Link href={primaryAction(currentFocus.item).href}>{primaryAction(currentFocus.item).label} <ArrowRight /></Link>
    </section> : null}

    <form action="/vehicles/repair-orders" className="rra-search" method="get">
      <Search />
      <label>
        <strong>Find vehicle, RO, VIN, stock, customer, or vendor update</strong>
        <input name="search" placeholder="Search the vehicle story and continue the right operation..." type="search" />
      </label>
      <button type="submit">Find work <ArrowRight /></button>
    </form>

    <section className="rra-layout">
      <main className="rra-main">
        <header className="rra-section-header">
          <div>
            <span>What should move next?</span>
            <h2>{laneLabels[lane].label}</h2>
            <p>{laneLabels[lane].copy}</p>
          </div>
          <Link href={withReturnTo("/appointments")}>Compare current Service Advisor</Link>
        </header>

        <nav className="rra-lanes" aria-label="Recon repair advisor lanes">
          {(["MOVE_NOW", "WAITING", "AT_RISK", "READY"] as Lane[]).map((key) => <button aria-pressed={lane === key} key={key} onClick={() => setLane(key)} type="button">
            <span>{laneLabels[key].label}</span>
            <strong>{cards.filter((card) => card.lane === key).length}</strong>
          </button>)}
        </nav>

        <div className="rra-work-list">
          {visible.length ? visible.map(({ item, status, time, workLane }) => <article className={`rra-work-card ${tone(item)}`} key={item.id}>
            <header>
              <span>{workLane}</span>
              <b className={`rra-time ${time.tone}`}>{time.label}</b>
            </header>
            <div>
              <h3>{item.repairOrderNumber}</h3>
              <strong>{item.vehicleLabel}</strong>
              <small>{item.customerName} · {stageLabel(item.stage)}</small>
            </div>
            <dl className="rra-reality">
              <div><dt>Real status</dt><dd>{status.label}</dd></div>
              <div><dt>Bottleneck</dt><dd>{bottleneck(item)}</dd></div>
              <div><dt>Target</dt><dd>{time.detail}</dd></div>
            </dl>
            <p>{item.actionReason}</p>
            <footer>
              <span><Clock3 /> {item.nextAction}</span>
              <Link href={primaryAction(item).href}>{primaryAction(item).label} <ArrowRight /></Link>
            </footer>
          </article>) : <p className="rra-empty"><CheckCircle2 /> No work is currently in this lane. That is the kind of quiet we like.</p>}
        </div>
      </main>

      <aside className="rra-side">
        <section className="rra-bottlenecks">
          <header><TimerReset /><div><strong>Bottleneck board</strong><span>Why vehicles are not moving right now.</span></div></header>
          <div>
            {bottlenecks.map((item) => <span key={item.label}><b>{item.count}</b>{item.label}</span>)}
          </div>
        </section>

        <section>
          <header><MessageSquareText /><div><strong>Recon/repair inbox</strong><span>Internal and outside communication tied back to the RO.</span></div></header>
          {needsResponse.slice(0, 4).map((item) => <Link className="rra-inbox-link" href={withReturnTo(`/vehicles/repair-workbench?repairOrderId=${encodeURIComponent(item.repairOrderId)}&compose=${item.audience === "MANAGEMENT" ? "management" : item.audience === "TEAM" ? "team" : "customer"}#advisor-response`)} key={item.id}>
            <small>{item.audience} · {item.repairOrderNumber}</small>
            <strong>{item.customerName}</strong>
            <span>{item.preview}</span>
          </Link>)}
          {!needsResponse.length ? <p><CheckCircle2 /> No messages need a response.</p> : null}
        </section>

        <section>
          <header><Building2 /><div><strong>Outside vendor loop</strong><span>Assign, update, return, and keep accountability.</span></div></header>
          <Link href={withReturnTo("/vehicles/outside-vendors")}>Manage outside vendors <ArrowRight /></Link>
          <Link href={withReturnTo("/vehicles/repair-workbench?tab=repair")}>Open vendor repair work <ArrowRight /></Link>
        </section>

        <section>
          <header><PackageCheck /><div><strong>Parts execution</strong><span>Needed, ordered, received, used, and returns.</span></div></header>
          <Link href={withReturnTo("/vehicles/service-close-parts")}>Open parts desk <ArrowRight /></Link>
        </section>

        <section>
          <header><Gauge /><div><strong>Estimate & budget discipline</strong><span>TAI, body labor, approvals, and supplements should stay in one fast loop.</span></div></header>
          <Link href={withReturnTo("/vehicles/shop-planning")}>Open recon estimate planning <ArrowRight /></Link>
          <Link href={withReturnTo("/diagnostics/labor-guide")}>Use labor guide <ArrowRight /></Link>
          <Link href={withReturnTo("/approvals")}>Catch spend approvals <ArrowRight /></Link>
        </section>

        <section>
          <header><Clock3 /><div><strong>Cycle time control</strong><span>Keep aging visible by stage, not just by total days in stock.</span></div></header>
          <Link href={withReturnTo("/vehicles/repair-workbench?tab=timeline")}>Open cycle time views <ArrowRight /></Link>
          <Link href={withReturnTo("/vehicles/repair-workbench?tab=communications")}>Review promise-risk updates <ArrowRight /></Link>
        </section>

        <section>
          <header><MapPin /><div><strong>Vehicle movement</strong><span>Keep location and handoff reality visible.</span></div></header>
          <Link href={withReturnTo("/vehicles/repair-orders?intakeSource=INVENTORY_RECON")}>Start inventory recon RO <ArrowRight /></Link>
          <Link href={withReturnTo("/vehicles/repair-workbench?tab=quality")}>Return / ready for QC <ArrowRight /></Link>
          <Link href={withReturnTo("/vehicles/inventory-to-frontline")}>Move to frontline <ArrowRight /></Link>
        </section>

        <section>
          <header><CarFront /><div><strong>Start or route work</strong><span>Check-in, intake, and governed RO creation.</span></div></header>
          <Link href={withReturnTo("/vehicles/repair-orders?intakeSource=WALK_IN")}>Check in vehicle <ArrowRight /></Link>
          <Link href={withReturnTo("/vehicles/repair-workbench")}>Open repair workbench <ArrowRight /></Link>
        </section>

        <section className="rra-principles">
          <header><ShieldCheck /><div><strong>Design rules</strong><span>What this prototype is testing.</span></div></header>
          <ul>
            <li>One vehicle story.</li>
            <li>One recommended next action.</li>
            <li>Customer repair and inventory recon share the same execution language.</li>
            <li>Current Service Advisor remains the fallback until approved.</li>
          </ul>
        </section>
      </aside>
    </section>
  </section>;
}
