"use client";

import Link from "next/link";
import { useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./repair-workflow.module.css";

type Work = { key: string; description: string; plannedCorrection: string; laborGuideMinutes: number; partsRequired: boolean };

export function ApprovedTechnicianWork({ repairOrderId, estimateId, authorizationId, work, permissionError, partsMappingError, unmatchedParts, partsHref, resumeHref }: {
  repairOrderId: string;
  estimateId: string;
  authorizationId: string;
  work: Work[];
  permissionError?: string;
  partsMappingError?: string;
  unmatchedParts: { id: string; label: string; quantity: number }[];
  partsHref: string;
  resumeHref: string;
}) {
  const router = useRouter();
  const [instructions, setInstructions] = useState<Record<string, string>>({});
  const [requiredParts, setRequiredParts] = useState<string[]>([]);
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showPartsError, setShowPartsError] = useState(false);
  const partsHelpId = useId();
  const partsFields = useRef<HTMLFieldSetElement>(null);
  const savingRef = useRef(false);
  const attempt = useRef<{ changes: string; id: string } | undefined>(undefined);
  const needsPartsConfirmation = unmatchedParts.some(part => !assignments[part.id]);
  async function create() {
    if (savingRef.current || permissionError || partsMappingError) return;
    setError("");
    if (needsPartsConfirmation) {
      setShowPartsError(true);
      partsFields.current?.querySelector<HTMLElement>("[data-missing-part-match]")?.focus();
      return;
    }
    setShowPartsError(false);
    savingRef.current = true;
    setSaving(true);
    const updates = work.flatMap(line => {
      const text = instructions[line.key]?.trim();
      return text && text !== line.plannedCorrection ? [{ lineKey: line.key, text }] : [];
    });
    const fingerprint = JSON.stringify([updates, requiredParts, assignments]);
    if (attempt.current?.changes !== fingerprint) attempt.current = { changes: fingerprint, id: crypto.randomUUID() };
    try {
      const response = await fetch(`/api/repair-orders/${encodeURIComponent(repairOrderId)}/planning`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "CREATE_APPROVED_JOBS", idempotencyKey: attempt.current.id, estimateId, authorizationId, instructions: updates, additionalPartsRequiredKeys: requiredParts,
          demandAssignments: unmatchedParts.map(part => ({ id: part.id, lineKey: assignments[part.id] })),
          reason: "Create technician work orders from the current approved estimate.",
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "The work orders could not be created.");
      router.replace(resumeHref, { scroll: false });
      router.refresh();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Could not confirm the save. Retry to finish the remaining work orders.");
      if (failure instanceof Error && failure.message.includes("changed")) router.refresh();
      savingRef.current = false;
      setSaving(false);
    }
  }

  return <form noValidate className={styles.technicianWork} aria-label="Approved technician work" aria-busy={saving} onSubmit={event => { event.preventDefault(); void create(); }}>
    <p>{work.length === 1 ? "Create the work order from the approved estimate." : `Create work orders for all ${work.length} remaining approved labor lines.`}</p>
    <ul>{work.map(line => <li key={line.key}>
      <div><strong>{line.description}</strong><small>{line.laborGuideMinutes} min{(line.partsRequired || requiredParts.includes(line.key) || Object.values(assignments).includes(line.key)) ? " · Parts required" : ""}</small></div>
      <details>
        <summary>Technician instructions</summary>
        <textarea aria-label={`Technician instructions for ${line.description}`} rows={2} maxLength={500} disabled={saving || Boolean(permissionError)} value={instructions[line.key] ?? line.plannedCorrection}
          onChange={event => setInstructions(current => ({ ...current, [line.key]: event.target.value }))} />
        {!line.partsRequired && <label><input type="checkbox" checked={requiredParts.includes(line.key)} disabled={saving || Boolean(permissionError)}
          onChange={event => setRequiredParts(current => event.target.checked ? [...current, line.key] : current.filter(key => key !== line.key))} /> Parts required before repair</label>}
      </details>
    </li>)}</ul>
    {!partsMappingError && unmatchedParts.length > 0 && <fieldset ref={partsFields}>
      <legend>Match saved parts to approved work</legend>
      {needsPartsConfirmation && <p id={partsHelpId} role={showPartsError ? "alert" : undefined}>
        {work.length === 1 ? "Confirm these saved parts belong to this work order before creating it." : "Choose the approved work that needs each saved part before creating the work orders."}
      </p>}
      {work.length === 1 ? <>
        <p>{unmatchedParts.map(part => `${part.quantity} × ${part.label}`).join(" · ")}</p>
        <label><input type="checkbox" checked={!needsPartsConfirmation} disabled={saving || Boolean(permissionError)}
          data-missing-part-match={needsPartsConfirmation ? "" : undefined} aria-invalid={showPartsError && needsPartsConfirmation || undefined}
          aria-describedby={needsPartsConfirmation ? partsHelpId : undefined} onChange={event => setAssignments(event.target.checked ? Object.fromEntries(unmatchedParts.map(part => [part.id, work[0].key])) : {})} /> Link these parts to this work order</label>
      </> : unmatchedParts.map(part => <label key={part.id} className={styles.workPartMatch}>
        <span>{part.quantity} × {part.label}</span>
        <select required disabled={saving || Boolean(permissionError)} value={assignments[part.id] ?? ""}
          data-missing-part-match={!assignments[part.id] ? "" : undefined} aria-invalid={showPartsError && !assignments[part.id] || undefined}
          aria-describedby={!assignments[part.id] ? partsHelpId : undefined} onChange={event => setAssignments(current => ({ ...current, [part.id]: event.target.value }))}>
          <option value="">Choose approved work</option>
          {work.map(line => <option key={line.key} value={line.key}>{line.description}</option>)}
        </select>
      </label>)}
    </fieldset>}
    {permissionError ? <p role="status">{permissionError}</p>
      : partsMappingError ? <><p role="status">{partsMappingError}</p><Link className={styles.primaryAction} href={partsHref}>Match parts to individual jobs</Link></>
      : <button className={styles.primaryAction} type="submit" disabled={saving}>{saving ? "Creating work…" : work.length === 1 ? "Create technician work order" : "Create technician work orders"}</button>}
    {error && <p role="alert">{error}</p>}
  </form>;
}
