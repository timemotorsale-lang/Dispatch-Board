"use client";

import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  MessageSquareText,
  PackageCheck,
  Search,
  Send,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import type { ServiceAdvisorWorkspaceModel } from "@/server/advisor-workspace/service";

type Action = ServiceAdvisorWorkspaceModel["actionQueue"][number];
type InboxItem = ServiceAdvisorWorkspaceModel["inbox"][number];
export type AdvisorQueueFilter = "ATTENTION" | "ALL" | Action["actionKind"] | "WAITING";
type AdvisorViewMode = "CALM" | "HIGH_VOLUME";
type AdvisorWorkspaceSection = "INBOX" | "WORK";
type InboxFilter = "ALL" | InboxItem["audience"] | "NEEDS_RESPONSE";

function timeLabel(value: string | null) {
  return value ? new Date(value).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "Walk-in";
}

function dateLabel(value: string) {
  return new Date(value).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function stageLabel(value: string) {
  return value.replaceAll("_", " ").toLocaleLowerCase().replace(/^./, (letter) => letter.toUpperCase());
}

function actionTone(kind: Action["actionKind"]) {
  if (kind === "AUTHORIZATION") return "urgent";
  if (kind === "PROMISE_RISK") return "risk";
  if (kind === "PARTS_DELAY") return "parts";
  if (kind === "HANDOFF") return "handoff";
  if (kind === "FOLLOW_UP_SCHEDULED") return "scheduled";
  if (kind === "TECHNICIAN_CLARIFICATION") return "tech";
  return "update";
}

function actionButton(kind: Action["actionKind"]) {
  if (kind === "AUTHORIZATION") return "Record decision";
  if (kind === "PROMISE_RISK") return "Review promise";
  if (kind === "PARTS_DELAY") return "Check ETA";
  if (kind === "HANDOFF") return "Prepare handoff";
  if (kind === "FOLLOW_UP_SCHEDULED") return "Review follow-up";
  if (kind === "TECHNICIAN_CLARIFICATION") return "Review clarification";
  return "Update customer";
}

function matchesFilter(item: Action, filter: AdvisorQueueFilter) {
  if (filter === "ALL") return true;
  if (filter === "ATTENTION") return ["AUTHORIZATION", "PROMISE_RISK", "HANDOFF", "CUSTOMER_UPDATE"].includes(item.actionKind);
  if (filter === "WAITING") return ["PARTS_DELAY", "TECHNICIAN_CLARIFICATION", "FOLLOW_UP_SCHEDULED"].includes(item.actionKind);
  return item.actionKind === filter;
}

const filters: Array<{ id: AdvisorQueueFilter; label: string }> = [
  { id: "ATTENTION", label: "My next actions" },
  { id: "ALL", label: "All" },
  { id: "AUTHORIZATION", label: "Approval" },
  { id: "PROMISE_RISK", label: "Promise risk" },
  { id: "TECHNICIAN_CLARIFICATION", label: "Technician" },
  { id: "PARTS_DELAY", label: "Parts" },
  { id: "HANDOFF", label: "Handoff" },
];

const inboxFilters: Array<{ id: InboxFilter; label: string }> = [
  { id: "NEEDS_RESPONSE", label: "Needs response" },
  { id: "ALL", label: "All conversations" },
  { id: "CUSTOMER", label: "Customers" },
  { id: "TEAM", label: "Internal team" },
  { id: "MANAGEMENT", label: "Management" },
];

function inboxAudienceLabel(audience: InboxItem["audience"]) {
  if (audience === "MANAGEMENT") return "Management";
  if (audience === "TEAM") return "Internal team";
  return "Customer";
}

function inboxActionLabel(item: InboxItem) {
  if (item.audience === "MANAGEMENT") return "Review escalation";
  if (item.audience === "TEAM") return "Respond in RO";
  return item.direction === "INBOUND" ? "Respond to customer" : "Open contact record";
}

function inboxComposeHref(item: InboxItem) {
  const compose = item.audience === "MANAGEMENT" ? "management" : item.audience === "TEAM" ? "team" : "customer";
  return `/vehicles/repair-workbench?repairOrderId=${encodeURIComponent(item.repairOrderId)}&compose=${compose}#advisor-response`;
}

function AdvisorInbox({ compact = false, highVolume, items }: { compact?: boolean; highVolume: boolean; items: InboxItem[] }) {
  const [filter, setFilter] = useState<InboxFilter>(compact ? "NEEDS_RESPONSE" : "NEEDS_RESPONSE");
  const filtered = items.filter((item) => filter === "ALL" || filter === "NEEDS_RESPONSE" ? filter === "ALL" || item.needsResponse : item.audience === filter);
  const [selectedId, setSelectedId] = useState(filtered[0]?.id ?? items[0]?.id ?? "");
  const selected = filtered.find((item) => item.id === selectedId) ?? filtered[0] ?? null;

  if (compact) {
    const needsResponse = items.filter((item) => item.needsResponse);
    const preview = needsResponse.slice(0, 3);
    return <section className="advisor-panel advisor-inbox-preview">
      <header><div><strong>Inbox</strong><span>Customer replies, team responses, and management decisions connected to repair work.</span></div><Link href="/appointments?inbox=all">Open inbox{needsResponse.length ? ` · ${needsResponse.length}` : ""}</Link></header>
      <div>{preview.length ? preview.map((item) => <Link href={`/vehicles/repair-workbench?repairOrderId=${encodeURIComponent(item.repairOrderId)}#advisor-response`} key={item.id}><span className={`advisor-inbox-audience ${item.audience.toLocaleLowerCase()}`}>{inboxAudienceLabel(item.audience)}</span><span><strong>{item.customerName} · {item.repairOrderNumber}</strong><small>{item.preview}</small></span><em>{dateLabel(item.occurredAt)}</em></Link>) : <p className="advisor-empty"><CheckCircle2 /> No conversations currently need a response.</p>}</div>
    </section>;
  }

  return <section className={`advisor-panel advisor-inbox-workspace ${highVolume ? "high-volume" : "calm"}`}>
    <header><div><strong>Unified Inbox</strong><span>Customer contact records and internal collaboration in one repair-order-safe workspace.</span></div><b>{items.filter((item) => item.needsResponse).length} need response</b></header>
    <nav className="advisor-queue-filters" aria-label="Filter advisor inbox">
      {inboxFilters.map((item) => <button aria-pressed={filter === item.id} key={item.id} onClick={() => setFilter(item.id)} type="button">{item.label}</button>)}
    </nav>
    <div className="advisor-inbox-layout">
      <div className="advisor-inbox-list" role="listbox" aria-label="Advisor conversations">
        {filtered.length ? filtered.map((item) => <button aria-selected={selected?.id === item.id} className={selected?.id === item.id ? "selected" : ""} key={item.id} onClick={() => setSelectedId(item.id)} role="option" type="button"><span className={`advisor-inbox-audience ${item.audience.toLocaleLowerCase()}`}>{inboxAudienceLabel(item.audience)}</span><span><strong>{item.customerName}</strong><small>{item.repairOrderNumber} · {item.channel} · {item.direction}</small><p>{item.preview}</p></span><em>{item.needsResponse ? "Needs response" : dateLabel(item.occurredAt)}</em></button>) : <p className="advisor-empty"><CheckCircle2 /> No conversations match this filter.</p>}
      </div>
      <aside className="advisor-inbox-detail" aria-live="polite">
        {selected ? <><header><span className={`advisor-inbox-audience ${selected.audience.toLocaleLowerCase()}`}>{inboxAudienceLabel(selected.audience)}</span><small>{dateLabel(selected.occurredAt)}</small></header><div><small>Repair-order context</small><h2>{selected.customerName}</h2><span>{selected.vehicleLabel} · {selected.repairOrderNumber}</span></div><section><small>Subject</small><strong>{selected.subject}</strong><p>{selected.preview}</p></section><dl><div><dt>Channel</dt><dd>{stageLabel(selected.channel)}</dd></div><div><dt>Direction</dt><dd>{stageLabel(selected.direction)}</dd></div><div><dt>Recorded by</dt><dd>{selected.authorName}</dd></div><div><dt>Transport</dt><dd>{selected.transportState === "RECORDED_CONTACT" ? "Contact recorded — external delivery not verified" : selected.transportState === "ESCALATION_RECORDED" ? "Management escalation recorded" : "Shared in repair-order workspace"}</dd></div>{selected.dueAt ? <div><dt>Response due</dt><dd>{dateLabel(selected.dueAt)}</dd></div> : null}</dl>{selected.audience === "CUSTOMER" ? <p className="advisor-inbox-boundary">SMS and email delivery require a connected communications provider. This record does not claim delivery.</p> : <p className="advisor-inbox-boundary internal">Internal content is never included in customer-facing updates.</p>}<Link href={inboxComposeHref(selected)}><Send /> {inboxActionLabel(selected)}</Link></> : <p className="advisor-empty"><CheckCircle2 /> Choose a conversation to review its repair-order context.</p>}
      </aside>
    </div>
  </section>;
}

export function ServiceAdvisorHome({ initialFilter = "ATTENTION", initialSection = "WORK", model }: { initialFilter?: AdvisorQueueFilter; initialSection?: AdvisorWorkspaceSection; model: ServiceAdvisorWorkspaceModel }) {
  const [filter, setFilter] = useState<AdvisorQueueFilter>(initialFilter);
  const [viewMode, setViewMode] = useState<AdvisorViewMode>("CALM");
  const [selectedActionId, setSelectedActionId] = useState(model.actionQueue[0]?.id ?? "");
  const firstName = model.advisor.name.split(" ")[0] ?? "Advisor";
  const visibleActions = model.actionQueue.filter((item) => matchesFilter(item, filter));
  const selectedAction = visibleActions.find((item) => item.id === selectedActionId) ?? visibleActions[0] ?? null;

  function chooseViewMode(mode: AdvisorViewMode) {
    setViewMode(mode);
  }

  function moveSelection(direction: -1 | 1) {
    if (!visibleActions.length) return;
    const currentIndex = Math.max(0, visibleActions.findIndex((item) => item.id === selectedAction?.id));
    const nextIndex = Math.min(visibleActions.length - 1, Math.max(0, currentIndex + direction));
    setSelectedActionId(visibleActions[nextIndex].id);
  }

  return (
    <section className={`advisor-workspace-home advisor-workspace-simplified ${viewMode === "HIGH_VOLUME" ? "advisor-mode-high-volume" : "advisor-mode-calm"}`}>
      <header className="advisor-hero advisor-hero-simplified">
        <div>
          <p>Service Advisor Workspace</p>
          <h1>Welcome, {firstName}. Who needs you next?</h1>
          <span>One focused queue for arrivals, customer decisions, promises, and repair updates.</span>
        </div>
        <div className="advisor-hero-controls">
          <div className="advisor-view-mode" role="group" aria-label="Advisor workspace display mode">
            <button aria-pressed={viewMode === "CALM"} onClick={() => chooseViewMode("CALM")} type="button">Calm</button>
            <button aria-pressed={viewMode === "HIGH_VOLUME"} onClick={() => chooseViewMode("HIGH_VOLUME")} type="button">High-volume</button>
          </div>
          <Link className="advisor-check-in-primary" href="/vehicles/repair-orders?intakeSource=WALK_IN"><ClipboardCheck /> Check In Vehicle</Link>
        </div>
      </header>

      <form action="/vehicles/repair-orders" className="advisor-search-panel advisor-search-form" method="get" aria-label="Find or check in a customer or vehicle">
        <Search />
        <label>
          <strong>Find or check in a customer, vehicle, appointment, VIN, phone, or RO</strong>
          <input aria-label="Search customer, vehicle, appointment, VIN, phone, or repair order" name="search" placeholder="Start typing a name, phone, VIN, plate, appointment, or RO…" type="search" />
        </label>
        <input name="intakeSource" type="hidden" value="WALK_IN" />
        <button type="submit">Search &amp; check in <Search /></button>
      </form>

      <section className="advisor-focus-counters" aria-label="Advisor operating snapshot">
        <a href="#arrival-queue">
          <CalendarClock />
          <span>Arriving today</span>
          <strong>{model.counts.todaysArrivals}</strong>
          <small>{model.counts.todaysArrivals ? "Review today’s arrivals" : "All arrivals handled"}</small>
        </a>
        <button className={filter === "ATTENTION" ? "active" : ""} onClick={() => setFilter("ATTENTION")} type="button">
          <MessageSquareText />
          <span>Needs me now</span>
          <strong>{model.counts.needsAttention}</strong>
          <small>Customer-facing next actions</small>
        </button>
        <button className={filter === "WAITING" ? "active" : ""} onClick={() => setFilter("WAITING")} type="button">
          <Clock3 />
          <span>Waiting on others</span>
          <strong>{model.counts.waitingOnOthers}</strong>
          <small>Technician, parts, or follow-up</small>
        </button>
      </section>

      {initialSection === "INBOX" ? <AdvisorInbox highVolume={viewMode === "HIGH_VOLUME"} items={model.inbox} /> : <>
      <AdvisorInbox compact highVolume={false} items={model.inbox} />

      <section className="advisor-panel advisor-action-queue advisor-priority-queue">
        <header>
          <div>
            <strong>{filter === "WAITING" ? "Waiting on others" : filter === "AUTHORIZATION" ? "Customer approvals" : "My next actions"}</strong>
            <span>Sorted by urgency and promise time. Each repair order appears once.</span>
          </div>
          <Link href="/vehicles/repair-workbench?view=all">All repair orders</Link>
        </header>
        <nav className="advisor-queue-filters" aria-label="Filter advisor actions">
          {filters.map((item) => (
            <button aria-pressed={filter === item.id} key={item.id} onClick={() => setFilter(item.id)} type="button">{item.label}</button>
          ))}
        </nav>
        {viewMode === "CALM" ? <div>
          {visibleActions.length ? visibleActions.map((item) => (
            <Link className={`advisor-action-card ${actionTone(item.actionKind)}`} href={`/vehicles/repair-workbench?repairOrderId=${encodeURIComponent(item.id)}`} key={`${item.actionKind}-${item.id}`}>
              <span className="advisor-action-type">{item.overdue ? <AlertTriangle /> : item.actionKind === "PARTS_DELAY" ? <PackageCheck /> : <MessageSquareText />}{item.actionLabel}</span>
              <span>
                <strong>{item.customerName} <i>·</i> {item.vehicleLabel}</strong>
                <small>{item.repairOrderNumber} · {stageLabel(item.stage)}</small>
                <span>{item.actionReason}</span>
                {item.latestAdvisorUpdate ? <small>Last note: {item.latestAdvisorUpdate.summary}</small> : null}
              </span>
              <em>{item.overdue ? "Overdue" : dateLabel(item.targetAt)}</em>
              <b><Send /> {actionButton(item.actionKind)}</b>
            </Link>
          )) : (
            <p className="advisor-empty"><CheckCircle2 /> Nothing in this view needs attention. Choose another filter or continue with the next customer.</p>
          )}
        </div> : <div className="advisor-high-volume-layout">
          <div
            aria-label="High-volume advisor action list"
            className="advisor-high-volume-list"
            onKeyDown={(event) => {
              if (event.key === "ArrowDown") { event.preventDefault(); moveSelection(1); }
              if (event.key === "ArrowUp") { event.preventDefault(); moveSelection(-1); }
            }}
            role="listbox"
            tabIndex={0}
          >
            {visibleActions.length ? visibleActions.map((item) => (
              <button aria-selected={selectedAction?.id === item.id} className={`${actionTone(item.actionKind)} ${selectedAction?.id === item.id ? "selected" : ""}`} key={`${item.actionKind}-${item.id}`} onClick={() => setSelectedActionId(item.id)} role="option" type="button">
                <span className="advisor-high-volume-status">{item.overdue ? <AlertTriangle /> : <MessageSquareText />}{item.actionLabel}</span>
                <span><strong>{item.customerName}</strong><small>{item.repairOrderNumber} · {item.vehicleLabel}</small></span>
                <span><b>{item.overdue ? "Overdue" : dateLabel(item.targetAt)}</b><small>{stageLabel(item.stage)}</small></span>
              </button>
            )) : <p className="advisor-empty"><CheckCircle2 /> Nothing in this view needs attention.</p>}
          </div>
          <aside className="advisor-action-preview" aria-live="polite">
            {selectedAction ? <>
              <header>
                <span className={`advisor-action-type ${actionTone(selectedAction.actionKind)}`}>{selectedAction.actionLabel}</span>
                <small>{selectedAction.overdue ? "Promise or target is overdue" : `Target ${dateLabel(selectedAction.targetAt)}`}</small>
              </header>
              <div>
                <p>Selected repair order</p>
                <h2>{selectedAction.customerName}</h2>
                <span>{selectedAction.vehicleLabel} · {selectedAction.repairOrderNumber}</span>
              </div>
              <section>
                <small>Why it needs attention</small>
                <strong>{selectedAction.actionReason}</strong>
              </section>
              <section>
                <small>Recommended next step</small>
                <strong>{selectedAction.nextAction}</strong>
              </section>
              {selectedAction.latestAdvisorUpdate ? <section><small>Last advisor note</small><strong>{selectedAction.latestAdvisorUpdate.summary}</strong></section> : null}
              <Link href={`/vehicles/repair-workbench?repairOrderId=${encodeURIComponent(selectedAction.id)}`}><Send /> {actionButton(selectedAction.actionKind)}</Link>
              <footer>Use ↑ and ↓ while the queue is focused to review the next item.</footer>
            </> : <p className="advisor-empty"><CheckCircle2 /> Select another filter to review advisor work.</p>}
          </aside>
        </div>}
      </section>

      <section className={`advisor-panel advisor-arrivals advisor-arrivals-compact ${model.appointments.length ? "" : "is-empty"}`} id="arrival-queue">
        <header>
          <div>
            <strong>{model.appointments.length ? "Arrivals ready for check-in" : "All expected arrivals are handled"}</strong>
            <span>{model.appointments.length ? "Confirm the customer and vehicle before creating repair work." : "No appointment arrivals are waiting in the current view."}</span>
          </div>
          <Link href="/appointments?view=board">Appointment board</Link>
        </header>
        {model.appointments.length ? <div>
          {model.appointments.map((appointment) => (
            <article key={appointment.id}>
              <time>{timeLabel(appointment.startsAt)}</time>
              <span>
                <strong>{appointment.customerName}</strong>
                <small>{appointment.vehicleLabel} · {appointment.appointmentNumber}</small>
                <small>{appointment.phoneNumber ?? appointment.email ?? appointment.title}</small>
              </span>
              <Link href={`/vehicles/repair-orders?intakeSource=APPOINTMENT&appointmentId=${encodeURIComponent(appointment.id)}`}>Check in</Link>
            </article>
          ))}
        </div> : <p className="advisor-arrivals-clear"><CheckCircle2 /> You’re caught up on arrivals.</p>}
      </section>

      <footer className="advisor-calm-footer">
        <CheckCircle2 />
        <span><strong>Stay customer-centered.</strong> Confirm the concern, make only a supportable promise, and leave every repair order with a clear owner and next update.</span>
        <Link href="/customers"><UsersRound /> Find customer</Link>
      </footer>
      </>}
    </section>
  );
}
