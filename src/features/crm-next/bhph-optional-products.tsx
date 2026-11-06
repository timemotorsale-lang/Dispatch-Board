"use client";
import type { BhphFinancingFacts } from "@/lib/bhph-financing";
import styles from "./crm-next-shell.module.css";

export function BhphOptionalProducts({ facts, onChange }: { facts: BhphFinancingFacts; onChange: (key: keyof BhphFinancingFacts, value: string) => void }) {
  const field = (label: string, key: keyof BhphFinancingFacts) => <label><span>{label}</span><input value={facts[key]} onChange={event => onChange(key, event.target.value)} /></label>;
  const option = (label: string, key: keyof BhphFinancingFacts) => <label><input type="checkbox" checked={facts[key] === "true"} onChange={event => onChange(key, String(event.target.checked))} /><span>{label}</span></label>;
  return <section aria-label="Optional products and accessories" data-deal-state-managed>
    <h3>Optional products & accessories</h3>
    <p>Offer or quote products here. Only selected items are added to the deal. Enter each charge once; do not repeat it in other fees or base accessories.</p>
    <details><summary>Offer or select optional add-ons</summary>
      {option("Include optional extended warranty / service contract", "optionalWarrantySelected")}
      {facts.optionalWarrantySelected === "true" && <><div className={styles.retailFieldGrid}>{field("Extended warranty / contract name and coverage", "optionalWarrantyName")}{field("Optional warranty price", "optionalWarrantyPrice")}</div><small>For optional coverage of unexpected repairs, not scheduled maintenance. This paid product does not replace included dealer warranty or required coverage.</small></>}
      {option("Include optional accessories / equipment", "optionalAccessorySelected")}
      {facts.optionalAccessorySelected === "true" && <div className={styles.retailFieldGrid}>{field("Optional accessories description", "optionalAccessoryName")}{field("Optional accessories price", "optionalAccessoryPrice")}</div>}
      {option("Include another optional product / package", "optionalOtherSelected")}
      {facts.optionalOtherSelected === "true" && <div className={styles.retailFieldGrid}>
        {field("Additional optional product description", "optionalOtherName")}{field("Additional optional product price", "optionalOtherPrice")}
        <label><span>Additional product tax treatment</span><select value={facts.optionalOtherTaxTreatment} onChange={event => onChange("optionalOtherTaxTreatment", event.target.value)}><option value="">Choose tax treatment</option><option value="MVST_ACCESSORY">Vehicle accessory — include in MVST</option><option value="MAINTENANCE">Optional maintenance — general/local sales tax</option><option value="VERIFIED_OTHER">Other verified tax treatment</option></select></label>
        {facts.optionalOtherTaxTreatment === "MAINTENANCE" && field("Verified combined general/local sales tax rate (%)", "optionalOtherTaxRate")}
        {facts.optionalOtherTaxTreatment === "VERIFIED_OTHER" && field("Verified additional product tax amount", "optionalOtherTaxAmount")}
        {["MAINTENANCE", "VERIFIED_OTHER"].includes(facts.optionalOtherTaxTreatment) && field("Product tax location / verified basis", "optionalOtherTaxReason")}
      </div>}
      <label><span>Optional product quote / selection notes</span><textarea value={facts.optionalProductNotes} onChange={event => onChange("optionalProductNotes", event.target.value)} placeholder="Products discussed, provider, coverage, quoted price or requested options" /></label>
      <p><a href="https://www.revenue.state.mn.us/guide/warranties-recalls-and-service-contracts-0" target="_blank" rel="noreferrer">MN warranty and maintenance tax treatment</a> · <a href="https://www.ag.state.mn.us/Consumer/Publications/BuyACarOptionalProducts.asp" target="_blank" rel="noreferrer">Optional products and payment comparison</a></p>
    </details>
  </section>;
}
