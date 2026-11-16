/**
 * Which dispatch board tasks an account should have right now (spec section 7, step 4).
 *
 * Pure function: the server compares this "wanted" list with the open task links and
 * creates the missing ones and closes the ones whose reason is gone. Each wanted task
 * carries `since`: the moment its reason started. If a task for the same reason was
 * already created after that moment (even one a person has since completed), it is not
 * created again. That is what makes the job safe to run any number of times.
 *
 * Automations only create and close reminder tasks. They never disable a starter,
 * assign a repo, send a letter or clear a flag.
 */
import type { CollectionsSettings } from "./settings";

export const TASK_REASONS = [
  "BROKEN_PROMISE",
  "DISABLE_REVIEW",
  "TWO_WEEK_FOLLOW_UP",
  "THIRTY_DAY_REVIEW",
  "REPO_REVIEW",
  "INSURANCE_NEEDED",
  "REPORTED_PAYMENT_NOT_FOUND",
  "RE_ENABLE_STARTER",
  "REPO_TLC",
  "BANKRUPTCY_ATTORNEY_REVIEW",
  "IMPORT_REMINDER"
] as const;
export type TaskReason = (typeof TASK_REASONS)[number];
export type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export const TASK_REASON_INFO: Record<TaskReason, { title: string; priority: TaskPriority; why: string; closedNote: string }> = {
  BROKEN_PROMISE: { title: "Call customer: broken promise", priority: "HIGH", why: "A promise or plan payment was broken (or only partly kept).", closedNote: "A new promise or plan was made, or the account is no longer past due." },
  DISABLE_REVIEW: { title: "Starter-disable review", priority: "HIGH", why: "The account reached the starter-disable review threshold. A manager decides; nothing is disabled automatically.", closedNote: "Days past due dropped below the disable-review threshold, the starter is already disabled, or the account moved to a later review." },
  TWO_WEEK_FOLLOW_UP: { title: "2-week follow-up", priority: "MEDIUM", why: "The account reached the 2-week follow-up threshold.", closedNote: "Days past due dropped below the 2-week threshold, or the account moved to a later review." },
  THIRTY_DAY_REVIEW: { title: "30-day account review", priority: "HIGH", why: "The account reached the 30-day review threshold.", closedNote: "Days past due dropped below the 30-day threshold, or the account moved to repo review." },
  REPO_REVIEW: { title: "Repo review", priority: "CRITICAL", why: "The account reached the repo review threshold. A manager decides; no repo is assigned automatically.", closedNote: "Days past due dropped below the repo threshold, a repo hold was set, or a repo case is already under way." },
  INSURANCE_NEEDED: { title: "Get proof of insurance", priority: "MEDIUM", why: "Insurance on file is expired or missing.", closedNote: "Current insurance is now on file." },
  REPORTED_PAYMENT_NOT_FOUND: { title: "Check reported payment in DealerCenter", priority: "HIGH", why: "The customer said they paid, but no import has shown it.", closedNote: "The reported payment was resolved, or the account is no longer past due." },
  RE_ENABLE_STARTER: { title: "Re-enable starter", priority: "CRITICAL", why: "A payment or arrangement was recorded after the starter was disabled. A person re-enables it in the GPS portal.", closedNote: "The starter was re-enabled." },
  REPO_TLC: { title: "Repo: TLC Recovery", priority: "HIGH", why: "A repo is assigned to TLC Recovery. Keep the status up to date.", closedNote: "The repo case moved past the assigned/located stage." },
  BANKRUPTCY_ATTORNEY_REVIEW: { title: "Bankruptcy: review with attorney", priority: "HIGH", why: "A bankruptcy flag is set. The account is frozen; review it with the bankruptcy attorney.", closedNote: "The bankruptcy freeze was cleared." },
  IMPORT_REMINDER: { title: "Import DealerCenter accounts", priority: "HIGH", why: "No DealerCenter Active Accounts file has been imported today.", closedNote: "Today's DealerCenter file was imported." }
};

export type AccountTaskFacts = {
  daysPastDue: number;
  /** PAID_OFF / CLOSED / archived / repossessed: no collection tasks. */
  inactive: boolean;
  activeFlags: string[];
  bankruptcyFlaggedAt: Date | null;
  /** When the latest promise or plan payment was resolved BROKEN or PARTIALLY_KEPT. */
  lastBrokenAt: Date | null;
  /** An open promise or active plan created after lastBrokenAt. */
  arrangementAfterBroken: boolean;
  /** When the latest still-standing NOT_FOUND reported payment was resolved. */
  lastNotFoundAt: Date | null;
  /** Latest done-in-portal starter action. */
  starter: { action: "DISABLE" | "ENABLE"; at: Date } | null;
  /** Latest promise, plan or reported payment creation time (not cancelled). */
  lastArrangementAt: Date | null;
  /** Open repo case, if any. */
  repo: { status: string; since: Date } | null;
  /** When a repo case was last closed as REDEEMED (the customer got the car back). */
  redeemedAt?: Date | null;
  /** Effective insurance status and when that record was entered. */
  insurance: { status: string; since: Date } | null;
  /** For each DPD threshold: the date the account last was below it (null = never seen below). */
  belowThresholdSince: { disable: Date | null; twoWeek: Date | null; thirtyDay: Date | null; repo: Date | null };
};

export type WantedTask = { reason: TaskReason; since: Date | null; detail?: string };

