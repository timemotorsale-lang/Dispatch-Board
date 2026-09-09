"use client";

import { startTransition, useId, useState, type FormEvent } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import styles from "./unified-crm-customer-360.module.css";
import { currentCustomerPageHref } from "./unified-crm-customer-page-context";

type Props = {
  available?: boolean;
  customerId: string;
  defaultOpen?: boolean;
  fallbackHref?: string | null;
  unavailableReason?: string;
};

function localDateTimeValue(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  const hour = `${date.getHours()}`.padStart(2, "0");
  const minute = `${date.getMinutes()}`.padStart(2, "0");
  return `${year}-${month}-${day}T${hour}:${minute}`;
}

function createIdempotencyKey(customerId: string) {
  return globalThis.crypto?.randomUUID?.() ?? `crm-${customerId}-${localDateTimeValue(new Date())}`;
}

export function UnifiedCrmCustomerInteractionForm({
  available = true,
  customerId,
  defaultOpen = false,
  fallbackHref = null,
  unavailableReason
}: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const formId = useId();
  const helperId = useId();
  const statusId = useId();
  const [open, setOpen] = useState(defaultOpen);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageHref, setMessageHref] = useState<string | null>(null);
  const [tone, setTone] = useState<"idle" | "error" | "success">("idle");
  const [channel, setChannel] = useState("PHONE");
  const [direction, setDirection] = useState("OUTBOUND");
  const [consentState, setConsentState] = useState("CONFIRMED");
  const [completeCurrentFollowUp, setCompleteCurrentFollowUp] = useState(false);
  const [reportWorthy, setReportWorthy] = useState(false);
  const [summary, setSummary] = useState("");
  const [outcome, setOutcome] = useState("");
  const [nextStep, setNextStep] = useState("");
  const [occurredAt, setOccurredAt] = useState(localDateTimeValue(new Date()));
  const [nextActionAt, setNextActionAt] = useState("");
  const [idempotencyKey, setIdempotencyKey] = useState(() => createIdempotencyKey(customerId));
  const timelineHref = currentCustomerPageHref(pathname, searchParams.toString(), "timeline-heading");

  function selectChannel(value: string) {
    setChannel(value);
    if (value === "INTERNAL_NOTE") {
      setDirection("INTERNAL");
      setConsentState("NOT_REQUIRED");
    } else if (direction === "INTERNAL") {
      setDirection("OUTBOUND");
      setConsentState("CONFIRMED");
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage(null);
    setMessageHref(null);
    setTone("idle");

    try {
      const response = await fetch(`/api/crm/v1/customers/${encodeURIComponent(customerId)}/interactions`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          channel,
          completeCurrentFollowUp,
          consentState,
          direction,
          idempotencyKey,
          nextActionAt: nextActionAt || null,
          nextStep: nextStep || null,
          occurredAt,
          outcome: outcome || null,
          reportWorthy,
          summary
        })
      });
      const payload = await response.json().catch(() => null) as { error?: string; duplicate?: boolean } | null;
      if (!response.ok) {
        throw new Error(payload?.error ?? "Customer interaction could not be recorded right now. No message was sent.");
      }
      setTone("success");
      setMessage(
        payload?.duplicate
          ? "This manual contact outcome was already recorded. The customer timeline has been refreshed. No message was sent."
          : "Manual contact outcome recorded. Refreshing customer history… No message was sent."
      );
      setMessageHref(timelineHref);
      setIdempotencyKey(createIdempotencyKey(customerId));
      setSummary("");
      setOutcome("");
      setNextStep("");
      setNextActionAt("");
      setCompleteCurrentFollowUp(false);
      setReportWorthy(false);
      setOpen(false);
      startTransition(() => router.refresh());
    } catch (error) {
      setTone("error");
      setMessageHref(null);
      setMessage(error instanceof Error ? error.message : "Customer interaction could not be recorded right now. No message was sent.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className={styles.interactionCard} aria-labelledby="interaction-form-heading">
      <header className={styles.interactionHeader}>
        <div>
          <span className={styles.eyebrow}>Manual contact outcome</span>
          <h2 id="interaction-form-heading">Record a relationship touchpoint</h2>
          <p>
            {available
              ? "This records a manual outcome only. It does not send email, text, or other messages, and source-owned workflows remain authoritative."
              : "Manual outcome recording is review only from Customer 360 right now. No message is sent here, and source-owned workflows remain authoritative."}
          </p>
        </div>
        {available ? (
          <button
            aria-controls={formId}
            aria-expanded={open}
            className={styles.interactionToggle}
            disabled={pending}
            onClick={() => setOpen((value) => !value)}
            type="button"
          >
            {open ? "Close" : "Log outcome"}
          </button>
        ) : null}
      </header>
      {message ? (
        <p
          className={tone === "error" ? styles.formError : styles.formSuccess}
          id={statusId}
          role={tone === "error" ? "alert" : "status"}
        >
          {message} {messageHref ? <Link href={messageHref}>Review timeline</Link> : null}
        </p>
      ) : null}
      {!available ? (
        <div id={formId}>
          <p className={styles.interactionHelper} id={helperId}>
            {unavailableReason
              ?? "Customer 360 is fail-closed for manual interaction commands right now. Review the existing relationship timeline or continue in the governed source workflow to record follow-up safely."}
          </p>
          <div className={styles.interactionActions}>
            {timelineHref ? <Link className={styles.secondaryActionLink} href={timelineHref}>Review timeline</Link> : null}
            {fallbackHref ? <Link className={styles.secondaryActionLink} href={fallbackHref}>Open governed source workflow</Link> : null}
            <span className={styles.interactionActionNote}>No customer message is sent here, and no manual outcome is recorded from this surface while the command is unavailable.</span>
          </div>
        </div>
      ) : open ? (
        <form
          aria-describedby={`${helperId}${message ? ` ${statusId}` : ""}`}
          className={styles.interactionForm}
          id={formId}
          onSubmit={(event) => void submit(event)}
        >
          <p className={styles.interactionHelper} id={helperId}>
            Record only what happened and the next follow-up if one was agreed. This form does not contact the customer.
          </p>
          <fieldset className={styles.interactionFieldset} disabled={pending}>
            <label>
              <span>Channel</span>
              <select onChange={(event) => selectChannel(event.target.value)} value={channel}>
                <option value="PHONE">Phone</option>
                <option value="TEXT">Manual text / SMS</option>
                <option value="EMAIL">Manual email</option>
                <option value="MEETING">Meeting</option>
                <option value="VISIT">Visit</option>
                <option value="INTERNAL_NOTE">Internal note</option>
              </select>
            </label>
            <label>
              <span>Direction</span>
              <select onChange={(event) => setDirection(event.target.value)} value={direction}>
                <option value="OUTBOUND">Outbound</option>
                <option value="INBOUND">Inbound</option>
                <option value="INTERNAL">Internal</option>
              </select>
            </label>
            <label>
              <span>Consent state</span>
              <select onChange={(event) => setConsentState(event.target.value)} value={consentState}>
                <option value="CONFIRMED">Confirmed</option>
                <option value="UNKNOWN">Unknown</option>
                <option value="NOT_REQUIRED">Not required</option>
              </select>
            </label>
            <label className={styles.interactionWide}>
              <span>Summary</span>
              <textarea onChange={(event) => setSummary(event.target.value)} required rows={3} value={summary} />
            </label>
            <label>
              <span>Outcome</span>
              <input onChange={(event) => setOutcome(event.target.value)} placeholder="Reached customer" value={outcome} />
            </label>
            <label>
              <span>Occurred at</span>
              <input onChange={(event) => setOccurredAt(event.target.value)} required type="datetime-local" value={occurredAt} />
            </label>
            <label className={styles.interactionWide}>
              <span>Next step</span>
              <input onChange={(event) => setNextStep(event.target.value)} placeholder="Call back after title arrives" value={nextStep} />
            </label>
            <label>
              <span>Next action time</span>
              <input disabled={completeCurrentFollowUp} onChange={(event) => setNextActionAt(event.target.value)} type="datetime-local" value={nextActionAt} />
            </label>
            <label className={styles.interactionCheckbox}>
              <input checked={completeCurrentFollowUp} onChange={(event) => {
                setCompleteCurrentFollowUp(event.target.checked);
                if (event.target.checked) setNextActionAt("");
              }} type="checkbox" />
              <span>Mark current follow-up complete</span>
            </label>
            <label className={styles.interactionCheckbox}>
              <input checked={reportWorthy} onChange={(event) => setReportWorthy(event.target.checked)} type="checkbox" />
              <span>Report-worthy</span>
            </label>
            <div className={styles.interactionActions}>
              <button disabled={pending || !summary.trim()} type="submit">{pending ? "Recording outcome…" : "Record outcome"}</button>
              <span className={styles.interactionActionNote}>{pending ? "Saving the manual outcome only. No message will be sent." : "Saved here only. No message will be sent."}</span>
            </div>
          </fieldset>
        </form>
      ) : null}
    </section>
  );
}
