"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, RefreshCw } from "lucide-react";
import type { PurchaseImportHistory, PurchaseImportJob } from "@/lib/inventory-purchase-import";
import styles from "./inventory-transfer-workspace.module.css";

export function PurchaseImportHistoryPanel({ locationId, correctionsOnly, onResume }: { locationId: string; correctionsOnly: boolean; onResume: (job: PurchaseImportJob) => void }) {
  const [response, setResponse] = useState<{ key: string; history: PurchaseImportHistory | null; error: string } | null>(null);
  const [pages, setPages] = useState<string[]>([""]);
  const [refresh, setRefresh] = useState(0);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [legacy, setLegacy] = useState(false);
  const [reviewers, setReviewers] = useState<{ id: string; name: string }[]>([]);
  const [undo, setUndo] = useState<PurchaseImportJob | null>(null);
  const [reason, setReason] = useState("");
  const [actionError, setActionError] = useState("");
  const [busy, setBusy] = useState(false);
  const cursor = pages[pages.length - 1];
  const requestKey = `${locationId}:${cursor}:${refresh}:${query}:${status}:${legacy}:${correctionsOnly}`;
  const loading = response?.key !== requestKey;
  const history = !loading ? response?.history : null;
  const error = !loading ? response?.error : "";
  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/vehicles/transfers/documents?${new URLSearchParams({ locationId, ...(legacy ? {} : { queue: "1", q: query, status: correctionsOnly ? "ATTENTION" : status }), ...(cursor ? { cursor } : {}) })}`, { cache: "no-store", signal: controller.signal })
      .then(async response => { const data = await response.json(); if (!response.ok) throw new Error(data.error || "Import history unavailable."); return data as PurchaseImportHistory; })
      .then(data => { if (!controller.signal.aborted) setResponse({ key: requestKey, history: data, error: "" }); })
      .catch(error => { if (!controller.signal.aborted) setResponse({ key: requestKey, history: null, error: error instanceof Error ? error.message : "Import history unavailable." }); });
    return () => controller.abort();
  }, [locationId, cursor, requestKey, query, status, legacy, correctionsOnly]);
  useEffect(() => {
    if (!history?.canManage) return;
    const controller = new AbortController();
    fetch(`/api/vehicles/transfers/documents?${new URLSearchParams({ locationId, reviewers: "1" })}`, { signal: controller.signal }).then(async response => { if (response.ok) return response.json(); return []; }).then(data => { if (!controller.signal.aborted) setReviewers(data); }).catch(() => undefined);
    return () => controller.abort();
  }, [locationId, history?.canManage]);
  async function act(body: object) {
    setBusy(true); setActionError("");
    try {
      const response = await fetch("/api/vehicles/transfers/documents", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error || "Import action failed.");
      setUndo(null); setReason(""); setRefresh(value => value + 1);
    } catch (error) { setActionError(error instanceof Error ? error.message : "Import action failed."); }
    finally { setBusy(false); }
  }
  const jobs = history?.jobs.filter(job => !correctionsOnly || job.status !== "IMPORTED").map(job => ["SCANNING", "PROCESSING"].includes(job.status) && job.expired ? { ...job, status: "FAILED" as const, message: "Read interrupted. Retry the stored source." } : job) ?? [];
  return <section aria-label={correctionsOnly ? "Correction queue" : "Import history"} aria-busy={loading}>
    <div className={styles.toolbar}><strong>{correctionsOnly ? "Needs attention" : "Your purchase imports"}</strong><button disabled={loading} onClick={() => setRefresh(value => value + 1)} title="Refresh import history"><RefreshCw size={16} />Refresh</button></div>
    <div className={styles.toolbar}><label><input type="checkbox" checked={legacy} onChange={event => { setLegacy(event.target.checked); setPages([""]); }} />Earlier imports</label>{!legacy ? <><label>Search<input type="search" value={query} maxLength={100} onChange={event => { setQuery(event.target.value); setPages([""]); }} /></label>{!correctionsOnly ? <label>Status<select value={status} onChange={event => { setStatus(event.target.value); setPages([""]); }}><option value="">All</option>{["NEEDS_REVIEW", "READY", "FAILED", "QUARANTINED", "IMPORTED", "UNDONE"].map(value => <option key={value}>{value}</option>)}</select></label> : null}</> : null}</div>
    {history?.metrics && (history.metrics.failed || history.metrics.stalled) ? <p role="status" className={styles.error}>{history.metrics.failed} failed / quarantined; {history.metrics.stalled} stalled jobs at this location.</p> : null}
    {actionError ? <p role="alert" className={styles.error}>{actionError}</p> : null}
    {undo ? <form className={styles.toolbar} onSubmit={event => { event.preventDefault(); void act({ action: "undo", readId: undo.readId, reason }); }}><strong>Undo draft: {undo.fileName}</strong><label>Reason<input value={reason} minLength={10} maxLength={1000} required onChange={event => setReason(event.target.value)} /></label><button disabled={busy || reason.trim().length < 10}>Confirm draft undo</button><button type="button" disabled={busy} onClick={() => setUndo(null)}>Cancel</button></form> : null}
    {error ? <p role="alert" className={styles.error}>{error}</p> : null}
    {loading ? <p role="status">Loading imports...</p> : history ? <>
      {correctionsOnly && legacy ? <p className={styles.meta}>Earlier imports require their original file.</p> : null}
      <div className={styles.tableScroll}><table><caption className={styles.srOnly}>Purchase imports for your account and selected location</caption><thead><tr><th>Document / VIN</th><th>Started</th><th>Status</th><th>Next action</th></tr></thead><tbody>{jobs.map(job => <tr key={job.readId}><td>{job.fileName}<br /><span className={styles.meta}>{job.vin || "VIN needs review"}</span>{history?.canManage && job.version && ["NEEDS_REVIEW", "READY", "FAILED"].includes(job.status) ? <label>Reviewer<select aria-label={`Reviewer for ${job.fileName}`} disabled={busy} value={job.assignedToUserId ?? ""} onChange={event => void act({ action: "assign", readId: job.readId, assignedToUserId: event.target.value, expectedVersion: job.version })}>{reviewers.map(user => <option key={user.id} value={user.id}>{user.name}</option>)}</select></label> : null}</td><td>{new Date(job.createdAt).toLocaleString()}</td><td><span className={styles.status} data-status={job.status}>{job.status.replaceAll("_", " ")}</span>{job.expired && job.status !== "IMPORTED" ? <p className={styles.meta}>Review expired</p> : null}{job.message ? <p className={styles.meta}>{job.message}</p> : null}</td><td>{["IMPORTED", "UNDONE"].includes(job.status) && job.vehicleId ? <><Link href={`/vehicles/${encodeURIComponent(job.vehicleId)}/details`}>Open vehicle</Link>{job.status === "IMPORTED" && history?.canManage ? <button disabled={busy} onClick={() => { setUndo(job); setReason(""); }}>Undo draft</button> : null}</> : <button disabled={busy || job.status === "QUARANTINED" || job.status === "SCANNING" || job.status === "PROCESSING"} onClick={() => onResume(job)}><RefreshCw size={14} />Correct / retry</button>}</td></tr>)}</tbody></table></div>
      {!jobs.length ? <p className={styles.empty}>{correctionsOnly ? "No unfinished imports match these filters." : "No purchase imports match these filters."}</p> : null}
      <div className={styles.pagination}><button aria-label="Previous history page" disabled={pages.length === 1 || loading} onClick={() => setPages(items => items.slice(0, -1))}><ArrowLeft size={16} /></button><span>Page {pages.length}</span><button aria-label="Next history page" disabled={!history.nextCursor || loading} onClick={() => setPages(items => [...items, history.nextCursor!])}><ArrowRight size={16} /></button></div>
    </> : null}
  </section>;
}
