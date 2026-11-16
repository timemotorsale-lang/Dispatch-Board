"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { formatCents } from "../domain/money-dates";
import type { getReconciliation } from "../server/reconciliation-service";
import type { MigrationReport } from "../server/migration-service";
import { callCollections, label } from "./client-api";
import styles from "./collections.module.css";

type Data = Awaited<ReturnType<typeof getReconciliation>>;
const FIELD_LABEL: Record<string, string> = { totalBalance: "Balance", amountDue: "Amount due", daysPastDue: "Days past due", lateFees: "Late fees" };
const FILTERS = [["DIFFERENT", "Differences"], ["MATCHED", "Matched"], ["NO_CONTRACT", "No contract yet"], ["ALL", "All"]] as const;
const fmt = (field: string, n: number) => (field === "daysPastDue" ? String(n) : formatCents(n));

export function ReconciliationScreen({ data }: { data: Data }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(""), [error, setError] = useState("");
  const post = async (body: Record<string, unknown>) => {
    setBusy(true); setError(""); setMessage("");
    try { const r = await callCollections<{ message?: string; created?: number; skipped?: unknown[] }>("/api/collections/reconciliation", body); setMessage(r.message ?? `Done: ${r.created ?? 0} accounts.`); router.refresh(); return r; }
    catch (e) { setError(e instanceof Error ? e.message : String(e)); return null; } finally { setBusy(false); }
  };
  return (
    <>
      <section className={styles.panel} aria-labelledby="sor-h">
        <h2 id="sor-h">Official record: {data.systemOfRecord === "DEALERCENTER" ? "DealerCenter" : data.systemOfRecord} (locked in Release 1)</h2>
        <p>This screen checks the app&apos;s own shadow ledger against DealerCenter, account by account. It never changes DealerCenter or what anyone owes.</p>
        <div className={styles.tiles}>
          <div className={styles.tile}><span>Match rate today</span><strong>{data.matchRatePercent === null ? "—" : `${data.matchRatePercent}%`}</strong></div>
          <div className={styles.tile}><span>Matched</span><strong>{data.counts.matched}</strong></div>
          <div className={styles.tile}><span>Differences</span><strong>{data.counts.different}</strong></div>
          <div className={styles.tile}><span>No contract yet</span><strong>{data.counts.noContract}</strong></div>
        </div>
        <p className={data.gate.met ? styles.notice : styles.muted}>
          <strong>Switch-over check:</strong> {data.gate.daysCovered} of {data.gate.daysNeeded} days of daily matching recorded; {data.gate.unexplainedAccounts} account(s) with an unexplained difference in that time; {data.counts.noContract} without a contract.
          {data.gate.met ? " Ready, but switching the official record stays locked in Release 1." : " Not ready yet."}
        </p>
        {error ? <p className={styles.error} role="alert">{error}</p> : null}
        {message ? <p className={styles.notice} role="status">{message}</p> : null}
        {data.canAct ? <div className={styles.actions}><button disabled={busy} onClick={() => void post({ action: "RUN" })}>Check again now</button></div> : null}
      </section>

      <section className={styles.panel} aria-labelledby="accounts-h">
        <h2 id="accounts-h">Accounts</h2>
        <nav aria-label="Reconciliation filter" className={styles.actions}>
          {FILTERS.map(([key, text]) => <Link key={key} className={styles.button} aria-current={data.filter === key ? "page" : undefined} href={`/collections/reconciliation?filter=${key}`}>{text}</Link>)}
        </nav>
        {data.rows.length === 0 ? <p className={styles.empty}>{data.filter === "DIFFERENT" ? "No differences. Every account with a contract matches DealerCenter." : "Nothing to show."}</p> : (
          <div className={styles.tableWrap}><table className={styles.table}>
            <thead><tr><th scope="col">Account</th><th scope="col">As of</th><th scope="col">DealerCenter</th><th scope="col">App</th><th scope="col">Likely cause</th></tr></thead>
            <tbody>
              {data.rows.slice(0, 300).map(r => (
                <tr key={r.accountId}>
                  <th scope="row"><Link href={`/collections/accounts/${r.accountId}#ledger`}>{r.name}</Link><br /><small>{r.externalAccountId} · {label(r.status)}</small></th>
                  <td>{r.asOfDate ?? "—"}</td>
                  <td>{r.compared.map(c => <div key={c.field}>{FIELD_LABEL[c.field]}: {fmt(c.field, c.dms)}</div>)}</td>
                  <td>{r.compared.map(c => <div key={c.field} style={{ fontWeight: c.difference ? 700 : 400 }}>{fmt(c.field, c.module)}{c.difference ? ` (off by ${fmt(c.field, Math.abs(c.difference))})` : ""}</div>)}</td>
                  <td>
                    {r.causes.map(c => <div key={c}>{c}</div>)}
                    {r.status === "NO_CONTRACT" ? "Import the contracts file below." : null}
                    {r.note ? <p className={styles.muted}>Note: {r.note}</p> : null}
                    {data.canAct && r.status === "DIFFERENT" ? (
                      <form className={styles.actions} onSubmit={event => { event.preventDefault(); const f = event.currentTarget; void post({ action: "NOTE", accountId: r.accountId, note: new FormData(f).get("note") }).then(ok => { if (ok) f.reset(); }); }}>
                        <label className={styles.srOnly} htmlFor={`note-${r.accountId}`}>Explain this difference</label>
                        <input id={`note-${r.accountId}`} name="note" placeholder="Explain this difference" minLength={10} required />
                        <button disabled={busy}>Save note</button>
                      </form>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table></div>
        )}
      </section>

      {data.history.length ? (
        <section className={styles.panel} aria-labelledby="hist-h">
          <h2 id="hist-h">Match rate by day</h2>
          <div className={styles.tableWrap}><table className={styles.table}>
            <thead><tr><th scope="col">Date</th><th scope="col">Accounts</th><th scope="col">Matched</th><th scope="col">Differences</th><th scope="col">Match rate</th></tr></thead>
            <tbody>{data.history.map(h => <tr key={h.date}><th scope="row">{h.date}</th><td>{h.accounts}</td><td>{h.matched}</td><td>{h.differences}</td><td>{h.matchRatePercent === null ? "—" : `${h.matchRatePercent}%`}</td></tr>)}</tbody>
          </table></div>
        </section>
      ) : null}

      {data.canAct ? <HistoryImport onDone={() => router.refresh()} post={post} busy={busy} /> : null}
    </>
  );
}

function HistoryImport({ onDone, post, busy }: { onDone: () => void; post: (b: Record<string, unknown>) => Promise<unknown>; busy: boolean }) {
  const [kind, setKind] = useState<"CONTRACTS" | "PAYMENTS">("CONTRACTS");
  const [file, setFile] = useState<File | null>(null);
  const [report, setReport] = useState<MigrationReport | null>(null);
  const [columnMap, setColumnMap] = useState<Record<string, string>>({});
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");

  async function send(dryRun: boolean) {
    if (!file) return;
    setWorking(true); setError("");
    const form = new FormData();
    form.set("file", file); form.set("kind", kind); form.set("dryRun", dryRun ? "1" : "0"); form.set("columnMap", JSON.stringify(columnMap));
    try {
      const response = await fetch("/api/collections/reconciliation/history", { method: "POST", body: form });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error ?? "The file couldn't be read.");
      setReport(json as MigrationReport);
      if (!dryRun) onDone();
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); } finally { setWorking(false); }
  }

  return (
    <section className={styles.panel} aria-labelledby="mig-h">
      <h2 id="mig-h">Load DealerCenter history into the shadow ledger</h2>
      <ol>
        <li><strong>Contracts file:</strong> payment amount, frequency, number of payments, first due date (plus APR and amount financed for simple interest).</li>
        <li><strong>Either</strong> the <strong>payment history</strong> file, <strong>or</strong> start every account from today&apos;s DealerCenter balance (opening balances).</li>
      </ol>
      <p className={styles.muted}>Always press &quot;Check file&quot; first; it changes nothing. Importing the same file again adds nothing twice. The exact DealerCenter export isn&apos;t confirmed yet, so you can point each field at a different column.</p>
      {error ? <p className={styles.error} role="alert">{error}</p> : null}
      <div className={styles.form}>
        <label>File type<select value={kind} onChange={e => { setKind(e.target.value as "CONTRACTS" | "PAYMENTS"); setReport(null); setColumnMap({}); }}><option value="CONTRACTS">Contracts</option><option value="PAYMENTS">Payment history</option></select></label>
        <label>File (CSV or Excel)<input type="file" accept=".csv,.xlsx" onChange={e => { setFile(e.target.files?.[0] ?? null); setReport(null); }} /></label>
        <div className={`${styles.actions} ${styles.wide}`}>
          <button disabled={!file || working} onClick={() => void send(true)}>Check file</button>
          <button className={styles.primary} disabled={!file || working || !report?.dryRun || report.kind !== kind || report.errors.length > 0 && report.rows === 0} onClick={() => void send(false)}>Import</button>
        </div>
      </div>
      {report ? (
        <div className={styles.card}>
          <p><strong>{report.dryRun ? "Check" : "Imported"}:</strong> {report.rows} rows · {report.matchedAccounts} accounts matched · {report.created} {report.kind === "PAYMENTS" ? "entries" : "contracts"} {report.dryRun ? "would be added" : "added"} · {report.skipped.length} skipped · {report.unmatchedAccounts.length} account numbers not found</p>
          {report.errors.slice(0, 10).map(e => <p key={e} className={styles.warning}>{e}</p>)}
          {report.skipped.length ? <details><summary>Skipped</summary><ul>{report.skipped.slice(0, 100).map((s, i) => <li key={i}>{s.account}: {s.reason}</li>)}</ul></details> : null}
          {report.unmatchedAccounts.length ? <details><summary>Not found in Collections</summary><p>{report.unmatchedAccounts.join(", ")}</p></details> : null}
          <details open={report.errors.length > 0}><summary>Columns (change any that are wrong, then check again)</summary>
            <div className={styles.form}>
              {Object.entries(report.mapping).map(([field, column]) => (
                <label key={field}>{label(field)}<select value={columnMap[field] ?? column ?? ""} onChange={e => setColumnMap(m => ({ ...m, [field]: e.target.value }))}>
                  <option value="">(not in this file)</option>
                  {report.headers.map(h => <option key={h} value={h}>{h}</option>)}
                </select></label>
              ))}
            </div>
          </details>
        </div>
      ) : null}
      <h3>Opening balances</h3>
      <p className={styles.muted}>For contracts with no entries yet: start each one from the latest DealerCenter import (balance, late fees and other fees). After that, each daily import posts what changed.</p>
      <div className={styles.actions}>
        <button disabled={busy} onClick={() => void post({ action: "OPENING_BALANCES", dryRun: true })}>Check opening balances</button>
        <button disabled={busy} onClick={() => void post({ action: "OPENING_BALANCES", dryRun: false })}>Load opening balances</button>
      </div>
    </section>
  );
}
