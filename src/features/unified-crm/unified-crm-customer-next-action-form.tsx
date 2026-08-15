"use client";

import { startTransition, useState, type FormEvent } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import styles from "./unified-crm-customer-360.module.css";
import { currentCustomerPageHref } from "./unified-crm-customer-page-context";

type Props = {
  currentNextActionAt: string | null;
  currentNextActionState: "NONE" | "SCHEDULED" | "DUE_TODAY" | "OVERDUE";
  customerId: string;
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
  return globalThis.crypto?.randomUUID?.() ?? `crm-next-${customerId}-${localDateTimeValue(new Date())}`;
}

function defaultDueValue(currentNextActionAt: string | null) {
  return currentNextActionAt ? localDateTimeValue(new Date(currentNextActionAt)) : localDateTimeValue(new Date(Date.now() + 60 * 60 * 1000));
}

export function UnifiedCrmCustomerNextActionForm({ currentNextActionAt, currentNextActionState, customerId }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageHref, setMessageHref] = useState<string | null>(null);
  const [tone, setTone] = useState<"idle" | "error" | "success">("idle");
  const [dueAt, setDueAt] = useState(() => defaultDueValue(currentNextActionAt));
  const [note, setNote] = useState("");
  const [idempotencyKey, setIdempotencyKey] = useState(() => createIdempotencyKey(customerId));
  const timelineHref = currentCustomerPageHref(pathname, searchParams.toString(), "timeline-heading");

  async function submit(operation: "SET" | "COMPLETE") {
    setPending(true);
    setMessage(null);
    setMessageHref(null);
    setTone("idle");

    try {
      const response = await fetch(`/api/crm/v1/customers/${encodeURIComponent(customerId)}/next-action`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          dueAt: operation === "SET" ? new Date(dueAt).toISOString() : null,
          expectedCurrentNextActionAt: currentNextActionAt,
          idempotencyKey,
          note: note || null,
          operation
        })
      });
      const payload = await response.json().catch(() => null) as { duplicate?: boolean; error?: string } | null;
      if (!response.ok) {
        throw new Error(payload?.error ?? "Customer next action could not be updated right now.");
      }
      setTone("success");
      setMessage(
        payload?.duplicate
          ? "This next-action update was already recorded. The customer view has been refreshed."
          : operation === "COMPLETE"
            ? "Next action completed. Refreshing customer context…"
            : "Next action updated. Refreshing customer context…"
      );
      setMessageHref(timelineHref);
      setIdempotencyKey(createIdempotencyKey(customerId));
      setNote("");
      startTransition(() => router.refresh());
    } catch (error) {
      setTone("error");
      setMessageHref(null);
      setMessage(error instanceof Error ? error.message : "Customer next action could not be updated right now.");
    } finally {
      setPending(false);
    }
  }

  function onSet(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submit("SET");
  }

  return (
    <section className={styles.interactionCard} aria-labelledby="next-action-form-heading">
      <header className={styles.interactionHeader}>
        <div>
          <span className={styles.eyebrow}>Next action</span>
          <h2 id="next-action-form-heading">Keep the customer follow-up current</h2>
          <p>{currentNextActionState === "OVERDUE"
            ? "This follow-up is overdue. Renew it with a new due time or complete it from Customer 360."
            : currentNextActionState === "DUE_TODAY"
              ? "This follow-up is due today. Complete it or move it forward from Customer 360."
              : "Set, renew, or complete the dated CRM follow-up without leaving Customer 360."}</p>
        </div>
      </header>
      {message ? <p className={tone === "error" ? styles.formError : styles.formSuccess} role="status">{message} {messageHref ? <Link href={messageHref}>Review timeline</Link> : null}</p> : null}
      <form className={styles.interactionForm} onSubmit={onSet}>
        <label>
          <span>Due time</span>
          <input onChange={(event) => setDueAt(event.target.value)} required type="datetime-local" value={dueAt} />
        </label>
        <label className={styles.interactionWide}>
          <span>Reason or note</span>
          <input onChange={(event) => setNote(event.target.value)} placeholder="Example: Customer asked for a call before lunch." value={note} />
        </label>
        <div className={styles.interactionActions}>
          <button disabled={pending} type="submit">{pending ? "Saving…" : currentNextActionState === "OVERDUE" ? "Renew overdue next action" : currentNextActionState === "DUE_TODAY" ? "Move today’s next action" : currentNextActionAt ? "Reschedule next action" : "Set next action"}</button>
          {currentNextActionAt ? <button className={styles.secondaryAction} disabled={pending} onClick={() => void submit("COMPLETE")} type="button">Complete next action</button> : null}
        </div>
      </form>
    </section>
  );
}
