"use client";

import { useEffect, useState } from "react";
import { additionalWorkLines, emptyAdditionalWork, revisedWorkLines, revisedWorkTotals } from "@/lib/estimate-additional-work";
import type { WorkflowDocument } from "./service-document-workflow";
import styles from "./service-document-workflow.module.css";

type Review = {
  canAddWork: boolean;
  workEditReason: string | null;
  chargeEditReason: string;
  expectedVersion: number;
  laborRate: number;
  taxRatePercent: number | null;
  discountCents: number;
};

const blankPart = { description: "", partNumber: "", quantity: "1", unitPrice: "" };
const money = (cents: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);

export function EstimateAdditionalWork({ repairOrderId, document, onEstimate, onLockChange }: {
  repairOrderId: string;
  document: WorkflowDocument;
  onEstimate: (sourceId: string) => void;
  onLockChange: (locked: boolean) => void;
}) {
  const [review, setReview] = useState<Review | null>(null);
  const [work, setWork] = useState(emptyAdditionalWork);
  const [rate, setRate] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [pending, setPending] = useState<Record<string, unknown> | null>(null);
  const url = `/api/repair-orders/${encodeURIComponent(repairOrderId)}/document-review`;
  const documentId = document.id;
  useEffect(() => {
    const controller = new AbortController();
    void fetch(`${url}?documentId=${encodeURIComponent(documentId)}`, { cache: "no-store", signal: controller.signal }).then(async response => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not load the saved estimate.");
      if (controller.signal.aborted) return;
      setReview(data);
      setRate(data.taxRatePercent == null ? "" : String(data.taxRatePercent));
    }).catch(failure => { if (!controller.signal.aborted) setError(String(failure.message)); });
    return () => controller.abort();
  }, [url, documentId, attempt]);

  useEffect(() => {
    onLockChange(busy || Boolean(pending));
    return () => onLockChange(false);
  }, [busy, pending, onLockChange]);

  const existingLabor = document.content.lines.filter(line => line.type === "LABOR");
  const taxRate = rate.trim() === "" ? NaN : Number(rate);
  function calculate() {
    if (!review) return null;
    try {
      const source = document.content.lines.map(line => ({ ...line, type: line.type ?? "" }));
      const additions = additionalWorkLines(work, source, review.laborRate);
      return revisedWorkTotals(revisedWorkLines(source, additions), taxRate, review.discountCents);
    } catch {
      return null;
    }
  }
  const totals = calculate();

  async function save() {
    if (!review?.canAddWork || busy || (!totals && !pending)) return;
    const now = new Date();
    const command = pending ?? {
      action: "ADD_WORK", documentId, documentHash: document.sha256, estimateId: document.sourceId,
      expectedVersion: review.expectedVersion, additionalWork: work, laborRate: review.laborRate, taxRatePercent: taxRate,
      idempotencyKey: crypto.randomUUID(), presentedAt: now.toISOString(), expiresAt: new Date(now.getTime() + 7 * 86400000).toISOString(),
    };
    setBusy(true);
    setPending(command);
    setError("");
    try {
      const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(command) });
      const data = await response.json();
      if (!response.ok) {
        if (response.status < 500) setPending(null);
        throw new Error(response.status === 409 ? "This estimate changed. Open the latest version from Document history before saving." : data.error ?? "The revised estimate could not be saved.");
      }
      if (typeof data.result?.id !== "string") throw new Error("The save response was incomplete. Retry the same save.");
      setPending(null);
      onEstimate(data.result.id);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Could not confirm the save. Retry the same request.");
    } finally {
      setBusy(false);
    }
  }

  return <section aria-label="Add labor or parts">
    <h2>Add labor or parts</h2>
    {error && <p role="alert">{error}</p>}
    {!review ? error ? <button type="button" onClick={() => { setError(""); setAttempt(attempt + 1); }}>Try loading again</button> : <p role="status">Loading estimate…</p> : !review.canAddWork ? <p>{review.workEditReason ?? review.chargeEditReason}</p> : <>
      <p>Save a revised estimate and record a new customer decision before starting the added work.</p>
      <form onSubmit={event => { event.preventDefault(); void save(); }}>
        <fieldset disabled={busy || Boolean(pending)}>
          <label>Labor description<input maxLength={500} value={work.laborDescription} onChange={event => setWork({ ...work, laborDescription: event.target.value })} placeholder="Replace both front sway bar links" /></label>
          <label>Planned labor minutes · {money(review.laborRate * 100)}/hr<input type="number" min="1" max="6000" step="1" value={work.laborMinutes} onChange={event => setWork({ ...work, laborMinutes: event.target.value })} /></label>
          {work.parts.length > 0 && !work.laborDescription.trim() && existingLabor.length > 1 && <label>Labor line for added parts
            <select required value={work.laborLineKey} onChange={event => setWork({ ...work, laborLineKey: event.target.value })}>
              <option value="">Choose labor</option>
              {existingLabor.map(line => <option key={line.key} value={line.key}>{line.description}</option>)}
            </select>
          </label>}
          {work.parts.map((part, index) => <fieldset key={index} className={styles.workPart}>
            <legend>Part {index + 1}</legend>
            {([["description", "Description"], ["partNumber", "Part number"], ["quantity", "Quantity"], ["unitPrice", "Unit price ($)"]] as const).map(([field, label]) => <label key={field}>{label}
              <input required maxLength={field === "description" ? 500 : 100} inputMode={field === "quantity" ? "numeric" : field === "unitPrice" ? "decimal" : undefined} value={part[field]} onChange={event => setWork({ ...work, parts: work.parts.map((row, rowIndex) => rowIndex === index ? { ...row, [field]: event.target.value } : row) })} />
            </label>)}
            <button type="button" onClick={() => setWork({ ...work, parts: work.parts.filter((_, rowIndex) => rowIndex !== index) })}>Remove part {index + 1}</button>
          </fieldset>)}
          <button type="button" disabled={work.parts.length >= 20} onClick={() => setWork({ ...work, parts: [...work.parts, blankPart] })}>Add part</button>
          <label>Reason for additional work<input required maxLength={350} value={work.reason} onChange={event => setWork({ ...work, reason: event.target.value })} /></label>
          <label>Tax rate (%)<input required type="number" min="0" max="30" step="0.001" value={rate} onChange={event => setRate(event.target.value)} /></label>
          <p aria-live="polite">{totals ? `Revised estimate ${money(totals.totalCents)} · tax ${money(totals.taxCents)}` : "Complete the added lines, reason and tax rate to see the revised total."}</p>
          <button className={styles.primary} type="submit" disabled={!totals}>Save revised estimate</button>
        </fieldset>
      </form>
      {pending && <button type="button" disabled={busy} onClick={() => void save()}>{busy ? "Saving revised estimate…" : "Retry the same save"}</button>}
    </>}
  </section>;
}
