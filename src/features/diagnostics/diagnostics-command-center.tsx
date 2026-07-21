"use client";

import { AlertTriangle, BookOpen, Camera, CheckCircle2, Clock3, FileText, Search, ShieldAlert, Stethoscope, UserRound, Wrench } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import type { DiagnosticsCommandCenterModel } from "@/server/diagnostics/service";
import styles from "./diagnostics.module.css";

const label = (value: string) => value.replaceAll("_", " ").toLocaleLowerCase().replace(/^./, (letter) => letter.toUpperCase());
const age = (hours: number) => hours < 1 ? "Opened this hour" : hours < 24 ? `${hours}h open` : `${Math.floor(hours / 24)}d open`;

export function DiagnosticsCommandCenter({ model }: { model: DiagnosticsCommandCenterModel }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("ACTIVE");
  const [risk, setRisk] = useState("ALL");
  const [ownership, setOwnership] = useState("ALL");
  const items = useMemo(() => model.items.filter((item) => {
    const haystack = `${item.vehicle.label} ${item.vehicle.vin ?? ""} ${item.repairOrder.repairOrderNumber} ${item.concern} ${item.assignedUser?.name ?? ""}`.toLocaleLowerCase();
    const isTerminal = ["VERIFIED_CLOSED", "INCONCLUSIVE", "NO_FAULT_FOUND", "ABANDONED"].includes(item.status);
    return (!query || haystack.includes(query.toLocaleLowerCase()))
      && (status === "ALL" || status === "ACTIVE" && !isTerminal || item.status === status)
      && (risk === "ALL" || item.riskTier === risk)
      && (ownership === "ALL" || ownership === "MINE" && item.assignedUser?.id === model.viewer.id || ownership === "UNASSIGNED" && !item.assignedUser);
  }), [model.items, model.viewer.id, ownership, query, risk, status]);

  if (model.restricted) return <section className={styles.unavailable}><ShieldAlert /><span className={styles.eyebrow}>Diagnostics restricted</span><h1>Diagnostic cases are not available for this account</h1><p>A Diagnostics view capability or location-scoped case assignment is required. No case facts have been exposed.</p><Link href="/board">Return to Dispatch Board</Link></section>;

  const activeCount = model.items.filter((item) => !["VERIFIED_CLOSED", "INCONCLUSIVE", "NO_FAULT_FOUND", "ABANDONED"].includes(item.status)).length;

  return <section className={styles.console} aria-label="Diagnostics Command Center">
    <header className={styles.hero}>
      <div><span className={styles.eyebrow}>Enterprise diagnostic operations</span><h1>Diagnostics Command Center</h1><p>One controlled front door for technician diagnosis, advisor review, labor intelligence, autobody estimate drafting, and rollout-gated pilot readiness.</p></div>
      <div className={styles.freshness}><span className={model.freshness === "CURRENT" ? styles.liveDot : styles.holdDot} />{model.rollout.executable ? "Commands enabled" : "Read-only foundation"}<small>{model.freshness === "CURRENT" ? "Refreshed" : "Stale snapshot from"} {new Date(model.generatedAt).toLocaleTimeString()}</small></div>
    </header>

    {!model.rollout.executable ? <div className={styles.hold} role="status"><ShieldAlert size={18} /><span><strong>Diagnostic commands are held by rollout control.</strong> Cases remain available for review; mutations stay disabled ({label(model.rollout.reason)}).</span></div> : null}

    <section className={styles.commandLanding} aria-label="Diagnostic workflow landing">
      <article className={styles.commandPrimaryCard}>
        <div><span className={styles.eyebrow}>Live review lane</span><h2>Case Queue</h2><p>Open active diagnostic cases, review blockers, and enter the governed technician workspace.</p></div>
        <strong>{activeCount}</strong>
        <a href="#diagnostic-case-queue">Review case queue</a>
      </article>
      <Link className={styles.commandModuleCard} href="/diagnostics/labor-guide">
        <BookOpen /><span>Labor Guide</span><strong>Estimate intelligence</strong><p>VIN/context-aware labor draft, overlap, rate, and GP safeguard review.</p>
      </Link>
      <Link className={styles.commandModuleCard} href="/diagnostics/advisor-review">
        <FileText /><span>Advisor Review</span><strong>Handoff approval lane</strong><p>Review diagnosis-to-estimate packets before customer, parts, dispatch, or QC authority.</p>
      </Link>
      <Link className={styles.commandModuleCard} href="/diagnostics/autobody-estimate">
        <Camera /><span>Autobody Estimate</span><strong>Photo-to-estimate planning</strong><p>Damage photo intake, body labor, refinish, supplement, and ADAS gate workspace.</p>
      </Link>
      <article className={styles.commandModuleCard} aria-label="Pilot readiness gate">
        <CheckCircle2 /><span>Pilot Gate</span><strong>DGN-045 accepted</strong><p>Release 3 can move into Release 4 implementation; production remains blocked.</p>
      </article>
    </section>

    <div className={styles.metrics} aria-label="Queue summary">
      <article><Wrench /><span>My active</span><strong>{model.summary.mine}</strong></article>
      <article><Clock3 /><span>Waiting</span><strong>{model.summary.waiting}</strong></article>
      <article><AlertTriangle /><span>Escalated</span><strong>{model.summary.escalated}</strong></article>
      <article><UserRound /><span>Unassigned</span><strong>{model.summary.unassigned}</strong></article>
    </div>

    <section className={styles.queuePanel} id="diagnostic-case-queue">
      <header><div><h2>Case queue</h2><p>{items.length} of {model.items.length} visible cases</p></div><Link href="/vehicles/repair-workbench?view=all">Open Repair Orders</Link></header>
      <div className={styles.filters}>
        <label className={styles.search}><Search size={16} /><span className="sr-only">Search diagnostic cases</span><input onChange={(event) => setQuery(event.target.value)} placeholder="Search vehicle, RO, concern, or owner" value={query} /></label>
        <label><span className="sr-only">Status</span><select onChange={(event) => setStatus(event.target.value)} value={status}><option value="ACTIVE">Active cases</option><option value="ALL">All statuses</option><option value="DRAFT">Draft</option><option value="TRIAGE">Triage</option><option value="ESCALATED">Escalated</option><option value="VERIFIED_CLOSED">Verified closed</option></select></label>
        <label><span className="sr-only">Risk</span><select onChange={(event) => setRisk(event.target.value)} value={risk}><option value="ALL">All risk tiers</option>{["R1", "R2", "R3", "R4"].map((item) => <option key={item}>{item}</option>)}</select></label>
        <label><span className="sr-only">Ownership</span><select onChange={(event) => setOwnership(event.target.value)} value={ownership}><option value="ALL">All ownership</option><option value="MINE">Assigned to me</option><option value="UNASSIGNED">Unassigned</option></select></label>
      </div>

      {items.length ? <div className={styles.caseList}>{items.map((item) => <Link className={styles.caseRow} href={`/diagnostics/cases/${encodeURIComponent(item.id)}`} key={item.id}>
        <div className={styles.caseIdentity}><span className={`${styles.risk} ${styles[item.riskTier.toLocaleLowerCase()]}`}>{item.riskTier}</span><div><strong>{item.vehicle.label}</strong><small>{item.repairOrder.repairOrderNumber} · {item.location.code}</small></div></div>
        <div className={styles.caseConcern}><strong>{item.concern}</strong><small>{label(item.concernSource)} · Confidence {label(item.confidence)}</small></div>
        <div className={styles.caseState}><span>{label(item.status)}</span><small>{item.blocker ?? item.nextAction}</small></div>
        <div className={styles.caseOwner}><strong>{item.assignedUser?.name ?? "Unassigned"}</strong><small>{age(item.ageHours)} · v{item.version}</small></div>
      </Link>)}</div> : <div className={styles.empty}><Stethoscope /><h3>No cases match this view</h3><p>Adjust the filters, or open a repair order to create a diagnostic case from its authoritative concern.</p><Link href="/vehicles/repair-workbench?view=all">Open Repair Orders</Link></div>}
    </section>
  </section>;
}

export function DiagnosticsUnavailable({ message }: { message: string }) {
  return <section className={styles.unavailable}><AlertTriangle /><span className={styles.eyebrow}>Diagnostics unavailable</span><h1>The case console could not load</h1><p>{message}</p><p>No diagnostic data was inferred or replaced. Confirm the DGN-007–009 migration and service health, then retry.</p><Link href="/board">Return to Dispatch Board</Link></section>;
}
