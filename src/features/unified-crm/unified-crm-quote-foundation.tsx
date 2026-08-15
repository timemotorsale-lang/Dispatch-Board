"use client";

import { AlertTriangle, ArrowLeft, ExternalLink, RefreshCw, ShieldCheck } from "lucide-react";
import Link from "next/link";

import type { UnifiedCrmQuoteFoundationModel } from "@/server/unified-crm/quote-foundation-contract";
import { UnifiedCrmQuoteDraftForm } from "@/features/unified-crm/unified-crm-quote-draft-form";

import styles from "./unified-crm-quote-foundation.module.css";

type FailureKind = "error" | "restricted" | "unavailable";

type Props = {
  errorMessage?: string;
  failureKind?: FailureKind;
  model?: UnifiedCrmQuoteFoundationModel;
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
    ? "Quote foundation review isn’t available to you"
    : kind === "unavailable"
      ? "Quote foundation review is temporarily unavailable"
      : "Quote foundation review couldn’t be loaded";
  const detail = message ?? "No quote foundation data was displayed. Retry or return to CRM.";
  const retryable = kind !== "restricted";
  return (
    <main className={styles.page}>
      <Link className={styles.backLink} href={returnHref}><ArrowLeft aria-hidden="true" size={15} />Return to CRM</Link>
      <section className={styles.statePanel} role={retryable ? "alert" : "status"}>
        {retryable ? <AlertTriangle aria-hidden="true" size={28} /> : <ShieldCheck aria-hidden="true" size={28} />}
        <h1>{title}</h1>
        <p>{detail}</p>
        <div className={styles.stateActions}>
          {retryable ? <button onClick={() => window.location.reload()} type="button"><RefreshCw aria-hidden="true" size={14} />Retry</button> : null}
          <Link href={returnHref}>Return to CRM</Link>
        </div>
      </section>
    </main>
  );
}

export function UnifiedCrmQuoteFoundation({ errorMessage, failureKind = "error", model, returnHref }: Props) {
  if (!model) return <StatePanel kind={failureKind} message={errorMessage} returnHref={returnHref} />;

  return (
    <main className={styles.page}>
      <Link className={styles.backLink} href={returnHref}><ArrowLeft aria-hidden="true" size={15} />Return to CRM</Link>

      <section className={styles.hero}>
        <span className={styles.eyebrow}>Quotes and approvals · review only</span>
        <h1>{model.headline.title}</h1>
        <p>{model.headline.detail}</p>
        <div className={styles.heroMeta}>
          <span className={styles.heldTag}>{model.state}</span>
          <span>Observed {formatDate(model.source.observedAt)} · {model.visibility === "organization" ? "Organization review" : "Owned review"}</span>
        </div>
      </section>

      <section className={styles.section}>
        <span className={styles.eyebrow}>Foundation readiness</span>
        <div className={styles.readinessGrid}>
          {model.readiness.map((item) => (
            <article className={styles.readinessCard} key={item.id}>
              <header>
                <strong>{item.label}</strong>
                <span className={item.state === "READY" ? styles.stateTag : styles.heldTag}>{item.state}</span>
              </header>
              <p>{item.detail}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <span className={styles.eyebrow}>Live commands</span>
        <div className={styles.readinessGrid}>
          <article className={styles.readinessCard}>
            <header>
              <strong>Draft quote</strong>
              <span className={model.commands.draft.state === "READY" ? styles.stateTag : styles.heldTag}>{model.commands.draft.state}</span>
            </header>
            <p>{model.commands.draft.detail}</p>
          </article>
          <article className={styles.readinessCard}>
            <header>
              <strong>Present quote</strong>
              <span className={styles.heldTag}>{model.commands.present.state}</span>
            </header>
            <p>{model.commands.present.detail}</p>
          </article>
        </div>
      </section>

      <UnifiedCrmQuoteDraftForm
        available={model.commands.draft.available}
        presentDetail={model.commands.present.detail}
        returnHref={returnHref}
        workspace={model.draftWorkspace}
      />

      <section className={styles.section}>
        <span className={styles.eyebrow}>Visible persisted quotes</span>
        <div className={styles.observationPanel}>
          <strong>{model.liveObservation.detail}</strong>
          <small>{model.liveObservation.freshnessLabel}</small>
        </div>
        {model.visibleQuotes.length ? (
          <div className={styles.quoteGrid}>
            {model.visibleQuotes.map((item) => (
              <article className={styles.quoteCard} key={item.id}>
                <header>
                  <div>
                    <strong>{item.quoteNumber}</strong>
                    <small>{item.versionLabel} · {item.state}</small>
                  </div>
                  <span className={item.state === "PRESENTED" ? styles.stateTag : styles.heldTag}>{item.state}</span>
                </header>
                <p>{item.summary}</p>
                <small>{item.customerLabel}</small>
                <small>{item.opportunityLabel}</small>
                <small>Updated {formatDate(item.updatedAt)}</small>
                <Link className={styles.quoteLink} href={`/crm/quotes?crmReturnTo=${encodeURIComponent(returnHref)}&quoteId=${encodeURIComponent(item.recordId)}`}>
                  Continue in draft workspace
                </Link>
                <Link className={styles.quoteLink} href={`/crm/quotes/${encodeURIComponent(item.recordId)}/versions?crmReturnTo=${encodeURIComponent("/crm/quotes")}`}>
                  Review immutable version history
                </Link>
              </article>
            ))}
          </div>
        ) : <p className={styles.emptyState}>No same-scope persisted quote is visible yet.</p>}
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
        <Link className={styles.primaryLink} href={returnHref}>Return to CRM<ExternalLink aria-hidden="true" size={13} /></Link>
      </section>
    </main>
  );
}

export function UnifiedCrmQuoteFoundationLoading() {
  return (
    <main className={styles.page}>
      <section aria-busy="true" aria-labelledby="quote-foundation-loading-heading" className={styles.loading}>
        <span className={styles.eyebrow}>Unified CRM</span>
        <h1 id="quote-foundation-loading-heading">Loading quote foundation review</h1>
        <p>Checking access and loading the governed commercial foundation. No quote draft or presentation command has executed.</p>
        <div aria-hidden="true" className={styles.skeletons}>
          {Array.from({ length: 3 }, (_, index) => <span key={index} />)}
        </div>
      </section>
    </main>
  );
}
