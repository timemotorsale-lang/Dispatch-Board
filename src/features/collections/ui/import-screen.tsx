"use client";

import { useCallback, useMemo, useState, type FormEvent } from "react";

import { formatCents } from "../domain/money-dates";
import { BUCKET_LABELS, BUCKETS, type Bucket } from "../domain/status";
import styles from "./collections.module.css";

type Summary = { totalRows: number; created: number; updated: number; unchanged: number; needsReview: number; errors: number; missing: number; totalBalanceCents: number; bucketCounts: Record<Bucket, number> };
type Issue = { rowNumber: number | null; message: string };
type PreviewRow = { rowNumber: number; externalAccountId: string; buyerName: string; dealNumber: string | null; stockNumber: string | null; daysPastDue: number; amountDueCents: number; totalBalanceCents: number; bucket: Bucket; change: "NEW" | "UPDATED" | "UNCHANGED"; needsReview: boolean; reviewReasons: string[] };
type Preview = { id: string; status: string; fileName: string; asOfDate: string; summary: Summary | null; errors: Issue[]; unknownColumns: string[]; rows: PreviewRow[]; missing: Array<{ id: string; externalAccountId: string; buyerNameRaw: string; dealNumber: string | null }> };
export type ImportRunSummary = { id: string; fileName: string; status: string; asOfDate: string | null; createdAt: string; totalRows: number; createdCount: number; updatedCount: number; needsReviewCount: number; errorCount: number; missingCount: number; totalBalanceCents: number; fileStored: boolean };

async function readJson<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(typeof body.error === "string" ? body.error : "Something went wrong. Nothing was changed.");
  return body as T;
}

const FILTERS = [
  { key: "ALL", label: "All rows" },
  { key: "NEW", label: "New" },
  { key: "UPDATED", label: "Updated" },
  { key: "UNCHANGED", label: "Unchanged" },
  { key: "REVIEW", label: "Needs review" }
] as const;

