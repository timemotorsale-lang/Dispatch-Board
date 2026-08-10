"use client";

import {
  AlertTriangle,
  ArrowRight,
  Building2,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  Gauge,
  Inbox,
  MessageSquareText,
  PackageCheck,
  Search,
  ShieldCheck,
  Wrench,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import type { ServiceAdvisorWorkspaceModel } from "@/server/advisor-workspace/service";

type Model = ServiceAdvisorWorkspaceModel;
type Action = Model["actionQueue"][number];
type Lane = "MOVE_NOW" | "WAITING" | "AT_RISK" | "READY";

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

function workLane(item: Action) {
  const text = `${item.customerName} ${item.nextAction} ${item.actionReason}`.toLowerCase();
  if (/internal vehicle|inventory|recon|auction|vendor|diego|frontline|listing/.test(text)) return "Inventory recon";
  return "Customer repair";
}

function classify(item: Action): Lane {
  if (item.overdue || item.actionKind === "PROMISE_RISK") return "AT_RISK";
  if (["PARTS_DELAY", "TECHNICIAN_CLARIFICATION", "FOLLOW_UP_SCHEDULED"].includes(item.actionKind)) return "WAITING";
  if (["HANDOFF", "CUSTOMER_UPDATE"].includes(item.actionKind) && /ready|handoff|pickup|complete|quality|listing|frontline/i.test(item.nextAction)) return "READY";
  return "MOVE_NOW";
}

function nextActionLabel(item: Action) {
  if (item.actionKind === "AUTHORIZATION") return workLane(item) === "Inventory recon" ? "Approve recon spend" : "Record customer decision";
  if (item.actionKind === "PARTS_DELAY") return "Open parts desk";
  if (item.actionKind === "TECHNICIAN_CLARIFICATION") return "Review technician note";
  if (item.actionKind === "HANDOFF") return workLane(item) === "Inventory recon" ? "Handoff to frontline" : "Prepare customer handoff";
  if (/vendor|diego|body/i.test(item.nextAction + item.actionReason)) return "Record vendor update";
  return "Open RO";
}

function nextActionHref(item: Action) {
  if (item.actionKind === "PARTS_DELAY") return `/vehicles/service-close-parts?repairOrderId=${encodeURIComponent(item.id)}&returnTo=${encodeURIComponent("/vehicles/recon-repair-advisor")}&returnLabel=${encodeURIComponent("Return to Recon/Repair Advisor")}`;
  if (/vendor|diego|body/i.test(item.nextAction + item.actionReason)) return `/vehicles/repair-workbench?repairOrderId=${encodeURIComponent(item.id)}&tab=repair`;
  return `/vehicles/repair-workbench?repairOrderId=${encodeURIComponent(item.id)}`;
}

function tone(item: Action) {
  if (classify(item) === "AT_RISK") return "risk";
  if (item.actionKind === "PARTS_DELAY") return "parts";
  if (/vendor|diego|body/i.test(item.nextAction + item.actionReason)) return "vendor";
  if (classify(item) === "READY") return "ready";
  return "move";
}

export function ReconRepairAdvisorPrototype({ model }: { model: Model }) {
  const firstName = model.advisor.name.split(" ")[0] ?? "Advisor";
  const cards = useMemo(() => model.actionQueue.map((item) => ({ item, lane: classify(item), workLane: workLane(item) })), [model.actionQueue]);
  const defaultLane = (["MOVE_NOW", "WAITING", "AT_RISK", "READY"] as Lane[]).find((key) => cards.some((card) => card.lane === key)) ?? "MOVE_NOW";
  const [lane, setLane] = useState<Lane>(defaultLane);
  const visible = cards.filter((card) => card.lane === lane);
  const inventoryReconCount = cards.filter((card) => card.workLane === "Inventory recon").length;
  const customerRepairCount = cards.length - inventoryReconCount;
  const needsResponse = model.inbox.filter((item) => item.needsResponse);

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

    <section className="rra-command-strip" aria-label="Recon repair advisor operating snapshot">
      <article><Gauge /><span>Advisor</span><strong>{firstName}</strong><small>Execution cockpit</small></article>
      <article><Wrench /><span>Open work</span><strong>{model.counts.activeRepairOrders}</strong><small>{inventoryReconCount} recon · {customerRepairCount} customer</small></article>
      <article><Inbox /><span>Inbox</span><strong>{model.counts.inboxNeedsResponse}</strong><small>Customer, team, manager</small></article>
      <article><AlertTriangle /><span>Risk</span><strong>{cards.filter((card) => card.lane === "AT_RISK").length}</strong><small>Promise or aging risk</small></article>
    </section>

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
          <Link href="/appointments">Compare current Service Advisor</Link>
        </header>

        <nav className="rra-lanes" aria-label="Recon repair advisor lanes">
          {(["MOVE_NOW", "WAITING", "AT_RISK", "READY"] as Lane[]).map((key) => <button aria-pressed={lane === key} key={key} onClick={() => setLane(key)} type="button">
            <span>{laneLabels[key].label}</span>
            <strong>{cards.filter((card) => card.lane === key).length}</strong>
          </button>)}
        </nav>

        <div className="rra-work-list">
          {visible.length ? visible.map(({ item, workLane }) => <article className={`rra-work-card ${tone(item)}`} key={item.id}>
            <header>
              <span>{workLane}</span>
              <b>{item.overdue ? "Overdue" : dateLabel(item.targetAt)}</b>
            </header>
            <div>
              <h3>{item.repairOrderNumber}</h3>
              <strong>{item.vehicleLabel}</strong>
              <small>{item.customerName} · {stageLabel(item.stage)}</small>
            </div>
            <p>{item.actionReason}</p>
            <footer>
              <span><Clock3 /> {item.nextAction}</span>
              <Link href={nextActionHref(item)}>{nextActionLabel(item)} <ArrowRight /></Link>
            </footer>
          </article>) : <p className="rra-empty"><CheckCircle2 /> No work is currently in this lane. That is the kind of quiet we like.</p>}
        </div>
      </main>

      <aside className="rra-side">
        <section>
          <header><MessageSquareText /><div><strong>Recon/repair inbox</strong><span>Internal and outside communication tied back to the RO.</span></div></header>
          {needsResponse.slice(0, 4).map((item) => <Link href={`/vehicles/repair-workbench?repairOrderId=${encodeURIComponent(item.repairOrderId)}&compose=${item.audience === "MANAGEMENT" ? "management" : item.audience === "TEAM" ? "team" : "customer"}#advisor-response`} key={item.id}>
            <small>{item.audience} · {item.repairOrderNumber}</small>
            <strong>{item.customerName}</strong>
            <span>{item.preview}</span>
          </Link>)}
          {!needsResponse.length ? <p><CheckCircle2 /> No messages need a response.</p> : null}
        </section>

        <section>
          <header><Building2 /><div><strong>Outside vendor loop</strong><span>Direct path for Diego-style updates.</span></div></header>
          <Link href="/vehicles/outside-vendors">Manage outside vendors <ArrowRight /></Link>
          <Link href="/vehicles/repair-workbench?tab=repair">Open vendor repair work <ArrowRight /></Link>
        </section>

        <section>
          <header><PackageCheck /><div><strong>Parts execution</strong><span>Needed, ordered, received, used, and returns.</span></div></header>
          <Link href="/vehicles/service-close-parts">Open parts desk <ArrowRight /></Link>
        </section>

        <section>
          <header><ClipboardCheck /><div><strong>Start or route work</strong><span>Check-in, intake, and governed RO creation.</span></div></header>
          <Link href="/vehicles/repair-orders?intakeSource=WALK_IN">Check in vehicle <ArrowRight /></Link>
          <Link href="/vehicles/shop-recon">Shop & recon board <ArrowRight /></Link>
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
