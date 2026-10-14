"use client";

import { AlertTriangle, ArrowLeft, ExternalLink, RefreshCw, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";

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

function localDateTimeValue() {
  const value = new Date(Date.now() + 60 * 60 * 1000);
  value.setSeconds(0, 0);
  return value.toISOString().slice(0, 16);
}

function createIdempotencyKey() {
  return `ucrm-opportunity-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function OpportunityCreateForm() {
  const searchParams = useSearchParams();
  const [message, setMessage] = useState<string | null>(null);
  const [messageHref, setMessageHref] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const getParam = (name: string) => searchParams?.get(name) ?? "";
  const customerId = getParam("customerId");
  const customerName = getParam("customerName");
  const vehicleInterest = getParam("vehicleInterest");
  const stockOrVin = getParam("stockOrVin");
  const budget = getParam("budget");
  const trade = getParam("trade");
  const dealNote = getParam("dealNote");
  const titleDefault = vehicleInterest
    ? `${customerName || "Customer"} - ${vehicleInterest}`
    : customerName
      ? `${customerName} opportunity`
      : "";
  const summaryDefault = [
    vehicleInterest ? `Interested vehicle: ${vehicleInterest}` : "",
    stockOrVin ? `Manual stock/VIN reference: ${stockOrVin}` : "",
    budget ? `Budget/payment target: ${budget}` : "",
    trade ? `Trade/payoff context: ${trade}` : "",
    dealNote
  ].filter(Boolean).join("\n");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage(null);
    setMessageHref(null);
    const form = new FormData(event.currentTarget);
    const payload = {
      customerId: form.get("customerId"),
      estimatedValueCents: form.get("estimatedValueCents"),
      expectedCloseAt: form.get("expectedCloseAt"),
      idempotencyKey: createIdempotencyKey(),
      nextActionDueAt: form.get("nextActionDueAt"),
      nextActionLabel: form.get("nextActionLabel"),
      ownerUserId: form.get("ownerUserId"),
      sourceLeadId: form.get("sourceLeadId"),
      summary: form.get("summary"),
      title: form.get("title")
    };
    try {
      const response = await fetch("/api/crm/v1/opportunities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body?.error ?? "Opportunity could not be created.");
      setMessage(`Opportunity ${body.opportunity.opportunityNumber} created at NEW_INQUIRY.`);
      setMessageHref(body.opportunity.href);
      event.currentTarget.reset();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Opportunity could not be created.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form className={styles.createForm} onSubmit={submit}>
      <p className={styles.formIntro}>Create a governed opportunity at NEW_INQUIRY. Stage changes happen later through the UCRM-031 transition command.</p>
      {message ? <p className={messageHref ? styles.formSuccess : styles.formError} role={messageHref ? "status" : "alert"}>{message} {messageHref ? <Link href={messageHref}>Open opportunity</Link> : null}</p> : null}
      <label><span>Title</span><input name="title" placeholder="Example: 2019 Honda Accord buyer follow-up" required maxLength={160} defaultValue={titleDefault} /></label>
      <label><span>Customer ID</span><input name="customerId" placeholder="Existing customer record id" maxLength={200} defaultValue={customerId} /></label>
      <label><span>Source lead ID</span><input name="sourceLeadId" placeholder="Optional source lead id" maxLength={200} /></label>
      <label><span>Owner user ID</span><input name="ownerUserId" placeholder="Assigned CRM owner user id" required maxLength={200} /></label>
      <label><span>Next action</span><input name="nextActionLabel" placeholder="Call customer with vehicle options" required maxLength={240} /></label>
      <label><span>Next action due</span><input name="nextActionDueAt" type="datetime-local" required defaultValue={localDateTimeValue()} /></label>
      <label><span>Estimated value in cents</span><input min={0} name="estimatedValueCents" placeholder="Example: 1850000" type="number" /></label>
      <label><span>Expected close</span><input name="expectedCloseAt" type="datetime-local" /></label>
      <label className={styles.formWide}><span>Summary</span><textarea name="summary" placeholder="Record the customer need, source context, and first follow-up plan." maxLength={1000} defaultValue={summaryDefault} /></label>
      <div className={styles.formActions}>
        <button disabled={pending} type="submit">{pending ? "Creating opportunity..." : "Create opportunity"}</button>
        <small>No quote, appointment, dispatch job, or external message is created from this action.</small>
      </div>
    </form>
  );
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
          <span className={styles.requiredTag}>{model.createAction.state}</span>
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
          <p>This creates a durable opportunity at NEW_INQUIRY with a required owner and next action.</p>
        </div>
          <span className={styles.buttonReady}>{model.createAction.state}</span>
        </div>
        <OpportunityCreateForm />
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
