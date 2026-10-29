"use client";

import { useState } from "react";
import Link from "next/link";
import { closingChecks, closingPathways, closingStateLabels, closingReviewStates, isClosingPathway, suggestedClosingPathway, type ClosingPathway } from "@/lib/deal-closing";
import type { SalesDocumentJacketView } from "@/server/sales-documents/service";
import styles from "./sales-documents-workspace.module.css";

export function ClosingReviewPanel({ jacket, canReview, busy, onSave }: { jacket: SalesDocumentJacketView; canReview: boolean; busy: boolean; onSave: (body: Record<string, unknown>) => Promise<void> }) {
  const saved = jacket.closingReview;
  const [pathway, setPathway] = useState<ClosingPathway>(saved?.pathway ?? suggestedClosingPathway(jacket.pathway) ?? "cash");
  const [editing, setEditing] = useState(false);
  const current = closingPathways.find(item => item.id === pathway)!;
  const stale = jacket.closingReadiness.stale;
  const reuse = !stale && saved?.pathway === pathway;

  if (!suggestedClosingPathway(jacket.pathway)) return null;

  return <details className={styles.closingPanel}>
    <summary>Paperwork & delivery preparation · {jacket.closingReadiness.label}</summary>
    <p>This is an internal preparation review, not legal approval, an electronic signature, proof of funding or permission to release a vehicle. Finalizing a document packet does not complete these independent checks.</p>
    <p><Link href="/website-console?section=paperwork">Open the implementation and setup guide</Link></p>
    {saved ? <p>Last saved by {saved.savedByName || "authorized document staff"} · {new Date(saved.savedAt).toLocaleString()} · jacket revision {saved.jacketRevision}. {jacket.closingReadiness.resolved}/{jacket.closingReadiness.total} preparation items resolved for the current revision.</p> : <p>No preparation review saved. A suggested pathway is not a legal classification.</p>}
    {stale ? <p role="status" className={styles.error}>The jacket changed after this review. Prior evidence remains in history; re-review every item before relying on it.</p> : null}
    {!editing ? <>
      {saved ? <><h3>{closingPathways.find(item => item.id === saved.pathway)?.label}</h3><p>{saved.classificationNote}</p><ul className={styles.checklist}>{closingChecks(saved.pathway).map(check => {
        const review = saved.checks.find(item => item.id === check.id);
        return <li key={check.id}><div><strong>{check.label}</strong><small>{stale ? "Re-review required" : closingStateLabels[review?.state ?? "PENDING"]}</small><p>{review?.evidence || "No evidence recorded."}</p></div></li>;
      })}</ul></> : null}
      {canReview ? <button type="button" disabled={busy} onClick={() => setEditing(true)}>{saved ? "Re-review preparation" : "Start preparation review"}</button> : <p>An authorized document manager must save this review. Existing document access does not grant release authority.</p>}
    </> : <form className={styles.form} onSubmit={event => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      void onSave({ action: "CLOSING_REVIEW", pathway, classificationNote: form.get("classificationNote"), checks: closingChecks(pathway).map(check => ({ id: check.id, state: form.get(`state-${check.id}`), evidence: form.get(`evidence-${check.id}`) })) });
    }}>
      <label>Proposed paperwork pathway<select value={pathway} disabled={busy} onChange={event => { if (isClosingPathway(event.target.value)) setPathway(event.target.value); }}>{closingPathways.map(item => <option key={item.id} value={item.id}>{item.code} · {item.label}</option>)}</select></label>
      <p>{current.detail} <strong>{current.decision}</strong> This does not change the original Deal Desk pathway or generate a different contract.</p>
      <label key={`classification-${pathway}`}>Classification facts and review references (15–1000 characters)<textarea name="classificationNote" required minLength={15} maxLength={1000} defaultValue={saved?.pathway === pathway ? saved.classificationNote : ""} /></label>
      <p>Reference controlled records only. Do not enter account numbers, identity documents, passwords or customer credit details. Saving attests your review of each selected state for this revision.</p>
      <div key={`${pathway}-${reuse}`} className={styles.closingChecks}>{closingChecks(pathway).map(check => {
        const review = reuse ? saved?.checks.find(item => item.id === check.id) : undefined;
        return <fieldset key={check.id}><legend>{check.label}</legend><p>{check.detail}</p><small>Accountable role: {check.owner}</small><label>Preparation state<select name={`state-${check.id}`} defaultValue={review?.state ?? "PENDING"}>{closingReviewStates.filter(state => state !== "NOT_APPLICABLE" || check.canExclude).map(state => <option key={state} value={state}>{closingStateLabels[state]}</option>)}</select></label><label>Evidence reference or follow-up reason (up to 1000 characters)<textarea name={`evidence-${check.id}`} maxLength={1000} defaultValue={review?.evidence ?? ""} /></label></fieldset>;
      })}</div>
      <div className={styles.actions}><button disabled={busy} type="submit">Save internal preparation review</button><button disabled={busy} type="button" onClick={() => setEditing(false)}>Cancel editing</button></div>
    </form>}
    <p><strong>Live completion blocked:</strong> Customer authorization, approved forms and signing acceptance, provider verification and an independent release workflow are still required. This review never activates them.</p>
  </details>;
}
