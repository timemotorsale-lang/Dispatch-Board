/**
 * Promise, plan and reported-payment resolution (spec sections 3.7 and 6.3). Pure functions.
 *
 * Promise KEPT: by promisedDate + grace (default 1 day), a newer snapshot shows days past
 *   due went down, or amount due went down by at least the promised amount, or CONFIRMED
 *   customer-reported payments cover it.
 * PARTIALLY_KEPT: deadline passed and it went down by less (a follow-up is needed).
 * BROKEN: deadline passed and nothing improved.
 * While a reported payment is still PENDING_CONFIRMATION, a promise is never marked broken.
 */
import { addDays, daysBetween } from "./money-dates";

export type SnapshotPoint = { asOfDate: string; amountDueCents: number; daysPastDue: number; createdAt?: string };
export type PromiseInput = {
  promisedAmountCents: number;
  promisedDate: string;
  createdDate: string;
  baselineAmountDueCents: number | null;
  baselineDaysPastDue: number | null;
};
export type ReportedPaymentFact = { status: "PENDING_CONFIRMATION" | "CONFIRMED_BY_IMPORT" | "NOT_FOUND" | "CANCELLED"; amountCents: number; paidDate: string };

export type PromiseOutcome = { status: "OPEN" | "KEPT" | "PARTIALLY_KEPT" | "BROKEN"; note: string; reductionCents: number };

/** Snapshots taken on or after the promise was made (a "newer" snapshot). */
function relevant(snapshots: SnapshotPoint[], fromDate: string, toDate: string) {
  return snapshots.filter(s => s.asOfDate >= fromDate && s.asOfDate <= toDate).sort((a, b) => a.asOfDate.localeCompare(b.asOfDate));
}

export function resolvePromise(input: {
  promise: PromiseInput;
  snapshots: SnapshotPoint[];
  reportedPayments: ReportedPaymentFact[];
  today: string;
  graceDays: number;
}): PromiseOutcome {
  const { promise } = input;
  const deadline = addDays(promise.promisedDate, input.graceDays);
  const baselineDue = promise.baselineAmountDueCents;
  const baselineDpd = promise.baselineDaysPastDue;
  // Only snapshots strictly after the day the promise was made count as "newer".
  const window = relevant(input.snapshots, addDays(promise.createdDate, 1), deadline);
  let bestReduction = 0;
  let dpdImproved = false;
  for (const snapshot of window) {
    if (baselineDue !== null) bestReduction = Math.max(bestReduction, baselineDue - snapshot.amountDueCents);
    if (baselineDpd !== null && snapshot.daysPastDue < baselineDpd) dpdImproved = true;
  }
  const confirmed = input.reportedPayments
    .filter(p => p.status === "CONFIRMED_BY_IMPORT" && p.paidDate >= promise.createdDate && p.paidDate <= deadline)
    .reduce((sum, p) => sum + p.amountCents, 0);
  const covered = Math.max(bestReduction, confirmed);

  if (dpdImproved || covered >= promise.promisedAmountCents) {
    return { status: "KEPT", reductionCents: covered, note: dpdImproved ? "Days past due went down." : "Amount due went down by at least the promised amount." };
  }
  if (input.today <= deadline) return { status: "OPEN", reductionCents: covered, note: "Waiting for the promised date." };
  if (input.reportedPayments.some(p => p.status === "PENDING_CONFIRMATION")) {
    return { status: "OPEN", reductionCents: covered, note: "Waiting: the customer reported a payment that isn't confirmed yet." };
  }
  if (covered > 0) return { status: "PARTIALLY_KEPT", reductionCents: covered, note: `Paid part: amount due went down by $${(covered / 100).toFixed(2)}.` };
  return { status: "BROKEN", reductionCents: 0, note: "No payment showed up by the promised date." };
}

export type ReportedOutcome = { status: "PENDING_CONFIRMATION" | "CONFIRMED_BY_IMPORT" | "NOT_FOUND"; note: string };

/**
 * Confirmed when a later snapshot shows amount due went down by at least the reported amount,
 * or days past due improved. Otherwise NOT_FOUND once the confirmation window (default 2 days) passes.
 */
export function resolveReportedPayment(input: {
  payment: { amountCents: number; reportedDate: string; baselineAmountDueCents: number | null; baselineDaysPastDue: number | null };
  snapshots: SnapshotPoint[];
  today: string;
  windowDays: number;
}): ReportedOutcome {
  const { payment } = input;
  const later = input.snapshots.filter(s => s.asOfDate > payment.reportedDate);
  for (const snapshot of later) {
    const reduced = payment.baselineAmountDueCents !== null && payment.baselineAmountDueCents - snapshot.amountDueCents >= payment.amountCents;
    const improved = payment.baselineDaysPastDue !== null && snapshot.daysPastDue < payment.baselineDaysPastDue;
    if (reduced || improved) return { status: "CONFIRMED_BY_IMPORT", note: `Confirmed by the DealerCenter import of ${snapshot.asOfDate}.` };
  }
  if (daysBetween(payment.reportedDate, input.today) > input.windowDays) {
    return { status: "NOT_FOUND", note: "Not seen in DealerCenter yet. Check it, and post it in DealerCenter if it was paid." };
  }
  return { status: "PENDING_CONFIRMATION", note: "Waiting for a DealerCenter import to show it." };
}

export type InstallmentStatus = "OPEN" | "KEPT" | "PARTIALLY_KEPT" | "BROKEN" | "CANCELLED" | "SUPERSEDED";

/** Any broken (or partly kept) installment breaks the plan; all kept completes it. */
export function resolvePlanStatus(installments: InstallmentStatus[]): "ACTIVE" | "COMPLETED" | "BROKEN" {
  const live = installments.filter(s => s !== "CANCELLED" && s !== "SUPERSEDED");
  if (live.some(s => s === "BROKEN" || s === "PARTIALLY_KEPT")) return "BROKEN";
  if (live.length > 0 && live.every(s => s === "KEPT")) return "COMPLETED";
  return "ACTIVE";
}

/** Validates a plan's installments: 2-52 payments, dates in order and not in the past, amounts above zero. */
export function validatePlan(installments: Array<{ date: string; amountCents: number }>, today: string) {
  const problems: string[] = [];
  if (installments.length < 2 || installments.length > 52) problems.push("A plan needs between 2 and 52 payments.");
  installments.forEach((item, i) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(item.date)) problems.push(`Payment ${i + 1}: choose a date.`);
    else if (item.date < today) problems.push(`Payment ${i + 1}: the date is in the past.`);
    if (!Number.isInteger(item.amountCents) || item.amountCents <= 0) problems.push(`Payment ${i + 1}: enter an amount above $0.`);
    if (i > 0 && item.date <= installments[i - 1].date) problems.push(`Payment ${i + 1}: dates must go forward.`);
  });
  return problems;
}
