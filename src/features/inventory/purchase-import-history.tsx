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
  const cursor = pages[pages.length - 1];
  const requestKey = `${locationId}:${cursor}:${refresh}`;
  const loading = response?.key !== requestKey;
  const history = !loading ? response?.history : null;
  const error = !loading ? response?.error : "";
  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/vehicles/transfers/documents?${new URLSearchParams({ locationId, ...(cursor ? { cursor } : {}) })}`, { cache: "no-store", signal: controller.signal })
      .then(async response => { const data = await response.json(); if (!response.ok) throw new Error(data.error || "Import history unavailable."); return data as PurchaseImportHistory; })
      .then(data => { if (!controller.signal.aborted) setResponse({ key: requestKey, history: data, error: "" }); })
      .catch(error => { if (!controller.signal.aborted) setResponse({ key: requestKey, history: null, error: error instanceof Error ? error.message : "Import history unavailable." }); });
    return () => controller.abort();
  }, [locationId, cursor, requestKey]);
  const jobs = history?.jobs.filter(job => !correctionsOnly || job.status !== "IMPORTED") ?? [];
  return <section aria-label={correctionsOnly ? "Correction queue" : "Import history"} aria-busy={loading}>
    <div className={styles.toolbar}><strong>{correctionsOnly ? "Needs attention" : "Your purchase imports"}</strong><button disabled={loading} onClick={() => setRefresh(value => value + 1)} title="Refresh import history"><RefreshCw size={16} />Refresh</button></div>
    {error ? <p role="alert" className={styles.error}>{error}</p> : null}
    {loading ? <p role="status">Loading imports...</p> : history ? <>
      {correctionsOnly ? <p className={styles.meta}>Unfinished imports on this history page. Reattach the original file to continue.</p> : null}
      <div className={styles.tableScroll}><table><caption className={styles.srOnly}>Purchase imports for your account and selected location</caption><thead><tr><th>Document / VIN</th><th>Started</th><th>Status</th><th>Next action</th></tr></thead><tbody>{jobs.map(job => <tr key={job.readId}><td>{job.fileName}<br /><span className={styles.meta}>{job.vin || "VIN needs review"}</span></td><td>{new Date(job.createdAt).toLocaleString()}</td><td><span className={styles.status} data-status={job.status}>{job.status.replaceAll("_", " ")}</span>{job.expired && job.status !== "IMPORTED" ? <p className={styles.meta}>Review expired</p> : null}{job.message ? <p className={styles.meta}>{job.message}</p> : null}</td><td>{job.status === "IMPORTED" && job.vehicleId ? <Link href={`/vehicles/${encodeURIComponent(job.vehicleId)}/details`}>Open vehicle</Link> : <button onClick={() => onResume(job)}><RefreshCw size={14} />Correct / retry</button>}</td></tr>)}</tbody></table></div>
      {!jobs.length ? <p className={styles.empty}>{correctionsOnly ? "No unfinished imports on this page." : "No purchase imports yet."}</p> : null}
      <div className={styles.pagination}><button aria-label="Previous history page" disabled={pages.length === 1 || loading} onClick={() => setPages(items => items.slice(0, -1))}><ArrowLeft size={16} /></button><span>Page {pages.length}</span><button aria-label="Next history page" disabled={!history.nextCursor || loading} onClick={() => setPages(items => [...items, history.nextCursor!])}><ArrowRight size={16} /></button></div>
    </> : null}
  </section>;
}
