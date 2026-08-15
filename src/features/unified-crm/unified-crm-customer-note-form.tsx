"use client";

import { startTransition, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import styles from "./unified-crm-customer-360.module.css";

type Props = {
  allowRestricted: boolean;
  customerId: string;
};

function createIdempotencyKey(customerId: string) {
  return globalThis.crypto?.randomUUID?.() ?? `crm-note-${customerId}-${Date.now()}`;
}

export function UnifiedCrmCustomerNoteForm({ allowRestricted, customerId }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [tone, setTone] = useState<"idle" | "error" | "success">("idle");
  const [body, setBody] = useState("");
  const [visibility, setVisibility] = useState<"INTERNAL" | "RESTRICTED">("INTERNAL");
  const [idempotencyKey, setIdempotencyKey] = useState(() => createIdempotencyKey(customerId));

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage(null);
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
      setBody("");
      setVisibility("INTERNAL");
      setIdempotencyKey(createIdempotencyKey(customerId));
      setOpen(false);
      startTransition(() => router.refresh());
    } catch (error) {
      setTone("error");
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
          <p>This records team context only. It does not notify the customer, share outside the permitted team, or change source-owned workflows.</p>
        </div>
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
      </header>
      {message ? <p className={tone === "error" ? styles.formError : styles.formSuccess} role={tone === "error" ? "alert" : "status"}>{message}</p> : null}
      {open ? (
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
