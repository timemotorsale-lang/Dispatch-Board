import { describe, expect, it } from "vitest";
import { EMPTY_CASH_SALE, MN_TITLE_FEE_SCHEDULE, MN_PLATE_FEE_SCHEDULE, cashSaleFacts, cashSaleTotals, cashTitleFeeItems, cashTitleFeeTotal } from "@/lib/cash-retail-sale";
import { cashSaleDocumentHtml } from "@/server/services/cash-retail-sale-documents";

const itemized = (items: unknown) => ({ ...EMPTY_CASH_SALE, titleFeeItems: JSON.stringify(items) });
describe("Minnesota title fee itemization", () => {
  it("adds plate charges to the title subtotal and keeps registration separate", () => {
    const facts = { ...itemized([...MN_TITLE_FEE_SCHEDULE, MN_PLATE_FEE_SCHEDULE[0]]), registrationFee: "417.00" };
    expect(cashTitleFeeTotal(facts)).toBe(5350);
    expect(cashSaleTotals("10000", facts).fees).toBe(77050);
    expect(() => cashTitleFeeTotal(itemized(MN_PLATE_FEE_SCHEDULE))).toThrow("not both");
  });
  it("provides published typical no-lien and one-lien totals without automatically charging them", () => {
    expect(cashTitleFeeTotal(EMPTY_CASH_SALE)).toBe(0);
    expect(cashTitleFeeTotal(itemized(MN_TITLE_FEE_SCHEDULE.filter(item => item.id !== "lien")))).toBe(3600);
    expect(cashTitleFeeTotal(itemized(MN_TITLE_FEE_SCHEDULE))).toBe(3800);
  });
  it("preserves previously entered aggregate fees as an editable legacy item", () => {
    const old = { ...EMPTY_CASH_SALE, titleFee: "45.25" };
    expect(cashTitleFeeItems(old)).toEqual([{ id: "existing", label: "Previously entered title fees", amount: "45.25" }]);
    expect(cashTitleFeeTotal(old)).toBe(4525);
    expect(cashTitleFeeTotal({ ...old, titleFeeItems: "[]" })).toBe(0);
  });
  it("sums edited and custom quoted fees in cents and counts registration separately once", () => {
    const facts = { ...itemized([{ id: "title", label: "Title fee", amount: "8.25" }, { id: "custom", label: "Quoted additional fee", amount: "4.10" }]), registrationFee: "417.00" };
    expect(cashTitleFeeTotal(facts)).toBe(1235);
    expect(cashSaleTotals("10000", facts)).toMatchObject({ fees: 72935, tax: 68750, total: 1141685 });
  });
  it("derives the server aggregate from saved items even when the posted aggregate is wrong", () => {
    const saved = cashSaleFacts({ ...itemized(MN_TITLE_FEE_SCHEDULE), titleFee: "999.99" });
    expect(saved.titleFee).toBe("38.00");
    expect(cashSaleFacts(JSON.parse(JSON.stringify(saved)))).toEqual(saved);
    expect(cashSaleTotals("10000", saved).fees).toBe(33800);
  });
  it.each([
    [{ id: "a", label: "Missing amount", amount: "" }],
    [{ id: "a", label: "Negative", amount: "-1" }],
    [{ id: "a", label: "Over precision", amount: "1.001" }],
    [{ id: "a", label: "", amount: "5" }],
    [{ id: "a", label: "Duplicate", amount: "2" }, { id: "a", label: "Duplicate", amount: "2" }]
  ])("rejects invalid itemized fee input %#", (...items) => {
    expect(() => cashTitleFeeTotal(itemized(items))).toThrow();
  });
  it("includes the selected itemization and its total in the populated fee document", () => {
    const facts = { ...itemized(MN_TITLE_FEE_SCHEDULE), saleDate: "2026-11-05" };
    const html = cashSaleDocumentHtml("tax-fee-receipt", { customerName: "Demo Buyer", dealNumber: "DEMO", salePrice: "10000", facts, vehicle: { vin: "1NXBR32E85Z123456", stockNumber: "DEMO", year: "2005", make: "Toyota", model: "Corolla", color: "Silver" } });
    expect(html).toContain("Title, transfer &amp; plate fees (total)");
    expect(html).toContain("$38.00");
    for (const fee of MN_TITLE_FEE_SCHEDULE) expect(html).toContain(fee.label);
  });
});
