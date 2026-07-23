import { AlertTriangle, BarChart3, CheckCircle2, ShieldAlert } from "lucide-react";

import type { buildCoolingOverheatingManagerReviewCard } from "@/server/diagnostics/cooling-overheating-pilot-hardening";
import styles from "./diagnostics.module.css";

type CoolingManagerReviewCard = ReturnType<typeof buildCoolingOverheatingManagerReviewCard>;

const label = (value: string) => value.replaceAll("_", " ").toLocaleLowerCase().replace(/^./, (letter) => letter.toUpperCase());

export function CoolingOverheatingManagerReviewCard({ card }: { card: CoolingManagerReviewCard }) {
  return <section className={styles.coolingManagerCard} aria-label="Cooling shadow manager review card">
    <header>
      <div>
        <span className={styles.eyebrow}>DGN-063 · Manager review</span>
        <h2><BarChart3 />Cooling shadow acknowledgement history</h2>
        <p>Read-only review of technician acknowledgements, blockers, escalations, and authority posture.</p>
      </div>
      <strong data-status={card.status}>{label(card.status)}</strong>
    </header>
    <div className={styles.coolingManagerMetrics}>
      <article><span>Acknowledgements</span><strong>{card.metrics.acknowledgementCount}</strong></article>
      <article><span>Cases</span><strong>{card.metrics.caseCount}</strong></article>
      <article><span>Blocked</span><strong>{card.metrics.blockedCaseCount}</strong></article>
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
      <span>Manager review cannot authorize live testing, dispatch, repair, customer presentation, controlled pilot, or production.</span>
      <code>{card.cardChecksum.slice(0, 16)}…</code>
    </footer>
  </section>;
}
