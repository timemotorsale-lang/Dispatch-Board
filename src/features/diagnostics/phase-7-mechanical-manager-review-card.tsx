import { AlertTriangle, BarChart3, CheckCircle2, ShieldAlert } from "lucide-react";

import type { buildPhase7MechanicalManagerReviewCard } from "@/server/diagnostics/phase-7-mechanical-pilot-hardening";
import styles from "./diagnostics.module.css";

type Phase7MechanicalManagerReviewCardProps = ReturnType<typeof buildPhase7MechanicalManagerReviewCard>;

const label = (value: string) => value.replaceAll("_", " ").toLocaleLowerCase().replace(/^./, (letter) => letter.toUpperCase());

export function Phase7MechanicalManagerReviewCard({ card }: { card: Phase7MechanicalManagerReviewCardProps }) {
  return <section className={styles.coolingManagerCard} aria-label="Phase 7 mechanical shadow manager review card">
    <header>
      <div>
        <span className={styles.eyebrow}>Phase 7 · Manager review</span>
        <h2><BarChart3 />Brake, HVAC, and misfire acknowledgement history</h2>
        <p>Read-only review of Phase 7 technician acknowledgements, family coverage, blockers, escalations, and authority posture.</p>
      </div>
      <strong data-status={card.status}>{label(card.status)}</strong>
    </header>
    <div className={styles.coolingManagerMetrics}>
      <article><span>Acknowledgements</span><strong>{card.metrics.acknowledgementCount}</strong></article>
      <article><span>Cases</span><strong>{card.metrics.caseCount}</strong></article>
      <article><span>Families</span><strong>{card.metrics.reviewedFamilyCount}</strong></article>
      <article><span>Escalations</span><strong>{card.metrics.escalationCaseCount}</strong></article>
    </div>
    <div className={styles.coolingManagerItems}>
      {card.reviewItems.map((item) => <article data-status={item.status} key={item.key}>
        {item.status === "READY" ? <CheckCircle2 /> : <AlertTriangle />}
        <span><strong>{item.label}</strong><small>{item.detail}</small></span>
        <b>{label(item.status)}</b>
      </article>)}
    </div>
    <footer>
      <ShieldAlert />
      <span>Manager review cannot authorize live testing, dispatch, repair, customer presentation, controlled pilot, production, or AI activation.</span>
      <code>{card.cardChecksum.slice(0, 16)}…</code>
    </footer>
  </section>;
}
