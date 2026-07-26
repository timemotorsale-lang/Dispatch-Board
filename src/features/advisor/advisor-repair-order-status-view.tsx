import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  KeyRound,
  MessageSquareText,
  PackageCheck,
  ShieldCheck,
  UserRound,
  Wrench
} from "lucide-react";
import Link from "next/link";

import { AdvisorResponsePanel } from "@/features/advisor/advisor-response-panel";
import { BackToServiceAdvisorWorkspace } from "@/features/advisor/advisor-return-link";
import type { getShopPlanningDetail } from "@/server/shop-planning/service";

type Order = Awaited<ReturnType<typeof getShopPlanningDetail>>;

function format(value: string) {
  return value.replaceAll("_", " ").toLocaleLowerCase().replace(/^./, (letter) => letter.toUpperCase());
}

function date(value: string | Date | null | undefined) {
  return value ? new Date(value).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "Not recorded";
}

function vehicleLabel(order: Order) {
  return [order.vehicle.year, order.vehicle.make, order.vehicle.model].filter(Boolean).join(" ") || order.vehicle.vehicleNumber;
}

function customerSafeUpdate(order: Order) {
  const diagnosis = order.diagnosisVersions[0] ?? null;
  const estimate = order.estimateVersions[0] ?? null;
  const waitingParts = order.partDemands.some((part) => part.quantityReserved < part.quantityRequired);
  if (waitingParts) return "We are waiting on parts readiness before the repair can move forward. The current promise should be reviewed before committing a completion time.";
  if (!diagnosis) return "The vehicle is in intake/diagnosis. The technician still needs to confirm findings before we present a repair recommendation.";
  if (!estimate) return "Diagnosis information is available. The next step is preparing or reviewing the estimate before customer authorization.";
  return `The estimate is ${format(estimate.status)}. Review authorization status before telling the customer work is approved.`;
}

function advisorActionPlan(order: Order) {
  const diagnosis = order.diagnosisVersions[0] ?? null;
  const estimate = order.estimateVersions[0] ?? null;
  const authorization = estimate?.authorizations.find((item) => ["ACCEPTED", "PARTIAL"].includes(item.disposition)) ?? null;
  const waitingParts = order.partDemands.some((part) => part.quantityReserved < part.quantityRequired);

  if (waitingParts) {
    return {
      defaultContactOutcome: "Parts ETA or promise update needed",
      defaultExceptionCodes: ["WAITING_PARTS", "PROMISE_RISK"],
      defaultStatusCode: "WAITING_PARTS",
      href: "#advisor-response",
      label: "Record ETA / promise update",
      text: "Confirm parts ETA, then record the customer-safe promise update here."
    };
  }
  if (!diagnosis) {
    return {
      defaultContactOutcome: "Technician clarification requested before customer update",
      defaultExceptionCodes: ["TECHNICIAN_CLARIFICATION"],
      defaultStatusCode: "WAITING_TECHNICIAN_CLARIFICATION",
      href: "#advisor-response",
      label: "Request technician clarification",
      text: "Use the advisor response panel to document what clarification is needed before calling the customer."
    };
  }
  if (!estimate) {
    return {
      defaultContactOutcome: "Estimate preparation or advisor review needed",
      defaultExceptionCodes: [],
      defaultStatusCode: "IN_PROGRESS",
      href: `/diagnostics/advisor-review?repairOrderId=${encodeURIComponent(order.id)}`,
      label: "Prepare advisor estimate review",
      text: "Diagnosis is available. Prepare customer-safe estimate language or route the estimate for advisor review."
    };
  }
  if (!authorization) {
    return {
      defaultContactOutcome: "Customer authorization requested",
      defaultExceptionCodes: ["CUSTOMER_ACTION"],
      defaultStatusCode: "WAITING_APPROVAL",
      href: `/diagnostics/advisor-review?repairOrderId=${encodeURIComponent(order.id)}`,
      label: "Record customer decision",
      text: "Contact the customer and record the authorization outcome against the presented estimate."
    };
  }
  return {
    defaultContactOutcome: "Customer updated on repair progress",
    defaultExceptionCodes: [],
    defaultStatusCode: "CUSTOMER_UPDATED",
    href: "#advisor-response",
    label: "Record customer update",
    text: "Monitor repair/QC status and record the next customer-safe update or handoff note."
  };
}

