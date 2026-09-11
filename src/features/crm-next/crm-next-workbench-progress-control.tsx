"use client";

import { useState } from "react";

import styles from "./crm-next-shell.module.css";

const JOURNEY_STAGES = [
  "New",
  "Contact Attempt",
  "Contacted",
  "Appointment Scheduled",
  "Working Deal",
  "Sold",
  "Lost"
] as const;

const PROGRESS_ACTIONS = [
  "No action recorded",
  "Contact attempted",
  "Customer responded",
  "Appointment set",
  "CRM task created",
  "Follow-up needed",
  "Resolved"
] as const;

type JourneyStage = typeof JOURNEY_STAGES[number];
type ProgressAction = typeof PROGRESS_ACTIONS[number];

export function CrmNextWorkbenchProgressControl({
  initialStage = "New",
  nextAction
}: {
  initialStage?: JourneyStage;
  nextAction: string;
}) {
  const [stage, setStage] = useState<JourneyStage>(initialStage);
  const [progress, setProgress] = useState<ProgressAction>("No action recorded");

  return (
    <section className={styles.workbenchProgressControl} aria-label="Staff-controlled customer progress">
      <header>
        <div>
          <strong>Staff-controlled progress</strong>
          <span>Move the customer only after staff records what actually happened.</span>
        </div>
        <b>{stage}</b>
      </header>

      <div className={styles.journeyStageRail} aria-label="Customer journey stages">
        {JOURNEY_STAGES.map((item) => (
          <button aria-pressed={stage === item} key={item} onClick={() => setStage(item)} type="button">
            {item}
          </button>
        ))}
      </div>

      <div className={styles.progressActionGrid} aria-label="Progress actions">
        {PROGRESS_ACTIONS.map((item) => (
          <button aria-pressed={progress === item} key={item} onClick={() => setProgress(item)} type="button">
            {item}
          </button>
        ))}
      </div>

      <div className={styles.progressOutcomeBox}>
        <div>
          <span>Current progress</span>
          <strong>{progress}</strong>
          <small>Next: {nextAction}</small>
        </div>
        <label>
          <span>Outcome note</span>
          <textarea placeholder="Record what happened, what the customer said, and the next follow-up window." rows={3} />
        </label>
      </div>
    </section>
  );
}
