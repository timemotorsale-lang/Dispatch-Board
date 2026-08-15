"use client";

import { AlertTriangle, ArrowLeft, ExternalLink, RefreshCw, ShieldCheck } from "lucide-react";
import Link from "next/link";

import type { UnifiedCrmOpportunityTransitionReviewModel } from "@/server/unified-crm/opportunity-transition-contract";
import { withUnifiedCrmOpportunityReturn } from "@/server/unified-crm/opportunity-review-return";

import styles from "./unified-crm-opportunity-transition-review.module.css";
import { getUnifiedCrmOpportunityReturnContext } from "./unified-crm-opportunity-return-context";

type FailureKind = "error" | "restricted" | "unavailable";

type Props = {
  errorMessage?: string;
  failureKind?: FailureKind;
  model?: UnifiedCrmOpportunityTransitionReviewModel;
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
  const returnContext = getUnifiedCrmOpportunityReturnContext(returnHref);
  const title = kind === "restricted"
    ? "Opportunity transition review isn’t available to you"
    : kind === "unavailable"
      ? "Opportunity transition review is temporarily unavailable"
      : "Opportunity transition review couldn’t be loaded";
  const detail = message ?? "No transition review data was displayed. Retry or return to the Pipeline review.";
  const retryable = kind !== "restricted";
  return (
    <main className={styles.page}>
      <Link className={styles.backLink} href={returnHref}><ArrowLeft aria-hidden="true" size={15} />{returnContext.backLabel}</Link>
      <section className={styles.statePanel} role={retryable ? "alert" : "status"}>
        {retryable ? <AlertTriangle aria-hidden="true" size={28} /> : <ShieldCheck aria-hidden="true" size={28} />}
        <h1>{title}</h1>
        <p>{detail}</p>
        <div className={styles.stateActions}>
          {retryable ? <button onClick={() => window.location.reload()} type="button"><RefreshCw aria-hidden="true" size={14} />Retry</button> : null}
          <Link href={returnHref}>{returnContext.returnLabel}</Link>
        </div>
      </section>
    </main>
  );
}

export function UnifiedCrmOpportunityTransitionReview({ errorMessage, failureKind = "error", model, returnHref }: Props) {
  if (!model) return <StatePanel kind={failureKind} message={errorMessage} returnHref={returnHref} />;
  const returnContext = getUnifiedCrmOpportunityReturnContext(returnHref);

  return (
    <main className={styles.page}>
      <Link className={styles.backLink} href={returnHref}><ArrowLeft aria-hidden="true" size={15} />{returnContext.backLabel}</Link>

      <section className={styles.hero}>
        <span className={styles.eyebrow}>Opportunity transition · review only</span>
        <h1>{model.headline.title}</h1>
        <p>{model.headline.detail}</p>
        <div className={styles.heroMeta}>
          <span className={styles.heldTag}>{model.transitionAction.state}</span>
          <span>Observed {formatDate(model.source.observedAt)} · {model.visibility === "organization" ? "Organization review" : "Owned review"}</span>
          <span>{returnContext.returnContextLabel}</span>
        </div>
      </section>

      <section className={styles.section}>
        <span className={styles.eyebrow}>Current state</span>
        <div className={styles.ctaRow}>
          <div>
            <strong>{model.currentState.label}</strong>
            <p>{model.currentState.detail}</p>
          </div>
          <span className={styles.heldTag}>{model.currentState.status}</span>
        </div>
      </section>

      <section className={styles.section}>
        <span className={styles.eyebrow}>Transition checks</span>
        <div className={styles.checkGrid}>
          {model.transitionChecks.map((item) => (
            <article className={styles.checkCard} key={item.id}>
              <header>
                <strong>{item.label}</strong>
                <span className={item.state === "REQUIRED" ? styles.requiredTag : styles.heldTag}>{item.state === "REQUIRED" ? "Required" : "Held"}</span>
              </header>
              <p>{item.detail}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <span className={styles.eyebrow}>Governance</span>
        <ul className={styles.list}>
          {model.governance.map((item) => <li key={item}>{item}</li>)}
        </ul>
      </section>

      <section className={styles.section}>
        <div className={styles.ctaRow}>
          <div>
            <strong>{model.transitionAction.label}</strong>
            <p>This action remains held until the lifecycle graph and evidence checks are approved.</p>
          </div>
          <span className={styles.buttonHeld}>{model.transitionAction.state}</span>
        </div>
      </section>

      <section className={styles.section}>
        <span className={styles.eyebrow}>Next unlocks</span>
        <ul className={styles.list}>
          {model.nextUnlocks.map((item) => <li key={item}>{item}</li>)}
        </ul>
        <div className={styles.actionLinks}>
          <Link className={styles.primaryLink} href={returnHref}>{returnContext.returnLabel}<ExternalLink aria-hidden="true" size={13} /></Link>
          {returnHref !== model.source.href ? (
            <Link className={styles.primaryLink} href={withUnifiedCrmOpportunityReturn(model.source.href, returnHref)}>Open pipeline source review<ExternalLink aria-hidden="true" size={13} /></Link>
          ) : null}
          <Link className={styles.primaryLink} href={`/crm/opportunities/queue?crmReturnTo=${encodeURIComponent(returnHref)}`}>Review queue flow<ExternalLink aria-hidden="true" size={13} /></Link>
          <Link className={styles.primaryLink} href={`/crm/opportunities/new?crmReturnTo=${encodeURIComponent(returnHref)}`}>Review create flow<ExternalLink aria-hidden="true" size={13} /></Link>
        </div>
      </section>
    </main>
  );
}

export function UnifiedCrmOpportunityTransitionReviewLoading() {
  return (
    <main className={styles.page}>
      <section aria-busy="true" aria-labelledby="opportunity-transition-loading-heading" className={styles.loading}>
        <span className={styles.eyebrow}>Unified CRM</span>
        <h1 id="opportunity-transition-loading-heading">Loading opportunity transition review</h1>
        <p>Checking access and loading the held transition surface. No opportunity stage has changed.</p>
        <div aria-hidden="true" className={styles.skeletons}>
          {Array.from({ length: 4 }, (_, index) => <span key={index} />)}
        </div>
      </section>
    </main>
  );
}
