"use client";

import Image from "next/image";
import { useId, useMemo, useState } from "react";
import { CarFront, ChevronRight, ShieldCheck } from "lucide-react";
import { affordablePrice, estimateCashPurchase, estimatePayment, parseMoney } from "./engine";
import type { PaymentPolicy } from "./policy";
import styles from "./calculator.module.css";

const dollars = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value / 100);

export function PaymentCalculator({ policy, imageSrc, inventoryHref, initialSelection }: { policy: PaymentPolicy; imageSrc?: string; inventoryHref?: string; initialSelection?: { priceCents: number; mode: "cash" | "vehicle" } }) {
  const identifier = useId();
  const validSelection = initialSelection && Number.isSafeInteger(initialSelection.priceCents) && initialSelection.priceCents > 0 && initialSelection.priceCents <= 100000000 && ["cash", "vehicle"].includes(initialSelection.mode) ? initialSelection : undefined;
  const [mode, setMode] = useState<"budget" | "vehicle" | "cash">(validSelection?.mode || "budget");
  const [amount, setAmount] = useState(validSelection ? (validSelection.priceCents / 100).toFixed(2) : "");
  const [down, setDown] = useState("");
  const [term, setTerm] = useState("");
  const [additional, setAdditional] = useState("");
  const [feesConfirmed, setFeesConfirmed] = useState(false);
  const [scenarioConfirmed, setScenarioConfirmed] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const calculation = useMemo(() => {
    if (!attempted) return { estimate: null, cashEstimate: null, error: "" };
    try {
      const input = {
        additionalFeesCents: additional.trim() ? parseMoney(additional, "additional charges") : null,
        additionalFeesConfirmed: feesConfirmed, standardScenarioConfirmed: scenarioConfirmed
      };
      const principal = parseMoney(amount, mode === "budget" ? "monthly budget" : "vehicle price");
      if (mode === "cash") return { estimate: null, cashEstimate: estimateCashPurchase(policy, { ...input, priceCents: principal }), error: "" };
      const loanInput = { ...input, downPaymentCents: parseMoney(down, "down payment"), termMonths: Number(term) };
      const estimate = mode === "budget" ? affordablePrice(policy, { ...loanInput, budgetCents: principal }) : estimatePayment(policy, { ...loanInput, priceCents: principal });
      return { estimate, cashEstimate: null, error: estimate ? "" : "No vehicle price fits these assumptions. Review your budget, down payment and charges." };
    } catch (error) {
      return { estimate: null, cashEstimate: null, error: error instanceof Error ? error.message : "Check the estimate inputs." };
    }
  }, [attempted, mode, amount, down, term, additional, feesConfirmed, scenarioConfirmed, policy]);
  const estimate = calculation.estimate;
  const cashEstimate = calculation.cashEstimate;
  const cash = mode === "cash";
  const interest = policy.annualInterestBasisPoints / 100;
  const tax = policy.salesTaxPartsPerMillion / 10000;

  return (
    <section className={styles.calculator} aria-label="Private payment calculator preview">
      <div className={styles.visual}>
        <span className={styles.badge}>Private review · Draft assumptions</span>
        <h2>{cash ? <>Your cash price.<br />The whole picture.</> : <>Your budget.<br />Your next step.</>}</h2>
        <p>{cash ? "See an estimated out-the-door cost, including the entered tax and fee assumptions. No account or purchase commitment." : "Explore a payment estimate without creating an account or checking credit. No application is submitted."}</p>
        {imageSrc ? <Image className={styles.image} src={imageSrc} width={720} height={480} alt="Illustrative sample SUV, not advertised dealership inventory" unoptimized /> : <div className={styles.vehicleIllustration}><CarFront size={92} aria-hidden="true" /><p>Vehicle photography is available in the private customer preview.</p></div>}
        <div className={styles.payment} role="status" aria-live="polite">
          {cashEstimate ? <><span>Estimated out-the-door total</span><strong>{dollars(cashEstimate.totalDueCents)}</strong><span>Vehicle cash price: {dollars(cashEstimate.priceCents)}</span></> : estimate ? <><span>Estimated regular monthly payment</span><strong>{dollars(estimate.monthlyPaymentCents)}<small> / month</small></strong><span>{mode === "budget" ? `Estimated cash-price ceiling: ${dollars(estimate.priceCents)}` : `Vehicle cash price: ${dollars(estimate.priceCents)}`}</span></> : <><strong>Your estimate appears here</strong><span>Complete the inputs and confirm the fee assumptions.</span></>}
        </div>
        <p className={styles.disclaimer}>{cash ? "Estimate—not a final purchase agreement. Final taxes and charges depend on the vehicle and transaction and must be verified by staff. No loan interest or financing-only lien fee is included." : `${interest}% annual interest assumption—not a quoted APR. Actual rates, eligibility, accrual, rounding and final charges depend on the lender and transaction. This is not prequalification, approval or an offer of credit.`}</p>
      </div>

      <div className={styles.workspace}>
        <div className={styles.mode} aria-label="Estimate method">
          {(["budget", "vehicle", "cash"] as const).map(value => <button type="button" key={value} aria-pressed={mode === value} onClick={() => { setMode(value); setAmount(""); setAttempted(false); }}>{value === "budget" ? "Shop by budget" : value === "cash" ? "Cash purchase" : "Estimate a vehicle"}</button>)}
        </div>
        <h3>{cash ? "Estimate your out-the-door cost" : "Plan your payment"}</h3>
        <p className={styles.muted}>{cash ? "Start with the vehicle price, then confirm the applicable charges." : "Three simple inputs, with the assumptions kept in view."}</p>
        <form noValidate onSubmit={event => { event.preventDefault(); setAttempted(true); }}>
          <label htmlFor={`${identifier}-amount`}>{mode === "budget" ? "Desired monthly budget ($)" : "Vehicle cash price ($)"}</label>
          <input id={`${identifier}-amount`} type="number" inputMode="decimal" min="0.01" max="1000000" step="0.01" value={amount} onChange={event => setAmount(event.target.value)} required />
          {!cash ? <div className={styles.twoColumns}>
            <div><label htmlFor={`${identifier}-down`}>Down payment ($)</label><input id={`${identifier}-down`} type="number" inputMode="decimal" min="0" max="1000000" step="0.01" value={down} onChange={event => setDown(event.target.value)} required /></div>
            <div><label htmlFor={`${identifier}-term`}>Loan term</label><select id={`${identifier}-term`} value={term} onChange={event => setTerm(event.target.value)} required><option value="">Choose a term</option>{policy.terms.map(months => <option value={months} key={months}>{months} months</option>)}</select></div>
          </div> : null}
          <p className={styles.assumption}>{cash ? "Cash purchase · No loan interest · No financing-only lien fee" : `${interest}% annual interest · Down payment upfront · Applicable taxes and fees financed`}</p>
          <details className={styles.assumptions} open>
            <summary>Minnesota tax & fee assumptions — required</summary>
            <p>Standard retail passenger-vehicle transfer only. No trade-in, rebate, exemption, special tax treatment or optional products. Trade-in calculations are deferred.</p>
            <ul><li>{tax}% vehicle sales tax on the vehicle cash price—not on the documentation or transfer fees.</li><li>Documentation fee: up to {dollars(policy.documentationFeeCents)}, capped at 10% of sale value and the legal $350 maximum.</li><li>Typical transfer reference: {dollars(policy.baseFees.reduce((sum, fee) => sum + fee.cents, 0))}{cash ? ". No loan lien fee for this cash purchase." : `, plus ${dollars(policy.lienFeeCents)} for one recorded loan lien when financing is needed.`}</li></ul>
            <label htmlFor={`${identifier}-additional`}>Additional registration, plate & local charges ($)</label>
            <input id={`${identifier}-additional`} type="number" inputMode="decimal" min="0" max="1000000" step="0.01" value={additional} onChange={event => setAdditional(event.target.value)} aria-describedby={`${identifier}-fee-help`} required />
            <p id={`${identifier}-fee-help`}>Staff-entered amount for this example, including applicable registration, plate, wheelage and local excise charges. Blank means unknown, not zero. Enter 0 only when none apply and that has been checked.</p>
            <label className={styles.check}><input type="checkbox" checked={feesConfirmed} onChange={event => setFeesConfirmed(event.target.checked)} required /><span>I have included all additional charges applicable to this example.</span></label>
            <label className={styles.check}><input type="checkbox" checked={scenarioConfirmed} onChange={event => setScenarioConfirmed(event.target.checked)} required /><span>This is the standard Minnesota retail transfer scenario described above.</span></label>
          </details>
          {calculation.error ? <p className={styles.error} role="alert">{calculation.error}</p> : null}
          <button className={styles.primary} type="submit">{mode === "budget" ? "Find my estimated price range" : cash ? "Calculate cash total" : "Calculate estimated payment"}<ChevronRight size={18} aria-hidden="true" /></button>
        </form>
        {cashEstimate ? <div className={styles.results}>
          <h3>Estimated total due</h3>
          <p><strong>{dollars(cashEstimate.totalDueCents)}</strong></p>
          <p>Estimate—not a final purchase agreement.</p>
          <details><summary>View cash breakdown</summary><dl>
            <div><dt>Vehicle cash price</dt><dd>{dollars(cashEstimate.priceCents)}</dd></div>
            <div><dt>Estimated vehicle sales tax</dt><dd>{dollars(cashEstimate.salesTaxCents)}</dd></div>
            <div><dt>Documentation fee</dt><dd>{dollars(cashEstimate.documentationFeeCents)}</dd></div>
            {policy.baseFees.map(fee => <div key={fee.label}><dt>{fee.label}</dt><dd>{dollars(fee.cents)}</dd></div>)}
            <div><dt>Additional charges entered</dt><dd>{dollars(cashEstimate.additionalFeesCents)}</dd></div>
            <div><dt>Estimated out-the-door total</dt><dd>{dollars(cashEstimate.totalDueCents)}</dd></div>
          </dl><p>No loan interest or financing-only lien fee. No deposits, trade credits or prior payments have been deducted. Assumptions version: {cashEstimate.policyVersion}.</p></details>
        </div> : null}
        {estimate ? <div className={styles.results}>
          <h3>Keep the whole cost in view</h3>
          <dl>
            <div><dt>Vehicle cash price</dt><dd>{dollars(estimate.priceCents)}</dd></div>
            <div><dt>Estimated amount financed</dt><dd>{dollars(estimate.amountFinancedCents)}</dd></div>
            <div><dt>Estimated loan payments total</dt><dd>{dollars(estimate.totalPaymentsCents)}</dd></div>
            <div><dt>Estimated interest total</dt><dd>{dollars(estimate.totalInterestCents)}</dd></div>
            <div><dt>Total including down payment</dt><dd>{dollars(estimate.totalCostCents)}</dd></div>
          </dl>
          <details><summary>Show the calculation breakdown</summary><dl>
            <div><dt>Estimated vehicle sales tax</dt><dd>{dollars(estimate.salesTaxCents)}</dd></div>
            <div><dt>Documentation fee</dt><dd>{dollars(estimate.documentationFeeCents)}</dd></div>
            {policy.baseFees.map(fee => <div key={fee.label}><dt>{fee.label}</dt><dd>{dollars(fee.cents)}</dd></div>)}
            <div><dt>Recorded lien</dt><dd>{dollars(estimate.lienFeeCents)}</dd></div>
            <div><dt>Additional charges entered</dt><dd>{dollars(estimate.additionalFeesCents)}</dd></div>
            <div><dt>Estimated purchase total</dt><dd>{dollars(estimate.purchaseTotalCents)}</dd></div>
            <div><dt>Down payment paid upfront</dt><dd>{dollars(estimate.downPaymentCents)}</dd></div>
            <div><dt>Estimated final payment</dt><dd>{dollars(estimate.finalPaymentCents)}</dd></div>
          </dl><p>{estimate.paymentCount} estimated payments within the selected {estimate.termMonths}-month term. Final payment can differ due to rounding. Fixed-rate monthly amortization is a planning model, not the lender’s contract calculation.</p><p>Assumptions version: {estimate.policyVersion}. Changing an input recalculates or removes the previous result.</p></details>
          {mode === "budget" && inventoryHref ? <><a className={styles.primary} href={`${inventoryHref}?${new URLSearchParams({ max: (estimate.priceCents / 100).toFixed(2) })}`}>Browse matching sample vehicles<ChevronRight size={18} aria-hidden="true" /></a><p className={styles.muted}>This applies a cash-price filter only. It does not confirm financing eligibility or vehicle availability.</p></> : null}
        </div> : null}
        <p className={styles.safety}><ShieldCheck size={18} aria-hidden="true" />No account, credit check, application, approval or reservation. Nothing is saved or sent to a lender.</p>
      </div>
    </section>
  );
}
