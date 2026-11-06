import { describe, expect, it } from "vitest";
import { calculateBhphPayment, type BhphPaymentInput } from "@/lib/bhph-payment";
const terms: BhphPaymentInput = { calculationMode: "TERM", apr: "0", paymentFrequency: "Monthly", termMonths: "24", paymentAmount: "500", firstPaymentDate: "2026-12-05" };
describe("BHPH term or fixed payment calculation", () => {
  it("calculates payment from 24 months without using the old fixed payment", () => {
    const result = calculateBhphPayment(1665653, terms);
    expect(result).toMatchObject({ calculationMode: "TERM", regularPaymentCents: 69403, numberOfPayments: 24, fullPaymentCount: 23, finalPaymentCents: 69384, totalPaymentsCents: 1665653, lastPaymentDate: "2028-11-05" });
    expect(calculateBhphPayment(1665653, { ...terms, paymentAmount: "invalid inactive value" })).toEqual(result);
  });
  it("calculates 34 payments from $500, independently of the old 24-month term", () => {
    const result = calculateBhphPayment(1665653, { ...terms, calculationMode: "PAYMENT_AMOUNT" });
    expect(result).toMatchObject({ calculationMode: "PAYMENT_AMOUNT", regularPaymentCents: 50000, numberOfPayments: 34, fullPaymentCount: 33, finalPaymentCents: 15653, totalInterestCents: 0, lastPaymentDate: "2029-09-05" });
    expect(calculateBhphPayment(1665653, { ...terms, calculationMode: "PAYMENT_AMOUNT", termMonths: "invalid inactive value" })).toEqual(result);
  });
  it("amortizes non-zero periodic interest and reconciles every cent", () => {
    for (const calculationMode of ["TERM", "PAYMENT_AMOUNT"]) {
      const result = calculateBhphPayment(1000000, { ...terms, calculationMode, apr: "12%", termMonths: "12", paymentAmount: "888.49" });
      expect(result.regularPaymentCents).toBe(88849); expect(result.payments[0].interestCents).toBe(10000);
      expect(result.payments.at(-1)?.balanceCents).toBe(0);
      expect(result.payments.reduce((sum, payment) => sum + payment.principalCents, 0)).toBe(1000000);
      expect(result.payments.reduce((sum, payment) => sum + payment.amountCents, 0)).toBe(1000000 + result.totalInterestCents);
      expect(result.finalPaymentCents).toBeLessThanOrEqual(result.regularPaymentCents);
    }
  });
  it.each([["Weekly", 104], ["Biweekly", 52], ["Semimonthly", 48], ["Monthly", 24]])("calculates %s payment count from the selected term", (paymentFrequency, count) => {
    expect(calculateBhphPayment(1040000, { ...terms, paymentFrequency }).numberOfPayments).toBe(count);
  });
  it("preserves the monthly anchor across February and avoids timezone date shifts", () => {
    const result = calculateBhphPayment(30000, { ...terms, termMonths: "3", firstPaymentDate: "2027-01-31" });
    expect(result.payments.map(payment => payment.dueDate)).toEqual(["2027-01-31", "2027-02-28", "2027-03-31"]);
  });
  it("keeps semi-monthly dates ordered at month end", () => {
    const result = calculateBhphPayment(40000, { ...terms, termMonths: "2", firstPaymentDate: "2027-01-31", paymentFrequency: "Semimonthly" });
    expect(result.payments.map(payment => payment.dueDate)).toEqual(["2027-01-31", "2027-02-16", "2027-02-28", "2027-03-16"]);
  });
  it("uses only the actual final payment when the requested fixed amount exceeds the balance", () => {
    expect(calculateBhphPayment(10000, { ...terms, calculationMode: "PAYMENT_AMOUNT", paymentAmount: "500" })).toMatchObject({ numberOfPayments: 1, finalPaymentCents: 10000, totalPaymentsCents: 10000 });
  });
  it("rejects non-amortizing payments instead of concealing a balloon", () => {
    expect(() => calculateBhphPayment(1000000, { ...terms, calculationMode: "PAYMENT_AMOUNT", paymentAmount: "100", apr: "12" })).toThrow("does not cover periodic interest");
    expect(() => calculateBhphPayment(1000000, { ...terms, calculationMode: "PAYMENT_AMOUNT", paymentAmount: "0.01" })).toThrow("1,200");
  });
  it.each([{ apr: "-1" }, { apr: "101" }, { calculationMode: "unknown" }, { termMonths: "0" }, { termMonths: "24.5" }, { firstPaymentDate: "2026-02-30" }, { paymentFrequency: "unknown" }])("rejects invalid active input %j", changed => {
    expect(() => calculateBhphPayment(1000000, { ...terms, ...changed })).toThrow();
  });
  it("requires the first payment after the sale date", () => {
    expect(() => calculateBhphPayment(1000000, terms, "2026-12-05")).toThrow("must follow the sale date");
  });
});
