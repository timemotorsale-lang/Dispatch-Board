import type { PayrollBatchHistoryEntry } from "@/server/time-attendance/payroll-batch-history";

import styles from "./time-attendance-console.module.css";

const statusLabels: Record<PayrollBatchHistoryEntry["status"], string> = {
  DRAFT: "Draft",
  LOCKED: "Locked",
  EXPORTED: "Exported",
  ACKNOWLEDGED: "Acknowledgment recorded",
  REJECTED: "Rejection recorded",
  RECONCILED: "Reconciliation recorded",
  VOID: "Voided"
};

const decisionLabels = {
  ACKNOWLEDGE: "Acknowledgment recorded",
  REJECT: "Rejection recorded",
  RECONCILE: "Reconciliation recorded"
};

const earningLabels = {
  REGULAR: "Regular",
  OVERTIME: "Overtime",
  ESST: "ESST",
  PTO: "PTO",
  UNPAID: "Unpaid",
  HOLIDAY: "Holiday"
};

const periodDate = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: "UTC" });
const recordedTime = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "America/Chicago"
});
const number = new Intl.NumberFormat("en-US");

function BatchTime({ value }: { value: string }) {
  return <time dateTime={value}>{recordedTime.format(new Date(value))} CT</time>;
}

export function PayrollBatchHistoryPanel({ batches }: { batches: readonly PayrollBatchHistoryEntry[] }) {
  return (
    <section className={styles.panel} aria-labelledby="payroll-batch-history-heading">
      <div className={styles.panelHeader}>
        <div>
          <h2 id="payroll-batch-history-heading">Recent payroll handoffs</h2>
          <p>Newest batches first. Statuses show actions recorded in Dispatch Board.</p>
        </div>
      </div>
      {batches.length === 0 ? <p>No payroll handoff batches on record.</p> : (
        <ul className={styles.timeOffHistory}>
          {batches.map((batch) => {
            const totals = Object.entries(batch.controlTotals) as [keyof typeof earningLabels, number][];
            const lastDecision = batch.decision?.outcome === "ACKNOWLEDGE" && batch.acknowledgedAt ? null : batch.decision;
            return (
              <li className={styles.timeOffHistoryRow} key={batch.id}>
                <h3>{batch.batchNumber} <span className={styles.chipNeutral}>{statusLabels[batch.status]}</span></h3>
                <p>Pay period {periodDate.format(new Date(batch.periodStart))} to {periodDate.format(new Date(batch.periodEnd))}</p>
                <dl className={styles.auditFacts}>
                  <div><dt>Created</dt><dd><BatchTime value={batch.createdAt} /></dd></div>
                  {batch.exportedAt && <div><dt>File created</dt><dd><BatchTime value={batch.exportedAt} /></dd></div>}
                  {batch.acknowledgedAt && <div><dt>Acknowledgment recorded</dt><dd><BatchTime value={batch.acknowledgedAt} /></dd></div>}
                  {lastDecision && <div><dt>Last recorded decision</dt><dd>{decisionLabels[lastDecision.outcome]}{lastDecision.recordedAt && <> · <BatchTime value={lastDecision.recordedAt} /></>}</dd></div>}
                  {batch.reopenedAt && <div><dt>Period reopened</dt><dd><BatchTime value={batch.reopenedAt} /></dd></div>}
                  {batch.lineCount !== null && <div><dt>Stored line count</dt><dd>{number.format(batch.lineCount)}</dd></div>}
                  {totals.map(([code, minutes]) => (
                    <div key={code}><dt>{earningLabels[code]}</dt><dd>{number.format(minutes)} min</dd></div>
                  ))}
                </dl>
                <div className={styles.cardExecutionRow}>
                <a className={styles.ghostAction} href={`/time-attendance?${new URLSearchParams({ view: "payroll", batch: batch.id })}#payroll-handoff`}>
                  Open batch controls
                </a>
                {batch.hasDownload && (
                  <a className={styles.ghostAction} href={`/api/time-attendance/payroll-handoff?${new URLSearchParams({ download: "1", batchId: batch.id })}`} aria-label={`Download handoff CSV for batch ${batch.id}`}>
                    Download handoff CSV
                  </a>
                )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
