import { describe, expect, it } from "vitest";

import { applyWeekendRule, buildSchedule, dueDates, replayLedger, simpleInterestCents, type ContractTerms, type LedgerTx } from "@/features/collections/domain/ledger";

const fixed: ContractTerms = {
  calcMethod: "FIXED_PAYMENT", frequency: "WEEKLY", contractDate: "2026-01-01", firstDueDate: "2026-01-08", numberOfPayments: 10,
  paymentAmountCents: 10000, totalOfPaymentsCents: 99500, amountFinancedCents: 80000, aprBasisPoints: null, sideNoteCents: 0
};
let n = 0;
const tx = (type: LedgerTx["type"], amountCents: number, effectiveDate: string, extra: Partial<LedgerTx> = {}): LedgerTx => ({ id: `t${++n}`, type, amountCents, effectiveDate, postedAt: `${effectiveDate}T12:00:${String(n % 60).padStart(2, "0")}Z`, ...extra });

describe("due dates for all four frequencies", () => {
  it("weekly and biweekly step 7 and 14 days", () => {
    expect(dueDates("WEEKLY", "2026-01-08", 3)).toEqual(["2026-01-08", "2026-01-15", "2026-01-22"]);
    expect(dueDates("BIWEEKLY", "2026-12-24", 3)).toEqual(["2026-12-24", "2027-01-07", "2027-01-21"]);
  });
  it("monthly keeps the day and clamps short months", () => {
    expect(dueDates("MONTHLY", "2027-01-31", 4)).toEqual(["2027-01-31", "2027-02-28", "2027-03-31", "2027-04-30"]);
    expect(dueDates("MONTHLY", "2027-11-15", 3)).toEqual(["2027-11-15", "2027-12-15", "2028-01-15"]);
  });
  it("semimonthly is twice a month, 15 days apart, clamped to month end", () => {
    expect(dueDates("SEMIMONTHLY", "2027-01-01", 4)).toEqual(["2027-01-01", "2027-01-16", "2027-02-01", "2027-02-16"]);
    expect(dueDates("SEMIMONTHLY", "2027-01-15", 4)).toEqual(["2027-01-15", "2027-01-30", "2027-02-15", "2027-02-28"]);
    expect(dueDates("SEMIMONTHLY", "2027-01-30", 3)).toEqual(["2027-01-30", "2027-02-15", "2027-02-28"]);
  });
  it("can move weekend and holiday due dates to the next business day", () => {
    expect(applyWeekendRule("2027-01-02", "NEXT_BUSINESS_DAY")).toBe("2027-01-04"); // Saturday -> Monday
    expect(applyWeekendRule("2027-01-04", "NEXT_BUSINESS_DAY", ["2027-01-04"])).toBe("2027-01-05");
    expect(applyWeekendRule("2027-01-02", "NONE")).toBe("2027-01-02");
  });
});

describe("schedules", () => {
  it("fixed-payment: equal payments and a final payment that makes the total", () => {
    const s = buildSchedule(fixed);
    expect(s).toHaveLength(10);
    expect(s.slice(0, 9).every(i => i.amountCents === 10000)).toBe(true);
    expect(s[9].amountCents).toBe(9500);
    expect(s.reduce((a, i) => a + i.amountCents, 0)).toBe(99500);
  });
  it("simple-interest: interest by actual days, last payment clears the balance", () => {
    const terms: ContractTerms = { ...fixed, calcMethod: "SIMPLE_INTEREST", frequency: "MONTHLY", firstDueDate: "2026-02-01", numberOfPayments: 12, paymentAmountCents: 46000, amountFinancedCents: 500000, aprBasisPoints: 1800 };
    const s = buildSchedule(terms);
    expect(s[0].interestCents).toBe(simpleInterestCents(500000, 1800, 31));
    expect(s.reduce((a, i) => a + (i.principalCents ?? 0), 0)).toBe(500000);
    expect(s[11].amountCents).not.toBe(46000);
  });
  it("refuses impossible terms", () => {
    expect(() => buildSchedule({ ...fixed, totalOfPaymentsCents: 90000 })).toThrow(/too small/);
    expect(() => buildSchedule({ ...fixed, numberOfPayments: 0 })).toThrow();
  });
});

