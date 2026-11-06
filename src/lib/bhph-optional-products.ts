import { cashCents, cashMoney } from "./cash-retail-sale";

export const EMPTY_BHPH_OPTIONS = {
  optionalWarrantySelected: "false", optionalWarrantyName: "", optionalWarrantyPrice: "",
  optionalAccessorySelected: "false", optionalAccessoryName: "", optionalAccessoryPrice: "",
  optionalOtherSelected: "false", optionalOtherName: "", optionalOtherPrice: "", optionalOtherTaxTreatment: "", optionalOtherTaxRate: "", optionalOtherTaxAmount: "", optionalOtherTaxReason: "", optionalProductNotes: ""
};
export type BhphOptionalProducts = typeof EMPTY_BHPH_OPTIONS;
export function selectedBhphProducts(facts: BhphOptionalProducts) {
  const items: Array<{ name: string; priceCents: number; taxCents: number; treatment: string }> = [];
  let mvstAccessoriesCents = 0, nonMvstPriceCents = 0, generalTaxCents = 0;
  const selected = (value: string | undefined) => {
    if (!["", "true", "false", undefined].includes(value)) throw new Error("Select or clear the optional product before calculating its price.");
    return value === "true";
  };
  const price = (value: string, label: string) => { if (!value.trim()) throw new Error(`Enter the selected ${label} price, including 0 if free.`); try { return cashCents(value); } catch { throw new Error(`Enter one valid ${label} price.`); } };
  const name = (value: string, label: string) => { if (!value.trim()) throw new Error(`Describe the selected optional ${label}.`); return value.trim(); };
  if (selected(facts.optionalWarrantySelected)) {
    const amount = price(facts.optionalWarrantyPrice, "extended warranty"); nonMvstPriceCents += amount;
    items.push({ name: name(facts.optionalWarrantyName, "extended warranty / service contract"), priceCents: amount, taxCents: 0, treatment: "Optional extended warranty for unexpected repairs — not taxable" });
  }
  if (selected(facts.optionalAccessorySelected)) {
    const amount = price(facts.optionalAccessoryPrice, "accessories"); mvstAccessoriesCents += amount;
    items.push({ name: name(facts.optionalAccessoryName, "accessories / equipment"), priceCents: amount, taxCents: 0, treatment: "Included in MN motor vehicle sales tax base" });
  }
  if (selected(facts.optionalOtherSelected)) {
    const amount = price(facts.optionalOtherPrice, "additional product"), description = name(facts.optionalOtherName, "additional product");
    let tax = 0, treatment = facts.optionalOtherTaxTreatment;
    if (treatment === "MVST_ACCESSORY") { mvstAccessoriesCents += amount; treatment = "Included in MN motor vehicle sales tax base"; }
    else if (treatment === "MAINTENANCE") {
      const rate = facts.optionalOtherTaxRate.trim();
      if (!/^\d+(\.\d{1,4})?$/.test(rate) || Number(rate) < 6.875 || Number(rate) > 100 || !facts.optionalOtherTaxReason.trim()) throw new Error("Enter the verified combined MN general and local sales tax rate and location/basis for the optional maintenance product.");
      tax = Math.round(amount * Number(rate) / 100); treatment = `Optional maintenance: ${rate}% general/local sales tax — ${facts.optionalOtherTaxReason}`;
      nonMvstPriceCents += amount;
    } else if (treatment === "VERIFIED_OTHER") {
      if (!facts.optionalOtherTaxAmount.trim() || !facts.optionalOtherTaxReason.trim()) throw new Error("Enter the verified additional product tax amount and its basis, including 0 if exempt.");
      tax = price(facts.optionalOtherTaxAmount, "additional product tax"); treatment = `Verified tax treatment — ${facts.optionalOtherTaxReason}`; nonMvstPriceCents += amount;
    } else throw new Error("Choose the tax treatment for the selected additional optional product.");
    generalTaxCents += tax; items.push({ name: description, priceCents: amount, taxCents: tax, treatment });
  }
  return { items, mvstAccessoriesCents, nonMvstPriceCents, generalTaxCents, priceCents: mvstAccessoriesCents + nonMvstPriceCents };
}
export function withoutBhphOptions<T extends BhphOptionalProducts>(facts: T): T { return { ...facts, optionalWarrantySelected: "false", optionalAccessorySelected: "false", optionalOtherSelected: "false" }; }
export function bhphOptionalProductRows(facts: BhphOptionalProducts): Array<[string, string]> {
  const selected = selectedBhphProducts(facts);
  return [["Optional extended warranty selected", facts.optionalWarrantySelected === "true" ? "Yes" : "No"], ["Optional accessories selected", facts.optionalAccessorySelected === "true" ? "Yes" : "No"], ["Additional optional product selected", facts.optionalOtherSelected === "true" ? "Yes" : "No"], ...selected.items.flatMap((item): Array<[string, string]> => [[`Optional product: ${item.name}`, cashMoney(item.priceCents)], [`${item.name} tax treatment`, item.treatment], [`${item.name} separately calculated product tax`, cashMoney(item.taxCents)]]), ["Optional product quote / selection notes", facts.optionalProductNotes || "None"]];
}
