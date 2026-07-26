import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  CarFront,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  MessageSquareText,
  Phone,
  Search,
  Send,
  ShieldCheck,
  UserRound,
  Wrench
} from "lucide-react";
import Link from "next/link";

import type { ServiceAdvisorWorkspaceModel } from "@/server/advisor-workspace/service";

function timeLabel(value: string | null) {
  return value ? new Date(value).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "Walk-in";
}

function dateLabel(value: string) {
  return new Date(value).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function stageLabel(value: string) {
  return value.replaceAll("_", " ").toLocaleLowerCase().replace(/^./, (letter) => letter.toUpperCase());
}

function actionTone(kind: ServiceAdvisorWorkspaceModel["actionQueue"][number]["actionKind"]) {
  if (kind === "AUTHORIZATION") return "urgent";
  if (kind === "PROMISE_RISK") return "risk";
  if (kind === "PARTS_DELAY") return "parts";
  if (kind === "HANDOFF") return "handoff";
  if (kind === "FOLLOW_UP_SCHEDULED") return "scheduled";
  if (kind === "TECHNICIAN_CLARIFICATION") return "tech";
  return "update";
}

export function ServiceAdvisorHome({ model }: { model: ServiceAdvisorWorkspaceModel }) {
  const firstName = model.advisor.name.split(" ")[0] ?? "Advisor";
  const kpis = [
    { icon: CalendarClock, label: "Expected Arrivals", value: model.counts.todaysArrivals, detail: "Scheduled today" },
    { icon: CarFront, label: "Ready to Check In", value: model.counts.waitingCheckIn, detail: "Appointment or walk-in candidates" },
    { icon: Wrench, label: "Open Repair Orders", value: model.counts.activeRepairOrders, detail: "Customer-facing shop work" },
    { icon: MessageSquareText, label: "Customer Handoffs", value: model.counts.handoffs, detail: "Approvals, promises, or updates" }
  ];

  return (
    <section className="advisor-workspace-home">
      <header className="advisor-hero">
        <div>
          <p>Service Advisor Workspace</p>
          <h1>Welcome, {firstName}. Start with the customer.</h1>
          <span>Appointments, walk-ins, check-ins, approvals, and repair-order handoffs in one focused view.</span>
        </div>
        <nav aria-label="Advisor primary actions">
          <Link className="primary" href="/vehicles/repair-orders?intakeSource=WALK_IN"><ClipboardCheck /> Check In Vehicle</Link>
          <Link href="/vehicles/repair-workbench"><Wrench /> Repair Workbench</Link>
          <Link href="/appointments?view=board"><CalendarClock /> Appointment Board</Link>
          <Link href="/customers"><UserRound /> Find Customer</Link>
        </nav>
      </header>

      <section className="advisor-search-panel" aria-label="Advisor search">
        <Search />
        <div>
          <strong>Find arrival, customer, vehicle, appointment, VIN, phone, or RO</strong>
          <span>Search-first intake keeps the advisor from creating duplicate customers, vehicles, or repair orders.</span>
        </div>
        <Link href="/vehicles/repair-orders?intakeSource=WALK_IN">Start guided check-in <ArrowRight /></Link>
      </section>

      <section className="advisor-kpis" aria-label="Advisor operating snapshot">
        {kpis.map(({ icon: Icon, label, value, detail }) => (
          <article key={label}>
            <Icon />
            <span>{label}</span>
            <strong>{value}</strong>
            <small>{detail}</small>
          </article>
        ))}
      </section>

      <section className="advisor-panel advisor-action-queue">
        <header>
          <div>
            <strong>Advisor action queue</strong>
            <span>The work Alex should handle first: approvals, promise risk, parts delays, customer updates, and handoff.</span>
          </div>
          <Link href="/vehicles/repair-workbench">Open all repair orders</Link>
        </header>
        <div>
          {model.actionQueue.length ? model.actionQueue.map((item) => (
            <Link className={`advisor-action-card ${actionTone(item.actionKind)}`} href={`/vehicles/repair-workbench?repairOrderId=${encodeURIComponent(item.id)}`} key={`${item.actionKind}-${item.id}`}>
              <span className="advisor-action-type">{item.overdue ? <AlertTriangle /> : <MessageSquareText />}{item.actionLabel}</span>
              <span>
                <strong>{item.repairOrderNumber}{" • "}{item.customerName}</strong>
                <small>{item.vehicleLabel}{" • "}{stageLabel(item.stage)}{" • "}{stageLabel(item.operatingState)}</small>
                <small>{item.actionReason}</small>
                {item.latestAdvisorUpdate ? <small>Last advisor note: {item.latestAdvisorUpdate.summary}</small> : null}
              </span>
              <em>{item.overdue ? "Overdue" : dateLabel(item.targetAt)}</em>
              <b><Send /> Review</b>
            </Link>
          )) : (
            <p className="advisor-empty"><CheckCircle2 /> No advisor actions need attention right now.</p>
          )}
        </div>
      </section>

      <div className="advisor-layout">
        <section className="advisor-panel advisor-arrivals">
          <header>
            <div>
              <strong>Arrival queue</strong>
              <span>Confirm the customer and vehicle, then create governed repair work.</span>
            </div>
            <Link href="/appointments?view=board">Open board</Link>
          </header>
          <div>
            {model.appointments.length ? model.appointments.map((appointment) => (
              <article key={appointment.id}>
                <time>{timeLabel(appointment.startsAt)}</time>
                <span>
                  <strong>{appointment.customerName}</strong>
                  <small>{appointment.vehicleLabel}{" • "}{appointment.appointmentNumber}</small>
                  <small>{appointment.phoneNumber ?? appointment.email ?? appointment.title}</small>
                </span>
                <Link href={`/vehicles/repair-orders?intakeSource=APPOINTMENT&appointmentId=${encodeURIComponent(appointment.id)}`}>Check in</Link>
              </article>
            )) : (
              <p className="advisor-empty"><CheckCircle2 /> No appointment arrivals are waiting in the current view.</p>
            )}
          </div>
        </section>

        <section className="advisor-panel advisor-handoffs">
          <header>
            <div>
              <strong>Repair-order handoffs</strong>
              <span>Customer-facing repair work that may need updates, approval, or promise review.</span>
            </div>
            <Link href="/vehicles/repair-workbench">All ROs</Link>
          </header>
          <div>
            {model.repairOrders.length ? model.repairOrders.map((order) => (
              <Link href={`/vehicles/repair-workbench?repairOrderId=${encodeURIComponent(order.id)}`} key={order.id}>
                <ClipboardCheck />
                <span>
                  <strong>{order.repairOrderNumber}{" • "}{order.customerName}</strong>
                  <small>{order.vehicleLabel}{" • "}{stageLabel(order.stage)}</small>
                  <small>{order.nextAction}</small>
                </span>
                <em>{order.age.overdue ? "Overdue" : dateLabel(order.targetAt)}</em>
              </Link>
            )) : (
              <p className="advisor-empty"><CheckCircle2 /> No open repair-order handoffs need advisor action.</p>
            )}
          </div>
        </section>
      </div>

      <section className="advisor-guide">
        <article>
          <ShieldCheck />
          <strong>Advisor rule</strong>
          <span>Customer concern, consent, custody, appointment match, and promised time belong in intake. Diagnostic decomposition belongs in the repair order/workbench.</span>
        </article>
        <article>
          <Phone />
          <strong>Customer loop</strong>
          <span>Every advisor action should answer: what did the customer ask for, what are we promising, and who owns the next update?</span>
        </article>
        <article>
          <Clock3 />
          <strong>Promise control</strong>
          <span>If live readiness or shop capacity is uncertain, check-in should record constraints instead of making a false promise.</span>
        </article>
      </section>
    </section>
  );
}
