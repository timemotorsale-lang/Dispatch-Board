"use client";
import { useEffect, useRef, useState, type Ref } from "react";
import { type ManualLaborReview, manualReviewComplete } from "@/lib/estimate-review";
import styles from "./guided-estimate.module.css";

function PartFields({ line, busy, simplified, onPartChange, onItemize }: { line: Line; busy: boolean; simplified: boolean; onPartChange?: (line: Line, field: "name" | "number", value: string) => void; onItemize?: (line: Line) => void }) {
  if (simplified && line.kind === "Part" && !line.allowance && onPartChange) return <div className={styles.partFields}><label>Description<input aria-label={`${line.title} description`} disabled={busy} maxLength={200} value={line.title} onChange={event => onPartChange(line, "name", event.target.value)} /></label><label>Part number<input aria-label={`${line.title} part number`} disabled={busy} maxLength={100} value={line.number ?? ""} onChange={event => onPartChange(line, "number", event.target.value)} /></label></div>;
  return <><strong>{line.title}</strong><small>{line.kind}{!line.editable ? " · Required by policy" : ""}</small>{line.allowance && onItemize ? <button type="button" disabled={busy} data-estimate-prerequisite="allowance" onClick={() => onItemize(line)}>Itemize parts</button> : line.kind === "Part" && onPartChange && <details open={line.pending || undefined}><summary>Part details{line.number ? ` · ${line.number}` : " · number needed"}</summary><label>Description<input aria-label={`${line.title} description`} disabled={busy} maxLength={200} value={line.title} onChange={event => onPartChange(line, "name", event.target.value)} /></label><label>Part number<input aria-label={`${line.title} part number`} disabled={busy} maxLength={100} value={line.number ?? ""} onChange={event => onPartChange(line, "number", event.target.value)} /></label></details>}</>;
}

