"use client";

import {
  BarChart3,
  Bell,
  BookOpen,
  Box,
  Camera,
  Car,
  ChevronDown,
  ChevronRight,
  ChevronsLeft,
  CircleHelp,
  Clipboard,
  Download,
  Eye,
  FileText,
  Folder,
  Handshake,
  Home,
  Info,
  Laptop,
  Lock,
  Menu,
  MessageCircle,
  MessageSquare,
  MoreVertical,
  Paperclip,
  Pencil,
  RefreshCw,
  Save,
  Settings,
  Upload
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ReactNode } from "react";

import type { buildTechnicianTroubleshootingConsole } from "@/server/diagnostics/technician-troubleshooting-console";
import styles from "./diagnostics.module.css";

type Model = ReturnType<typeof buildTechnicianTroubleshootingConsole> & {
  caseVersion?: number;
  permissions?: { canSaveSession: boolean };
  savedSessions?: Array<{ authorUserId: string; id: string; occurredAt: string; overrideReason: string | null; selectedTestKey: string | null; sessionChecksum: string; status: string; supersedesId: string | null; version: number }>;
};

const checks = [
  ["done", "When does it occur?"],
  ["done", "What are the conditions?"],
  ["warn", "Any warning lamps?"],
  ["warn", "Battery age / condition?"],
  ["todo", "Recent repairs / parts replaced?"],
  ["todo", "Additional symptoms?"]
] as const;

const intelligenceRows = [
  ["recalls", "Open Recalls", "1", "red"],
  ["bulletins", "TSB / Service Bulletins", "3", "yellow"],
  ["known-issues", "Known Issue Library Matches", "2", "yellow"],
  ["repair-history", "Prior RO History", "5", "blue"],
  ["comebacks", "Comeback History (This Concern)", "0", "green"]
] as const;

const testRows = [
  ["1", "Battery loaded voltage test", "≥ 9.6 V during crank", "PASS", "pass"],
  ["2", "Starter command signal test", "12 V at start relay coil", "SUSPECTED", "suspected"],
  ["3", "Voltage drop test (power side)", "≤ 0.5 V drop", "INCONCLUSIVE", "neutral"],
  ["4", "Voltage drop test (ground side)", "≤ 0.2 V drop", "PENDING", "pending"],
  ["5", "Starter relay control verification", "Control circuit operates", "PENDING", "pending"]
] as const;

const evidenceRows = [
  ["Scan Report", "No codes present", "Today 8:12 AM", "Scan Tool"],
  ["Freeze-Frame", "N/A", "Today 8:12 AM", "Scan Tool"],
  ["Voltage Reading", "Battery loaded voltage: 10.1V", "Today 8:14 AM", "DMM"],
  ["Photo / Video", "Engine bay overview", "Today 8:15 AM", "Mobile Device"],
  ["Waveform", "Starter relay control circuit", "Today 8:16 AM", "Scope"]
] as const;

const causeRows = [
  ["1", "Weak battery", "SUPPORTED", "70%", "supported"],
  ["2", "Starter command circuit fault", "SUSPECTED", "55%", "suspected"],
  ["3", "Starter motor", "POSSIBLE", "35%", "possible"],
  ["4", "Ground cable voltage drop", "POSSIBLE", "30%", "possible"],
  ["5", "Starter relay", "UNSUPPORTED", "20%", "unsupported"],
  ["6", "Ignition switch", "UNSUPPORTED", "15%", "unsupported"],
  ["7", "PCM / Immobilizer issue", "RULED OUT", "5%", "ruled"]
] as const;

const handoffRows = [
  ["Cause Status", "SUSPECTED", "Further testing required", "suspected"],
  ["Correction Readiness", "IN PROGRESS", "Repair path not finalized", "warning"],
  ["Parts Readiness", "PENDING", "Parts to be determined", "pending"],
  ["Labor Readiness", "PENDING", "Time not estimated", "pending"],
  ["Verification Plan", "PENDING", "Post-repair tests outlined", "pending"]
] as const;

