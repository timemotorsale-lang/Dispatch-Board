"use client";

import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  CircleGauge,
  Clock3,
  Filter,
  Plus,
  ScanLine,
  Search,
  ShieldAlert,
  Stethoscope,
  BarChart3
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import type { DiagnosticsCommandCenterModel } from "@/server/diagnostics/service";
import { LearningAiScaleReadinessPanel } from "./learning-ai-scale-readiness-panel";
import styles from "./diagnostics.module.css";

type CaseItem = DiagnosticsCommandCenterModel["items"][number];
type View = "MINE" | "RISK" | "ALL";
type QuickFilter = "ALL" | "ACTIVE" | "AWAITING_TEST" | "BLOCKED" | "HANDOFF";

const terminalStatuses = new Set(["VERIFIED_CLOSED", "INCONCLUSIVE", "NO_FAULT_FOUND", "ABANDONED"]);
const waitingStatuses = new Set(["WAITING_FOR_VEHICLE", "WAITING_FOR_AUTHORIZATION", "WAITING_FOR_TOOL", "WAITING_FOR_INFORMATION", "WAITING_FOR_PART"]);

const label = (value: string) => value.replaceAll("_", " ").toLocaleLowerCase().replace(/^./, (letter) => letter.toUpperCase());
const rolloutDate = (value: string | null) => value ? new Date(value).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" }) : "Not scheduled";

function stageLabel(item: CaseItem) {
  const labels: Record<string, string> = {
    DRAFT: "Triage",
    TRIAGE: "Triage",
    TEST_PLAN_READY: "Test Plan Ready",
    TESTING: "Testing",
    CAUSE_PROPOSED: "Evidence Review",
    CONFIRMATION_REQUIRED: "Conclusion Review",
    CONFIRMED: "Confirmed",
    REPAIR_PLANNING: "Repair Planning",
    HANDED_OFF: "Handoff Complete",
    POST_REPAIR_VERIFICATION: "Repair Verification",
    VERIFIED_CLOSED: "Verified Closed",
    ESCALATED: "Escalated"
  };
  return labels[item.status] ?? label(item.status);
}

function actionLabel(item: CaseItem) {
  if (!item.assignedUser) return "Assign to Me";
  if (["DRAFT", "TRIAGE", "REOPENED"].includes(item.status)) return "Start Diagnosis";
  if (["TEST_PLAN_READY", "TESTING"].includes(item.status)) return "Resume Test";
  if (item.status === "CAUSE_PROPOSED") return "Review Evidence";
  if (item.status === "CONFIRMATION_REQUIRED") return "Review Conclusion";
  if (["CONFIRMED", "REPAIR_PLANNING"].includes(item.status)) return "Prepare Handoff";
  if (item.status === "POST_REPAIR_VERIFICATION") return "Verify Repair";
  if (waitingStatuses.has(item.status)) return "Review Blocker";
  if (item.status === "ESCALATED") return "Review Escalation";
  return terminalStatuses.has(item.status) ? "Review Record" : "Open Case";
}

function priority(item: CaseItem) {
  if (item.riskTier === "R4" || item.status === "ESCALATED") return { label: "High", className: styles.priorityHigh };
  if (item.riskTier === "R3" || waitingStatuses.has(item.status)) return { label: "High", className: styles.priorityHigh };
  if (item.riskTier === "R2") return { label: "Med", className: styles.priorityMedium };
  return { label: "Low", className: styles.priorityLow };
}

function elapsed(item: CaseItem) {
  if (item.ageHours >= 24) return `${Math.floor(item.ageHours / 24)}d ${item.ageHours % 24}h / —`;
  return `${String(item.ageHours).padStart(2, "0")}:00 / —`;
}

function confidence(item: CaseItem) {
  if (["CONFIRMED", "REPAIR_PLANNING", "HANDED_OFF", "POST_REPAIR_VERIFICATION", "VERIFIED_CLOSED"].includes(item.status)) return "Confirmed";
  return "Not assessed";
}

function isRisk(item: CaseItem) {
  return ["R3", "R4"].includes(item.riskTier) || waitingStatuses.has(item.status) || item.status === "ESCALATED";
}

function matchesQuickFilter(item: CaseItem, filter: QuickFilter) {
  if (filter === "ACTIVE") return !terminalStatuses.has(item.status);
  if (filter === "AWAITING_TEST") return ["DRAFT", "TRIAGE", "TEST_PLAN_READY", "WAITING_FOR_TOOL"].includes(item.status);
  if (filter === "BLOCKED") return waitingStatuses.has(item.status) || item.status === "ESCALATED";
  if (filter === "HANDOFF") return ["CONFIRMED", "REPAIR_PLANNING"].includes(item.status);
  return true;
}

