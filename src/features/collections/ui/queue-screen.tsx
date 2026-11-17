import { formatDay } from "../domain/account-ref";
import Link from "next/link";

import { formatCents } from "../domain/money-dates";
import { QUEUE_TABS, type QueueFacts, type QueueTab } from "../domain/queue";
import { BUCKET_LABELS, BUCKETS, STATUS_LABELS, type AccountStatus } from "../domain/status";
import styles from "./collections.module.css";
import { QueueRowActions } from "./queue-row-actions";

type Row = QueueFacts & { reason: { text: string; tone: "danger" | "warning" | "neutral" } };
type Summary = { brokenPromises: number; promisesDueToday: number; pastDueAccounts: number; pastDueCents: number; contactedToday: number };

const FLAG_LABELS: Record<string, string> = {
  BANKRUPTCY: "Bankruptcy", ATTORNEY_REPRESENTED: "Attorney", CONTACT_RESTRICTED: "Restricted", DISPUTE: "Dispute", DECEASED: "Deceased", SKIP: "Skip", DO_NOT_REPO_REVIEW_HOLD: "Repo hold"
};
const SHORT_TAB: Partial<Record<QueueTab, string>> = { PAST_DUE: "Call list", BROKEN: "Broken", PROMISES_TODAY: "Due today", DISABLE: "Disable review", REPO: "Repo", INSURANCE: "Insurance", NEEDS_REVIEW: "Needs review", FLAGGED: "Flagged", MISSING: "Not in import" };

function daysChip(days: number) {
  const cls = days >= 30 ? styles.chipDanger : days > 0 ? styles.chipWarn : styles.chipGood;
  return <span className={`${styles.chip} ${cls}`}>{days > 0 ? `${days} day${days === 1 ? "" : "s"} late` : "Current"}</span>;
}

