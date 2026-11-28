"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { emptyVehicleWish, parseVehicleWish, vehicleWishFields, type VehicleWish, type VehicleWishDraft } from "@/lib/customer-vehicle-wishes";
import styles from "./customer360-workspace.module.css";

const dollars = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const dollarsWithCents = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const formatDollars = (cents: number) => (cents % 100 ? dollarsWithCents : dollars).format(cents / 100);
const toDraft = (wish: VehicleWish): VehicleWishDraft => ({
  year: wish.year?.toString() ?? "", make: wish.make ?? "", model: wish.model ?? "", color: wish.color ?? "",
  maxPrice: wish.maxPriceCents === null ? "" : (wish.maxPriceCents / 100).toFixed(2),
  monthlyPayment: wish.monthlyPaymentCents === null ? "" : (wish.monthlyPaymentCents / 100).toFixed(2)
});
const title = (wish: VehicleWish) => [wish.year, wish.make, wish.model].filter(Boolean).join(" ") || "Vehicle wish";

type Editor = { id: string; version: number | null; draft: VehicleWishDraft; original?: VehicleWishDraft };
type Change = (Omit<Editor, "draft"> & { action: "save"; fields: VehicleWishDraft })
  | { id: string; version: number; action: "archive" };

async function fetchWishes(url: string, signal?: AbortSignal): Promise<VehicleWish[]> {
  const response = await fetch(url, { signal, cache: "no-store" });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error);
  return result.wishes;
}

