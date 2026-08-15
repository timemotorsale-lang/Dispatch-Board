"use client";

import { AlertTriangle, ArrowLeft, ExternalLink, RefreshCw, ShieldCheck } from "lucide-react";
import Link from "next/link";

import type { UnifiedCrmOpportunityCreateReviewModel } from "@/server/unified-crm/opportunity-create-contract";
import { withUnifiedCrmOpportunityReturn } from "@/server/unified-crm/opportunity-review-return";

import styles from "./unified-crm-opportunity-create-review.module.css";
import { getUnifiedCrmOpportunityReturnContext } from "./unified-crm-opportunity-return-context";

type FailureKind = "error" | "restricted" | "unavailable";

type Props = {
  errorMessage?: string;
  failureKind?: FailureKind;
  model?: UnifiedCrmOpportunityCreateReviewModel;
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
    ? "Opportunity create review isn’t available to you"
    : kind === "unavailable"
      ? "Opportunity create review is temporarily unavailable"
      : "Opportunity create review couldn’t be loaded";
  const detail = message ?? "No create review data was displayed. Retry or return to the Pipeline review.";
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

export function UnifiedCrmOpportunityCreateReview({ errorMessage, failureKind = "error", model, returnHref }: Props) {
  if (!model) return <StatePanel kind={failureKind} message={errorMessage} returnHref={returnHref} />;
  const returnContext = getUnifiedCrmOpportunityReturnContext(returnHref);

  return (
    <main className={styles.page}>
      <Link className={styles.backLink} href={returnHref}><ArrowLeft aria-hidden="true" size={15} />{returnContext.backLabel}</Link>

      <section className={styles.hero}>
        <span className={styles.eyebrow}>Opportunity create · review only</span>
        <h1>{model.headline.title}</h1>
        <p>{model.headline.detail}</p>
        <div className={styles.heroMeta}>
          <span className={styles.heldTag}>{model.createAction.state}</span>
          <span>Observed {formatDate(model.source.observedAt)} · {model.visibility === "organization" ? "Organization review" : "Owned review"}</span>
        </div>
      </section>

      <section className={styles.section}>
        <span className={styles.eyebrow}>Create inputs</span>
        <div className={styles.inputGrid}>
          {model.requiredInputs.map((item) => (
            <article className={styles.inputCard} key={item.id}>
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
            <strong>{model.createAction.label}</strong>
            <p>This action remains held until the initial stage and entry evidence are approved.</p>
          </div>
          <span className={styles.buttonHeld}>{model.createAction.state}</span>
        </div>
      </section>

      <section className={styles.section}>
        <span className={styles.eyebrow}>Next unlocks</span>
        <ul className={styles.list}>
          {model.nextUnlocks.map((item) => <li key={item}>{item}</li>)}
        </ul>
        <Link className={styles.primaryLink} href={returnHref}>{returnContext.returnLabel}<ExternalLink aria-hidden="true" size={13} /></Link>
        {returnHref !== model.source.href ? <Link className={styles.primaryLink} href={withUnifiedCrmOpportunityReturn(model.source.href, returnHref)}>Open pipeline source review<ExternalLink aria-hidden="true" size={13} /></Link> : null}
      </section>
    </main>
  );
}

export function UnifiedCrmOpportunityCreateReviewLoading() {
  return (
    <main className={styles.page}>
      <section aria-busy="true" aria-labelledby="opportunity-create-loading-heading" className={styles.loading}>
        <span className={styles.eyebrow}>Unified CRM</span>
        <h1 id="opportunity-create-loading-heading">Loading opportunity create review</h1>
        <p>Checking access and loading the held create surface. No opportunity record has been created.</p>
        <div aria-hidden="true" className={styles.skeletons}>
          {Array.from({ length: 4 }, (_, index) => <span key={index} />)}
        </div>
      </section>
    </main>
  );
}
