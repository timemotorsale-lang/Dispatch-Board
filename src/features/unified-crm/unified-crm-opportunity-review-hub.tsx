"use client";

import { AlertTriangle, ArrowLeft, ExternalLink, RefreshCw, ShieldCheck } from "lucide-react";
import Link from "next/link";

import { withUnifiedCrmOpportunityReturn } from "@/server/unified-crm/opportunity-review-return";
import type { UnifiedCrmOpportunityReviewHubModel } from "@/server/unified-crm/opportunity-review-hub-contract";

import styles from "./unified-crm-opportunity-review-hub.module.css";
import { getUnifiedCrmOpportunityReturnContext } from "./unified-crm-opportunity-return-context";
import { UnifiedCrmOpportunityWorkspaceOrientation } from "./unified-crm-opportunity-workspace-orientation";

type FailureKind = "error" | "restricted" | "unavailable";

type Props = {
  errorMessage?: string;
  failureKind?: FailureKind;
  model?: UnifiedCrmOpportunityReviewHubModel;
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
    ? "Opportunity review hub isn’t available to you"
    : kind === "unavailable"
      ? "Opportunity review hub is temporarily unavailable"
      : "Opportunity review hub couldn’t be loaded";
  const detail = message ?? "No opportunity review hub data was displayed. Retry or return to the Pipeline review.";
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

export function UnifiedCrmOpportunityReviewHub({
  errorMessage,
  failureKind = "error",
  model,
  returnHref
}: Props) {
  if (!model) return <StatePanel kind={failureKind} message={errorMessage} returnHref={returnHref} />;
  const returnContext = getUnifiedCrmOpportunityReturnContext(returnHref);

  return (
    <main className={styles.page}>
      <Link className={styles.backLink} href={returnHref}><ArrowLeft aria-hidden="true" size={15} />{returnContext.backLabel}</Link>

      <section className={styles.hero}>
        <span className={styles.eyebrow}>Opportunity review hub · review only</span>
        <h1>{model.headline.title}</h1>
        <p>{model.headline.detail}</p>
        <div className={styles.heroMeta}>
          <span className={styles.reviewTag}>Observed {formatDate(model.source.observedAt)}</span>
          <span>{model.visibility === "organization" ? "Organization review" : "Owned review"}</span>
          <span>{returnContext.returnContextLabel}</span>
          <span className={styles.heldTag}>{model.state}</span>
        </div>
      </section>

      <UnifiedCrmOpportunityWorkspaceOrientation
        current="hub"
        visibilityLabel={model.visibility === "owned" ? "Owned review" : "Organization review"}
      />

      {model.sections.map((section) => (
        <section className={styles.section} key={section.id}>
          <div className={styles.sectionHeader}>
            <span className={styles.eyebrow}>{section.id === "overview" ? "Core path" : "Governance"}</span>
            <strong>{section.label}</strong>
            <p>{section.detail}</p>
          </div>
          <div className={styles.linkGrid}>
            {section.links.map((link) => (
              <Link className={styles.linkCard} href={withUnifiedCrmOpportunityReturn(link.href, returnHref)} key={link.id}>
                <header>
                  <strong>{link.label}</strong>
                  <span>{link.state}</span>
                </header>
                <p>{link.description}</p>
                <small>Open review surface <ExternalLink aria-hidden="true" size={13} /></small>
              </Link>
            ))}
          </div>
        </section>
      ))}

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <span className={styles.eyebrow}>Start here</span>
          <strong>Follow the first guided opportunity review path</strong>
          <p>If you want to review the experience in the intended order, use the guided journey instead of jumping between separate pages.</p>
        </div>
        <div className={styles.linkGrid}>
          <Link className={styles.linkCard} href={`/crm/opportunities/guided?crmReturnTo=${encodeURIComponent(returnHref)}`}>
            <header>
              <strong>Open guided journey</strong>
              <span>HELD_REVIEW</span>
            </header>
            <p>Walk through entry, queue, detail, transition, and create review in one safe sequence.</p>
            <small>Open review surface <ExternalLink aria-hidden="true" size={13} /></small>
          </Link>
        </div>
      </section>

      <section className={styles.section}>
        <span className={styles.eyebrow}>Next unlocks</span>
        <ul className={styles.list}>
          {model.nextUnlocks.map((item) => <li key={item}>{item}</li>)}
        </ul>
        <div className={styles.heroMeta}>
          <span>{returnContext.returnContextLabel}</span>
        </div>
        <Link className={styles.primaryLink} href={returnHref}>{returnContext.returnLabel}<ExternalLink aria-hidden="true" size={13} /></Link>
        {returnHref !== model.source.href ? (
          <Link className={styles.primaryLink} href={withUnifiedCrmOpportunityReturn(model.source.href, returnHref)}>Open pipeline source review<ExternalLink aria-hidden="true" size={13} /></Link>
        ) : null}
      </section>
    </main>
  );
}

export function UnifiedCrmOpportunityReviewHubLoading() {
  return (
    <main className={styles.page}>
      <section aria-busy="true" aria-labelledby="opportunity-review-hub-loading-heading" className={styles.loading}>
        <span className={styles.eyebrow}>Unified CRM</span>
        <h1 id="opportunity-review-hub-loading-heading">Loading opportunity review hub</h1>
        <p>Checking access and loading the held opportunity review path. No opportunity action has been executed.</p>
        <div aria-hidden="true" className={styles.skeletons}>
          {Array.from({ length: 4 }, (_, index) => <span key={index} />)}
        </div>
      </section>
    </main>
  );
}
