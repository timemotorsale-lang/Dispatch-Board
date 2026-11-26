"use client";

import { useState } from "react";
import { calculateReconCeiling, formatMoneyCents, parseReconPlanningAmount } from "@/lib/recon-budget";
import styles from "./service-close-parts-workspace.module.css";

const fields = [
  ["retail", "Expected selling price", "Use a realistic market price."],
  ["landed", "Landed cost before recon", "Purchase price plus auction fees, transport and any other non-recon costs you charge to this unit."],
  ["gross", "Target front-end gross", "Enter the store’s target for this vehicle."],
  ["reserve", "Contingency to hold back", "Enter 0 only if you do not want to hold back a reserve."],
] as const;

export function ReconBudgetCalculator({ expectedRetailCents }: { expectedRetailCents?: number | null }) {
  const [inputs, setInputs] = useState({
    retail: expectedRetailCents == null ? "" : (expectedRetailCents / 100).toFixed(2),
    landed: "", gross: "", reserve: "",
  });
  const result = calculateReconCeiling({
    retail: parseReconPlanningAmount(inputs.retail), landed: parseReconPlanningAmount(inputs.landed),
    gross: parseReconPlanningAmount(inputs.gross), reserve: parseReconPlanningAmount(inputs.reserve),
  });

  return <details className={styles.budgetCalculator}>
    <summary>Estimate an affordable recon budget</summary>
    <p>Expected selling price − landed cost − target gross − contingency.</p>
    <div className={styles.budgetInputs}>
      {fields.map(([key, label, help]) => <label key={key}>{label} ($)
        <input type="text" inputMode="decimal" value={inputs[key]} onChange={event => setInputs(current => ({ ...current, [key]: event.target.value }))} />
        <small>{help}</small>
      </label>)}
    </div>
    <p role="status">{result ? <>
      <strong>Planning ceiling {formatMoneyCents(result.ceilingCents)}</strong>
      {result.shortfallCents > 0 && <> · {formatMoneyCents(result.shortfallCents)} below target before recon. Review the deal with a manager.</>}
    </> : "Enter all four amounts in dollars to calculate a ceiling."}</p>
    <small>Compare with the inspection estimate for parts, labor and outside work. This calculation does not save or authorize spending.</small>
  </details>;
}
