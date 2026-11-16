"use client";

import { useState } from "react";

import { formatCents } from "../domain/money-dates";
import { formValues, Panel, useAccountAction, type AccountDetail } from "./account-workspace";
import { label } from "./client-api";
import styles from "./collections.module.css";

const METHODS = ["ONLINE", "IN_PERSON", "PHONE", "CASH_AT_STORE", "ZELLE", "OTHER"];

export function PromisesPanel({ d }: { d: AccountDetail }) {
  const { busy, run, feedback } = useAccountAction(d.account.id);
  const frozen = d.activeFlags.some((f: { type: string }) => f.type === "BANKRUPTCY");
  const [rows, setRows] = useState([{ date: "", amount: "" }, { date: "", amount: "" }]);
  const activePlan = d.plans.find((p: { status: string }) => p.status === "ACTIVE");
  const total = rows.reduce((sum, row) => sum + (Number(row.amount.replace(/[$,]/g, "")) || 0), 0);

  return (
    <Panel id="promise" title="Promises, payment plans and reported payments">
      {feedback}
      {frozen ? <p className={styles.freeze}>Bankruptcy freeze: don&apos;t make collection arrangements on this account.</p> : null}

      <h3>Open promises</h3>
      {d.openPromises.length === 0 ? <p className={styles.muted}>No open promises.</p> : (
        <ul className={styles.timeline}>
          {d.openPromises.map((p: { id: string; amountCents: number; date: string; source: string; planId: string | null }) => (
            <li key={p.id}>
              <strong>{formatCents(p.amountCents)}</strong> on {p.date} {p.source === "IMPORTED_FROM_DMS" ? <span className={styles.badge}>from DealerCenter</span> : p.planId ? <span className={styles.badge}>plan payment</span> : null}
              {!p.planId ? (
                <form className={styles.actions} onSubmit={event => void run("CANCEL_PROMISE", { promiseId: p.id, ...formValues(event) })}>
                  <label className={styles.srOnly} htmlFor={`cancel-${p.id}`}>Reason for cancelling</label>
                  <input id={`cancel-${p.id}`} name="reason" placeholder="Reason to cancel" minLength={5} required />
                  <button disabled={busy}>Cancel promise</button>
                </form>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {!frozen ? (
        <>
          <h3>Record a promise</h3>
          <form className={styles.form} onSubmit={event => { const form = event.currentTarget; void run("RECORD_PROMISE", formValues(event), () => form.reset()); }}>
            <label>Amount ($)<input name="amount" inputMode="decimal" required placeholder="200.00" /></label>
            <label>Promised date<input type="date" name="promisedDate" required /></label>
            <label className={styles.wide}>Notes<input name="notes" placeholder="What did they say?" /></label>
            <div className={`${styles.actions} ${styles.wide}`}><button className={styles.primary} disabled={busy}>Save promise</button></div>
          </form>

          <h3>{activePlan ? "Replace the payment plan" : "Create a payment plan"}</h3>
          {activePlan ? <p className={styles.muted}>Saving a new plan replaces the current one ({formatCents(activePlan.totalCatchUpCents)} in {activePlan.installments.length} payments).</p> : null}
          <form className={styles.form} onSubmit={event => { const v = formValues(event); void run("CREATE_PLAN", { reason: v.reason, installments: rows }, () => setRows([{ date: "", amount: "" }, { date: "", amount: "" }])); }}>
            {rows.map((row, i) => (
              <fieldset key={i} className={styles.wide} style={{ border: 0, padding: 0, margin: 0, display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 8, alignItems: "end" }}>
                <legend className={styles.srOnly}>Payment {i + 1}</legend>
                <label>Payment {i + 1} date<input type="date" value={row.date} onChange={e => setRows(r => r.map((x, j) => (j === i ? { ...x, date: e.target.value } : x)))} required /></label>
                <label>Amount ($)<input inputMode="decimal" value={row.amount} onChange={e => setRows(r => r.map((x, j) => (j === i ? { ...x, amount: e.target.value } : x)))} required /></label>
                <button type="button" disabled={rows.length <= 2} onClick={() => setRows(r => r.filter((_, j) => j !== i))} aria-label={`Remove payment ${i + 1}`}>Remove</button>
              </fieldset>
            ))}
            <div className={`${styles.actions} ${styles.wide}`}><button type="button" onClick={() => setRows(r => [...r, { date: "", amount: "" }])} disabled={rows.length >= 52}>Add payment</button><span>Total: ${total.toFixed(2)}</span></div>
            <label className={styles.wide}>Reason for the plan<input name="reason" required minLength={5} /></label>
            <div className={`${styles.actions} ${styles.wide}`}><button className={styles.primary} disabled={busy}>Save plan</button></div>
          </form>
        </>
      ) : null}

      {d.plans.length ? (
        <>
          <h3>Plans</h3>
          {d.plans.map((plan: { id: string; status: string; reason: string; totalCatchUpCents: number; installments: Array<{ id: string; number: number; amountCents: number; date: string; status: string }> }) => (
            <div key={plan.id} className={styles.card}>
              <p><strong>{label(plan.status)}</strong> · {formatCents(plan.totalCatchUpCents)} · {plan.reason}</p>
              <ul>{plan.installments.map(i => <li key={i.id}>#{i.number}: {formatCents(i.amountCents)} on {i.date} · {label(i.status)}</li>)}</ul>
              {plan.status === "ACTIVE" ? (
                <form className={styles.actions} onSubmit={event => void run("CANCEL_PLAN", { planId: plan.id, ...formValues(event) })}>
                  <label className={styles.srOnly} htmlFor={`plan-${plan.id}`}>Reason for cancelling the plan</label>
                  <input id={`plan-${plan.id}`} name="reason" placeholder="Reason to cancel" minLength={5} required />
                  <button disabled={busy}>Cancel plan</button>
                </form>
              ) : null}
            </div>
          ))}
        </>
      ) : null}

      <h3>Customer says they already paid</h3>
      <form className={styles.form} onSubmit={event => { const form = event.currentTarget; void run("REPORT_PAYMENT", formValues(event), () => form.reset()); }}>
        <label>Amount ($)<input name="amount" inputMode="decimal" required /></label>
        <label>How<select name="method">{METHODS.map(m => <option key={m} value={m}>{label(m)}</option>)}</select></label>
        <label>Paid on<input type="date" name="paidDate" required /></label>
        <label>Reference / confirmation #<input name="referenceNumber" /></label>
        <label className={styles.wide}>Notes<input name="notes" /></label>
        <p className={`${styles.muted} ${styles.wide}`}>It&apos;s confirmed automatically when a later DealerCenter import shows it. Remember to post Zelle and other outside payments in DealerCenter.</p>
        <div className={`${styles.actions} ${styles.wide}`}><button className={styles.primary} disabled={busy}>Save reported payment</button></div>
      </form>
      {d.reportedPayments.length ? (
        <ul className={styles.timeline}>
          {d.reportedPayments.map((r: { id: string; amountCents: number; method: string; paidDate: string; status: string }) => (
            <li key={r.id}>{formatCents(r.amountCents)} by {label(r.method)} on {r.paidDate} · <span className={`${styles.badge} ${r.status === "NOT_FOUND" ? styles.badgeBad : r.status === "CONFIRMED_BY_IMPORT" ? styles.badgeGood : ""}`}>{label(r.status)}</span>
              {r.status === "PENDING_CONFIRMATION" || r.status === "NOT_FOUND" ? (
                <form className={styles.actions} onSubmit={event => void run("CANCEL_REPORTED_PAYMENT", { reportedPaymentId: r.id, ...formValues(event) })}>
                  <label className={styles.srOnly} htmlFor={`rp-${r.id}`}>Reason</label>
                  <input id={`rp-${r.id}`} name="reason" placeholder="Reason to cancel" minLength={5} required /><button disabled={busy}>Cancel</button>
                </form>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </Panel>
  );
}