export function QueueScreen({ tab, counts, rows, totalRows, filters, lastImport, importedToday, summary }: {
  tab: QueueTab;
  counts: Record<QueueTab, number>;
  rows: Row[];
  totalRows: number;
  filters: { bucket: string; type: string; q: string; status: string; sort?: string };
  lastImport: { committedAt: string | null; asOfDate: string | null } | null;
  importedToday: boolean;
  summary: Summary;
}) {
  const query = (next: Record<string, string>) => {
    const params = new URLSearchParams({ tab, ...filters, ...next });
    for (const [key, value] of [...params.entries()]) if (!value) params.delete(key);
    return `/collections/queue?${params.toString()}`;
  };
  const filtered = Boolean(filters.bucket || filters.type || filters.status);
  return (
    <>
      {!importedToday ? (
        <p className={styles.warning} role="status">
          {lastImport ? `The latest DealerCenter data is from ${formatDay(lastImport.asOfDate)}.` : "No DealerCenter file has been imported yet."}{" "}
          <Link href="/collections/import">Import today&apos;s file</Link> so the queue is up to date.
        </p>
      ) : null}

      <div className={styles.kpis}>
        <Link className={`${styles.kpi} ${styles.kpiDanger}`} href={query({ tab: "BROKEN" })}><strong>{summary.brokenPromises}</strong><span>Broken promises</span></Link>
        <Link className={`${styles.kpi} ${styles.kpiWarn}`} href={query({ tab: "PROMISES_TODAY" })}><strong>{summary.promisesDueToday}</strong><span>Promises due today</span></Link>
        <Link className={`${styles.kpi} ${styles.kpiAccent}`} href={query({ tab: "PAST_DUE" })}><strong>{summary.pastDueAccounts} · {formatCents(summary.pastDueCents)}</strong><span>Past due</span></Link>
        <div className={`${styles.kpi} ${styles.kpiGood}`}><strong>{summary.contactedToday} / {summary.pastDueAccounts}</strong><span>Contacted today</span></div>
      </div>

      <nav aria-label="Queue views">
        <ul className={styles.tabbar}>
          {QUEUE_TABS.map(item => (
            <li key={item.key}><Link href={query({ tab: item.key })} aria-current={item.key === tab ? "page" : undefined} title={item.label}>{SHORT_TAB[item.key] ?? item.label} <span className={styles.count}>{counts[item.key]}</span></Link></li>
          ))}
        </ul>
      </nav>

      <form className={styles.toolbar} action="/collections/queue" method="get" role="search" aria-label="Search and filter the queue">
        <input type="hidden" name="tab" value={tab} />
        <label className={styles.srOnly} htmlFor="queue-search">Search name, deal, stock or phone</label>
        <input id="queue-search" type="search" name="q" defaultValue={filters.q} placeholder="Search name, deal, stock or phone" />
        <label className={styles.srOnly} htmlFor="queue-sort">Order</label>
        <select id="queue-sort" name="sort" defaultValue={filters.sort ?? ""} style={{ width: "auto" }}>
          <option value="">Standard order</option>
          <option value="RISK">Highest risk first</option>
        </select>
        <details className={styles.menu} open={filtered}>
          <summary>Filters{filtered ? " (on)" : ""}</summary>
          <div className={styles.menuList} style={{ display: "grid", gap: 8, padding: 12 }}>
            <label>Bucket<select name="bucket" defaultValue={filters.bucket}><option value="">All buckets</option>{BUCKETS.map(b => <option key={b} value={b}>{BUCKET_LABELS[b]}</option>)}</select></label>
            <label>Type<select name="type" defaultValue={filters.type}><option value="">Lease-to-own and BHPH</option><option value="LEASE_TO_OWN">Lease-to-own</option><option value="BHPH">BHPH</option></select></label>
            <label>Status<select name="status" defaultValue={filters.status}><option value="">Any status</option>{(Object.keys(STATUS_LABELS) as AccountStatus[]).map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}</select></label>
          </div>
        </details>
        <button type="submit" className={styles.primary}>Search</button>
        {filters.q || filtered || filters.sort ? <Link className={styles.button} href={`/collections/queue?tab=${tab}`}>Clear</Link> : null}
      </form>

      <p className={styles.muted} aria-live="polite">{totalRows} account{totalRows === 1 ? "" : "s"} to work{totalRows > rows.length ? `, showing the first ${rows.length}` : ""}.</p>

      {rows.length === 0 ? <p className={styles.empty}>No one to call in this view. Nice work.</p> : (
        <ul className={styles.callList} aria-label="Accounts to work, most urgent first" style={{ listStyle: "none", margin: 0, padding: 0 }}>
          {rows.map(row => {
            const frozen = row.activeFlags.includes("BANKRUPTCY");
            const urgent = row.reason.tone === "danger";
            const href = `/collections/accounts/${row.id}?from=${tab}`;
            const flags = row.activeFlags.filter(f => FLAG_LABELS[f]);
            return (
              <li key={row.id} className={`${styles.callRow} ${urgent ? styles.callRowUrgent : ""}`}>
                <div>
                  <Link className={styles.callName} href={href}>{row.buyerName}</Link>
                  {flags.map(f => <span key={f} className={`${styles.badge} ${f === "BANKRUPTCY" ? styles.badgePurple : styles.badgeWarn}`} style={{ marginLeft: 6 }}>{FLAG_LABELS[f]}</span>)}
                  <div className={styles.callSub}>{row.vehicleDescription ?? "Vehicle not listed"}{row.dealNumber ? ` · Deal #${row.dealNumber}` : ""}{row.riskScore != null ? ` · risk ${row.riskScore}` : ""}</div>
                </div>
                <div>{daysChip(row.daysPastDue)}</div>
                <div style={{ fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{formatCents(row.amountDueCents)}</div>
                <div className={row.reason.tone === "danger" ? styles.reasonDanger : row.reason.tone === "warning" ? styles.reasonWarn : styles.reasonNeutral}>{row.reason.text}</div>
                <QueueRowActions accountId={row.id} phone={row.phone} frozen={frozen} from={tab} />
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
