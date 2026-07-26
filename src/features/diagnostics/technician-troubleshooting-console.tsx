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
  Settings,
  Upload
} from "lucide-react";
import Link from "next/link";
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
  ["Open Recalls", "1", "red"],
  ["TSB / Service Bulletins", "3", "yellow"],
  ["Known Issue Library Matches", "2", "yellow"],
  ["Prior RO History", "5", "blue"],
  ["Comeback History (This Concern)", "0", "green"]
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

function SidebarItem({ active, icon, label }: { active?: boolean; icon: ReactNode; label: string }) {
  return <button aria-current={active ? "page" : undefined} className={styles.ttcMockSidebarItem} type="button">{icon}<span>{label}</span></button>;
}

export function TechnicianTroubleshootingConsole({ model }: { model: Model }) {
  const context = model.caseContext;
  const [notice, setNotice] = useState("");

  function action(message: string) {
    setNotice(message);
  }

  return <section className={styles.ttcMockShell} aria-label="Technician Troubleshooting Console">
    <aside className={styles.ttcMockSidebar}>
      <button className={styles.ttcMockMenuButton} type="button"><Menu /></button>
      <nav>
        <SidebarItem icon={<Home />} label="Home" />
        <SidebarItem active icon={<Laptop />} label="Diagnostics" />
        <SidebarItem icon={<Clipboard />} label="ROs" />
        <SidebarItem icon={<Car />} label="Vehicles" />
        <SidebarItem icon={<Box />} label="Parts" />
        <SidebarItem icon={<BookOpen />} label="Library" />
        <SidebarItem icon={<BarChart3 />} label="Reports" />
        <SidebarItem icon={<MessageSquare />} label="Messages" />
      </nav>
      <div>
        <SidebarItem icon={<Settings />} label="Settings" />
        <SidebarItem icon={<ChevronsLeft />} label="Collapse" />
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
        <article><Clipboard /><span>Active RO</span><strong>{context.repairOrder.repairOrderNumber}</strong></article>
        <article><MessageCircle /><span>Customer</span><strong>Leo James</strong></article>
        <article><Car /><span>Vehicle</span><strong>{context.vehicle.label}</strong><small>4 Door Sedan</small></article>
        <article><span className={styles.ttcMockBarcode}>||||||||||</span><span>VIN</span><strong>{context.vehicle.vin ?? "JM1BL1SF3A1257561"}</strong></article>
        <article><MessageCircle /><span>Concern</span><strong>{context.concern || "intermittent no crank after hot soak"}</strong></article>
      </section>

      <section className={styles.ttcMockGrid}>
        <div className={styles.ttcMockLeft}>
          <section className={styles.ttcMockCard}>
            <header><h2><Clipboard />Diagnostic Intake</h2><button onClick={() => action("Intake editing will open the governed intake detail flow.")} type="button"><Pencil />Edit</button></header>
            <div className={styles.ttcMockIntakeLine}><span>Symptom Family</span><strong>No Crank / No Start</strong><ChevronDown /></div>
            <div className={styles.ttcMockIntakeLine}><span>Operating Conditions</span><strong>Hot soak after drive, ambient temp 85–95°F</strong></div>
            <div className={styles.ttcMockIntakeLine}><span>Safety Gate Status</span><Pill tone="supported">CLEARED</Pill><small>No active safety concerns</small></div>
            <div className={styles.ttcMockChecklist}>
              <div><span>Missing Details Checklist</span><strong>3 of 6 complete</strong></div>
              {checks.map(([state, text]) => <p className={styles[`ttcMockCheck_${state}`]} key={text}><i />{text}</p>)}
            </div>
            <button className={styles.ttcMockTextButton} onClick={() => action("All intake details remain governed by case intake authority.")} type="button">View / Edit All Intake Details</button>
          </section>

          <section className={styles.ttcMockCard}>
            <header><h2><FileText />Vehicle Intelligence Check</h2></header>
            <div className={styles.ttcMockIntelList}>
              {intelligenceRows.map(([name, count, tone]) => <button key={name} onClick={() => action(`${name} opens its governed source review. Licensed sources remain required where applicable.`)} type="button"><FileText /><span>{name}</span><b className={styles[`ttcMockCount_${tone}`]}>{count}</b><ChevronRight /></button>)}
            </div>
          </section>
        </div>

        <div className={styles.ttcMockCenter}>
          <section className={styles.ttcMockCard}>
            <header><h2><Folder />Next Best Test Plan</h2><div>Plan Confidence <Pill tone="supported">High</Pill><Info /></div></header>
            <table className={styles.ttcMockTable}>
              <thead><tr><th>Step</th><th>Test / Action</th><th>Expected Result</th><th>Status</th><th>Evidence</th></tr></thead>
              <tbody>{testRows.map(([step, test, expected, status, tone]) => <tr key={step}><td><b className={styles.ttcMockStep}>{step}</b></td><td>{test}</td><td>{expected}</td><td><Pill tone={tone}>{status}</Pill></td><td><Paperclip /><Camera /><MoreVertical /></td></tr>)}</tbody>
            </table>
            <footer><button onClick={() => action("Custom steps will be added through the governed test-plan command.")} type="button">⊕ Add Custom Step</button><button type="button">↕ Reorder Plan</button></footer>
          </section>

          <section className={styles.ttcMockCard}>
            <header><h2><Folder />Evidence &amp; Measurements</h2></header>
            <table className={styles.ttcMockTable}>
              <thead><tr><th>Type</th><th>Description</th><th>Captured</th><th>Source</th><th>Actions</th></tr></thead>
              <tbody>{evidenceRows.map(([type, description, captured, source]) => <tr key={type}><td>{type}</td><td>{description}</td><td>{captured}</td><td>{source}</td><td><Eye /><Download /><MoreVertical /></td></tr>)}</tbody>
            </table>
            <footer><button onClick={() => action("Evidence upload will attach to the governed diagnostic evidence ledger.")} type="button"><Upload />Upload Evidence</button><button type="button">View All Evidence <ChevronRight /></button></footer>
          </section>
        </div>

        <div className={styles.ttcMockRight}>
          <section className={styles.ttcMockCard}>
            <header><h2><Info />Common Causes &amp; Ranking</h2><Info /></header>
            <table className={styles.ttcMockTable}>
              <thead><tr><th>Rank</th><th>Cause</th><th>Status</th><th>Confidence</th></tr></thead>
              <tbody>{causeRows.map(([rank, cause, status, confidence, tone]) => <tr key={rank}><td><strong>{rank}</strong></td><td>{cause}</td><td><Pill tone={tone}>{status}</Pill></td><td><span className={styles.ttcMockConfidence}>{confidence}<i style={{ width: confidence }} /></span></td></tr>)}</tbody>
            </table>
          </section>

          <section className={styles.ttcMockCard}>
            <header><h2><Handshake />Advisor Handoff Readiness</h2></header>
            <div className={styles.ttcMockHandoff}>{handoffRows.map(([name, status, note, tone]) => <p key={name}><span>{name}</span><Pill tone={tone}>{status}</Pill><small>{note}</small></p>)}</div>
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
