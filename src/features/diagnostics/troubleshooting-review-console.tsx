import { AlertTriangle, Brain, CheckCircle2, ClipboardList, GraduationCap, Stethoscope } from "lucide-react";
import Link from "next/link";

import type { DiagnosticsCommandCenterModel } from "@/server/diagnostics/service";
import styles from "./diagnostics.module.css";

const label = (value: string) => value.replaceAll("_", " ").toLocaleLowerCase().replace(/^./, (letter) => letter.toUpperCase());

export function TroubleshootingReviewConsole({ model }: { model: DiagnosticsCommandCenterModel }) {
  const active = model.items.filter((item) => !["VERIFIED_CLOSED", "ABANDONED"].includes(item.status));
  const reviewItems = active.map((item) => ({
    id: item.id,
    concern: item.concern,
    readiness: item.status === "CONFIRMED" || item.status === "REPAIR_PLANNING" ? "HANDOFF_REVIEW" : item.status === "TRIAGE" ? "INTAKE_REVIEW" : "LEARNING_WATCH",
    status: item.status,
    vehicle: item.vehicle.label
  }));
  return <section className={styles.troubleshootingReview} aria-label="Troubleshooting review console">
    <header>
      <div><span className={styles.eyebrow}>Manager / Master Technician</span><h1>Troubleshooting Review Queue</h1><p>Review diagnostic patterns, advisor draft readiness, rejected paths, and learning proposals before anything becomes production knowledge.</p></div>
      <Link href="/diagnostics">Back to Diagnostics</Link>
    </header>
    <section className={styles.reviewSummary}>
      <article><Stethoscope /><span>Active cases</span><strong>{active.length}</strong></article>
      <article><ClipboardList /><span>Review items</span><strong>{reviewItems.length}</strong></article>
      <article><GraduationCap /><span>Learning mode</span><strong>Draft only</strong></article>
      <article><Brain /><span>AI authority</span><strong>Withheld</strong></article>
    </section>
    <div className={styles.troubleshootingReviewGrid}>
      <main>
        {reviewItems.length ? reviewItems.map((item) => <article key={item.id}>
          <div><strong>{item.vehicle}</strong><p>{item.concern}</p><small>{label(item.status)}</small></div>
          <span>{label(item.readiness)}</span>
          <Link href={`/diagnostics/cases/${encodeURIComponent(item.id)}/troubleshooting`}>Open review</Link>
        </article>) : <section className={styles.reviewEmpty}><CheckCircle2 /><h2>No active troubleshooting reviews</h2><p>Verified and abandoned cases remain available from the case queue.</p></section>}
      </main>
      <aside>
        <h2><AlertTriangle /> Review rules</h2>
        <ul>
          <li>Do not approve learning from a single case without review.</li>
          <li>Keep known issues as clues until evidence confirms the cause.</li>
          <li>Do not cite OEM procedures, diagrams, bulletins, or part numbers without licensed source access.</li>
          <li>AI/Master Technician assistance remains gated.</li>
        </ul>
      </aside>
    </div>
  </section>;
}

export function TroubleshootingReviewUnavailable({ message }: { message: string }) {
  return <section className={styles.unavailable}><AlertTriangle /><span className={styles.eyebrow}>Troubleshooting review unavailable</span><h1>The review queue could not load</h1><p>{message}</p><Link href="/diagnostics">Return to Diagnostics</Link></section>;
}
