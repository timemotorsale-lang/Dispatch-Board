"use client";

import { ArrowLeft, ExternalLink } from "lucide-react";
import Link from "next/link";

import type { UnifiedCrmQuoteVersionReviewModel } from "@/server/unified-crm/quote-version-review-contract";

import styles from "./unified-crm-quote-foundation.module.css";

type FailureKind = "error" | "restricted" | "unavailable";

type Props = {
  errorMessage?: string;
  failureKind?: FailureKind;
  model?: UnifiedCrmQuoteVersionReviewModel;
  returnHref: string;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Chicago"
  }).format(new Date(value));
}

function formatMoney(cents: number) {
  return new Intl.NumberFormat("en-US", {
    currency: "USD",
    style: "currency"
  }).format(cents / 100);
}

export function UnifiedCrmQuoteVersionReview({ errorMessage, failureKind = "error", model, returnHref }: Props) {
  if (!model) {
    const title = failureKind === "restricted"
      ? "Quote version review isn’t available to you"
      : failureKind === "unavailable"
        ? "Quote version review is temporarily unavailable"
        : "Quote version review couldn’t be loaded";
    return (
      <main className={styles.page}>
        <Link className={styles.backLink} href={returnHref}><ArrowLeft aria-hidden="true" size={15} />Return to quotes</Link>
        <section className={styles.statePanel} role={failureKind === "restricted" ? "status" : "alert"}>
          <h1>{title}</h1>
          <p>{errorMessage ?? "No quote version details were displayed."}</p>
          <div className={styles.stateActions}>
            <Link href={returnHref}>Return to quotes</Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <Link className={styles.backLink} href={returnHref}><ArrowLeft aria-hidden="true" size={15} />Return to quotes</Link>

      <section className={styles.hero}>
        <span className={styles.eyebrow}>Immutable version review</span>
        <h1>{model.headline.title}</h1>
        <p>{model.headline.detail}</p>
        <div className={styles.heroMeta}>
          <span className={styles.heldTag}>{model.state}</span>
          <span>Observed {formatDate(model.source.observedAt)} · {model.visibility === "organization" ? "Organization review" : "Owned review"}</span>
        </div>
      </section>

      <section className={styles.section}>
        <span className={styles.eyebrow}>Current quote state</span>
        <div className={styles.observationPanel}>
          <strong>{model.quote.quoteNumber} · {model.quote.state}</strong>
          <small>{model.quote.customerLabel} · {model.quote.opportunityLabel}</small>
          <small>Updated {formatDate(model.quote.updatedAt)}</small>
        </div>
      </section>

      <section className={styles.section}>
        <span className={styles.eyebrow}>Immutable evidence boundary</span>
        <div className={styles.observationPanel}>
          <strong>{model.liveObservation.detail}</strong>
          <small>{model.presentAction.detail}</small>
        </div>
        <div className={styles.readinessGrid}>
          {model.versions.map((version) => (
            <article className={styles.readinessCard} key={version.versionId}>
              <header>
                <strong>{version.versionLabel}</strong>
                <span className={version.state === "PRESENTED" ? styles.stateTag : styles.heldTag}>{version.state}</span>
              </header>
              <p>{version.immutableNote}</p>
              <small>{version.lineItemCount} line item(s)</small>
              <small>Subtotal {formatMoney(version.subtotalCents)} · Total {formatMoney(version.totalCents)}</small>
              <small>Created {formatDate(version.createdAt)}</small>
              <small>{version.presentedAt ? `Presented ${formatDate(version.presentedAt)}` : "Not presented from this slice"}</small>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <span className={styles.eyebrow}>Governance</span>
        <ul className={styles.list}>
          {model.governance.map((item) => <li key={item}>{item}</li>)}
        </ul>
        <Link className={styles.primaryLink} href={returnHref}>Return to quotes<ExternalLink aria-hidden="true" size={13} /></Link>
      </section>
    </main>
  );
}
