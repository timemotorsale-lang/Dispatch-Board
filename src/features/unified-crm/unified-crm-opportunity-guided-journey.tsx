"use client";

import { AlertTriangle, ArrowLeft, ExternalLink, RefreshCw, ShieldCheck } from "lucide-react";
import Link from "next/link";

import type { UnifiedCrmOpportunityGuidedJourneyModel } from "@/server/unified-crm/opportunity-guided-journey-contract";

import styles from "./unified-crm-opportunity-guided-journey.module.css";
import { UnifiedCrmOpportunityWorkspaceOrientation } from "./unified-crm-opportunity-workspace-orientation";

type FailureKind = "error" | "restricted" | "unavailable";

type Props = {
  errorMessage?: string;
  failureKind?: FailureKind;
  model?: UnifiedCrmOpportunityGuidedJourneyModel;
  returnHref: string;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Chicago"
  }).format(new Date(value));
}

function StatePanel({ kind, message, returnHref }: { kind: FailureKind; message?: string; returnHref: string }) {
  const title = kind === "restricted"
    ? "Guided opportunity review isn’t available to you"
    : kind === "unavailable"
      ? "Guided opportunity review is temporarily unavailable"
      : "Guided opportunity review couldn’t be loaded";
  const detail = message ?? "No guided opportunity review data was displayed. Retry or return to the Pipeline review.";
  const retryable = kind !== "restricted";
  return (
    <main className={styles.page}>
      <Link className={styles.backLink} href={returnHref}><ArrowLeft aria-hidden="true" size={15} />Back to CRM Pipeline</Link>
      <section className={styles.statePanel} role={retryable ? "alert" : "status"}>
        {retryable ? <AlertTriangle aria-hidden="true" size={28} /> : <ShieldCheck aria-hidden="true" size={28} />}
        <h1>{title}</h1>
        <p>{detail}</p>
        <div className={styles.stateActions}>
          {retryable ? <button onClick={() => window.location.reload()} type="button"><RefreshCw aria-hidden="true" size={14} />Retry</button> : null}
          <Link href={returnHref}>Return to Pipeline review</Link>
        </div>
      </section>
    </main>
  );
}

export function UnifiedCrmOpportunityGuidedJourney({
  errorMessage,
  failureKind = "error",
  model,
  returnHref
}: Props) {
  if (!model) return <StatePanel kind={failureKind} message={errorMessage} returnHref={returnHref} />;

  return (
    <main className={styles.page}>
      <Link className={styles.backLink} href={returnHref}><ArrowLeft aria-hidden="true" size={15} />Back to CRM Pipeline</Link>

      <section className={styles.hero}>
        <span className={styles.eyebrow}>Guided opportunity journey · review only</span>
        <h1>{model.headline.title}</h1>
        <p>{model.headline.detail}</p>
        <div className={styles.heroMeta}>
          <span className={styles.reviewTag}>Observed {formatDate(model.source.observedAt)}</span>
          <span>{model.visibility === "organization" ? "Organization review" : "Owned review"}</span>
          <span className={styles.heldTag}>{model.state}</span>
        </div>
      </section>

      <UnifiedCrmOpportunityWorkspaceOrientation
        current="guided"
        visibilityLabel={model.visibility === "owned" ? "Owned review" : "Organization review"}
      />

      {model.phases.map((phase) => (
        <section className={styles.phase} key={phase.id}>
          <div className={styles.phaseHeader}>
            <span className={styles.eyebrow}>{phase.id === "intake" ? "Start here" : phase.id === "follow-through" ? "Carry context" : "End safely"}</span>
            <strong>{phase.label}</strong>
            <p>{phase.detail}</p>
          </div>
          <div className={styles.steps}>
            {phase.steps.map((step) => (
              <Link className={styles.stepCard} href={step.href} key={step.id}>
                <header>
                  <strong>{step.label}</strong>
                  <span className={styles.heldTag}>{step.state}</span>
                </header>
                <p>{step.description}</p>
                <small>Open review step <ExternalLink aria-hidden="true" size={13} /></small>
              </Link>
            ))}
          </div>
        </section>
      ))}

      <section className={styles.phase}>
        <div className={styles.phaseHeader}>
          <span className={styles.eyebrow}>Next unlocks</span>
          <strong>What has to be true before this becomes operational</strong>
        </div>
        <ul className={styles.list}>
          {model.nextUnlocks.map((item) => <li key={item}>{item}</li>)}
        </ul>
        <Link className={styles.primaryLink} href={model.source.href}>Return to Pipeline review<ExternalLink aria-hidden="true" size={13} /></Link>
      </section>
    </main>
  );
}

export function UnifiedCrmOpportunityGuidedJourneyLoading() {
  return (
    <main className={styles.page}>
      <section aria-busy="true" aria-labelledby="opportunity-guided-journey-loading-heading" className={styles.loading}>
        <span className={styles.eyebrow}>Unified CRM</span>
        <h1 id="opportunity-guided-journey-loading-heading">Loading guided opportunity review</h1>
        <p>Checking access and loading the held guided journey. No opportunity action has been executed.</p>
        <div aria-hidden="true" className={styles.skeletons}>
          {Array.from({ length: 4 }, (_, index) => <span key={index} />)}
        </div>
      </section>
    </main>
  );
}
