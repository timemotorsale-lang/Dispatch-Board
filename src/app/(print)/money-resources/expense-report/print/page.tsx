import { requireCurrentUser } from "@/server/auth/current-user";
import { moneyExpenseReport, type MoneyExpenseReport } from "@/server/money-resources/report";
import { moneyLabel, MoneyError } from "@/lib/money-resources";
import { ExpensePrintButton } from "@/features/money-resources/print-button";
import styles from "@/features/money-resources/workbench.module.css";

export const dynamic = "force-dynamic";
export default async function ExpenseReportPrint({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const actor = await requireCurrentUser(), params = new URLSearchParams();
  for (const [key, value] of Object.entries(await searchParams)) if (typeof value === "string") params.set(key, value);
  let report: MoneyExpenseReport | null = null, failure = "";
  try { report = await moneyExpenseReport(actor, params, true); }
  catch (error) { failure = error instanceof MoneyError ? error.message : "The report could not be prepared. Return to the expense report and retry."; }
  if (!report) return <main className={styles.printPage}><h1>Expense report unavailable</h1><p>{failure}</p><a href="/money-resources">Return to Money & Resources</a></main>;
    return <main className={styles.printPage}><div className={styles.noPrint}><a href="/money-resources">Return to Money & Resources</a> <ExpensePrintButton /></div><h1>Expense report</h1><p>{report.from} to {report.to} · Prepared for {actor.name} · {report.totals.count} records</p><p>Purchases {moneyLabel(report.totals.purchasesCents)} · refunds {moneyLabel(report.totals.refundsCents)} · <strong>Net {moneyLabel(report.totals.netCents)}</strong> · {report.totals.exceptions} exceptions</p><p>{report.filterSummary.join(" · ")}. Complete filtered report; not only the displayed page. Operational accountability, not general-ledger posting.</p>
      <ul>{report.groups.map(group => <li key={group.label}>{group.label}: {moneyLabel(group.netCents)} ({group.count} records)</li>)}</ul>
      {report.rows.map(row => <article key={row.id}><h2>{row.date} · {row.vendor} · {moneyLabel(row.expenseEffectCents)}</h2><p>{row.purpose}</p><p>{row.employee} · entered by {row.recordedBy} · {row.account} · {row.approvalStatus} · receipt: {row.receipt}</p><p>{row.vehicle} · {row.repairOrder} · reference: {row.reference || "Not recorded"}</p>{row.flags.length ? <p>Exceptions: {row.flags.join("; ")}</p> : null}<small>Record {row.id}</small></article>)}{!report.rows.length ? <p>No matching expenses.</p> : null}
    </main>;
}
