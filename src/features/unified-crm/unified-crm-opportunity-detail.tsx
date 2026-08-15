"use client";

import { AlertTriangle, ArrowLeft, ExternalLink, RefreshCw, ShieldCheck } from "lucide-react";
import Link from "next/link";

import type { UnifiedCrmOpportunityDetailReadModel } from "@/server/unified-crm/opportunity-detail-contract";

import { UnifiedCrmOpportunityActions } from "./unified-crm-opportunity-actions";
import styles from "./unified-crm-opportunity-detail.module.css";

type FailureKind = "error" | "not-available" | "restricted" | "unavailable";

type OpportunityDetailProps = {
  errorMessage?: string;
  failureKind?: FailureKind;
  model?: UnifiedCrmOpportunityDetailReadModel;
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
  const title = kind === "not-available"
    ? "Opportunity detail isn’t available"
    : kind === "restricted"
      ? "Opportunity detail isn’t available to you"
      : kind === "unavailable"
        ? "Opportunity detail is temporarily unavailable"
        : "Opportunity detail couldn’t be loaded";
  const detail = message ?? (kind === "not-available"
    ? "This opportunity record may not exist, may be held, or may be outside your permitted opportunity scope."
    : kind === "restricted"
      ? "Your current CRM access does not include this opportunity detail."
      : "No opportunity detail was displayed. Retry or return to the Pipeline review.");
  const retryable = kind === "error" || kind === "unavailable";
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
          <Link href="/crm?view=pipeline">Open CRM Pipeline<ExternalLink aria-hidden="true" size={13} /></Link>
        </div>
      </section>
    </main>
  );
}

export function UnifiedCrmOpportunityDetail({ errorMessage, failureKind = "error", model, returnHref }: OpportunityDetailProps) {
  if (!model) {
    return <StatePanel kind={failureKind} message={errorMessage} returnHref={returnHref} />;
  }

  return (
    <main className={styles.page}>
      <Link className={styles.backLink} href={returnHref}><ArrowLeft aria-hidden="true" size={15} />Back to CRM Pipeline</Link>

      <section aria-labelledby="opportunity-detail-heading" className={styles.identityCard}>
        <div className={styles.identityMain}>
          <span className={styles.eyebrow}>Opportunity detail · read only</span>
          <h1 id="opportunity-detail-heading">{model.identity.title}</h1>
          <p>Requested review id {model.requestedOpportunityId} · {model.identity.ownerScopeLabel}</p>
        </div>
        <div className={styles.statusMeta}>
          <span className={styles.statusPill}>{model.identity.lifecycleStatus}</span>
          <span><small>Visibility</small><strong>{model.visibility === "organization" ? "Organization" : "Owned only"}</strong></span>
        </div>
      </section>

      <section aria-label="Opportunity source and freshness" className={styles.trustBar}>
        <span><ShieldCheck aria-hidden="true" size={14} /><strong>{model.source.label}</strong> · held review only</span>
        <span><ShieldCheck aria-hidden="true" size={14} />Current · observed {formatDate(model.freshness.observedAt)}</span>
        <Link className={styles.sourceLink} href={model.source.href}>Return to Pipeline review<ExternalLink aria-hidden="true" size={13} /></Link>
      </section>

      <section className={styles.summaryGrid} aria-label="Opportunity summary">
        <article><span className={styles.eyebrow}>Customer</span><strong>{model.summary.customer}</strong><p>No customer record is attached here yet because operational opportunity creation is still held.</p></article>
        <article><span className={styles.eyebrow}>Owner</span><strong>{model.summary.owner}</strong><p>Assignment rules will stay governed and auditable when live opportunity writes are approved.</p></article>
        <article><span className={styles.eyebrow}>Next action</span><strong>{model.summary.nextAction}</strong><p>Source workflows stay authoritative until the first secure CRM command is enabled.</p></article>
        <article><span className={styles.eyebrow}>Due state</span><strong>{model.summary.dueState}</strong><p>No stage math or risk scoring is presented while lifecycle rules are intentionally held.</p></article>
      </section>

      <section className={styles.bridgeGrid} aria-label="Opportunity bridge review">
        <article className={styles.bridgeCard}>
          <header><strong>{model.sourceBridge.label}</strong><span className={styles.heldTag}>{model.sourceBridge.state}</span></header>
          <p>{model.sourceBridge.detail}</p>
        </article>
        {model.workBridges.map((bridge) => (
          <article className={styles.bridgeCard} key={bridge.domain}>
            <header><strong>{bridge.label}</strong><span className={styles.heldTag}>{bridge.state}</span></header>
            <p>{bridge.detail}</p>
          </article>
        ))}
      </section>

      <section className={styles.unlockGrid} aria-label="Next unlocks">
        {model.nextUnlocks.map((item) => (
          <article className={styles.unlockCard} key={item}>
            <header><strong>Next unlock</strong><span className={styles.heldTag}>Review</span></header>
            <p>{item}</p>
          </article>
        ))}
      </section>

      <section className={styles.statePanel} aria-label="Opportunity review actions">
        <UnifiedCrmOpportunityActions
          eyebrow="Continue reviewing"
          title="Keep the opportunity flow one click away"
          actions={[
            {
              label: "Review queue flow",
              description: "Inspect the first opportunity queue so owned and at-risk work stays clear before live prioritization exists.",
              href: `/crm/opportunities/queue?crmReturnTo=${encodeURIComponent(returnHref)}`,
              state: "REVIEW"
            },
            {
              label: "Review create flow",
              description: "Validate the first governed create experience before live opportunity writes are enabled.",
              href: `/crm/opportunities/new?crmReturnTo=${encodeURIComponent(returnHref)}`,
              state: "REVIEW"
            },
            {
              label: "Review transition flow",
              description: "Inspect stage-movement checks, required evidence, and rollback expectations.",
              href: `/crm/opportunities/${encodeURIComponent(model.requestedOpportunityId)}/transition?crmReturnTo=${encodeURIComponent(returnHref)}`,
              state: "REVIEW"
            },
            {
              label: "Return to pipeline",
              description: "Go back to the held board and list review for the broader opportunity workflow.",
              href: returnHref,
              state: "REVIEW"
            }
          ]}
        />
      </section>
    </main>
  );
}

export function UnifiedCrmOpportunityDetailLoading() {
  return (
    <main className={styles.page}>
      <section aria-busy="true" aria-labelledby="opportunity-detail-loading-heading" className={styles.loading}>
        <span className={styles.eyebrow}>Unified CRM</span>
        <h1 id="opportunity-detail-loading-heading">Loading permitted opportunity detail</h1>
        <p>Checking access and loading the held review surface. No operational opportunity action has been completed.</p>
        <div aria-hidden="true" className={styles.skeletons}>
          {Array.from({ length: 4 }, (_, index) => <span key={index} />)}
        </div>
      </section>
    </main>
  );
}
