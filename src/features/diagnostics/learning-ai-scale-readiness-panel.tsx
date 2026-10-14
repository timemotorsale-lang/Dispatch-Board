import { AlertTriangle, BrainCircuit, CheckCircle2, ShieldAlert } from "lucide-react";

import type { evaluateDiagnosticLearningAiScaleReadiness } from "@/server/diagnostics/learning-ai-readiness";
import styles from "./diagnostics.module.css";

type LearningAiScaleReadiness = ReturnType<typeof evaluateDiagnosticLearningAiScaleReadiness>;

const label = (value: string) => value.replaceAll("_", " ").toLocaleLowerCase().replace(/^./, (letter) => letter.toUpperCase());

export function LearningAiScaleReadinessPanel({ readiness }: { readiness: LearningAiScaleReadiness }) {
  return <section className={styles.coolingManagerCard} aria-label="Learning, AI, and scale readiness">
    <header>
      <div>
        <span className={styles.eyebrow}>DGN-046-050 + DG-G10</span>
        <h2><BrainCircuit />Learning, AI, and scale readiness</h2>
        <p>Verified similar cases, calibration proposals, supervised AI controls, and enterprise-scale evidence.</p>
      </div>
      <strong data-status={readiness.status}>{label(readiness.status)}</strong>
    </header>
    <div className={styles.coolingManagerMetrics}>
      <article><span>Matches</span><strong>{readiness.metrics.similarCaseMatches}</strong></article>
      <article><span>Excluded</span><strong>{readiness.metrics.excludedCases}</strong></article>
      <article><span>Red-team</span><strong>{readiness.metrics.redTeamScenarioCount}</strong></article>
      <article><span>Holds</span><strong>{readiness.holdCodes.length}</strong></article>
    </div>
    <div className={styles.coolingManagerItems}>
      {readiness.dashboard.map((item) => <article data-status={item.status} key={item.key}>
        {item.status === "READY" ? <CheckCircle2 /> : <AlertTriangle />}
        <span><strong>{item.label}</strong><small>{item.detail}</small></span>
        <b>{label(item.status)}</b>
      </article>)}
    </div>
    <footer>
      <ShieldAlert />
      <span>Review readiness only: no AI authority, live provider activation, external connector activation, production logic mutation, dispatch, repair approval, or customer presentation.</span>
      <code>{readiness.readinessChecksum.slice(0, 16)}...</code>
    </footer>
  </section>;
}