export function AdvisorRepairOrderStatusView({ order }: { order: Order }) {
  const diagnosis = order.diagnosisVersions[0] ?? null;
  const estimate = order.estimateVersions[0] ?? null;
  const authorization = estimate?.authorizations.find((item) => ["ACCEPTED", "PARTIAL"].includes(item.disposition)) ?? null;
  const waitingParts = order.partDemands.some((part) => part.quantityReserved < part.quantityRequired);
  const nextAdvisorAction = advisorActionPlan(order);
  const vehicle = vehicleLabel(order);
  const timeline = [
    { label: "Intake", done: true },
    { label: "Diagnosis", done: Boolean(order.inspectionVersions.length || diagnosis) },
    { label: "Estimate", done: Boolean(estimate) },
    { label: "Authorization", done: Boolean(authorization) },
    { label: "Repair", done: Boolean(order.repairJobs.length) },
    { label: "Quality", done: order.stage === "QUALITY_CONTROL" || order.stage === "HANDOFF" },
    { label: "Handoff", done: order.stage === "HANDOFF" }
  ];

  return (
    <section className="advisor-ro-status">
      <header className="advisor-ro-hero">
        <div>
          <BackToServiceAdvisorWorkspace />
          <p>Advisor Repair Order Status</p>
          <h1>{order.repairOrderNumber}</h1>
          <span>{order.customer?.displayName ?? order.inventoryUnit?.inventoryNumber ?? "Internal vehicle"}{" • "}{vehicle}</span>
        </div>
        <aside>
          <strong>{format(order.stage)}</strong>
          <span>{format(order.operatingState)}</span>
          <small>Promise: {date(order.serviceVisit.promisedAt ?? order.targetAt)}</small>
        </aside>
      </header>

      <section className="advisor-ro-timeline" aria-label="Repair order status timeline">
        {timeline.map((step) => (
          <span className={step.done ? "done" : ""} key={step.label}>
            <i>{step.done ? <CheckCircle2 /> : null}</i>
            {step.label}
          </span>
        ))}
      </section>

      <section className="advisor-ro-summary">
        <article>
          <UserRound />
          <span>Customer</span>
          <strong>{order.customer?.displayName ?? "No customer linked"}</strong>
          <small>{order.serviceVisit.appointmentId ? "Appointment matched" : "Walk-in / no appointment match"}</small>
        </article>
        <article>
          <CalendarClock />
          <span>Promise / target</span>
          <strong>{date(order.serviceVisit.promisedAt ?? order.targetAt)}</strong>
          <small>{order.nextAction}</small>
        </article>
        <article className={waitingParts ? "attention" : ""}>
          <PackageCheck />
          <span>Parts readiness</span>
          <strong>{waitingParts ? "Waiting on parts" : "No blocking demand"}</strong>
          <small>{order.partDemands.length} demand item(s)</small>
        </article>
        <article>
          <ShieldCheck />
          <span>Authorization</span>
          <strong>{authorization?.disposition ?? "Not authorized"}</strong>
          <small>{estimate ? `Estimate ${format(estimate.status)}` : "Estimate not prepared"}</small>
        </article>
      </section>

      <div className="advisor-ro-layout">
        <main>
          <section className="advisor-ro-card concern">
            <header><MessageSquareText /><div><strong>Customer concern</strong><span>Preserved from intake</span></div></header>
            <p>{order.serviceVisit.concernSummary}</p>
          </section>

          <section className="advisor-ro-card">
            <header><FileText /><div><strong>Customer-safe update</strong><span>Use this as the starting language before calling or texting.</span></div></header>
            <p>{customerSafeUpdate(order)}</p>
          </section>

          <AdvisorResponsePanel
            defaultContactOutcome={nextAdvisorAction.defaultContactOutcome}
            defaultExceptionCodes={nextAdvisorAction.defaultExceptionCodes}
            defaultStatusCode={nextAdvisorAction.defaultStatusCode}
            defaultSummary={customerSafeUpdate(order)}
            latestUpdates={JSON.parse(JSON.stringify(order.advisorUpdates))}
            repairOrderId={order.id}
          />

          <section className="advisor-ro-card">
            <header><ClipboardCheck /><div><strong>Diagnosis / estimate status</strong><span>Advisor-readable repair context</span></div></header>
            <dl>
              <div><dt>Diagnosis</dt><dd>{diagnosis ? diagnosis.recommendation : "Not yet recorded"}</dd></div>
              <div><dt>Technician</dt><dd>{diagnosis?.technicianUser.name ?? "Not assigned in diagnosis"}</dd></div>
              <div><dt>Estimate</dt><dd>{estimate ? `$${(estimate.totalCents / 100).toFixed(2)} • ${format(estimate.status)}` : "Not yet prepared"}</dd></div>
              <div><dt>Jobs</dt><dd>{order.repairJobs.length ? `${order.repairJobs.length} job(s) created` : "No authorized repair jobs yet"}</dd></div>
            </dl>
          </section>
        </main>

        <aside>
          <section className="advisor-ro-card next">
            <header><Wrench /><div><strong>Next advisor action</strong><span>What Alex should do next</span></div></header>
            <strong>{nextAdvisorAction.text}</strong>
            <Link href={nextAdvisorAction.href}>{nextAdvisorAction.label}</Link>
          </section>
          <section className="advisor-ro-card">
            <header><KeyRound /><div><strong>Custody and intake</strong><span>Useful before customer update</span></div></header>
            <dl>
              <div><dt>Keys</dt><dd>{order.serviceVisit.keysReceivedCount}{" • "}{order.serviceVisit.keyTag ?? "No tag"}</dd></div>
              <div><dt>Transport</dt><dd>{format(order.serviceVisit.transportMode)}</dd></div>
              <div><dt>Arrived</dt><dd>{date(order.serviceVisit.arrivedAt)}</dd></div>
              <div><dt>Owner</dt><dd>{order.ownerUser.name}</dd></div>
            </dl>
          </section>
          {waitingParts ? <section className="advisor-ro-card warning"><AlertTriangle /><strong>Customer promise needs review</strong><span>Parts are not fully reserved. Confirm ETA before promising completion.</span><Link href={`/vehicles/parts-operations?repairOrderId=${encodeURIComponent(order.id)}`}>View parts readiness</Link></section> : null}
        </aside>
      </div>
    </section>
  );
}
