import { describe, expect, it } from "vitest";

import { resolvePlanStatus, resolvePromise, resolveReportedPayment, validatePlan } from "@/features/collections/domain/resolution";

const promise = { promisedAmountCents: 20000, promisedDate: "2026-11-20", createdDate: "2026-11-15", baselineAmountDueCents: 50000, baselineDaysPastDue: 20 };
const snap = (asOfDate: string, amountDueCents: number, daysPastDue: number) => ({ asOfDate, amountDueCents, daysPastDue });

describe("promise resolution", () => {
  it("stays open before the deadline when nothing changed", () => {
    expect(resolvePromise({ promise, snapshots: [snap("2026-11-18", 50000, 23)], reportedPayments: [], today: "2026-11-21", graceDays: 1 }).status).toBe("OPEN");
  });

  it("is kept when amount due drops by at least the promised amount", () => {
    expect(resolvePromise({ promise, snapshots: [snap("2026-11-21", 30000, 26)], reportedPayments: [], today: "2026-11-21", graceDays: 1 }).status).toBe("KEPT");
  });

  it("is kept when days past due go down", () => {
    expect(resolvePromise({ promise, snapshots: [snap("2026-11-19", 49000, 6)], reportedPayments: [], today: "2026-11-19", graceDays: 1 }).status).toBe("KEPT");
  });

  it("ignores snapshots from the same day the promise was made", () => {
    expect(resolvePromise({ promise, snapshots: [snap("2026-11-15", 0, 0)], reportedPayments: [], today: "2026-11-16", graceDays: 1 }).status).toBe("OPEN");
  });

  it("ignores snapshots after the deadline", () => {
    expect(resolvePromise({ promise, snapshots: [snap("2026-11-25", 0, 0)], reportedPayments: [], today: "2026-11-25", graceDays: 1 }).status).toBe("BROKEN");
  });

  it("is partially kept when it went down by less", () => {
    const result = resolvePromise({ promise, snapshots: [snap("2026-11-20", 45000, 25)], reportedPayments: [], today: "2026-11-22", graceDays: 1 });
    expect(result.status).toBe("PARTIALLY_KEPT");
    expect(result.reductionCents).toBe(5000);
  });

  it("is broken after the deadline with no improvement", () => {
    expect(resolvePromise({ promise, snapshots: [snap("2026-11-20", 52000, 25)], reportedPayments: [], today: "2026-11-22", graceDays: 1 }).status).toBe("BROKEN");
  });

  it("counts a confirmed customer-reported payment", () => {
    expect(resolvePromise({ promise, snapshots: [], reportedPayments: [{ status: "CONFIRMED_BY_IMPORT", amountCents: 20000, paidDate: "2026-11-19" }], today: "2026-11-22", graceDays: 1 }).status).toBe("KEPT");
  });

  it("waits instead of breaking while a reported payment is pending", () => {
    expect(resolvePromise({ promise, snapshots: [], reportedPayments: [{ status: "PENDING_CONFIRMATION", amountCents: 20000, paidDate: "2026-11-19" }], today: "2026-11-25", graceDays: 1 }).status).toBe("OPEN");
  });

  it("uses the grace-days setting", () => {
    expect(resolvePromise({ promise, snapshots: [], reportedPayments: [], today: "2026-11-22", graceDays: 3 }).status).toBe("OPEN");
  });
});

describe("customer-reported payments", () => {
  const payment = { amountCents: 15000, reportedDate: "2026-11-15", baselineAmountDueCents: 40000, baselineDaysPastDue: 12 };
  it("is confirmed when a later import shows the amount", () => {
    expect(resolveReportedPayment({ payment, snapshots: [snap("2026-11-16", 25000, 12)], today: "2026-11-16", windowDays: 2 }).status).toBe("CONFIRMED_BY_IMPORT");
  });
  it("is confirmed when days past due improve", () => {
    expect(resolveReportedPayment({ payment, snapshots: [snap("2026-11-16", 39000, 2)], today: "2026-11-16", windowDays: 2 }).status).toBe("CONFIRMED_BY_IMPORT");
  });
  it("waits during the confirmation window", () => {
    expect(resolveReportedPayment({ payment, snapshots: [snap("2026-11-16", 40000, 13)], today: "2026-11-17", windowDays: 2 }).status).toBe("PENDING_CONFIRMATION");
  });
  it("is not found after the window", () => {
    expect(resolveReportedPayment({ payment, snapshots: [snap("2026-11-16", 40000, 13)], today: "2026-11-18", windowDays: 2 }).status).toBe("NOT_FOUND");
  });
  it("doesn't count the import from the same day it was reported", () => {
    expect(resolveReportedPayment({ payment, snapshots: [snap("2026-11-15", 0, 0)], today: "2026-11-16", windowDays: 2 }).status).toBe("PENDING_CONFIRMATION");
  });
});

describe("payment plans", () => {
  it("follows its installments", () => {
    expect(resolvePlanStatus(["KEPT", "OPEN"])).toBe("ACTIVE");
    expect(resolvePlanStatus(["KEPT", "BROKEN", "OPEN"])).toBe("BROKEN");
    expect(resolvePlanStatus(["KEPT", "PARTIALLY_KEPT"])).toBe("BROKEN");
    expect(resolvePlanStatus(["KEPT", "KEPT", "SUPERSEDED"])).toBe("COMPLETED");
  });
  it("validates installments", () => {
    expect(validatePlan([{ date: "2026-11-20", amountCents: 100 }], "2026-11-15")).toContain("A plan needs between 2 and 52 payments.");
    expect(validatePlan([{ date: "2026-11-20", amountCents: 100 }, { date: "2026-11-19", amountCents: 100 }], "2026-11-15")).toContain("Payment 2: dates must go forward.");
    expect(validatePlan([{ date: "2026-11-10", amountCents: 0 }, { date: "2026-11-19", amountCents: 100 }], "2026-11-15")).toEqual(["Payment 1: the date is in the past.", "Payment 1: enter an amount above $0."]);
    expect(validatePlan([{ date: "2026-11-20", amountCents: 100 }, { date: "2026-11-27", amountCents: 100 }], "2026-11-15")).toEqual([]);
  });
});
