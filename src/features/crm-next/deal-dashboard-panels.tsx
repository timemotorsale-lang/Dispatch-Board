"use client";
import Link from "next/link";
import type { buildDealDashboard } from "@/server/sales-documents/dashboard";
import { csvCell, moneyLabel } from "@/lib/money-resources";
import styles from "./deal-draft-workspace.module.css";

export type DealDashboardData = Awaited<ReturnType<typeof buildDealDashboard>>["dashboard"];
export function DealDashboardPanels({ data, report, onFilter }: { data: DealDashboardData; report: boolean; onFilter: (bucket: string) => void }) {
  const { summary, range, taxes } = data;
  function exportSummary() {
    const rows: unknown[][] = [["Deal activity summary", range.period, range.start, range.end], ["Scope", data.scope], ["Pathway group", "Open now", "Started in period", "Completed in period", "Vehicles sold"], ...summary.groups.map(group => [group.label, group.current, group.opened, group.completed, group.key === "SALES" ? group.sold : "Not a vehicle sale"]), ["Completed records without an event date (excluded)", summary.undatedCompleted]];
    if (taxes.summary) rows.push([], [taxes.message], ["Recorded sales", taxes.summary.saleCount], ["Recorded leases", taxes.summary.leaseCount], ["Taxable lease amount", (taxes.summary.taxableLeaseCents / 100).toFixed(2)], ["Upfront lease tax", (taxes.summary.totalCents / 100).toFixed(2)], ["Recorded sale taxable amount — separate DVS register", (taxes.summary.recordedSaleBaseCents / 100).toFixed(2)], ["Leases requiring review", taxes.summary.needsReview]);
    else rows.push(["Tax ledger unavailable", taxes.message]);
    const url = URL.createObjectURL(new Blob([rows.map(row => row.map(csvCell).join(",")).join("\r\n")], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = `deal-summary-${range.period}-${range.start}.csv`; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  if (!report) return <section aria-label="Deal overview"><div className={styles.metrics}>
    {([{ key: "attention", label: "Needs attention", value: summary.attention }, { key: "working", label: "Working", value: summary.working }, { key: "paperwork", label: "Sold · paperwork pending", value: summary.paperwork }, { key: "ready", label: "Ready to finalize", value: summary.ready }, { key: "funding", label: "Awaiting funding", value: summary.funding }, { key: "completed", label: "Completed in period", value: summary.completed }]).map(card => <button key={card.key} onClick={() => onFilter(card.key)}><strong>{card.value}</strong><span>{card.label}</span></button>)}
  </div><small>{range.start} – {range.end} · America/Chicago. Open work stays visible regardless of its start date. Cards can overlap; do not add them together.</small></section>;
  return <section className={styles.dashboardReport} aria-label="Period summary"><header><h2>{range.period === "day" ? "Daily" : range.period === "week" ? "Weekly" : "Monthly"} summary</h2><div className={styles.commands}><button onClick={exportSummary}>Export summary CSV</button><button onClick={() => window.print()}>Print summary</button></div></header>
    <p>{range.start} – {range.end} · America/Chicago · Weeks run Monday–Sunday.</p><p>{data.scope}</p>
    <div className={styles.tableWrap}><table><thead><tr><th>Pathway group</th><th>Open now</th><th>Started in period</th><th>Completed in period</th><th>Vehicles sold</th></tr></thead><tbody>{summary.groups.map(group => <tr key={group.key}><td>{group.label}</td><td>{group.current}</td><td>{group.opened}</td><td>{group.completed}</td><td>{group.key === "SALES" ? group.sold : "—"}</td></tr>)}</tbody><tfoot><tr><th>Total activity · all listed groups</th><th>{summary.groups.reduce((total, group) => total + group.current, 0)}</th><th>{summary.groups.reduce((total, group) => total + group.opened, 0)}</th><th>{summary.completed}</th><th>{summary.sold}</th></tr></tfoot></table></div>
    <p>Vehicle sales use the recorded sold date, or the first closed-packet date if no sold event exists. Sold vehicles may still await funding; completed counts require that the packet is not funding-pending.</p>
    <p><button onClick={() => onFilter("completed")}>View {summary.completed} completed records</button></p>
    <small>Completed counts use recorded sale/completion history or a closed packet’s finalization date—not its last edit date. Leases, rentals, loaners, test drives, repairs and products are not counted as vehicle sales. Revenue and gross profit are not estimated from draft values.</small>
    {summary.undatedCompleted > 0 && <p role="status">{summary.undatedCompleted} completed records have no recorded completion date and are excluded from period totals.</p>}
    <h3>Tax-ledger summary</h3><p>{taxes.message}</p>
    {taxes.summary && <><dl className={styles.reportTotals}><div><dt>Recorded vehicle sales</dt><dd>{taxes.summary.saleCount}</dd></div><div><dt>Recorded leases</dt><dd>{taxes.summary.leaseCount}</dd></div><div><dt>Taxable lease amount</dt><dd>{moneyLabel(taxes.summary.taxableLeaseCents)}</dd></div><div><dt>Upfront lease tax · state + local</dt><dd>{moneyLabel(taxes.summary.totalCents)}</dd></div><div><dt>Recorded sale taxable amount · separate DVS register</dt><dd>{moneyLabel(taxes.summary.recordedSaleBaseCents)}</dd></div></dl><p>{taxes.summary.needsReview} lease records need review. Ledger entries are counted once; voided records are excluded. These totals are preparation figures, not a filed return.</p></>}
    <Link href="/compliance">Review tax records in Compliance</Link>
  </section>;
}