export function ImportScreen({ initialRuns }: { initialRuns: ImportRunSummary[] }) {
  const [file, setFile] = useState<File | null>(null);
  const [asOfDate, setAsOfDate] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["key"]>("ALL");
  const [runs, setRuns] = useState<ImportRunSummary[]>(initialRuns);

  const loadRuns = useCallback(async () => {
    try { setRuns((await readJson<{ imports: ImportRunSummary[] }>(await fetch("/api/collections/import", { cache: "no-store" }))).imports); }
    catch (e) { setError(e instanceof Error ? e.message : String(e)); setRuns([]); }
  }, []);

  async function upload(event: FormEvent) {
    event.preventDefault();
    if (!file) { setError("Choose the DealerCenter file first."); return; }
    setBusy(true); setError(""); setNotice(""); setPreview(null);
    try {
      const form = new FormData();
      form.set("file", file);
      if (asOfDate) form.set("asOfDate", asOfDate);
      const result = await readJson<{ runId: string; status: string; errors: Issue[] }>(await fetch("/api/collections/import", { method: "POST", body: form }));
      setPreview(await readJson<Preview>(await fetch(`/api/collections/import/${result.runId}`, { cache: "no-store" })));
      await loadRuns();
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(false); }
  }

  async function commit() {
    if (!preview) return;
    setBusy(true); setError("");
    try {
      const result = await readJson<{ created: number; updated: number; unchanged: number; needsReview: number; missing: number; dmsPromisesCreated: number }>(await fetch(`/api/collections/import/${preview.id}/commit`, { method: "POST" }));
      setNotice(`Import saved. ${result.created} new, ${result.updated} updated, ${result.unchanged} unchanged. ${result.needsReview} need review, ${result.missing} not in this file, ${result.dmsPromisesCreated} promise date(s) from DealerCenter added.`);
      setPreview(null); setFile(null);
      await loadRuns();
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(false); }
  }

  async function cancel() {
    if (!preview) return;
    setBusy(true); setError("");
    try {
      await readJson(await fetch(`/api/collections/import/${preview.id}/cancel`, { method: "POST" }));
      setNotice("Import cancelled. Nothing was changed.");
      setPreview(null);
      await loadRuns();
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(false); }
  }

  const rows = useMemo(() => (preview?.rows ?? []).filter(row =>
    filter === "ALL" ? true : filter === "REVIEW" ? row.needsReview : row.change === filter), [preview, filter]);

  return (
    <>
      {error ? <p className={styles.error} role="alert">{error}</p> : null}
      {notice ? <p className={styles.notice} role="status">{notice}</p> : null}

      <section className={styles.panel} aria-labelledby="upload-heading">
        <h2 id="upload-heading">1. Upload today&apos;s DealerCenter file</h2>
        <p className={styles.muted}>Use the DealerCenter &quot;Active Accounts&quot; export (.xlsx or .csv). Nothing is saved until you check the preview and press Confirm.</p>
        <form className={styles.form} onSubmit={upload}>
          <label>
            DealerCenter file
            <input type="file" accept=".xlsx,.csv" onChange={event => setFile(event.target.files?.[0] ?? null)} />
          </label>
          <label>
            Data as of (optional)
            <input type="date" value={asOfDate} onChange={event => setAsOfDate(event.target.value)} />
            <small>Leave empty to use the date in the file name, or today.</small>
          </label>
          <div className={`${styles.actions} ${styles.wide}`}>
            <button className={styles.primary} type="submit" disabled={busy || !file}>{busy ? "Working…" : "Upload and preview"}</button>
          </div>
        </form>
      </section>

      {preview ? (
        <section className={styles.panel} aria-labelledby="preview-heading">
          <h2 id="preview-heading">2. Check the preview: {preview.fileName}</h2>
          <p className={styles.muted}>Data as of {preview.asOfDate}. {preview.status === "FAILED" ? "This file can't be imported." : "Compare the account count and total balance with DealerCenter before confirming."}</p>
          {preview.errors.length ? (
            <div className={styles.warning} role="alert">
              <strong>{preview.errors.length} problem(s) found.</strong> Rows with problems are skipped.
              <ul>{preview.errors.slice(0, 20).map((issue, i) => <li key={i}>{issue.message}</li>)}</ul>
              {preview.errors.length > 20 ? <p>…and {preview.errors.length - 20} more.</p> : null}
            </div>
          ) : null}
          {preview.unknownColumns.length ? <p className={styles.muted}>Extra columns ignored: {preview.unknownColumns.join(", ")}.</p> : null}
          {preview.summary ? (
            <>
              <div className={styles.tiles}>
                <div className={styles.tile}>Accounts<strong>{preview.summary.totalRows}</strong></div>
                <div className={styles.tile}>Total balance<strong>{formatCents(preview.summary.totalBalanceCents)}</strong></div>
                <div className={styles.tile}>New<strong>{preview.summary.created}</strong></div>
                <div className={styles.tile}>Updated<strong>{preview.summary.updated}</strong></div>
                <div className={styles.tile}>Unchanged<strong>{preview.summary.unchanged}</strong></div>
                <div className={styles.tile}>Needs review<strong>{preview.summary.needsReview}</strong></div>
                <div className={styles.tile}>Not in this file<strong>{preview.summary.missing}</strong></div>
              </div>
              <h3>Accounts by days past due</h3>
              <div className={styles.tiles}>
                {BUCKETS.map(bucket => <div key={bucket} className={styles.tile}>{BUCKET_LABELS[bucket]}<strong>{preview.summary!.bucketCounts[bucket]}</strong></div>)}
              </div>
              {preview.missing.length ? (
                <div className={styles.warning}>
                  <strong>{preview.missing.length} account(s) are not in this file.</strong> They may be paid off, closed or repossessed in DealerCenter. They won&apos;t be deleted; after you confirm, they&apos;ll be listed under &quot;Not in latest import&quot; so you can confirm what happened.
                  <ul>{preview.missing.slice(0, 15).map(item => <li key={item.id}>{item.buyerNameRaw} · Deal {item.dealNumber ?? "—"} · {item.externalAccountId}</li>)}</ul>
                </div>
              ) : null}
              <div className={styles.actions} role="group" aria-label="Filter preview rows">
                {FILTERS.map(item => <button key={item.key} type="button" aria-pressed={filter === item.key} className={filter === item.key ? styles.primary : undefined} onClick={() => setFilter(item.key)}>{item.label}</button>)}
              </div>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <caption className={styles.srOnly}>Preview rows</caption>
                  <thead><tr><th>Row</th><th>Customer</th><th>Deal #</th><th className={styles.hideOnPhone}>Stock #</th><th className={styles.num}>Days late</th><th className={styles.num}>Amount due</th><th className={styles.num}>Balance</th><th>Change</th><th>Review</th></tr></thead>
                  <tbody>
                    {rows.slice(0, 500).map(row => (
                      <tr key={row.externalAccountId}>
                        <td>{row.rowNumber}</td>
                        <td>{row.buyerName}</td>
                        <td>{row.dealNumber ?? "—"}</td>
                        <td className={styles.hideOnPhone}>{row.stockNumber ?? "—"}</td>
                        <td className={styles.num}>{row.daysPastDue}</td>
                        <td className={styles.num}>{formatCents(row.amountDueCents)}</td>
                        <td className={styles.num}>{formatCents(row.totalBalanceCents)}</td>
                        <td><span className={styles.badge}>{row.change.toLowerCase()}</span></td>
                        <td>{row.needsReview ? <span className={`${styles.badge} ${styles.badgeWarn}`} title={row.reviewReasons.join(" ")}>needs review</span> : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {rows.length === 0 ? <p className={styles.empty}>No rows in this view.</p> : null}
              </div>
              <div className={styles.actions}>
                <button type="button" className={styles.primary} disabled={busy || preview.status !== "PREVIEW"} onClick={commit}>{busy ? "Saving…" : "Confirm import"}</button>
                <button type="button" disabled={busy || preview.status !== "PREVIEW"} onClick={cancel}>Cancel</button>
              </div>
            </>
          ) : null}
        </section>
      ) : null}

      <section className={styles.panel} aria-labelledby="history-heading">
        <h2 id="history-heading">Recent imports</h2>
        {runs.length === 0 ? <p className={styles.empty}>No imports yet. Upload your first DealerCenter file above.</p> : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <caption className={styles.srOnly}>Recent imports</caption>
              <thead><tr><th>Data as of</th><th>File</th><th>Status</th><th className={styles.num}>Accounts</th><th className={styles.num}>Balance</th><th className={styles.num}>Needs review</th><th className={styles.num}>Not in file</th></tr></thead>
              <tbody>
                {runs.map(run => (
                  <tr key={run.id}>
                    <td>{run.asOfDate}</td>
                    <td>{run.fileName}</td>
                    <td><span className={`${styles.badge} ${run.status === "COMMITTED" ? styles.badgeGood : run.status === "FAILED" ? styles.badgeBad : ""}`}>{run.status.toLowerCase()}</span></td>
                    <td className={styles.num}>{run.totalRows}</td>
                    <td className={styles.num}>{formatCents(run.totalBalanceCents)}</td>
                    <td className={styles.num}>{run.needsReviewCount}</td>
                    <td className={styles.num}>{run.missingCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