function Pill({ tone, children }: { children: string; tone: string }) {
  return <span className={`${styles.ttcMockPill} ${styles[`ttcMockPill_${tone}`]}`}>{children}</span>;
}

type WorkPane = "INTAKE" | "INTELLIGENCE" | "TESTS" | "EVIDENCE" | "CAUSES" | "HANDOFF" | "AI";

function SidebarItem({ active, href, icon, label, onClick }: { active?: boolean; href?: string; icon: ReactNode; label: string; onClick?: () => void }) {
  const content = <>{icon}<span>{label}</span></>;
  if (href) return <Link aria-current={active ? "page" : undefined} className={styles.ttcMockSidebarItem} href={href}>{content}</Link>;
  return <button aria-current={active ? "page" : undefined} className={styles.ttcMockSidebarItem} onClick={onClick} type="button">{content}</button>;
}

export function TechnicianTroubleshootingConsole({ model }: { model: Model }) {
  const router = useRouter();
  const context = model.caseContext;
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [activePane, setActivePane] = useState<WorkPane>("TESTS");
  const [activeIntelligence, setActiveIntelligence] = useState<(typeof intelligenceRows)[number][0] | null>(null);
  const [activeTestKey, setActiveTestKey] = useState(model.mvpActionDetails.tests[0]?.key ?? "");
  const [activeHandoffKey, setActiveHandoffKey] = useState(model.mvpActionDetails.handoff[0]?.key ?? "");
  const [activeCause, setActiveCause] = useState("");
  const [quickObservation, setQuickObservation] = useState("");
  const [quickMeasurement, setQuickMeasurement] = useState("");
  const links = model.workspaceLinks;
  const caseWorkspaceHref = links.caseWorkspace.href;
  const diagnosticsHref = links.diagnostics.href;
  const homeHref = links.home.href;
  const repairOrderHref = links.repairOrder.href;
  const vehicleHref = links.vehicle.href;
  const partsHref = links.parts.href;
  const libraryHref = links.library.href;
  const reportsHref = links.reports.href;
  const messagesHref = links.messages.href;
  const settingsHref = links.settings.href;
  const isTrial = context.id.startsWith("trial-");
  const intelligenceDetail = activeIntelligence ? model.mvpActionDetails.intelligence.find((item) => item.key === activeIntelligence) : null;
  const testDetail = model.mvpActionDetails.tests.find((item) => item.key === activeTestKey) ?? model.mvpActionDetails.tests[0] ?? null;
  const handoffDetail = model.mvpActionDetails.handoff.find((item) => item.key === activeHandoffKey) ?? model.mvpActionDetails.handoff[0] ?? null;
  const testTableRows = model.nextTestPreview.length
    ? model.nextTestPreview.map((test, index) => ({
      expected: test.expectedEvidence[0] ?? "Evidence required",
      key: test.key,
      status: index === 0 ? "RECOMMENDED" : "AVAILABLE",
      step: String(index + 1),
      title: test.title,
      tone: index === 0 ? "pending" : "neutral"
    }))
    : testRows.map(([step, title, expected, status, tone]) => ({ expected, key: `fallback-${step}`, status, step, title, tone }));

  function action(message: string) {
    setNotice(message);
  }

  function openPane(pane: WorkPane, message: string) {
    setActivePane(pane);
    setNotice(message);
  }

  function openIntelligence(key: (typeof intelligenceRows)[number][0]) {
    setActiveIntelligence(key);
    setActivePane("INTELLIGENCE");
    const detail = model.mvpActionDetails.intelligence.find((item) => item.key === key);
    setNotice(`${detail?.title ?? "Vehicle intelligence detail"} opened in the troubleshooting workspace.`);
  }

  function openTest(key: string) {
    setActiveTestKey(key);
    setActivePane("TESTS");
    setNotice("Test detail opened. MVP mode shows guided test detail; execution remains governed by the diagnostic test-lab authority.");
  }

  function openHandoff(key: string) {
    setActiveHandoffKey(key);
    setActivePane("HANDOFF");
    setNotice("Advisor handoff detail opened with customer-safe boundaries.");
  }

  function openCause(cause: string) {
    setActiveCause(cause);
    setActivePane("CAUSES");
    setNotice("Cause ranking detail opened. Ranking remains evidence-gated and must not be presented as confirmed repair.");
  }

  async function execute(url: string, body: Record<string, unknown>, success: string) {
    if (isTrial) return setNotice("Trial console is interactive but not connected to a real case record. Open a real diagnostic case for persisted commands.");
    setBusy(true);
    setNotice("");
    try {
      const response = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...body, expectedVersion: model.caseVersion ?? context.version, idempotencyKey: crypto.randomUUID() }) });
      const result = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Command could not be completed.");
      setNotice(success);
      router.refresh();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Command could not be completed.");
    } finally {
      setBusy(false);
    }
  }

  async function saveSnapshot() {
    await execute(`/api/diagnostics/cases/${encodeURIComponent(context.id)}/troubleshooting/session`, {
      advisorDraftPacket: { ...model.advisorHandoff.draftPacket, readiness: model.advisorHandoff.readiness },
      intakeRefinement: model.intakeRefinement,
      knownIssueSnapshot: model.vehicleIntelligence.knownIssueMatches,
      learningProposal: model.learningLoop,
      overrideReason: "",
      reason: "Record technician troubleshooting console session snapshot from compact workspace.",
      rulePackSnapshot: model.rulePackRegistry,
      selectedTestKey: model.nextTestPlan.recommendation?.key ?? "",
      supersedesId: model.savedSessions?.[0]?.id ?? "",
      vehicleIntelligenceAcknowledgements: model.vehicleIntelligence.acknowledgements
    }, "Troubleshooting snapshot saved. Workspace refreshed.");
  }

  return <section className={styles.ttcMockShell} aria-label="Technician Troubleshooting Console">
    <aside className={styles.ttcMockSidebar}>
      <button className={styles.ttcMockMenuButton} onClick={() => action("Navigation menu is compact for MVP. Use the visible module icons to move between workspaces.")} type="button"><Menu /></button>
      <nav>
        <SidebarItem href={homeHref} icon={<Home />} label="Home" />
        <SidebarItem active href={diagnosticsHref} icon={<Laptop />} label="Diagnostics" />
        <SidebarItem href={repairOrderHref} icon={<Clipboard />} label="ROs" />
        <SidebarItem href={vehicleHref} icon={<Car />} label="Vehicles" />
        <SidebarItem href={partsHref} icon={<Box />} label="Parts" />
        <SidebarItem href={libraryHref} icon={<BookOpen />} label="Library" />
        <SidebarItem href={reportsHref} icon={<BarChart3 />} label="Reports" />
        <SidebarItem href={messagesHref} icon={<MessageSquare />} label="Messages" />
      </nav>
      <div>
        <SidebarItem href={settingsHref} icon={<Settings />} label="Settings" />
        <SidebarItem icon={<ChevronsLeft />} label="Collapse" onClick={() => action("Compact mode is already active for this enterprise workspace.")} />
      </div>
    </aside>

    <main className={styles.ttcMockPage}>
      <header className={styles.ttcMockTopbar}>
        <div>
          <h1>Technician Troubleshooting Console</h1>
          <p><Link href="/command-center">CCC Home</Link><span>/</span><Link href="/diagnostics">Diagnostics</Link><span>/</span>Troubleshooting</p>
        </div>
        <div className={styles.ttcMockTopActions}>
          <Bell /><CircleHelp />
          <span />
          <strong>Tech: Alex Rivera</strong>
          <small><i />Online</small>
          <ChevronDown />
        </div>
      </header>

      {notice ? <div className={styles.ttcMockNotice}>{notice}</div> : null}

      <section className={styles.ttcMockContext}>
        <article><Clipboard /><span>Active RO</span><strong><Link href={repairOrderHref}>{context.repairOrder.repairOrderNumber}</Link></strong></article>
        <article><MessageCircle /><span>Customer</span><strong>Leo James</strong></article>
        <article><Car /><span>Vehicle</span><strong><Link href={vehicleHref}>{context.vehicle.label}</Link></strong><small>4 Door Sedan</small></article>
        <article><span className={styles.ttcMockBarcode}>||||||||||</span><span>VIN</span><strong>{context.vehicle.vin ?? "JM1BL1SF3A1257561"}</strong></article>
        <article><MessageCircle /><span>Concern</span><strong>{context.concern || "intermittent no crank after hot soak"}</strong></article>
      </section>

      <section className={styles.ttcMockActionDock} aria-label="Technician work loop">
        <strong>Active work: {activePane.toLocaleLowerCase()}</strong>
        {model.mvpReadiness.map((item) => <span key={item.key} title={item.detail}>{item.label}: {item.state.replaceAll("_", " ").toLocaleLowerCase()}</span>)}
        <button disabled={busy} onClick={() => openPane("INTAKE", "Diagnostic intake pane active.")} type="button"><Pencil /> Intake</button>
        <button disabled={busy} onClick={() => openPane("TESTS", "Next-test plan pane active.")} type="button"><Folder /> Tests</button>
        <button disabled={busy} onClick={() => openPane("EVIDENCE", "Evidence capture pane active.")} type="button"><Upload /> Evidence</button>
        <button disabled={busy || !model.permissions?.canSaveSession} onClick={() => void saveSnapshot()} title={model.permissions?.canSaveSession ? "Save governed troubleshooting snapshot." : "Snapshot save is disabled until a live case permission allows it."} type="button"><Save /> Save</button>
        <button disabled={busy} onClick={() => router.refresh()} type="button"><RefreshCw /> Refresh</button>
        <Link href={caseWorkspaceHref}>Full case <ChevronRight /></Link>
      </section>

      <section className={styles.ttcMockWorkPane} aria-label="Active troubleshooting work pane">
        <header><strong>{activePane === "INTAKE" ? "Diagnostic intake" : activePane === "INTELLIGENCE" ? "Vehicle intelligence" : activePane === "TESTS" ? "Next best test" : activePane === "EVIDENCE" ? "Evidence capture" : activePane === "CAUSES" ? "Cause ranking" : activePane === "HANDOFF" ? "Advisor handoff" : "AI / feature gates"}</strong><span>{isTrial ? "Trial mode" : "Live case mode"}</span></header>
        {activePane === "INTELLIGENCE" && intelligenceDetail ? <p><strong>{intelligenceDetail.title}:</strong> {intelligenceDetail.body} <em>{intelligenceDetail.sourceStatus.replaceAll("_", " ").toLocaleLowerCase()} · {intelligenceDetail.sourceBoundary}</em> Next: {intelligenceDetail.nextStaffAction}</p> : activePane === "TESTS" && testDetail ? <p><strong>{testDetail.title}:</strong> {testDetail.body} <em>{testDetail.sourceBoundary}</em> {testDetail.actionAvailable}. Next: {testDetail.nextStaffAction}</p> : activePane === "HANDOFF" && handoffDetail ? <p><strong>{handoffDetail.title}:</strong> {handoffDetail.body} <em>{handoffDetail.sourceBoundary}</em> Missing/next: {handoffDetail.nextStaffAction}</p> : activePane === "CAUSES" ? <p><strong>{activeCause || "Cause ranking"}:</strong> Cause ranking is evidence-gated. Treat ranking as internal triage support until sufficient independent evidence supports a suspected or confirmed cause.</p> : activePane === "EVIDENCE" ? <form onSubmit={(event) => { event.preventDefault(); void execute(`/api/diagnostics/cases/${encodeURIComponent(context.id)}/observations`, { factClass: "OBSERVED", independenceGroup: "TECHNICIAN_DIRECT", operatingConditions: {}, qualityReasonCode: "DATA_VALID", qualityStatus: "VALID", rawSource: { kind: "TROUBLESHOOTING_CONSOLE" }, reason: "Recorded direct technician observation from troubleshooting console.", reliability: "UNASSESSED", source: "TECHNICIAN", statement: quickObservation || quickMeasurement }, "Observation recorded. Returned to troubleshooting console."); }}>
          <label><span>Quick observation</span><input onChange={(event) => setQuickObservation(event.target.value)} placeholder="Observed fact; no assumed cause." value={quickObservation} /></label>
          <label><span>Measurement note</span><input onChange={(event) => setQuickMeasurement(event.target.value)} placeholder="Example: battery loaded voltage 10.1V" value={quickMeasurement} /></label>
          <button disabled={busy || (!quickObservation.trim() && !quickMeasurement.trim())} type="submit">Record evidence</button>
        </form> : <p>{activePane === "AI" ? model.masterTechnicianGate.reason : "Use the compact controls below. Deeper tools open with a return path back to this console."}</p>}
      </section>

      <section className={styles.ttcMockGrid}>
        <div className={styles.ttcMockLeft}>
          <section className={styles.ttcMockCard}>
            <header><h2><Clipboard />Diagnostic Intake</h2><button onClick={() => openPane("INTAKE", "Intake pane active. Keep edits inside the troubleshooting work loop.")} type="button"><Pencil />Edit</button></header>
            <div className={styles.ttcMockIntakeLine}><span>Symptom Family</span><strong>No Crank / No Start</strong><ChevronDown /></div>
            <div className={styles.ttcMockIntakeLine}><span>Operating Conditions</span><strong>Hot soak after drive, ambient temp 85–95°F</strong></div>
            <div className={styles.ttcMockIntakeLine}><span>Safety Gate Status</span><Pill tone="supported">CLEARED</Pill><small>No active safety concerns</small></div>
            <div className={styles.ttcMockChecklist}>
              <div><span>Missing Details Checklist</span><strong>3 of 6 complete</strong></div>
              {checks.map(([state, text]) => <p className={styles[`ttcMockCheck_${state}`]} key={text}><i />{text}</p>)}
            </div>
            <button className={styles.ttcMockTextButton} onClick={() => openPane("INTAKE", "All intake details remain governed by case intake authority.")} type="button">View / Edit All Intake Details</button>
          </section>

          <section className={styles.ttcMockCard}>
            <header><h2><FileText />Vehicle Intelligence Check</h2><button className={styles.ttcMockTextButton} onClick={() => openIntelligence("recalls")} type="button">Open details <ChevronRight /></button></header>
            <div className={styles.ttcMockIntelList}>
              {intelligenceRows.map(([key, name, count, tone]) => <button key={key} onClick={() => openIntelligence(key)} type="button"><FileText /><span>{name}</span><b className={styles[`ttcMockCount_${tone}`]}>{count}</b><ChevronRight /></button>)}
            </div>
          </section>
        </div>

        <div className={styles.ttcMockCenter}>
          <section className={styles.ttcMockCard}>
            <header><h2><Folder />Next Best Test Plan</h2><div>Plan Confidence <Pill tone="supported">High</Pill><Info /></div></header>
            <table className={styles.ttcMockTable}>
              <thead><tr><th>Step</th><th>Test / Action</th><th>Expected Result</th><th>Status</th><th>Evidence</th></tr></thead>
              <tbody>{testTableRows.map((row) => <tr key={row.key}><td><button className={styles.ttcMockStepButton} onClick={() => openTest(row.key)} type="button"><b className={styles.ttcMockStep}>{row.step}</b></button></td><td><button className={styles.ttcMockRowButton} onClick={() => openTest(row.key)} type="button">{row.title}</button></td><td>{row.expected}</td><td><Pill tone={row.tone}>{row.status}</Pill></td><td><button aria-label={`Open evidence requirements for ${row.title}`} onClick={() => openTest(row.key)} type="button"><Paperclip /></button><button aria-label={`Open photo capture guidance for ${row.title}`} onClick={() => openTest(row.key)} type="button"><Camera /></button><button aria-label={`Open more test actions for ${row.title}`} onClick={() => openTest(row.key)} type="button"><MoreVertical /></button></td></tr>)}</tbody>
            </table>
            <footer><button onClick={() => openPane("TESTS", "Custom test steps stay in this work loop; governed persistence comes through the test-plan backend.")} type="button">⊕ Add Custom Step</button><button onClick={() => openPane("TESTS", "Test-plan ordering is active.")} type="button">↕ Reorder Plan</button></footer>
          </section>

          <section className={styles.ttcMockCard}>
            <header><h2><Folder />Evidence &amp; Measurements</h2></header>
            <table className={styles.ttcMockTable}>
              <thead><tr><th>Type</th><th>Description</th><th>Captured</th><th>Source</th><th>Actions</th></tr></thead>
              <tbody>{evidenceRows.map(([type, description, captured, source]) => <tr key={type}><td>{type}</td><td>{description}</td><td>{captured}</td><td>{source}</td><td><button aria-label={`View ${type}`} onClick={() => openPane("EVIDENCE", `${type} evidence detail opened. MVP detail is read-only unless recorded through the governed evidence form.`)} type="button"><Eye /></button><button aria-label={`Download ${type}`} onClick={() => openPane("EVIDENCE", `${type} download requires the governed evidence object from the full case workspace.`)} type="button"><Download /></button><button aria-label={`More actions for ${type}`} onClick={() => openPane("EVIDENCE", `${type} actions are governed by evidence permissions and source availability.`)} type="button"><MoreVertical /></button></td></tr>)}</tbody>
            </table>
            <footer><button onClick={() => openPane("EVIDENCE", "Evidence capture pane active. Record quick evidence here or open the full case workspace.")} type="button"><Upload />Upload Evidence</button><Link href={`${caseWorkspaceHref}#evidence`}>View All Evidence <ChevronRight /></Link></footer>
          </section>
        </div>

        <div className={styles.ttcMockRight}>
          <section className={styles.ttcMockCard}>
            <header><h2><Info />Common Causes &amp; Ranking</h2><Info /></header>
            <table className={styles.ttcMockTable}>
              <thead><tr><th>Rank</th><th>Cause</th><th>Status</th><th>Confidence</th></tr></thead>
              <tbody>{causeRows.map(([rank, cause, status, confidence, tone]) => <tr key={rank}><td><strong>{rank}</strong></td><td><button className={styles.ttcMockRowButton} onClick={() => openCause(cause)} type="button">{cause}</button></td><td><Pill tone={tone}>{status}</Pill></td><td><button className={styles.ttcMockConfidence} onClick={() => openCause(cause)} type="button">{confidence}<i style={{ width: confidence }} /></button></td></tr>)}</tbody>
            </table>
          </section>

          <section className={styles.ttcMockCard}>
            <header><h2><Handshake />Advisor Handoff Readiness</h2></header>
            <div className={styles.ttcMockHandoff}>{handoffRows.map(([name, status, note, tone], index) => <button key={name} onClick={() => openHandoff(model.mvpActionDetails.handoff[index]?.key ?? name.toLocaleLowerCase().replaceAll(" ", "-"))} type="button"><span>{name}</span><Pill tone={tone}>{status}</Pill><small>{note}</small></button>)}</div>
          </section>

          <section className={styles.ttcMockCard}>
            <header><h2><MessageCircle />Ask Master Technician</h2><Lock /></header>
            <div className={styles.ttcMockAiGate}>
              <Lock />
              <strong>AI assistant withheld until evidence gates are satisfied</strong>
              <p>Complete required tests and attach evidence to unlock assistance.</p>
            </div>
          </section>
        </div>
      </section>
    </main>
  </section>;
}

export function TechnicianTroubleshootingUnavailable({ message }: { message: string }) {
  return <section className={styles.unavailable}><span className={styles.eyebrow}>Troubleshooting unavailable</span><h1>The troubleshooting console could not load</h1><p>{message}</p><Link href="/diagnostics">Return to Diagnostics</Link></section>;
}
