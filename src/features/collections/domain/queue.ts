import { addDays, chicagoToday } from "./money-dates";
/** Daily queue rules (spec section 6.1). Pure functions over already-loaded account facts. */
import type { Bucket } from "./status";

export const QUEUE_TABS = [
  { key: "PAST_DUE", label: "All past due" },
  { key: "BROKEN", label: "Broken promises" },
  { key: "PROMISES_TODAY", label: "Promises due today" },
  { key: "DISABLE", label: "Disable eligible" },
  { key: "REPO", label: "Repo review" },
  { key: "INSURANCE", label: "Insurance problems" },
  { key: "NEEDS_REVIEW", label: "Needs review (import)" },
  { key: "FLAGGED", label: "Frozen / flagged" },
  { key: "MISSING", label: "Not in latest import" },
  { key: "ALL", label: "All open accounts" }
] as const;
export type QueueTab = (typeof QUEUE_TABS)[number]["key"];

export type QueueFacts = {
  id: string;
  buyerName: string;
  dealNumber: string | null;
  stockNumber: string | null;
  vehicleDescription: string | null;
  phone: string | null;
  accountType: "LEASE_TO_OWN" | "BHPH";
  status: string;
  bucket: Bucket;
  daysPastDue: number;
  amountDueCents: number;
  assignedCollectorUserId: string | null;
  /** Latest risk score (0-100), when scored. */
  riskScore?: number | null;
  lastContactAt: string | null;
  nextActionAt: string | null;
  /** Next payment due date from the latest DealerCenter import ("YYYY-MM-DD"). */
  dueDate?: string | null;
  /** Date of the soonest open promise ("YYYY-MM-DD"). */
  promiseDate?: string | null;
  customerLinked: boolean;
  vehicleLinked: boolean;
  missingFromImport: boolean;
  activeFlags: string[];
  brokenPromise: boolean;
  promiseDueToday: boolean;
  reportedNotFound: boolean;
  insuranceProblem: boolean;
  unreadInbound: number;
};

export type QueueFilters = {
  tab?: QueueTab;
  bucket?: Bucket | "";
  type?: "LEASE_TO_OWN" | "BHPH" | "";
  collector?: string;
  status?: string;
  q?: string;
  /** "RISK" sorts by the risk score (highest first) instead of the standard order. */
  sort?: "" | "RISK";
  /** Date search: which date to look at, and the time range. */
  dateField?: QueueDateField | "";
  when?: QueueWhen | "";
  from?: string;
  to?: string;
};

export const QUEUE_DATE_FIELDS = [
  { key: "due", label: "Payment due date" },
  { key: "contact", label: "Last contact" },
  { key: "promise", label: "Promise date" },
  { key: "followup", label: "Follow-up date" }
] as const;
export type QueueDateField = (typeof QUEUE_DATE_FIELDS)[number]["key"];

export const QUEUE_WHEN = [
  { key: "today", label: "Today" },
  { key: "yesterday", label: "Yesterday" },
  { key: "tomorrow", label: "Tomorrow" },
  { key: "this_week", label: "This week (Sun–Sat)" },
  { key: "last_week", label: "Last week" },
  { key: "next_week", label: "Next week" },
  { key: "this_month", label: "This month" },
  { key: "last_month", label: "Last month" },
  { key: "last_7", label: "Last 7 days" },
  { key: "last_30", label: "Last 30 days" },
  { key: "before_today", label: "Before today" },
  { key: "never", label: "No date (never)" },
  { key: "custom", label: "A date or date range…" }
] as const;
export type QueueWhen = (typeof QUEUE_WHEN)[number]["key"];

const YMD = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Turns "this week", "last month", or a picked date into a from/to range (both inclusive,
 * "YYYY-MM-DD", Chicago calendar). "never" means the date is empty. Returns null when there's
 * nothing to filter on (for example "custom" with no dates picked).
 */
