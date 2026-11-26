"use client";

import { useRef, useState } from "react";
import type { ArchiveDestinationType, ArchiveTarget } from "./capture-archive-contract";
import styles from "./capture-archive.module.css";

export function CaptureDestinationPicker({ value, onChange, disabled, initialType }: {
  value: ArchiveTarget | null;
  onChange: (value: ArchiveTarget | null) => void;
  disabled?: boolean;
  initialType?: ArchiveDestinationType;
}) {
  const [type, setType] = useState(initialType === "CUSTOMER" || initialType === "VEHICLE" ? initialType : "");
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<ArchiveTarget[]>([]);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const sequence = useRef(0);

  async function search() {
    if (!type || query.trim().length < 2 || loading) return;
    const request = ++sequence.current;
    setLoading(true);
    setItems([]);
    setStatus("Searching records…");
    try {
      const response = await fetch(`/api/capture-archive?${new URLSearchParams({ lookup: "1", type, q: query.trim() })}`, { cache: "no-store" });
      const body = await response.json();
      if (request !== sequence.current) return;
      if (!response.ok) throw new Error(body.error ?? "Record search failed.");
      setItems(body.items);
      setStatus(body.items.length ? "Select the exact record." : "No matching records. Change your search or send to the archive.");
    } catch (error) {
      if (request === sequence.current) setStatus(error instanceof Error ? error.message : "Record search failed. Try again.");
    } finally { if (request === sequence.current) setLoading(false); }
  }

  return <fieldset className={styles.destination} disabled={disabled}>
    <legend>Filing destination</legend>
    {value ? <div className={styles.actions}><strong>{value.label}</strong><button type="button" onClick={() => {
      onChange(null); setType(""); setItems([]); setStatus("");
    }}>Clear destination</button></div> : <>
      <label>Send to<select value={type} onChange={event => {
        sequence.current += 1; setLoading(false); setType(event.target.value as typeof type); setItems([]); setQuery(""); setStatus("");
      }}>
        <option value="">Capture Archive only</option><option value="CUSTOMER">Customer</option><option value="VEHICLE">Vehicle</option>
      </select></label>
      {type ? <><div className={styles.actions}>
        <label>Find {type === "CUSTOMER" ? "customer" : "vehicle"}<input placeholder={type === "CUSTOMER" ? "Name or customer number" : "VIN or stock number"} value={query} maxLength={100} onChange={event => {
          sequence.current += 1; setLoading(false); setItems([]); setStatus(""); setQuery(event.target.value);
        }} onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); void search(); } }} /></label>
        <button type="button" disabled={loading || query.trim().length < 2} onClick={() => void search()}>Find record</button>
      </div>
      {status ? <p role="status">{status}</p> : null}
      {items.length ? <ul className={styles.matches}>{items.map(item => <li key={item.id}><button type="button" onClick={() => onChange(item)}>{item.label}</button></li>)}</ul> : null}</> : null}
      <small>{type ? "A record is not selected until you choose a match. Without one, this stays in the archive." : "Unfiled items can be linked to a record later."}</small>
    </>}
  </fieldset>;
}
