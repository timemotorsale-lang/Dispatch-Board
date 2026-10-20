"use client";

import { useState, type FormEvent } from "react";
import { moneyLabel, moneyToday } from "@/lib/money-resources";
import type { MoneyResourcesModel } from "@/server/money-resources/service";
import type { MoneyExpenseReport } from "@/server/money-resources/report";
import styles from "./workbench.module.css";

export function ExpenseReport({ model }: { model: MoneyResourcesModel }) {
  const [report, setReport] = useState<MoneyExpenseReport | null>(null), [query, setQuery] = useState("");
  const [error, setError] = useState(""), [busy, setBusy] = useState(false);
  async function load(params: URLSearchParams) {
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/money-resources/reports?${params}`, { cache: "no-store" }), result = await response.json();
      if (!response.ok) throw new Error(result.error || "Expense report unavailable.");
      setReport(result); setQuery(params.toString());
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Expense report unavailable."); }
    finally { setBusy(false); }
  }
  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const params = new URLSearchParams(); for (const [key, value] of new FormData(event.currentTarget)) if (typeof value === "string" && value) params.set(key, value); void load(params); }
  function page(number: number) { const params = new URLSearchParams(query); params.set("page", String(number)); void load(params); }
  return <section className={styles.panel} aria-label="Expense report"><h2>Expense report</h2><p>Purchases and refunds only. Advances, reimbursements and card bill payments are not counted twice. Staff see their own expenses; managers see their organization. Policy exceptions remain in history after approval; the approval status shows whether management has reviewed them.</p>
    <form className={styles.form} onSubmit={submit}>
      <label>From date<input name="from" type="date" defaultValue={moneyToday()} required /></label><label>To date<input name="to" type="date" defaultValue={moneyToday()} required /></label>
      {model.manager ? <label>Employee<select name="employeeId" aria-label="Employee"><option value="">All staff</option>{model.users.map(user => <option value={user.id} key={user.id}>{user.name}</option>)}</select></label> : null}
      <label>Vendor<select name="vendorId" aria-label="Vendor"><option value="">All vendors / merchants</option>{model.vendors.map(vendor => <option value={vendor.id} key={vendor.id}>{vendor.name}</option>)}</select></label>
      <label>Card / funding source<select name="accountId" aria-label="Card / funding source"><option value="">All funding sources</option>{model.accounts.map(source => <option value={source.id} key={source.id}>{source.label}{source.lastFour ? ` · •••• ${source.lastFour}` : ""}</option>)}</select></label>
      <label>Approval status<select name="status" aria-label="Approval status"><option value="">All current statuses</option>{["PENDING", "APPROVED", "REJECTED", "SETTLED", "SUPERSEDED"].map(status => <option key={status}>{status}</option>)}</select></label>
      <label>Vehicle<select name="vehicleId" aria-label="Vehicle"><option value="">All vehicles / departments</option>{model.vehicles.map(vehicle => <option value={vehicle.id} key={vehicle.id}>{[vehicle.year, vehicle.make, vehicle.model, vehicle.stockNumber || vehicle.vehicleNumber].join(" · ")}</option>)}</select></label>
      <label>Repair order<select name="repairOrderId" aria-label="Repair order"><option value="">All repair orders</option>{model.orders.map(order => <option value={order.id} key={order.id}>{order.repairOrderNumber}</option>)}</select></label>
      <label>Receipt evidence<select name="evidence" aria-label="Receipt evidence"><option value="">All evidence</option><option value="MISSING">Missing receipt</option><option value="ATTACHED">Receipt attached</option><option value="EXCEPTION">Exception explained</option></select></label>
      <label>Group totals by<select name="groupBy" aria-label="Group totals by"><option value="employee">Employee</option><option value="vendor">Vendor</option><option value="account">Card / funding source</option><option value="category">Category</option></select></label>
      <label className={styles.check}><input type="checkbox" name="exceptions" value="1" />Exceptions only</label><button disabled={busy} type="submit">{busy ? "Preparing report…" : "View expense report"}</button>
    </form>{error ? <p role="alert" className={styles.error}>{error}</p> : null}
    {report ? <><h3>{report.from} to {report.to}</h3><p>{report.filterSummary.join(" · ")}</p><p role="status">{report.totals.count} records · purchases {moneyLabel(report.totals.purchasesCents)} · refunds {moneyLabel(report.totals.refundsCents)} · <strong>net spending {moneyLabel(report.totals.netCents)}</strong> · {report.totals.exceptions} exceptions</p>
      <div className={styles.actions}><a href={`/api/money-resources/reports?${query}&format=csv`}>Export complete report CSV</a><a target="_blank" rel="noreferrer" href={`/money-resources/expense-report/print?${query}`}>Print complete report</a></div>
      {report.unmatchedCardCharges !== null ? <p>{report.unmatchedCardCharges} unmatched company-card statement lines in this date range (organization/card scope, not limited by employee or vehicle). Review these under Card transactions; they are not added as duplicate expenses.</p> : null}
      <ul>{report.groups.map(group => <li key={group.label}>{group.label} · {group.count} records · {moneyLabel(group.netCents)}</li>)}</ul>
      {report.rows.map(row => <article className={styles.row} key={row.id}><div><strong>{row.date} · {row.vendor} · {moneyLabel(row.expenseEffectCents)}</strong><p>{row.purpose}</p><small>{row.employee} · entered by {row.recordedBy} · {row.account} · {row.approvalStatus}</small><p>{row.vehicle} {row.repairOrder} · receipt: {row.receipt} · prior approval: {row.priorApproval}</p>{row.flags.map(flag => <p className={styles.flag} key={flag}>{flag}</p>)}</div><div>{row.receiptUrl ? <a href={row.receiptUrl} target="_blank" rel="noreferrer">View receipt</a> : null}<p><a href={`/money-resources?date=${row.date}&action=review`}>Review transaction date</a></p></div></article>)}
      {!report.rows.length ? <p>No expenses match these filters.</p> : null}
      <div className={styles.actions}><button disabled={busy || report.page <= 1} onClick={() => page(report.page - 1)}>Previous</button><span>Page {report.page} · totals cover every matching record</span><button disabled={busy || report.page * report.pageSize >= report.totals.count} onClick={() => page(report.page + 1)}>Next</button></div>
    </> : null}
  </section>;
}
