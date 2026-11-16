/**
 * Rules for extensions (22.3), possible-skip alerts (22.5), charge-off/recovery (22.6) and
 * fees and credits (22.8). Pure functions; the server records the decisions people make.
 */
import { addDays, daysBetween } from "./money-dates";
import type { CollectionsSettings } from "./settings";

// ---------- Extensions ----------

export function checkExtensionEligibility(input: { contractDate: string | null; today: string; approvedInLast12Months: number; openPromise: boolean }, rules: CollectionsSettings["extensionRules"]) {
  const notes: string[] = [];
  if (!input.contractDate) notes.push("Contract date unknown, so account age can't be checked.");
  else if (daysBetween(input.contractDate, input.today) < rules.minAccountAgeMonths * 30.4) notes.push(`Account is younger than ${rules.minAccountAgeMonths} months.`);
  if (input.approvedInLast12Months >= rules.maxPer12Months) notes.push(`Already ${input.approvedInLast12Months} extension(s) in the last 12 months (limit ${rules.maxPer12Months}).`);
  if (rules.blockWhileOpenPromise && input.openPromise) notes.push("There's an open promise on the account.");
  return { eligible: notes.length === 0, notes };
}

// ---------- Possible skip ----------

export const SKIP_STEPS = ["REFERENCES_CALLED", "NEW_PHONE_FOUND", "NEW_ADDRESS_FOUND", "GPS_CHECKED", "VENDOR_SEARCH", "EMPLOYER_CALLED", "MAIL_RETURNED", "GPS_NO_SIGNAL", "OTHER"] as const;
export type SkipStep = (typeof SKIP_STEPS)[number];
export const SKIP_STEP_LABELS: Record<SkipStep, string> = {
  REFERENCES_CALLED: "References called", NEW_PHONE_FOUND: "New phone number found", NEW_ADDRESS_FOUND: "New address found", GPS_CHECKED: "GPS location checked",
  VENDOR_SEARCH: "Skip-trace vendor search run", EMPLOYER_CALLED: "Employer called", MAIL_RETURNED: "Mail came back undeliverable", GPS_NO_SIGNAL: "GPS shows tamper / no signal", OTHER: "Other"
};
/** Checklist results that are themselves warning signs. */
const SKIP_SIGNAL_STEPS: SkipStep[] = ["MAIL_RETURNED", "GPS_NO_SIGNAL"];

export function skipSignals(input: { daysPastDue: number; today: string; lastRightPartyContact: string | null; firstPastDueDate: string | null; latestOutcome: string | null; recentSignalSteps: string[] }, noContactDays: number) {
  const reasons: string[] = [];
  if (input.daysPastDue > 0) {
    const since = input.lastRightPartyContact ?? input.firstPastDueDate;
    if (since && daysBetween(since, input.today) >= noContactDays) reasons.push(`No conversation with the customer in ${daysBetween(since, input.today)} days while past due`);
  }
  if (input.latestOutcome === "DISCONNECTED") reasons.push("Phone disconnected");
  if (input.latestOutcome === "WRONG_NUMBER") reasons.push("Wrong number");
  for (const step of input.recentSignalSteps) if (SKIP_SIGNAL_STEPS.includes(step as SkipStep)) reasons.push(SKIP_STEP_LABELS[step as SkipStep]);
  return reasons;
}

// ---------- Charge-off and recovery ----------

/** Positive = deficiency the customer may owe; negative = surplus. Minnesota notice rules: attorney to confirm. */
export function deficiencyCents(input: { balanceAtRepoCents: number; salePriceCents: number; costsCents: number[] }) {
  return input.balanceAtRepoCents + input.costsCents.reduce((s, c) => s + c, 0) - input.salePriceCents;
}

// ---------- Fees and credits ----------

export const ADJUSTMENT_TYPES = ["REPO_FEE", "STORAGE_FEE", "RETURNED_PAYMENT_FEE", "OTHER_FEE", "LATE_FEE_WAIVER", "GOODWILL_CREDIT", "OTHER_CREDIT"] as const;
export type AdjustmentType = (typeof ADJUSTMENT_TYPES)[number];
export const FEE_TYPES: AdjustmentType[] = ["REPO_FEE", "STORAGE_FEE", "RETURNED_PAYMENT_FEE", "OTHER_FEE"];

export type BalanceBaseline = { otherCents: number; lateCents: number; creditCents: number; totalBalanceCents: number };

/** Does a later DealerCenter import show this fee or credit? */
export function adjustmentShowsInImport(type: AdjustmentType, amountCents: number, baseline: BalanceBaseline, now: BalanceBaseline) {
  if (FEE_TYPES.includes(type)) return now.otherCents - baseline.otherCents >= amountCents || now.totalBalanceCents - baseline.totalBalanceCents >= amountCents;
  if (type === "LATE_FEE_WAIVER") return baseline.lateCents - now.lateCents >= amountCents;
  return now.creditCents - baseline.creditCents >= amountCents || baseline.otherCents - now.otherCents >= amountCents || baseline.totalBalanceCents - now.totalBalanceCents >= amountCents;
}

export function adjustmentNeedsApproval(amountCents: number, thresholdCents: number) {
  return thresholdCents <= 0 || amountCents > thresholdCents;
}

export function adjustmentOverdue(postedDate: string, today: string, windowDays: number) {
  return today > addDays(postedDate, windowDays);
}