const EPOCH = null;

export function wantedAccountTasks(f: AccountTaskFacts, settings: CollectionsSettings): WantedTask[] {
  if (f.inactive) return [];
  if (f.activeFlags.includes("BANKRUPTCY")) return [{ reason: "BANKRUPTCY_ATTORNEY_REVIEW", since: f.bankruptcyFlaggedAt }];
  if (f.activeFlags.includes("DECEASED")) return [];

  const wanted: WantedTask[] = [];
  const pastDue = f.daysPastDue > 0;
  const starterDisabled = f.starter?.action === "DISABLE";
  const repoActive = f.repo && ["APPROVED", "ASSIGNED", "LOCATED"].includes(f.repo.status);

  if (f.lastBrokenAt && !f.arrangementAfterBroken && pastDue) wanted.push({ reason: "BROKEN_PROMISE", since: f.lastBrokenAt });
  if (f.lastNotFoundAt && pastDue) wanted.push({ reason: "REPORTED_PAYMENT_NOT_FOUND", since: f.lastNotFoundAt });

  // One days-past-due task at a time: the highest threshold reached.
  if (!repoActive) {
    const t = settings.thresholds;
    const hold = f.activeFlags.includes("DO_NOT_REPO_REVIEW_HOLD");
    if (f.daysPastDue >= t.repoReview && !hold) wanted.push({ reason: "REPO_REVIEW", since: f.belowThresholdSince.repo ?? EPOCH });
    else if (f.daysPastDue >= t.review30) wanted.push({ reason: "THIRTY_DAY_REVIEW", since: f.belowThresholdSince.thirtyDay ?? EPOCH });
    else if (f.daysPastDue >= t.followUp) wanted.push({ reason: "TWO_WEEK_FOLLOW_UP", since: f.belowThresholdSince.twoWeek ?? EPOCH });
    else if (f.daysPastDue >= t.disableReview && !starterDisabled) wanted.push({ reason: "DISABLE_REVIEW", since: f.belowThresholdSince.disable ?? EPOCH });
  }

  if (f.insurance && (f.insurance.status === "EXPIRED" || f.insurance.status === "MISSING")) wanted.push({ reason: "INSURANCE_NEEDED", since: f.insurance.since });

  if (starterDisabled && f.starter && ((f.lastArrangementAt && f.lastArrangementAt > f.starter.at) || !pastDue || (f.redeemedAt && f.redeemedAt > f.starter.at))) {
    wanted.push({ reason: "RE_ENABLE_STARTER", since: f.starter.at });
  }
  if (f.repo && ["ASSIGNED", "LOCATED"].includes(f.repo.status)) wanted.push({ reason: "REPO_TLC", since: f.repo.since });
  return wanted;
}

/** Effective insurance status of the latest record (records are append-only, so this is computed). */
export function effectiveInsuranceStatus(record: { status: string; expirationDate: string | null } | null, today: string, expiringSoonDays: number) {
  if (!record) return "UNKNOWN";
  if (record.status === "MISSING") return "MISSING";
  if (record.expirationDate) {
    if (record.expirationDate < today) return "EXPIRED";
    const soon = new Date(`${today}T00:00:00Z`);
    soon.setUTCDate(soon.getUTCDate() + expiringSoonDays);
    if (record.expirationDate <= soon.toISOString().slice(0, 10)) return "EXPIRING_SOON";
  }
  return record.status;
}

/** Should the daily job run now? Mon–Sat, at or after the configured Chicago time. */
export function isDailyRunDue(clock: { weekday: number; minutes: number }, runTimeMinutes: number) {
  return clock.weekday >= 1 && clock.weekday <= 6 && clock.minutes >= runTimeMinutes;
}

/** Summary line for the activity feed, e.g. "Collections: 12 broken promises, 3 disable reviews". */
export function summaryMessage(created: Partial<Record<TaskReason, number>>, outcomes: { promisesBroken: number; promisesKept: number; reportedNotFound: number }) {
  const parts: string[] = [];
  const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
  if (outcomes.promisesBroken) parts.push(plural(outcomes.promisesBroken, "broken promise", "broken promises"));
  if (outcomes.promisesKept) parts.push(plural(outcomes.promisesKept, "promise kept", "promises kept"));
  if (outcomes.reportedNotFound) parts.push(plural(outcomes.reportedNotFound, "reported payment not found", "reported payments not found"));
  const labels: Partial<Record<TaskReason, [string, string]>> = {
    DISABLE_REVIEW: ["disable review", "disable reviews"], TWO_WEEK_FOLLOW_UP: ["2-week follow-up", "2-week follow-ups"], THIRTY_DAY_REVIEW: ["30-day review", "30-day reviews"],
    REPO_REVIEW: ["repo review", "repo reviews"], INSURANCE_NEEDED: ["insurance request", "insurance requests"], RE_ENABLE_STARTER: ["starter re-enable", "starter re-enables"],
    BANKRUPTCY_ATTORNEY_REVIEW: ["bankruptcy review", "bankruptcy reviews"]
  };
  for (const [reason, [one, many]] of Object.entries(labels) as Array<[TaskReason, [string, string]]>) {
    const n = created[reason] ?? 0;
    if (n) parts.push(plural(n, one, many));
  }
  return parts.length ? `Collections: ${parts.join(", ")}.` : "Collections: no new follow-ups today.";
}
