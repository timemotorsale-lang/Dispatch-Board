/**
 * Collection playbooks (spec 22.1). A playbook decides, stage by stage, which automatic
 * message goes out on which day and which board task or review is created. The automations
 * read these values from the active playbook instead of fixed numbers.
 *
 * Guardrails are NOT part of a playbook and can't be edited here: send rules, quiet hours,
 * STOP handling, the bankruptcy freeze, human-only actions, and the never-automatic
 * disable warning.
 */
import { BUCKET_LABELS, bucketFor, type Bucket } from "./status";
import { MESSAGE_RULE_KEYS, type CollectionsSettings, type MessageRuleKey } from "./settings";

export const PLAYBOOK_TASKS = ["BROKEN_PROMISE", "REPORTED_PAYMENT_NOT_FOUND", "DISABLE_REVIEW", "TWO_WEEK_FOLLOW_UP", "THIRTY_DAY_REVIEW", "REPO_REVIEW", "INSURANCE_NEEDED"] as const;
export type PlaybookTask = (typeof PLAYBOOK_TASKS)[number];
/** Tasks tied to a days-past-due threshold. */
export const THRESHOLD_TASKS = { DISABLE_REVIEW: "disableReview", TWO_WEEK_FOLLOW_UP: "followUp", THIRTY_DAY_REVIEW: "review30", REPO_REVIEW: "repoReview" } as const;
const PLAYBOOK_MESSAGES = MESSAGE_RULE_KEYS.filter(key => key !== "DISABLE_WARNING");

export type PlaybookRules = {
  messages: Record<Exclude<MessageRuleKey, "DISABLE_WARNING">, { enabled: boolean; dayOffset: number }>;
  tasks: Record<PlaybookTask, { enabled: boolean; atDays?: number }>;
};

export const PLAYBOOK_LABELS: Record<string, string> = {
  DUE_SOON: "Text: payment due soon", PAST_DUE_DAY1: "Text: payment missed", PAST_DUE_LATE_FEE: "Text: late fee day", PROMISE_REMINDER: "Text: promise reminder", INSURANCE_NEEDED_MSG: "Text: insurance needed",
  BROKEN_PROMISE: "Task: call about broken promise", REPORTED_PAYMENT_NOT_FOUND: "Task: check reported payment", DISABLE_REVIEW: "Review: starter disable",
  TWO_WEEK_FOLLOW_UP: "Task: 2-week follow-up", THIRTY_DAY_REVIEW: "Review: 30-day account review", REPO_REVIEW: "Review: repossession", INSURANCE_NEEDED: "Task: get proof of insurance"
};

/** The seeded "Standard" playbook: exactly today's rules (spec sections 5, 7 and 8.3). */
export function standardPlaybook(settings: CollectionsSettings): PlaybookRules {
  const m = settings.messageRules;
  return {
    messages: Object.fromEntries(PLAYBOOK_MESSAGES.map(key => [key, { enabled: m[key].enabled, dayOffset: m[key].dayOffset }])) as PlaybookRules["messages"],
    tasks: {
      BROKEN_PROMISE: { enabled: true }, REPORTED_PAYMENT_NOT_FOUND: { enabled: true }, INSURANCE_NEEDED: { enabled: true },
      DISABLE_REVIEW: { enabled: true, atDays: settings.thresholds.disableReview }, TWO_WEEK_FOLLOW_UP: { enabled: true, atDays: settings.thresholds.followUp },
      THIRTY_DAY_REVIEW: { enabled: true, atDays: settings.thresholds.review30 }, REPO_REVIEW: { enabled: true, atDays: settings.thresholds.repoReview }
    }
  };
}

const rec = (v: unknown): v is Record<string, unknown> => Boolean(v) && typeof v === "object" && !Array.isArray(v);
const whole = (v: unknown, fallback: number, min: number, max: number) => { const n = Number(v); return Number.isInteger(n) && n >= min && n <= max ? n : fallback; };

/** Read stored playbook JSON, filling anything missing from the standard playbook. Never throws. */
export function parsePlaybookRules(raw: unknown, fallback: PlaybookRules): PlaybookRules {
  const v = rec(raw) ? raw : {};
  const msgs = rec(v.messages) ? v.messages : {}, tasks = rec(v.tasks) ? v.tasks : {};
  return {
    messages: Object.fromEntries(PLAYBOOK_MESSAGES.map(key => {
      const r = rec(msgs[key]) ? msgs[key] as Record<string, unknown> : {};
      const f = fallback.messages[key as keyof PlaybookRules["messages"]];
      return [key, { enabled: typeof r.enabled === "boolean" ? r.enabled : f.enabled, dayOffset: whole(r.dayOffset, f.dayOffset, -30, 60) }];
    })) as PlaybookRules["messages"],
    tasks: Object.fromEntries(PLAYBOOK_TASKS.map(key => {
      const r = rec(tasks[key]) ? tasks[key] as Record<string, unknown> : {};
      const f = fallback.tasks[key];
      return [key, { enabled: typeof r.enabled === "boolean" ? r.enabled : f.enabled, ...(f.atDays !== undefined ? { atDays: whole(r.atDays, f.atDays, 1, 365) } : {}) }];
    })) as PlaybookRules["tasks"]
  };
}

