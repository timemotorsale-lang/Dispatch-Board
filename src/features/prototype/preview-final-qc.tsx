"use client";

import { useState } from "react";
import { CourtesyInspectionFields, type InspectionRow } from "@/features/inventory/courtesy-inspection-fields";
import { FinalRepairQcChecklist } from "@/features/inventory/final-repair-qc-checklist";
import { frontlineQcItems, isCourtesySafetyFlag } from "@/lib/courtesy-vehicle-check";
import { readFinalRepairQcRecommendation, type FinalRepairQcRecommendation } from "@/lib/final-repair-qc";
import courtesyStyles from "@/features/inventory/courtesy-vehicle-check.module.css";
import styles from "./inventory-lifecycle-prototype.module.css";
import { LifecycleToolDetails, LifecycleToolLink } from "./lifecycle-step";

export type PreviewRepairQcResult =
  | { outcome: "PASSED"; recommendation: FinalRepairQcRecommendation | null }
  | { outcome: "RETURNED"; correction: string };

export function PreviewFinalQc({ roadTestNeeded, result, onResult, onOpenShop }: {
  roadTestNeeded: boolean;
  result: PreviewRepairQcResult | null;
  onResult: (result: PreviewRepairQcResult | null) => void;
  onOpenShop: () => void;
}) {
  const [rows, setRows] = useState<Partial<Record<string, InspectionRow>>>({});
  const [savedRows, setSavedRows] = useState<Partial<Record<string, InspectionRow>> | null>(null);
  const inspected = Object.values(rows).filter((row): row is InspectionRow => Boolean(row));
  const [fullCheckError, setFullCheckError] = useState("");
  const fullCheckSaved = savedRows === rows;

  return <>
    <section className={styles.previewQc} aria-label="Repair QC checklist">
      <h3>Repair QC checklist</h3>
      <p className={styles.previewStatus}>Practice the standard checks here. Live QC shows each job’s evidence, procedure checks, and verifier requirements.</p>
      {result ? <>
        <div role="status" className={result.outcome === "RETURNED" ? courtesyStyles.urgent : styles.previewQcPassed}>
          {result.outcome === "RETURNED" ? <>
            <strong>Returned to shop in preview</strong>
            <p>{result.correction}</p>
          </> : <>
            <strong>{result.recommendation ? "Passed with recommendation" : "Repair QC passed"}</strong>
            {result.recommendation && <p>{result.recommendation.finding} · {result.recommendation.note}</p>}
          </>}
        </div>
        <div className={styles.previewQcActions}>
          {result.outcome === "RETURNED" && <button className="button button-primary" type="button" onClick={onOpenShop}>Open Recon &amp; Repair</button>}
          <button className="button button-secondary" type="button" onClick={() => onResult(null)}>Recheck repair</button>
        </div>
      </> : <FinalRepairQcChecklist
        allowRecommendation
        evidence={["Simulated repair completion"]}
        roadTestNeeded={roadTestNeeded}
        peerRequired={false}
        peers={[]}
        procedureRules={undefined}
        busy={false}
        onSave={async (payload) => {
          onResult(typeof payload.reworkInstructions === "string"
            ? { outcome: "RETURNED", correction: payload.reworkInstructions }
            : { outcome: "PASSED", recommendation: readFinalRepairQcRecommendation({ disposition: "PASSED", templateSnapshot: payload }) });
          return true;
        }}
      />}
    </section>

    <LifecycleToolDetails label="Full vehicle QC checklist · Optional">
      <form className={courtesyStyles.sections} noValidate onChange={() => setFullCheckError("")} onSubmit={(event) => {
        event.preventDefault();
        const missingNote = frontlineQcItems.find(item => {
          const row = rows[item.code];
          return row && row.result !== "PASS" && !row.note.trim();
        });
        if (missingNote) {
          setFullCheckError("Add a finding and next step for " + missingNote.label + ".");
          return;
        }
        setFullCheckError("");
        setSavedRows(rows);
      }}>
        <p className={styles.previewStatus}>Record only the items you checked. Repair QC controls the handoff.</p>
        <p className={styles.previewStatus}>{inspected.length}/{frontlineQcItems.length} inspected</p>
        <CourtesyInspectionFields
          rows={rows}
          busy={false}
          compact
          onUpdate={(code, change) => setRows(current => ({ ...current, [code]: {
            code, result: current[code]?.result ?? "PASS", note: current[code]?.note ?? "", evidence: current[code]?.evidence ?? "", ...change,
          } }))}
          onClear={(code) => {
            setFullCheckError("");
            setRows(current => {
              const next = { ...current };
              delete next[code];
              return next;
            });
          }}
        />
        {inspected.some(isCourtesySafetyFlag) && <p className={courtesyStyles.urgent}>Flag urgent safety findings for the advisor and follow the shop’s safety policy.</p>}
        {fullCheckError && <p role="alert">{fullCheckError}</p>}
        {fullCheckSaved && <p role="status">Full vehicle check saved in this preview.</p>}
        <div className={styles.previewQcActions}>
          <button className="button button-secondary" disabled={!inspected.length || fullCheckSaved} type="submit">Save full vehicle check</button>
        </div>
      </form>
    </LifecycleToolDetails>

    <LifecycleToolDetails label="Stage tools">
      <LifecycleToolLink className="button button-secondary" href="/vehicles/quality-control" forRepairOrder>Open live QC workspace</LifecycleToolLink>
    </LifecycleToolDetails>
  </>;
}
