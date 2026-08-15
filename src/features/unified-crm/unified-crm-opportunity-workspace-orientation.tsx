import styles from "./unified-crm-opportunity-workspace-orientation.module.css";

type OrientationStep = {
  description: string;
  label: string;
};

type Props = {
  current: "pipeline" | "hub" | "guided";
  visibilityLabel: string;
};

const STEPS: Record<Props["current"], { intro: string; title: string }> = {
  pipeline: {
    title: "You are at the workspace entry point",
    intro: "Start here if you want the quickest review of how the opportunity workspace will eventually look day to day."
  },
  hub: {
    title: "You are in the workspace map",
    intro: "Use this page when you want to jump to any opportunity review surface without losing the bigger picture."
  },
  guided: {
    title: "You are following the intended review path",
    intro: "Use this when you want the simplest end-to-end walkthrough in the same order a user would naturally review it."
  }
};

const ORIENTATION_STEPS: OrientationStep[] = [
  {
    label: "Pipeline",
    description: "See the opportunity workspace entry point and the held board and list shape."
  },
  {
    label: "Hub",
    description: "Choose the exact review surface you want without leaving the opportunity workspace."
  },
  {
    label: "Guided journey",
    description: "Follow the safest review path in order: queue, detail, transition, then create."
  }
];

export function UnifiedCrmOpportunityWorkspaceOrientation({ current, visibilityLabel }: Props) {
  const activeIndex = current === "pipeline" ? 0 : current === "hub" ? 1 : 2;
  const copy = STEPS[current];

  return (
    <section aria-label="Opportunity workspace orientation" className={styles.panel}>
      <header className={styles.header}>
        <div>
          <span className={styles.eyebrow}>Opportunity workspace</span>
          <h2>{copy.title}</h2>
          <p>{copy.intro}</p>
        </div>
        <span className={styles.meta}>{visibilityLabel}</span>
      </header>
      <div className={styles.steps}>
        {ORIENTATION_STEPS.map((step, index) => (
          <article
            aria-current={index === activeIndex ? "step" : undefined}
            className={`${styles.step} ${index === activeIndex ? styles.stepCurrent : ""}`}
            key={step.label}
          >
            <div className={styles.stepLabelRow}>
              <span aria-hidden="true" className={styles.stepIndex}>{index + 1}</span>
              <strong>{step.label}</strong>
            </div>
            <small>{step.description}</small>
          </article>
        ))}
      </div>
    </section>
  );
}
