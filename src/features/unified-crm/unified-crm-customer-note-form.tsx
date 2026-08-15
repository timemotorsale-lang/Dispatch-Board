"use client";

import { startTransition, useState, type FormEvent } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import styles from "./unified-crm-customer-360.module.css";
import { currentCustomerPageHref } from "./unified-crm-customer-page-context";

type Props = {
  available?: boolean;
  allowRestricted: boolean;
  customerId: string;
  defaultOpen?: boolean;
  fallbackHref?: string | null;
  unavailableReason?: string;
};

function createIdempotencyKey(customerId: string) {
  return globalThis.crypto?.randomUUID?.() ?? `crm-note-${customerId}-${Date.now()}`;
}

export function UnifiedCrmCustomerNoteForm({
  available = true,
  allowRestricted,
  customerId,
  defaultOpen = false,
  fallbackHref = null,
  unavailableReason
}: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(defaultOpen);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageHref, setMessageHref] = useState<string | null>(null);
  const [tone, setTone] = useState<"idle" | "error" | "success">("idle");
  const [body, setBody] = useState("");
  const [visibility, setVisibility] = useState<"INTERNAL" | "RESTRICTED">("INTERNAL");
  const [idempotencyKey, setIdempotencyKey] = useState(() => createIdempotencyKey(customerId));
  const notesHref = currentCustomerPageHref(pathname, searchParams.toString(), "customer-notes-heading");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage(null);
    setMessageHref(null);
    setTone("idle");

    try {
      const response = await fetch(`/api/crm/v1/customers/${encodeURIComponent(customerId)}/notes`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ body, idempotencyKey, visibility })
      });
      const payload = await response.json().catch(() => null) as { duplicate?: boolean; error?: string } | null;
      if (!response.ok) {
        throw new Error(payload?.error ?? "Customer note could not be recorded right now.");
      }
      setTone("success");
      setMessage(payload?.duplicate ? "This note was already recorded. The notes list has been refreshed." : "Note recorded. Refreshing customer notes…");
      setMessageHref(notesHref);
      setBody("");
      setVisibility("INTERNAL");
      setIdempotencyKey(createIdempotencyKey(customerId));
      setOpen(false);
      startTransition(() => router.refresh());
    } catch (error) {
      setTone("error");
      setMessageHref(null);
      setMessage(error instanceof Error ? error.message : "Customer note could not be recorded right now.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className={styles.interactionCard} aria-labelledby="note-form-heading">
      <header className={styles.interactionHeader}>
        <div>
          <span className={styles.eyebrow}>Relationship notes</span>
          <h2 id="note-form-heading">Add an internal customer note</h2>
          <p>
            {available
              ? "This records team context only. It does not notify the customer, share outside the permitted team, or change source-owned workflows."
              : "Customer note entry is review only from Customer 360 right now. No customer message is sent here, and source-owned workflows do not change."}
          </p>
        </div>
        {available ? (
          <button
            aria-controls="customer-note-form-panel"
            aria-expanded={open}
            className={styles.interactionToggle}
            disabled={pending}
            onClick={() => setOpen((value) => !value)}
            type="button"
          >
            {open ? "Close" : "Add note"}
          </button>
        ) : null}
      </header>
      {message ? <p className={tone === "error" ? styles.formError : styles.formSuccess} role={tone === "error" ? "alert" : "status"}>{message} {messageHref ? <Link href={messageHref}>Review notes</Link> : null}</p> : null}
      {!available ? (
        <div id="customer-note-form-panel">
          <p className={styles.interactionHelper} id="customer-note-form-helper">
            {unavailableReason
              ?? "Customer 360 is fail-closed for note commands right now. Review the visible team context here or continue in the governed source workflow when note entry becomes available."}
          </p>
          <div className={styles.interactionActions}>
            {notesHref ? <Link className={styles.secondaryActionLink} href={notesHref}>Review visible notes</Link> : null}
            {fallbackHref ? <Link className={styles.secondaryActionLink} href={fallbackHref}>Open governed source workflow</Link> : null}
            <span className={styles.interactionActionNote}>No note is recorded from this surface while command entry is unavailable.</span>
          </div>
        </div>
      ) : open ? (
        <form
          aria-describedby="customer-note-form-helper customer-note-form-status"
          className={styles.interactionForm}
          id="customer-note-form-panel"
          onSubmit={(event) => void submit(event)}
        >
          <p className={styles.interactionHelper} id="customer-note-form-helper">
            Keep the note factual and useful for the next teammate. Restricted notes stay limited to viewers with the right CRM access.
          </p>
          <fieldset className={styles.interactionFieldset} disabled={pending}>
            <label className={styles.interactionWide}>
              <span>Note</span>
              <textarea onChange={(event) => setBody(event.target.value)} required rows={4} value={body} />
            </label>
            <label>
              <span>Visibility</span>
              <select onChange={(event) => setVisibility(event.target.value as "INTERNAL" | "RESTRICTED")} value={visibility}>
                <option value="INTERNAL">Internal</option>
                {allowRestricted ? <option value="RESTRICTED">Restricted</option> : null}
              </select>
            </label>
            <div className={styles.interactionActions}>
              <button disabled={pending || !body.trim()} type="submit">{pending ? "Saving note…" : "Save note"}</button>
              <span className={styles.interactionActionNote} id="customer-note-form-status">
                This saves team context only. No customer message is sent.
              </span>
            </div>
          </fieldset>
        </form>
      ) : null}
    </section>
  );
}
