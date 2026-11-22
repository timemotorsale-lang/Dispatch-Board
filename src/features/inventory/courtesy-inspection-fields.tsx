"use client";

import { frontlineQcSections, type CourtesyFinding, type FrontlineResult } from "@/lib/courtesy-vehicle-check";
import styles from "./courtesy-vehicle-check.module.css";

export type InspectionRow = Omit<CourtesyFinding, "followUp">;
export const courtesyResultLabels: Record<FrontlineResult, string> = { PASS: "Pass", REVIEW: "Review", FAIL: "Fail" };

export function CourtesyInspectionFields({ rows, busy, compact = false, onUpdate, onClear }: {
  rows: Partial<Record<string, InspectionRow>>;
  busy: boolean;
  compact?: boolean;
  onUpdate: (code: string, change: Partial<InspectionRow>) => void;
  onClear: (code: string) => void;
}) {
  return <>
    {frontlineQcSections.map(section => <details open={!compact} key={section.title}>
      <summary>{section.title}</summary>
      {section.items.map(item => {
        const row = rows[item.code];
        return <fieldset className={styles.item} key={item.code}>
          <legend>{item.label}</legend>
          <small>{item.hint}</small>
          <div className={styles.choices}>
            {(["PASS", "REVIEW", "FAIL"] as const).map(result => <button key={result} className={styles[result]} type="button" disabled={busy}
              aria-pressed={row?.result === result} onClick={() => onUpdate(item.code, { result })}>{courtesyResultLabels[result]}</button>)}
            {row ? <button type="button" disabled={busy} onClick={() => onClear(item.code)}>Clear result</button> : <small>Not inspected</small>}
          </div>
          {row && row.result !== "PASS" && <div className={styles.notes}>
            <label>Finding and next step<input required disabled={busy} maxLength={700} value={row.note} onChange={event => onUpdate(item.code, { note: event.target.value })} /></label>
            <label>Measurement or photo reference <small>(optional)</small><input disabled={busy} maxLength={500} value={row.evidence} onChange={event => onUpdate(item.code, { evidence: event.target.value })} /></label>
          </div>}
        </fieldset>;
      })}
    </details>)}
  </>;
}
