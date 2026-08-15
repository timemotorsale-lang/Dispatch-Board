"use client";

import Link from "next/link";
import { startTransition, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import styles from "./unified-crm-customer-360.module.css";

type Props = {
  available?: boolean;
  customerDisplayName: string;
  customerId: string;
  defaultDueAt: string | null;
  fallbackHref?: string;
};

function localDateTimeValue(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  const hour = `${date.getHours()}`.padStart(2, "0");
  const minute = `${date.getMinutes()}`.padStart(2, "0");
  return `${year}-${month}-${day}T${hour}:${minute}`;
}

function defaultDueValue(value: string | null) {
  if (value) {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return localDateTimeValue(parsed);
  }
  return localDateTimeValue(new Date(Date.now() + 60 * 60 * 1000));
}

function createIdempotencyKey(customerId: string) {
  return globalThis.crypto?.randomUUID?.() ?? `crm-task-${customerId}-${Date.now()}`;
}

export function UnifiedCrmCustomerTaskBridgeForm({
  available = true,
  customerDisplayName,
  customerId,
  defaultDueAt,
  fallbackHref = "/my-tasks"
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageHref, setMessageHref] = useState<string | null>(null);
  const [tone, setTone] = useState<"idle" | "error" | "success">("idle");
  const [title, setTitle] = useState(`Follow up with ${customerDisplayName}`);
  const [brief, setBrief] = useState("Document the customer follow-up, outcome, and next operational step.");
  const [dueAt, setDueAt] = useState(() => defaultDueValue(defaultDueAt));
  const [idempotencyKey, setIdempotencyKey] = useState(() => createIdempotencyKey(customerId));

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage(null);
    setMessageHref(null);
    setTone("idle");

    try {
      const response = await fetch(`/api/crm/v1/customers/${encodeURIComponent(customerId)}/tasks`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          brief,
          dueAt: new Date(dueAt).toISOString(),
          idempotencyKey,
          title
        })
      });
      const payload = await response.json().catch(() => null) as {
        duplicate?: boolean;
        error?: string;
        task?: { href?: string; title?: string };
      } | null;
      if (!response.ok) {
        throw new Error(payload?.error ?? "CRM task handoff could not be completed safely.");
      }
      setTone("success");
      setMessageHref(payload?.task?.href ?? null);
      setMessage(
        payload?.duplicate
          ? "This governed task handoff was already recorded. The existing task is ready to open."
          : "Governed follow-up task created. Customer 360 is refreshing with the same safe customer context."
      );
      setIdempotencyKey(createIdempotencyKey(customerId));
      setOpen(false);
      startTransition(() => router.refresh());
    } catch (error) {
      setTone("error");
      setMessage(error instanceof Error ? error.message : "CRM task handoff could not be completed safely.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className={styles.interactionCard} aria-labelledby="task-bridge-heading">
      <header className={styles.interactionHeader}>
        <div>
          <span className={styles.eyebrow}>Governed task handoff</span>
          <h2 id="task-bridge-heading">Create a protected follow-up task</h2>
          <p>This creates a real task in the existing task workflow with CRM customer context. It does not send a message, and task ownership stays with the task workspace after handoff.</p>
        </div>
        {available ? (
          <button
            aria-controls="customer-task-bridge-panel"
            aria-expanded={open}
            className={styles.interactionToggle}
            disabled={pending}
            onClick={() => setOpen((value) => !value)}
            type="button"
          >
            {open ? "Close" : "Create governed task"}
          </button>
        ) : null}
      </header>
      {message ? (
        <p className={tone === "error" ? styles.formError : styles.formSuccess} role={tone === "error" ? "alert" : "status"}>
          {message} {messageHref ? <Link href={messageHref}>Open task</Link> : null}
        </p>
      ) : null}
      {!available ? (
        <div id="customer-task-bridge-panel">
          <p className={styles.interactionHelper}>
            CRM task handoff is fail-closed for this customer or environment right now. Continue in the existing task intake workflow to create tracked internal work without changing customer messaging or source-owned records.
          </p>
          <div className={styles.interactionActions}>
            <Link className={styles.secondaryActionLink} href={fallbackHref}>Open existing task intake</Link>
            <span className={styles.interactionActionNote}>No customer message is sent here, and Customer 360 does not become the task source of truth.</span>
          </div>
        </div>
      ) : open ? (
        <form className={styles.interactionForm} id="customer-task-bridge-panel" onSubmit={(event) => void submit(event)}>
          <p className={styles.interactionHelper}>
            Use this when the customer follow-up should become tracked work. The task stays governed by the task workspace after creation, and Customer 360 remains a safe handoff surface only.
          </p>
          <label className={styles.interactionWide}>
            <span>Task title</span>
            <input onChange={(event) => setTitle(event.target.value)} required value={title} />
          </label>
          <label className={styles.interactionWide}>
            <span>Brief</span>
            <textarea onChange={(event) => setBrief(event.target.value)} required rows={3} value={brief} />
          </label>
          <label>
            <span>Due time</span>
            <input onChange={(event) => setDueAt(event.target.value)} required type="datetime-local" value={dueAt} />
          </label>
          <div className={styles.interactionActions}>
            <button disabled={pending || title.trim().length < 8 || brief.trim().length < 16} type="submit">
              {pending ? "Creating governed task…" : "Create governed task"}
            </button>
            <span className={styles.interactionActionNote}>This creates tracked internal work only. No customer message is sent.</span>
          </div>
        </form>
      ) : null}
    </section>
  );
}
