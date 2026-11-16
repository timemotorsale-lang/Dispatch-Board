/** Buckets and account status (spec section 5). Pure functions, no database. */

export type Bucket = "CURRENT" | "GRACE_1_5" | "LATE_6_14" | "D15_30" | "D31_60" | "D61_PLUS";
export type AccountStatus =
  | "CURRENT" | "GRACE" | "PAST_DUE" | "PROMISE_ACTIVE" | "PLAN_ACTIVE" | "DISABLE_ELIGIBLE" | "STARTER_DISABLED"
  | "REPO_REVIEW" | "REPO_ASSIGNED" | "REPOSSESSED" | "REDEEMED" | "BANKRUPTCY_FROZEN" | "PAID_OFF" | "CLOSED";

export const BUCKETS: readonly Bucket[] = ["CURRENT", "GRACE_1_5", "LATE_6_14", "D15_30", "D31_60", "D61_PLUS"];
export const BUCKET_LABELS: Record<Bucket, string> = {
  CURRENT: "Current", GRACE_1_5: "Grace (1–5)", LATE_6_14: "Late (6–14)", D15_30: "15–30", D31_60: "31–60", D61_PLUS: "61+"
};

/** Grace length is a setting (default 5). The other edges are fixed by the spec. */
export function bucketFor(daysPastDue: number, graceDays = 5): Bucket {
  if (daysPastDue <= 0) return "CURRENT";
  if (daysPastDue <= graceDays) return "GRACE_1_5";
  if (daysPastDue <= 14) return "LATE_6_14";
  if (daysPastDue <= 30) return "D15_30";
  if (daysPastDue <= 60) return "D31_60";
  return "D61_PLUS";
}

export type StatusInput = {
  daysPastDue: number;
  graceDays: number;
  disableThreshold: number;
  repoThreshold: number;
  dmsRepoStatus?: string | null;
  bankruptcyActive: boolean;
  /** Current repo case status, if any open/closed case drives status. */
  repoCaseStatus?: string | null;
  starterDisabled: boolean;
  hasActivePlan: boolean;
  hasOpenPromise: boolean;
  /** Owner-confirmed closure of an account missing from imports. */
  closedStatus?: "PAID_OFF" | "CLOSED" | null;
  /** DO_NOT_REPO_REVIEW_HOLD flag keeps the account out of repo review. */
  repoReviewHold?: boolean;
};

const REPO_ASSIGNED_STATES = new Set(["ASSIGNED", "LOCATED", "APPROVED"]);
const REPOSSESSED_STATES = new Set(["RECOVERED", "IN_STORAGE", "SENT_TO_AUCTION", "RETURNED_TO_INVENTORY"]);

export function isDmsRepossessed(value: string | null | undefined) {
  return (value ?? "").trim().toUpperCase().replace(/\s+/g, "_") === "REPOSSESSED";
}

/**
 * Status precedence, highest wins:
 * BANKRUPTCY_FROZEN -> REPOSSESSED/REDEEMED -> REPO_ASSIGNED -> REPO_REVIEW -> STARTER_DISABLED
 * -> DISABLE_ELIGIBLE -> PLAN_ACTIVE -> PROMISE_ACTIVE -> PAST_DUE -> GRACE -> CURRENT.
 * PAID_OFF/CLOSED come only from the owner confirming a missing account.
 */
export function deriveAccountStatus(input: StatusInput): AccountStatus {
  if (input.closedStatus) return input.closedStatus;
  if (input.bankruptcyActive) return "BANKRUPTCY_FROZEN";
  const repo = input.repoCaseStatus ?? null;
  if (repo === "REDEEMED") {
    // A redeemed case hands the account back to its import-driven status.
  } else if ((repo && REPOSSESSED_STATES.has(repo)) || isDmsRepossessed(input.dmsRepoStatus)) {
    return "REPOSSESSED";
  }
  if (repo && REPO_ASSIGNED_STATES.has(repo)) return "REPO_ASSIGNED";
  const dpd = input.daysPastDue;
  if (repo === "REVIEW" || (dpd >= input.repoThreshold && !input.repoReviewHold)) return "REPO_REVIEW";
  if (input.starterDisabled) return "STARTER_DISABLED";
  if (dpd >= input.disableThreshold) return "DISABLE_ELIGIBLE";
  if (input.hasActivePlan) return "PLAN_ACTIVE";
  if (input.hasOpenPromise) return "PROMISE_ACTIVE";
  if (dpd > input.graceDays) return "PAST_DUE";
  if (dpd > 0) return "GRACE";
  return "CURRENT";
}

export const STATUS_LABELS: Record<AccountStatus, string> = {
  CURRENT: "Current", GRACE: "Grace", PAST_DUE: "Past due", PROMISE_ACTIVE: "Promise active", PLAN_ACTIVE: "Plan active",
  DISABLE_ELIGIBLE: "Disable eligible", STARTER_DISABLED: "Starter disabled", REPO_REVIEW: "Repo review",
  REPO_ASSIGNED: "Repo assigned", REPOSSESSED: "Repossessed", REDEEMED: "Redeemed", BANKRUPTCY_FROZEN: "Bankruptcy freeze",
  PAID_OFF: "Paid off", CLOSED: "Closed"
};
