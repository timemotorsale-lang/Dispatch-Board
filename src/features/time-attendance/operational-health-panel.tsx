"use client";

import { Activity, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import styles from "./time-attendance-console.module.css";

type Health = {
  generatedAt: string;
  source: string;
  state: string;
  metrics: { label: string; count: number; tone: "good" | "warning" | "danger" }[];
};

export function OperationalHealthPanel() {
  const [health, setHealth] = useState<Health | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function refresh() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/time-attendance/monitoring", { cache: "no-store" });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(typeof body.error === "string" ? body.error : "Monitoring is unavailable.");
      setHealth(body);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Monitoring is unavailable.");
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    const timer = window.setTimeout(() => { void refresh(); }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  async function scan() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/time-attendance/monitoring", { method: "POST" });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(typeof body.error === "string" ? body.error : "Notification scan failed.");
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Notification scan failed.");
      setBusy(false);
    }
  }
  return <article className={styles.panel}>
    <div className={styles.panelHeader}><div><span className={styles.sectionEyebrow}>Operational monitoring</span><h2>Control health</h2><p>{health?.source ?? "Loading live control sources…"}</p></div><div className={styles.payrollActions}><button className={styles.captureRefresh} disabled={busy} onClick={() => void refresh()} type="button"><RefreshCw size={15} />Refresh</button><button disabled={busy} onClick={() => void scan()} type="button">Scan internal alerts</button></div></div>
    {health ? <><span className={health.state === "HEALTHY" ? styles.chipGood : health.state === "REVIEW" ? styles.chipWarning : styles.chipDanger}><Activity size={14} />{health.state.replaceAll("_", " ")}</span><div className={styles.managerReviewMetrics}>{health.metrics.map((metric) => <div key={metric.label}><span>{metric.label}</span><strong>{metric.count}</strong></div>)}</div><p className={styles.mvpNote}>Fresh as of {new Date(health.generatedAt).toLocaleString()}.</p></> : null}
    {error ? <p className={styles.captureError}>{error}</p> : null}
  </article>;
}
