import { describe, expect, it } from "vitest";

import { buildQueue, matchesDate, parseQueueDateFilters, queueDateRange, type QueueFacts } from "@/features/collections/domain/queue";
import { collectionsTaskHref, collectionsTaskLinkLabel } from "@/features/collections/domain/task-links";

function facts(overrides: Partial<QueueFacts>): QueueFacts {
  return {
    id: "a", buyerName: "Sample, Alex", dealNumber: "D-1", stockNumber: "TST1", vehicleDescription: "2014 Fake", phone: "+16125550101",
    accountType: "LEASE_TO_OWN", status: "PAST_DUE", bucket: "LATE_6_14", daysPastDue: 10, amountDueCents: 10000, assignedCollectorUserId: "owner",
    lastContactAt: null, nextActionAt: null, customerLinked: true, vehicleLinked: true, missingFromImport: false, activeFlags: [],
    brokenPromise: false, promiseDueToday: false, reportedNotFound: false, insuranceProblem: false, unreadInbound: 0, ...overrides
  };
}

// Wednesday, Nov 18, 2026.
const TODAY = "2026-11-18";

describe("collections queue date search", () => {
  it("turns plain words into date ranges (weeks run Sunday to Saturday)", () => {
    expect(queueDateRange("today", TODAY)).toEqual({ from: TODAY, to: TODAY });
    expect(queueDateRange("yesterday", TODAY)).toEqual({ from: "2026-11-17", to: "2026-11-17" });
    expect(queueDateRange("this_week", TODAY)).toEqual({ from: "2026-11-15", to: "2026-11-21" });
    expect(queueDateRange("last_week", TODAY)).toEqual({ from: "2026-11-08", to: "2026-11-14" });
    expect(queueDateRange("next_week", TODAY)).toEqual({ from: "2026-11-22", to: "2026-11-28" });
    expect(queueDateRange("this_month", TODAY)).toEqual({ from: "2026-11-01", to: "2026-11-30" });
    expect(queueDateRange("last_month", TODAY)).toEqual({ from: "2026-10-01", to: "2026-10-31" });
    expect(queueDateRange("last_month", "2027-01-10")).toEqual({ from: "2026-12-01", to: "2026-12-31" });
    expect(queueDateRange("last_30", TODAY)).toEqual({ from: "2026-10-20", to: TODAY });
    expect(queueDateRange("before_today", TODAY)).toEqual({ from: null, to: "2026-11-17" });
    expect(queueDateRange("never", TODAY)).toBe("NEVER");
  });

  it("handles a picked date or range, in either order", () => {
    expect(queueDateRange("custom", TODAY, "2026-11-03")).toEqual({ from: "2026-11-03", to: "2026-11-03" });
    expect(queueDateRange("custom", TODAY, "", "2026-11-03")).toEqual({ from: "2026-11-03", to: "2026-11-03" });
    expect(queueDateRange("custom", TODAY, "2026-11-20", "2026-11-01")).toEqual({ from: "2026-11-01", to: "2026-11-20" });
    expect(queueDateRange("custom", TODAY, "not-a-date")).toBeNull();
    expect(queueDateRange("", TODAY)).toBeNull();
  });

  it("filters by due date, promise date, last contact (Chicago day) and never", () => {
    const dueThisWeek = facts({ id: "due", dueDate: "2026-11-20" });
    const dueNextMonth = facts({ id: "later", dueDate: "2026-12-05" });
    expect(matchesDate(dueThisWeek, { dateField: "due", when: "this_week" }, TODAY)).toBe(true);
    expect(matchesDate(dueNextMonth, { dateField: "due", when: "this_week" }, TODAY)).toBe(false);
    expect(matchesDate(facts({ promiseDate: "2026-11-18" }), { dateField: "promise", when: "today" }, TODAY)).toBe(true);
    // 11:30 pm in Minneapolis on Nov 17 is already Nov 18 in UTC: it still counts as "yesterday".
    expect(matchesDate(facts({ lastContactAt: "2026-11-18T05:30:00.000Z" }), { dateField: "contact", when: "yesterday" }, TODAY)).toBe(true);
    expect(matchesDate(facts({ lastContactAt: null }), { dateField: "contact", when: "never" }, TODAY)).toBe(true);
    expect(matchesDate(facts({ lastContactAt: "2026-11-18T15:00:00.000Z" }), { dateField: "contact", when: "never" }, TODAY)).toBe(false);
    // No date filter chosen: everything matches.
    expect(matchesDate(dueNextMonth, {}, TODAY)).toBe(true);
  });

  it("the All accounts tab includes current accounts, so 'due this week' finds them", () => {
    const current = facts({ id: "current", daysPastDue: 0, status: "CURRENT", dueDate: "2026-11-19" });
    const late = facts({ id: "late", dueDate: "2026-10-01" });
    const result = buildQueue([current, late], { tab: "ALL", dateField: "due", when: "this_week" }, TODAY);
    expect(result.rows.map(r => r.id)).toEqual(["current"]);
    expect(result.counts.ALL).toBe(2);
    // The call list still only shows late accounts.
    expect(buildQueue([current, late], { tab: "PAST_DUE" }, TODAY).rows.map(r => r.id)).toEqual(["late"]);
  });

  it("reads the date search from a URL and ignores junk", () => {
    const read = (q: Record<string, string>) => parseQueueDateFilters(key => q[key]);
    expect(read({ dateField: "due", when: "this_week" })).toEqual({ dateField: "due", when: "this_week", from: "", to: "" });
    expect(read({ dateField: "due", from: "2026-11-03" })).toEqual({ dateField: "due", when: "custom", from: "2026-11-03", to: "" });
    expect(read({ dateField: "drop table", when: "someday", from: "11/3/2026" })).toEqual({ dateField: "", when: "", from: "", to: "" });
  });
});

describe("collections links on dispatch board tasks", () => {
  it("links a Collections task to its account, and the import reminder to the import screen", () => {
    expect(collectionsTaskHref("COLLECTIONS", { source: "COLLECTIONS", reason: "BROKEN_PROMISE", accountId: "acc_123" })).toBe("/collections/accounts/acc_123");
    expect(collectionsTaskHref("COLLECTIONS", { source: "COLLECTIONS", reason: "IMPORT_REMINDER", date: TODAY })).toBe("/collections/import");
    expect(collectionsTaskHref("COLLECTIONS", { accountId: "../../admin" })).toBe("/collections");
    expect(collectionsTaskHref("TEMPLATE", { accountId: "acc_123" })).toBeNull();
    expect(collectionsTaskHref("COLLECTIONS", null)).toBeNull();
    expect(collectionsTaskLinkLabel("/collections/accounts/acc_123")).toBe("Open collections account");
    expect(collectionsTaskLinkLabel("/collections/import")).toBe("Open the import screen");
  });
});
