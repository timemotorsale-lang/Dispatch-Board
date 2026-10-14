import { AlertTriangle, BarChart3, CheckCircle2, RotateCcw, ShieldAlert } from "lucide-react";
import Link from "next/link";

import type { DiagnosticRelease4PilotGateResult } from "@/server/diagnostics/release-4-pilot-gate-domain";
import styles from "./diagnostics.module.css";

const label = (value: string) => value.replaceAll("_", " ").toLocaleLowerCase().replace(/^./, (letter) => letter.toUpperCase());

export function DiagnosticRelease4AcceptanceDashboard({ evidenceRepositoryChecksum, evidenceRepositoryStatus, result }: {
  evidenceRepositoryChecksum?: string | null;
  evidenceRepositoryStatus?: "EMPTY" | "LOADED";
  result: DiagnosticRelease4PilotGateResult;
}) {
  const readyCount = result.dashboard.filter((item) => item.status === "READY").length;
  return <section className={styles.acceptanceDashboard} aria-label="Diagnostics Release 4 acceptance dashboard">
    <header className={styles.acceptanceHero}>
      <div>
        <span className={styles.eyebrow}>DGN-055–056 · Release 4</span>
        <h1>Pilot Readiness & Acceptance</h1>
        <p>Evidence-backed readiness for a reversible controlled pilot. Missing evidence stays visible and never becomes an inferred approval.</p>
      </div>
      <div className={styles.acceptanceDecision} data-status={result.dashboardStatus}>
        <ShieldAlert />
        <span>Current disposition</span>
        <strong>{label(result.dashboardStatus)}</strong>
        <small>{label(result.gateDecision)}</small>
      </div>
    </header>

    <div className={styles.acceptanceBoundary} role="status">
      <AlertTriangle />
      <span><strong>Controlled-pilot boundary:</strong> this gate cannot authorize production, customer-facing automation, AI activation, parts ordering, or scheduling.</span>
    </div>

    <section className={styles.acceptanceMetrics} aria-label="Pilot evidence metrics">
      <article><BarChart3 /><span>Gate evidence</span><strong>{readyCount}/{result.dashboard.length}</strong><small>checks ready</small></article>
      <article><span>Replay cases</span><strong>{result.metrics.replayCaseCount}</strong><small>mechanical + autobody required</small></article>
      <article><span>Labor variance</span><strong>{result.metrics.meanConsoleVsActualLaborVariancePercent}%</strong><small>console vs. actual</small></article>
      <article><span>Estimate variance</span><strong>{result.metrics.meanEstimateVariancePercent}%</strong><small>console vs. actual</small></article>
      <article><span>Override rate</span><strong>{result.metrics.overrideRatePercent}%</strong><small>manager overrides</small></article>
      <article><span>Abstention quality</span><strong>{result.metrics.abstentionQualityPercent}%</strong><small>appropriate abstentions</small></article>
    </section>

    <div className={styles.acceptanceGrid}>
      <main>
        <section className={styles.acceptanceChecklist}>
          <header><div><h2>DG-G6 acceptance evidence</h2><p>Every row must be ready before a controlled pilot can be considered.</p></div><span>{readyCount} ready</span></header>
          <div>
            {result.dashboard.map((item) => <article key={item.key} data-status={item.status}>
              {item.status === "READY" ? <CheckCircle2 /> : <AlertTriangle />}
              <div><strong>{item.label}</strong><p>{item.detail}</p></div>
              <span>{label(item.status)}</span>
            </article>)}
          </div>
        </section>
      </main>

      <aside className={styles.acceptanceRail}>
        {evidenceRepositoryStatus ? <section>
          <h2><ShieldAlert /> Evidence store</h2>
          <p>{evidenceRepositoryStatus === "LOADED" ? "Pilot evidence snapshot loaded for this gate review." : "No pilot evidence snapshot has been recorded yet."}</p>
          {evidenceRepositoryChecksum ? <p>Checksum: {evidenceRepositoryChecksum.slice(0, 12)}...</p> : null}
        </section> : null}
        <section>
          <h2><AlertTriangle /> Active holds</h2>
          {result.holdCodes.length ? <ul>{result.holdCodes.map((code) => <li key={code}>{label(code)}</li>)}</ul> : <p>No active holds are recorded.</p>}
        </section>
        <section>
          <h2><RotateCcw /> Required safeguards</h2>
          <ul><li>Documented monitoring plan</li><li>Verified pause control</li><li>Documented rollback plan</li><li>Role training and two-role acceptance</li><li>Owned disposition for every open risk</li></ul>
        </section>
        <Link href="/diagnostics">Back to Diagnostics Command Center</Link>
      </aside>
    </div>
  </section>;
}

export function DiagnosticRelease4DashboardRestricted() {
  return <section className={styles.unavailable}><ShieldAlert /><span className={styles.eyebrow}>Protected release gate</span><h1>Manager access is required</h1><p>The acceptance dashboard contains pilot readiness, review outcomes, and rollout holds reserved for workflow reviewers.</p><Link href="/diagnostics">Return to Diagnostics</Link></section>;
}
