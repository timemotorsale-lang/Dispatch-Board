"use client";
import { BHPH_FEE_LABELS, bhphFinancingIssue, bhphFeeInputError, calculateBhphFinancing, type BhphFinancingFacts } from "@/lib/bhph-financing";
import { cashMoney } from "@/lib/cash-retail-sale";
import styles from "./crm-next-shell.module.css";
import { BhphOptionalProducts } from "./bhph-optional-products";

export function BhphFinancingCalculator({ salePrice, downPayment, facts, onChange, onUse }: { salePrice: string; downPayment: string; facts: BhphFinancingFacts; onChange: (key: keyof BhphFinancingFacts, value: string) => void; onUse: (cents: number) => void }) {
  let totals: ReturnType<typeof calculateBhphFinancing> | null = null;
  try { totals = calculateBhphFinancing(salePrice, downPayment, facts); } catch { /* The same validator renders the actionable error below. */ }
  const issue = bhphFinancingIssue(salePrice, downPayment, facts);
  const field = (label: string, key: keyof BhphFinancingFacts, type = "text") => {
    const error = key in BHPH_FEE_LABELS ? bhphFeeInputError(key as keyof typeof BHPH_FEE_LABELS, facts[key]) : null;
    return <label key={key}><span>{label}</span><input aria-label={label} type={type} inputMode={type === "text" && key in BHPH_FEE_LABELS ? "decimal" : undefined} value={facts[key]} placeholder={key === "registrationFee" ? "417.00" : undefined} onChange={event => onChange(key, event.target.value)} aria-invalid={Boolean(error)} aria-describedby={error ? `bhph-${key}-error` : key === "registrationFee" ? "bhph-registration-help" : undefined} />{error && <small id={`bhph-${key}-error`}>{error}</small>}</label>;
  };
  return <section aria-label="Minnesota BHPH taxes and fees" data-deal-state-managed>
    <div className={styles.retailFieldGrid}>
      {field("Sale date", "saleDate", "date")}
      {field("Documentation fee", "docFee")}
      {field("Registration fee / tax", "registrationFee")}
      <label><span>MN motor vehicle sales tax</span><input readOnly value={totals ? cashMoney(totals.salesTax) : "Review amounts"} /></label>
      <label><span>Local vehicle excise tax</span><select value={facts.exciseTreatment} onChange={event => onChange("exciseTreatment", event.target.value)}><option value="HENNEPIN">Hennepin County delivery — $20</option><option value="OTHER_APPLICABLE">Other applicable jurisdiction — $20</option><option value="NONE">Not due — record basis</option></select></label>
      {facts.exciseTreatment === "NONE" && field("Local excise exemption / delivery basis", "exciseReason")}
    </div>
    <p id="bhph-registration-help">Enter the vehicle-specific registration / tabs amount, including 0 if not due. Title, plate, filing and wheelage charges are separate below; use the DVS quote to avoid counting them twice.</p>
    <BhphOptionalProducts facts={facts} onChange={onChange} />
    <details><summary>Title, transfer, plates and other fees</summary><div className={styles.retailFieldGrid}>
      {Object.entries(BHPH_FEE_LABELS).filter(([key]) => !["docFee", "registrationFee"].includes(key)).map(([key, label]) => field(label, key as keyof BhphFinancingFacts))}
      {field("Other non-taxable fee description", "otherFeeLabel")}
      {field("Taxable accessories / dealer preparation", "accessories")}
      {field("Rebate", "rebate")}{field("Motor vehicle trade allowance", "tradeAllowance")}{field("Trade-in VIN", "tradeVin")}{field("Trade payoff", "tradePayoff")}
    </div><p>Standard title-transfer fees are prefilled for review. Adjust only to the amounts applicable to this transaction. Late fees and interest are not added to the amount financed.</p></details>
    <details><summary>Tax treatment and Minnesota references</summary><div className={styles.retailFieldGrid}>
      <label><span>Vehicle sales tax treatment</span><select value={facts.taxTreatment} onChange={event => onChange("taxTreatment", event.target.value)}><option value="STANDARD">Standard MN MVST — 6.875%</option><option value="EXEMPT_OR_SPECIAL">Verified exemption / special tax amount</option></select></label>
      {facts.taxTreatment === "EXEMPT_OR_SPECIAL" && <>{field("Verified sales tax amount", "taxOverride")}{field("Tax exemption / special tax basis", "taxReason")}</>}
    </div><p>MVST applies to the taxable vehicle price after eligible rebate and motor vehicle trade allowance. Down payment does not reduce this tax. Ordinary local sales tax is not added; separately stated documentation and registration fees are excluded from MVST.</p><p><a href="https://www.revenue.state.mn.us/guide/motor-vehicle-sales" target="_blank" rel="noreferrer">MN motor vehicle tax rules</a> · <a href="https://www.revisor.mn.gov/statutes/cite/168.27#stat.168.27.31" target="_blank" rel="noreferrer">Documentation fee limit</a> · <a href="https://assets.dps.mn.gov/files/dvs/BuyingorSellingMotorVehicle_Just_the_Facts.pdf" target="_blank" rel="noreferrer">DVS transfer fees</a></p></details>
    {issue && <p role="alert">{issue}</p>}
    {totals && <div className={styles.rentalSummaryStrip}>
      <div><span>Sale + taxable items − allowances</span><strong>{cashMoney(totals.taxable)}</strong></div>
      <div><span>Taxes</span><strong>{cashMoney(totals.salesTax + totals.exciseTax + totals.optionalProducts.generalTaxCents)}</strong></div>
      <div><span>Itemized fees</span><strong>{cashMoney(totals.feeTotal)}</strong></div>
      {totals.optionalProducts.items.length > 0 && <div><span>Selected optional products (included)</span><strong>{cashMoney(totals.optionalProducts.priceCents)}</strong></div>}
      <div><span>Total before down payment</span><strong>{cashMoney(totals.total)}</strong></div>
      <div><span>Amount financed</span><strong>{cashMoney(totals.amountFinanced)}</strong></div>
      <button type="button" disabled={Boolean(issue)} onClick={() => onUse(totals!.amountFinanced)}>Use financed amount</button>
    </div>}
  </section>;
}
