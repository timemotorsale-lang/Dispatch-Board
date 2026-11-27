"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { CustomerSalesDeposits } from "./customer-sales-deposits";
import { DealOperationsDrawer } from "./deal-operations-drawer";
import styles from "./customer360-workspace.module.css";

type Deal = { id: string; dealNumber: number; customerId: string; customerName: string; pathway: string; vehicleReference: string; status: string };
type Vehicle = { id: string; label: string; vin: string; version: number; linked: boolean };

export function CustomerDealTools({ customerId }: { customerId: string }) {
  const [deals, setDeals] = useState<Deal[] | null>(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [selected, setSelected] = useState<Deal | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    void fetch(`/api/crm/v1/deal-drafts?customerId=${encodeURIComponent(customerId)}`, { signal: controller.signal, cache: "no-store" })
      .then(async response => {
        if (!response.ok) throw new Error();
        const rows: Deal[] = await response.json();
        if (!controller.signal.aborted) setDeals(rows.filter(row => row.customerId === customerId));
      }).catch(() => { if (!controller.signal.aborted) setError("Could not load saved deals."); });
    return () => controller.abort();
  }, [customerId, retry]);
  return <>
    <CustomerSalesDeposits key={customerId} customerId={customerId} />
    <h3>Accounting &amp; deposits</h3>
    <p>Open Money on a saved deal to review activity posted separately to that deal.</p>
    {error ? <p role="alert">{error} <button type="button" onClick={() => { setError(""); setRetry(value => value + 1); }}>Retry</button></p> :
      deals === null ? <p role="status">Loading saved deals…</p> : deals.length === 0 ? <p>No saved deals are available to you for this customer.</p> :
      <ul className={styles.rows}>{deals.map(deal => <li key={deal.id}>
        <div><strong>Deal #{deal.dealNumber}</strong><small>{[deal.vehicleReference, deal.status.replaceAll("_", " ").toLowerCase()].filter(Boolean).join(" · ")}</small></div>
        <Link href={`/crm-next/deals/start?draftId=${encodeURIComponent(deal.id)}`}>Open deal</Link>
        <button type="button" onClick={() => setSelected(deal)}>Open Money<span className="sr-only"> for deal {deal.dealNumber}</span></button>
      </li>)}</ul>}
    <Link href={`/crm-next/deals/start?customerId=${encodeURIComponent(customerId)}`}>Open deal workspace</Link>
    {selected && <DealOperationsDrawer deal={{ ...selected, draftId: selected.id }} expectedCustomerId={customerId} initialTab="Money" onClose={() => setSelected(null)} onChanged={() => setRetry(value => value + 1)} />}
  </>;
}

