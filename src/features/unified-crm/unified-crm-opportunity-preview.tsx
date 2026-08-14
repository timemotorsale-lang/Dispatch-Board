import {
  UNIFIED_CRM_OPPORTUNITY_READ_CONTRACT_VERSION,
  type UnifiedCrmOpportunityHeldReadModel
} from "@/server/unified-crm/opportunity-read-contract";

import styles from "./unified-crm-shell.module.css";

const previewModel: UnifiedCrmOpportunityHeldReadModel = {
  contractVersion: UNIFIED_CRM_OPPORTUNITY_READ_CONTRACT_VERSION,
  state: "HELD",
  stagePolicy: {
    definitionId: null,
    label: "Pending business approval",
    orderHint: null,
    lifecycleHeld: true
  },
  cards: [
    {
      title: "Stage policy",
      detail: "Opportunity stages, order, entry evidence, and close rules stay held until the approved lifecycle is recorded.",
      tone: "warning"
    },
    {
      title: "Owning-system bridges",
      detail: "Tasks, appointments, and dispatch stay in their source systems. CRM will correlate them without taking over their authority.",
      tone: "positive"
    },
    {
      title: "Feature off for operational use",
      detail: "No pipeline movement, forecast, or opportunity write is active from this console yet.",
      tone: "neutral"
    }
  ],
  nextSteps: [
    "Approve stage definitions and transition evidence to unlock operational opportunity slices.",
    "Keep feature flags off until the first governed create, detail, and transition path are proven end to end."
  ]
};

export function UnifiedCrmOpportunityPreview() {
  return (
    <section className={styles.opportunityPreview} aria-label="Held opportunity foundation preview">
      <header className={styles.opportunityPreviewHeader}>
        <div>
          <span className={styles.sectionLabel}>Opportunity foundation</span>
          <h2>Foundation is ready. Lifecycle rules are intentionally held.</h2>
          <p>
            This keeps us honest: we can review the opportunity surface now without pretending that
            stage movement or creation is available before policy is approved.
          </p>
        </div>
        <span className={styles.reviewBadge}>Review only · held state</span>
      </header>

      <div className={styles.opportunityPreviewGrid}>
        {previewModel.cards.map((card) => (
          <article className={styles.opportunityPreviewCard} key={card.title}>
            <header>
              <strong>{card.title}</strong>
              <span className={styles[`insight${card.tone[0].toUpperCase()}${card.tone.slice(1)}`]}>
                {card.tone === "positive" ? "Ready" : card.tone === "warning" ? "Held" : "Planned"}
              </span>
            </header>
            <p>{card.detail}</p>
          </article>
        ))}
      </div>

      <div className={styles.opportunityConstraints}>
        <strong>What this preview protects</strong>
        <p>No opportunity record is created in this preview.</p>
        <p>
          Pipeline columns, transitions, and forecast math stay off until the approved lifecycle is
          defined and verified against permissions, rollback, and audit rules.
        </p>
      </div>

      <div className={styles.opportunityNextSteps}>
        {previewModel.nextSteps.map((step) => (
          <article className={styles.opportunityPreviewCard} key={step}>
            <strong>Next unlock</strong>
            <p>{step}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
