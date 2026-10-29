import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "@/tests/helpers/render-with-app-router";
import { ServiceChargesEditor } from "@/features/inventory/service-charges-editor";
import { normalizeServiceCharges, serviceChargeLines, serviceQuoteTax, shopSuppliesCents, validateShopSupplies } from "@/lib/service-charges";
import { invoicePackageMismatchCodes, nextBillingTask } from "@/lib/service-billing-workflow";
describe("service charges and discounts", () => {
  it("prepares a fresh invoice package after customer details change", () => {
    const mismatchCodes = invoicePackageMismatchCodes([], { fingerprint: "old-customer-details" }, "updated-customer-details");
    expect(mismatchCodes).toEqual(["INVOICE_SOURCE_CHANGED"]);
    expect(nextBillingTask({ invoices: [], readiness: { mismatchCodes: [] }, packages: [{ id: "package-1", billingMode: "NATIVE", mismatchCodes, preview: { lines: [{}], totalCents: 50000 } }] }).action).toBe("PREPARE_INVOICE");
    expect(invoicePackageMismatchCodes([], { fingerprint: "same" }, "same")).toEqual([]);
  });
  it.each([[0, 0], [25000, 1250], [100000, 5000], [200000, 5000]])("charges 5%% of %s labor cents, capped at $50", (labor, expected) => {
    expect(shopSuppliesCents(labor)).toBe(expected);
  });
  it("records towing and shop supplies as distinct fee lines without labor or parts duplication", () => {
    const charges = normalizeServiceCharges([{ id: "towing", description: "Towing", amountCents: 15000, taxable: false }]);
    const lines = serviceChargeLines(25000, charges);
    expect(lines.map(line => [line.key, line.description, line.unitPriceCents])).toEqual([["fee-shop-supplies", "Shop supplies", 1250], ["fee-other-towing", "Towing", 15000]]);
    validateShopSupplies([{ key: "work", type: "LABOR", quantity: 1, unitPriceCents: 25000 }, ...lines]);
  });
  it("rejects missing or tampered supplies fees, invalid charges and excessive discounts", () => {
    const work = { key: "work", type: "LABOR", quantity: 1, unitPriceCents: 25000 };
    expect(() => validateShopSupplies([work])).toThrow("5%");
    expect(() => validateShopSupplies([work, { ...serviceChargeLines(25000, [])[0], unitPriceCents: 999 }])).toThrow("5%");
    expect(() => normalizeServiceCharges([{ id: "bad", description: "", amountCents: -100, taxable: false }])).toThrow();
    expect(() => serviceQuoteTax(1000, 500, 7, 1001)).toThrow("subtotal");
  });
  it("allocates discounts across the subtotal before taxing the taxable share", () => {
    expect(serviceQuoteTax(10000, 5000, 7, 1000)).toBe(315);
    expect(serviceQuoteTax(10000, 5000, 7, 10000)).toBe(0);
    expect(serviceQuoteTax(0, 0, 7, 0)).toBe(0);
    expect(serviceQuoteTax(101, 51, 7, 10)).toBe(3);
  });
  it("exposes other charges, the approved supplies rule, taxable flags and a discount field", () => {
    const html = renderToStaticMarkup(<ServiceChargesEditor laborCents={25000} charges={[{ id: "towing", description: "Towing", amountCents: 15000, taxable: false }]} suppliesTaxable={false} discountCents={1000} subtotalCents={41250} onDiscount={() => {}} onChange={() => {}} onSuppliesTaxable={() => {}} />);
    for (const text of ["5% of labor", "maximum $50", "$12.50", "Towing", "Add other charge", "Discount ($)"]) expect(html).toContain(text);
  });
});
