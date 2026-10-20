import { describe, expect, it } from "vitest";
import { advanceBalance, businessDate, cashExpected, cents, csvCell, moneyFlags, parseCardCsv, receiptPending, signedExpense, type MoneyRow } from "@/lib/money-resources";
const row = (kind: string, amountCents: number, extra: Partial<MoneyRow> = {}): MoneyRow => ({ id: kind, kind, amountCents, approvalStatus: "APPROVED", paymentMethod: "CASH", ...extra });
describe("money accountability rules", () => {
  it("uses exact cents rather than floating point", () => { expect(cents("125.09")).toBe(12509); expect(cents("0", true)).toBe(0); for (const bad of ["1.001", "-2", "0", "1e2", "NaN", "1,200"]) expect(() => cents(bad)).toThrow(); });
  it("rejects invalid calendar dates", () => { expect(businessDate("2026-10-20")).toBe("2026-10-20"); expect(() => businessDate("2026-02-30")).toThrow(); });
  it("accounts for the complete $200 advance without treating issuance as an expense", () => {
    const children = [row("EXPENSE", 12500), row("EXPENSE", 4000), row("ADVANCE_RETURN", 3500)];
    expect(advanceBalance(20000, children)).toBe(0);
    expect(advanceBalance(20000, children.map(item => item.kind === "ADVANCE_RETURN" ? { ...item, approvalStatus: "PENDING" } : item))).toBe(3500);
    expect(advanceBalance(20000, [row("EXPENSE", 25000)])).toBe(-5000);
  });
  it("does not count an advance purchase twice in physical cash", () => {
    expect(cashExpected(50000, [row("ADVANCE_ISSUE", 20000), row("EXPENSE", 16500, { parentId: "issue" }), row("ADVANCE_RETURN", 3500)])).toBe(33500);
    expect(cashExpected(50000, [row("EXPENSE", 1000, { id: "purchase" }), row("REFUND", 300, { parentId: "purchase" })])).toBe(49300);
  });
  it("keeps reimbursement, card payments and advances out of expense totals", () => {
    expect([row("EXPENSE", 10000), row("REIMBURSEMENT", 10000), row("CARD_PAYMENT", 10000), row("ADVANCE_ISSUE", 10000), row("REFUND", 2000)].reduce((sum, item) => sum + signedExpense(item), 0)).toBe(8000);
    expect(signedExpense(row("EXPENSE", 10000, { approvalStatus: "SUPERSEDED" }))).toBe(0);
  });
  it("keeps missing evidence visible but does not revive a corrected record", () => { expect(receiptPending(row("EXPENSE", 100))).toBe(true); expect(receiptPending(row("EXPENSE", 100, { receiptExplanation: "Receipt lost; manager investigation requested." }))).toBe(false); expect(receiptPending(row("EXPENSE", 100, { approvalStatus: "SUPERSEDED" }))).toBe(false); });
  it("flags policy excess and possible duplicates without hiding actual spending", () => {
    const purchase = { ...row("EXPENSE", 10000), businessDate: "2026-10-20", merchant: "Parts shop", accountId: "card" };
    const flags = moneyFlags(purchase, [purchase, { ...purchase, id: "another" }], 5000);
    expect(flags.join(" ")).toContain("Above purchase policy limit"); expect(flags.join(" ")).toContain("Possible duplicate");
  });
  it("parses quoted merchants, charges, credits and stable statement IDs", () => {
    const parsed = parseCardCsv('transaction_id,date,merchant,amount\r\nT-1,2026-10-20,"Parts, Inc",125.50\r\nT-2,2026-10-20,Refund,-25.50');
    expect(parsed.map(item => item.amountCents)).toEqual([12550, -2550]); expect(parsed[0].merchant).toBe("Parts, Inc");
    expect(() => parseCardCsv('transaction_id,date,merchant,amount\nT-1,2026-10-20,Parts,10\nT-1,2026-10-20,Parts,10')).toThrow();
    expect(() => parseCardCsv('date,merchant,amount\n2026-10-20,Parts,10')).toThrow();
  });
  it("neutralizes spreadsheet formulas in exports", () => { expect(csvCell("=HYPERLINK(1)")).toContain("'=HYPERLINK"); expect(csvCell('A "quoted" merchant')).toBe('"A ""quoted"" merchant"'); });
});