function key() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
}

export function DiagnosticsCommandCenter({ model }: { model: DiagnosticsCommandCenterModel }) {
  const router = useRouter();
  const [view, setView] = useState<View>("MINE");
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("ALL");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [readinessOpen, setReadinessOpen] = useState(true);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const items = useMemo(() => model.items.filter((item) => {
    const haystack = `${item.vehicle.label} ${item.vehicle.vin ?? ""} ${item.repairOrder.repairOrderNumber} ${item.concern} ${item.assignedUser?.name ?? ""}`.toLocaleLowerCase();
    const scopeMatch = view === "ALL" || view === "MINE" && item.assignedUser?.id === model.viewer.id || view === "RISK" && isRisk(item);
    return scopeMatch && matchesQuickFilter(item, quickFilter) && (!query || haystack.includes(query.toLocaleLowerCase()));
  }), [model.items, model.viewer.id, query, quickFilter, view]);

  if (model.restricted) return <section className={styles.unavailable}><ShieldAlert /><span className={styles.eyebrow}>Diagnostics restricted</span><h1>Diagnostic cases are not available for this account</h1><p>A Diagnostics view capability or location-scoped case assignment is required. No case facts have been exposed.</p><Link href="/board">Return to Dispatch Board</Link></section>;

  const allVisibleSelected = items.length > 0 && items.every((item) => selected.includes(item.id));
  const commandsEnabled = model.rollout.executable;
  const selectedItems = model.items.filter((item) => selected.includes(item.id));

  function selectView(next: View) {
    setView(next);
    setQuickFilter("ALL");
    setSelected([]);
  }

  async function assignToMe(targets: CaseItem[]) {
    if (!model.permissions.canAssign || !commandsEnabled || !targets.length) return;
    setBusy(true);
    setNotice(null);
    try {
      for (const item of targets) {
        const response = await fetch(`/api/diagnostics/cases/${encodeURIComponent(item.id)}/assignment`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            assignedUserId: model.viewer.id,
            expectedVersion: item.version,
            idempotencyKey: `command-center-assign-${item.id}-${key()}`,
            reason: "Assign diagnostic responsibility from the command center queue.",
            reasonCode: item.assignedUser ? "CASE_REASSIGNED_LOAD" : "CASE_INITIAL_ASSIGNMENT"
          })
        });
        const result = await response.json().catch(() => ({})) as { error?: string };
        if (!response.ok) throw new Error(result.error ?? "The diagnostic assignment could not be completed.");
      }
      setNotice(`${targets.length} diagnostic ${targets.length === 1 ? "case" : "cases"} assigned to ${model.viewer.name}.`);
      setSelected([]);
      setBulkOpen(false);
      router.refresh();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "The diagnostic assignment could not be completed.");
    } finally {
      setBusy(false);
    }
  }

  function toggleAll() {
    setSelected(allVisibleSelected ? selected.filter((id) => !items.some((item) => item.id === id)) : [...new Set([...selected, ...items.map((item) => item.id)])]);
  }

  return <section className={styles.commandCenter} aria-label="Diagnostics Command Center">
    <header className={styles.commandHeader}>
      <div className={styles.commandTitle}>
        <h1>Diagnostics Command Center</h1>
        <p>Prioritize, prove, and complete every diagnostic case.</p>
      </div>
      <div className={styles.commandActions}>
        <Link className={styles.primaryCommand} href="/diagnostics/intake" title={!commandsEnabled ? `Intake review is available; creation remains controlled by rollout: ${label(model.rollout.reason)}` : "Start a governed diagnostic intake"}><Plus />New Diagnostic Case</Link>
        <Link className={styles.secondaryCommand} href="/diagnostics/pilot-readiness"><BarChart3 />Pilot Readiness</Link>
        <Link className={styles.secondaryCommand} href="/diagnostics/troubleshooting-review"><Stethoscope />Troubleshooting Review</Link>
        <Link className={styles.secondaryCommand} href="/vehicles/discovery?intent=diagnostics"><ScanLine />Scan VIN</Link>
        <button className={styles.systemStatus} onClick={() => setReadinessOpen((current) => !current)} type="button"><span />Systems Operational<ChevronDown className={readinessOpen ? styles.chevronOpen : ""} /></button>
      </div>
    </header>

    {!commandsEnabled ? <div className={styles.rolloutNotice} role="status"><ShieldAlert /><span><strong>Live review is available.</strong> Mutations remain controlled by the Diagnostics rollout policy ({label(model.rollout.reason)}). Target: {rolloutDate(model.rollout.targetAt)}.</span><Link href="/settings/vehicle-operations">Review rollout</Link></div> : <div className={styles.actionNotice} role="status"><CheckCircle2 /><span><strong>Diagnostic case creation is enabled.</strong> Rollout target: {rolloutDate(model.rollout.targetAt)}. Evidence, reasoning, publishing, and AI remain separately controlled.</span><Link href="/settings/vehicle-operations">Rollout controls</Link></div>}
    {notice ? <div className={styles.actionNotice} role="status"><span>{notice}</span><button onClick={() => setNotice(null)} type="button">Dismiss</button></div> : null}

    <section className={styles.commandMetrics} aria-label="Diagnostic case summary">
      <button onClick={() => { setView("ALL"); setQuickFilter("ACTIVE"); }} type="button"><Stethoscope /><span>Active Cases</span><strong>{model.summary.active}</strong><small>{model.summary.mine} assigned to me</small></button>
      <button onClick={() => { setView("ALL"); setQuickFilter("AWAITING_TEST"); }} type="button"><Clock3 /><span>Awaiting Test</span><strong>{model.summary.awaitingTest}</strong><small>Needs test progression</small></button>
      <button className={styles.metricBlocked} onClick={() => { setView("ALL"); setQuickFilter("BLOCKED"); }} type="button"><AlertTriangle /><span>Blocked</span><strong>{model.summary.blocked}</strong><small>{model.summary.escalated} escalated</small></button>
      <button className={styles.metricReady} onClick={() => { setView("ALL"); setQuickFilter("HANDOFF"); }} type="button"><CheckCircle2 /><span>Ready for Handoff</span><strong>{model.summary.readyForHandoff}</strong><small>Confirmed or planning</small></button>
    </section>

    <nav className={styles.viewTabs} aria-label="Diagnostic case views">
      {(["MINE", "RISK", "ALL"] as const).map((item) => <button aria-current={view === item ? "page" : undefined} key={item} onClick={() => selectView(item)} type="button">{item === "MINE" ? "My View" : item === "RISK" ? "Risk View" : "All Cases"}</button>)}
      <span>Today: <strong>{model.summary.today.opened}</strong> opened <i>•</i> <strong>{model.summary.today.diagnosed}</strong> diagnosed <i>•</i> <strong>{model.summary.today.verified}</strong> verified</span>
    </nav>

    <section className={styles.priorityQueue}>
      <header className={styles.queueHeading}>
        <h2>Priority Case Queue</h2>
        <button aria-expanded={readinessOpen} className={styles.readinessToggle} onClick={() => setReadinessOpen((current) => !current)} type="button"><CircleGauge />Operational Readiness<ChevronDown className={readinessOpen ? styles.chevronOpen : ""} /></button>
      </header>

      {readinessOpen ? <div className={styles.readinessStrip} aria-label="Operational readiness">
        {[
          ["VIN & OEM Data", model.operationalReadiness.vinAndOemData],
          ["Evidence Ledger", model.operationalReadiness.evidenceLedger],
          ["Labor Intelligence", model.operationalReadiness.laborIntelligence],
          ["Audit Trail", model.operationalReadiness.auditTrail]
        ].map(([name, readiness]) => <span key={String(name)}><i className={styles[`readiness${(readiness as { state: string }).state}`]} /><b>{String(name)}</b><small>{(readiness as { label: string }).label}</small></span>)}
      </div> : null}
      {readinessOpen && model.learningAiScaleReadiness ? <LearningAiScaleReadinessPanel readiness={model.learningAiScaleReadiness} /> : null}

      <div className={styles.queueToolbar}>
        <div className={styles.queueChips}>
          <button aria-pressed={quickFilter === "ALL" && view === "ALL"} onClick={() => { setView("ALL"); setQuickFilter("ALL"); }} type="button">All Cases</button>
          <button aria-pressed={view === "MINE"} onClick={() => selectView("MINE")} type="button">My Cases</button>
          <button aria-pressed={view === "RISK"} onClick={() => selectView("RISK")} type="button">SLA Risk</button>
        </div>
        <label className={styles.queueSearch}><Search /><span className="sr-only">Search diagnostic cases</span><input onChange={(event) => setQuery(event.target.value)} placeholder="Search VIN, RO, customer, or concern..." value={query} /></label>
        <div className={styles.bulkControl}>
          <button aria-expanded={bulkOpen} disabled={!selected.length || busy} onClick={() => setBulkOpen((current) => !current)} type="button">{busy ? "Working..." : selected.length ? `Bulk Actions (${selected.length})` : "Bulk Actions"}<ChevronDown /></button>
          {bulkOpen ? <div className={styles.bulkMenu}>
            <button disabled={!model.permissions.canAssign || !commandsEnabled || busy} onClick={() => void assignToMe(selectedItems)} type="button">Assign selected to me</button>
            <button disabled={selectedItems.length !== 1} onClick={() => selectedItems[0] && router.push(`/diagnostics/cases/${encodeURIComponent(selectedItems[0].id)}`)} type="button">Open selected case</button>
            <button onClick={() => { setSelected([]); setBulkOpen(false); }} type="button">Clear selection</button>
          </div> : null}
        </div>
        <button className={styles.filterButton} onClick={() => selectView(view === "RISK" ? "ALL" : "RISK")} title="Toggle risk view" type="button"><Filter /></button>
      </div>

      <div className={styles.queueTableWrap}>
        <table className={styles.queueTable}>
          <thead><tr><th><input aria-label="Select all visible cases" checked={allVisibleSelected} onChange={toggleAll} type="checkbox" /></th><th>Priority</th><th>Vehicle</th><th>Concern</th><th>Stage</th><th>Technician</th><th>Elapsed / SLA</th><th>Confidence</th><th>Next Action</th></tr></thead>
          <tbody>
            {items.map((item) => {
              const itemPriority = priority(item);
              const assignedAction = !item.assignedUser && model.permissions.canAssign && commandsEnabled;
              return <tr key={item.id}>
                <td><input aria-label={`Select ${item.vehicle.label}`} checked={selected.includes(item.id)} onChange={(event) => setSelected((current) => event.target.checked ? [...new Set([...current, item.id])] : current.filter((id) => id !== item.id))} type="checkbox" /></td>
                <td><span className={`${styles.priorityBadge} ${itemPriority.className}`}>{itemPriority.label}</span></td>
                <td><Link className={styles.vehicleCell} href={`/diagnostics/cases/${encodeURIComponent(item.id)}`}><strong>{item.vehicle.label}</strong><small>{item.vehicle.vin ?? item.repairOrder.repairOrderNumber}</small></Link></td>
                <td><span className={styles.concernCell}><strong>{item.concern}</strong><small>{item.repairOrder.repairOrderNumber} · {item.location.code}</small></span></td>
                <td><span className={`${styles.stageBadge} ${styles[`stage${item.stage}`]}`}>{stageLabel(item)}</span></td>
                <td><span className={styles.technicianCell}><i>{item.assignedUser?.name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase() ?? "—"}</i>{item.assignedUser?.name ?? "Unassigned"}</span></td>
                <td><span className={isRisk(item) ? styles.slaRisk : styles.slaHealthy}>{elapsed(item)}</span></td>
                <td><span className={styles.confidenceCell}><strong>{confidence(item)}</strong>{confidence(item) === "Confirmed" ? <i><b /></i> : null}</span></td>
                <td>{assignedAction ? <button className={styles.rowAction} disabled={busy} onClick={() => void assignToMe([item])} type="button">Assign to Me<ChevronDown /></button> : <Link className={styles.rowAction} href={`/diagnostics/cases/${encodeURIComponent(item.id)}`}>{actionLabel(item)}<ChevronDown /></Link>}</td>
              </tr>;
            })}
            {!items.length ? <tr><td className={styles.queueEmpty} colSpan={9}><Stethoscope /><strong>No diagnostic cases match this view</strong><span>Adjust the view or filters, or begin a governed diagnostic intake.</span><Link href="/diagnostics/intake">New Diagnostic Case</Link></td></tr> : null}
          </tbody>
        </table>
      </div>
      <footer className={styles.queueFooter}><span>Showing {items.length} of {model.items.length} cases</span><button onClick={() => { setView("ALL"); setQuickFilter("ALL"); setQuery(""); }} type="button">View all cases ›</button></footer>
    </section>
  </section>;
}

export function DiagnosticsUnavailable({ message }: { message: string }) {
  return <section className={styles.unavailable}><AlertTriangle /><span className={styles.eyebrow}>Diagnostics unavailable</span><h1>The case console could not load</h1><p>{message}</p><p>No diagnostic data was inferred or replaced. Confirm the DGN-007–009 migration and service health, then retry.</p><Link href="/diagnostics">Retry Diagnostics</Link><Link href="/board">Return to Dispatch Board</Link></section>;
}
