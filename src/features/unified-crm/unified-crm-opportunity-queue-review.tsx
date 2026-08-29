"use client";

import { AlertTriangle, ArrowLeft, ExternalLink, RefreshCw, ShieldCheck } from "lucide-react";
import Link from "next/link";

import { withUnifiedCrmOpportunityReturn } from "@/server/unified-crm/opportunity-review-return";
import { UnifiedCrmOpportunityActions } from "./unified-crm-opportunity-actions";
import styles from "./unified-crm-opportunity-queue-review.module.css";
import { getUnifiedCrmOpportunityReturnContext } from "./unified-crm-opportunity-return-context";

import type { UnifiedCrmOpportunityQueueReviewModel } from "@/server/unified-crm/opportunity-queue-contract";

type FailureKind = "error" | "restricted" | "unavailable";

type Props = {
  errorMessage?: string;
  failureKind?: FailureKind;
  model?: UnifiedCrmOpportunityQueueReviewModel;
  returnHref: string;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Chicago"
  }).format(new Date(value));
}

function queueItemStateLabel(state: "HELD_REVIEW" | "LIVE_READ_ONLY") {
  return state === "LIVE_READ_ONLY" ? "Read-only live detail" : "Guided review";
}

function segmentLabel(value: string) {
  return value.replaceAll("-", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function StatePanel({ kind, message, returnHref }: { kind: FailureKind; message?: string; returnHref: string }) {
  const returnContext = getUnifiedCrmOpportunityReturnContext(returnHref);
  const title = kind === "restricted"
    ? "Opportunity queue review isn’t available to you"
    : kind === "unavailable"
      ? "Opportunity queue review is temporarily unavailable"
      : "Opportunity queue review couldn’t be loaded";
  const detail = message ?? "No opportunity queue review data was displayed. Retry or return to the Pipeline review.";
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

export function UnifiedCrmOpportunityQueueReview({ errorMessage, failureKind = "error", model, returnHref }: Props) {
  if (!model) return <StatePanel kind={failureKind} message={errorMessage} returnHref={returnHref} />;
  const returnContext = getUnifiedCrmOpportunityReturnContext(returnHref);

  return (
    <main className={styles.page}>
      <Link className={styles.backLink} href={returnHref}><ArrowLeft aria-hidden="true" size={15} />{returnContext.backLabel}</Link>

      <section className={styles.hero}>
        <span className={styles.eyebrow}>Opportunity queue · review only</span>
        <h1>{model.headline.title}</h1>
        <p>{model.headline.detail}</p>
        <div className={styles.heroMeta}>
          <span className={styles.reviewTag}>Observed {formatDate(model.source.observedAt)}</span>
          <span>{model.visibility === "organization" ? "Organization review" : "Owned review"}</span>
          <span>{returnContext.returnContextLabel}</span>
        </div>
      </section>

      <section className={styles.section}>
        <span className={styles.eyebrow}>Queue segments</span>
        <div className={styles.segmentGrid}>
          {model.segments.map((segment) => (
            <article className={styles.segmentCard} key={segment.id}>
              <header>
                <div>
                  <strong>{segment.label}</strong>
                  <small>{segment.countLabel}</small>
                </div>
                <span className={segment.state === "REVIEW" ? styles.reviewTag : styles.heldTag}>{segment.state}</span>
              </header>
              <p>{segment.detail}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <span className={styles.eyebrow}>Queue review items</span>
        {model.liveReadObservation ? (
          <div className={styles.sectionHeader}>
            <strong>
              {model.liveReadObservation.state === "READY"
                ? "Visible persisted read-only queue entries"
                : "Persisted read-only queue visibility pending"}
            </strong>
            <p>{model.liveReadObservation.detail}</p>
            <small>{model.liveReadObservation.freshnessLabel}</small>
          </div>
        ) : null}
        <div className={styles.queueGrid}>
          {model.items.map((item) => (
            <Link className={styles.queueItem} href={withUnifiedCrmOpportunityReturn(item.detailHref, returnHref)} key={item.id}>
              <header>
                <div>
                  <strong>{item.title}</strong>
                  <small>{item.ownerLabel}</small>
                </div>
                <span>{queueItemStateLabel(item.state)}</span>
              </header>
              <p>{item.reason}</p>
              <small>{item.dueLabel} · {item.riskLabel}</small>
              <span className={styles.segmentTags}>{item.segmentIds.map(segmentLabel).join(" · ")}</span>
              {item.transitionHref ? <span className={styles.commandTag}>Move stage with command</span> : null}
            </Link>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <UnifiedCrmOpportunityActions
          eyebrow="Keep reviewing"
          title="Move through the opportunity flow without leaving the queue"
          actions={[
            {
              label: returnContext.returnShortLabel,
              description: "Return to the originating CRM review context to compare how queue work connects to the wider opportunity flow.",
              href: returnHref,
              state: "REVIEW"
            },
            {
              label: "Review create flow",
              description: "Open the first governed create review and confirm required inputs before live writes exist.",
              href: `/crm/opportunities/new?crmReturnTo=${encodeURIComponent(returnHref)}`,
              state: "REVIEW"
            },
            {
              label: "Review transition flow",
              description: "Inspect the stage-movement checks that will keep queue work safe and explainable.",
              href: `/crm/opportunities/review01/transition?crmReturnTo=${encodeURIComponent(returnHref)}`,
              state: "REVIEW"
            }
          ]}
        />
      </section>

      <section className={styles.section}>
        <span className={styles.eyebrow}>Governance</span>
        <ul className={styles.list}>
          {model.governance.map((item) => <li key={item}>{item}</li>)}
        </ul>
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
          <Link className={styles.primaryLink} href={`/crm/opportunities/review01?crmReturnTo=${encodeURIComponent(returnHref)}`}>Open detail review<ExternalLink aria-hidden="true" size={13} /></Link>
        </div>
      </section>
    </main>
  );
}

export function UnifiedCrmOpportunityQueueReviewLoading() {
  return (
    <main className={styles.page}>
      <section aria-busy="true" aria-labelledby="opportunity-queue-loading-heading" className={styles.loading}>
        <span className={styles.eyebrow}>Unified CRM</span>
        <h1 id="opportunity-queue-loading-heading">Loading opportunity queue review</h1>
        <p>Checking access and loading the held queue surface. No opportunity queue action has been executed.</p>
        <div aria-hidden="true" className={styles.skeletons}>
          {Array.from({ length: 4 }, (_, index) => <span key={index} />)}
        </div>
      </section>
    </main>
  );
}