export function queueDateRange(when: QueueWhen | "" | undefined, today: string, from?: string, to?: string): { from: string | null; to: string | null } | "NEVER" | null {
  const weekday = new Date(`${today}T12:00:00Z`).getUTCDay(); // 0 = Sunday
  const sunday = addDays(today, -weekday);
  const [y, m] = today.split("-").map(Number);
  const monthStart = (year: number, month: number) => `${year}-${String(month).padStart(2, "0")}-01`;
  const thisMonth = monthStart(y, m);
  const nextMonth = m === 12 ? monthStart(y + 1, 1) : monthStart(y, m + 1);
  const lastMonth = m === 1 ? monthStart(y - 1, 12) : monthStart(y, m - 1);
  switch (when) {
    case "today": return { from: today, to: today };
    case "yesterday": return { from: addDays(today, -1), to: addDays(today, -1) };
    case "tomorrow": return { from: addDays(today, 1), to: addDays(today, 1) };
    case "this_week": return { from: sunday, to: addDays(sunday, 6) };
    case "last_week": return { from: addDays(sunday, -7), to: addDays(sunday, -1) };
    case "next_week": return { from: addDays(sunday, 7), to: addDays(sunday, 13) };
    case "this_month": return { from: thisMonth, to: addDays(nextMonth, -1) };
    case "last_month": return { from: lastMonth, to: addDays(thisMonth, -1) };
    case "last_7": return { from: addDays(today, -6), to: today };
    case "last_30": return { from: addDays(today, -29), to: today };
    case "before_today": return { from: null, to: addDays(today, -1) };
    case "never": return "NEVER";
    case "custom": {
      const a = from && YMD.test(from) ? from : null;
      const b = to && YMD.test(to) ? to : null;
      if (!a && !b) return null;
      // One date picked means "on that day".
      const start = a ?? b!, end = b ?? a!;
      return start <= end ? { from: start, to: end } : { from: end, to: start };
    }
    default: return null;
  }
}

/** The account's date for the chosen field, as a Chicago "YYYY-MM-DD" (or null). */
export function queueDateValue(facts: QueueFacts, field: QueueDateField) {
  switch (field) {
    case "due": return facts.dueDate ?? null;
    case "promise": return facts.promiseDate ?? null;
    case "contact": return facts.lastContactAt ? chicagoToday(new Date(facts.lastContactAt)) : null;
    case "followup": return facts.nextActionAt ? chicagoToday(new Date(facts.nextActionAt)) : null;
  }
}

/** Reads the date search from a URL query (page or API). Unknown values are ignored. */
export function parseQueueDateFilters(get: (key: string) => string | null | undefined) {
  const field = get("dateField") ?? "";
  const from = get("from") ?? "", to = get("to") ?? "";
  let when = get("when") ?? "";
  if (!when && (from || to)) when = "custom";
  return {
    dateField: (QUEUE_DATE_FIELDS.some(item => item.key === field) ? field : "") as QueueDateField | "",
    when: (QUEUE_WHEN.some(item => item.key === when) ? when : "") as QueueWhen | "",
    from: YMD.test(from) ? from : "",
    to: YMD.test(to) ? to : ""
  };
}

export function matchesDate(facts: QueueFacts, filters: Pick<QueueFilters, "dateField" | "when" | "from" | "to">, today: string) {
  if (!filters.dateField || !filters.when) return true;
  const range = queueDateRange(filters.when, today, filters.from, filters.to);
  if (!range) return true;
  const value = queueDateValue(facts, filters.dateField);
  if (range === "NEVER") return !value;
  if (!value) return false;
  return (!range.from || value >= range.from) && (!range.to || value <= range.to);
}

const FLAG_TAB = new Set(["BANKRUPTCY", "ATTORNEY_REPRESENTED", "CONTACT_RESTRICTED", "DISPUTE", "DECEASED", "SKIP"]);

export function isFrozen(facts: Pick<QueueFacts, "status" | "activeFlags">) {
  return facts.status === "BANKRUPTCY_FROZEN" || facts.activeFlags.includes("BANKRUPTCY");
}

export function inTab(facts: QueueFacts, tab: QueueTab) {
  // Every open account, current or late (used with the date search, e.g. "due this week").
  if (tab === "ALL") return true;
  // Frozen (bankruptcy) accounts only appear in their own tab.
  if (tab !== "FLAGGED" && isFrozen(facts)) return false;
  switch (tab) {
    case "PAST_DUE": return facts.daysPastDue > 0 && !["REPOSSESSED", "PAID_OFF", "CLOSED"].includes(facts.status);
    case "BROKEN": return facts.brokenPromise;
    case "PROMISES_TODAY": return facts.promiseDueToday;
    case "DISABLE": return facts.status === "DISABLE_ELIGIBLE";
    case "REPO": return facts.status === "REPO_REVIEW";
    case "INSURANCE": return facts.insuranceProblem;
    case "NEEDS_REVIEW": return !facts.customerLinked || !facts.vehicleLinked;
    case "FLAGGED": return isFrozen(facts) || facts.activeFlags.some(flag => FLAG_TAB.has(flag));
    case "MISSING": return facts.missingFromImport;
  }
}

