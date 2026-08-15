"use client";

import { startTransition, useId, useState, type FormEvent } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import styles from "./unified-crm-customer-360.module.css";
import { currentCustomerPageHref } from "./unified-crm-customer-page-context";

type Props = {
  customerId: string;
  defaultOpen?: boolean;
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

export function UnifiedCrmCustomerInteractionForm({ customerId, defaultOpen = false }: Props) {
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
  const [summary, setSummary] = useState("");
  const [outcome, setOutcome] = useState("");
  const [nextStep, setNextStep] = useState("");
  const [occurredAt, setOccurredAt] = useState(localDateTimeValue(new Date()));
  const [nextActionAt, setNextActionAt] = useState("");
  const [idempotencyKey, setIdempotencyKey] = useState(() => createIdempotencyKey(customerId));
  const timelineHref = currentCustomerPageHref(pathname, searchParams.toString(), "timeline-heading");

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
          consentState,
          direction,
          idempotencyKey,
          nextActionAt: nextActionAt || null,
          nextStep: nextStep || null,
          occurredAt,
          outcome: outcome || null,
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
          <p>This records a manual outcome only. It does not send email, text, or other messages, and source-owned workflows remain authoritative.</p>
        </div>
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
      {open ? (
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
              <select onChange={(event) => setChannel(event.target.value)} value={channel}>
                <option value="PHONE">Phone</option>
                <option value="TEXT">Text</option>
                <option value="EMAIL">Email</option>
                <option value="MEETING">Meeting</option>
                <option value="VISIT">Visit</option>
              </select>
            </label>
            <label>
              <span>Direction</span>
              <select onChange={(event) => setDirection(event.target.value)} value={direction}>
                <option value="OUTBOUND">Outbound</option>
                <option value="INBOUND">Inbound</option>
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
              <input onChange={(event) => setNextActionAt(event.target.value)} type="datetime-local" value={nextActionAt} />
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
