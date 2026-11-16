"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { formatCents } from "../domain/money-dates";
import { STATUS_LABELS, type AccountStatus } from "../domain/status";
import { callCollections, formatWhen } from "./client-api";
import styles from "./collections.module.css";

type Row = { id: string; externalAccountId: string; buyerNameRaw: string; dealNumber: string | null; stockNumberRaw: string | null; vehicleDescriptionRaw: string | null; accountType: "LEASE_TO_OWN" | "BHPH"; status: string; daysPastDue: number; amountDueCents: number; totalBalanceCents: number; lastContactAt: string | null; customerId: string | null; vehicleId: string | null };
type Props = {
  data: { total: number; page: number; pages: number; sort: string; dir: "asc" | "desc"; accounts: Row[] };
  query: { q: string; type: string; status: string };
  collectors: Array<{ id: string; name: string }>;
  canChangeType: boolean;
  canAssign: boolean;
};

const COLUMNS = [
  { key: "name", label: "Customer" }, { key: "deal", label: "Deal #" }, { key: "type", label: "Type" }, { key: "status", label: "Status" },
  { key: "dpd", label: "Days late", num: true }, { key: "due", label: "Amount due", num: true }, { key: "balance", label: "Balance", num: true }
] as const;

export function AccountsScreen({ data, query, collectors, canChangeType, canAssign }: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [bulkType, setBulkType] = useState("BHPH");
  const [reason, setReason] = useState("");
  const [collector, setCollector] = useState("");

  const href = (next: Record<string, string | number>) => {
    const params = new URLSearchParams({ q: query.q, type: query.type, status: query.status, sort: data.sort, dir: data.dir, page: String(data.page) });
    for (const [key, value] of Object.entries(next)) params.set(key, String(value));
    for (const [key, value] of [...params.entries()]) if (!value) params.delete(key);
    return `/collections/accounts?${params.toString()}`;
  };
  const allOnPage = data.accounts.length > 0 && data.accounts.every(row => selected.has(row.id));
  const toggle = (id: string) => setSelected(current => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; });

  async function bulk(action: "CHANGE_TYPE" | "ASSIGN_COLLECTOR") {
    setBusy(true); setError(""); setMessage("");
    try {
      const result = await callCollections<{ message: string }>("/api/collections/accounts/bulk", { action, accountIds: [...selected], accountType: bulkType, reason, userId: collector });
      setMessage(result.message); setSelected(new Set()); setReason("");
      router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(false); }
  }

  const csvParams = new URLSearchParams({ q: query.q, type: query.type, status: query.status, format: "csv" });
  return (
    <>
      <form className={styles.form} method="get" action="/collections/accounts" role="search" aria-label="Search accounts">
        <label>Search (name, deal #, stock #, AccountId, phone)<input name="q" defaultValue={query.q} /></label>
        <label>Type
          <select name="type" defaultValue={query.type}>
            <option value="">All types</option><option value="LEASE_TO_OWN">Lease-to-own</option><option value="BHPH">BHPH</option>
          </select>
        </label>
        <div className={`${styles.actions} ${styles.wide}`}>
          <button type="submit" className={styles.primary}>Search</button>
          <a className={styles.button} href={`/api/collections/accounts?${csvParams.toString()}`}>Export CSV</a>
        </div>
      </form>
      {error ? <p className={styles.error} role="alert">{error}</p> : null}
      {message ? <p className={styles.notice} role="status">{message}</p> : null}

      {selected.size > 0 && (canChangeType || canAssign) ? (
        <section className={styles.panel} aria-label="Bulk changes">
          <h2>{selected.size} account(s) selected</h2>
          <div className={styles.form}>
            {canChangeType ? (
              <>
                <label>Change account type to
                  <select value={bulkType} onChange={event => setBulkType(event.target.value)}><option value="BHPH">BHPH</option><option value="LEASE_TO_OWN">Lease-to-own</option></select>
                </label>
                <label>Reason<input value={reason} onChange={event => setReason(event.target.value)} placeholder="Why are these changing?" /></label>
                <div className={`${styles.actions} ${styles.wide}`}><button type="button" className={styles.primary} disabled={busy} onClick={() => bulk("CHANGE_TYPE")}>Change type</button></div>
              </>
            ) : null}
            {canAssign ? (
              <>
                <label>Assign collector
                  <select value={collector} onChange={event => setCollector(event.target.value)}>
                    <option value="">Choose staff…</option>
                    {collectors.map(person => <option key={person.id} value={person.id}>{person.name}</option>)}
                  </select>
                </label>
                <div className={styles.actions}><button type="button" disabled={busy || !collector} onClick={() => bulk("ASSIGN_COLLECTOR")}>Assign</button></div>
              </>
            ) : null}
          </div>
        </section>
      ) : null}

      <p className={styles.muted}>{data.total} account(s). Page {data.page} of {data.pages}.</p>
      {data.accounts.length === 0 ? <p className={styles.empty}>No accounts yet. <Link href="/collections/import">Import your DealerCenter file</Link> to get started.</p> : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <caption className={styles.srOnly}>Collections accounts</caption>
            <thead>
              <tr>
                <th><input type="checkbox" aria-label="Select all on this page" checked={allOnPage} onChange={() => setSelected(current => { const next = new Set(current); for (const row of data.accounts) { if (allOnPage) next.delete(row.id); else next.add(row.id); } return next; })} /></th>
                {COLUMNS.map(column => {
                  const active = data.sort === column.key;
                  const nextDir = active && data.dir === "desc" ? "asc" : "desc";
                  return <th key={column.key} className={"num" in column ? styles.num : undefined} aria-sort={active ? (data.dir === "asc" ? "ascending" : "descending") : "none"}><Link href={href({ sort: column.key, dir: nextDir, page: 1 })}>{column.label}{active ? (data.dir === "asc" ? " ▲" : " ▼") : ""}</Link></th>;
                })}
                <th className={styles.hideOnPhone}>Last contact</th>
                <th className={styles.hideOnPhone}>Review</th>
              </tr>
            </thead>
            <tbody>
              {data.accounts.map(row => (
                <tr key={row.id}>
                  <td><input type="checkbox" aria-label={`Select ${row.buyerNameRaw}`} checked={selected.has(row.id)} onChange={() => toggle(row.id)} /></td>
                  <td><Link href={`/collections/accounts/${row.id}`}>{row.buyerNameRaw}</Link><br /><small>{row.vehicleDescriptionRaw ?? ""} {row.stockNumberRaw ? `· ${row.stockNumberRaw}` : ""}</small></td>
                  <td>{row.dealNumber ?? "—"}</td>
                  <td>{row.accountType === "BHPH" ? "BHPH" : "Lease-to-own"}</td>
                  <td>{STATUS_LABELS[row.status as AccountStatus] ?? row.status}</td>
                  <td className={styles.num}>{row.daysPastDue}</td>
                  <td className={styles.num}>{formatCents(row.amountDueCents)}</td>
                  <td className={styles.num}>{formatCents(row.totalBalanceCents)}</td>
                  <td className={styles.hideOnPhone}>{formatWhen(row.lastContactAt)}</td>
                  <td className={styles.hideOnPhone}>{!row.customerId || !row.vehicleId ? <span className={`${styles.badge} ${styles.badgeWarn}`}>needs review</span> : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <nav className={styles.actions} aria-label="Pages">
        {data.page > 1 ? <Link className={styles.button} href={href({ page: data.page - 1 })}>← Previous</Link> : null}
        {data.page < data.pages ? <Link className={styles.button} href={href({ page: data.page + 1 })}>Next →</Link> : null}
      </nav>
    </>
  );
}
