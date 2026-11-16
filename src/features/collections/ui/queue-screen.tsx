import Link from "next/link";

import { formatCents } from "../domain/money-dates";
import { QUEUE_TABS, type QueueFacts, type QueueTab } from "../domain/queue";
import { BUCKET_LABELS, BUCKETS, STATUS_LABELS, type AccountStatus } from "../domain/status";
import styles from "./collections.module.css";
import { QueueRowActions } from "./queue-row-actions";

const FLAG_ICONS: Record<string, string> = {
  BANKRUPTCY: "Bankruptcy", ATTORNEY_REPRESENTED: "Attorney", CONTACT_RESTRICTED: "Restricted", DISPUTE: "Dispute", DECEASED: "Deceased", SKIP: "Skip", DO_NOT_REPO_REVIEW_HOLD: "Repo hold"
};

function when(value: string | null) {
  return value ? new Intl.DateTimeFormat("en-US", { timeZone: "America/Chicago", month: "short", day: "numeric" }).format(new Date(value)) : "—";
}

function Flags({ row }: { row: QueueFacts }) {
  const items = [
    ...row.activeFlags.map(flag => FLAG_ICONS[flag] ?? flag),
    ...(row.brokenPromise ? ["Broken promise"] : []),
    ...(row.reportedNotFound ? ["Payment not found"] : []),
    ...(row.unreadInbound ? [`${row.unreadInbound} new text${row.unreadInbound === 1 ? "" : "s"}`] : []),
    ...(row.insuranceProblem ? ["Insurance"] : [])
  ];
  if (!items.length) return <>—</>;
  return <>{items.map(item => <span key={item} className={`${styles.badge} ${item === "Bankruptcy" ? styles.badgePurple : styles.badgeWarn}`} style={{ marginRight: 4 }}>{item}</span>)}</>;
}

export function QueueScreen({ tab, counts, rows, totalRows, filters, lastImport, importedToday }: {
  tab: QueueTab;
  counts: Record<QueueTab, number>;
  rows: QueueFacts[];
  totalRows: number;
  filters: { bucket: string; type: string; q: string; status: string };
  lastImport: { committedAt: string | null; asOfDate: string | null } | null;
  importedToday: boolean;
}) {
  const query = (next: Record<string, string>) => {
    const params = new URLSearchParams({ tab, ...filters, ...next });
    for (const [key, value] of [...params.entries()]) if (!value) params.delete(key);
    return `/collections?${params.toString()}`;
  };
  return (
    <>
      {!importedToday ? (
        <p className={styles.warning} role="status">
          {lastImport ? `The latest DealerCenter data is from ${lastImport.asOfDate}.` : "No DealerCenter file has been imported yet."}{" "}
          <Link href="/collections/import">Import today&apos;s file</Link> so the queue is up to date.
        </p>
      ) : null}
      <nav aria-label="Queue views">
        <ul className={styles.subnav}>
          {QUEUE_TABS.map(item => (
            <li key={item.key}><Link href={query({ tab: item.key })} aria-current={item.key === tab ? "page" : undefined}>{item.label} ({counts[item.key]})</Link></li>
          ))}
        </ul>
      </nav>
      <form className={styles.form} action="/collections" method="get" role="search" aria-label="Filter the queue">
        <input type="hidden" name="tab" value={tab} />
        <label>Search (name, deal #, stock #, phone)<input name="q" defaultValue={filters.q} /></label>
        <label>Bucket
          <select name="bucket" defaultValue={filters.bucket}>
            <option value="">All buckets</option>
            {BUCKETS.map(bucket => <option key={bucket} value={bucket}>{BUCKET_LABELS[bucket]}</option>)}
          </select>
        </label>
        <label>Type
          <select name="type" defaultValue={filters.type}>
            <option value="">Lease-to-own and BHPH</option>
            <option value="LEASE_TO_OWN">Lease-to-own</option>
            <option value="BHPH">BHPH</option>
          </select>
        </label>
        <label>Status
          <select name="status" defaultValue={filters.status}>
            <option value="">Any status</option>
            {(Object.keys(STATUS_LABELS) as AccountStatus[]).map(status => <option key={status} value={status}>{STATUS_LABELS[status]}</option>)}
          </select>
        </label>
        <div className={`${styles.actions} ${styles.wide}`}>
          <button type="submit" className={styles.primary}>Apply filters</button>
          <Link className={styles.button} href={`/collections?tab=${tab}`}>Clear</Link>
        </div>
      </form>

      <p className={styles.muted} aria-live="polite">{totalRows} account(s) in this view{totalRows > rows.length ? `, showing the first ${rows.length}` : ""}.</p>

      {rows.length === 0 ? <p className={styles.empty}>Nothing to work in this view. 🎉</p> : (
        <>
          <div className={`${styles.tableWrap} ${styles.hideOnPhone}`}>
            <table className={styles.table}>
              <caption className={styles.srOnly}>Collections queue</caption>
              <thead><tr><th>Customer</th><th>Vehicle</th><th>Deal #</th><th className={styles.num}>Days late</th><th className={styles.num}>Amount due</th><th>Last contact</th><th>Next action</th><th>Flags</th><th>Actions</th></tr></thead>
              <tbody>
                {rows.map(row => (
                  <tr key={row.id}>
                    <td><Link href={`/collections/accounts/${row.id}`}>{row.buyerName}</Link><br /><small>{STATUS_LABELS[row.status as AccountStatus] ?? row.status}</small></td>
                    <td>{row.vehicleDescription ?? "—"}<br /><small>{row.stockNumber ?? ""}</small></td>
                    <td>{row.dealNumber ?? "—"}</td>
                    <td className={styles.num}>{row.daysPastDue}</td>
                    <td className={styles.num}>{formatCents(row.amountDueCents)}</td>
                    <td>{when(row.lastContactAt)}</td>
                    <td>{when(row.nextActionAt)}</td>
                    <td><Flags row={row} /></td>
                    <td><QueueRowActions accountId={row.id} phone={row.phone} frozen={row.activeFlags.includes("BANKRUPTCY")} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className={styles.cards}>
            {rows.map(row => (
              <article key={row.id} className={styles.card}>
                <h3><Link href={`/collections/accounts/${row.id}`}>{row.buyerName}</Link></h3>
                <p className={styles.muted}>{row.vehicleDescription ?? "—"} · Deal {row.dealNumber ?? "—"}</p>
                <p><strong>{row.daysPastDue} days late</strong> · {formatCents(row.amountDueCents)} due · last contact {when(row.lastContactAt)}</p>
                <p><Flags row={row} /></p>
                <QueueRowActions accountId={row.id} phone={row.phone} frozen={row.activeFlags.includes("BANKRUPTCY")} />
              </article>
            ))}
          </div>
        </>
      )}
    </>
  );
}
