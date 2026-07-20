import { AlertTriangle, CarFront, CheckCircle2, CircleHelp, Clock3 } from "lucide-react";
import Link from "next/link";
import type { VehicleLifecycleCardProjection } from "@/server/inventory-execution/vehicle-card-projection";

const stateLabel = (state: VehicleLifecycleCardProjection["readiness"][number]["state"]) => state.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, letter => letter.toUpperCase());

export function CompactVehicleLifecycleCard({ card }: { card: VehicleLifecycleCardProjection }) {
  return <article className="vehicle-card compact" aria-label={`${card.identity.inventoryNumber}, ${card.identity.description}, ${card.health.label}`}>
    <header><span className="vehicle-card-image" aria-hidden="true"><CarFront /></span><div><strong>{card.identity.inventoryNumber}</strong><h2>{card.identity.description}</h2><p>{card.identity.identifier}</p></div><b data-tone={card.health.tone}>{card.health.label}</b></header>
    <dl><div><dt>Stage</dt><dd>{card.context.stage}</dd></div><div><dt>Location</dt><dd>{card.context.location}</dd></div><div><dt>Owner</dt><dd>{card.context.owner}</dd></div><div><dt>Target</dt><dd>{card.context.target}</dd></div></dl>
    <section aria-label="Current action"><small>Do This Now</small><strong>{card.action.title}</strong><span>Due {card.action.due}</span></section>
    {card.constraint.state !== "CLEAR" ? <p className="vehicle-card-constraint"><AlertTriangle size={15} />{card.constraint.title}</p> : null}
    <ul className="vehicle-card-readiness">{card.readiness.map(item => <li key={item.code} data-state={item.state}>{item.state === "READY" ? <CheckCircle2 /> : <CircleHelp />}<span>{item.label}<small>{stateLabel(item.state)}</small></span></li>)}</ul>
    <Link className="vehicle-card-primary" href={card.workbenchHref}>Open Workbench</Link>
  </article>;
}

export function ExpandedVehicleCommandCard({ card }: { card: VehicleLifecycleCardProjection }) {
  return <aside className="vehicle-card expanded" aria-label={`Selected vehicle ${card.identity.inventoryNumber}`}>
    <header><span className="vehicle-card-image" aria-hidden="true"><CarFront /></span><div><strong>{card.identity.inventoryNumber}</strong><h2>{card.identity.description}</h2><p>{card.identity.identifier}</p></div><b data-tone={card.health.tone}>{card.health.label}</b></header>
    <section className="vehicle-card-context"><dl><div><dt>Stage</dt><dd>{card.context.stage}</dd></div><div><dt>Stage age</dt><dd>{card.context.stageAgeLabel}</dd></div><div><dt>Location</dt><dd>{card.context.location}</dd></div><div><dt>Owner</dt><dd>{card.context.owner}</dd></div><div><dt>Executor</dt><dd>{card.context.executor}</dd></div><div><dt>Target</dt><dd>{card.context.target}</dd></div></dl><small>Freshness: {card.context.freshness}</small></section>
    <CardSection title="Flow Clock"><div className="vehicle-card-clocks">{card.flowClock.map(clock => <p key={clock.code} data-state={clock.state}><Clock3 /><span>{clock.label}<small>{clock.durationLabel}</small></span></p>)}</div><small>Vehicle-flow signals, not employee inactivity or disciplinary evidence.</small></CardSection>
    <CardSection title="Current Constraint"><div className={`vehicle-card-alert ${card.constraint.state.toLowerCase()}`}><AlertTriangle /><p><strong>{card.constraint.title}</strong><span>{card.constraint.detail}</span>{card.constraint.recovery ? <small>{card.constraint.recovery}</small> : null}</p></div></CardSection>
    <CardSection title="Do This Now"><div className="vehicle-card-next"><CheckCircle2 /><p><strong>{card.action.title}</strong><span>Due {card.action.due}</span><small>{card.action.confidence} · {card.action.reason}<br />{card.action.authority}</small></p></div>{card.currentWork ? <p className="vehicle-card-work"><b>Current:</b> {card.currentWork.title}</p> : <p className="vehicle-card-unavailable">No current Inventory Work Packet is available in this projection.</p>}{card.stagedWork ? <p className="vehicle-card-work"><b>Staged:</b> {card.stagedWork.title}</p> : null}</CardSection>
    <CardSection title="Readiness"><ul className="vehicle-card-readiness">{card.readiness.map(item => <li key={item.code} data-state={item.state}>{item.state === "READY" ? <CheckCircle2 /> : <CircleHelp />}<span>{item.label}<small>{stateLabel(item.state)}{item.detail ? ` · ${item.detail}` : ""}</small></span></li>)}</ul></CardSection>
    <CardSection title="Evidence & Completion"><p className="vehicle-card-unavailable">{card.evidence.remainingLabel}</p></CardSection>
    <CardSection title="Financial Exposure"><dl className="vehicle-card-financial">{card.financial.map(item => <div key={item.label}><dt>{item.label}</dt><dd>{item.value}</dd><small>{item.source}</small></div>)}</dl></CardSection>
    <CardSection title="Vehicle Execution Health"><p className="vehicle-card-unavailable">Process signals require complete, quality-graded execution evidence. This is not an employee score and cannot drive automatic discipline or public ranking.</p></CardSection>
    <CardSection title="Linked Work"><p>{card.linkedWork.tasks} Tasks · {card.linkedWork.repairOrders} Repair Orders · {card.linkedWork.approvals} Approvals</p></CardSection>
    <CardSection title="Recent Activity">{card.activity.length ? card.activity.map(item => <p className="vehicle-card-activity" key={item.id}>{item.at}<small>{item.summary}</small></p>) : <p className="vehicle-card-unavailable">No permitted recent activity is available.</p>}</CardSection>
    <footer><Link className="primary" href={card.workbenchHref}>Open Vehicle Workbench</Link><Link href={card.commands.assignHref}>Assign</Link>{card.commands.reviewApprovalHref ? <Link href={card.commands.reviewApprovalHref}>Review Approval</Link> : <button disabled>Review Approval</button>}{card.commands.resolveBlockerHref ? <Link href={card.commands.resolveBlockerHref}>Resolve Blocker</Link> : <button disabled>Resolve Blocker</button>}<Link className="critical" href={card.commands.escalateHref}>Escalate</Link></footer>
  </aside>;
}

function CardSection({ children, title }: { children: React.ReactNode; title: string }) { return <section><h3>{title}</h3>{children}</section>; }
