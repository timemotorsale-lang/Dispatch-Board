"use client";

import { FileCheck2, LockKeyhole, RefreshCw } from "lucide-react";
import { useState } from "react";

import type { PayrollHandoffReadiness } from "@/server/time-attendance/payroll-handoff-service";

import styles from "./time-attendance-console.module.css";

type PayrollHandoffPanelProps = {
  initialReadiness: PayrollHandoffReadiness;
};

type CommandState = {
  busy: boolean;
  message: string | null;
  tone: "good" | "danger" | null;
};

export function PayrollHandoffPanel({ initialReadiness }: PayrollHandoffPanelProps) {
  const [readiness, setReadiness] = useState(initialReadiness);
  const [periodStart, setPeriodStart] = useState(initialReadiness.payPeriod.start);
  const [periodEnd, setPeriodEnd] = useState(initialReadiness.payPeriod.end);
  const [batchId, setBatchId] = useState("");
  const [reason, setReason] = useState("");
  const [state, setState] = useState<CommandState>({ busy: false, message: null, tone: null });

  async function refresh() {
    setState({ busy: true, message: null, tone: null });
    try {
      const response = await fetch(`/api/time-attendance/payroll-handoff?periodStart=${encodeURIComponent(periodStart)}&periodEnd=${encodeURIComponent(periodEnd)}`);
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(typeof payload.error === "string" ? payload.error : "Payroll readiness failed.");
      setReadiness(payload);
      setState({ busy: false, message: "Payroll readiness refreshed.", tone: "good" });
    } catch (error) {
      setState({ busy: false, message: error instanceof Error ? error.message : "Payroll readiness failed.", tone: "danger" });
    }
  }

  async function run(command: string) {
    setState({ busy: true, message: null, tone: null });
    try {
      const response = await fetch("/api/time-attendance/payroll-handoff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batchId, command, periodEnd, periodStart, reason })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(typeof payload.error === "string" ? payload.error : "Payroll command failed.");
      setState({
        busy: false,
        message: command === "EXPORT_PREVIEW"
          ? `Export preview ready: ${payload.lineCount ?? "persisted"} lines.`
          : `Payroll command recorded: ${payload.status ?? payload.checksum ?? command}.`,
        tone: "good"
      });
      if (payload.batchId) setBatchId(payload.batchId);
    } catch (error) {
      setState({ busy: false, message: error instanceof Error ? error.message : "Payroll command failed.", tone: "danger" });
    }
  }

  return (
    <article className={styles.panel}>
      <div className={styles.panelHeader}>
        <div>
          <span className={styles.sectionEyebrow}>Payroll handoff</span>
          <h2>Close the pay period with versioned proof</h2>
          <p>TA-G4 checks readiness, locks approved cards, previews export lines, records payroll response, and reproduces historical exports.</p>
        </div>
        <span className={readiness.ready ? styles.chipGood : styles.chipDanger}>
          {readiness.ready ? "Ready to lock" : `${readiness.totals.blockingItems} blockers`}
        </span>
      </div>

      <div className={styles.payrollMetrics}>
        <div><span>Cards</span><strong>{readiness.totals.cardCount}</strong></div>
        <div><span>Approved</span><strong>{readiness.totals.approvedCards}</strong></div>
        <div><span>Open sessions</span><strong>{readiness.totals.openSessions}</strong></div>
        <div><span>Time off</span><strong>{readiness.totals.pendingTimeOff}</strong></div>
      </div>

      <div className={styles.payrollControls}>
        <label>
          <span>Period start</span>
          <input disabled={state.busy} onChange={(event) => setPeriodStart(event.target.value)} type="date" value={periodStart} />
        </label>
        <label>
          <span>Period end</span>
          <input disabled={state.busy} onChange={(event) => setPeriodEnd(event.target.value)} type="date" value={periodEnd} />
        </label>
        <label>
          <span>Batch ID</span>
          <input disabled={state.busy} onChange={(event) => setBatchId(event.target.value)} placeholder="After lock/export" value={batchId} />
        </label>
        <label className={styles.correctionWide}>
          <span>Reason</span>
          <input disabled={state.busy} onChange={(event) => setReason(event.target.value)} placeholder="Required for lock, reopen, acknowledge, reject, reconcile" value={reason} />
        </label>
      </div>

      <div className={styles.payrollActions}>
        <button disabled={state.busy} onClick={() => void refresh()} type="button"><RefreshCw size={15} /> Refresh readiness</button>
        <button disabled={state.busy || !readiness.ready || reason.trim().length < 15} onClick={() => void run("LOCK")} type="button"><LockKeyhole size={15} /> Lock period</button>
        <button disabled={state.busy} onClick={() => void run("EXPORT_PREVIEW")} type="button"><FileCheck2 size={15} /> Export preview</button>
        <button disabled={state.busy || !batchId || reason.trim().length < 15} onClick={() => void run("ACKNOWLEDGE")} type="button">Acknowledge</button>
        <button disabled={state.busy || !batchId || reason.trim().length < 15} onClick={() => void run("REJECT")} type="button">Reject</button>
        <button disabled={state.busy || !batchId || reason.trim().length < 15} onClick={() => void run("RECONCILE")} type="button">Reconcile</button>
        <button disabled={state.busy || !batchId} onClick={() => void run("REPRODUCE")} type="button">Reproduce</button>
      </div>

      {readiness.items.length ? (
        <div className={styles.payrollBlockers}>
          {readiness.items.slice(0, 6).map((item) => (
            <div key={`${item.code}-${item.sourceId}`}>
              <strong>{item.code.replaceAll("_", " ")}</strong>
              <p>{item.staffName ? `${item.staffName}: ` : ""}{item.detail}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className={styles.attestationStatement}>No readiness blockers detected for this pay period.</p>
      )}

      {state.message ? (
        <p className={state.tone === "good" ? styles.captureNotice : styles.captureError}>{state.message}</p>
      ) : null}
    </article>
  );
}