type Line = { id: string; title: string; kind: "Labor" | "Part"; quantity: number; price: number; pending: boolean; editable: boolean; number?: string; removable?: boolean; allowance?: boolean };
export function GuidedEstimate({ feedback, feedbackRef, saveNotice, savingDraft = false, presenting = false, preliminaryHref, onPreview, openingPreview = false, reviewLaborRequested, simplified = false, vehicle, vin, hasRO, lines, review, scope, total, summary, busy, checksReady, onReviewChecks, onReview, onEdit, onPartChange, onRemove, onAddPart, onItemizePart, onSave, onPresent, onAddWork, onFindVehicle }: {
  feedback?: string;
  feedbackRef?: Ref<HTMLParagraphElement>;
  saveNotice?: string;
  savingDraft?: boolean;
  presenting?: boolean;
  preliminaryHref?: string;
  onPreview?: () => void;
  openingPreview?: boolean;
  reviewLaborRequested?: number;
  onAddPart?: () => void;
  onItemizePart?: (line: Line) => void;
  simplified?: boolean;
  vehicle?: string; vin?: string; hasRO: boolean; lines: Line[]; review: ManualLaborReview; scope: string; total: string; summary?: { label: string; value: string }[]; busy: boolean; checksReady?: boolean;
  onReview: (review: ManualLaborReview) => void; onEdit: (line: Line, field: "quantity" | "price", value: number) => void; onPartChange?: (line: Line, field: "name" | "number", value: string) => void; onRemove?: (line: Line) => void; onSave: () => void; onPresent: () => void; onAddWork?: () => void; onFindVehicle?: () => void; onReviewChecks?: () => void;
}) {
  const [sourceOpen, setSourceOpen] = useState(false);
  const sourceRef = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    if (!reviewLaborRequested) return;
    const panel = sourceRef.current;
    if (!panel) return;
    panel.open = true;
    const target = [...panel.querySelectorAll("input")].slice(0, 3).find(input => !input.value.trim()) ?? panel.querySelector("button");
    target?.scrollIntoView({ block: "center" });
    target?.focus({ preventScroll: true });
  }, [reviewLaborRequested]);
  const reviewed = manualReviewComplete(review, scope);
  const missingPrice = lines.some(line => line.pending);
  const ready = hasRO && lines.length > 0 && (simplified || reviewed) && !missingPrice && checksReady === true;
  return <section className={styles.guide} aria-label="Guided estimate">
    <header><div><h2>Estimate worksheet</h2><p>Edit the work below, then generate the customer estimate.</p></div>{onAddPart && <button type="button" disabled={busy} onClick={onAddPart}>Add part</button>}{onAddWork && <button type="button" disabled={busy} onClick={onAddWork}>Add work / parts</button>}</header>
    {!hasRO && <section className={styles.step}><p>{vehicle || "Select the customer vehicle and RO."}{vin ? ` · ${vin}` : ""}</p>{onFindVehicle && <button type="button" disabled={busy} onClick={onFindVehicle}>Find an open repair order</button>}</section>}
    {lines.length ? <div className={styles.tableWrap}><table><thead><tr><th>Work / part</th><th>Hours / qty</th><th>Rate / price</th><th>Amount</th><th>Actions</th></tr></thead><tbody>{lines.map(line => <tr key={`${line.kind}-${line.id}`}><td><PartFields line={line} busy={busy} simplified={simplified} onPartChange={onPartChange} onItemize={onItemizePart} /></td><td data-label={line.kind === "Labor" ? "Hours" : "Quantity"}><input aria-label={`${line.title} ${line.kind === "Labor" ? "hours" : "quantity"}`} disabled={!line.editable || busy} type="number" min={line.kind === "Labor" ? "0" : "1"} step={line.kind === "Labor" ? "0.1" : "1"} value={line.quantity} onChange={event => { if (event.target.value && Number(event.target.value) >= (line.kind === "Labor" ? 0 : 1)) onEdit(line, "quantity", Number(event.target.value)); }} /></td><td data-label={line.kind === "Part" ? "Unit price" : "Labor rate"}>{line.kind === "Part" ? <input aria-label={`${line.title} unit price`} data-estimate-prerequisite={line.pending && !line.allowance ? "price" : undefined} disabled={!line.editable || busy} type="number" min="0" step="0.01" value={line.price} onChange={event => { if (event.target.value && Number(event.target.value) >= 0) onEdit(line, "price", Number(event.target.value)); }} /> : `$${line.price.toFixed(2)}`}</td><td data-label="Amount">{line.pending ? <small>Confirm part details and price</small> : `$${(line.price * line.quantity).toFixed(2)}`}</td><td>{line.removable && onRemove && <button type="button" disabled={busy} aria-label={`Remove ${line.title}`} onClick={() => onRemove(line)}>Remove</button>}</td></tr>)}</tbody></table></div> : <p>No work selected. Choose Add work / parts to begin.</p>}
    <dl className={styles.totals}>{summary?.map(item => <div key={item.label}><dt>{item.label}</dt><dd>{item.value}</dd></div>)}<div><dt>Estimate total</dt><dd><strong>{total}</strong></dd></div></dl>
    {!simplified && <details ref={sourceRef} open={sourceOpen} onToggle={event => setSourceOpen(event.currentTarget.open)}><summary>Labor basis · {reviewed ? "Reviewed" : "Review needed"}</summary><div className={styles.fields}>
      {([["engine", "Engine / powertrain"], ["configuration", "Configuration / relevant options"], ["source", "Labor-hour and applicability source"], ["limitations", "Limitations / assumptions (optional)"]] as const).map(([key, label]) => <label key={key}>{label}<input disabled={busy} maxLength={2000} value={review[key]} onChange={event => onReview({ ...review, [key]: event.target.value, scope: "" })} /></label>)}
    </div><p>Use the actual vehicle reference or shop assessment; planning hours are not verified OEM times.</p><button type="button" disabled={busy || !vehicle || !lines.length || !review.engine.trim() || !review.configuration.trim() || !review.source.trim()} onClick={() => onReview({ ...review, scope })}>Mark manually reviewed</button></details>}
    <footer><button type="button" disabled={busy} onClick={onSave}>{savingDraft ? "Saving draft…" : "Save draft"}</button>{onPreview ? <button className={styles.previewAction} type="button" disabled={busy || openingPreview} onClick={onPreview}>{openingPreview ? "Saving quote for preview…" : "Preview / Print Preliminary Quote"}</button> : preliminaryHref && <a href={preliminaryHref} target="_blank" rel="noopener noreferrer">Preview / Print Preliminary Quote</a>}{!simplified && onReviewChecks && <button type="button" disabled={busy} onClick={onReviewChecks}>{checksReady ? "View reviewed checks" : "Review pricing, fitment & safety"}</button>}<button type="button" disabled={busy} data-ready={ready} onClick={!hasRO && onFindVehicle ? onFindVehicle : onPresent}>{!hasRO && onFindVehicle ? "Link repair order" : presenting ? "Generating estimate…" : "Generate / Print Estimate"}</button>{simplified ? (!hasRO || missingPrice) && <small>{!hasRO ? "Link an open repair order to issue the estimate." : "Enter missing prices."}</small> : <small>{ready ? "Ready to issue. Customer authorization is recorded separately." : !hasRO ? "Link an open repair order to issue the estimate." : missingPrice ? "Complete the highlighted part details and prices." : !reviewed ? "Review the labor basis for this vehicle and work." : "Complete pricing, fitment and safety checks before issue."}</small>}</footer>
    {feedback ? <p ref={feedbackRef} role="alert" tabIndex={-1}>{feedback}</p> : saveNotice && <p ref={feedbackRef} role="status" tabIndex={-1}>{saveNotice}</p>}
    {presenting && <p role="status">Saving retry details and issuing the estimate…</p>}
  </section>;
}