describe("fixed-payment replay", () => {
  const s = buildSchedule(fixed);
  it("a new contract is current, with the first payment coming due", () => {
    const st = replayLedger(fixed, s, [], "2026-01-05");
    expect(st).toMatchObject({ daysPastDue: 0, pastDueCents: 0, totalBalanceCents: 99500, amountDueCents: 10000 });
    expect(st.nextDue).toEqual({ number: 1, dueDate: "2026-01-08", amountCents: 10000 });
  });
  it("counts days past due from the oldest unpaid due date", () => {
    expect(replayLedger(fixed, s, [], "2026-01-20")).toMatchObject({ daysPastDue: 12, pastDueCents: 20000 });
  });
  it("pays fees, then late fees, then the oldest past-due payment, then the current one", () => {
    const t = [tx("FEE", 2500, "2026-01-10"), tx("LATE_FEE", 1000, "2026-01-14"), tx("PAYMENT", 23500, "2026-01-16")];
    const st = replayLedger(fixed, s, t, "2026-01-16");
    expect(st.allocations[t[2].id]).toEqual([
      { bucket: "FEE", amountCents: 2500 }, { bucket: "LATE_FEE", amountCents: 1000 },
      { bucket: "INSTALLMENT", amountCents: 10000, installmentNumber: 1 }, { bucket: "INSTALLMENT", amountCents: 10000, installmentNumber: 2 }
    ]);
    expect(st).toMatchObject({ daysPastDue: 0, feesCents: 0, lateFeesCents: 0 });
  });
  it("a partial payment leaves the account past due from the same date", () => {
    const st = replayLedger(fixed, s, [tx("PAYMENT", 6000, "2026-01-10")], "2026-01-12");
    expect(st).toMatchObject({ daysPastDue: 4, pastDueCents: 4000 });
    expect(st.installments[0]).toMatchObject({ paidCents: 6000, paidOn: null });
  });
  it("money beyond the current payment pays ahead, and beyond the contract is unapplied", () => {
    const ahead = replayLedger(fixed, s, [tx("PAYMENT", 30000, "2026-01-07")], "2026-01-07");
    expect(ahead.installments.slice(0, 3).every(i => i.paidCents === 10000)).toBe(true);
    expect(ahead.nextDue?.number).toBe(4);
    const over = replayLedger(fixed, s, [tx("PAYOFF", 100000, "2026-01-07")], "2026-01-07");
    expect(over).toMatchObject({ unappliedCents: 500, paidOff: true, totalBalanceCents: 0 });
  });
  it("a different payment order (setting) is respected", () => {
    const t = [tx("LATE_FEE", 1000, "2026-01-14"), tx("PAYMENT", 10000, "2026-01-16")];
    const st = replayLedger(fixed, s, t, "2026-01-16", ["PAST_DUE", "CURRENT", "LATE_FEE", "FEE", "PRINCIPAL"]);
    expect(st.allocations[t[1].id]).toEqual([{ bucket: "INSTALLMENT", amountCents: 10000, installmentNumber: 1 }]);
    expect(st.lateFeesCents).toBe(1000);
  });
});

