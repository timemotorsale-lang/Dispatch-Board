import { AlertTriangle, BarChart3, CheckCircle2, ShieldAlert } from "lucide-react";

import type { evaluateDiagnosticAdvancedFamilyReadinessGate } from "@/server/diagnostics/advanced-family-readiness-gate";
import styles from "./diagnostics.module.css";

type AdvancedFamilyReadinessGate = ReturnType<typeof evaluateDiagnosticAdvancedFamilyReadinessGate>;

const label = (value: string) => value.replaceAll("_", " ").toLocaleLowerCase().replace(/^./, (letter) => letter.toUpperCase());

export function AdvancedFamilyReadinessGateCard({ gate }: { gate: AdvancedFamilyReadinessGate }) {
  return <section className={styles.coolingManagerCard} aria-label="DG-G8 advanced-family readiness gate">
    <header>
      <div>
        <span className={styles.eyebrow}>DG-G8 · Advanced family readiness</span>
        <h2><BarChart3 />Cooling plus Phase 7 mechanical evidence</h2>
        <p>Review-only gate for advanced diagnostic families before any controlled advanced pilot review.</p>
      </div>
      <strong data-status={gate.dashboardStatus}>{label(gate.gateDecision)}</strong>
    </header>
    <div className={styles.coolingManagerMetrics}>
      <article><span>Cooling acks</span><strong>{gate.metrics.coolingAcknowledgements}</strong></article>
      <article><span>Mechanical acks</span><strong>{gate.metrics.mechanicalAcknowledgements}</strong></article>
      <article><span>Families</span><strong>{gate.metrics.mechanicalReviewedFamilies}</strong></article>
      <article><span>Evidence</span><strong>{gate.metrics.totalEvidenceRecords}</strong></article>
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
      <span>DG-G8 readiness is not pilot approval and cannot authorize live testing, dispatch, repair, production, or AI activation.</span>
      <code>{gate.gateChecksum.slice(0, 16)}…</code>
    </footer>
  </section>;
}
