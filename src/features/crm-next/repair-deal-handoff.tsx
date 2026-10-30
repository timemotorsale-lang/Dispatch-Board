"use client";

import { useRef } from "react";
import styles from "./crm-next-shell.module.css";
import repairStyles from "./repair-deal-handoff.module.css";

export function repairDealIntakeHref(customerId: string, vehicleId: string, concern: string, draftId: string) {
  if (!customerId.trim() || !vehicleId.trim() || !concern.trim() || !draftId.trim()) return null;
  const returnTo = `/crm-next/deals/start?${new URLSearchParams({ draftId })}`;
  return `/vehicles/repair-orders?${new URLSearchParams({ intakeSource: "WALK_IN", customerId, vehicleId, concernSummary: concern.trim().slice(0, 500), returnTo })}`;
}

export function RepairDealHandoff({ customerId, vehicleId, concern, busy, onConcernChange, onMissingIdentity, onContinue }: { customerId: string; vehicleId: string; concern: string; busy: boolean; onConcernChange: (value: string) => void; onMissingIdentity: (field: "customer" | "vehicle") => void; onContinue: () => void }) {
  const concernRef = useRef<HTMLTextAreaElement>(null);
  const label = !customerId ? "Select customer to continue" : !vehicleId ? "Select or save vehicle to continue" : !concern.trim() ? "Enter repair concern to continue" : "Continue to check-in & Labor Guide";
  function proceed() {
    if (!customerId) onMissingIdentity("customer");
    else if (!vehicleId) onMissingIdentity("vehicle");
    else if (!concern.trim()) concernRef.current?.focus();
    else onContinue();
  }
  return <section className={styles.dealStartForm} aria-label="Repair intake and Labor Guide">
    <div className={styles.dealStartWide}><h2>Start repair</h2><p>Use the customer and vehicle selected above. Complete check-in or reuse the active repair order, then build the estimate in the Labor Guide.</p></div>
    <label className={styles.dealStartWide}><span>Repair concern</span><textarea ref={concernRef} className={repairStyles.concern} rows={3} maxLength={500} value={concern} onChange={event => onConcernChange(event.target.value)} placeholder="What needs attention?" /></label>
    {!customerId || !vehicleId ? <div className={styles.dealStartWide} role="status">{!customerId ? <p>Customer not selected. Select an existing customer or save a new customer above.</p> : null}{!vehicleId ? <p>Vehicle not selected. Save the vehicle form above or select an existing vehicle.</p> : null}</div> : null}
    <div className={styles.dealStartWide}><button className={`${styles.primaryButton} ${repairStyles.continueButton}`} type="button" disabled={busy} onClick={proceed}>{busy ? "Saving repair context…" : label}</button><p>Pricing comes from the RO estimate. Opening this path does not authorize repairs, issue an invoice or create a sales opportunity.</p></div>
  </section>;
}
