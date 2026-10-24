import { PaymentCalculator } from "../../../packages/payment-estimates/calculator";
import { paymentActivationStatus, paymentReferences, proposedPaymentPolicy } from "../../../packages/payment-estimates/policy";
import styles from "./website-console.module.css";

export function PaymentEstimates({ previewUrl }: { previewUrl: string | null }) {
  const activation = paymentActivationStatus();
  return (
    <section aria-labelledby="website-payment-estimates">
      <h2 id="website-payment-estimates">Payment Estimates</h2>
      <p className={styles.intro}>Private calculator preview · Draft {proposedPaymentPolicy.version} · Public activation blocked</p>
      <div className={styles.grid}>
        <article className={styles.card}><h3>Business assumptions</h3><ul><li>8% annual interest rate—not a lender-confirmed APR.</li><li>24 / 36 / 48 / 66 / 72 months.</li><li>Down payment upfront; applicable taxes and fees included in financing.</li><li>$350 documentation fee, limited to the lesser of that amount or 10% of sale value.</li><li>No trade-in calculation, application, credit check or approval promise.</li></ul></article>
        <article className={styles.card}><h3>Before public activation</h3><ul>{activation.reasons.map(reason => <li key={reason}>{reason}</li>)}</ul><p>Both the owner and designated finance manager must approve the same final assumptions and disclosures. This preview does not record approvals, edit production settings, or grant finance-role access.</p></article>
      </div>
      <div className={styles.summary}><h3>Minnesota fee references—not a complete quote</h3><p>The preview uses the standard 6.875% vehicle sales tax and typical title-transfer reference amounts. Registration, plates, wheelage, local excise charges and transaction exceptions are not automatically configured. An explicit checked amount is required for each example, even if it is zero. Non-standard scenarios need staff review.</p><p>References checked October 24, 2026. Final rule coverage, applicability and disclosures still require revalidation before release.</p><ul>{paymentReferences.map(source => <li key={source.href}><a href={source.href} target="_blank" rel="noopener noreferrer">{source.title}</a></li>)}</ul>{previewUrl ? <a className={styles.toolLink} href={`${previewUrl}/budget`} target="_blank" rel="noopener noreferrer">Open the private customer calculator preview</a> : <p>Customer preview link is not configured. The staff calculator below remains available.</p>}</div>
      <PaymentCalculator policy={proposedPaymentPolicy} />
    </section>
  );
}