describe("reversals and returned payments", () => {
  const s = buildSchedule(fixed);
  it("a reversal cancels the payment and later payments are re-split", () => {
    const p1 = tx("PAYMENT", 10000, "2026-01-08"), p2 = tx("PAYMENT", 10000, "2026-01-15");
    const rev = tx("PAYMENT_REVERSAL", 10000, "2026-01-16", { reversesTransactionId: p1.id });
    const st = replayLedger(fixed, s, [p1, p2, rev], "2026-01-16");
    expect(st.reversed).toEqual([p1.id]);
    expect(st.allocations[p2.id]).toEqual([{ bucket: "INSTALLMENT", amountCents: 10000, installmentNumber: 1 }]);
    expect(st).toMatchObject({ daysPastDue: 1, pastDueCents: 10000 });
  });
  it("a returned payment works the same, and its fee is charged separately", () => {
    const p = tx("PAYMENT", 10000, "2026-01-08");
    const st = replayLedger(fixed, s, [p, tx("RETURNED_PAYMENT", 10000, "2026-01-12", { reversesTransactionId: p.id }), tx("FEE", 3000, "2026-01-12")], "2026-01-12");
    expect(st).toMatchObject({ daysPastDue: 4, pastDueCents: 10000, feesCents: 3000, amountDueCents: 23000 });
  });
  it("warns about a reversal that points at nothing, and ignores it", () => {
    const st = replayLedger(fixed, s, [tx("PAYMENT_REVERSAL", 100, "2026-01-08", { reversesTransactionId: "missing" })], "2026-01-09");
    expect(st.warnings[0]).toMatch(/isn't on this contract/);
  });
  it("replaying twice gives the same answer (no hidden state)", () => {
    const t = [tx("PAYMENT", 15000, "2026-01-10"), tx("LATE_FEE", 1000, "2026-01-20"), tx("PAYMENT", 5000, "2026-01-21")];
    expect(replayLedger(fixed, s, t, "2026-02-01")).toEqual(replayLedger(fixed, s, [...t].reverse(), "2026-02-01"));
  });
});

describe("simple-interest replay", () => {
  const si: ContractTerms = { ...fixed, calcMethod: "SIMPLE_INTEREST", frequency: "MONTHLY", contractDate: "2026-01-01", firstDueDate: "2026-02-01", numberOfPayments: 12, paymentAmountCents: 46000, amountFinancedCents: 500000, aprBasisPoints: 1800 };
  const s = buildSchedule(si);
  it("accrues daily interest and pays interest before principal", () => {
    const p = tx("PAYMENT", 46000, "2026-02-01");
    const st = replayLedger(si, s, [p], "2026-02-01");
    const interest = simpleInterestCents(500000, 1800, 31);
    expect(st.allocations[p.id]).toEqual([{ bucket: "INTEREST", amountCents: interest }, { bucket: "PRINCIPAL", amountCents: 46000 - interest }]);
    expect(st.principalCents).toBe(500000 - (46000 - interest));
    expect(st.daysPastDue).toBe(0);
  });
  it("paying late costs more interest", () => {
    const onTime = replayLedger(si, s, [tx("PAYMENT", 46000, "2026-02-01")], "2026-02-20");
    const late = replayLedger(si, s, [tx("PAYMENT", 46000, "2026-02-15")], "2026-02-20");
    expect(late.principalCents).toBeGreaterThan(onTime.principalCents);
  });
  it("extra principal shortens the loan but only moves the due date past the current payment", () => {
    // Paid Feb 10: covers the payment due Mar 1 (the current one); the extra goes to principal, so Apr 1 is still due.
    const st = replayLedger(si, s, [tx("PAYMENT", 46000, "2026-02-01"), tx("PAYMENT", 100000, "2026-02-10")], "2026-02-10");
    expect(st.nextDue?.number).toBe(3);
    expect(st.principalCents).toBeLessThan(400000);
  });
  it("a payoff clears principal and interest to the day", () => {
    const quote = replayLedger(si, s, [], "2026-03-01");
    const st = replayLedger(si, s, [tx("PAYOFF", quote.contractBalanceCents, "2026-03-01")], "2026-03-01");
    expect(st).toMatchObject({ principalCents: 0, totalBalanceCents: 0, paidOff: true, unappliedCents: 0 });
  });
  it("reversing a simple-interest payment restores principal and interest", () => {
    const p = tx("PAYMENT", 46000, "2026-02-01");
    const none = replayLedger(si, s, [], "2026-02-05");
    const reversed = replayLedger(si, s, [p, tx("RETURNED_PAYMENT", 46000, "2026-02-04", { reversesTransactionId: p.id })], "2026-02-05");
    expect(reversed.totalBalanceCents).toBe(none.totalBalanceCents);
    expect(reversed.daysPastDue).toBe(4);
  });
});

describe("biweekly and semimonthly contracts end to end", () => {
  for (const frequency of ["BIWEEKLY", "SEMIMONTHLY"] as const) {
    it(`${frequency}: paying every installment on time pays the contract off`, () => {
      const terms = { ...fixed, frequency, firstDueDate: "2026-01-15", numberOfPayments: 6, totalOfPaymentsCents: 60000 };
      const s = buildSchedule(terms);
      const st = replayLedger(terms, s, s.map(i => tx("PAYMENT", i.amountCents, i.dueDate)), s[5].dueDate);
      expect(st).toMatchObject({ paidOff: true, totalBalanceCents: 0, daysPastDue: 0 });
    });
  }
});

describe("other transaction types", () => {
  const s = buildSchedule(fixed);
  it("waivers reduce late fees only; credits and negative adjustments pay like payments; positive adjustments add", () => {
    const t = [tx("LATE_FEE", 1000, "2026-01-10"), tx("LATE_FEE_WAIVER", 1500, "2026-01-11"), tx("CREDIT", 10000, "2026-01-11"), tx("ADJUSTMENT", 2000, "2026-01-12"), tx("ADJUSTMENT", -2000, "2026-01-13")];
    const st = replayLedger(fixed, s, t, "2026-01-13");
    expect(st).toMatchObject({ lateFeesCents: 0, feesCents: 0, daysPastDue: 0 });
    expect(st.warnings.join(" ")).toMatch(/larger than the late fees/);
  });
  it("side-note payments only pay the side note", () => {
    const terms = { ...fixed, sideNoteCents: 5000 };
    const st = replayLedger(terms, s, [tx("SIDE_NOTE_PAYMENT", 6000, "2026-01-05")], "2026-01-05");
    expect(st).toMatchObject({ sideNoteCents: 0, unappliedCents: 1000, totalBalanceCents: 99500 });
  });
  it("charge-off writes the balance off; money afterwards is recovery", () => {
    const st = replayLedger(fixed, s, [tx("PAYMENT", 10000, "2026-01-08"), tx("FEE", 500, "2026-01-09"), tx("CHARGE_OFF", 0, "2026-03-01"), tx("RECOVERY", 4000, "2026-03-10")], "2026-03-15");
    expect(st).toMatchObject({ chargedOffCents: 90000, recoveredCents: 4000, totalBalanceCents: 0, daysPastDue: 0 });
  });
  it("an opening balance from DealerCenter marks earlier payments as paid", () => {
    const st = replayLedger(fixed, s, [tx("OPENING_BALANCE", 49500, "2026-02-01")], "2026-02-01");
    expect(st.installments.filter(i => i.paidCents === i.amountCents).length).toBe(5);
    expect(st).toMatchObject({ contractBalanceCents: 49500, daysPastDue: 0 });
  });
  it("transactions dated after the 'as of' date are ignored", () => {
    expect(replayLedger(fixed, s, [tx("PAYMENT", 10000, "2026-02-01")], "2026-01-20").pastDueCents).toBe(20000);
  });
});
