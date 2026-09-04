"use client";
import { type ManualLaborReview, manualReviewComplete } from "@/lib/estimate-review";
import styles from "./guided-estimate.module.css";

type Line = { id: string; title: string; kind: "Labor" | "Part"; quantity: number; price: number; pending: boolean; editable: boolean };
export function GuidedEstimate({ vehicle, vin, hasRO, lines, review, scope, total, busy, onReview, onEdit, onSave, onPresent }: {
  vehicle?: string; vin?: string; hasRO: boolean; lines: Line[]; review: ManualLaborReview; scope: string; total: string; busy: boolean;
  onReview: (review: ManualLaborReview) => void; onEdit: (line: Line, field: "quantity" | "price", value: number) => void; onSave: () => void; onPresent: () => void;
}) {
  const reviewed = manualReviewComplete(review, scope);
  const missingPrice = lines.some(line => line.pending);
  const ready = hasRO && lines.length > 0 && reviewed && !missingPrice;
  return <section className={styles.guide} aria-label="Guided estimate">
    <header><div><h2>Prepare your estimate</h2><p>Confirm vehicle → Build proposed work → Review and proceed</p></div><strong>Proposed total {total}</strong></header>
    <section><h3>1. Confirm vehicle</h3><p>{vehicle || "Choose a vehicle using Vehicle & draft tools above."}{vin ? ` · ${vin}` : " · VIN not provided"}</p><small>{hasRO ? "Linked to an existing repair order." : "Preliminary quote only; no repair order created."}</small></section>
    <section><h3>2. Proposed work</h3>{lines.length ? <div className={styles.tableWrap}><table><thead><tr><th>Work description</th><th>Hours / quantity</th><th>Rate / unit price</th><th>Amount</th></tr></thead><tbody>{lines.map(line => <tr key={`${line.kind}-${line.id}`}><td><strong>{line.title}</strong><small>{line.kind}{!line.editable ? " · Required by policy; manage in advanced tools" : ""}</small></td><td><input aria-label={`${line.title} ${line.kind === "Labor" ? "hours" : "quantity"}`} disabled={!line.editable || busy} type="number" min="0.01" step={line.kind === "Labor" ? "0.1" : "1"} value={line.quantity} onChange={e => { if (e.target.value && Number(e.target.value) > 0) onEdit(line, "quantity", Number(e.target.value)); }} /></td><td>{line.kind === "Part" ? <input aria-label={`${line.title} unit price`} disabled={!line.editable || busy} type="number" min="0" step="0.01" value={line.price} onChange={e => { if (e.target.value && Number(e.target.value) >= 0) onEdit(line, "price", Number(e.target.value)); }} /> : `$${line.price.toFixed(2)}`}</td><td>{line.pending ? "Price needed" : `$${(line.price * line.quantity).toFixed(2)}`}</td></tr>)}</tbody></table></div> : <p>No work added. Expand Add work / advanced tools below to choose labor or add parts.</p>}</section>
    <section><h3>3. Review what needs attention</h3><ul><li>{hasRO ? "✓ Repair order selected" : "Repair order needed before official presentation"}</li><li>{lines.length ? "✓ Proposed work added" : "Add at least one labor or part line"}</li><li>{missingPrice ? "Resolve pending part prices" : "✓ No pending part-price flags"}</li><li>{reviewed ? "✓ Manually reviewed for this vehicle and work" : review.scope ? "Work changed—repeat manual labor review" : "Manual labor review needed"}</li></ul>
      <details><summary>Manual labor review · {reviewed ? "Reviewed" : "Needs attention"}</summary><div className={styles.fields}>
        {([ ["engine", "Engine / powertrain"], ["configuration", "Configuration / relevant options"], ["source", "Labor-hour and applicability source"], ["limitations", "Limitations / assumptions (optional)"] ] as const).map(([key, label]) => <label key={key}>{label}<input disabled={busy} maxLength={2000} value={review[key]} onChange={e => onReview({ ...review, [key]: e.target.value, scope: "" })} /></label>)}
      </div><p>Document your actual reference or shop assessment. Manual review is not OEM verification. The signed-in presenter and presentation date are recorded with the official estimate.</p><button type="button" disabled={busy || !vehicle || !lines.length || !review.engine.trim() || !review.configuration.trim() || !review.source.trim()} onClick={() => onReview({ ...review, scope })}>Mark manually reviewed</button></details>
    </section>
    <footer><button type="button" disabled={busy} onClick={onSave}>Save preliminary quote</button><button type="button" disabled={busy || !ready} onClick={onPresent}>Present official estimate</button><small>A recorded repair basis and permissions are still checked by the server. Presentation is not authorization to repair.</small></footer>
  </section>;
}
