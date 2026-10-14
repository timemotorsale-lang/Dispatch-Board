import { AlertTriangle, BrainCircuit, CheckCircle2, ShieldAlert } from "lucide-react";

import type { createDiagnosticControlledCalibrationProposal, evaluateDiagnosticAdvancedAiDraftGate, evaluateDiagnosticAiGatewayReadiness, evaluateDiagnosticEnterpriseScaleReadiness, findDiagnosticVerifiedSimilarCases } from "@/server/diagnostics/learning-ai-readiness";
import styles from "./diagnostics.module.css";

type SimilarCases = ReturnType<typeof findDiagnosticVerifiedSimilarCases>;
type CalibrationProposal = ReturnType<typeof createDiagnosticControlledCalibrationProposal>;
type AiGateway = ReturnType<typeof evaluateDiagnosticAiGatewayReadiness>;
type AdvancedDraftGate = ReturnType<typeof evaluateDiagnosticAdvancedAiDraftGate>;
type EnterpriseScale = ReturnType<typeof evaluateDiagnosticEnterpriseScaleReadiness>;

const label = (value: string) => value.replaceAll("_", " ").toLocaleLowerCase().replace(/^./, (letter) => letter.toUpperCase());

export function LearningAiReadinessCard({ similarCases, calibration, gateway, advancedDraftGate, enterpriseScale }: { similarCases: SimilarCases; calibration: CalibrationProposal; gateway: AiGateway; advancedDraftGate: AdvancedDraftGate; enterpriseScale: EnterpriseScale }) {
  const items = [
    { key: "SIMILAR_CASES", label: "Verified similar cases", status: similarCases.status === "MATCHES_AVAILABLE" ? "READY" : "HOLD", detail: `${similarCases.matches.length} verified matches; ${similarCases.excludedCases.length} excluded.` },
    { key: "CALIBRATION", label: "Controlled calibration proposal", status: calibration.status === "READY_FOR_SHADOW_EVALUATION" ? "READY" : "HOLD", detail: `${label(calibration.target)} for ${label(calibration.family)}; improvement ${calibration.metrics.improvement}.` },
    { key: "AI_GATEWAY", label: "Provider-neutral AI gateway", status: gateway.status === "READY_FOR_SUPERVISED_SHADOW" || gateway.status === "DISABLED_READY" ? "READY" : "HOLD", detail: `${label(gateway.status)}; mode ${label(gateway.mode)}.` },
    { key: "ADVANCED_DRAFTS", label: "Advanced AI diagnostic drafts", status: advancedDraftGate.status === "READY_FOR_SHADOW_DRAFT_REVIEW" ? "READY" : "HOLD", detail: `${label(advancedDraftGate.draftType)}; ${advancedDraftGate.metrics.similarCaseMatches} similar cases.` },
    { key: "ENTERPRISE_SCALE", label: "Enterprise scale readiness", status: enterpriseScale.status === "READY_FOR_ENTERPRISE_SCALE_REVIEW" ? "READY" : "HOLD", detail: `P95 ${enterpriseScale.metrics.loadTestP95Ms}ms; RTO ${enterpriseScale.metrics.recoveryTimeObjectiveMinutes} minutes.` }
  ] as const;

  return <section className={styles.coolingManagerCard} aria-label="DGN-046 through DGN-050 learning and AI readiness">
    <header>
      <div>
        <span className={styles.eyebrow}>DGN-046-050 + DG-G10 - Learning, AI, and scale readiness</span>
        <h2><BrainCircuit />Outcome learning, calibration, and supervised AI</h2>
        <p>Review-only controls for verified similar cases, calibration proposals, and optional AI assistance.</p>
      </div>
      <strong data-status={advancedDraftGate.status}>{label(advancedDraftGate.status)}</strong>
    </header>
    <div className={styles.coolingManagerMetrics}>
      <article><span>Matches</span><strong>{similarCases.matches.length}</strong></article>
      <article><span>Verified</span><strong>{calibration.metrics.verifiedOutcomeCount}</strong></article>
      <article><span>Gateway holds</span><strong>{gateway.holdCodes.length}</strong></article>
      <article><span>Scale holds</span><strong>{enterpriseScale.holdCodes.length}</strong></article>
    </div>
    <div className={styles.coolingManagerItems}>
      {items.map((item) => <article data-status={item.status} key={item.key}>
        {item.status === "READY" ? <CheckCircle2 /> : <AlertTriangle />}
        <span><strong>{item.label}</strong><small>{item.detail}</small></span>
        <b>{label(item.status)}</b>
      </article>)}
    </div>
    <footer>
      <ShieldAlert />
      <span>Learning and AI readiness cannot self-modify production logic, diagnose, authorize repairs, dispatch work, present to customers, or bypass human review.</span>
      <code>{advancedDraftGate.gateChecksum.slice(0, 16)}...</code>
    </footer>
  </section>;
}
