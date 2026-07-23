import { AlertTriangle, BarChart3, CheckCircle2, ShieldAlert } from "lucide-react";

import type { evaluateDiagnosticPhase8ReadinessGate } from "@/server/diagnostics/phase-8-readiness-gate";
import styles from "./diagnostics.module.css";

type Phase8ReadinessGate = ReturnType<typeof evaluateDiagnosticPhase8ReadinessGate>;

const label = (value: string) => value.replaceAll("_", " ").toLocaleLowerCase().replace(/^./, (letter) => letter.toUpperCase());

export function Phase8ReadinessGateCard({ gate }: { gate: Phase8ReadinessGate }) {
  return <section className={styles.coolingManagerCard} aria-label="DG-G9 Phase 8 readiness gate">
    <header>
      <div>
        <span className={styles.eyebrow}>DG-G9 - Phase 8 readiness</span>
        <h2><BarChart3 />Electrical, waveform, and intermittent evidence</h2>
        <p>Review-only gate for Phase 8 advanced diagnostic families before any controlled pilot review.</p>
      </div>
      <strong data-status={gate.dashboardStatus}>{label(gate.gateDecision)}</strong>
    </header>
    <div className={styles.coolingManagerMetrics}>
      <article><span>Acks</span><strong>{gate.metrics.acknowledgementCount}</strong></article>
      <article><span>Cases</span><strong>{gate.metrics.caseCount}</strong></article>
      <article><span>Families</span><strong>{gate.metrics.reviewedFamilies}</strong></article>
      <article><span>Evidence</span><strong>{gate.metrics.evidenceRecords}</strong></article>
    </div>
    <div className={styles.coolingManagerItems}>
      {gate.dashboard.map((item) => <article data-status={item.status} key={item.key}>
        {item.status === "READY" ? <CheckCircle2 /> : <AlertTriangle />}
        <span><strong>{item.label}</strong><small>{item.detail}</small></span>
        <b>{label(item.status)}</b>
      </article>)}
    </div>
    <footer>
      <ShieldAlert />
      <span>DG-G9 readiness is not pilot approval and cannot authorize live testing, unsafe probing, road testing, dispatch, repair, production, or AI activation.</span>
      <code>{gate.gateChecksum.slice(0, 16)}...</code>
    </footer>
  </section>;
}
