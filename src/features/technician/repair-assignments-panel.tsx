import { ArrowRight, Clock3, MapPin, Wrench } from "lucide-react";
import Link from "next/link";

import type {
  TechnicianRepairAssignment,
  TechnicianShopPulse
} from "@/server/technician-workspace/service";

function formatTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

function label(value: string) {
  return value.toLowerCase().split("_").map((part) => `${part[0]?.toUpperCase() ?? ""}${part.slice(1)}`).join(" ");
}

export function RepairAssignmentsPanel({
  assignments,
  pulse,
  unavailableReason
}: {
  assignments: TechnicianRepairAssignment[];
  pulse?: TechnicianShopPulse | null;
  unavailableReason?: string | null;
}) {
  return (
    <section className="technician-assignment-panel" aria-label="Assigned repair work">
      <header>
        <div>
          <span className="eyebrow">Technician workspace</span>
          <h1>My Work</h1>
          <p>Start with your current repair. Everything else stays out of the way.</p>
        </div>
        <div className="technician-assignment-header-actions">
          <Link className="pill pill-secondary" href="/diagnostics">Diagnostics &amp; Tools</Link>
          <Link className="pill pill-primary" href="/my-tasks/available">Available Work</Link>
        </div>
      </header>

      {pulse ? (
        <section className="technician-shop-pulse" aria-label="Read-only shop pulse">
          <div><span>Shop Pulse</span><strong>{pulse.state === "CONSTRAINED" ? "Constrained" : "Ready"}</strong><small>Read-only context</small></div>
          <div><span>My queue</span><strong>{pulse.ownQueue}</strong><small>{pulse.currentBay ?? "No current bay"}</small></div>
          <div><span>Active in shop</span><strong>{pulse.activeInShop}</strong><small>Repair jobs moving</small></div>
          <div><span>Waiting on parts</span><strong>{pulse.waitingParts}</strong><small>Shop-wide count</small></div>
          <div><span>Ready for QC</span><strong>{pulse.readyForQc}</strong><small>Awaiting inspection</small></div>
          <div><span>Promise pressure</span><strong>{pulse.promiseRisk}</strong><small>Due within four hours</small></div>
        </section>
      ) : null}

      {unavailableReason ? (
        <div className="notice notice-warning">
          <p>Repair assignments are temporarily unavailable. Your general assigned tasks remain below.</p>
        </div>
      ) : assignments.length ? (
        <div className="technician-assignment-list">
          {assignments.map((assignment, index) => (
            <article className={index === 0 ? "technician-assignment-card technician-assignment-card-current" : "technician-assignment-card"} key={assignment.id}>
              <div className="technician-assignment-icon"><Wrench aria-hidden="true" size={22} /></div>
              <div className="technician-assignment-copy">
                <div className="technician-assignment-title">
                  <span>{assignment.position === "CURRENT" ? "Do this now" : "Up next"}</span>
                  <b>{label(assignment.jobStatus)}</b>
                </div>
                <h2>{assignment.vehicle} · {assignment.description}</h2>
                <p>{assignment.customer} · {assignment.concern}</p>
                <div className="technician-assignment-facts">
                  <span><Clock3 size={14} /> {formatTime(assignment.scheduledStartAt)}–{formatTime(assignment.scheduledEndAt)}</span>
                  <span><MapPin size={14} /> {assignment.bay ?? assignment.location}</span>
                  <span>{assignment.jobNumber}</span>
                  <span>{assignment.accumulatedMinutes} min recorded</span>
                </div>
              </div>
              <Link className="technician-assignment-open" href={assignment.href}>
                Open Repair <ArrowRight aria-hidden="true" size={17} />
              </Link>
            </article>
          ))}
        </div>
      ) : (
        <div className="technician-assignment-empty">
          <Wrench aria-hidden="true" size={28} />
          <div>
            <h2>No repair is assigned right now</h2>
            <p>Check eligible available work or wait for shop dispatch to assign the next repair.</p>
          </div>
          <Link className="pill pill-primary" href="/my-tasks/available">Find Available Work</Link>
        </div>
      )}
    </section>
  );
}