export function matchesSearch(facts: QueueFacts, q: string) {
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  const digits = needle.replace(/\D/g, "");
  return [facts.buyerName, facts.dealNumber, facts.stockNumber].some(value => value?.toLowerCase().includes(needle)) ||
    (digits.length >= 4 && (facts.phone ?? "").replace(/\D/g, "").includes(digits));
}

/** (0) unread customer replies, (1) broken promises, (2) reported payments not found, (3) days past due, (4) amount due. */
export function compareQueue(a: QueueFacts, b: QueueFacts) {
  return Number(b.unreadInbound > 0) - Number(a.unreadInbound > 0) ||
    Number(b.brokenPromise) - Number(a.brokenPromise) ||
    Number(b.reportedNotFound) - Number(a.reportedNotFound) ||
    b.daysPastDue - a.daysPastDue ||
    b.amountDueCents - a.amountDueCents ||
    a.buyerName.localeCompare(b.buyerName);
}

export function buildQueue(all: QueueFacts[], filters: QueueFilters, today = chicagoToday()) {
  const tab = filters.tab ?? "PAST_DUE";
  const counts = Object.fromEntries(QUEUE_TABS.map(item => [item.key, all.filter(facts => inTab(facts, item.key)).length])) as Record<QueueTab, number>;
  const rows = all
    .filter(facts => inTab(facts, tab))
    .filter(facts => !filters.bucket || facts.bucket === filters.bucket)
    .filter(facts => !filters.type || facts.accountType === filters.type)
    .filter(facts => !filters.collector || facts.assignedCollectorUserId === filters.collector)
    .filter(facts => !filters.status || facts.status === filters.status)
    .filter(facts => matchesSearch(facts, filters.q ?? ""))
    .filter(facts => matchesDate(facts, filters, today))
    .sort(filters.sort === "RISK" ? (a, b) => (b.riskScore ?? -1) - (a.riskScore ?? -1) || compareQueue(a, b) : compareQueue);
  return { tab, counts, rows };
}

/** The one-line "why call" shown on each queue row, in priority order. */
export function queueReason(f: QueueFacts, today: string): { text: string; tone: "danger" | "warning" | "neutral" } {
  if (f.activeFlags.includes("BANKRUPTCY")) return { text: "Bankruptcy freeze: don't collect", tone: "neutral" };
  if (f.unreadInbound) return { text: `New text: reply waiting${f.unreadInbound > 1 ? ` (${f.unreadInbound})` : ""}`, tone: "danger" };
  if (f.brokenPromise) return { text: "Promise broken", tone: "danger" };
  if (f.reportedNotFound) return { text: "Reported payment not found", tone: "danger" };
  if (f.promiseDueToday) return { text: "Promise due today", tone: "warning" };
  if (f.status === "REPO_REVIEW" || f.status === "REPO_ASSIGNED") return { text: f.status === "REPO_ASSIGNED" ? "Repo assigned" : "Repo review", tone: "danger" };
  if (f.status === "DISABLE_ELIGIBLE") return { text: "Starter-disable review", tone: "warning" };
  if (f.status === "STARTER_DISABLED") return { text: "Starter disabled", tone: "warning" };
  if (f.missingFromImport) return { text: "Not in latest import: confirm status", tone: "warning" };
  if (f.insuranceProblem) return { text: "Insurance problem", tone: "warning" };
  if (f.daysPastDue > 0) {
    if (!f.lastContactAt) return { text: "Never contacted", tone: "warning" };
    const days = Math.max(0, Math.round((Date.parse(`${today}T12:00:00Z`) - Date.parse(f.lastContactAt)) / 86_400_000));
    return { text: days === 0 ? "Contacted today" : `No contact in ${days} day${days === 1 ? "" : "s"}`, tone: days >= 3 ? "warning" : "neutral" };
  }
  return { text: "Current", tone: "neutral" };
}

/** Summary tiles above the queue (across all accounts, not just the open tab). */
export function queueSummary(all: QueueFacts[], today: string) {
  const pastDue = all.filter(f => f.daysPastDue > 0 && !isFrozen(f));
  const contactedToday = pastDue.filter(f => f.lastContactAt && chicagoToday(new Date(f.lastContactAt)) === today).length;
  return {
    brokenPromises: all.filter(f => f.brokenPromise && !isFrozen(f)).length,
    promisesDueToday: all.filter(f => f.promiseDueToday && !isFrozen(f)).length,
    pastDueAccounts: pastDue.length,
    pastDueCents: pastDue.reduce((s, f) => s + f.amountDueCents, 0),
    contactedToday
  };
}