export function CustomerVehicleWishes({ customerId, active, editable }: { customerId: string; active: boolean; editable: boolean }) {
  const url = `/api/crm-next/customers/${encodeURIComponent(customerId)}/vehicle-wishes`;
  const [wishes, setWishes] = useState<VehicleWish[] | null>(null);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loadError, setLoadError] = useState("");
  const [conflict, setConflict] = useState(false);
  const [refreshed, setRefreshed] = useState(false);
  const firstField = useRef<HTMLInputElement>(null);
  const addButton = useRef<HTMLButtonElement>(null);
  const wasOpened = useRef(false);
  const editorId = editor?.id;
  const latest = conflict && refreshed && editor ? wishes?.find(wish => wish.id === editor.id) : undefined;

  useEffect(() => {
    if (!active || wishes !== null || loadError) return;
    const controller = new AbortController();
    fetchWishes(url, controller.signal).then(setWishes).catch(() => {
      if (!controller.signal.aborted) setLoadError("Vehicle wishes could not be loaded.");
    });
    return () => controller.abort();
  }, [active, url, wishes, loadError]);

  useEffect(() => {
    if (editorId) {
      wasOpened.current = true;
      firstField.current?.focus();
    } else if (wasOpened.current) {
      addButton.current?.focus();
    }
  }, [editorId]);

  function open(wish?: VehicleWish) {
    setError(""); setNotice(""); setConflict(false); setRefreshed(false);
    setEditor(wish ? { id: wish.id, version: wish.version, draft: toDraft(wish), original: toDraft(wish) }
      : { id: globalThis.crypto.randomUUID(), version: null, draft: { ...emptyVehicleWish } });
  }

  async function refresh() {
    setBusy(true);

    try {
      setWishes(await fetchWishes(url));
      setLoadError("");
      setRefreshed(true);
      if (!editor) {
        setConflict(false);
        setError("");
      }
    } catch {
      setLoadError("Vehicle wishes could not be loaded.");
    } finally {
      setBusy(false);
    }
  }

  async function change(payload: Change) {
    setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch(url, {
        method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload)
      });
      const result = await response.json();
      if (!response.ok) {
        setError(result.error ?? "The change could not be confirmed. Try again.");
        if (response.status === 409) { setConflict(true); setRefreshed(false); }
        return;
      }
      if (result.status === "archived") {
        setWishes(previous => (previous ?? []).filter(wish => wish.id !== payload.id));
        setNotice("Vehicle wish removed.");
        addButton.current?.focus();
      } else {
        const saved: VehicleWish = result.wish;
        setWishes(previous => previous?.some(wish => wish.id === saved.id)
          ? previous.map(wish => wish.id === saved.id ? saved : wish) : [...(previous ?? []), saved]);
        setEditor(null);
        setNotice("Vehicle wish saved.");
      }
    } catch {
      setError("The change could not be confirmed. Try again.");
    } finally {
      setBusy(false);
    }
  }

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editor || busy || conflict) return;
    try { parseVehicleWish(editor.draft); }
    catch (cause) { setError((cause as Error).message); return; }
    void change({ action: "save", id: editor.id, version: editor.version, fields: editor.draft });
  }

  return <div className={styles.wishSection}>
    <div className={styles.wishHeader}>
      <div>
        <h3>Vehicle wishes</h3>
        <p>Save a separate wish for each vehicle the customer would consider.</p>
      </div>
      {editable && !editor && <button ref={addButton} type="button" disabled={busy || !wishes || conflict} onClick={() => open()}>Add vehicle wish</button>}
    </div>
    {wishes === null && !loadError && <p role="status">Loading vehicle wishes…</p>}
    {loadError && <div className={styles.actions}><p role="alert">{loadError}</p><button type="button" disabled={busy} onClick={() => void refresh()}>Retry loading wishes</button></div>}
    {notice && <p role="status">{notice}</p>}
    {error && <p role="alert">{error}</p>}
    {conflict && !refreshed && <div className={styles.actions}>
      <button type="button" disabled={busy} onClick={() => void refresh()}>Review latest wishes</button>
    </div>}
    {conflict && refreshed && editor && <div className={styles.actions}>
      <p>{latest ? "Review the saved version below. Continuing keeps your edits and uses the latest values for fields you did not change." : "This wish is no longer in the list. You can keep your draft as a new wish."}</p>
      <button type="button" disabled={busy} onClick={() => {
        if (latest && editor.original) {
          const original = toDraft(latest);
          const draft = { ...original };
          for (const { key } of vehicleWishFields) {
            if (editor.draft[key] !== editor.original[key]) draft[key] = editor.draft[key];
          }
          setEditor({ id: latest.id, version: latest.version, original, draft });
        } else {
          setEditor({ id: globalThis.crypto.randomUUID(), version: null, draft: editor.draft });
        }
        setConflict(false); setRefreshed(false); setError("");
      }}>{latest ? "Continue editing latest version" : "Keep draft as a new wish"}</button>
    </div>}
    {editor && <form className={styles.form} aria-label={editor.version === null ? "Add vehicle wish" : "Edit vehicle wish"} onSubmit={save}>
      <div className={styles.wishFields}>
        {vehicleWishFields.map(field => <label key={field.key}>
          <span>{field.label}</span>
          <input ref={field.key === "year" ? firstField : undefined} type="text"
            inputMode={"inputMode" in field ? field.inputMode : undefined} maxLength={field.maxLength}
            placeholder={field.placeholder} value={editor.draft[field.key]} disabled={busy}
            onChange={event => setEditor({ ...editor, draft: { ...editor.draft, [field.key]: event.target.value } })} />
        </label>)}
      </div>
      <small>Fill in what you know. Price and payment are preferences, not a quote.</small>
      <div className={styles.actions}>
        <button type="submit" disabled={busy || conflict || !Object.values(editor.draft).some(value => value.trim())}>{busy ? "Saving…" : "Save wish"}</button>
        <button type="button" disabled={busy} onClick={() => { setEditor(null); setError(""); setConflict(false); }}>Cancel</button>
      </div>
    </form>}
    {wishes?.length === 0 && !editor && <p>No vehicle wishes saved yet.</p>}
    {!!wishes?.length && <ul className={styles.rows} aria-label="Saved vehicle wishes">{wishes.map(wish => {
      const details = [wish.color,
        wish.maxPriceCents !== null ? `Max price ${formatDollars(wish.maxPriceCents)}` : null,
        wish.monthlyPaymentCents !== null ? `Target ${formatDollars(wish.monthlyPaymentCents)}/mo` : null
      ].filter(Boolean).join(" · ");
      return <li key={wish.id}>
        <div><strong>{title(wish)}</strong>{details && <small>{details}</small>}</div>
        {editable && <span className={styles.actions}>
          <button type="button" aria-label={`Edit ${title(wish)}`} disabled={!!editor || busy || conflict} onClick={() => open(wish)}>Edit</button>
          <button type="button" aria-label={`Remove ${title(wish)}`} disabled={!!editor || busy || conflict} onClick={() => {
            if (window.confirm(`Remove ${title(wish)} from this customer's wishlist?`)) void change({ action: "archive", id: wish.id, version: wish.version });
          }}>Remove</button>
        </span>}
      </li>;
    })}</ul>}
  </div>;
}
