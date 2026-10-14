"use client";

import { AlertTriangle, ArrowLeft, ExternalLink, RefreshCw, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

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

function stageLabel(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function transitionHelp(stage: string) {
  if (stage === "WON") return "Record acceptance evidence and the handoff target. Won opportunities do not keep an active next action.";
  if (stage === "LOST") return "Record why the opportunity was lost. Lost opportunities do not keep an active next action.";
  return "Record the next owner-visible action and due time before moving this active opportunity forward.";
}

function TransitionForm({ model, returnHref }: { model: UnifiedCrmOpportunityTransitionReviewModel; returnHref: string }) {
  const [toStage, setToStage] = useState<string>(model.currentState.allowedNextStages[0] ?? "");
  const [status, setStatus] = useState<{ kind: "error" | "success"; message: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const terminal = toStage === "WON" || toStage === "LOST";
  const [todayLocal] = useState(() => new Date(Date.now() + 60 * 60 * 1000).toISOString().slice(0, 16));

  async function submit(formData: FormData) {
    setSubmitting(true);
    setStatus(null);
    const payload = {
      expectedVersion: model.currentState.version,
      handoffTarget: formData.get("handoffTarget"),
      idempotencyKey: globalThis.crypto?.randomUUID?.() ?? `${model.requestedOpportunityId}-${Date.now()}`,
      lostReason: formData.get("lostReason"),
      nextActionDueAt: terminal ? null : formData.get("nextActionDueAt"),
      nextActionLabel: terminal ? null : formData.get("nextActionLabel"),
      reason: formData.get("reason"),
      toStage,
      wonEvidence: formData.get("wonEvidence")
    };
    try {
      const response = await fetch(`/api/crm/v1/opportunities/${encodeURIComponent(model.requestedOpportunityId)}/transition`, {
        body: JSON.stringify(payload),
        headers: { "Content-Type": "application/json" },
        method: "POST"
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(typeof body.error === "string" ? body.error : "Opportunity transition could not be completed.");
      }
      setStatus({ kind: "success", message: `Moved to ${stageLabel(body.opportunity.stage)}. Version ${body.opportunity.version} is now current.` });
    } catch (error) {
      setStatus({ kind: "error", message: error instanceof Error ? error.message : "Opportunity transition could not be completed." });
    } finally {
      setSubmitting(false);
    }
  }

  if (!model.currentState.allowedNextStages.length) {
    return (
      <section className={styles.section}>
        <div className={styles.ctaRow}>
          <div>
            <strong>Terminal opportunity</strong>
            <p>This opportunity is in {stageLabel(model.currentState.stage)}. Reopen controls remain reserved for a manager review milestone.</p>
          </div>
          <Link className={styles.primaryLink} href={returnHref}>Return to CRM<ExternalLink aria-hidden="true" size={13} /></Link>
        </div>
      </section>
    );
  }

  return (
    <section className={styles.section}>
      <span className={styles.eyebrow}>Move opportunity</span>
      <form action={submit} className={styles.transitionForm}>
        <label>
          Next stage
          <select name="toStage" onChange={(event) => setToStage(event.target.value)} required value={toStage}>
            {model.currentState.allowedNextStages.map((stage) => <option key={stage} value={stage}>{stageLabel(stage)}</option>)}
          </select>
        </label>
        <p>{transitionHelp(toStage)}</p>
        {!terminal ? (
          <div className={styles.formGrid}>
            <label>
              Next action
              <input defaultValue={model.currentState.nextActionLabel ?? ""} maxLength={240} name="nextActionLabel" required />
            </label>
            <label>
              Due
              <input defaultValue={model.currentState.nextActionDueAt?.slice(0, 16) ?? todayLocal} name="nextActionDueAt" required type="datetime-local" />
            </label>
          </div>
        ) : null}
        {toStage === "WON" ? (
          <div className={styles.formGrid}>
            <label>
              Acceptance evidence
              <textarea maxLength={1000} name="wonEvidence" required />
            </label>
            <label>
              Handoff target
              <input maxLength={240} name="handoffTarget" placeholder="Final QC, sales handoff, delivery prep..." required />
            </label>
          </div>
        ) : null}
        {toStage === "LOST" ? (
          <label>
            Lost reason
            <textarea maxLength={1000} name="lostReason" required />
          </label>
        ) : null}
        <label>
          Transition reason
          <textarea maxLength={1000} name="reason" placeholder="What changed, who approved it, and what should happen next." required />
        </label>
        <div className={styles.formFooter}>
          <span>Current version {model.currentState.version}</span>
          <button disabled={submitting} type="submit">{submitting ? "Moving opportunity..." : model.transitionAction.label}</button>
        </div>
        {status ? <p className={status.kind === "success" ? styles.successNotice : styles.errorNotice}>{status.message}</p> : null}
      </form>
    </section>
  );
}

export function UnifiedCrmOpportunityTransitionReview({ errorMessage, failureKind = "error", model, returnHref }: Props) {
  if (!model) return <StatePanel kind={failureKind} message={errorMessage} returnHref={returnHref} />;
  const returnContext = getUnifiedCrmOpportunityReturnContext(returnHref);

  return (
    <main className={styles.page}>
      <Link className={styles.backLink} href={returnHref}><ArrowLeft aria-hidden="true" size={15} />{returnContext.backLabel}</Link>

      <section className={styles.hero}>
        <span className={styles.eyebrow}>Opportunity transition · governed</span>
        <h1>{model.headline.title}</h1>
        <p>{model.headline.detail}</p>
        <div className={styles.heroMeta}>
          <span className={styles.requiredTag}>{model.transitionAction.state}</span>
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
          <span className={styles.requiredTag}>{stageLabel(model.currentState.stage)} · v{model.currentState.version}</span>
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

      <TransitionForm model={model} returnHref={returnHref} />

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
