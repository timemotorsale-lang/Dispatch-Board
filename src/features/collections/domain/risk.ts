/**
 * Risk score and "Do this next" (spec 22.2). Rule-based and explainable: every point in the
 * score comes from a named factor with a plain-English reason, and the weights are settings.
 * Nothing here takes an action; it only helps a person decide what to do first.
 */
import type { RiskWeights } from "./settings";

export type RiskInput = {
  daysPastDue: number;
  /** Days past due about 30 days ago (null if no data that old). */
  daysPastDue30DaysAgo: number | null;
  /** Payments seen in the last 90 days (amount due or days past due went down between imports). */
  paymentsSeen90: number;
  /** Payments expected in 90 days from the payment frequency. */
  paymentsExpected90: number;
  brokenPromises90: number;
  contactAttempts90: number;
  rightPartyContacts90: number;
  insuranceStatus: string;
  possibleSkip: boolean;
  accountAgeMonths: number | null;
};

export type RiskFactor = { key: keyof RiskWeights; label: string; points: number; detail: string };

const round = (n: number) => Math.round(n * 10) / 10;

export function computeRiskScore(input: RiskInput, w: RiskWeights): { score: number; factors: RiskFactor[] } {
  const factors: RiskFactor[] = [];
  const add = (key: keyof RiskWeights, label: string, fraction: number, detail: string) => {
    const points = round(Math.max(0, Math.min(1, fraction)) * w[key]);
    if (points > 0) factors.push({ key, label, points, detail });
  };
  add("daysPastDue", "Days past due", input.daysPastDue / 90, `${input.daysPastDue} days past due`);
  if (input.daysPastDue30DaysAgo !== null && input.daysPastDue > input.daysPastDue30DaysAgo) {
    add("dpdTrend", "Getting further behind", (input.daysPastDue - input.daysPastDue30DaysAgo) / 30, `${input.daysPastDue30DaysAgo} → ${input.daysPastDue} days past due over 30 days`);
  }
  if (input.paymentsExpected90 > 0) {
    const missed = Math.max(0, input.paymentsExpected90 - input.paymentsSeen90);
    add("missedPayments", "Missed payments", missed / input.paymentsExpected90, `${input.paymentsSeen90} of about ${input.paymentsExpected90} expected payments seen in 90 days`);
  }
  add("brokenPromises", "Broken promises", input.brokenPromises90 / 3, `${input.brokenPromises90} broken promise(s) in 90 days`);
  if (input.contactAttempts90 >= 2) {
    const rate = input.rightPartyContacts90 / input.contactAttempts90;
    add("lowContactSuccess", "Hard to reach", 1 - rate, `reached the customer ${input.rightPartyContacts90} of ${input.contactAttempts90} tries in 90 days`);
  }
  if (input.insuranceStatus === "EXPIRED" || input.insuranceStatus === "MISSING") add("insurance", "Insurance problem", 1, `insurance ${input.insuranceStatus.toLowerCase()}`);
  else if (input.insuranceStatus === "EXPIRING_SOON") add("insurance", "Insurance expiring", 0.4, "insurance expiring soon");
  if (input.possibleSkip) add("possibleSkip", "Possible skip", 1, "open possible-skip alert");
  if (input.accountAgeMonths !== null && input.accountAgeMonths < 6) add("newAccount", "New account", 1, `account ${input.accountAgeMonths} month(s) old`);
  const score = Math.min(100, Math.round(factors.reduce((sum, f) => sum + f.points, 0)));
  return { score, factors: factors.sort((a, b) => b.points - a.points) };
}

export function paymentsPer90Days(frequency: string) {
  return frequency === "WEEKLY" ? 13 : frequency === "BIWEEKLY" ? 6 : frequency === "SEMIMONTHLY" ? 6 : 3;
}

export type NextActionInput = {
  frozen: boolean;
  unreadTexts: number;
  brokenPromiseDaysAgo: number | null;
  answeredOfLast: { answered: number; tries: number };
  reportedPaymentNotFound: boolean;
  promiseDueToday: boolean;
  starterDisabled: boolean;
  arrangementSinceDisable: boolean;
  disableEligible: boolean;
  openPromise: boolean;
  insuranceProblem: boolean;
  possibleSkip: boolean;
  daysPastDue: number;
  daysSinceContact: number | null;
  repoInProgress: boolean;
};

export type NextAction = { action: string; reason: string; urgency: "NOW" | "TODAY" | "SOON" | "NONE" };

/** One recommended action with its reason, in a fixed and explainable priority order. */
export function nextBestAction(f: NextActionInput): NextAction {
  const reach = f.answeredOfLast.tries ? `, answered ${f.answeredOfLast.answered} of last ${f.answeredOfLast.tries} calls` : "";
  if (f.frozen) return { action: "Don't collect. Review with the bankruptcy attorney", reason: "Bankruptcy freeze is on", urgency: "NONE" };
  if (f.unreadTexts) return { action: "Reply to the customer's text", reason: `${f.unreadTexts} unread text${f.unreadTexts === 1 ? "" : "s"}`, urgency: "NOW" };
  if (f.starterDisabled && f.arrangementSinceDisable) return { action: "Re-enable the starter", reason: "A payment or arrangement came in after the disable", urgency: "NOW" };
  if (f.brokenPromiseDaysAgo !== null && f.brokenPromiseDaysAgo <= 14) return { action: "Call today", reason: `Promise broken ${f.brokenPromiseDaysAgo === 0 ? "today" : f.brokenPromiseDaysAgo === 1 ? "yesterday" : `${f.brokenPromiseDaysAgo} days ago`}${reach}`, urgency: "TODAY" };
  if (f.reportedPaymentNotFound) return { action: "Check DealerCenter for the reported payment", reason: "The customer said they paid, but no import shows it", urgency: "TODAY" };
  if (f.promiseDueToday) return { action: "Watch for today's promised payment", reason: "A promise is due today", urgency: "TODAY" };
  if (f.possibleSkip) return { action: "Work the skip-trace checklist", reason: "Possible skip: customer can't be reached", urgency: "TODAY" };
  if (f.repoInProgress) return { action: "Update the repo case", reason: "A repossession is in progress", urgency: "SOON" };
  if (f.disableEligible && !f.starterDisabled && !f.openPromise) return { action: "Review a starter disable", reason: `${f.daysPastDue} days past due with no promise${reach}`, urgency: "TODAY" };
  if (f.daysPastDue > 0 && !f.openPromise && (f.daysSinceContact === null || f.daysSinceContact >= 3)) return { action: "Call the customer", reason: f.daysSinceContact === null ? `${f.daysPastDue} days past due, never contacted` : `${f.daysPastDue} days past due, no contact in ${f.daysSinceContact} days`, urgency: "TODAY" };
  if (f.insuranceProblem) return { action: "Get proof of insurance", reason: "Insurance is expired, missing or expiring soon", urgency: "SOON" };
  if (f.daysPastDue > 0) return { action: "Follow up on the promise", reason: "Past due with an open promise", urgency: "SOON" };
  return { action: "Nothing needed today", reason: "Current, with no open issues", urgency: "NONE" };
}