export type CustomerWishlistValue = { body: string; noteId: string | null };
export function CustomerWishlist({ customerId, initial, editable }: { customerId: string; initial: CustomerWishlistValue | null; editable: boolean }) {
  const [saved, setSaved] = useState(initial?.body ?? null);
  const [noteId, setNoteId] = useState(initial?.noteId ?? null);
  const [body, setBody] = useState(initial?.body ?? "");
  const [changed, setChanged] = useState(false);
  const [latest, setLatest] = useState<CustomerWishlistValue | null>(null);
  const endpoint = `/api/crm-next/customers/${encodeURIComponent(customerId)}/actions`;
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const pending = useRef<{ text: string; key: string } | null>(null);
  async function save(event: FormEvent) {
    event.preventDefault();
    const text = body.trim();
    if (!text || busy || !editable || changed) return;
    if (pending.current?.text !== text) pending.current = { text, key: crypto.randomUUID() };
    setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch(endpoint, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "save-wishlist", body: text, idempotencyKey: pending.current.key, expectedWishlistNoteId: noteId })
      });
      const result = await response.json();
      if (response.status === 409 && result.code === "WISHLIST_CHANGED") { setChanged(true); setLatest(null); }
      if (!response.ok) throw new Error(result.error || "Could not save the wishlist.");
      setNoteId(result.noteId); setSaved(text); setEditing(false); setMessage("Wishlist saved."); pending.current = null;
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not save the wishlist. Your entries are still here."); }
    finally { setBusy(false); }
  }
  async function reviewLatest() {
    setBusy(true);
    try {
      const response = await fetch(endpoint + "?view=wishlist", { cache: "no-store" });
      if (!response.ok) throw new Error("Could not load the latest version. Your draft is still here.");
      setLatest(await response.json());
      setError("");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not load the latest version."); }
    finally { setBusy(false); }
  }
  return <>
    {saved === null ? <p role="alert">Could not load the wishlist. Reload this record before editing.</p> :
      editing ? <form className={styles.form} onSubmit={event => void save(event)}>
        <label>Vehicle preferences<textarea autoFocus rows={4} required maxLength={1800} value={body} disabled={busy} onChange={event => setBody(event.target.value)} placeholder="Must-haves, body style, color, budget, or features" /></label>
        {error && <p role="alert">{error}</p>}
        {changed && (latest ? <div>
          <strong>Latest saved wishlist</strong><p className={styles.preserve}>{latest.body || "No wishlist is saved."}</p>
          <button type="button" onClick={() => { setSaved(latest.body); setNoteId(latest.noteId); setChanged(false); setLatest(null); pending.current = null; }}>Keep editing my draft</button>
          <button type="button" onClick={() => { setSaved(latest.body); setNoteId(latest.noteId); setBody(latest.body); setChanged(false); setLatest(null); pending.current = null; setEditing(false); }}>Use latest saved wishlist</button>
        </div> : <button type="button" disabled={busy} onClick={() => void reviewLatest()}>Review latest wishlist</button>)}
        <div className={styles.actions}><button type="submit" disabled={busy || changed || !body.trim() || body.trim() === saved}>{busy ? "Saving…" : "Save wishlist"}</button>
        <button type="button" disabled={busy} onClick={() => { setEditing(false); setBody(saved); setError(""); setChanged(false); setLatest(null); pending.current = null; }}>Cancel</button></div>
      </form> : <>
        <p className={styles.preserve}>{saved || "No wishlist has been recorded."}</p>
        {editable && <button type="button" onClick={() => { setEditing(true); setMessage(""); }}>{saved ? "Edit wishlist" : "Add wishlist"}</button>}
      </>}
    {message && <p role="status">{message}</p>}
  </>;
}

export function CustomerVehicleLink({ customerId }: { customerId: string }) {
  const router = useRouter();
  const [vin, setVin] = useState("");
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const endpoint = `/api/crm-next/customers/${encodeURIComponent(customerId)}/vehicle-links`;
  async function lookup(event: FormEvent) {
    event.preventDefault();
    setVehicle(null); setError(""); setMessage(""); setBusy(true);
    try {
      const response = await fetch(endpoint + "?" + new URLSearchParams({ vin }), { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not find the vehicle.");
      setVehicle(data);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not find the vehicle."); }
    finally { setBusy(false); }
  }
  async function link() {
    if (!vehicle || vehicle.linked || busy) return;
    setError(""); setBusy(true);
    try {
      const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vehicleId: vehicle.id, version: vehicle.version, vin: vehicle.vin }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not link the vehicle.");
      setVehicle({ ...vehicle, linked: true });
      setMessage(data.duplicate ? "This vehicle is already linked." : "Vehicle linked for service.");
      router.refresh();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not link the vehicle."); }
    finally { setBusy(false); }
  }
  return <details className={styles.subsection}>
    <summary>Link an existing vehicle</summary>
    <p>This adds a service relationship. It does not record ownership or change inventory.</p>
    <form className={styles.actions} onSubmit={event => void lookup(event)}>
      <label>VIN <input value={vin} maxLength={17} disabled={busy} onChange={event => { setVin(event.target.value.toUpperCase()); setVehicle(null); setMessage(""); setError(""); }} required /></label>
      <button type="submit" disabled={busy || vin.length !== 17}>Find vehicle</button>
    </form>
    {vehicle && <div className={styles.actions}><span>{vehicle.label} · {vehicle.vin}</span>{vehicle.linked ? <strong>Already linked</strong> : <button disabled={busy} type="button" onClick={() => void link()}>Link for service</button>}</div>}
    {error && <p role="alert">{error}</p>}
    {message && <p role="status">{message}</p>}
  </details>;
}
