"use client";
import { useState } from "react";
import styles from "./labor-guide-details.module.css";

export type LaborGuideDetails = { customer: string; vehicle: string; vin: string; concern: string };
export const emptyLaborGuideDetails: LaborGuideDetails = { customer: "", vehicle: "", vin: "", concern: "" };

export function LaborGuideDetailsForm({ value, onApply, onCancel }: { value: LaborGuideDetails; onApply: (value: LaborGuideDetails) => void; onCancel: () => void }) {
  const [draft, setDraft] = useState(value);
  return <form className={styles.form} aria-label="Vehicle and customer details" onSubmit={event => {
    event.preventDefault();
    if (!draft.vehicle.trim()) return;
    onApply({ customer: draft.customer.trim(), vehicle: draft.vehicle.trim(), vin: draft.vin.trim().toUpperCase(), concern: draft.concern.trim() });
  }}>
    <header><strong>Vehicle & customer details</strong><p>Use the labor guide without creating a repair order, customer record, or vehicle check-in. Use Save preliminary quote to keep these details; subsequent changes save automatically.</p></header>
    <label>Customer name (optional)<input value={draft.customer} maxLength={180} onChange={event => setDraft({ ...draft, customer: event.target.value })} /></label>
    <label>Vehicle — year, make, model<input required placeholder="2017 Acura TLX" value={draft.vehicle} maxLength={200} onChange={event => setDraft({ ...draft, vehicle: event.target.value })} /></label>
    <label>VIN (optional)<input value={draft.vin} maxLength={17} pattern="[A-Ha-hJ-Nj-nP-Rp-rS-Zs-z0-9]{17}" title="Enter a full 17-character VIN, without I, O, or Q." onChange={event => setDraft({ ...draft, vin: event.target.value })} /></label>
    <label>Concern / work requested (optional)<textarea value={draft.concern} maxLength={1200} onChange={event => setDraft({ ...draft, concern: event.target.value })} /></label>
    <footer><button type="submit">Use these details</button><button type="button" onClick={onCancel}>Cancel</button></footer>
  </form>;
}
