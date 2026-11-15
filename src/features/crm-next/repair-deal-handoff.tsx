"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
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

export function RepairDealOrderLinks({ repairOrderId, draftId }: { repairOrderId: string; draftId: string }) {
  const returnTo = `/crm-next/deals/start?${new URLSearchParams({ draftId, repairOrderId })}`;
  const order = new URLSearchParams({ repairOrderId, returnTo });
  return <nav className={styles.dealStartForm} aria-label="Linked repair order">
    <Link href={`/diagnostics/labor-guide?${order}`}>Open Labor Guide</Link>
    <Link href={`/vehicles/repair-workbench?${order}`}>Open repair workbench</Link>
    <Link href={`/vehicles/service-billing?${order}`}>Billing &amp; receipts</Link>
    <Link href={`/service-documents?${new URLSearchParams({ repairOrderId, workspace: "1", returnTo })}`}>Open repair documents</Link>
  </nav>;
}

export function matchesRepairDealOrder(order: { id?: unknown; customerId?: unknown; vehicleId?: unknown } | null, repairOrderId: string, customerId: string, vehicleId: string) {
  return Boolean(customerId && vehicleId && order?.id === repairOrderId
    && order.customerId === customerId && order.vehicleId === vehicleId);
}

export function VerifiedRepairDealOrderLinks({ repairOrderId, draftId, customerId, vehicleId }: {
  repairOrderId: string; draftId: string; customerId: string; vehicleId: string;
}) {
  const [check, setCheck] = useState<{ scope: string; result: "matched" | "mismatch" | "error" }>();
  const [attempt, setAttempt] = useState(0);
  const scope = JSON.stringify([repairOrderId, customerId, vehicleId, attempt]);
  useEffect(() => {
    if (!customerId || !vehicleId) return;
    const controller = new AbortController();
    void (async () => {
      try {
        const response = await fetch(`/api/repair-orders/${encodeURIComponent(repairOrderId)}`, {
          signal: controller.signal, cache: "no-store",
        });
        if (!response.ok) throw new Error("Could not verify repair order.");
        const order = await response.json();
        if (!controller.signal.aborted) setCheck({
          scope, result: matchesRepairDealOrder(order, repairOrderId, customerId, vehicleId) ? "matched" : "mismatch",
        });
      } catch {
        if (!controller.signal.aborted) setCheck({ scope, result: "error" });
      }
    })();
    return () => controller.abort();
  }, [repairOrderId, customerId, vehicleId, scope]);

  if (!customerId || !vehicleId) return <p>Choose the shared customer and vehicle before opening repair-order links.</p>;
  const result = check?.scope === scope ? check.result : undefined;
  if (result === "matched") return <RepairDealOrderLinks repairOrderId={repairOrderId} draftId={draftId} />;
  if (result === "mismatch") return <p>The repair order in this link does not match the selected customer and vehicle. Find the correct order in Repair documents.</p>;
  if (result === "error") return <div><p role="alert">Could not verify this repair order. Retry or find it in Repair documents.</p><button type="button" onClick={() => setAttempt(value => value + 1)}>Retry order check</button></div>;
  return <p role="status">Checking repair order…</p>;
}
