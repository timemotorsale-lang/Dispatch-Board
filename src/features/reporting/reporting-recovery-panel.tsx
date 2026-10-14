"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";
import styles from "./reporting-console.module.css";

export function ReportingRecoveryPanel({ id, version, title, onRecovered }: { id: string; version: number; title: string; onRecovered: () => void }) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function recover() {
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/reports", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "recover-job", id, expectedVersion: version, reason }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Delivery recovery could not complete.");
      onRecovered();
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Delivery recovery could not complete."); }
    finally { setBusy(false); }
  }
  return <details><summary>{title} · Delivery stopped</summary>
    <form onSubmit={event => { event.preventDefault(); void recover(); }}>
      <label htmlFor={`recovery-${id}`}>Recovery reason</label>
      <textarea id={`recovery-${id}`} value={reason} maxLength={500} disabled={busy} onChange={event => setReason(event.target.value)} />
      {error ? <p className={styles.error} role="alert">{error}</p> : null}
      <button className={styles.primary} type="submit" disabled={busy || reason.trim().length < 20}><RefreshCw size={17} />{busy ? "Approving..." : "Approve retry"}</button>
    </form>
  </details>;
}