export function validatePlaybook(rules: PlaybookRules): string[] {
  const errors: string[] = [];
  const t = rules.tasks;
  const days = [t.DISABLE_REVIEW.atDays!, t.TWO_WEEK_FOLLOW_UP.atDays!, t.THIRTY_DAY_REVIEW.atDays!, t.REPO_REVIEW.atDays!];
  if (!(days[0] < days[1] && days[1] < days[2] && days[2] < days[3])) errors.push("Review days must go up: starter-disable review < 2-week follow-up < 30-day review < repo review.");
  if (rules.messages.DUE_SOON.dayOffset > 0) errors.push("The due-soon text must be on or before the due date (0 or a negative number).");
  if (rules.messages.PROMISE_REMINDER.dayOffset > 0) errors.push("The promise reminder must be on or before the promise date (0 or a negative number).");
  if (rules.messages.PAST_DUE_DAY1.dayOffset < 1 || rules.messages.PAST_DUE_LATE_FEE.dayOffset < 1) errors.push("Past-due texts need 1 or more days past due.");
  if (rules.messages.INSURANCE_NEEDED.dayOffset < 1) errors.push("Insurance reminders need at least 1 day between them.");
  return errors;
}

/** Settings as the automations see them: the active playbook's days, messages and task switches. */
export function applyPlaybook(settings: CollectionsSettings, rules: PlaybookRules): CollectionsSettings {
  const t = rules.tasks;
  return {
    ...settings,
    thresholds: { disableReview: t.DISABLE_REVIEW.atDays!, followUp: t.TWO_WEEK_FOLLOW_UP.atDays!, review30: t.THIRTY_DAY_REVIEW.atDays!, repoReview: t.REPO_REVIEW.atDays! },
    messageRules: { ...settings.messageRules, ...rules.messages, DISABLE_WARNING: { enabled: false, dayOffset: 0 } },
    taskEnabled: Object.fromEntries(PLAYBOOK_TASKS.map(key => [key, t[key].enabled]))
  };
}

export type PlaybookStep = { key: string; label: string; when: string; enabled: boolean; sortDay: number };

/** The playbook laid out by delinquency stage, in order, for the Playbook screen. */
export function playbookByStage(rules: PlaybookRules, graceDays: number): Array<{ bucket: Bucket; label: string; steps: PlaybookStep[] }> {
  const steps: Array<PlaybookStep & { dpd: number }> = [];
  const m = rules.messages;
  steps.push({ key: "DUE_SOON", label: PLAYBOOK_LABELS.DUE_SOON, when: `${Math.abs(m.DUE_SOON.dayOffset)} day(s) before the due date`, enabled: m.DUE_SOON.enabled, sortDay: m.DUE_SOON.dayOffset, dpd: 0 });
  steps.push({ key: "PROMISE_REMINDER", label: PLAYBOOK_LABELS.PROMISE_REMINDER, when: `${Math.abs(m.PROMISE_REMINDER.dayOffset)} day(s) before any promise date`, enabled: m.PROMISE_REMINDER.enabled, sortDay: -0.5, dpd: 0 });
  steps.push({ key: "PAST_DUE_DAY1", label: PLAYBOOK_LABELS.PAST_DUE_DAY1, when: `day ${m.PAST_DUE_DAY1.dayOffset} past due`, enabled: m.PAST_DUE_DAY1.enabled, sortDay: m.PAST_DUE_DAY1.dayOffset, dpd: m.PAST_DUE_DAY1.dayOffset });
  steps.push({ key: "PAST_DUE_LATE_FEE", label: PLAYBOOK_LABELS.PAST_DUE_LATE_FEE, when: `day ${m.PAST_DUE_LATE_FEE.dayOffset} past due`, enabled: m.PAST_DUE_LATE_FEE.enabled, sortDay: m.PAST_DUE_LATE_FEE.dayOffset, dpd: m.PAST_DUE_LATE_FEE.dayOffset });
  for (const key of Object.keys(THRESHOLD_TASKS) as Array<keyof typeof THRESHOLD_TASKS>) {
    const d = rules.tasks[key].atDays!;
    steps.push({ key, label: PLAYBOOK_LABELS[key], when: `day ${d} past due`, enabled: rules.tasks[key].enabled, sortDay: d, dpd: d });
  }
  const anyTime = [
    { key: "BROKEN_PROMISE", label: PLAYBOOK_LABELS.BROKEN_PROMISE, when: "when a promise or plan payment is broken", enabled: rules.tasks.BROKEN_PROMISE.enabled, sortDay: 999, dpd: 1 },
    { key: "REPORTED_PAYMENT_NOT_FOUND", label: PLAYBOOK_LABELS.REPORTED_PAYMENT_NOT_FOUND, when: "when a reported payment isn't found", enabled: rules.tasks.REPORTED_PAYMENT_NOT_FOUND.enabled, sortDay: 999, dpd: 1 },
    { key: "INSURANCE_NEEDED", label: PLAYBOOK_LABELS.INSURANCE_NEEDED, when: "when insurance is expired or missing (any stage)", enabled: rules.tasks.INSURANCE_NEEDED.enabled, sortDay: 999, dpd: 0 },
    { key: "INSURANCE_NEEDED_MSG", label: PLAYBOOK_LABELS.INSURANCE_NEEDED_MSG, when: `with that task, then every ${m.INSURANCE_NEEDED.dayOffset} days (max 3)`, enabled: m.INSURANCE_NEEDED.enabled, sortDay: 999, dpd: 0 }
  ];
  steps.push(...anyTime);
  const buckets: Bucket[] = ["CURRENT", "GRACE_1_5", "LATE_6_14", "D15_30", "D31_60", "D61_PLUS"];
  return buckets.map(bucket => ({
    bucket, label: BUCKET_LABELS[bucket],
    steps: steps.filter(s => bucketFor(s.dpd, graceDays) === bucket).sort((a, b) => a.sortDay - b.sortDay).map(({ dpd: _dpd, ...rest }) => { void _dpd; return rest; })
  }));
}
