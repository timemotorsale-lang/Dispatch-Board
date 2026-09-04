"use client";
import { useState } from "react";
import type { RevisableEstimateLine } from "@/lib/estimate-revision";
import styles from "./shop-planning-workspace.module.css";

export function dollarsToCents(value: string): number | null {
  if (!/^\d+(\.\d{1,2})?$/.test(value.trim())) return null;
  const cents = Math.round(Number(value) * 100);
  return Number.isSafeInteger(cents) ? cents : null;
}

export function EstimatePriceCorrection({ lines, taxCents, discountCents, reason, busy, feedback, onReason, onSave, onCancel }: {
  lines: RevisableEstimateLine[]; taxCents: number; discountCents: number; reason: string; busy: boolean;
  feedback?: string;
  onReason: (value: string) => void; onSave: (lines: RevisableEstimateLine[]) => void; onCancel: () => void;
}) {
  const [prices, setPrices] = useState(() => Object.fromEntries(lines.map(line => [line.key, (line.unitPriceCents / 100).toFixed(2)])));
  const [validationMessage, setValidationMessage] = useState("");
  const valid = lines.every(line => dollarsToCents(prices[line.key] ?? "") !== null);
  const updated = lines.map(line => ({ ...line, unitPriceCents: dollarsToCents(prices[line.key] ?? "") ?? line.unitPriceCents }));
  const changed = updated.some((line, index) => line.unitPriceCents !== lines[index].unitPriceCents);
  const total = updated.reduce((sum, line) => sum + line.quantity * line.unitPriceCents, 0) + taxCents - discountCents;
  const money = (cents: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
  function save() {
    if (busy) return;
    const message = !valid ? "Enter a valid dollar amount with up to two decimal places." : !changed ? "Change at least one price before saving. No new version is needed for an unchanged price." : total < 0 ? "The revised total cannot be negative. Review the discount." : !reason.trim() ? "Enter a reason for the price correction, then save again." : "";
    setValidationMessage(message);
    if (!message) onSave(updated);
  }
  return <section className={styles.pathInfo} aria-label="Correct estimate prices" aria-busy={busy} onKeyDown={event => {
    if (event.key === "Enter" && event.target instanceof HTMLInputElement) { event.preventDefault(); event.stopPropagation(); save(); }
  }}>
    <h3>Correct estimate prices</h3><p>Enter dollars: type <strong>900.00</strong> for <strong>$900.00</strong>. This saves a new estimate version, not an approval.</p>
    {lines.map(line => <label key={line.key} style={{ display: "grid", gap: 6, marginBottom: 14 }}><strong>{line.description} · Quantity {line.quantity}</strong><span>Unit price ($) · previously {money(line.unitPriceCents)}</span><input aria-label={`${line.key} unit price in dollars`} disabled={busy} inputMode="decimal" value={prices[line.key] ?? ""} onChange={event => setPrices(value => ({ ...value, [line.key]: event.target.value }))} /></label>)}
    <p>Tax {money(taxCents)} · Discount {money(discountCents)}. Tax is unchanged; review it if the price correction affects tax.</p>
    <label style={{ display: "grid", gap: 6 }}>Reason for price correction<input maxLength={350} disabled={busy} value={reason} onChange={event => onReason(event.target.value)} placeholder="Example: Typo—$9.00 should be $900.00" /></label>
    <p role="status"><strong>{valid ? `Revised estimate total: ${money(total)}` : "Enter a valid dollar amount with up to two decimal places."}</strong></p>
    {validationMessage ? <p role="alert">{validationMessage}</p> : null}
    {feedback ? <p role="status">{feedback}</p> : null}
    <div className={styles.estimateLineActions}><button type="button" disabled={busy} onClick={save}>{busy ? "Saving corrected estimate…" : "Save corrected estimate"}</button><button type="button" disabled={busy} onClick={onCancel}>Cancel price correction</button></div>
  </section>;
}
