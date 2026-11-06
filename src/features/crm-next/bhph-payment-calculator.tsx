"use client";
import { calculateBhphPayment, bhphPaymentSummary, type BhphPaymentInput, type BhphPaymentSchedule } from "@/lib/bhph-payment";
import { cashMoney } from "@/lib/cash-retail-sale";
import styles from "./crm-next-shell.module.css";

export function BhphPaymentCalculator({ principalCents, terms, saleDate, onChange, withoutAddOnsPrincipalCents }: { principalCents: number | null; terms: BhphPaymentInput; saleDate: string; onChange: (key: keyof BhphPaymentInput, value: string) => void; withoutAddOnsPrincipalCents?: number }) {
  let schedule: BhphPaymentSchedule | null = null, issue = "";
  if (principalCents !== null) try { schedule = calculateBhphPayment(principalCents, terms, saleDate); } catch (error) { issue = error instanceof Error ? error.message : "Review the payment inputs."; }
  let comparison: { with: ReturnType<typeof bhphPaymentSummary>; without: ReturnType<typeof bhphPaymentSummary> } | null = null;
  if (schedule && principalCents !== null && withoutAddOnsPrincipalCents !== undefined) comparison = { with: bhphPaymentSummary(principalCents, terms, saleDate), without: bhphPaymentSummary(withoutAddOnsPrincipalCents, terms, saleDate) };
  return <section aria-label="BHPH payment calculator" data-deal-state-managed>
    <h3>Calculate the payment schedule</h3>
    <div className={styles.retailFieldGrid}>
      <label><span>Calculate using</span><select value={terms.calculationMode} onChange={event => onChange("calculationMode", event.target.value)}><option value="TERM">Term — calculate payment</option><option value="PAYMENT_AMOUNT">Fixed payment — calculate term</option></select></label>
      <label><span>Annual rate (%)</span><input inputMode="decimal" value={terms.apr} onChange={event => onChange("apr", event.target.value)} /></label>
      <label><span>Payment frequency</span><select value={terms.paymentFrequency} onChange={event => onChange("paymentFrequency", event.target.value)}><option>Weekly</option><option>Biweekly</option><option>Semimonthly</option><option>Monthly</option></select></label>
      {terms.calculationMode === "TERM" ? <label><span>Term (months)</span><input type="number" min="1" max="120" step="1" value={terms.termMonths} onChange={event => onChange("termMonths", event.target.value)} /></label> : <label><span>Fixed payment amount</span><input inputMode="decimal" placeholder="500.00" value={terms.paymentAmount} onChange={event => onChange("paymentAmount", event.target.value)} /></label>}
      <label><span>First payment date</span><input type="date" value={terms.firstPaymentDate} onChange={event => onChange("firstPaymentDate", event.target.value)} /></label>
      {schedule && (terms.calculationMode === "TERM" ? <label><span>Calculated payment</span><input readOnly value={cashMoney(schedule.regularPaymentCents)} /></label> : <label><span>Calculated term</span><input readOnly value={`${schedule.numberOfPayments} ${terms.paymentFrequency.toLowerCase()} payments (about ${Number(schedule.estimatedTermMonths.toFixed(2))} months)`} /></label>)}
    </div>
    {principalCents === null && <p>Complete the sale amounts, taxes and registration fee above to calculate the schedule.</p>}
    {issue && <p role="alert">{issue}</p>}
    {comparison && <section aria-label="Optional product payment comparison"><h4>With and without selected optional products</h4><div style={{ overflowX: "auto" }}><table><thead><tr><th scope="col">Quote</th><th scope="col">Amount financed</th><th scope="col">Payment</th><th scope="col">Count</th><th scope="col">Final payment</th><th scope="col">Total payments</th></tr></thead><tbody>{(["without", "with"] as const).map(key => <tr key={key}><th scope="row">{key === "with" ? "With optional products" : "Without optional products"}</th><td>{cashMoney(comparison![key].amountFinancedCents)}</td><td>{cashMoney(comparison![key].regularPaymentCents)}</td><td>{comparison![key].numberOfPayments}</td><td>{cashMoney(comparison![key].finalPaymentCents)}</td><td>{cashMoney(comparison![key].totalPaymentsCents)}</td></tr>)}</tbody></table></div></section>}
    {schedule && <><div className={styles.rentalSummaryStrip}>
      <div><span>Regular payment</span><strong>{cashMoney(schedule.regularPaymentCents)}</strong></div>
      <div><span>Number of payments</span><strong>{schedule.numberOfPayments}</strong></div>
      <div><span>Final payment</span><strong>{cashMoney(schedule.finalPaymentCents)}</strong></div>
      <div><span>Last payment date</span><strong>{schedule.lastPaymentDate}</strong></div>
      <div><span>Estimated interest</span><strong>{cashMoney(schedule.totalInterestCents)}</strong></div>
      <div><span>Total payments</span><strong>{cashMoney(schedule.totalPaymentsCents)}</strong></div>
    </div><details><summary>Review calculated payments</summary><div style={{ maxHeight: 320, overflow: "auto" }}><table><thead><tr><th scope="col">#</th><th scope="col">Due</th><th scope="col">Payment</th><th scope="col">Interest</th><th scope="col">Principal</th><th scope="col">Balance</th></tr></thead><tbody>{schedule.payments.map(payment => <tr key={payment.number}><td>{payment.number}</td><td>{payment.dueDate}</td><td>{cashMoney(payment.amountCents)}</td><td>{cashMoney(payment.interestCents)}</td><td>{cashMoney(payment.principalCents)}</td><td>{cashMoney(payment.balanceCents)}</td></tr>)}</tbody></table></div></details></>}
    <small>Payment estimates use equal periodic interest at the entered annual rate. Final contract APR and credit disclosures are reviewed separately. Changing the inactive mode’s stored value does not affect this calculation.</small>
  </section>;
}
