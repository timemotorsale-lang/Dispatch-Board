"use client";

import { useState } from "react";

import { allocationLabel, type Allocation } from "../domain/ledger";
import { formatCents } from "../domain/money-dates";
import type { getAccountLedger } from "../server/ledger-service";
import { formValues, Panel, useAccountAction, type AccountDetail } from "./account-workspace";
import { label } from "./client-api";
import styles from "./collections.module.css";
import { formatDay } from "../domain/account-ref";

type Ledger = Awaited<ReturnType<typeof getAccountLedger>>;
const TYPES = ["PAYMENT", "LATE_FEE", "FEE", "LATE_FEE_WAIVER", "CREDIT", "ADJUSTMENT", "PAYMENT_REVERSAL", "RETURNED_PAYMENT", "PAYOFF", "SIDE_NOTE_PAYMENT", "REPO_EXPENSE", "SALE_PROCEEDS", "CHARGE_OFF", "RECOVERY", "OPENING_BALANCE"];
const REVERSAL = new Set(["PAYMENT_REVERSAL", "RETURNED_PAYMENT"]);

/** Account page: the shadow servicing ledger (spec 25). DealerCenter stays the official record in Release 1. */
export function LedgerPanel({ d, l }: { d: AccountDetail; l: Ledger }) {
  const { busy, run, feedback } = useAccountAction(d.account.id);
  const [type, setType] = useState("PAYMENT");
  const [method, setMethod] = useState("FIXED_PAYMENT");
  return (
    <Panel id="ledger" title="Servicing ledger (shadow)" open={false}>
      {feedback}
      <p className={styles.notice}>Official record: <strong>{l.systemOfRecord === "DEALERCENTER" ? "DealerCenter" : l.systemOfRecord}</strong>. This is the app&apos;s own calculation, kept alongside so it can be checked against DealerCenter. Nothing here charges the customer or changes DealerCenter.</p>
      {!l.contract ? (
        l.canPost ? (
          <>
            <p className={styles.muted}>No servicing contract yet. Stage 15&apos;s DealerCenter history import creates these; you can also enter one by hand to try it.</p>
            <form className={styles.form} onSubmit={event => void run("CREATE_CONTRACT", formValues(event))}>
              <label>How it works<select name="calcMethod" value={method} onChange={e => setMethod(e.target.value)}><option value="FIXED_PAYMENT">Fixed payments (precomputed)</option><option value="SIMPLE_INTEREST">Simple interest (daily)</option></select></label>
              <label>Frequency<select name="frequency"><option value="WEEKLY">Weekly</option><option value="BIWEEKLY">Every 2 weeks</option><option value="SEMIMONTHLY">Twice a month</option><option value="MONTHLY">Monthly</option></select></label>
              <label>Payment amount ($)<input name="paymentAmount" inputMode="decimal" required /></label>
              <label>Number of payments<input name="numberOfPayments" inputMode="numeric" required /></label>
              <label>Contract date<input type="date" name="contractDate" /></label>
              <label>First due date<input type="date" name="firstDueDate" required /></label>
              {method === "FIXED_PAYMENT" ? <label>Total of payments ($, blank = payment × count)<input name="totalOfPayments" inputMode="decimal" /></label> : <>
                <label>Amount financed ($)<input name="amountFinanced" inputMode="decimal" required /></label>
                <label>APR (%)<input name="apr" inputMode="decimal" required /></label>
              </>}
              <label>Side note ($)<input name="sideNote" inputMode="decimal" /></label>
              <div className={`${styles.actions} ${styles.wide}`}><button className={styles.primary} disabled={busy}>Create shadow contract</button></div>
            </form>
          </>
        ) : <p className={styles.muted}>No servicing contract yet.</p>
      ) : (
        <>
          <dl className={styles.dl}>
            <dt>Contract</dt><dd>{label(l.contract.calcMethod)} · {l.contract.numberOfPayments} {label(l.contract.frequency).toLowerCase()} payments of {formatCents(l.contract.paymentAmountCents)}{l.contract.aprBasisPoints ? ` · ${(l.contract.aprBasisPoints / 100).toFixed(2)}% APR` : ""} · schedule v{l.scheduleVersion}</dd>
            <dt>Total balance</dt><dd>{formatCents(l.state.totalBalanceCents)}</dd>
            <dt>Past due</dt><dd>{formatCents(l.state.pastDueCents)} · {l.state.daysPastDue} days</dd>
            <dt>Payment due now</dt><dd>{formatCents(l.state.amountDueCents)}{l.state.nextDue ? ` · next #${l.state.nextDue.number} ${formatCents(l.state.nextDue.amountCents)} on ${formatDay(l.state.nextDue.dueDate)}` : ""}</dd>
            <dt>Fees / late fees</dt><dd>{formatCents(l.state.feesCents)} / {formatCents(l.state.lateFeesCents)}</dd>
            {l.contract.calcMethod === "SIMPLE_INTEREST" ? <><dt>Principal / interest to date</dt><dd>{formatCents(l.state.principalCents)} / {formatCents(l.state.accruedInterestCents)}</dd></> : null}
            {l.state.chargedOffCents ? <><dt>Charged off / recovered</dt><dd>{formatCents(l.state.chargedOffCents)} / {formatCents(l.state.recoveredCents)}</dd></> : null}
          </dl>
          {l.state.warnings.map(w => <p key={w} className={styles.warning}>{w}</p>)}
          <details><summary>Schedule ({l.state.installments.length} payments)</summary>
            <div className={styles.tableWrap}><table className={styles.table}>
              <thead><tr><th scope="col">#</th><th scope="col">Due</th><th scope="col">Amount</th><th scope="col">Paid</th></tr></thead>
              <tbody>{l.state.installments.map(i => <tr key={i.number}><th scope="row">{i.number}</th><td>{formatDay(i.dueDate)}</td><td>{formatCents(i.amountCents)}</td><td>{i.paidCents >= i.amountCents ? `Paid ${i.paidOn ?? ""}` : i.paidCents ? formatCents(i.paidCents) : "—"}</td></tr>)}</tbody>
            </table></div>
          </details>
          <h3>Entries (never edited; corrections are reversals)</h3>
          {l.transactions.length ? (
            <ul className={styles.timeline}>
              {l.transactions.map(t => (
                <li key={t.id} style={{ opacity: t.reversed ? 0.55 : 1 }}>
                  <strong>{label(t.type)}</strong> {t.type === "CHARGE_OFF" || REVERSAL.has(t.type) ? "" : formatCents(t.amountCents)} · {formatDay(t.effectiveDate)} · {label(t.source)}{t.reversed ? " · reversed" : ""}{t.memo ? ` · ${t.memo}` : ""}
                  {t.split.length ? <><br /><small>Split: {(t.split as Allocation[]).map(a => `${allocationLabel(a)} ${formatCents(a.amountCents)}`).join(", ")}</small></> : null}
                </li>
              ))}
            </ul>
          ) : <p className={styles.muted}>No entries yet.</p>}
          {l.canPost ? (
            <form className={styles.form} onSubmit={event => { const f = event.currentTarget; void run("POST_LEDGER_TRANSACTION", formValues(event), () => f.reset()); }}>
              <label>Entry<select name="type" value={type} onChange={e => setType(e.target.value)}>{TYPES.map(t => <option key={t} value={t}>{label(t)}</option>)}</select></label>
              {REVERSAL.has(type) ? (
                <label>Payment to reverse<select name="reversesTransactionId" required>{l.transactions.filter(t => !t.reversed && ["PAYMENT", "PAYOFF", "RECOVERY", "SALE_PROCEEDS", "SIDE_NOTE_PAYMENT", "CREDIT"].includes(t.type)).map(t => <option key={t.id} value={t.id}>{label(t.type)} {formatCents(t.amountCents)} on {t.effectiveDate}</option>)}</select></label>
              ) : type !== "CHARGE_OFF" ? <label>Amount ($){type === "ADJUSTMENT" ? " (minus = reduce)" : ""}<input name="amount" inputMode="decimal" required /></label> : null}
              <label>Effective date<input type="date" name="effectiveDate" /></label>
              <label>Source<select name="source"><option value="MANUAL">Manual</option><option value="CASH_DRAWER">Cash drawer</option><option value="ZELLE">Zelle</option><option value="MONEY_ORDER">Money order</option><option value="PROCESSOR">Processor</option></select></label>
              <label className={styles.wide}>Memo (reason required for reversals, waivers, credits, adjustments, charge-offs)<input name="memo" /></label>
              <div className={`${styles.actions} ${styles.wide}`}><button disabled={busy}>Record in shadow ledger</button></div>
            </form>
          ) : null}
        </>
      )}
    </Panel>
  );
}
