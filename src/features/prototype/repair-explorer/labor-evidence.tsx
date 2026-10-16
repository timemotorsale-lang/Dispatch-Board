"use client";

import { useState, type FormEvent } from "react";

import type { RepairOperation } from "./catalog";
import { LABOR_REFERENCE_EXAMPLES } from "./labor-guide";
import { configurationKey, observationKey, observationSummary, parseObservations, validObservation, type LaborObservation } from "./labor-observations";
import styles from "./repair-explorer.module.css";

export function LaborEvidence({ repair, groupId, storageKey, onUseReportedHours }: {
  repair: RepairOperation;
  groupId: string;
  storageKey: string;
  onUseReportedHours: (hours: number, configuration: string, count: number) => void;
}) {
  const [records, setRecords] = useState<LaborObservation[]>([]);
  const [configuration, setConfiguration] = useState("");
  const [message, setMessage] = useState("No recorded jobs loaded. Planning hours are not measured technician time.");
  const plan = repair.laborPlan;
  const summary = observationSummary(records, repair.id, configuration);
  const key = `${storageKey}.technician-reports.v1`;

  function loadReports() {
    try {
      const raw = window.localStorage.getItem(key);
      const loaded = raw ? parseObservations(raw) : [];
      if (!loaded) { setMessage("Saved reports could not be validated. No records were changed."); return; }
      setRecords(loaded);
      setMessage(`${loaded.filter((record) => record.operationId === repair.id).length} reports loaded for this operation. Enter an exact vehicle configuration to view its summary.`);
    } catch { setMessage("Browser storage is unavailable."); }
  }

  function recordJob(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const record = {
      operationId: repair.id,
      configuration: configuration.trim(),
      jobReference: String(data.get("jobReference") ?? "").trim(),
      completedOn: String(data.get("completedOn") ?? ""),
      hours: Number(data.get("actualHours")),
      source: "TECHNICIAN_REPORTED" as const,
      scopeConfirmed: data.get("scopeConfirmed") === "on"
    };
    if (!validObservation(record)) { setMessage("Enter a completed date, job reference, configuration and positive hands-on hours; confirm the work scope."); return; }
    try {
      const raw = window.localStorage.getItem(key);
      const existing = raw ? parseObservations(raw) : [];
      if (!existing) { setMessage("Saved reports could not be validated. They were kept unchanged."); return; }
      if (existing.length >= 1000) { setMessage("This browser preview supports 1,000 reports. Export or migrate records before adding more."); return; }
      if (existing.some((item) => observationKey(item) === observationKey(record))) { setMessage("This job is already recorded for this operation and configuration. Duplicate reports are not added."); return; }
      const next = [...existing, record];
      window.localStorage.setItem(key, JSON.stringify({ version: 1, records: next }));
      setRecords(next);
      setMessage("Technician-reported time saved in this browser. It has not been independently verified or published as a shop standard.");
      form.reset();
    } catch { setMessage("Browser storage is unavailable. This report was not saved."); }
  }

  function exportReports() {
    try {
      const raw = window.localStorage.getItem(key);
      const saved = raw ? parseObservations(raw) : [];
      if (!saved) { setMessage("Saved reports could not be validated; export stopped."); return; }
      const url = URL.createObjectURL(new Blob([JSON.stringify({ version: 1, records: saved }, null, 2)], { type: "application/json" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = "repair-explorer-technician-reports.json";
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setMessage("Reported job times exported. Keep a copy before clearing browser data.");
    } catch { setMessage("Reported times could not be exported from this browser."); }
  }

  return <details className={styles.laborEvidence}>
    <summary>Labor time: basis, range & completed-job records</summary>
    {plan && <div className={styles.evidenceBody}>
      <h3>{plan.hours.toFixed(1)} hrs · provisional planning allowance</h3>
      <p>Planning range {plan.low.toFixed(1)}–{plan.high.toFixed(1)} hrs. {plan.basis === "DEMO_SEED" ? "Initial planning allowance." : "AI-authored work-breakdown estimate."} No measured jobs support this value yet. Range is a scenario allowance, not a statistical confidence interval.</p>
      <dl className={styles.stageList}>{plan.stages.map((stage) => <div key={stage.label}><dt>{stage.label}</dt><dd>{Math.round(stage.hours * 60)} min</dd></div>)}</dl>
      <p>{plan.scope} Access, engine, drivetrain, equipment, corrosion and shared labor can change the time. Parts waiting, outside machining and unattended processes are excluded.</p>
      {LABOR_REFERENCE_EXAMPLES.filter((reference) => reference.groupId === groupId).map((reference) => <div className={styles.reference} key={reference.id}><a href={reference.url} target="_blank" rel="noreferrer">{reference.label}</a><strong>{reference.hours}</strong><p>{reference.scope}</p><p>Reference only. It is not automatically applied to this operation or included in the planning calculation.</p></div>)}
      <details className={styles.jobRecords}>
        <summary>Record a completed job</summary>
        <p>Preview storage is local to this browser. Enter only real completed work. Reports are separate from estimate hours and are not automatically adopted.</p>
        <form onSubmit={recordJob}>
          <label>Vehicle configuration<input name="configuration" value={configuration} onChange={(event) => setConfiguration(event.target.value)} required maxLength={200} placeholder="Year, make, model, engine, drivetrain, body/access variant" /></label>
          <div className={styles.lineFields}><label>Job reference<input name="jobReference" required maxLength={100} placeholder="RO or time-study reference" /></label><label>Completed date<input name="completedOn" type="date" required /></label></div>
          <label>Reported hands-on technician hours<input name="actualHours" type="number" min="0.01" max="100" step="0.01" required placeholder="Sum of active hours across technicians" /></label>
          <label className={styles.checkboxLabel}><input name="scopeConfirmed" type="checkbox" required />This is the same completed operation and position; waiting and unrelated work are excluded.</label>
          <button type="submit" className={styles.secondary}>Save completed-job report</button>
          <button type="button" className={styles.secondary} onClick={loadReports}>Load reported times</button>
          <button type="button" className={styles.secondary} onClick={exportReports}>Export reported times</button>
        </form>
        <p className={styles.observationSummary} data-testid="reported-time-summary">{summary.count} distinct jobs for this exact configuration{summary.median === null ? "." : ` · median ${summary.median.toFixed(2)} hrs · observed range ${summary.minimum!.toFixed(2)}–${summary.maximum!.toFixed(2)} hrs.`}</p>
        <p>Three reports enable a manual comparison in this preview; that threshold does not establish a validated labor standard. Review job scope, outliers and vehicle configuration first. Use the median only if this configuration matches the estimate vehicle.</p>
        <button type="button" className={styles.secondary} disabled={summary.count < 3 || summary.median === null || !configurationKey(configuration)} onClick={() => { if (summary.median !== null) onUseReportedHours(summary.median, configuration.trim(), summary.count); }}>Use reported median for this estimate</button>
        <p role="status" className={styles.reportStatus}>{message}</p>
      </details>
    </div>}
  </details>;
}
